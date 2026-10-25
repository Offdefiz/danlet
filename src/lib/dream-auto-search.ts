import { isDreamSourceUrl, sourceForCategory } from '@/lib/dream-match';
import { safeSocialPreviewUrl } from '@/lib/dream-discovery-index';
import type { SearchHit } from '@/lib/firecrawl-direct.server';

export type DreamPhotoResult = {
  title: string;
  description: string;
  source_url: string;
  image: string;
};
type SearchFn = (query: string, limit: number) => Promise<SearchHit[]>;
type EnrichFn = (url: string) => Promise<string>;

function normalizePlace(place: string) {
  return place.trim().replace(/\s+/g, ' ').slice(0, 100);
}

/** Every search retains the user's complete term; never substitute a predefined
 * city. The second and third passes widen keywords without dropping location.
 */
export function dreamPhotoQueries(category: string, place: string): string[] {
  const location = normalizePlace(place);
  const source = sourceForCategory(category);
  if (source === 'pinterest') return [
    `site:pinterest.com/pin/ ${location} decoração inspiração fotos`,
    `site:br.pinterest.com/pin/ ${location} decoração casamento`,
    `site:pinterest.com/pin/ ${location} ideias ambientes decoração`,
  ];
  return [
    `site:instagram.com/p/ ${location} lugares fotos`,
    `site:instagram.com/reel/ ${location} locais turismo eventos`,
    `site:instagram.com ${location} espaço festas passeio casamento`,
  ];
}

function canonicalPost(raw: string, category: string): string | null {
  if (!isDreamSourceUrl(raw, category)) return null;
  const url = new URL(raw);
  const path = url.pathname.replace(/\/+$/, '') + '/';
  if (sourceForCategory(category) === 'instagram' && !/^\/(p|reel|tv)\/[\w-]+\/$/.test(path)) return null;
  if (sourceForCategory(category) === 'pinterest' && !/^\/pin\/\d+\/$/.test(path)) return null;
  // Normalize country-specific Pinterest Pin URLs to the same canonical post.
  const host = sourceForCategory(category) === 'pinterest' ? 'www.pinterest.com' : 'www.instagram.com';
  return `https://${host}${path}`;
}

export function distinctDreamPhotoResults(
  results: DreamPhotoResult[], category: string,
): DreamPhotoResult[] {
  const seen = new Set<string>();
  return results.filter(item => {
    const key = canonicalPost(item.source_url, category);
    if (!key || !safeSocialPreviewUrl(item.image, category) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Bounded, automatic multi-query search: never asks the couple for an image,
 * Instagram link or file. Index media is always preferred over text-only hits.
 * If a third-party source cannot supply any publicly usable images, return
 * an empty result rather than a fabricated photo or a location mismatch.
 */
export async function findAutonomousDreamPhotos(args: {
  category: string;
  place: string;
  search: SearchFn;
  enrich?: EnrichFn;
  minimumPhotos?: number;
}): Promise<{ results: DreamPhotoResult[]; searches: number; blocked: boolean }> {
  const place = normalizePlace(args.place);
  const queries = dreamPhotoQueries(args.category, place);
  const desired = args.minimumPhotos ?? 5;
  const all = new Map<string, DreamPhotoResult>();
  let searches = 0;
  let blocked = false;
  let scrapeBudget = 2;
  for (const query of queries) {
    try {
      const hits = await args.search(query, 12);
      searches++;
      // Process images first so text-only profiles never consume gallery slots.
      const candidates = [...hits].sort((a, b) =>
        Number(Boolean(b.image)) - Number(Boolean(a.image)));
      for (const hit of candidates) {
        const key = canonicalPost(hit.url, args.category);
        if (!key || all.has(key)) continue;
        let image = safeSocialPreviewUrl(hit.image, args.category) ? hit.image! : '';
        if (!image && sourceForCategory(args.category) === 'instagram' &&
          args.enrich && scrapeBudget > 0) {
          scrapeBudget--;
          try {
            const metaImage = await args.enrich(hit.url);
            if (safeSocialPreviewUrl(metaImage, args.category)) image = metaImage;
          } catch { /* public post blocks metadata: do not invent photos */ }
        }
        if (!image) continue;
        all.set(key, {
          title: (hit.title || 'Inspiração do ' + sourceForCategory(args.category)).slice(0, 160),
          description: (hit.description || '').slice(0, 2000),
          source_url: key,
          image,
        });
      }
      if (all.size >= desired) break;
    } catch {
      blocked = true;
      // Try the next variant automatically. Keyless plans can be rate-limited.
    }
  }
  return {
    results: distinctDreamPhotoResults([...all.values()], args.category).slice(0, 18),
    searches,
    blocked,
  };
}
