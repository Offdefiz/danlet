import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { ExternalLink, Heart, RotateCcw, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DreamSearchPhoto } from '@/components/dream-media';
import { dreamSwipeDecision, type DreamDecision } from '@/lib/dream-swipe';
import type { DreamPhotoResult } from '@/lib/dream-auto-search';

/** One active media request, no hidden embeds or duplicated vote requests. */
export function DreamSearchDeck({ items, category, busy, onDecide, onSkipUnavailable }: {
  items: DreamPhotoResult[]; category: string; busy: boolean;
  onSkipUnavailable: (item: DreamPhotoResult) => void;
  onDecide: (item: DreamPhotoResult, decision: DreamDecision) => Promise<boolean>;
}) {
  const [direction, setDirection] = useState<DreamDecision>('like');
  const reduced = useReducedMotion();
  const item = items[0];
  return <section aria-label="Publicações para deslizar" className="dream-search-deck space-y-4">
    <p role="status" className="text-center text-xs text-muted-foreground">
      {items.length ? `${items.length} ${items.length === 1 ? 'publicação para avaliar' : 'publicações para avaliar'}`
        : 'Não há mais fotos nesta busca. Pesquise outro lugar para descobrir mais.'}
    </p>
    <div className="relative isolate">
      {items.length > 1 && <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 inset-y-0 translate-y-2 rotate-2 rounded-[28px] border border-primary/20 bg-secondary shadow-lg"/>}
      <AnimatePresence mode="wait" custom={direction}>
        {item && <motion.div key={item.source_url} custom={direction}
          initial={reduced ? false : { opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit="depart" variants={{ depart: (decision: DreamDecision) => reduced ? { opacity: 0 } : ({
            opacity: 0, x: decision === 'pass' ? -220 : decision === 'super' ? 0 : 220,
            y: decision === 'super' ? -140 : 0, rotate: decision === 'pass' ? -12 : 12,
          }) }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}>
          <PublicationCard item={item} category={category} busy={busy}
            onSkipUnavailable={() => onSkipUnavailable(item)} onDecide={decision => { setDirection(decision); return onDecide(item, decision); }}/>
        </motion.div>}
      </AnimatePresence>
    </div>
  </section>;
}

function PublicationCard({ item, category, busy, onDecide, onSkipUnavailable }: {
  item: DreamPhotoResult; category: string; busy: boolean;
  onSkipUnavailable: () => void;
  onDecide: (decision: DreamDecision) => Promise<boolean>;
}) {
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const x = useMotionValue(0);
  const reduced = useReducedMotion();
  const rotate = useTransform(x, [-180, 180], reduced ? [0, 0] : [-10, 10]);
  const likeOpacity = useTransform(x, [15, 80], [0, 1]);
  const passOpacity = useTransform(x, [-80, -15], [1, 0]);
  const disabled = busy || saving || !ready;
  async function decide(decision: DreamDecision) {
    if (disabled || lock.current) return;
    lock.current = true; setSaving(true);
    try { await onDecide(decision); }
    finally { lock.current = false; setSaving(false); x.set(0); }
  }
  return <div className="relative space-y-4">
    <motion.article aria-label={item.title} style={{ x, rotate, touchAction: 'pan-y' }}
      drag={disabled ? false : 'x'} dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65} dragMomentum={false}
      onDragEnd={(_, info) => { const decision = dreamSwipeDecision(info.offset.x); if (decision) void decide(decision); }}
      className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-card p-2 shadow-xl">
      <div className="pointer-events-none absolute inset-x-5 top-6 z-10 flex justify-between" aria-hidden="true">
        <motion.span style={{ opacity: likeOpacity }} className="-rotate-12 rounded-xl border-4 border-emerald-400 bg-black/50 px-3 py-1 text-2xl font-black text-emerald-300">CURTIR ♡</motion.span>
        <motion.span style={{ opacity: passOpacity }} className="rotate-12 rounded-xl border-4 border-rose-400 bg-black/50 px-3 py-1 text-2xl font-black text-rose-300">PASSAR</motion.span>
      </div>
      <div className="space-y-1 px-3 pb-3 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{category === 'Decoração' ? 'Pinterest · Decoração' : 'Instagram · Local'}</p>
        <h3 className="text-xl font-semibold leading-tight">{item.title}</h3>
      </div>
      <DreamSearchPhoto key={attempt} image={item.image} sourceUrl={item.source_url}
        category={category} title={item.title} swipe onAvailabilityChange={setReady}/>
      {item.description && <p className="line-clamp-3 px-3 py-3 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}
    </motion.article>
    <div className="sticky bottom-0 z-20 space-y-3 rounded-[24px] border border-border bg-card/95 px-2 py-3 shadow-lg backdrop-blur-xl">
    <div className="flex justify-center gap-3">
      <Button asChild variant="ghost" size="sm" className="rounded-full"><a href={item.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Publicação original</a></Button>
      {!ready && <Button variant="outline" size="sm" className="rounded-full" disabled={saving || busy}
        onClick={() => setAttempt(value => value + 1)}><RotateCcw size={14}/> Recarregar foto</Button>}
    </div>
    {!ready && <Button variant="ghost" className="w-full rounded-full" disabled={busy || saving} onClick={onSkipUnavailable}>Pular foto indisponível sem votar</Button>}
    <div className="flex items-start justify-center gap-5">
      {([['pass', 'Passar', X], ['like', 'Curtir', Heart], ['super', 'Super Like', Star]] as const).map(([decision, label, Icon]) => <div key={decision} className="text-center">
        <Button size="circle" variant={decision === 'pass' ? 'reject' : decision === 'like' ? 'success' : 'outline'}
          className={decision === 'super' ? 'border-amber-400/60 bg-amber-400/10 text-amber-500 shadow-lg' : 'shadow-lg'}
          aria-label={label + ': ' + item.title} disabled={disabled} onClick={() => void decide(decision)}>
          <Icon fill={decision === 'super' ? 'currentColor' : 'none'}/>
        </Button><p className="mt-2 text-[11px] text-muted-foreground">{label}</p>
      </div>)}
    </div>
    <p role="status" className="text-center text-xs text-muted-foreground">{saving ? 'Salvando sua escolha…' : ready ? 'Deslize para passar ou curtir. A estrela salva nos Super Likes.' : 'Aguardando uma fotografia disponível para liberar sua escolha.'}</p>
    </div>
  </div>;
}
