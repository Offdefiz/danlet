import { DreamSearchError } from '@/lib/dream-search-status';
/** Direct Firecrawl API: no Lovable connector, tokens or platform gateway. */
const API = 'https://api.firecrawl.dev/v2';
// Public search queries only; each cache hit avoids a billable Firecrawl search.
const searchCache = new Map<string, { expiresAt: number; results: SearchHit[] }>();
export type SearchHit = { title: string; url: string; description?: string; image?: string };
type ImageHit = { title?: string; url?: string; imageUrl?: string; imageWidth?: number; imageHeight?: number };
type SearchPayload = { success?: boolean; data?: { web?: SearchHit[]; images?: ImageHit[] } | SearchHit[] };
type ScrapePayload = { success?: boolean; data?: { metadata?: Record<string, unknown> }; metadata?: Record<string, unknown> };

export function isPublicHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    return u.protocol === 'https:' && !u.username && !u.password
      && !['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(h)
      && !h.endsWith('.local') && !h.endsWith('.internal')
      && !/^(10|127|0|169\.254|192\.168)\./.test(h)
      && !/^172\.(1[6-9]|2\d|3[01])\./.test(h);
  } catch { return false; }
}
async function api(path: '/search' | '/scrape', data: object): Promise<unknown> {
  // Firecrawl supports a rate-limited, zero-key REST tier since 2026.
  // With a configured key we keep normal higher-limit account access.
  const key = process.env['FIRECRAWL_API_KEY']?.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(API + path, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: 'Bearer ' + key } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      if (response.status === 429) {
        const retry = response.headers?.get('retry-after');
        const seconds = retry && /^\d+$/.test(retry) ? Number(retry)
          : retry ? Math.ceil((Date.parse(retry) - Date.now()) / 1000) : 60;
        throw new DreamSearchError('rate_limited', Number.isFinite(seconds) ? Math.max(1, Math.min(seconds, 86400)) : 60);
      }
      if (response.status === 403 || response.status === 401) throw new DreamSearchError('unauthorized');
      throw new DreamSearchError('provider_error');
    }
    const payload = await response.json();
    if (!payload || payload.success === false || !payload.data) throw new DreamSearchError('provider_error');
    return payload;
  } catch (error) {
    if (error instanceof DreamSearchError) throw error;
    throw new DreamSearchError(controller.signal.aborted ? 'timeout' : 'provider_error');
  } finally { clearTimeout(timer); }
}
export async function searchWeb(query: string, limit = 8): Promise<SearchHit[]> {
  const cacheKey = JSON.stringify([query.trim().toLowerCase(), limit]);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.results.map(item => ({ ...item }));
  }
  const result = await api('/search', { query, limit, sources: [{ type: 'web' }, { type: 'images' }] }) as SearchPayload;
  const entries = Array.isArray(result.data) ? result.data : result.data?.web ?? [];
  const images = !Array.isArray(result.data) ? result.data?.images ?? [] : [];
  // Image discovery is *indexed*, not a license to reproduce the photograph.
  // Each preview remains on the original publisher's public CDN.
  const validWeb = entries.filter(v => typeof v?.title === 'string' &&
    typeof v?.url === 'string' && isPublicHttpsUrl(v.url))
    .map(v => ({ title: v.title, url: v.url, description: v.description ?? '' }));
  const webByUrl = new Map(validWeb.map(item => [item.url, item]));
  const photographed = new Map<string, SearchHit>();
  for (const image of images) {
    if (!image.url || !image.imageUrl || !isPublicHttpsUrl(image.url)
        || !isPublicHttpsUrl(image.imageUrl)) continue;
    const matched = webByUrl.get(image.url);
    photographed.set(image.url, {
      title: matched?.title ?? image.title ?? 'Inspiração visual',
      url: image.url,
      description: matched?.description ?? '',
      image: image.imageUrl,
    });
  }
  // Use photographic results first. Without this, 10 text-only web hits
  // filled the result cap and hid all the separately indexed Instagram photos.
  const results: SearchHit[] = [
    ...photographed.values(),
    ...validWeb.filter(item => !photographed.has(item.url)),
  ].slice(0, limit);
  if (searchCache.size >= 100) searchCache.delete(searchCache.keys().next().value ?? '');
  searchCache.set(cacheKey, { expiresAt: Date.now() + 15 * 60_000, results });
  return results.map(item => ({ ...item }));
}
export async function scrapeWebMeta(url: string): Promise<{ title: string; description: string; image: string }> {
  if (!isPublicHttpsUrl(url)) throw new Error('Endereço de página inválido.');
  const result = await api('/scrape', { url, formats: ['markdown'], onlyMainContent: true }) as ScrapePayload;
  const meta = result.data?.metadata ?? result.metadata ?? {};
  const pick = (name: string) => {
    const raw = meta[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' ? value.slice(0, 2048) : '';
  };
  const image = pick('ogImage') || pick('og:image');
  return {
    title: pick('ogTitle') || pick('title'),
    description: pick('ogDescription') || pick('description'),
    image: isPublicHttpsUrl(image) ? image : '',
  };
}
