import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart, House, ListChecks, Plus, X, Check, Instagram, ExternalLink, MapPin, Flower2, ArrowLeft, Search, LogOut, Pencil, Trash2, Camera, Clock, BookHeart, CheckCheck, UserRound, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useDuet } from '@/hooks/use-duet';
import { categories, periods, isMatch, partnerVote, type Row, type Tab } from '@/lib/duet.types';
import { DuetMusic } from '@/components/duet-music';
import { findReferences, fetchPhoto, addFromInstagram } from '@/lib/duet.functions';
import { Avatar, Chat, PushButton, Tutorial } from '@/components/duet-extras';
import { ThemePicker } from '@/components/duet-theme';
import { DuetAccountMenu } from '@/components/duet-account-menu';
import { rankReferences } from '@/lib/duet-recommendations';
import { DuetNotificationCenter } from '@/components/duet-notification-center';
import { DuetCalendar } from '@/components/duet-calendar';
import { playDuetSound } from '@/lib/duet-sounds';
import { DuetHighlights } from '@/components/duet-highlights';

type RecordForm = { id?: string; version?: number; kind: 'goal' | 'task' | 'note' | 'setting'; title: string; body: string; period: string; reference_id?: string | null; done?: boolean };
type SearchItem = { title: string; description: string; source_url: string };
const dateLabel = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export function DuetOrganizer({ userId }: { userId: string }) {
  const query = useDuet(userId);
  const cache = useQueryClient();
  const [tab, setTab] = useState<Tab>('home');
  const [category, setCategory] = useState('Locais');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [scenery, setScenery] = useState('');
  const [history, setHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('Minhas escolhas');
  const [period, setPeriod] = useState(periods[0]);
  const [form, setForm] = useState<RecordForm | null>(null);
  const [detail, setDetail] = useState<Row<'references_catalog'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [sync, setSync] = useState('Salvo');
  const [online, setOnline] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [region, setRegion] = useState('');
  const [searchError, setSearchError] = useState('');
  const [addReference, setAddReference] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [nameEditor, setNameEditor] = useState<string | null>(null);
  const [locallyVoted, setLocallyVoted] = useState<Set<string>>(new Set());
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('right');
  const [refInsta, setRefInsta] = useState('');
  const [refDescription, setRefDescription] = useState('');
  const search = useServerFn(findReferences);
  const getPhoto = useServerFn(fetchPhoto);
  const addInsta = useServerFn(addFromInstagram);
  const triedPhotos = useRef<Set<string>>(new Set());
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const data = query.data;
  const me = data?.members.find(m => m.user_id === userId);
  const partner = data?.members.find(m => m.user_id !== userId);
  const partnerName = partner?.person ?? (me?.person === 'Daniel' ? 'Letícia' : 'Daniel');
  // Photo enrichment is an asynchronous effect, never a state mutation during
  // render. Only try the visible card, once per session, to avoid request storms.
  const previewRef = data && (detail ?? rankReferences(
    data.references.filter(ref =>
      ref.category === category &&
      (!state || ref.state === state) &&
      (!city || ref.city === city) &&
      (!scenery || ref.scenery === scenery) &&
      !data.votes.some(v => v.reference_id === ref.id && v.user_id === userId) &&
      !locallyVoted.has(ref.id)),
    data.votes, userId, data.references,
  )[0]);
  useEffect(() => {
    if (!previewRef || previewRef.image_path || triedPhotos.current.has(previewRef.id)) return;
    triedPhotos.current.add(previewRef.id);
    void getPhoto({ data: { id: previewRef.id } })
      .then(result => { if (result.ok) void cache.invalidateQueries({ queryKey: ['duet', userId] }); })
      .catch(() => { /* A manual photo can still be uploaded in the details dialog. */ });
  }, [previewRef?.id, previewRef?.image_path, cache, getPhoto, userId]);


  async function mutate(action: () => PromiseLike<{ error: { message: string } | null }>) {
    if (!navigator.onLine) { toast.error('Sem conexão. Sua alteração ainda não foi salva.'); return false; }
    setBusy(true); setSync('Salvando…');
    try {
      const result = await action(); if (result.error) throw new Error(result.error.message);
      await cache.invalidateQueries({ queryKey: ['duet', userId] }); setSync('Salvo'); return true;
    } catch (err) { setSync('Falha ao salvar'); toast.error(err instanceof Error ? err.message : 'Não foi possível salvar.'); return false; }
    finally { setBusy(false); }
  }
  function newRecord(kind: RecordForm['kind'], referenceId?: string) {
    setForm({ kind, title: '', body: '', period: periods[0] ?? '', reference_id: referenceId ?? null });
  }
  async function saveRecord(e: React.FormEvent) {
    e.preventDefault(); if (!form) return;
    const payload = { kind: form.kind, title: form.title.trim(), body: form.body, period: form.period, reference_id: form.reference_id ?? null, updated_by: userId };
    if (form.id) {
      const saved = await mutate(async () => {
        const result = await supabase.from('records').update(payload).eq('id', form.id ?? '').eq('version', form.version ?? 0).select('id');
        if (!result.error && result.data.length === 0) return { error: { message: 'Este registro mudou no outro aparelho. Feche e abra novamente para revisar antes de salvar.' } };
        return result;
      }); if (saved) setForm(null);
    } else if (await mutate(() => supabase.from('records').insert({ ...payload, created_by: userId }))) setForm(null);
  }
  async function vote(ref: Row<'references_catalog'>, liked: boolean) {
    setSwipeDirection(liked ? 'right' : 'left');
    setLocallyVoted(previous => new Set(previous).add(ref.id));
    const saved = await mutate(() => supabase.from('votes').upsert({ reference_id: ref.id, user_id: userId, liked, updated_at: new Date().toISOString() }));
    if (!saved) setLocallyVoted(previous => { const next = new Set(previous); next.delete(ref.id); return next; });
    else if (liked && partnerVote(data?.votes ?? [], ref.id, userId)?.liked) {
      playDuetSound('match', userId);
      toast.success(`Match! Você e ${partnerName} curtiram ${ref.title}. ♡`);
    }
  }
  async function sign(record: Row<'records'>) {
    if (await mutate(() => supabase.from('signatures').insert({ record_id: record.id, user_id: userId }))) { playDuetSound('success', userId); toast.success('Sua assinatura foi salva.'); }
  }
  async function remove(record: Row<'records'>) {
    if (!window.confirm(`Excluir “${record.title}”?`)) return;
    await mutate(() => supabase.from('records').delete().eq('id', record.id).eq('version', record.version));
  }
  async function promote(ref: Row<'references_catalog'>) {
    await mutate(() => supabase.from('records').insert({ kind: 'goal', title: ref.title, body: ref.description, reference_id: ref.id, created_by: userId, updated_by: userId, period: 'Médio Prazo' }));
  }
  async function runSearch() {
    setBusy(true); setSearchError(''); setResults([]);
    try { const found = await search({ data: { category, region } }); setResults(found.results); setSearchError(found.error ?? (found.results.length ? '' : 'Nenhuma fonte encontrada nesta busca.')); }
    catch (err) { setSearchError(err instanceof Error ? err.message : 'Não foi possível pesquisar.'); }
    finally { setBusy(false); }
  }
  async function include(item: SearchItem) {
    if (await mutate(() => supabase.from('references_catalog').insert({ ...item, category, created_by: userId, verification: 'A confirmar' }))) setResults(current => current.filter(r => r.source_url !== item.source_url));
  }
  async function saveReference(e: React.FormEvent) {
    e.preventDefault();
    const handle = refInsta.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '').replace(/\/.*$/, '');
    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) { toast.error('Digite um @ válido, ex.: @villapaolucci'); return; }
    setBusy(true);
    try { const r = await addInsta({ data: { handle, category, notes: refDescription } }); toast.success(`${r.title} adicionado ♡`); await cache.invalidateQueries({ queryKey: ['duet', userId] }); setAddReference(false); setRefInsta(''); setRefDescription(''); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar.'); }
    finally { setBusy(false); }
  }
  async function uploadAvatar(file: File) {
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { toast.error('Escolha uma imagem de até 10 MB.'); return; }
    const path = `${userId}/avatar-${crypto.randomUUID()}.jpg`;
    await mutate(async () => { const sent = await supabase.storage.from('duet-photos').upload(path, file); if (sent.error) return sent; return supabase.from('profiles').update({ avatar_path: path }).eq('id', userId); });
  }
  async function upload(file: File, ref: Row<'references_catalog'>) {
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { toast.error('Escolha uma imagem de até 10 MB.'); return; }
    const path = `${userId}/${crypto.randomUUID()}.${file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg'}`;
    await mutate(async () => {
      const sent = await supabase.storage.from('duet-photos').upload(path, file); if (sent.error) return sent;
      return supabase.from('references_catalog').update({ image_path: path, image_credit: `Foto enviada por ${me?.person ?? 'nós'}` }).eq('id', ref.id);
    });
  }
  async function signOut() { await cache.cancelQueries(); cache.clear(); await supabase.auth.signOut(); window.history.replaceState(null, '', '/'); }
  if (query.isPending) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Abrindo nosso espaço…</div>;
  if (!data || query.error) return <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6"><Heart className="text-primary" size={36}/><h1 className="text-2xl font-semibold">Seu espaço está reservado.</h1><p className="text-muted-foreground">{query.error?.message ?? 'As contas de Daniel e Letícia ainda precisam ser vinculadas.'}</p><Button onClick={() => void query.refetch()}>Tentar novamente</Button><Button variant="outline" onClick={signOut}>Sair</Button></div>;
  const goals = data.records.filter(r => r.kind === 'goal');
  const tasks = data.records.filter(r => r.kind === 'task');
  const notes = data.records.filter(r => r.kind === 'note' && !r.reference_id);
  const complete = goals.filter(g => data.signatures.filter(s => s.record_id === g.id).length === 2).length;
  const refs = data.references.filter(r => r.category === category && (!state || r.state === state) && (!city || r.city === city) && (!scenery || r.scenery === scenery));
  const pending = rankReferences(refs.filter(r => !(data.votes.some(v => v.reference_id === r.id && v.user_id === userId) || locallyVoted.has(r.id))), data.votes, userId, data.references);
  const current = pending[0];
  const historyRefs = refs.filter(r => {
    const my = data.votes.find(v => v.reference_id === r.id && v.user_id === userId);
    const other = partnerVote(data.votes, r.id, userId);
    if (historyFilter === 'Matches') return isMatch(data.votes, r.id);
    if (historyFilter === 'Descartados') return my?.liked === false;
    return historyFilter === 'Escolhas do parceiro' ? Boolean(other) : Boolean(my);
  });
  const edit = (r: Row<'records'>) => setForm({ ...r, kind: r.kind as RecordForm['kind'] });
  const weddingDate = data.records.find(r => r.kind === 'setting' && r.title === 'Data do casamento');
  const days = weddingDate?.body && !Number.isNaN(Date.parse(weddingDate.body)) ? Math.max(0, Math.ceil((Date.parse(`${weddingDate.body}T12:00:00`) - Date.now()) / 86400000)) : null;
  const recordsList = (items: Row<'records'>[], taskMode = false) => <div className="space-y-3">{items.map(r => <article key={r.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">{taskMode && <Button size="icon" variant={r.done ? 'success' : 'outline'} aria-label={`${r.done ? 'Desmarcar' : 'Concluir'} ${r.title}`} disabled={busy} onClick={() => void mutate(() => supabase.from('records').update({ done: !r.done, updated_by: userId }).eq('id', r.id).eq('version', r.version))}>{r.done && <Check/>}</Button>}<div className="min-w-0 flex-1"><h3 className={`font-medium ${r.done ? 'line-through text-muted-foreground' : ''}`}>{r.title}</h3>{r.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.body}</p>}<p className="mt-2 text-[11px] text-muted-foreground">{data.members.find(m => m.user_id === r.updated_by)?.person ?? 'Nós'} · {dateLabel(r.updated_at)}</p></div><Button size="icon" variant="ghost" title="Editar" aria-label={`Editar ${r.title}`} onClick={() => edit(r)}><Pencil size={14}/></Button><Button size="icon" variant="ghost" title="Excluir" aria-label={`Excluir ${r.title}`} disabled={busy} onClick={() => remove(r)}><Trash2 size={14}/></Button></article>)}</div>;
  return <div className="min-h-screen bg-background pb-32">
    <header className="app-shell flex min-h-20 items-center justify-between gap-2 border-b border-border py-3">
      <div className="flex min-w-0 items-center gap-2"><Heart size={22} className="shrink-0 text-primary"/><span className="text-2xl font-bold">duet.</span></div>
      <Tutorial userId={userId}/>
      <div className="flex items-center gap-1 sm:gap-2">
        <ThemePicker userId={userId} hideTrigger/>
        <PushButton userId={userId} hideTrigger/>
        <DuetNotificationCenter userId={userId} activity={data.activity} messages={data.messages} members={data.members} onNavigate={target => { if (target === 'chat') window.dispatchEvent(new Event('duet:open-chat')); else setTab(target); }}/>
        <Chat userId={userId} me={me?.person ?? ''} partner={partnerName} messages={data.messages} profiles={data.profiles}/>
        <DuetAccountMenu name={me?.person ?? 'Nós'} profile={data.profiles.find(p => p.id === userId)} onProfile={() => setTab('profile')} onSignOut={() => void signOut()} online={online} sync={sync}/>
      </div>
    </header>{!online && <div role="status" className="app-shell mt-3 rounded-xl border border-warning/30 bg-secondary px-4 py-3 text-sm text-secondary-foreground">Você está sem internet. Suas alterações serão salvas quando a conexão voltar; confira antes de fechar o aplicativo.</div>}<main className="app-shell py-7 sm:py-10">
    {tab === 'home' && <div className="space-y-9"><section className="border-b border-border pb-7"><p className="text-xs uppercase tracking-widest text-muted-foreground">Nosso espaço a dois</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Oi, {me?.person}. <span className="text-primary">♡</span></h1><p className="mt-3 text-muted-foreground">O que vamos construir juntos hoje?</p><div className="mt-6 flex flex-wrap gap-2"><Button onClick={() => newRecord('task')}><Plus/>Próximo passo</Button><Button variant="outline" onClick={() => newRecord('note')}><Pencil/>Anotar</Button></div></section><DuetHighlights records={data.records} references={data.references} votes={data.votes} userId={userId} onNavigate={setTab}/><section className="garden-band flex flex-wrap items-center justify-between gap-6 border-y border-border py-7"><div><div className="flex items-center gap-2 text-success"><Flower2 size={18}/><span className="text-xs uppercase tracking-widest">Nosso casamento</span></div><h2 className="mt-3 text-2xl font-semibold">Um sim, do nosso jeito.</h2><p className="mt-2 text-sm text-muted-foreground">English Garden · flores, jardim e nós dois</p><Button variant="link" className="mt-3 px-0" onClick={() => { setCategory('Locais'); setTab('dream'); }}>Encontrar nosso lugar <Heart size={15}/></Button></div><div className="text-right"><p className="text-sm font-medium">{days === null ? 'A data ainda é nossa escolha' : `${days} dias para o nosso sim`}</p><Button variant="ghost" className="mt-2 text-xs" onClick={() => weddingDate ? edit(weddingDate) : setForm({ kind: 'setting', title: 'Data do casamento', body: '', period: periods[0] ?? '' })}><Pencil size={13}/>{weddingDate ? 'Editar data' : 'Definir data'}</Button></div></section><section><Section title="Próximos passos" action={<Button variant="ghost" size="icon" title="Adicionar tarefa" onClick={() => newRecord('task')}><Plus/></Button>}/>{tasks.length ? recordsList(tasks, true) : <Empty text="Um próximo passo de cada vez." action="Adicionar primeiro passo" onClick={() => newRecord('task')}/>}</section><section><Section title="Nosso caderno" action={<Button variant="ghost" size="icon" title="Adicionar anotação" onClick={() => newRecord('note')}><Plus/></Button>}/>{notes.length ? recordsList(notes) : <Empty text="Espaço para o que não queremos esquecer." action="Escrever uma anotação" onClick={() => newRecord('note')}/>}</section><DuetMusic records={data.records} userId={userId}/><section className="flex items-center justify-between border-t border-border pt-6"><div><p className="font-medium">Nossos planos</p><p className="mt-1 text-sm text-muted-foreground">{goals.length ? `${complete} de ${goals.length} metas concluídas pelos dois` : 'Nenhuma meta definida ainda'}</p></div><Button variant="outline" onClick={() => setTab('plans')}>Ver planos</Button></section><section><Section title="Últimas atualizações"/>{data.activity.slice(0,5).map(a => <div key={a.id} className="flex justify-between gap-4 border-b border-border py-3 text-xs text-muted-foreground"><span>{data.members.find(m => m.user_id === a.actor_id)?.person ?? 'Nós'} · {a.entity_type === 'votes' ? 'avaliou uma referência' : a.entity_type === 'signatures' ? 'assinou uma meta' : a.action === 'DELETE' ? 'excluiu um registro' : 'atualizou nossos planos'}</span><span>{dateLabel(a.created_at)}</span></div>)}{!data.activity.length && <p className="text-sm text-muted-foreground">Nossas atualizações aparecerão aqui.</p>}</section></div>}
    {tab === 'dream' && <div className="mx-auto max-w-xl"><p className="text-xs uppercase tracking-widest text-muted-foreground">Descobertas a dois</p><div className="mt-2 flex items-center justify-between"><h1 className="text-3xl font-semibold">Dream Match <span className="text-primary">♡</span></h1><Button variant="ghost" size="icon" title="Adicionar referência" aria-label="Adicionar referência" onClick={() => setAddReference(true)}><Plus/></Button></div><div className="my-5 flex flex-wrap gap-2">{categories.map(c => <Button key={c} variant={category === c ? 'default' : 'outline'} onClick={() => { setCategory(c); setCity(''); setState(''); setScenery(''); }} className="text-xs">{c}</Button>)}</div><div className="mb-4 grid grid-cols-3 gap-2"><Select label="Estado" value={state} onChange={v => { setState(v); setCity(''); }} options={[...new Set(data.references.filter(r => r.category === category).map(r => r.state).filter(Boolean))]}/><Select label="Cidade" value={city} onChange={setCity} options={[...new Set(data.references.filter(r => r.category === category && (!state || r.state === state)).map(r => r.city).filter(Boolean))]}/><Select label="Cenário" value={scenery} onChange={setScenery} options={[...new Set(refs.map(r => r.scenery).filter(Boolean))]}/></div><div className="mb-5 flex justify-between gap-2"><Button variant="ghost" className="px-0 text-xs" onClick={() => setHistory(!history)}>{history ? <ArrowLeft/> : <BookHeart/>}{history ? 'Voltar às descobertas' : 'Nosso histórico'}</Button><Button variant="outline" className="text-xs" onClick={() => setSearchOpen(true)}><Search/>Buscar novas opções</Button></div>
      {!history && <section aria-label="Sugestões para o casal" className="mb-5 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Sugestões para vocês ♡</h2>
        <p className="mt-1 text-xs text-muted-foreground">Ordenadas pelas curtidas de vocês. Apenas opções já cadastradas no Duet.</p>
        {pending.length ? <div className="mt-3 grid gap-2">
          {pending.slice(0, 3).map(reference => <button key={reference.id} type="button" className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setDetail(reference)}>
            <span className="min-w-0"><span className="block truncate font-medium">{reference.title}</span><span className="block text-xs text-muted-foreground">{[reference.city, reference.state].filter(Boolean).join(' · ') || reference.scenery || reference.category}</span></span><Heart size={16} className="shrink-0 text-primary"/>
          </button>)}
        </div> : <div className="mt-3 space-y-2"><p className="text-xs text-muted-foreground">Nenhuma opção cadastrada neste filtro. Comecem por uma inspiração:</p>
          <div className="flex flex-wrap gap-2">{['Tiradentes, MG', 'Ouro Preto, MG', 'Capitólio, MG', 'Guarapari, ES'].map(place =>
            <Button key={place} variant="outline" size="sm" className="text-xs" onClick={() => { setRegion(place); setSearchOpen(true); }}>{place}</Button>)}</div>
        </div>}
      </section>}
      {history ? <><div className="mb-5 flex flex-wrap gap-2">{['Minhas escolhas','Escolhas do parceiro','Matches','Descartados'].map(f => <Button key={f} variant={historyFilter === f ? 'secondary' : 'ghost'} className="text-xs" onClick={() => setHistoryFilter(f)}>{f}</Button>)}</div><div className="space-y-3">{historyRefs.map(r => <article key={r.id} className="rounded-lg border border-border bg-card p-4"><h2 className="font-semibold">{r.title}</h2><p className="mt-2 text-xs text-muted-foreground">Você: {data.votes.find(v => v.reference_id === r.id && v.user_id === userId)?.liked === true ? 'curtiu' : data.votes.find(v => v.reference_id === r.id && v.user_id === userId)?.liked === false ? 'não curtiu' : 'ainda não avaliou'} · {partnerName}: {voteLabel(partnerVote(data.votes,r.id,userId))}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="icon" variant="reject" title="Não curtir" disabled={busy} onClick={() => vote(r,false)}><X/></Button><Button size="icon" variant="success" title="Curtir" disabled={busy} onClick={() => vote(r,true)}><Heart/></Button><Button variant="outline" onClick={() => setDetail(r)}>Detalhes</Button>{isMatch(data.votes,r.id) && !goals.some(g => g.reference_id === r.id) && <Button disabled={busy} onClick={() => promote(r)}><Plus/>Levar aos planos</Button>}</div></article>)}{!historyRefs.length && <Empty text="Ainda não há escolhas neste filtro."/>}</div></> : current ? <><div className="mb-3 flex items-center justify-between text-xs text-muted-foreground"><span>{pending.length} {pending.length === 1 ? 'descoberta' : 'descobertas'} para você</span><span className="text-success">{partnerName}: {voteLabel(partnerVote(data.votes,current.id,userId))}</span></div><AnimatePresence mode="wait"><motion.article key={current.id} drag={busy ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.65} dragMomentum={false} onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 75) void vote(current,info.offset.x > 0); }} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: swipeDirection === 'right' ? 160 : -160, rotate: swipeDirection === 'right' ? 8 : -8 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} className="overflow-hidden rounded-lg border border-border bg-card"><ReferencePhoto reference={current}/><div className="p-5"><div className="flex items-center gap-2 text-[11px] font-medium text-success"><MapPin size={13}/>{[current.city,current.state].filter(Boolean).join(' · ') || current.scenery || current.category}</div><h2 className="mt-2 text-2xl font-semibold leading-tight">{current.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.description}</p><p className="mt-3 text-[10px] text-muted-foreground">{current.verification} · fonte consultada em {dateLabel(current.checked_at)}</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setDetail(current)}>Notas e detalhes</Button>{current.instagram_url && <Button asChild variant="ghost" size="sm"><a href={current.instagram_url} target="_blank" rel="noreferrer"><Instagram/>Instagram</a></Button>}<Button asChild variant="ghost" size="sm"><a href={current.source_url} target="_blank" rel="noreferrer"><ExternalLink/>Fonte</a></Button></div></div></motion.article></AnimatePresence><div className="mt-6 flex items-center justify-center gap-12"><div className="text-center"><Button variant="reject" size="circle" aria-label="Não curtir esta opção" disabled={busy} onClick={() => vote(current,false)}><X/></Button><p className="mt-2 text-xs text-muted-foreground">Não é para nós</p></div><div className="text-center"><Button variant="success" size="circle" aria-label="Curtir esta opção" disabled={busy} onClick={() => vote(current,true)}><Heart/></Button><p className="mt-2 text-xs text-muted-foreground">Eu gostei</p></div></div></> : <Empty text="As descobertas deste filtro acabaram. Nossas escolhas continuam no histórico." action="Buscar novas opções" onClick={() => setSearchOpen(true)}/>}</div>}
    {tab === 'calendar' && <DuetCalendar userId={userId} records={data.records} onSaved={() => cache.invalidateQueries({ queryKey: ['duet', userId] })}/>}
    {tab === 'list' && <section className="mx-auto max-w-2xl space-y-6"><h1 className="text-3xl font-semibold">Nossa lista</h1><p className="text-sm text-muted-foreground">Tarefas e anotações do casal, num só lugar.</p><Section title="Tarefas" action={<Button size="icon" variant="outline" aria-label="Adicionar tarefa" onClick={() => newRecord('task')}><Plus/></Button>}/>{tasks.length ? recordsList(tasks, true) : <Empty text="Ainda não há tarefas." action="Adicionar tarefa" onClick={() => newRecord('task')}/>}<Section title="Anotações" action={<Button size="icon" variant="outline" aria-label="Adicionar anotação" onClick={() => newRecord('note')}><Plus/></Button>}/>{notes.length ? recordsList(notes) : <Empty text="Ainda não há anotações." action="Adicionar anotação" onClick={() => newRecord('note')}/>}</section>}
    {tab === 'profile' && <section className="mx-auto max-w-xl space-y-5">
      <h1 className="text-3xl font-semibold">Meu perfil</h1>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Avatar size={64} profile={data.profiles.find(p => p.id === userId)} name={me?.person ?? '?'} onPick={f => void uploadAvatar(f)}/>
          <div><p className="text-lg font-semibold">{me?.person}</p><p className="text-xs text-muted-foreground">Toque na foto para trocar · até 10 MB</p></div>
        </div>
        <form className="mt-6 space-y-3" onSubmit={async e => {
          e.preventDefault();
          const display_name = (nameEditor ?? '').trim();
          if (!display_name) return;
          if (await mutate(() => supabase.from('profiles').update({ display_name }).eq('id', userId))) {
            setNameEditor(null);
            toast.success('Nome de exibição atualizado.');
          }
        }}>
          <label className="block text-sm">Nome de exibição<Input className="mt-2" value={nameEditor ?? data.profiles.find(p => p.id === userId)?.display_name ?? me?.person ?? ''} maxLength={80} onChange={e => setNameEditor(e.target.value)} /></label>
          <Button type="submit" disabled={busy || nameEditor === null || !nameEditor.trim()}>Salvar nome</Button>
        </form>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Minhas preferências</h2>
        <p className="mt-1 text-sm text-muted-foreground">Escolha as cores do seu aparelho e configure os avisos que recebe.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.dispatchEvent(new Event('duet:open-theme'))}>Alterar tema</Button>
          <Button variant="outline" onClick={() => window.dispatchEvent(new Event('duet:open-notifications'))}>Notificações</Button>
        </div>
      </div>
    </section>}
    {tab === 'plans' && <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Um passo de cada vez</p><div className="mt-2 flex items-center justify-between"><h1 className="text-3xl font-semibold">Nossos planos <span className="text-primary">♡</span></h1><Button size="icon" title="Adicionar meta" aria-label="Adicionar meta" onClick={() => newRecord('goal')}><Plus/></Button></div><div className="my-6 flex flex-wrap gap-2">{periods.map(p => <Button key={p} variant={p === period ? 'default' : 'outline'} className="text-xs" onClick={() => setPeriod(p)}>{p}</Button>)}</div><div className="grid gap-4 sm:grid-cols-2">{goals.filter(g => g.period === period).map(g => {
      const signatures = data.signatures.filter(s => s.record_id === g.id); const signed = signatures.some(s => s.user_id === userId);
      return <article key={g.id} className="rounded-lg border border-border bg-card p-5"><div className="flex justify-between"><span className="text-xs text-success">{signatures.length === 2 ? 'Concluída pelos dois' : g.period}</span><div className="flex"><Button variant="ghost" size="icon" aria-label={`Editar ${g.title}`} onClick={() => edit(g)}><Pencil/></Button><Button variant="ghost" size="icon" aria-label={`Excluir ${g.title}`} onClick={() => remove(g)}><Trash2/></Button></div></div><h2 className="mt-3 text-lg font-semibold">{g.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{g.body}</p><div className="mt-5 flex flex-wrap gap-2 text-xs">{data.members.map(m => <span key={m.user_id} className="flex items-center gap-1 text-muted-foreground">{signatures.some(s => s.user_id === m.user_id) ? <CheckCheck size={13} className="text-success"/> : <Clock size={13}/>} {m.person}</span>)}</div><Button disabled={busy || signed || signatures.length === 2} variant={signatures.length === 2 ? 'success' : 'outline'} className="mt-4 w-full" onClick={() => sign(g)}>{signatures.length === 2 ? 'Meta concluída! ♡' : signed ? `Aguardando ${partnerName}` : 'Assinar conclusão'}</Button></article>;
    })}</div>{!goals.some(g => g.period === period) && <Empty text="Nossos planos começam com uma decisão real." action="Criar uma meta" onClick={() => newRecord('goal')}/>}</div>}
  </main><nav aria-label="Navegação principal" className="fixed bottom-0 left-0 z-40 w-full border-t border-border bg-popover/95 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-xl"><div className="mx-auto flex max-w-md items-center justify-between px-2 py-2">
    {([{ id: 'home', label: 'Início', icon: House }, { id: 'dream', label: 'Dream', icon: Heart }] as const).map(n => <Button key={n.id} variant="ghost" aria-current={tab === n.id ? 'page' : undefined} onClick={() => setTab(n.id)} className={`h-14 min-w-0 flex-1 flex-col gap-1 rounded-xl px-1 text-[10px] transition-colors ${tab === n.id ? 'bg-secondary text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}><n.icon size={19}/>{n.label}</Button>)}
    <Button aria-label="Adicionar" title="Adicionar" onClick={() => setQuickAddOpen(true)} className="mx-1 h-14 w-14 shrink-0 rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95 hover:bg-primary/90"><Plus size={27}/></Button>
    {([{ id: 'calendar', label: 'Agenda', icon: CalendarDays }, { id: 'plans', label: 'Planos', icon: ListChecks }, { id: 'list', label: 'Lista', icon: BookHeart }] as const).map(n => <Button key={n.id} variant="ghost" aria-current={tab === n.id ? 'page' : undefined} onClick={() => setTab(n.id)} className={`h-14 min-w-0 flex-1 flex-col gap-1 rounded-xl px-1 text-[10px] transition-colors ${tab === n.id ? 'bg-secondary text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}><n.icon size={19}/>{n.label}</Button>)}
    </div></nav>
  <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}><DialogContent>
    <DialogHeader><DialogTitle>Adicionar ao nosso espaço</DialogTitle></DialogHeader>
    <div className="grid gap-2">
      {([{ label: 'Próximo passo', kind: 'task' }, { label: 'Anotação', kind: 'note' }, { label: 'Meta do casal', kind: 'goal' }] as const).map(item => <Button key={item.kind} variant="outline" onClick={() => { setQuickAddOpen(false); newRecord(item.kind); }}><Plus size={16}/>{item.label}</Button>)}
      <Button variant="outline" onClick={() => { setQuickAddOpen(false); setTab('calendar'); }}><CalendarDays size={16}/>Compromisso na agenda</Button>
      <Button variant="outline" onClick={() => { setQuickAddOpen(false); setCategory('Locais'); setTab('dream'); setAddReference(true); }}><MapPin size={16}/>Local ou referência de casamento</Button>
    </div>
  </DialogContent></Dialog>
  <Dialog open={Boolean(form)} onOpenChange={o => { if (!o) setForm(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{form?.id ? 'Editar' : 'Adicionar'} {form?.kind === 'goal' ? 'meta' : form?.kind === 'task' ? 'próximo passo' : form?.kind === 'setting' ? 'data do casamento' : 'anotação'}</DialogTitle></DialogHeader>{form && <form onSubmit={saveRecord} className="space-y-4">{form.kind !== 'setting' && <label className="block text-sm">Título<Input required value={form.title} onChange={e => setForm({ ...form,title:e.target.value })} className="mt-2" maxLength={200}/></label>}<label className="block text-sm">{form.kind === 'setting' ? 'Data' : 'Anotações'}{form.kind === 'setting' ? <Input type="date" required value={form.body} onChange={e => setForm({ ...form,body:e.target.value })} className="mt-2"/> : <Textarea value={form.body} onChange={e => setForm({ ...form,body:e.target.value })} className="mt-2 min-h-28" maxLength={10000}/>}</label>{form.kind === 'goal' && <Select label="Prazo" value={form.period} onChange={v => setForm({ ...form,period:v })} options={periods} noAll/>}<Button disabled={busy} className="w-full">{busy ? 'Salvando…' : 'Salvar'}</Button></form>}</DialogContent></Dialog>
  <Dialog open={Boolean(detail)} onOpenChange={o => { if (!o) setDetail(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{detail?.title}</DialogTitle></DialogHeader>{detail && <><ReferencePhoto reference={data.references.find(r => r.id === detail.id) ?? detail}/><p className="text-sm text-muted-foreground">{detail.description}</p><p className="text-xs text-success">{partnerName}: {voteLabel(partnerVote(data.votes,detail.id,userId))}</p><div className="flex flex-wrap gap-2">{detail.instagram_url && <Button asChild variant="outline"><a href={detail.instagram_url} target="_blank" rel="noreferrer"><Instagram/>Instagram</a></Button>}<Button asChild variant="outline"><a href={detail.source_url} target="_blank" rel="noreferrer"><ExternalLink/>Fonte</a></Button></div><label className="flex cursor-pointer items-center gap-2 text-sm text-primary"><Camera size={16}/>Enviar foto autorizada<input aria-label="Enviar foto autorizada" type="file" accept="image/*" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file,detail); }}/></label><Section title="Nossas anotações" action={<Button size="icon" variant="ghost" title="Adicionar nota ao local" onClick={() => newRecord('note',detail.id)}><Plus/></Button>}/>{recordsList(data.records.filter(r => r.kind === 'note' && r.reference_id === detail.id))}{isMatch(data.votes,detail.id) && !goals.some(g => g.reference_id === detail.id) && <Button disabled={busy} onClick={() => promote(detail)}>Levar match aos planos</Button>}</>}</DialogContent></Dialog>
  <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Novas descobertas · {category}</DialogTitle></DialogHeader><label className="text-sm">Cidade ou estado<Input value={region} onChange={e => setRegion(e.target.value)} placeholder="Ex.: Tiradentes, MG" className="mt-2" maxLength={100}/></label><Button disabled={busy} onClick={runSearch}><Search/>{busy ? 'Pesquisando…' : 'Pesquisar'}</Button>{searchError && <p role="status" className="text-sm text-danger">{searchError}</p>}{results.map(r => <div key={r.source_url} className="border-t border-border pt-4"><h3 className="font-medium">{r.title}</h3><p className="mt-2 text-xs text-muted-foreground">{r.description}</p><div className="mt-3 flex gap-2"><Button asChild variant="outline" size="sm"><a href={r.source_url} target="_blank" rel="noreferrer">Revisar fonte<ExternalLink/></a></Button><Button size="sm" disabled={busy || data.references.some(x => x.source_url === r.source_url && x.title === r.title)} onClick={() => include(r)}><Plus/>Incluir para avaliar</Button></div></div>)}</DialogContent></Dialog>
  <Dialog open={addReference} onOpenChange={setAddReference}><DialogContent><DialogHeader><DialogTitle>Adicionar referência · {category}</DialogTitle></DialogHeader><form onSubmit={saveReference} className="space-y-4"><label className="block text-sm">@ do Instagram<Input required autoFocus value={refInsta} onChange={e => setRefInsta(e.target.value)} placeholder="@villapaolucci" className="mt-2"/><span className="mt-1 block text-xs text-muted-foreground">Nome e foto são buscados automaticamente.</span></label><label className="block text-sm">Anotações<Textarea value={refDescription} onChange={e => setRefDescription(e.target.value)}/></label><Button disabled={busy} className="w-full">{busy ? 'Buscando perfil…' : 'Adicionar'}</Button></form></DialogContent></Dialog>
  </div>;
}

function voteLabel(v: Row<'votes'> | undefined) { return v ? v.liked ? 'curtiu ♡' : 'não curtiu' : 'ainda não avaliou'; }
function Section({ title, action }: { title: string; action?: React.ReactNode }) { return <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2>{action}</div>; }
function Empty({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) { return <div className="border-y border-dashed border-border py-9 text-center"><Flower2 className="mx-auto mb-4 text-success" size={28} strokeWidth={1.3}/><p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">{text}</p>{action && <Button variant="outline" onClick={onClick} className="mt-5">{action}<Plus size={14}/></Button>}</div>; }
function Select({ label, value, options, onChange, noAll }: { label: string; value: string; options: string[]; onChange: (s: string) => void; noAll?: boolean }) { return <label className="block min-w-0 text-[11px] text-muted-foreground">{label}<select aria-label={label} value={value} onChange={e => onChange(e.target.value)} className="mt-1 h-10 w-full min-w-0 rounded-md border border-input bg-card px-2 text-xs text-foreground">{!noAll && <option value="">Todos</option>}{options.map(o => <option key={o} value={o}>{o}</option>)}</select></label>; }
function ReferencePhoto({ reference }: { reference: Row<'references_catalog'> }) {
  const [url, setUrl] = useState('');
  useEffect(() => { let active = true; setUrl(''); if (reference.image_path) void supabase.storage.from('duet-photos').createSignedUrl(reference.image_path,3600).then(({ data }) => { if (active) setUrl(data?.signedUrl ?? ''); }); return () => { active = false; }; }, [reference.image_path]);
  if (url) return <a href={reference.instagram_url ?? reference.source_url} target="_blank" rel="noreferrer" className="block"><img src={url} alt={reference.title} className="aspect-[4/3] w-full object-cover"/><span className="block px-3 py-1 text-[10px] text-muted-foreground">{reference.image_credit}</span></a>;
  return <a href={reference.instagram_url ?? reference.source_url} target="_blank" rel="noreferrer" className="garden-band flex aspect-[16/7] flex-col items-center justify-center gap-3 border-b border-border text-success"><Flower2 size={36} strokeWidth={1.1}/><span className="flex items-center gap-2 text-xs"><ExternalLink size={12}/>{reference.instagram_url ? 'Fotos no Instagram oficial' : 'Ver fotos na fonte'}</span></a>;
}