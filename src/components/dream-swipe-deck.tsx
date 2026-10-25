import { useEffect, useRef, useState } from 'react';
import { animate, motion, useAnimationControls, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { ArrowUp, ExternalLink, Heart, Instagram, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DreamPlatformPreview } from '@/components/dream-media';
import { safeSocialPreviewUrl } from '@/lib/dream-discovery-index';
import { sourceForCategory } from '@/lib/dream-match';

export type DreamSwipeItem = {
  title: string;
  description: string;
  source_url: string;
  image: string;
};
export type DreamSwipeDecision = 'skip' | 'like' | 'superlike';

export function classifyDreamGesture(
  offset: { x: number; y: number },
  velocity: { x: number; y: number },
): DreamSwipeDecision | null {
  // Up means SUPER LIKE, but only when the user intended an upward gesture.
  if (offset.y < -95 && Math.abs(offset.y) > Math.abs(offset.x) * 0.85) return 'superlike';
  if (offset.x < -95 || (offset.x < -35 && velocity.x < -650)) return 'skip';
  if (offset.x > 95 || (offset.x > 35 && velocity.x > 650)) return 'like';
  return null;
}

export function getDreamSwipeExit(decision: DreamSwipeDecision, width = 380) {
  const distance = Math.max(420, width * 1.45);
  if (decision === 'superlike') return { x: 0, y: -distance, rotation: 0 };
  return { x: decision === 'like' ? distance : -distance, y: 40,
    rotation: decision === 'like' ? 20 : -20 };
}

function SwipeMedia({ item, category, onAvailabilityChange }: {
  item: DreamSwipeItem; category: string; onAvailabilityChange: (ready: boolean) => void;
}) {
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const photo = useRef<HTMLImageElement>(null);
  const loaded = useRef(false);
  useEffect(() => {
    const cached = Boolean(photo.current?.complete && photo.current.naturalWidth > 0);
    loaded.current = cached;
    onAvailabilityChange(cached); setBroken(false);
    const timer = window.setTimeout(() => {
      if (!loaded.current) { setBroken(true); onAvailabilityChange(false); }
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [item.image, item.source_url, attempt, onAvailabilityChange]);
  if (broken || !safeSocialPreviewUrl(item.image, category)) {
    return <div className="absolute inset-0 overflow-auto rounded-[28px] bg-card p-4 text-foreground">
      <p role="status" className="mb-3 text-sm">Foto indisponível nesta tentativa. A publicação original pode exigir acesso à plataforma.</p>
      <Button type="button" variant="outline" className="mb-3 rounded-full" onClick={() => { setBroken(false); setAttempt(value => value + 1); }}>Recarregar foto</Button>
      <DreamPlatformPreview category={category} sourceUrl={item.source_url}/>
    </div>;
  }
  return <img ref={photo} src={item.image} alt={item.title} draggable={false}
    loading="eager" decoding="async"
    onLoad={() => { loaded.current = true; onAvailabilityChange(true); }}
    onError={() => { setBroken(true); onAvailabilityChange(false); }}
    className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"/>;
}

function ActiveSwipeCard({
  item, category, disabled: externalDisabled, onDecision, onSkipUnavailable,
}: {
  item: DreamSwipeItem;
  category: string;
  disabled: boolean;
  onSkipUnavailable: () => void;
  onDecision: (decision: DreamSwipeDecision, item: DreamSwipeItem) => Promise<boolean>;
}) {
  const [ready, setReady] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const disabled = externalDisabled || !ready || choosing;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const rotate = useTransform(x, [-260, 0, 260], reducedMotion ? [0, 0, 0] : [-17, 0, 17]);
  const likeOpacity = useTransform(x, [30, 150], [0, 1]);
  const skipOpacity = useTransform(x, [-150, -30], [1, 0]);
  const superOpacity = useTransform(y, [-160, -35], [1, 0]);
  const controls = useAnimationControls();
  const locked = useRef(false);

  const reset = async () => {
    if (reducedMotion) {
      x.set(0); y.set(0); controls.set({ opacity: 1 });
    } else {
      await Promise.all([
        animate(x, 0, { type: 'spring', stiffness: 430, damping: 31 }),
        animate(y, 0, { type: 'spring', stiffness: 430, damping: 31 }),
      ]);
      controls.set({ opacity: 1 });
    }
    locked.current = false; setChoosing(false);
  };

  const decide = async (decision: DreamSwipeDecision) => {
    if (locked.current || disabled) return;
    locked.current = true; setChoosing(true);
    const exit = getDreamSwipeExit(decision, typeof window === 'undefined' ? 380 : window.innerWidth);
    if (!reducedMotion) {
      // Exit off-screen BEFORE advancing the underlying stack. Buttons and
      // touch gestures use exactly the same single-decision transition.
      await Promise.all([
        animate(x, exit.x, { duration: 0.25, ease: 'easeOut' }),
        animate(y, exit.y, { duration: 0.25, ease: 'easeOut' }),
        controls.start({ opacity: 0, transition: { duration: 0.2 } }),
      ]);
    }
    try {
      const accepted = await onDecision(decision, item);
      if (!accepted) await reset();
    } catch {
      await reset();
    }
  };

  return <div className="absolute inset-0 z-20">
    <motion.article role="group" aria-roledescription="cartão deslizável"
      aria-label={item.title}
      drag={!disabled && !locked.current}
      dragDirectionLock={false} dragElastic={0.75} dragMomentum={false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        const decision = classifyDreamGesture(info.offset, info.velocity);
        if (decision) void decide(decision);
      }}
      style={{ x, y, rotate, touchAction: ready ? 'none' : 'pan-y' }}
      animate={controls}
      className="dream-swipe-card absolute inset-0 cursor-grab overflow-hidden rounded-[30px] border border-white/25 bg-card shadow-2xl active:cursor-grabbing"
    >
      <SwipeMedia item={item} category={category} onAvailabilityChange={setReady}/>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent via-40% to-black/90"/>
      <motion.div aria-hidden="true" style={{ opacity: skipOpacity }}
        className="pointer-events-none absolute left-5 top-8 -rotate-12 rounded-xl border-[3px] border-rose-400 bg-black/35 px-4 py-2 text-3xl font-black tracking-wide text-rose-300">
        PASSAR
      </motion.div>
      <motion.div aria-hidden="true" style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute right-5 top-8 rotate-12 rounded-xl border-[3px] border-emerald-400 bg-black/35 px-4 py-2 text-3xl font-black tracking-wide text-emerald-300">
        CURTI
      </motion.div>
      <motion.div aria-hidden="true" style={{ opacity: superOpacity }}
        className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-xl border-[3px] border-sky-300 bg-black/45 px-4 py-2 text-lg font-black tracking-wide text-sky-200">
        SUPER LIKE ★
      </motion.div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-2 px-5 pb-7 pt-20 text-white">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/40 px-3 py-1 text-[11px] font-bold backdrop-blur-lg">
          {sourceForCategory(category) === 'instagram' ? <Instagram size={14}/> : <Star size={14}/>}
          {sourceForCategory(category) === 'instagram' ? 'Instagram · Local' : 'Pinterest · Decoração'}
        </span>
        <h3 className="line-clamp-2 text-[24px] font-bold leading-tight drop-shadow-lg">{item.title}</h3>
        {item.description && <p className="line-clamp-2 text-xs leading-relaxed text-white/85">{item.description}</p>}
      </div>
    </motion.article>
    <div className="pointer-events-none absolute inset-0 z-30" aria-hidden="true"/>
    {/* The touch surface is the photo; external links and actions live below it. */}
    <div className="absolute inset-x-0 top-full z-30 mt-4 flex items-center justify-center gap-5 sm:gap-8">
      <Button type="button" size="icon" variant="outline" disabled={disabled || locked.current}
        aria-label={'Passar: ' + item.title} title="Passar para a esquerda"
        onClick={() => void decide('skip')}
        className="dream-swipe-action h-14 w-14 rounded-full border-rose-400/50 bg-card/90 text-rose-400 shadow-lg backdrop-blur-xl">
        <X size={27} strokeWidth={2.4}/>
      </Button>
      <Button type="button" size="icon" variant="outline" disabled={disabled || locked.current}
        aria-label={'Super Like: ' + item.title} title="Arrastar para cima: Super Like"
        onClick={() => void decide('superlike')}
        className="dream-swipe-action h-14 w-14 rounded-full border-sky-400/60 bg-card/90 text-sky-400 shadow-lg backdrop-blur-xl">
        <Star size={26} fill="currentColor"/>
      </Button>
      <Button type="button" size="icon" disabled={disabled || locked.current}
        aria-label={'Curtir: ' + item.title} title="Curtir para a direita"
        onClick={() => void decide('like')}
        className="dream-swipe-action h-[66px] w-[66px] rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-rose-500 text-white shadow-[0_8px_30px_rgba(213,85,190,.45)]">
        <Heart size={29} fill="currentColor"/>
      </Button>
    </div>
    {!ready && <div className="absolute inset-x-0 top-full z-30 mt-24 text-center">
      <Button type="button" variant="ghost" className="min-h-11 rounded-full" disabled={externalDisabled || choosing} onClick={onSkipUnavailable}>Pular foto indisponível sem votar</Button>
    </div>}
  </div>;
}

export function DreamSwipeDeck({
  items, category, disabled = false, onChoose, onMore, onSkipUnavailable,
}: {
  items: DreamSwipeItem[];
  category: string;
  disabled?: boolean;
  onChoose: (item: DreamSwipeItem, decision: DreamSwipeDecision) => Promise<boolean>;
  onMore: () => void;
  onSkipUnavailable: (item: DreamSwipeItem) => void;
}) {
  const current = items[0];
  const onDecision = async (decision: DreamSwipeDecision, item: DreamSwipeItem): Promise<boolean> => {
    return onChoose(item, decision);
  };
  if (!current) return <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-[28px] border border-border bg-card p-5 text-center">
    <Heart size={31} className="text-primary"/>
    <p className="text-sm font-semibold">Você viu todas as inspirações desta busca!</p>
    <Button type="button" className="rounded-full" onClick={onMore}>Descobrir mais fotos</Button>
  </div>;

  return <section aria-label="Swipe de publicações encontradas" className="space-y-4">
    <div className="flex items-center justify-between gap-2 px-1 text-xs font-medium text-muted-foreground">
      <span className="flex items-center gap-1.5"><Heart size={14} className="text-primary"/> Novas inspirações</span>
      <span aria-live="polite">{items.length} {items.length === 1 ? 'foto' : 'fotos'} para descobrir</span>
    </div>
    <div className="relative h-[min(66svh,610px)] min-h-[390px] w-full select-none">
      {items.slice(1, 3).map((item, i) => <div key={item.source_url}
        aria-hidden="true"
        className="dream-swipe-card absolute inset-0 overflow-hidden rounded-[30px] border border-white/10 bg-secondary shadow-lg"
        style={{ transform: `translateY(${(i + 1) * 8}px) scale(${1 - (i + 1) * 0.047})`, opacity: 1 - i * 0.16 }}>
        <div className="absolute inset-0 bg-black/25"/>
      </div>)}
      <ActiveSwipeCard key={current.source_url} item={current} category={category}
        disabled={disabled} onDecision={onDecision} onSkipUnavailable={() => onSkipUnavailable(current)}/>
    </div>
    <div className="h-[130px]" aria-hidden="true"/>
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-center text-[11px] text-muted-foreground">
      <span>← Passar</span><span className="text-border">•</span>
      <span><ArrowUp size={13} className="inline text-sky-400"/> Super Like</span>
      <span className="text-border">•</span><span>Curtir →</span>
    </div>
    <a className="mx-auto flex min-h-11 w-max max-w-full items-center gap-2 rounded-full border border-border bg-card/75 px-4 text-xs font-medium text-foreground underline-offset-2 hover:underline"
      href={current.source_url} target="_blank" rel="noopener noreferrer">
      <ExternalLink size={15}/> Ver publicação original
    </a>
    <Button type="button" variant="outline" className="w-full rounded-2xl" onClick={onMore}>
      Buscar mais publicações
    </Button>
  </section>;
}
