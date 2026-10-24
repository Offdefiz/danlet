import { safeSocialPreviewUrl } from '@/lib/dream-discovery-index';
/** Dream Match only discovers real Instagram venues and Pinterest decoration.
 * Validated source URL is required; do not accept generic search results or
 * a text-only listing as a swipe card.
 */
export type DreamSource = 'instagram' | 'pinterest';
export type DreamSection = 'discover' | 'favorites' | 'matches' | 'history' | 'photos';

export function sourceForCategory(category: string): DreamSource {
  return category === 'Decoração' ? 'pinterest' : 'instagram';
}
export function isDreamSourceUrl(value: string, category: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || !!u.username || !!u.password) return false;
    const hostname = u.hostname.toLowerCase();
    if (sourceForCategory(category) === 'instagram') {
      return ['instagram.com', 'www.instagram.com', 'instagr.am'].includes(hostname)
        && /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)
        || ['instagram.com', 'www.instagram.com'].includes(hostname)
        && /^\/[A-Za-z0-9._]{1,30}\/?$/.test(u.pathname);
    }
    return ['pinterest.com', 'www.pinterest.com', 'br.pinterest.com', 'pt.pinterest.com'].includes(hostname)
      && /^\/pin\/\d+\/?$/.test(u.pathname);
  } catch { return false; }
}
export function pinId(source: string): string | null {
  if (!isDreamSourceUrl(source, 'Decoração')) return null;
  return new URL(source).pathname.match(/^\/pin\/(\d+)/)?.[1] ?? null;
}
export function hasDreamPhoto(reference: {
  image_path: string | null; image_url?: string | null; category?: string;
}): boolean {
  return Boolean(reference.image_path?.trim())
    || Boolean(reference.category && safeSocialPreviewUrl(reference.image_url, reference.category));
}
export function dreamCollections<T extends {
  id: string; image_path: string | null; image_url?: string | null; category?: string;
}>(
  refs: T[],
  votes: Array<{ reference_id: string; user_id: string; liked: boolean; super_liked: boolean }>,
  userId: string,
) {
  const photographed = refs.filter(hasDreamPhoto);
  const photoPending = refs.filter(item => !hasDreamPhoto(item));
  const mine = (id: string) => votes.find(v => v.reference_id === id && v.user_id === userId);
  const bothLiked = (id: string) => new Set(votes.filter(v => v.reference_id === id && v.liked).map(v => v.user_id)).size >= 2;
  return {
    discovery: photographed.filter(item => !mine(item.id)),
    favorites: photographed.filter(item => mine(item.id)?.super_liked === true),
    matches: photographed.filter(item => bothLiked(item.id)),
    history: photographed.filter(item => Boolean(mine(item.id))),
    photoPending,
  };
}
