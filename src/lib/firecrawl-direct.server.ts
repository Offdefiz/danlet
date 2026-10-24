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
      if (response.status === 429) throw new Error('A busca gratuita atingiu o limite temporário. Tente mais tarde ou consulte as publicações na rede social.');
      if (response.status === 403 || response.status === 401) throw new Error('A pesquisa automática está temporariamente indisponível neste servidor.');
      throw new Error('Não foi possível completar a pesquisa agora.');
    }
    return response.json();
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
  const imageByPost = new Map<string, string>();
  for (const image of images) {
    if (image.url && image.imageUrl && isPublicHttpsUrl(image.url) && isPublicHttpsUrl(image.imageUrl)) {
      imageByPost.set(image.url, image.imageUrl);
    }
  }
  const results: SearchHit[] = entries.filter(v => typeof v?.title === 'string' && typeof v?.url === 'string' && isPublicHttpsUrl(v.url))
    .map(v => ({
      title: v.title, url: v.url, description: v.description ?? '',
      ...(imageByPost.has(v.url) ? { image: imageByPost.get(v.url)! } : {}),
    }));
  // An image search result often lists a specific *post* where web results
  // list only a broad profile. Include such real posts too, never the CDN URL
  // as the original source.
  for (const image of images) {
    if (!image.url || !image.imageUrl || !image.title || !isPublicHttpsUrl(image.url)
        || !isPublicHttpsUrl(image.imageUrl) || results.some(item => item.url === image.url)) continue;
    results.push({ title: image.title, url: image.url, description: '', image: image.imageUrl });
  }
  results.splice(limit);
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
