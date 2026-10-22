import { useEffect, useState } from 'react';
import { CalendarDays, Heart, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { playDuetSound } from '@/lib/duet-sounds';
import { questions, nextQuestionDate, parseQuestionLink, readQuestionAnswer, makeAnswerRecord, type QuestionId } from '@/lib/weekend-prompts';
import type { Row } from '@/lib/duet.types';

type Props = { records: Row<'records'>[]; members: Row<'couple_members'>[]; userId: string; onSaved: () => Promise<unknown> };
export function DuetQuestions({ records, members, userId, onSaved }: Props) {
  const [selected, setSelected] = useState<QuestionId | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:30');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const saved = records.map(row => ({ row, answer: readQuestionAnswer(row) }))
    .filter((item): item is { row: Row<'records'>; answer: NonNullable<typeof item.answer> } => Boolean(item.answer));

  function choose(id: QuestionId, overrideDate?: string) {
    const q = questions.find(p => p.id === id)!;
    const targetDate = overrideDate || nextQuestionDate(id);
    const existing = saved.find(x => x.answer.questionId === id && x.answer.date === targetDate && x.answer.by === userId);
    setSelected(id); setDate(targetDate); setTime(existing?.answer.time || q.time);
    setAnswer(existing?.answer.answer || '');
  }

  useEffect(() => {
    const link = parseQuestionLink(window.location.search);
    if (link) choose(link.id, link.date);
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ id: QuestionId; date?: string }>).detail;
      if (detail?.id) choose(detail.id, detail.date);
    };
    window.addEventListener('duet:open-question', onOpen);
    return () => window.removeEventListener('duet:open-question', onOpen);
    // Run once on mount; changes to answers are reflected when selecting a card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function quickReply(label: string, question: string) {
    if (!navigator.onLine) { toast.error('Sem internet para enviar sua resposta.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('messages').insert({ user_id: userId, body: question + ' — ' + label });
      if (error) throw error;
      await onSaved();
      playDuetSound('success', userId);
      toast.success('Resposta enviada para seu par ♡');
      setSelected(null);
    } catch { toast.error('Não foi possível enviar. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    if (!navigator.onLine) { toast.error('Sem internet: sua resposta ainda não foi salva.'); return; }
    setBusy(true);
    try {
      const payload = makeAnswerRecord({ questionId: selected, date, time, answer, by: userId });
      const previous = saved.find(x => x.answer.questionId === selected && x.answer.date === date && x.answer.by === userId);
      if (previous) {
        const { data, error } = await supabase.from('records').update(payload)
          .eq('id', previous.row.id).eq('version', previous.row.version).select('id');
        if (error) throw error;
        if (!data.length) throw new Error('Este plano foi alterado em outro aparelho. Atualize e tente novamente.');
      } else {
        const { error } = await supabase.from('records').insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
      await onSaved();
      playDuetSound('success', userId);
      toast.success('Sua ideia entrou no planejamento dos dois ♡');
      setSelected(null);
      if (window.location.search.includes('duet_question=')) window.history.replaceState(null, '', '/');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar esta ideia.'); }
    finally { setBusy(false); }
  }
  const chosen = questions.find(q => q.id === selected);
  const name = (user: string) => members.find(m => m.user_id === user)?.person || 'Seu par';
  return <section className="mx-auto max-w-2xl space-y-5" aria-label="Perguntas e planos do casal">
    <header><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Nosso fim de semana</p>
      <h1 className="mt-2 text-3xl font-semibold">Vamos combinar? ♡</h1>
      <p className="mt-2 text-sm text-muted-foreground">Uma pergunta, uma resposta, um plano de verdade para vocês dois.</p></header>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {questions.map(q => {
        const date = nextQuestionDate(q.id);
        const replies = saved.filter(x => x.answer.questionId === q.id && x.answer.date === date);
        return <button key={q.id} type="button" onClick={() => { playDuetSound('question', userId); choose(q.id); }}
          aria-label={q.title} className={`rounded-2xl border p-4 text-left transition-transform active:scale-[.99] focus-visible:outline-2 focus-visible:outline-primary ${selected === q.id ? 'border-primary bg-secondary' : 'border-border bg-card hover:-translate-y-0.5'}`}>
          <span aria-hidden="true" className="text-2xl">{q.id === 'friday' ? '🍝' : q.id === 'saturday' ? '🌿' : q.id === 'sunday' ? '☀️' : '📝'}</span>
          <h2 className="mt-2 font-semibold">{q.title}</h2>
          <span className="mt-1 block text-xs text-muted-foreground">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'long' })}</span>
          {replies.length > 0 && <span className="mt-2 flex items-center gap-1 text-xs text-primary"><CheckCircle2 size={13}/>{replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}</span>}
        </button>;
      })}
    </div>
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="font-semibold">Um carinho durante o dia 💧</h2>
      <p className="mt-1 text-sm text-muted-foreground">Já bebeu água hoje? Responda rapidinho para seu par.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {['Sim, já bebi 💗', 'Ainda não 😅', 'Não sei 🤔'].map(label =>
          <Button type="button" key={label} variant="outline" size="sm" disabled={busy} onClick={() => void quickReply(label, 'Já bebeu água hoje?')}>{label}</Button>)}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Esta resposta é uma mensagem, não um compromisso na agenda.</p>
    </div>
    {chosen && <form onSubmit={submit} className="space-y-4 rounded-2xl border border-primary/30 bg-card p-5">
      <div className="flex items-center gap-2 text-primary"><Heart size={18}/><h2 className="font-semibold">{chosen.title}</h2></div>
      <label className="block text-sm font-medium">Sua ideia
        <Textarea required className="mt-2 min-h-24" maxLength={150} value={answer} onChange={e => setAnswer(e.target.value)} placeholder={chosen.example}/></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">Dia <Input className="mt-1" required type="date" value={date} onChange={e => setDate(e.target.value)}/></label>
        <label className="block text-sm">Horário <Input className="mt-1" required type="time" value={time} onChange={e => setTime(e.target.value)}/></label>
      </div>
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><CalendarDays size={15} className="shrink-0"/>Ao salvar, sua resposta aparece no calendário compartilhado. Vocês podem ajustar a data depois.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void quickReply('Ainda não sei', chosen.title)}>Ainda não sei</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void quickReply('Nada planejado por enquanto', chosen.title)}>Sem planos ainda</Button>
      </div>
      <Button className="w-full" disabled={busy || !answer.trim()}>{busy ? 'Salvando…' : 'Guardar nosso plano'} <Sparkles size={16}/></Button>
    </form>}
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold"><Clock size={17} className="text-primary"/>As ideias que já combinamos</h2>
      {saved.slice(0, 14).map(({ row, answer: a }) => <div key={row.id} className="mt-3 border-t border-border pt-3">
        <span className="text-xs text-primary">{name(a.by)} · {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {a.time}</span>
        <p className="mt-1 text-sm">{a.answer}</p>
      </div>)}
      {!saved.length && <p className="mt-2 text-sm text-muted-foreground">Ainda não existem respostas. Qual vai ser o primeiro plano?</p>}
    </div>
  </section>;
}
