import { useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink } from 'lucide-react';
import type { Row } from '@/lib/duet.types';
import { cachedAvatarUrl } from '@/lib/avatar-images';
import { pinId, sourceForCategory, hasDreamPhoto } from '@/lib/dream-match';
import { safeSocialPreviewUrl } from '@/lib/dream-discovery-index';

/** Only official public Instagram/Pinterest embeds are used as source previews.
 * Pinterest media is not scraped or downloaded. It is imported into swipe
 * only after the couple supplies a usable image or a licensed integration.
 */
type SocialWidgetWindow = Window & {
  PinUtils?: { build: () => void };
  instgrm?: { Embeds: { process: () => void } };
};
function loadOfficialWidget(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing?.dataset['ready'] === 'yes') return Promise.resolve();
  return new Promise(resolve => {
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => {
      script.dataset['ready'] = 'yes';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => resolve(), { once: true });
    if (!existing) {
      script.async = true;
      script.src = src;
      document.head.appendChild(script);
    } else if (existing.dataset['ready'] === 'yes') resolve();
    // Avoid keeping the preview blocked if the third-party script is blocked.
    window.setTimeout(resolve, 8000);
  });
}

export function DreamPlatformPreview({ sourceUrl, category }: { sourceUrl: string; category: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isPin = sourceForCategory(category) === 'pinterest' && Boolean(pinId(sourceUrl));
  const isInstagramPost = sourceForCategory(category) === 'instagram'
    && /^\/(p|reel|tv)\//.test(new URL(sourceUrl).pathname);

  useEffect(() => {
    let alive = true;
    if (!isPin && !isInstagramPost) return;
    const src = isPin ? 'https://assets.pinterest.com/js/pinit.js' : 'https://www.instagram.com/embed.js';
    void loadOfficialWidget(src).then(() => {
      if (!alive || !ref.current) return;
      const widget = window as SocialWidgetWindow;
      if (isPin) widget.PinUtils?.build();
      else widget.instgrm?.Embeds.process();
    });
    return () => { alive = false; };
  }, [sourceUrl, isPin, isInstagramPost]);

  if (!isPin && !isInstagramPost) return <p className="text-xs text-muted-foreground">O Instagram não disponibiliza um embed de perfil. Confira a foto original antes de incluir.</p>;
  return <div ref={ref} className="dream-social-embed relative mx-auto w-full overflow-hidden rounded-2xl bg-card p-2">
    {isPin
      ? <a data-pin-do="embedPin" href={sourceUrl} aria-label="Exibir foto original do Pinterest no aplicativo">Abrir Pin original</a>
      : <blockquote className="instagram-media" data-instgrm-permalink={sourceUrl} data-instgrm-version="14">
          <a href={sourceUrl} target="_blank" rel="noreferrer">Ver publicação original no Instagram</a>
        </blockquote>}
  </div>;
}

/** Display a real saved photo or verified public social thumbnail. Fall back
 * to the platform's own embed if a hotlink expires; never fabricate a photo. */
export function DreamReferencePhoto({
  reference, compact = false, onUnavailable,
}: { reference: Row<'references_catalog'>; compact?: boolean; onUnavailable?: () => void }) {
  const [url, setUrl] = useState('');
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(false); setBroken(false); setUrl('');
    if (reference.image_path) void cachedAvatarUrl(reference.image_path).then(value => {
      if (active) setUrl(value);
    }).catch(() => { if (active) setBroken(true); });
    else if (safeSocialPreviewUrl(reference.image_url, reference.category)) {
      setUrl(reference.image_url!);
    }
    return () => { active = false; };
  }, [reference.image_path, reference.image_url, reference.category]);

  if (broken || !hasDreamPhoto(reference)) {
    const path = (() => { try { return new URL(reference.source_url).pathname; } catch { return ''; } })();
    const embeddable = (reference.category === 'Decoração' && Boolean(pinId(reference.source_url)))
      || (reference.category !== 'Decoração' && /^\/(p|reel|tv)\//.test(path));
    return <div className="space-y-2 rounded-2xl border border-border bg-muted/30 p-2">
      {embeddable ? <DreamPlatformPreview key={reference.source_url} sourceUrl={reference.source_url} category={reference.category}/>
        : <div className={`flex ${compact ? 'h-24' : 'min-h-44'} items-center justify-center gap-2 text-center text-sm text-muted-foreground`}>
            <Camera size={20}/> Foto temporariamente indisponível
          </div>}
      <div className="flex flex-wrap items-center justify-center gap-2 py-2">
        {onUnavailable && <button type="button" className="rounded-full border border-border px-3 py-2 text-xs text-primary"
          onClick={onUnavailable}>Anexar foto</button>}
        <a href={reference.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Ver mídia original</a>
      </div>
    </div>;
  }

  return <a className="block overflow-hidden rounded-[20px]" href={reference.source_url} target="_blank" rel="noopener noreferrer"
    title={sourceForCategory(reference.category) === 'pinterest' ? 'Ver foto original no Pinterest' : 'Ver foto original no Instagram'}>
    <div className={`relative w-full overflow-hidden bg-muted ${compact ? 'aspect-[4/3]' : 'aspect-[4/5] sm:aspect-[4/3]'}`}>
      {!ready && <div className="absolute inset-0 animate-pulse bg-secondary"/>}
      {url && <img src={url} alt={reference.title} decoding="async" loading={compact ? 'lazy' : 'eager'}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setReady(true)} onError={() => { setBroken(true); setReady(false); }}/>}
      {ready && <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        {sourceForCategory(reference.category) === 'pinterest' ? 'Pinterest' : 'Instagram'} <ExternalLink size={11} className="ml-1 inline"/>
      </span>}
    </div>
    {!compact && reference.image_credit && <p className="px-2 py-2 text-[11px] text-muted-foreground">{reference.image_credit}</p>}
  </a>;
}

