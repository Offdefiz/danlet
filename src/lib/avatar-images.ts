import { supabase } from '@/integrations/supabase/client';

const signedAvatarCache = new Map<string, { expires: number; request: Promise<string> }>();
const CACHE_MS = 45 * 60 * 1000;

/** Deduplicate signed URL requests across header, profile and chat avatars.
 * The URL is reused within its Supabase validity window, not stored forever.
 */
export function cachedAvatarUrl(path: string): Promise<string> {
  const now = Date.now();
  const existing = signedAvatarCache.get(path);
  if (existing && existing.expires > now) return existing.request;
  const request = supabase.storage.from('duet-photos')
    .createSignedUrl(path, 60 * 60)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) throw error ?? new Error('Foto indisponível');
      return data.signedUrl;
    }).catch(error => { signedAvatarCache.delete(path); throw error; });
  signedAvatarCache.set(path, { expires: now + CACHE_MS, request });
  return request;
}

/** Shrink phone photos before upload so avatars don't download 5–10 MB files.
 * Resize the longest side to 720px while preserving the original orientation
 * decoded by Safari/Chrome, JPEG compression at 84% quality.
 */
export async function prepareAvatarFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error('Escolha uma imagem válida.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('A foto precisa ter no máximo 10 MB.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      if (image.complete && image.naturalWidth > 0) { resolve(); return; }
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível abrir esta foto.'));
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Foto sem dimensões válidas.');
    const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível otimizar a foto neste aparelho.');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const optimized = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.84));
    if (!optimized) throw new Error('Não foi possível comprimir a foto.');
    return new File([optimized], 'avatar.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
