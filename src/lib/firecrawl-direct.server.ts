/** Direct Firecrawl API: no Lovable connector, tokens or platform gateway. */
const API = 'https://api.firecrawl.dev/v2';
export type SearchHit = { title: string; url: string; description?: string };
type SearchPayload = { success?: boolean; data?: { web?: SearchHit[] } | SearchHit[] };
type ScrapePayload = { success?: boolean; data?: { metadata?: Record<string, unknown> }; metadata?: Record<string, unknown> };

export class SearchNotConfigured extends Error {
  constructor() { super('Busca automática opcional: configure FIRECRAWL_API_KEY no Render. Você ainda pode adicionar referências manualmente.'); }
}
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
  const key = process.env['FIRECRAWL_API_KEY'];
  if (!key) throw new SearchNotConfigured();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(API + path, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Busca indisponível (' + response.status + '). Verifique a chave e os créditos do provedor.');
    return response.json();
  } finally { clearTimeout(timer); }
}
export async function searchWeb(query: string, limit = 8): Promise<SearchHit[]> {
  const result = await api('/search', { query, limit, sources: [{ type: 'web' }], country: 'BR' }) as SearchPayload;
  const entries = Array.isArray(result.data) ? result.data : result.data?.web ?? [];
  return entries.filter(v => typeof v?.title === 'string' && typeof v?.url === 'string' && isPublicHttpsUrl(v.url))
    .slice(0, limit).map(v => ({ title: v.title, url: v.url, description: v.description ?? '' }));
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
