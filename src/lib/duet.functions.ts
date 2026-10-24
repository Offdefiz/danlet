import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { searchWeb, scrapeWebMeta as scrapeMeta, isPublicHttpsUrl } from '@/lib/firecrawl-direct.server';
import { isDreamSourceUrl, sourceForCategory } from '@/lib/dream-match';
import { curatedDreamResults, safeSocialPreviewUrl } from '@/lib/dream-discovery-index';

export const findReferences = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ category: z.string().max(50), region: z.string().max(100) }))
  .handler(async ({ data, context }) => {
    const { data: member } = await context.supabase.from('couple_members')
      .select('person').eq('user_id', context.userId).maybeSingle();
    if (!member) throw new Error('Acesso reservado ao casal.');
    const source = sourceForCategory(data.category);
    const region = data.region.trim() || (source === 'instagram' ? 'Minas Gerais casamento' : 'decoração casamento romântico');
    const query = source === 'instagram'
      ? `espaço casamento local eventos ${region} site:instagram.com`
      : `decoração casamento ${region} site:pinterest.com/pin/`;
    try {
      const found = await searchWeb(query, 10);
      const sites = found.filter(hit => isDreamSourceUrl(hit.url, data.category)).slice(0, 8);
      // Meta photos may be unavailable. Search results without media can still
      // be reviewed using an official embed, but cannot enter swipe before photo.
      const results = await Promise.all(sites.map(async item => {
        let image = '';
        if (source === 'instagram') {
          try { image = (await scrapeMeta(item.url)).image; } catch { /* blocked/public access denied */ }
        }
        return { title: item.title, source_url: item.url, description: item.description ?? '', image };
      }));
      return { results, error: results.length ? null
        : 'Não encontrei publicações públicas do ' + (source === 'instagram' ? 'Instagram' : 'Pinterest') + ' com esse filtro. Tente outra cidade ou termo.' };
    } catch (error) {
      return { results: [], error: error instanceof Error ? error.message : 'Busca indisponível. Tente novamente.' };
    }
  });

