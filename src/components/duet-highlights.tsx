import { CalendarDays, HeartHandshake, ListTodo, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { brazilianToday, decodeCalendarRecord, isCalendarRecord } from '@/lib/duet-calendar';
import { isMatch, type Row, type Tab } from '@/lib/duet.types';

type Props = {
  records: Row<'records'>[];
  references: Row<'references_catalog'>[];
  votes: Row<'votes'>[];
  userId: string;
  onNavigate: (tab: Tab) => void;
};
export function DuetHighlights({ records, references, votes, userId, onNavigate }: Props) {
  const openTasks = records.filter(r => r.kind === 'task' && !r.done);
  const matches = references.filter(r => isMatch(votes, r.id));
  const today = brazilianToday();
  const nextEvents = records.filter(isCalendarRecord).map(decodeCalendarRecord)
    .filter((item): item is NonNullable<typeof item> => Boolean(item && item.date >= today))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 2);
  const likedCount = votes.filter(v => v.user_id === userId && v.liked).length;
  return <section className="space-y-4" aria-label="Resumo da nossa semana">
    <div className="flex items-center justify-between gap-2">
      <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Nosso momento</p><h2 className="mt-1 text-xl font-semibold">Tudo que importa, juntinho ♡</h2></div>
      <Sparkles className="shrink-0 text-primary" size={24}/>
    </div>
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <button type="button" className="rounded-2xl border border-border bg-card p-3 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary" onClick={() => onNavigate('list')} aria-label={`${openTasks.length} tarefas pendentes; abrir lista`}>
        <ListTodo className="text-primary" size={20}/><strong className="mt-3 block text-2xl">{openTasks.length}</strong><span className="text-xs text-muted-foreground">A fazer</span>
      </button>
      <button type="button" className="rounded-2xl border border-border bg-card p-3 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary" onClick={() => onNavigate('dream')} aria-label={`${matches.length} matches; abrir Dream Match`}>
        <HeartHandshake className="text-primary" size={20}/><strong className="mt-3 block text-2xl">{matches.length}</strong><span className="text-xs text-muted-foreground">Matches</span>
      </button>
      <button type="button" className="rounded-2xl border border-border bg-card p-3 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary" onClick={() => onNavigate('calendar')} aria-label={`${nextEvents.length} próximos compromissos; abrir agenda`}>
        <CalendarDays className="text-primary" size={20}/><strong className="mt-3 block text-2xl">{nextEvents.length}</strong><span className="text-xs text-muted-foreground">Na agenda</span>
      </button>
    </div>
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">O que vem por aí</h3><Button size="sm" variant="ghost" onClick={() => onNavigate('calendar')}>Agenda <ArrowRight size={14}/></Button></div>
      {nextEvents.length ? <div className="mt-3 space-y-3">
        {nextEvents.map((event, i) => <div key={i} className="flex items-start gap-3 text-sm">
          <span className="shrink-0 rounded-lg bg-secondary px-2 py-1 font-semibold text-primary">{event.date.slice(8, 10)}/{event.date.slice(5, 7)}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate font-medium">{event.title}</strong><span className="text-xs text-muted-foreground">{event.time}{event.location ? ' · ' + event.location : ''}</span></span>
        </div>)}
      </div> : <p className="mt-2 text-sm text-muted-foreground">Ainda não há próximos compromissos. Que tal combinar um encontro?</p>}
      {likedCount > 0 && <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{likedCount} {likedCount === 1 ? 'inspiração curtida' : 'inspirações curtidas'} por você no Dream Match.</p>}
    </div>
  </section>;
}
