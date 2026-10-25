import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence, motion, useAnimationControls, useMotionValue,
  useReducedMotion, useTransform,
} from 'framer-motion';
import { ExternalLink, Heart, RotateCcw, Sparkles, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DreamSearchPhoto } from '@/components/dream-media';
import { safeSocialPreviewUrl } from '@/lib/dream-discovery-index';

export type DreamSwipeAction = 'pass' | 'like' | 'super';
export type DreamSwipeItem = {
  title: string;
  description: string;
  source_url: string;
  image: string;
};

/** Choose one gesture deliberately, even when a user drags diagonally.
 * Upwards is a Super Like; left is Pass; right is Like.
 * Actions are never triggered by a small exploratory movement. */
export function classifyDreamSwipe(
  offset: { x: number; y: number },
  velocity: { x: number; y: number },
): DreamSwipeAction | null {
  const xScore = Math.max(Math.abs(offset.x) / 100, Math.abs(velocity.x) / 700);
  const upScore = Math.max(Math.max(0, -offset.y) / 110, Math.max(0, -velocity.y) / 800);
  if (upScore >= 1 && upScore > xScore * 1.12) return 'super';
  if (xScore >= 1 && Math.abs(offset.x) >= Math.abs(offset.y) * 0.75) {
    return offset.x > 0 || (offset.x === 0 && velocity.x > 0) ? 'like' : 'pass';
  }
  return null;
}

/** Exactly one front card is interactive. Back cards are only photo previews,
 * so a gesture cannot accidentally vote on two cards at once. */
