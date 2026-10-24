import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, Flower2, Heart, House, Plus } from 'lucide-react';
import type { Tab } from '@/lib/duet.types';

export type MainTab = Extract<Tab, 'home' | 'dream' | 'together' | 'calendar'>;
export const primaryTabs = [
  { id: 'home', label: 'Início', icon: House },
  { id: 'dream', label: 'Dream', icon: Heart },
  { id: 'together', label: 'Juntos', icon: Flower2 },
  { id: 'calendar', label: 'Agenda', icon: CalendarDays },
] as const;

/** A second tap on an already selected tab scrolls the current page to top.
 * Tab switches reset the next screen's scroll position without animating the
 * previous screen underneath the floating dock. */
export function pressBottomTab(
  target: MainTab,
  current: Tab,
  onNavigate: (tab: MainTab) => void,
  scroll: (behavior: 'smooth' | 'instant') => void,
  schedule: (callback: () => void) => void,
  reducedMotion = false,
) {
  if (target === current) {
    scroll(reducedMotion ? 'instant' : 'smooth');
    return 'scroll-top';
  }
  onNavigate(target);
  schedule(() => scroll('instant'));
  return 'navigate';
}

export function DuetBottomNavigation({
  active, onNavigate, onMore,
}: { active: Tab; onNavigate: (tab: MainTab) => void; onMore: () => void }) {
  const reducedMotion = useReducedMotion();
  const moreActive = active === 'plans' || active === 'list' || active === 'profile';
  const scroll = (behavior: 'smooth' | 'instant') => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior });
  };
  const schedule = (callback: () => void) => window.requestAnimationFrame(callback);
  return <nav aria-label="Navegação principal"
    className="duet-floating-nav fixed inset-x-0 z-40 mx-auto w-[calc(100%-24px)] max-w-[430px]"
    style={{ bottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}>
    <div className="duet-nav-shell flex items-center gap-1 p-[6px]">
      {primaryTabs.map(item => {
        const selected = active === item.id;
        return <button key={item.id} type="button"
          className={`duet-nav-item relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-[23px] px-1 py-2 text-center transition-colors duration-200 ${selected ? 'duet-nav-active text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          aria-label={item.label} aria-current={selected ? 'page' : undefined}
          onClick={() => pressBottomTab(item.id, active, onNavigate, scroll, schedule, Boolean(reducedMotion))}>
          {selected && <motion.span aria-hidden="true" layoutId="duet-active-glass-tab"
            className="duet-nav-selection pointer-events-none absolute inset-0 rounded-[22px]"
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 35, mass: 0.68 }}/>}
          <item.icon size={21} strokeWidth={selected ? 2.25 : 1.9} aria-hidden="true" className="relative z-[1] shrink-0"/>
          <span className="relative z-[1] block text-[11px] font-semibold leading-none tracking-[-.01em]">{item.label}</span>
        </button>;
      })}
      <button type="button" onClick={onMore}
        className={`duet-nav-item relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-[23px] px-1 py-2 text-center transition-colors duration-200 ${moreActive ? 'duet-nav-active text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        aria-label="Mais opções" aria-haspopup="dialog" aria-current={moreActive ? 'page' : undefined}>
        {moreActive && <motion.span aria-hidden="true" layoutId="duet-active-glass-tab"
          className="duet-nav-selection pointer-events-none absolute inset-0 rounded-[22px]"
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 35, mass: 0.68 }}/>}
        <Plus size={21} strokeWidth={moreActive ? 2.3 : 1.9} aria-hidden="true" className="relative z-[1]"/>
        <span className="relative z-[1] block text-[11px] font-semibold leading-none tracking-[-.01em]">Mais</span>
      </button>
    </div>
  </nav>;
}
