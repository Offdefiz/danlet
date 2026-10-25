import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const particles = [
  { x: -115, y: -150, delay: 0.06, size: 22 },
  { x: 110, y: -132, delay: 0.15, size: 20 },
  { x: -170, y: 10, delay: 0.2, size: 16 },
  { x: 164, y: 34, delay: 0.13, size: 25 },
  { x: -68, y: 125, delay: 0.26, size: 18 },
  { x: 78, y: 132, delay: 0.35, size: 16 },
  { x: -42, y: -180, delay: 0.4, size: 12 },
  { x: 48, y: -195, delay: 0.29, size: 15 },
] as const;

export function DreamMatchCelebration({
  title, partner, onClose,
}: { title: string | null; partner: string; onClose: () => void }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!title) return;
    const timer = window.setTimeout(onClose, 3600);
    return () => window.clearTimeout(timer);
  }, [title, onClose]);

  return <AnimatePresence>
    {title && <motion.div key={title} role="dialog" aria-modal="true" aria-label={'É Match! ' + title}
      className="dream-match-celebration fixed inset-0 z-[100] flex items-center justify-center px-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}>
      <div className="relative flex w-full max-w-sm flex-col items-center gap-4 text-center text-white">
        {particles.map((particle, i) => <motion.div key={i} aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/3 text-pink-300"
          initial={{ x: 0, y: 0, scale: 0.5, opacity: 0 }}
          animate={{ x: reduced ? 0 : particle.x, y: reduced ? 0 : particle.y,
            scale: 1, opacity: [0, 1, 0] }}
          transition={{ duration: reduced ? 0 : 2.2, delay: reduced ? 0 : particle.delay, ease: 'easeOut' }}>
          {i % 3 === 0 ? <Sparkles size={particle.size}/> : <Heart size={particle.size} fill="currentColor"/>}
        </motion.div>)}
        <motion.div className="dream-match-heart relative"
          initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 225, damping: 14 }}>
          <Heart size={110} fill="#EE74CC" stroke="#FFD2F4" strokeWidth={1.1}/>
          <Sparkles className="absolute -right-4 -top-2 text-amber-200" size={34}/>
        </motion.div>
        <motion.h2 className="text-4xl font-black tracking-tight text-white drop-shadow-lg"
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.32, delay: reduced ? 0 : 0.1 }}>
          É MATCH! ♡
        </motion.h2>
        <p className="text-base leading-relaxed text-white/85">
          Você e {partner} curtiram a mesma inspiração!
        </p>
        <p className="max-w-xs break-words rounded-2xl border border-white/30 bg-white/15 px-5 py-3 text-lg font-semibold backdrop-blur-xl">
          {title}
        </p>
        <Button variant="outline" onClick={onClose}
          className="mt-2 min-h-12 rounded-full border-white/60 bg-white/15 px-7 text-white backdrop-blur-xl hover:bg-white/25 hover:text-white">
          Continuar descobrindo
        </Button>
      </div>
    </motion.div>}
  </AnimatePresence>;
}
