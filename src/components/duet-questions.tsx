import { useEffect, useState } from 'react';
import { CalendarDays, CheckCheck, Heart, Clock, Sparkles, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { playDuetSound } from '@/lib/duet-sounds';
import { juntosIdeas, newSuggestionDate, parseProposalLink } from '@/lib/juntos-suggestions';
import { parseQuestionLink } from '@/lib/weekend-prompts';
import type { Row } from '@/lib/duet.types';

type Props = {
  proposals: Row<'couple_proposals'>[];
  proposalVotes: Row<'couple_proposal_votes'>[];
  members: Row<'couple_members'>[];
  userId: string;
  onSaved: () => Promise<unknown>;
};
const categories = [...new Set(juntosIdeas.map(idea => idea.category))];

export function DuetQuestions({ proposals, proposalVotes, members, userId, onSaved }: Props) {
  const [category, setCategory] = useState('Todos');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => newSuggestionDate());
  const [time, setTime] = useState('19:30');
  const [busy, setBusy] = useState(false);
  const [focusedProposal, setFocusedProposal] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const partner = members.find(member => member.user_id !== userId);
  const meName = members.find(member => member.user_id === userId)?.person || 'Você';
  const partnerName = partner?.person || 'Seu par';
  const topIdeas = category === 'Todos' ? juntosIdeas : juntosIdeas.filter(idea => idea.category === category);

  const chooseIdea = (idea: typeof juntosIdeas[number]) => {
    setTitle(idea.title);
    setTime(idea.time);
    setDate(newSuggestionDate());
    playDuetSound('question', userId);
  };

  useEffect(() => {
    const openDeepLink = () => {
      const proposalId = parseProposalLink(window.location.search);
      if (proposalId) {
        setFocusedProposal(proposalId);
        setShowAll(true);
      } else {
        const legacy = parseQuestionLink(window.location.search);
        if (legacy) {
          const ideaId = legacy.id === 'friday' ? 'jantar' : legacy.id === 'saturday' ? 'passeio'
            : legacy.id === 'sunday' ? 'descanso' : 'agenda';
          const idea = juntosIdeas.find(item => item.id === ideaId);
          if (idea) { setTitle(idea.title); setDate(legacy.date); setTime(idea.time); }
        }
      }
    };
    openDeepLink();
    window.addEventListener('focus', openDeepLink);
    window.addEventListener('popstate', openDeepLink);
    return () => {
      window.removeEventListener('focus', openDeepLink);
      window.removeEventListener('popstate', openDeepLink);
    };
  }, []);

  async function propose(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !title.trim()) return;
    if (!navigator.onLine) { toast.error('Sem internet para criar a proposta.'); return; }
    const duplicate = proposals.find(item => item.title.toLowerCase() === title.trim().toLowerCase()
      && item.date === date && item.status !== 'agreed');
    if (duplicate) { setFocusedProposal(duplicate.id); toast('Esta ideia já está no Juntos. Responda à proposta existente.'); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.from('couple_proposals')
        .insert({ title: title.trim(), date, time, created_by: userId })
        .select('id').single();
      if (error) throw error;
      // The creator accepts the plan, but no calendar record is inserted until
      // the other registered partner independently accepts too.
      const vote = await supabase.rpc('vote_duet_proposal', { p_proposal_id: data.id, p_accept: true });
      if (vote.error) throw vote.error;
      setFocusedProposal(data.id);
      await onSaved();
      playDuetSound('success', userId);
      toast.success('Você topou! A proposta está esperando a resposta de ' + partnerName + '.');
      setTitle('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a proposta.');
    } finally { setBusy(false); }
  }

  async function respond(id: string, accept: boolean) {
    if (busy) return;
    if (!navigator.onLine) { toast.error('Sem conexão para responder.'); return; }
    setBusy(true);
    try {
      const result = await supabase.rpc('vote_duet_proposal', { p_proposal_id: id, p_accept: accept });
      if (result.error) throw result.error;
      await onSaved();
      playDuetSound(accept ? 'success' : 'question', userId);
      toast.success(result.data === 'agreed'
        ? 'Match dos dois! Agora sim, entrou na Agenda. ♡'
        : accept ? 'Seu sim foi salvo. Falta o sim de ' + partnerName + '.'
          : 'Tudo bem! A proposta não vai entrar na Agenda.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao responder à proposta.');
    } finally { setBusy(false); }
  }

  async function quickReply(label: string) {
    if (!navigator.onLine) { toast.error('Sem internet para enviar sua resposta.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('messages')
        .insert({ user_id: userId, body: 'Já bebeu água hoje? — ' + label });
      if (error) throw error;
      await onSaved();
      playDuetSound('success', userId);
      toast.success('Recadinho enviado ao seu par ♡');
    } catch { toast.error('Não foi possível enviar. Tente novamente.'); }
    finally { setBusy(false); }
  }

  const pending = proposals.filter(p => p.status !== 'agreed');
  const agreed = proposals.filter(p => p.status === 'agreed');
  const entries = [...pending, ...agreed].slice(0, showAll ? 100 : 16);
  const visible = focusedProposal && !entries.some(p => p.id === focusedProposal)
    ? [...proposals.filter(p => p.id === focusedProposal), ...entries] : entries;

  return <section className="mx-auto max-w-2xl space-y-5" aria-label="Juntos, propostas e planos do casal">
    <header>
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Juntos ♡</p>
      <h1 className="mt-2 text-3xl font-semibold">Vamos decidir a dois?</h1>
      <p className="mt-2 text-sm text-muted-foreground">Das coisinhas do dia até o próximo passeio. Uma ideia só vira plano quando {meName} e {partnerName} disserem sim.</p>
    </header>

    <div className="glass-panel rounded-3xl p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="text-primary" size={18}/>O que podemos combinar?</h2>
      <p className="mt-1 text-xs text-muted-foreground">Escolha uma sugestão ou escreva uma ideia de vocês.</p>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Categorias">
        {['Todos', ...categories].map(item => <button type="button" key={item}
          onClick={() => setCategory(item)}
          aria-pressed={category === item}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${category === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{item}</button>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {topIdeas.map(idea => <button type="button" key={idea.id}
          onClick={() => chooseIdea(idea)}
          aria-pressed={title === idea.title}
          className={`rounded-2xl border p-3 text-left text-sm transition-transform active:scale-[.98] ${title === idea.title ? 'border-primary bg-secondary' : 'border-border bg-card/80'}`}>
          <span aria-hidden="true" className="block text-xl">{idea.emoji}</span>
          <span className="mt-2 block font-medium">{idea.title}</span>
        </button>)}
      </div>
      <form onSubmit={propose} className="mt-4 space-y-3">
        <label className="block text-sm font-medium">Sua proposta
          <Input required maxLength={150} minLength={3} value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Ex.: Guacamole hoje?" className="mt-1.5"/>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Dia
            <Input required type="date" min={newSuggestionDate()} value={date} onChange={e => setDate(e.target.value)} className="mt-1"/>
          </label>
          <label className="block text-sm">Horário
            <Input required type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1"/>
          </label>
        </div>
        <Button disabled={busy || title.trim().length < 3} className="w-full">
          <Send size={16}/>{busy ? 'Enviando…' : 'Eu topo! Perguntar ao meu par'}
        </Button>
        <p className="text-xs text-muted-foreground">Seu sim fica registrado, mas a Agenda só muda depois do segundo sim.</p>
      </form>
    </div>

    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Heart size={17} className="text-primary"/>Nossas decisões</h2>
        <span className="text-xs text-muted-foreground">{pending.length} aguardando · {agreed.length} combinados</span>
      </div>
      {visible.map(proposal => {
        const mine = proposalVotes.find(v => v.proposal_id === proposal.id && v.user_id === userId);
        const theirs = proposalVotes.find(v => v.proposal_id === proposal.id && v.user_id !== userId);
        const agreed = proposal.status === 'agreed';
        const hasNo = proposal.status === 'declined';
        return <article key={proposal.id} id={`proposal-${proposal.id}`}
          className={`mt-3 rounded-2xl border p-3 ${focusedProposal === proposal.id ? 'border-primary bg-secondary/50' : 'border-border'}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{proposal.title}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock size={12}/>{new Date(proposal.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {proposal.time}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${agreed ? 'bg-green-100 text-green-800' : hasNo ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground'}`}>
              {agreed ? 'Na Agenda ✓' : hasNo ? 'Não combinado' : 'Aguardando'}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs" aria-label="Respostas individuais">
            {[{ id: userId, name: meName, vote: mine }, { id: partner?.user_id, name: partnerName, vote: theirs }].map(person =>
              <div key={person.id ?? person.name} className="rounded-xl bg-muted/70 px-2 py-2">
                <span className="font-medium">{person.name}</span>
                <span className="ml-1 text-muted-foreground">{person.vote ? person.vote.accepted ? '✓ Topou' : '✕ Não topou' : '· Ainda não respondeu'}</span>
              </div>)}
          </div>
          {!agreed && <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" disabled={busy || mine?.accepted === true}
              onClick={() => void respond(proposal.id, true)} className="flex-1"><ThumbsUp size={14}/>Topo!</Button>
            <Button type="button" size="sm" variant="outline" disabled={busy || mine?.accepted === false}
              onClick={() => void respond(proposal.id, false)} className="flex-1"><ThumbsDown size={14}/>Agora não</Button>
          </div>}
          {agreed && <p className="mt-2 flex items-center gap-1 text-xs text-primary"><CheckCheck size={14}/>Os dois toparam. O plano está na Agenda compartilhada.</p>}
        </article>;
      })}
      {!proposals.length && <p className="mt-3 text-sm text-muted-foreground">Ainda não há propostas. Que tal começar com um guacamole hoje? 🥑</p>}
      {proposals.length > 16 && !showAll && <Button variant="outline" className="mt-3 w-full" type="button" onClick={() => setShowAll(true)}>Ver mais propostas</Button>}
    </div>

    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="font-semibold">Um carinho no meio do dia 💧</h2>
      <p className="mt-1 text-sm text-muted-foreground">Já bebeu água? Essa resposta vai ao chat, nunca à Agenda.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {['Sim, já bebi 💗', 'Ainda não 😅', 'Não sei 🤔'].map(label =>
          <Button key={label} type="button" variant="outline" size="sm" disabled={busy}
            onClick={() => void quickReply(label)}>{label}</Button>)}
      </div>
    </div>
    <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays size={15}/>Só compromissos aceitos pelos dois aparecem em Agenda e Planos.</p>
  </section>;
}