export function DreamSwipeDeck({
  items, category, disabled, onDecision,
}: {
  items: DreamSwipeItem[];
  category: string;
  disabled: boolean;
  onDecision: (item: DreamSwipeItem, action: DreamSwipeAction) => Promise<boolean>;
}) {
  const [current] = items;
  return <section aria-label="Descoberta por swipe" className="w-full space-y-3">
    {current ? <>
      <div className="flex items-center justify-between gap-2 px-1 text-xs font-medium text-muted-foreground">
        <span>{items.length} {items.length === 1 ? 'foto para descobrir' : 'fotos para descobrir'}</span>
        <span className="flex items-center gap-1"><Sparkles size={13} className="text-primary"/> Arraste para escolher</span>
      </div>
      <div className="dream-swipe-stack relative mx-auto h-[min(51dvh,465px)] min-h-[310px] w-full max-w-[420px]" role="group"
        aria-label="Baralho de fotos encontradas">
        {items.slice(1, 3).reverse().map((item, index) => <div key={item.source_url}
          aria-hidden="true" className="dream-swipe-behind pointer-events-none absolute inset-x-4 inset-y-1 overflow-hidden rounded-[28px] border border-white/25 bg-card shadow-xl"
          style={{ transform: `translateY(${index === 0 ? 17 : 9}px) scale(${index === 0 ? 0.92 : 0.96})`, zIndex: index + 1 }}>
          {safeSocialPreviewUrl(item.image, category) && <img src={item.image} alt="" loading="eager" decoding="async"
            className="h-full w-full object-cover opacity-70"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"/>
        </div>)}
        <AnimatePresence mode="wait" initial={false}>
          <DreamSwipeFrontCard key={current.source_url} item={current} category={category}
            disabled={disabled} onDecision={onDecision}/>
        </AnimatePresence>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">← Passar <span aria-hidden="true">·</span> ↑ Super Like <span aria-hidden="true">·</span> Curtir →</p>
    </> : <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-[26px] border border-border bg-card/60 px-4 text-center">
      <Heart className="text-primary" size={26}/>
      <p className="text-sm font-semibold">Você viu todas as fotos desta busca ♡</p>
      <p className="text-xs text-muted-foreground">Pesquise outra região ou estilo para continuar descobrindo.</p>
    </div>}
  </section>;
}

function DreamSwipeFrontCard({ item, category, disabled, onDecision }: {
  item: DreamSwipeItem;
  category: string;
  disabled: boolean;
  onDecision: (item: DreamSwipeItem, action: DreamSwipeAction) => Promise<boolean>;
}) {
  const reducedMotion = useReducedMotion();
  const controls = useAnimationControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-17, 0, 17]);
  const likeOpacity = useTransform(x, [24, 135], [0, 1]);
  const passOpacity = useTransform(x, [-135, -24], [1, 0]);
  const superOpacity = useTransform(y, [-145, -32], [1, 0]);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    void controls.start({ scale: 1, opacity: 1, x: 0, y: 0,
      transition: reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 330, damping: 28 } });
  }, [controls, reducedMotion]);

  async function choose(action: DreamSwipeAction) {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    const destination = action === 'super'
      ? { x: 0, y: -600, rotate: 0 }
      : { x: action === 'pass' ? -650 : 650, y: -18, rotate: action === 'pass' ? -19 : 19 };
    try {
      await controls.start({
        ...destination, opacity: 0,
        transition: reducedMotion ? { duration: 0 } : { type: 'tween', ease: 'easeOut', duration: 0.24 },
      });
      const saved = await onDecision(item, action);
      if (saved) return;
    } catch { /* Keep the card in place so the choice can be retried. */ }
    x.set(0); y.set(0);
    await controls.start({ x: 0, y: 0, rotate: 0, opacity: 1,
      transition: reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 } });
    inFlight.current = false;
    setPending(false);
  }

  return <motion.article
    key={item.source_url}
    role="article"
    aria-label={'Foto para escolher: ' + item.title}
    className="dream-swipe-card absolute inset-0 z-10 overflow-hidden rounded-[30px] border border-white/35 bg-card shadow-2xl"
    style={{ x, y, rotate, touchAction: 'none' }}
    initial={reducedMotion ? false : { scale: 0.965, y: 14, opacity: 0 }}
    animate={controls}
    exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.96, transition: { duration: 0.13 } }}
    whileTap={disabled || pending ? undefined : { scale: 0.992 }}
    drag={disabled || pending ? false : true}
    dragMomentum={false}
    dragElastic={0.85}
    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
    onDragEnd={(_, info) => {
      const action = classifyDreamSwipe(info.offset, info.velocity);
      if (action) void choose(action);
      else void controls.start({ x: 0, y: 0, rotate: 0,
        transition: reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 33 } });
    }}>
    <div className="dream-swipe-photo absolute inset-0 overflow-hidden bg-muted">
      <DreamSearchPhoto image={item.image} sourceUrl={item.source_url}
        category={category} title={item.title}/>
    </div>
    <div className="dream-swipe-scrim pointer-events-none absolute inset-0"/>
    <motion.div style={{ opacity: likeOpacity }} aria-hidden="true"
      className="pointer-events-none absolute left-5 top-8 -rotate-12 rounded-xl border-[3px] border-emerald-300 px-4 py-2 text-2xl font-black tracking-[.14em] text-emerald-200 shadow-lg">CURTI ♡</motion.div>
    <motion.div style={{ opacity: passOpacity }} aria-hidden="true"
      className="pointer-events-none absolute right-5 top-8 rotate-12 rounded-xl border-[3px] border-rose-300 px-4 py-2 text-2xl font-black tracking-[.14em] text-rose-200 shadow-lg">PASSO</motion.div>
    <motion.div style={{ opacity: superOpacity }} aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-7 -translate-x-1/2 rounded-xl border-[3px] border-amber-300 px-4 py-2 text-lg font-black tracking-[.12em] text-amber-200 shadow-lg">SUPER LIKE ★</motion.div>
    <div className="absolute inset-x-0 bottom-0 space-y-2 p-4 pb-4 text-white sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="dream-swipe-source rounded-full border border-white/30 bg-black/35 px-3 py-1 text-[11px] font-bold backdrop-blur-xl">
          {category === 'Decoração' ? 'Pinterest · Inspiração' : 'Instagram · Local'}
        </span>
        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
          className="flex min-h-10 items-center gap-1 rounded-full border border-white/35 bg-black/40 px-3 text-xs font-semibold text-white backdrop-blur-lg"
          onPointerDownCapture={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <ExternalLink size={13}/> Original
        </a>
      </div>
      <h3 className="line-clamp-2 text-xl font-bold leading-snug drop-shadow-lg sm:text-2xl">{item.title}</h3>
      {item.description && <p className="line-clamp-2 text-xs leading-relaxed text-white/85 drop-shadow-md">{item.description}</p>}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <button type="button" disabled={disabled || pending} aria-label={'Passar ' + item.title}
          onPointerDownCapture={e => e.stopPropagation()} onClick={() => void choose('pass')}
          className="dream-swipe-action dream-swipe-reject" title="Passar">
          <X size={23} strokeWidth={2.7}/><span>Passar</span>
        </button>
        <button type="button" disabled={disabled || pending} aria-label={'Curtir ' + item.title}
          onPointerDownCapture={e => e.stopPropagation()} onClick={() => void choose('like')}
          className="dream-swipe-action dream-swipe-like" title="Curtir">
          <Heart size={23} fill="currentColor"/><span>Curtir</span>
        </button>
        <button type="button" disabled={disabled || pending} aria-label={'Super Like ' + item.title}
          onPointerDownCapture={e => e.stopPropagation()} onClick={() => void choose('super')}
          className="dream-swipe-action dream-swipe-super" title="Super Like">
          <Star size={23} fill="currentColor"/><span>Super Like</span>
        </button>
      </div>
    </div>
    {pending && <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs text-white backdrop-blur">
      <RotateCcw size={12} className="animate-spin"/> Salvando...
    </span>}
  </motion.article>;
}