/** Public original-hosted image, with an official embed if hotlinking fails.
 * There is always an attribution and a link to the publication. */
export function DreamSearchPhoto({ image, sourceUrl, category, title, swipe = false, onAvailabilityChange }: {
  image: string; sourceUrl: string; category: string; title: string;
  swipe?: boolean; onAvailabilityChange?: (ready: boolean) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const photoRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const cached = Boolean(photoRef.current?.complete && photoRef.current.naturalWidth > 0);
    loaded.current = cached;
    setFailed(false); setReady(cached); onAvailabilityChange?.(cached);
    const timer = window.setTimeout(() => { if (!loaded.current) setFailed(true); }, 12000);
    return () => window.clearTimeout(timer);
  }, [image, sourceUrl, onAvailabilityChange]);
  useEffect(() => { onAvailabilityChange?.(ready && !failed); }, [ready, failed, onAvailabilityChange]);
  const useImage = !failed && safeSocialPreviewUrl(image, category);
  const photo = <div className={swipe ? 'relative w-full aspect-[4/5] max-h-[44dvh] overflow-hidden rounded-[20px] bg-muted' : 'overflow-hidden rounded-[20px] bg-muted'}>
    {!ready && <div role="status" className="absolute inset-0 flex animate-pulse items-center justify-center text-xs text-muted-foreground">Carregando fotografia…</div>}
    <img ref={photoRef} src={image} alt={'Foto real da publicação: ' + title} loading={swipe ? 'eager' : 'lazy'} decoding="async" draggable={false}
      className={swipe ? 'h-full w-full object-cover' : 'max-h-[360px] w-full object-contain'}
      onLoad={() => { loaded.current = true; setReady(true); }} onError={() => setFailed(true)}/>
  </div>;
  return <div className="space-y-1">
    {useImage ? swipe ? photo : <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="block">{photo}</a>
      : <div className="space-y-2">
          <p role="status" className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">Foto indisponível nesta tentativa. A publicação original pode exigir acesso à plataforma.</p>
          <DreamPlatformPreview sourceUrl={sourceUrl} category={category}/>
        </div>}
    <p className="text-[11px] text-muted-foreground">
      Prévia pública de {sourceForCategory(category) === 'instagram' ? 'Instagram' : 'Pinterest'}{!swipe && <> · <a className="underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">Ver imagem na origem</a></>}
    </p>
  </div>;
}
