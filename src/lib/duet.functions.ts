import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { searchWeb, scrapeWebMeta as scrapeMeta, isPublicHttpsUrl } from '@/lib/firecrawl-direct.server';

export const nameLogin = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ person: z.enum(['Daniel', 'Letícia']), password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: member } = await supabaseAdmin.from('couple_members').select('user_id').eq('person', data.person).maybeSingle();
    if (!member) return { session: null, error: 'Conta ainda não configurada ou senha incorreta.' };
    const { data: account } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key || !account.user?.email) return { session: null, error: 'Não foi possível entrar.' };
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.auth.signInWithPassword({ email: account.user.email, password: data.password });
    return { session: result.data.session, error: result.error ? 'Conta ainda não configurada ou senha incorreta.' : null };
  });

export const findReferences = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ category: z.string().max(50), region: z.string().max(100) }))
  .handler(async ({ data, context }) => {
    const { data: member } = await context.supabase.from('couple_members').select('person').eq('user_id', context.userId).maybeSingle();
    if (!member) throw new Error('Acesso reservado a Daniel e Letícia.');
    const query = data.category === 'Locais'
      ? 'locais casamento ' + (data.region || 'Capitólio Tiradentes Ouro Preto MG Serra Guarapari Vitória ES Búzios Petrópolis RJ') + ' site oficial'
      : data.category + ' casamento English Garden ' + data.region + ' referências reais';
    try {
      const results = await searchWeb(query, 8);
      return { results: results.map(item => ({ title: item.title, source_url: item.url, description: item.description ?? '' })), error: null };
    } catch (error) {
      return { results: [], error: error instanceof Error ? error.message : 'Pesquisa temporariamente indisponível.' };
    }
  });
async function storeImage(supabase: SupabaseClient<Database>, userId: string, image: string) {
  if (!isPublicHttpsUrl(image)) return null;
  const res = await fetch(image); if (!res.ok) return null;
  const type = res.headers.get('content-type') ?? 'image/jpeg'; if (!type.startsWith('image/')) return null;
  const path = `${userId}/auto-${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage.from('duet-photos').upload(path, await res.arrayBuffer(), { contentType: type });
  return up.error ? null : path;
}

export const fetchPhoto = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: ref } = await context.supabase.from('references_catalog').select('*').eq('id', data.id).maybeSingle();
    if (!ref || ref.image_path) return { ok: false };
    for (const url of [ref.source_url, ref.instagram_url].filter(Boolean) as string[]) {
      try { const meta = await scrapeMeta(url); const path = await storeImage(context.supabase, context.userId, meta.image);
        if (path) { await context.supabase.from('references_catalog').update({ image_path: path, image_credit: `Foto pública de ${new URL(url).hostname}` }).eq('id', ref.id); return { ok: true }; } } catch { /* tenta a próxima fonte */ }
    }
    return { ok: false };
  });

export const addFromInstagram = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ handle: z.string().regex(/^[A-Za-z0-9._]{1,30}$/), category: z.string().max(50), notes: z.string().max(2000) }))
  .handler(async ({ data, context }) => {
    const url = `https://www.instagram.com/${data.handle}/`;
    let meta = { title: '', description: '', image: '' };
    try { meta = await scrapeMeta(url); } catch { /* salva só com o @ */ }
    const image_path = await storeImage(context.supabase, context.userId, meta.image).catch(() => null);
    const title = (meta.title.split(/[(•|]/)[0] ?? '').trim() || `@${data.handle}`;
    const { error } = await context.supabase.from('references_catalog').insert({ title, description: data.notes || meta.description, source_url: url, instagram_url: url, category: data.category, created_by: context.userId, verification: 'Adicionado pelo casal', image_path, image_credit: image_path ? `Foto pública de @${data.handle}` : null });
    if (error) throw new Error(error.message.includes('duplicate') ? 'Este perfil já está no Duet.' : error.message);
    return { title };
  });

export const findMusic = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ q: z.string().min(1).max(150) }))
  .handler(async ({ data }) => {
    // Free public iTunes search: works without Firecrawl, Firebase or Lovable keys.
    const params = new URLSearchParams({ term: data.q, entity: 'song', media: 'music', country: 'BR', limit: '8' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const response = await fetch('https://itunes.apple.com/search?' + params, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error('Não foi possível buscar músicas agora.');
      const payload = await response.json() as { results?: { trackId?: number; trackName?: string; artistName?: string; trackViewUrl?: string }[] };
      const results = (payload.results ?? []).filter(item => item.trackName && item.artistName && item.trackViewUrl && isPublicHttpsUrl(item.trackViewUrl))
        .map(item => ({ title: item.artistName + ' — ' + item.trackName, url: item.trackViewUrl! }));
      return { results, error: null };
    } catch {
      return { results: [], error: 'Pesquisa de músicas indisponível agora. Tente novamente.' };
    } finally { clearTimeout(timer); }
  });
