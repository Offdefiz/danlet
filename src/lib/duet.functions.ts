import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

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
    const key = process.env['FIRECRAWL_API_KEY'];
    const auth = process.env['LOVABLE_API_KEY'];
    if (!key || !auth) return { results: [], error: 'Pesquisa indisponível. Verifique a conexão de pesquisa.' };
    const query = data.category === 'Locais' ? `locais casamento ${data.region || 'Capitólio Tiradentes Ouro Preto MG Serra Guarapari Vitória ES Búzios Petrópolis RJ Ilhabela SP'} site oficial` : `${data.category} casamento English Garden ${data.region} referências reais`;
    const response = await fetch('https://connector-gateway.lovable.dev/firecrawl/v2/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}`, 'X-Connection-Api-Key': key },
      body: JSON.stringify({ query, limit: 8, lang: 'pt-br' }),
    });
    if (!response.ok) return { results: [], error: `Pesquisa indisponível (${response.status}). Tente novamente mais tarde ou confira os créditos do serviço.` };
    const body = await response.json() as { success?: boolean; data?: { web?: { title: string; url: string; description?: string }[] } | { title: string; url: string; description?: string }[] };
    const items = Array.isArray(body.data) ? body.data : body.data?.web ?? [];
    return { results: items.filter(item => item.url.startsWith('https://')).map(item => ({ title: item.title, source_url: item.url, description: item.description ?? '' })), error: null };
  });
async function scrapeMeta(url: string) {
  const key = process.env['FIRECRAWL_API_KEY']; const auth = process.env['LOVABLE_API_KEY'];
  if (!key || !auth) throw new Error('Pesquisa indisponível.');
  const r = await fetch('https://connector-gateway.lovable.dev/firecrawl/v2/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}`, 'X-Connection-Api-Key': key }, body: JSON.stringify({ url, formats: ['links'], onlyMainContent: true }) });
  if (!r.ok) throw new Error(`Não foi possível ler a página (${r.status}).`);
  const b = await r.json() as { data?: { metadata?: Record<string, unknown> }; metadata?: Record<string, unknown> };
  const m = b.data?.metadata ?? b.metadata ?? {};
  const pick = (k: string) => { const v = m[k]; return typeof (Array.isArray(v) ? v[0] : v) === 'string' ? String(Array.isArray(v) ? v[0] : v) : ''; };
  return { title: pick('ogTitle') || pick('title'), description: pick('ogDescription') || pick('description'), image: pick('ogImage') || pick('og:image') };
}

async function storeImage(supabase: any, userId: string, image: string) {
  if (!image.startsWith('https://')) return null;
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
    const key = process.env['FIRECRAWL_API_KEY']; const auth = process.env['LOVABLE_API_KEY'];
    if (!key || !auth) return { results: [], error: 'Pesquisa indisponível.' };
    const r = await fetch('https://connector-gateway.lovable.dev/firecrawl/v2/search', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}`, 'X-Connection-Api-Key': key }, body: JSON.stringify({ query: `${data.q} site:youtube.com`, limit: 6 }) });
    if (!r.ok) return { results: [], error: `Pesquisa indisponível (${r.status}).` };
    const b = await r.json() as { data?: { web?: { title: string; url: string }[] } | { title: string; url: string }[] };
    const items = Array.isArray(b.data) ? b.data : b.data?.web ?? [];
    return { results: items.filter(i => /youtube\.com\/watch|youtu\.be\//.test(i.url)).map(i => ({ title: i.title.replace(/ - YouTube$/, ''), url: i.url })), error: null };
  });
