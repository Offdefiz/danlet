import { useState } from 'react';
import { CalendarDays, Download, ExternalLink, MapPin, Pencil, Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { AGENDA_PREFIX, brazilianToday, calendarIcs, decodeCalendarRecord, googleCalendarLink, isCalendarRecord, type CoupleEvent } from '@/lib/duet-calendar';
import type { Row } from '@/lib/duet.types';
import { playDuetSound } from '@/lib/duet-sounds';

const blank = (): CoupleEvent => ({ title: '', date: brazilianToday(), time: '09:00', notes: '', location: '' });
export function DuetCalendar({ userId, records, onSaved }: { userId: string; records: Row<'records'>[]; onSaved: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState<CoupleEvent>(blank);
  const [current, setCurrent] = useState<Row<'records'> | null>(null);
  const [busy, setBusy] = useState(false);
  const events = records.filter(isCalendarRecord).map(row => ({ row, event: decodeCalendarRecord(row) }))
    .filter((item): item is { row: Row<'records'>; event: CoupleEvent } => Boolean(item.event))
    .sort((a, b) => `${a.event.date}${a.event.time}`.localeCompare(`${b.event.date}${b.event.time}`));
  const launch = (row?: Row<'records'>) => {
    const existing = row && decodeCalendarRecord(row);
    setCurrent(row ?? null);
    setEntry(existing || blank());
    setOpen(true);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.title.trim() || !entry.date || !entry.time) return;
    setBusy(true);
    const payload = { kind: 'setting', title: AGENDA_PREFIX + entry.title.trim(), body: JSON.stringify({ date: entry.date, time: entry.time, location: entry.location.trim(), notes: entry.notes.trim() }), period: 'Curto Prazo', updated_by: userId };
    try {
      if (current) {
        const { data, error } = await supabase.from('records').update(payload).eq('id', current.id).eq('version', current.version).select('id');
        if (error) throw error;
        if (!data.length) throw new Error('Esse compromisso foi alterado em outro aparelho. Atualize e tente novamente.');
      } else {
        const { error } = await supabase.from('records').insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
      await onSaved();
      setOpen(false);
      playDuetSound('success', userId);
      toast.success('Compromisso salvo para vocês dois ♡');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o compromisso.'); }
    finally { setBusy(false); }
  };
  const remove = async (row: Row<'records'>) => {
    if (!window.confirm(`Excluir o compromisso “${row.title.slice(AGENDA_PREFIX.length)}”?`)) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('records').delete().eq('id', row.id).eq('version', row.version).select('id');
      if (error) throw error;
      if (!data.length) throw new Error('O compromisso mudou no outro aparelho. Atualize a agenda.');
      await onSaved();
      toast.success('Compromisso excluído');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao excluir compromisso.'); }
    finally { setBusy(false); }
  };
  const exportIcs = (event: CoupleEvent, id: string) => {
    const data = new Blob([calendarIcs(event, id)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a'); link.href = url; link.download = 'duet-compromisso.ics';
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return <section className="mx-auto max-w-2xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Nossa rotina, juntos</p><h1 className="mt-2 text-3xl font-semibold">Agenda do casal ♡</h1>
        <p className="mt-2 text-sm text-muted-foreground">Plantões, consultas, encontros e compromissos visíveis para os dois.</p></div>
      <Button onClick={() => launch()}><Plus size={17}/>Novo compromisso</Button>
    </header>
    <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">A agenda é compartilhada dentro do Duet. Para incluir um compromisso no Calendário do iPhone, use o arquivo .ics; para o Google Agenda, toque no botão correspondente. A sincronização automática de alterações externas exigirá uma integração futura.</p>
    {events.map(({ row, event }) => <article key={row.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-primary"><span className="text-lg font-semibold">{event.date.slice(8)}</span><span className="text-xs">{new Date(`${event.date}T12:00:00`).toLocaleDateString('pt-BR',{month:'short'})}</span></div>
      <div className="min-w-0 flex-1"><h2 className="font-semibold">{event.title}</h2>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock size={13}/>{event.time}</p>
        {event.location && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={13}/>{event.location}</p>}
        {event.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{event.notes}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => exportIcs(event,row.id)}><Download size={14}/>Apple / .ics</Button>
          <Button size="sm" variant="outline" asChild><a href={googleCalendarLink(event)} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Google Agenda</a></Button>
          <Button size="icon" variant="ghost" aria-label={`Editar ${event.title}`} onClick={() => launch(row)}><Pencil size={15}/></Button>
          <Button size="icon" variant="ghost" aria-label={`Excluir ${event.title}`} disabled={busy} onClick={() => void remove(row)}><Trash2 size={15}/></Button>
        </div>
      </div>
    </article>)}
    {!events.length && <div className="rounded-2xl border border-dashed border-border p-9 text-center"><CalendarDays size={30} className="mx-auto text-primary"/><p className="mt-4 text-sm text-muted-foreground">Nenhum compromisso ainda. Comecem com um plantão, um dentista ou uma data especial.</p><Button variant="outline" className="mt-4" onClick={() => launch()}>Adicionar o primeiro</Button></div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{current ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <label className="block text-sm">Compromisso<Input required maxLength={110} value={entry.title} onChange={e => setEntry(v => ({...v,title:e.target.value}))} placeholder="Plantão, dentista, reunião…" className="mt-1"/></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm">Data<Input required type="date" value={entry.date} onChange={e => setEntry(v => ({...v,date:e.target.value}))} className="mt-1"/></label>
        <label className="block text-sm">Horário<Input required type="time" value={entry.time} onChange={e => setEntry(v => ({...v,time:e.target.value}))} className="mt-1"/></label></div>
        <label className="block text-sm">Local (opcional)<Input maxLength={120} value={entry.location} onChange={e => setEntry(v => ({...v,location:e.target.value}))} className="mt-1"/></label>
        <label className="block text-sm">Observações (opcional)<Textarea maxLength={1000} value={entry.notes} onChange={e => setEntry(v => ({...v,notes:e.target.value}))} className="mt-1"/></label>
        <Button className="w-full" disabled={busy}>{busy ? 'Salvando…' : 'Salvar na agenda dos dois'}</Button>
      </form>
    </DialogContent></Dialog>
  </section>;
}
