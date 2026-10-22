import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playDuetSound } from '@/lib/duet-sounds';

export function DuetWelcome({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    // Never cover the answer screen when launched from a notification.
    if (window.location.search.includes('duet_question=')) return;
    const key = 'duet:welcome:' + userId;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { /* ephemeral or private session */ }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1450);
    return () => window.clearTimeout(timer);
  }, [userId]);
  return <AnimatePresence>
    {visible && <motion.div role="status" aria-label="Bem-vindos ao Duet" className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 px-8 backdrop-blur-xl"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .24 }}>
      <motion.div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-secondary text-primary shadow-xl"
        initial={{ scale: .6, rotate: -14 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 17 }}>
        <Heart size={44} fill="currentColor" strokeWidth={1.5}/>
      </motion.div>
      <motion.p className="mt-6 text-4xl font-bold tracking-tight text-foreground" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .12 }}>duet<span className="text-primary">.</span></motion.p>
      <motion.p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .25 }}><Sparkles size={15}/>Nosso espaço, nosso tempo.</motion.p>
      <Button size="sm" variant="outline" className="mt-8" onClick={() => { playDuetSound('welcome', userId); setVisible(false); }}>Entrar ♡</Button>
    </motion.div>}
  </AnimatePresence>;
}