async function storeImage(supabase: SupabaseClient<Database>, userId: string, image: string) {
  if (!isPublicHttpsUrl(image)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(image, { signal: controller.signal });
    if (!response.ok) return null;
    const type = ((response.headers.get('content-type') ?? '').split(';')[0] ?? '').trim().toLowerCase();
    if (!['image/jpeg','image/png','image/webp'].includes(type)) return null;
    const size = Number(response.headers.get('content-length') ?? 0);
    if (size > 6 * 1024 * 1024) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 200 || bytes.byteLength > 6 * 1024 * 1024) return null;
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/dream-${crypto.randomUUID()}.${ext}`;
    const uploaded = await supabase.storage.from('duet-photos').upload(path, bytes, {
      contentType: type, cacheControl: '3600',
    });
    return uploaded.error ? null : path;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

/** A Pinterest Pin must use the official embed for initial preview. We do not
 * scrape or cache Pinterest images: the couple can attach a permitted photo.
 * Public Instagram metadata is opportunistic, not an availability promise. */
export const importDreamReference = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    source_url: z.string().url().max(2000),
    category: z.string().max(50),
    title: z.string().min(1).max(160),
    notes: z.string().max(2000).default(''),
    uploaded_path: z.string().max(320).nullable().default(null),
  }))
  .handler(async ({ data, context }) => {
    if (!isDreamSourceUrl(data.source_url, data.category)) {
      throw new Error('Fonte inválida: use Instagram para locais ou um Pin do Pinterest para decoração.');
    }
    const { data: member } = await context.supabase.from('couple_members')
      .select('person').eq('user_id', context.userId).maybeSingle();
    if (!member) throw new Error('Acesso reservado ao casal.');
    let image_path: string | null = null;
    let credit = '';
    if (data.uploaded_path) {
      if (!data.uploaded_path.startsWith(context.userId + '/dream-') ||
        !/^[-\w]+\/dream-[0-9a-f-]+\.(jpg|jpeg|png|webp)$/.test(data.uploaded_path)) {
        throw new Error('Imagem precisa ser enviada pela sua conta no Duet.');
      }
      const filename = data.uploaded_path.split('/')[1]!;
      const { data: files, error: storageError } = await context.supabase.storage.from('duet-photos')
        .list(context.userId, { search: filename, limit: 30 });
      if (storageError || !files?.some(file => file.name === filename)) {
        throw new Error('Não encontramos a foto enviada. Tente anexar novamente.');
      }
      image_path = data.uploaded_path;
      credit = 'Foto adicionada pelo casal · fonte: ' + sourceForCategory(data.category);
    } else if (sourceForCategory(data.category) === 'instagram') {
      try {
        const meta = await scrapeMeta(data.source_url);
        image_path = await storeImage(context.supabase, context.userId, meta.image);
      } catch { /* protected or blocked Instagram content */ }
      credit = 'Prévia pública do Instagram · confira a publicação original';
    }
    if (!image_path) throw new Error(
      sourceForCategory(data.category) === 'pinterest'
        ? 'O Pinterest não liberou uma imagem por integração. Anexe uma foto autorizada para usar esse Pin no Dream Match.'
        : 'O Instagram não liberou uma foto estável. Anexe uma foto autorizada antes de salvar essa opção.',
    );
    const { error } = await context.supabase.from('references_catalog').insert({
      title: data.title.trim(),
      description: data.notes.trim(),
      source_url: data.source_url,
      instagram_url: sourceForCategory(data.category) === 'instagram' ? data.source_url : null,
      category: data.category,
      created_by: context.userId,
      verification: 'Fonte ' + sourceForCategory(data.category) + ' · fotografia vinculada',
      image_path,
      image_credit: credit,
    });
    if (error) throw new Error('Não foi possível salvar essa referência com fotografia: ' + error.message);
    return { title: data.title, image_path };
  });

export const fetchPhoto = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: ref } = await context.supabase.from('references_catalog').select('*')
      .eq('id', data.id).maybeSingle();
    if (!ref || ref.image_path || sourceForCategory(ref.category) !== 'instagram') return { ok: false };
    const source = [ref.instagram_url, ref.source_url].find(
      url => url && isDreamSourceUrl(url, ref.category),
    );
    if (!source) return { ok: false };
    try {
      const metadata = await scrapeMeta(source);
      const path = await storeImage(context.supabase, context.userId, metadata.image);
      if (path) {
        const { error } = await context.supabase.from('references_catalog')
          .update({ image_path: path, image_credit: 'Prévia pública do Instagram' }).eq('id', ref.id);
        return { ok: !error };
      }
    } catch { /* legacy photo must be supplied manually if unavailable */ }
    return { ok: false };
  });

export const addFromInstagram = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    handle: z.string().regex(/^[A-Za-z0-9._]{1,30}$/),
    category: z.string().max(50), notes: z.string().max(2000),
  }))
  .handler(async ({ data, context }) => {
    if (sourceForCategory(data.category) !== 'instagram') {
      throw new Error('Decorações devem vir de Pins do Pinterest.');
    }
    const url = `https://www.instagram.com/${data.handle}/`;
    let meta = { title: '', description: '', image: '' };
    try { meta = await scrapeMeta(url); } catch { /* restricted profile */ }
    const path = await storeImage(context.supabase, context.userId, meta.image);
    if (!path) throw new Error('Esse perfil não forneceu foto. Use a opção de adicionar publicação com imagem anexa.');
    const title = (meta.title.split(/[|(•]/)[0] ?? '').trim() || '@' + data.handle;
    const { error } = await context.supabase.from('references_catalog').insert({
      title, description: data.notes || meta.description, source_url: url,
      instagram_url: url, category: data.category, created_by: context.userId,
      verification: 'Perfil público do Instagram', image_path: path,
      image_credit: 'Prévia pública de @' + data.handle,
    });
    if (error) throw new Error(error.message);
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
