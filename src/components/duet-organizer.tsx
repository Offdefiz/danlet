import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart, House, ListChecks, Plus, X, Check, Instagram, ExternalLink, MapPin, Flower2, ArrowLeft, Search, LogOut, Pencil, Trash2, Camera, Clock, BookHeart, CheckCheck, UserRound, CalendarDays, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useDuet } from '@/hooks/use-duet';
import { categories, periods, isMatch, partnerVote, type Row, type Tab } from '@/lib/duet.types';
import { DuetMusic } from '@/components/duet-music';
import { findReferences, fetchPhoto, importDreamReference } from '@/lib/duet.functions';
import { dreamCollections, hasDreamPhoto, isDreamSourceUrl, sourceForCategory, type DreamSection } from '@/lib/dream-match';
import { DreamSearchPhoto, DreamReferencePhoto } from '@/components/dream-media';
import { optimizeDreamPhoto } from '@/lib/dream-photo';

import { Avatar, Chat, PushButton, Tutorial } from '@/components/duet-extras';
import { ThemePicker, readPersonalTheme, themes } from '@/components/duet-theme';
import { DuetUpdatesDialog, DuetUpdatesPreview, openDuetUpdates } from '@/components/duet-updates';
import { prepareAvatarFile } from '@/lib/avatar-images';
import { DuetAccountMenu } from '@/components/duet-account-menu';
import { rankReferences, rankDiscoveredVenues } from '@/lib/duet-recommendations';
import { DuetNotificationCenter } from '@/components/duet-notification-center';
import { DuetCalendar } from '@/components/duet-calendar';
import { playDuetSound } from '@/lib/duet-sounds';
import { DuetHighlights } from '@/components/duet-highlights';
import { DuetQuestions } from '@/components/duet-questions';
import { DuetWelcome } from '@/components/duet-welcome';
import { DuetBottomNavigation } from '@/components/duet-bottom-navigation';
import { parseQuestionLink } from '@/lib/weekend-prompts';
import { parseProposalLink } from '@/lib/juntos-suggestions';

type RecordForm = { id?: string; version?: number; kind: 'goal' | 'task' | 'note' | 'setting'; title: string; body: string; period: string; reference_id?: string | null; done?: boolean };
type SearchItem = { title: string; description: string; source_url: string; image: string };
const dateLabel = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export function DuetOrganizer({ userId }: { userId: string }) {
  const query = useDuet(userId);
  const cache = useQueryClient();
  const [tab, setTab] = useState<Tab>('home');
  const [category, setCategory] = useState('Locais');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [scenery, setScenery] = useState('');
  const [dreamSection, setDreamSection] = useState<DreamSection>('discover');
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
  const [dreamSearchMode, setDreamSearchMode] = useState<'live' | 'curated' | 'unavailable' | null>(null);
  const [addReference, setAddReference] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [nameEditor, setNameEditor] = useState<string | null>(null);
  const [locallyVoted, setLocallyVoted] = useState<Set<string>>(new Set());
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('right');
  const [refInsta, setRefInsta] = useState('');
  const [refDescription, setRefDescription] = useState('');
  const [refTitle, setRefTitle] = useState('');
  const [manualPhoto, setManualPhoto] = useState<File | null>(null);
  const search = useServerFn(findReferences);
  const getPhoto = useServerFn(fetchPhoto);
  const importReference = useServerFn(importDreamReference);
  const triedPhotos = useRef<Set<string>>(new Set());
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const checkDeepLink = () => {
      if (parseProposalLink(window.location.search) || parseQuestionLink(window.location.search) || window.location.search.includes('duet_checkin=water') || window.location.search.includes('duet_view=together')) setTab('together');
    };
    const handleQuestion = () => setTab('together');
    checkDeepLink();
    window.addEventListener('duet:open-question', handleQuestion);
    window.addEventListener('popstate', checkDeepLink);
    window.addEventListener('focus', checkDeepLink);
    return () => {
      window.removeEventListener('duet:open-question', handleQuestion);
      window.removeEventListener('popstate', checkDeepLink);
      window.removeEventListener('focus', checkDeepLink);
    };
  }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const data = query.data;
  const rankedResults = data ? rankDiscoveredVenues(results, data.references, data.votes) : results;
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
    if (!previewRef || hasDreamPhoto(previewRef) || triedPhotos.current.has(previewRef.id)) return;
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
  async function vote(ref: Row<'references_catalog'>, liked: boolean, superLike = false) {
    if (!hasDreamPhoto(ref)) { toast.error('Precisamos adicionar uma foto real antes de votar nesta referência.'); setDreamSection('photos'); return; }
    setSwipeDirection(liked ? 'right' : 'left');
    setLocallyVoted(previous => new Set(previous).add(ref.id));
    const saved = await mutate(() => supabase.from('votes').upsert({
      reference_id: ref.id, user_id: userId, liked: liked || superLike,
      super_liked: superLike, updated_at: new Date().toISOString(),
    }));
    if (!saved) setLocallyVoted(previous => { const next = new Set(previous); next.delete(ref.id); return next; });
    else if (liked && partnerVote(data?.votes ?? [], ref.id, userId)?.liked) {
      playDuetSound('match', userId);
      toast.success(`É MATCH! Você e ${partnerName} escolheram ${ref.title}. ♡`);
    } else if (saved && superLike) {
      playDuetSound('success', userId);
      toast.success(`${ref.title} foi para seus Super Likes! ⭐`);
    } else if (saved) playDuetSound(liked ? 'success' : 'question', userId);
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
    setBusy(true); setSearchError(''); setDreamSearchMode(null); setResults([]);
    try {
      const found = await search({ data: { category, region: region.trim() } });
      setResults(found.results);
      setDreamSearchMode(found.mode);
      setSearchError(found.error ?? (found.results.length ? '' : 'Nenhuma foto pública encontrada para essa pesquisa.'));
    } catch {
      setDreamSearchMode('unavailable');
      setSearchError('A pesquisa não pôde ser concluída agora. Tente novamente daqui a pouco.');
    } finally { setBusy(false); }
  }
  async function uploadDreamPhoto(file: File): Promise<string> {
    const prepared = await optimizeDreamPhoto(file);
    const path = `${userId}/dream-${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('duet-photos').upload(path, prepared, {
      contentType: 'image/jpeg', cacheControl: '3600',
    });
    if (error) throw new Error('Falha ao enviar foto: ' + error.message);
    return path;
  }
  /** Choosing a social photograph automatically saves the original post and
   * the person's vote in one interaction. No URL copy, upload or extra step. */
  async function chooseDiscovered(item: SearchItem, superLike: boolean) {
    if (!item.image) return;
    setBusy(true);
    try {
      const existing = data.references.find(ref =>
        ref.source_url === item.source_url && ref.category === category);
      const saved = existing && hasDreamPhoto(existing)
        ? { id: existing.id, title: existing.title }
        : await importReference({ data: {
          source_url: item.source_url, category, title: item.title.slice(0, 160),
          notes: item.description, uploaded_path: null, preview_url: item.image,
        } });
      const { error } = await supabase.from('votes').upsert({
        reference_id: saved.id, user_id: userId, liked: true,
        super_liked: superLike, updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      setResults(previous => previous.filter(result => result.source_url !== item.source_url));
      setLocallyVoted(previous => new Set(previous).add(saved.id));
      await cache.invalidateQueries({ queryKey: ['duet', userId] });
      if (partnerVote(data.votes, saved.id, userId)?.liked) {
        playDuetSound('match', userId);
        toast.success('É MATCH! Os dois curtiram ' + saved.title + ' ♡');
      } else if (superLike) {
        playDuetSound('success', userId);
        toast.success(saved.title + ' foi para seus Super Likes! ⭐');
      } else {
        playDuetSound('success', userId);
        toast.success(saved.title + ' foi curtido! ♡');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não consegui registrar essa escolha.');
    } finally { setBusy(false); }
  }
  async function saveReference(e: React.FormEvent) {
    e.preventDefault();
    const raw = refInsta.trim();
    const url = /^@?[A-Za-z0-9._]{1,30}$/.test(raw) && sourceForCategory(category)==='instagram'
      ? `https://www.instagram.com/${raw.replace(/^@/,'')}/` : raw;
    if (!isDreamSourceUrl(url,category)) {
      toast.error(category === 'Decoração' ? 'Cole o link de um Pin público do Pinterest.' : 'Cole o perfil ou publicação pública do Instagram.');
      return;
    }
    setBusy(true);
    try {
      const attached = manualPhoto ? await uploadDreamPhoto(manualPhoto) : null;
      const name = refTitle.trim() || (sourceForCategory(category)==='instagram'
        ? '@' + new URL(url).pathname.split('/').filter(Boolean).pop()
        : 'Inspiração de decoração · Pinterest');
      const added = await importReference({ data: {
        source_url: url, category, title: name.slice(0,160),
        notes: refDescription, uploaded_path: attached,
      } });
      toast.success(`${added.title} salvo com fotografia ♡`);
      await cache.invalidateQueries({ queryKey: ['duet', userId] });
      setAddReference(false); setRefInsta(''); setRefTitle(''); setRefDescription(''); setManualPhoto(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }
  async function uploadAvatar(file: File) {
    let photo: File;
    try {
      photo = await prepareAvatarFile(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível preparar a foto.');
      return;
    }
    const path = `${userId}/avatar-${crypto.randomUUID()}.jpg`;
    const ok = await mutate(async () => {
      const uploaded = await supabase.storage.from('duet-photos').upload(path, photo, {
        contentType: 'image/jpeg', cacheControl: '3600',
      });
      if (uploaded.error) return uploaded;
      return supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
    });
    if (ok) toast.success('Foto otimizada e atualizada ♡');
  }
  async function upload(file: File, ref: Row<'references_catalog'>) {
    setBusy(true);
    try {
      const path = await uploadDreamPhoto(file);
      const { error } = await supabase.from('references_catalog').update({
        image_path: path,
        image_credit: 'Foto autorizada enviada pelo casal',
      }).eq('id', ref.id);
      if (error) throw error;
      toast.success('Foto salva! A referência já pode aparecer no Dream Match.');
      await cache.invalidateQueries({ queryKey: ['duet', userId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar foto.');
    } finally { setBusy(false); }
  }
  async function signOut() { await cache.cancelQueries(); cache.clear(); await supabase.auth.signOut(); window.history.replaceState(null, '', '/'); }
  if (query.isPending) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Abrindo nosso espaço…</div>;
  if (!data || query.error) return <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6"><Heart className="text-primary" size={36}/><h1 className="text-2xl font-semibold">Seu espaço está reservado.</h1><p className="text-muted-foreground">{query.error?.message ?? 'As contas de Daniel e Letícia ainda precisam ser vinculadas.'}</p><Button onClick={() => void query.refetch()}>Tentar novamente</Button><Button variant="outline" onClick={signOut}>Sair</Button></div>;
  const goals = data.records.filter(r => r.kind === 'goal');
  const tasks = data.records.filter(r => r.kind === 'task');
  const notes = data.records.filter(r => r.kind === 'note' && !r.reference_id);
  const complete = goals.filter(g => data.signatures.filter(s => s.record_id === g.id).length === 2).length;
  const refs = data.references.filter(r => r.category === category && (!state || r.state === state) && (!city || r.city === city) && (!scenery || r.scenery === scenery));
  const collections = dreamCollections(refs, data.votes, userId);
  const pending = rankReferences(collections.discovery.filter(ref => !locallyVoted.has(ref.id)), data.votes, userId, data.references);
  const current = pending[0];
  const historyRefs = collections.history.filter(r => {
    const my = data.votes.find(v => v.reference_id === r.id && v.user_id === userId);
    const other = partnerVote(data.votes, r.id, userId);
    if (historyFilter === 'Descartados') return my?.liked === false;
    if (historyFilter === 'Escolhas do parceiro') return Boolean(other);
    return Boolean(my);
  });
  const edit = (r: Row<'records'>) => setForm({ ...r, kind: r.kind as RecordForm['kind'] });
  const weddingDate = data.records.find(r => r.kind === 'setting' && r.title === 'Data do casamento');
  const days = weddingDate?.body && !Number.isNaN(Date.parse(weddingDate.body)) ? Math.max(0, Math.ceil((Date.parse(`${weddingDate.body}T12:00:00`) - Date.now()) / 86400000)) : null;
  const recordsList = (items: Row<'records'>[], taskMode = false) => <div className="space-y-3">{items.map(r => <article key={r.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">{taskMode && <Button size="icon" variant={r.done ? 'success' : 'outline'} aria-label={`${r.done ? 'Desmarcar' : 'Concluir'} ${r.title}`} disabled={busy} onClick={() => void mutate(() => supabase.from('records').update({ done: !r.done, updated_by: userId }).eq('id', r.id).eq('version', r.version))}>{r.done && <Check/>}</Button>}<div className="min-w-0 flex-1"><h3 className={`font-medium ${r.done ? 'line-through text-muted-foreground' : ''}`}>{r.title}</h3>{r.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.body}</p>}<p className="mt-2 text-[11px] text-muted-foreground">{data.members.find(m => m.user_id === r.updated_by)?.person ?? 'Nós'} · {dateLabel(r.updated_at)}</p></div><Button size="icon" variant="ghost" title="Editar" aria-label={`Editar ${r.title}`} onClick={() => edit(r)}><Pencil size={14}/></Button><Button size="icon" variant="ghost" title="Excluir" aria-label={`Excluir ${r.title}`} disabled={busy} onClick={() => remove(r)}><Trash2 size={14}/></Button></article>)}</div>;
  return <div className="min-h-screen bg-background pb-[calc(118px+env(safe-area-inset-bottom,0px))]">
    <DuetWelcome userId={userId}/>
    <DuetUpdatesDialog userId={userId}/>
    <header className="app-shell flex min-h-20 items-center justify-between gap-2 border-b border-border py-3">
      <div className="flex min-w-0 items-center gap-2"><Heart size={22} className="shrink-0 text-primary"/><span className="text-2xl font-bold">duet.</span></div>
      <Tutorial userId={userId}/>
      <div className="flex items-center gap-1 sm:gap-2">
        <ThemePicker userId={userId} hideTrigger/>
        <PushButton userId={userId} hideTrigger/>
        <DuetNotificationCenter userId={userId} activity={data.activity} messages={data.messages} members={data.members} onNavigate={target => { if (target === 'chat') window.dispatchEvent(new Event('duet:open-chat')); else setTab(target); }}/>
        <Chat userId={userId} partnerId={partner?.user_id} me={me?.person ?? ''} partner={partnerName} messages={data.messages} profiles={data.profiles}/>
        <DuetAccountMenu name={me?.person ?? 'Nós'} profile={data.profiles.find(p => p.id === userId)} onProfile={() => setTab('profile')} onSignOut={() => void signOut()} online={online} sync={sync}/>
      </div>
    </header>{!online && <div role="status" className="app-shell mt-3 rounded-xl border border-warning/30 bg-secondary px-4 py-3 text-sm text-secondary-foreground">Você está sem internet. Suas alterações serão salvas quando a conexão voltar; confira antes de fechar o aplicativo.</div>}<main className="app-shell py-7 sm:py-10">
    {tab === 'home' && <div className="space-y-9"><section className="border-b border-border pb-7"><p className="text-xs uppercase tracking-widest text-muted-foreground">Nosso espaço a dois</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Oi, {me?.person}. <span className="text-primary">♡</span></h1><p className="mt-3 text-muted-foreground">O que vamos construir juntos hoje?</p><div className="mt-6 flex flex-wrap gap-2"><Button onClick={() => newRecord('task')}><Plus/>Próximo passo</Button><Button variant="outline" onClick={() => newRecord('note')}><Pencil/>Anotar</Button></div><Button variant="outline" className="mt-3" onClick={() => {playDuetSound('question',userId);setTab('together');}}><Heart size={16}/> Vamos combinar nosso fim de semana?</Button></section><DuetHighlights records={data.records} references={data.references} votes={data.votes} userId={userId} onNavigate={setTab}/><DuetUpdatesPreview/><section className="garden-band flex flex-wrap items-center justify-between gap-6 border-y border-border py-7"><div><div className="flex items-center gap-2 text-success"><Flower2 size={18}/><span className="text-xs uppercase tracking-widest">Nosso casamento</span></div><h2 className="mt-3 text-2xl font-semibold">Um sim, do nosso jeito.</h2><p className="mt-2 text-sm text-muted-foreground">English Garden · flores, jardim e nós dois</p><Button variant="link" className="mt-3 px-0" onClick={() => { setCategory('Locais'); setTab('dream'); }}>Encontrar nosso lugar <Heart size={15}/></Button></div><div className="text-right"><p className="text-sm font-medium">{days === null ? 'A data ainda é nossa escolha' : `${days} dias para o nosso sim`}</p><Button variant="ghost" className="mt-2 text-xs" onClick={() => weddingDate ? edit(weddingDate) : setForm({ kind: 'setting', title: 'Data do casamento', body: '', period: periods[0] ?? '' })}><Pencil size={13}/>{weddingDate ? 'Editar data' : 'Definir data'}</Button></div></section><section><Section title="Próximos passos" action={<Button variant="ghost" size="icon" title="Adicionar tarefa" onClick={() => newRecord('task')}><Plus/></Button>}/>{tasks.length ? recordsList(tasks, true) : <Empty text="Um próximo passo de cada vez." action="Adicionar primeiro passo" onClick={() => newRecord('task')}/>}</section><section><Section title="Nosso caderno" action={<Button variant="ghost" size="icon" title="Adicionar anotação" onClick={() => newRecord('note')}><Plus/></Button>}/>{notes.length ? recordsList(notes) : <Empty text="Espaço para o que não queremos esquecer." action="Escrever uma anotação" onClick={() => newRecord('note')}/>}</section><DuetMusic records={data.records} userId={userId}/><section className="flex items-center justify-between border-t border-border pt-6"><div><p className="font-medium">Nossos planos</p><p className="mt-1 text-sm text-muted-foreground">{goals.length ? `${complete} de ${goals.length} metas concluídas pelos dois` : 'Nenhuma meta definida ainda'}</p></div><Button variant="outline" onClick={() => setTab('plans')}>Ver planos</Button></section><section><Section title="Últimas atualizações"/>{data.activity.slice(0,5).map(a => <div key={a.id} className="flex justify-between gap-4 border-b border-border py-3 text-xs text-muted-foreground"><span>{data.members.find(m => m.user_id === a.actor_id)?.person ?? 'Nós'} · {a.entity_type === 'votes' ? 'avaliou uma referência' : a.entity_type === 'signatures' ? 'assinou uma meta' : a.action === 'DELETE' ? 'excluiu um registro' : 'atualizou nossos planos'}</span><span>{dateLabel(a.created_at)}</span></div>)}{!data.activity.length && <p className="text-sm text-muted-foreground">Nossas atualizações aparecerão aqui.</p>}</section></div>}
    {tab === 'dream' && <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Descobertas a dois</p>
          <h1 className="mt-1 text-3xl font-semibold">Dream Match <span className="text-primary">♡</span></h1>
        </div>
        <Button variant="outline" size="icon" title="Pesquisar lugares com fotos" aria-label="Pesquisar lugares com fotos"
          onClick={() => setSearchOpen(true)}><Search/></Button>
      </div>
      <div role="tablist" aria-label="Seções do Dream Match" className="grid grid-cols-3 gap-2 rounded-[24px] bg-secondary/60 p-1.5 sm:grid-cols-5">
        {([
          { id: 'discover', label: 'Descobrir', count: pending.length },
          { id: 'favorites', label: 'Super Likes', count: collections.favorites.length },
          { id: 'matches', label: 'Matches', count: collections.matches.length },
          { id: 'history', label: 'Histórico', count: collections.history.length },
          { id: 'photos', label: 'Sem foto', count: collections.photoPending.length },
        ] as const).map(section => <button key={section.id} type="button" role="tab"
          aria-selected={dreamSection === section.id}
          onClick={() => setDreamSection(section.id)}
          className={'min-h-[58px] min-w-0 rounded-[19px] px-1.5 py-2 text-center transition-colors ' +
            (dreamSection === section.id ? 'bg-card text-foreground shadow-sm ring-1 ring-primary/35' : 'text-muted-foreground hover:bg-card/50')}>
          <span className="block truncate text-[11px] font-semibold">{section.label}</span>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{section.count}</span>
        </button>)}
      </div>
      <div className="flex flex-wrap gap-2">{categories.map(item => <Button key={item} size="sm"
        className="rounded-full text-xs" variant={category === item ? 'default' : 'outline'}
        onClick={() => { setCategory(item); setState(''); setCity(''); setScenery(''); }}>{item}</Button>)}</div>
      <div className="grid grid-cols-3 gap-2">
        <Select label="Estado" value={state} onChange={value => { setState(value); setCity(''); }}
          options={[...new Set(data.references.filter(r => r.category === category).map(r => r.state).filter(Boolean))]}/>
        <Select label="Cidade" value={city} onChange={setCity}
          options={[...new Set(data.references.filter(r => r.category === category && (!state || r.state === state)).map(r => r.city).filter(Boolean))]}/>
        <Select label="Cenário" value={scenery} onChange={setScenery}
          options={[...new Set(refs.map(r => r.scenery).filter(Boolean))]}/>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
        <span className="text-xs leading-relaxed text-muted-foreground">
          {category === 'Decoração' ? 'Decoração: fotos e Pins do Pinterest' : 'Locais: publicações e perfis do Instagram'}.
          Apenas referências com fotografia entram nas escolhas.
        </span>
        <Button variant="outline" size="sm" className="shrink-0 rounded-full" onClick={() => setSearchOpen(true)}>
          <Search size={16}/> Buscar fotos
        </Button>
      </div>
      {dreamSection === 'discover' && <section aria-label="Descobrir lugares e decorações com fotos" className="space-y-4">
        {current ? <>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{pending.length} {pending.length === 1 ? 'opção com foto' : 'opções com foto'} para avaliar</span>
            <span>{partnerName}: {voteLabel(partnerVote(data.votes,current.id,userId))}</span>
          </div>
          <AnimatePresence mode="wait"><motion.article key={current.id}
            drag={busy ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.55} dragMomentum={false}
            onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 80) void vote(current,info.offset.x > 0); }}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: swipeDirection === 'right' ? 140 : -140 }}
            transition={{ type: 'spring', stiffness: 250, damping: 27 }}
            className="overflow-hidden rounded-[30px] border border-border bg-card p-2 shadow-lg">
            <DreamReferencePhoto reference={current} onUnavailable={() => {setDetail(current);setDreamSection('photos');}}/>
            <div className="px-4 pb-4 pt-3">
              <p className="text-xs font-semibold text-primary">{current.category === 'Decoração' ? 'Pinterest · Decoração' : 'Instagram · Local'}</p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight">{current.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{current.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setDetail(current)}>Ver detalhes</Button>
                <Button size="sm" variant="ghost" asChild className="rounded-full"><a href={current.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14}/> Publicação original
                </a></Button>
              </div>
            </div>
          </motion.article></AnimatePresence>
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <div className="text-center"><Button variant="reject" size="circle" disabled={busy}
              aria-label="Não curtir" onClick={() => void vote(current,false)}><X/></Button>
              <p className="mt-1 text-xs text-muted-foreground">Passar</p></div>
            <div className="text-center"><Button variant="success" size="circle" disabled={busy}
              aria-label="Curtir" onClick={() => void vote(current,true)}><Heart/></Button>
              <p className="mt-1 text-xs text-muted-foreground">Curtir</p></div>
            <div className="text-center"><Button size="circle" variant="outline"
              className="border-amber-400/60 bg-amber-400/10 text-amber-500 shadow-md" disabled={busy}
              aria-label={'Super Like: ' + current.title} onClick={() => void vote(current,true,true)}><Star fill="currentColor"/></Button>
              <p className="mt-1 text-xs font-semibold text-amber-500">Super Like</p></div>
          </div>
        </> : <Empty text={'Ainda não há novas referências com fotos. ' + (collections.photoPending.length ? 'Algumas referências antigas precisam de imagem na aba Sem foto.' : 'Busque uma foto do Instagram ou Pinterest para começar.')}
          action={collections.photoPending.length ? 'Recuperar fotografias' : 'Buscar inspirações'}
          onClick={() => collections.photoPending.length ? setDreamSection('photos') : setSearchOpen(true)}/>}
      </section>}
      {dreamSection === 'favorites' && <section aria-label="Super Likes favoritos" className="space-y-3">
        <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3">
          <Star size={20} className="shrink-0 text-amber-500" fill="currentColor"/>
          <p className="text-sm">Seus Super Likes ficam guardados aqui, mesmo antes de a outra pessoa curtir.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {collections.favorites.map(ref => <article key={ref.id} className="overflow-hidden rounded-[24px] border border-border bg-card p-2">
            <DreamReferencePhoto reference={ref} compact onUnavailable={() => setDetail(ref)}/>
            <div className="px-1.5 pb-1 pt-2"><p className="truncate text-sm font-semibold">{ref.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{isMatch(data.votes,ref.id) ? 'Match do casal ♡' : 'Esperando a escolha do par'}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => setDetail(ref)}>Ver</Button>
                <Button size="sm" variant="ghost" className="rounded-full text-xs text-amber-500"
                  disabled={busy} onClick={() => void vote(ref,true,false)}>Tirar estrela</Button>
              </div>
            </div>
          </article>)}
        </div>
        {!collections.favorites.length && <Empty text="Nenhum Super Like ainda. Uma estrela no swipe salva a sua inspiração favorita!"/>}
      </section>}
      {dreamSection === 'matches' && <section aria-label="Matches do casal" className="space-y-3">
        <div className="rounded-2xl border border-primary/25 bg-secondary/50 p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Heart fill="currentColor" className="text-primary"/> É match! ♡</h2>
          <p className="mt-1 text-sm text-muted-foreground">Só aparecem aqui as referências que você e {partnerName} curtiram. Igual ao Tinder, mas com os sonhos de vocês.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">{collections.matches.map(ref => <article key={ref.id}
          className="overflow-hidden rounded-[24px] border border-primary/25 bg-card p-2">
          <DreamReferencePhoto compact reference={ref} onUnavailable={() => setDetail(ref)}/>
          <div className="space-y-2 px-1 pb-1 pt-2"><p className="truncate text-sm font-semibold">{ref.title}</p>
            <p className="text-xs font-medium text-primary">♡ Os dois gostaram</p>
            <Button variant="outline" size="sm" className="w-full rounded-full" onClick={() => setDetail(ref)}>Detalhes</Button>
            {!goals.some(goal => goal.reference_id === ref.id) && <Button size="sm" className="w-full rounded-full"
              disabled={busy} onClick={() => void promote(ref)}><Plus size={15}/> Planos</Button>}
          </div>
        </article>)}</div>
        {!collections.matches.length && <Empty text="Quando vocês dois curtirem a mesma foto, ela aparecerá aqui como Match!"/>}
      </section>}
      {dreamSection === 'history' && <section aria-label="Histórico de escolhas" className="space-y-3">
        <div className="flex flex-wrap gap-2">{['Minhas escolhas','Escolhas do parceiro','Descartados'].map(value =>
          <Button key={value} variant={historyFilter === value ? 'secondary' : 'outline'} size="sm" className="rounded-full"
            onClick={() => setHistoryFilter(value)}>{value}</Button>)}</div>
        {historyRefs.map(ref => <article key={ref.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
          <div className="w-28 shrink-0"><DreamReferencePhoto compact reference={ref} onUnavailable={() => setDetail(ref)}/></div>
          <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{ref.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">Você: {voteLabel(data.votes.find(v => v.reference_id === ref.id && v.user_id === userId))}
              {' · '}{partnerName}: {voteLabel(partnerVote(data.votes,ref.id,userId))}</p>
            <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setDetail(ref)}>Detalhes</Button>
              <Button size="sm" className="rounded-full" variant="outline" disabled={busy}
                onClick={() => void vote(ref,true,true)}><Star size={14}/> Favorito</Button>
            </div>
          </div>
        </article>)}
        {!historyRefs.length && <Empty text="Ainda não há escolhas nesse filtro."/>}
      </section>}
      {dreamSection === 'photos' && <section aria-label="Referências aguardando fotografia" className="space-y-3">
        <div className="rounded-2xl border border-warning/40 bg-secondary/50 p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Camera size={20}/> Precisam de foto</h2>
          <p className="mt-2 text-sm text-muted-foreground">Esses cadastros antigos foram preservados, mas não entram no swipe, Super Likes ou Matches sem uma fotografia real. Anexe uma foto que vocês tenham permissão para usar.</p>
        </div>
        {collections.photoPending.map(ref => <article key={ref.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
          <h3 className="font-semibold">{ref.title}</h3>
          <p className="text-xs text-muted-foreground">{ref.source_url}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild><a href={ref.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Consultar fonte</a></Button>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Camera size={16}/> Anexar foto
              <input aria-label={'Foto para ' + ref.title} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file,ref); event.currentTarget.value=''; }}/>
            </label>
          </div>
        </article>)}
        {!collections.photoPending.length && <Empty text="Ótimo! Todas as referências desta categoria têm foto cadastrada."/>}
      </section>}
    </div>}
    {tab === 'together' && <DuetQuestions userId={userId} proposals={data.proposals} proposalVotes={data.proposalVotes} members={data.members} onSaved={() => cache.invalidateQueries({ queryKey: ['duet', userId] })}/>}
    {tab === 'calendar' && <DuetCalendar userId={userId} records={data.records} onSaved={() => cache.invalidateQueries({ queryKey: ['duet', userId] })}/>}
    {tab === 'list' && <section className="mx-auto max-w-2xl space-y-6"><h1 className="text-3xl font-semibold">Nossa lista</h1><p className="text-sm text-muted-foreground">Tarefas e anotações do casal, num só lugar.</p><Section title="Tarefas" action={<Button size="icon" variant="outline" aria-label="Adicionar tarefa" onClick={() => newRecord('task')}><Plus/></Button>}/>{tasks.length ? recordsList(tasks, true) : <Empty text="Ainda não há tarefas." action="Adicionar tarefa" onClick={() => newRecord('task')}/>}<Section title="Anotações" action={<Button size="icon" variant="outline" aria-label="Adicionar anotação" onClick={() => newRecord('note')}><Plus/></Button>}/>{notes.length ? recordsList(notes) : <Empty text="Ainda não há anotações." action="Adicionar anotação" onClick={() => newRecord('note')}/>}</section>}
    {tab === 'profile' && <section className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-1"><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Um espaço só seu</p><h1 className="text-3xl font-semibold">Meu perfil ♡</h1></div>
      <div className="glass-panel relative overflow-hidden rounded-[28px] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"/>
        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
          <Avatar size={116} profile={data.profiles.find(p => p.id === userId)} name={me?.person ?? '?'} onPick={f => void uploadAvatar(f)}/>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">Conta privada do casal</span>
            <h2 className="mt-3 break-words text-2xl font-semibold">{data.profiles.find(p => p.id === userId)?.display_name || me?.person || 'Meu espaço'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Daniel & Letícia · Duet</p>
            <p className="mt-2 text-xs text-muted-foreground">Toque na foto para trocar · fotos otimizadas para celular, até 10 MB antes da compressão.</p>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Como quer aparecer?</h2>
        <form className="mt-3 space-y-3" onSubmit={async e => {
          e.preventDefault();
          const display_name = (nameEditor ?? '').trim();
          if (!display_name) return;
          if (await mutate(() => supabase.from('profiles').update({ display_name }).eq('id', userId))) {
            setNameEditor(null);
            toast.success('Nome de exibição atualizado.');
          }
        }}>
          <label className="block text-sm font-medium">Nome de exibição
            <Input className="mt-2" value={nameEditor ?? data.profiles.find(p => p.id === userId)?.display_name ?? me?.person ?? ''}
              maxLength={80} onChange={e => setNameEditor(e.target.value)} placeholder="Como gosta de ser chamado?"/>
          </label>
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={busy || nameEditor === null || !nameEditor.trim()}>Salvar meu nome</Button>
        </form>
      </div>
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Meu Duet, do meu jeito</h2>
        <p className="mt-1 text-sm text-muted-foreground">Seu visual e suas notificações não mudam o aparelho da outra pessoa.</p>
        <p className="mt-3 text-sm"><span className="text-muted-foreground">Tema ativo:</span> <strong>{themes.find(t => t.id === readPersonalTheme(userId))?.label ?? 'Romântico original'}</strong></p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button className="min-h-12" variant="outline" onClick={() => window.dispatchEvent(new Event('duet:open-theme'))}>Escolher tema</Button>
          <Button className="min-h-12" variant="outline" onClick={() => window.dispatchEvent(new Event('duet:open-notifications'))}>Minhas notificações</Button>
          <Button className="min-h-12 sm:col-span-2" variant="secondary" onClick={openDuetUpdates}>Novidades e histórico de versões</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">As mensagens podem aparecer como prévia nas notificações do sistema. Ajuste a exibição de prévias nas configurações do iPhone para maior privacidade.</p>
      </div>
    </section>}
        {tab === 'plans' && <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Um passo de cada vez</p><div className="mt-2 flex items-center justify-between"><h1 className="text-3xl font-semibold">Nossos planos <span className="text-primary">♡</span></h1><Button size="icon" title="Adicionar meta" aria-label="Adicionar meta" onClick={() => newRecord('goal')}><Plus/></Button></div>{data.proposals.some(proposal => proposal.status === 'agreed') && <section className="mt-5 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold"><CheckCheck className="text-success" size={18}/>Combinados no Juntos</h2>
      <p className="mt-1 text-xs text-muted-foreground">Somente propostas aceitas por Daniel e Letícia.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.proposals.filter(proposal => proposal.status === 'agreed').slice(0, 10).map(proposal =>
          <div key={proposal.id} className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="font-medium">{proposal.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(proposal.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {proposal.time} · Confirmado pelos dois</p>
          </div>)}
      </div>
    </section>}
    <div className="my-6 flex flex-wrap gap-2">{periods.map(p => <Button key={p} variant={p === period ? 'default' : 'outline'} className="text-xs" onClick={() => setPeriod(p)}>{p}</Button>)}</div><div className="grid gap-4 sm:grid-cols-2">{goals.filter(g => g.period === period).map(g => {
      const signatures = data.signatures.filter(s => s.record_id === g.id); const signed = signatures.some(s => s.user_id === userId);
      return <article key={g.id} className="rounded-lg border border-border bg-card p-5"><div className="flex justify-between"><span className="text-xs text-success">{signatures.length === 2 ? 'Concluída pelos dois' : g.period}</span><div className="flex"><Button variant="ghost" size="icon" aria-label={`Editar ${g.title}`} onClick={() => edit(g)}><Pencil/></Button><Button variant="ghost" size="icon" aria-label={`Excluir ${g.title}`} onClick={() => remove(g)}><Trash2/></Button></div></div><h2 className="mt-3 text-lg font-semibold">{g.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{g.body}</p><div className="mt-5 flex flex-wrap gap-2 text-xs">{data.members.map(m => <span key={m.user_id} className="flex items-center gap-1 text-muted-foreground">{signatures.some(s => s.user_id === m.user_id) ? <CheckCheck size={13} className="text-success"/> : <Clock size={13}/>} {m.person}</span>)}</div><Button disabled={busy || signed || signatures.length === 2} variant={signatures.length === 2 ? 'success' : 'outline'} className="mt-4 w-full" onClick={() => sign(g)}>{signatures.length === 2 ? 'Meta concluída! ♡' : signed ? `Aguardando ${partnerName}` : 'Assinar conclusão'}</Button></article>;
    })}</div>{!goals.some(g => g.period === period) && <Empty text="Nossos planos começam com uma decisão real." action="Criar uma meta" onClick={() => newRecord('goal')}/>}</div>}
  </main>
  <DuetBottomNavigation active={tab} onNavigate={target => {
    if (target === 'together') playDuetSound('question', userId);
    setTab(target);
  }} onMore={() => setMoreOpen(true)}/>
  <Dialog open={moreOpen} onOpenChange={setMoreOpen}><DialogContent><DialogHeader><DialogTitle>Mais opções</DialogTitle></DialogHeader><div className="grid gap-2">
    <Button variant="outline" onClick={() => {setTab('plans');setMoreOpen(false);}}><ListChecks size={18}/> Planos e metas</Button>
    <Button variant="outline" onClick={() => {setTab('list');setMoreOpen(false);}}><BookHeart size={18}/> Lista e anotações</Button>
    <Button variant="outline" onClick={() => {setTab('profile');setMoreOpen(false);}}><UserRound size={18}/> Meu perfil</Button>
    <Button variant="outline" onClick={() => {openDuetUpdates();setMoreOpen(false);}}>Novidades do Duet</Button>
    <Button onClick={() => {setQuickAddOpen(true);setMoreOpen(false);}}><Plus size={18}/> Adicionar algo</Button>
  </div></DialogContent></Dialog>
  <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}><DialogContent>
    <DialogHeader><DialogTitle>Adicionar ao nosso espaço</DialogTitle></DialogHeader>
    <div className="grid gap-2">
      {([{ label: 'Próximo passo', kind: 'task' }, { label: 'Anotação', kind: 'note' }, { label: 'Meta do casal', kind: 'goal' }] as const).map(item => <Button key={item.kind} variant="outline" onClick={() => { setQuickAddOpen(false); newRecord(item.kind); }}><Plus size={16}/>{item.label}</Button>)}
      <Button variant="outline" onClick={() => { setQuickAddOpen(false); setTab('calendar'); }}><CalendarDays size={16}/>Compromisso na agenda</Button>
      <Button variant="outline" onClick={() => { setQuickAddOpen(false); setCategory('Locais'); setTab('dream'); setSearchOpen(true); }}><MapPin size={16}/>Local ou referência de casamento</Button>
    </div>
  </DialogContent></Dialog>
  <Dialog open={Boolean(form)} onOpenChange={o => { if (!o) setForm(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{form?.id ? 'Editar' : 'Adicionar'} {form?.kind === 'goal' ? 'meta' : form?.kind === 'task' ? 'próximo passo' : form?.kind === 'setting' ? 'data do casamento' : 'anotação'}</DialogTitle></DialogHeader>{form && <form onSubmit={saveRecord} className="space-y-4">{form.kind !== 'setting' && <label className="block text-sm">Título<Input required value={form.title} onChange={e => setForm({ ...form,title:e.target.value })} className="mt-2" maxLength={200}/></label>}<label className="block text-sm">{form.kind === 'setting' ? 'Data' : 'Anotações'}{form.kind === 'setting' ? <Input type="date" required value={form.body} onChange={e => setForm({ ...form,body:e.target.value })} className="mt-2"/> : <Textarea value={form.body} onChange={e => setForm({ ...form,body:e.target.value })} className="mt-2 min-h-28" maxLength={10000}/>}</label>{form.kind === 'goal' && <Select label="Prazo" value={form.period} onChange={v => setForm({ ...form,period:v })} options={periods} noAll/>}<Button disabled={busy} className="w-full">{busy ? 'Salvando…' : 'Salvar'}</Button></form>}</DialogContent></Dialog>
  <Dialog open={Boolean(detail)} onOpenChange={open => { if (!open) setDetail(null); }}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-[28px]">
      <DialogHeader><DialogTitle>{detail?.title}</DialogTitle></DialogHeader>
      {detail && <>
        <DreamReferencePhoto reference={data.references.find(ref => ref.id === detail.id) ?? detail}/>
        <p className="text-sm text-muted-foreground">{detail.description}</p>
        <p className="text-xs font-semibold text-primary">{partnerName}: {voteLabel(partnerVote(data.votes,detail.id,userId))}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><a href={detail.source_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16}/> {detail.category === 'Decoração' ? 'Pinterest original' : 'Instagram original'}
          </a></Button>
          {hasDreamPhoto(detail) && <Button variant="outline"
            disabled={busy} onClick={() => void vote(detail,true,true)}><Star size={16}/> Super Like</Button>}
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-primary">
          <Camera size={17}/> {detail.image_path ? 'Substituir foto' : 'Adicionar foto obrigatória'}
          <input aria-label="Enviar foto autorizada" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
            onChange={e => { const file=e.target.files?.[0]; if (file) void upload(file,detail); e.currentTarget.value=''; }}/>
        </label>
        <Section title="Nossas anotações" action={<Button size="icon" variant="ghost"
          title="Adicionar nota à referência" onClick={() => newRecord('note',detail.id)}><Plus/></Button>}/>
        {recordsList(data.records.filter(record => record.kind === 'note' && record.reference_id === detail.id))}
        {isMatch(data.votes,detail.id) && !goals.some(goal => goal.reference_id === detail.id)
          && <Button disabled={busy} onClick={() => promote(detail)}>Levar Match aos planos</Button>}
      </>}
    </DialogContent>
  </Dialog>
  <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
    <DialogContent aria-label="Busca automática de fotos do Dream Match"
      className="flex h-[min(90dvh,810px)] w-[calc(100vw-20px)] max-w-lg flex-col gap-0 overflow-hidden rounded-[28px] p-0">
      <div className="shrink-0 space-y-3 border-b border-border bg-card/85 px-4 pb-4 pt-6 pr-12 sm:px-6 sm:pt-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl">Descobrir {category === 'Decoração' ? 'no Pinterest' : 'no Instagram'}</DialogTitle>
        </DialogHeader>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Digite qualquer {category === 'Decoração' ? 'tema, estilo ou lugar' : 'lugar, bairro, cidade ou país'}.
          O Duet pesquisa publicações públicas e reúne as fotos aqui, sem precisar anexar imagens ou colar links.
        </p>
        <form onSubmit={event => { event.preventDefault(); if (!busy) void runSearch(); }} className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-sm font-medium">
            {category === 'Decoração' ? 'O que você deseja decorar?' : 'Onde quer descobrir lugares?'}
            <Input value={region} onChange={event => setRegion(event.target.value)}
              placeholder={category === 'Decoração' ? 'Ex.: jardim romântico' : 'Ex.: Paris, França'}
              className="mt-2 h-12 rounded-2xl" maxLength={100}/>
          </label>
          <Button type="submit" disabled={busy} className="h-12 shrink-0 rounded-2xl px-4"
            aria-label={busy ? 'Pesquisando fotos' : 'Pesquisar fotos'}>
            <Search size={19}/>
            <span className="hidden sm:inline">{busy ? 'Buscando…' : 'Pesquisar'}</span>
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground">
          {category === 'Decoração' ? 'Fotos de Pins públicos do Pinterest' : 'Fotos de publicações públicas do Instagram'}
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        {busy && <div role="status" className="flex items-center gap-3 rounded-2xl bg-secondary/55 p-4">
          <Search size={19} className="animate-pulse text-primary"/>
          <p className="text-sm">Pesquisando publicações, tentando variações e reunindo fotos...</p>
        </div>}
        {!busy && searchError && <p role="status" className="rounded-2xl bg-secondary/55 p-4 text-sm text-muted-foreground">{searchError}</p>}
        {!busy && dreamSearchMode === 'unavailable' && !results.length && <Button
          variant="outline" className="min-h-12 w-full rounded-2xl" onClick={() => void runSearch()}>
          <Search size={17}/> Tentar novamente
        </Button>}
        {!busy && rankedResults.length > 0 && <p className="text-xs font-semibold text-muted-foreground">
          {rankedResults.length} {rankedResults.length === 1 ? 'publicação encontrada' : 'publicações encontradas'} com fotos
        </p>}
        {rankedResults.map(item => <article key={item.source_url}
          className="space-y-3 rounded-[24px] border border-border bg-card p-3 shadow-sm">
          <DreamSearchPhoto category={category} sourceUrl={item.source_url}
            image={item.image} title={item.title}/>
          <div className="space-y-1 px-1">
            <h3 className="text-base font-semibold leading-snug">{item.title}</h3>
            {item.description && <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" disabled={busy} className="min-h-12 rounded-2xl"
              onClick={() => setResults(list => list.filter(r => r.source_url !== item.source_url))}>
              <X size={17}/> Passar
            </Button>
            <Button size="sm" disabled={busy} className="min-h-12 rounded-2xl"
              onClick={() => void chooseDiscovered(item, false)}>
              <Heart size={17}/> Curtir
            </Button>
            <Button size="sm" variant="outline" disabled={busy} className="min-h-12 rounded-2xl border-amber-400/55 text-amber-500"
              onClick={() => void chooseDiscovered(item, true)}>
              <Star size={17} fill="currentColor"/> Super Like
            </Button>
          </div>
        </article>)}
      </div>
    </DialogContent>
  </Dialog>
  <Dialog open={addReference} onOpenChange={setAddReference}>
    <DialogContent className="max-h-[86dvh] overflow-y-auto rounded-[28px]">
      <DialogHeader><DialogTitle>Nova inspiração com fotografia ♡</DialogTitle></DialogHeader>
      <form onSubmit={saveReference} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {category === 'Decoração' ? 'Decoração deve ter um link de Pin do Pinterest.' : 'Locais devem ter perfil ou publicação do Instagram.'}
        </p>
        <label className="block text-sm">Link original
          <Input required value={refInsta} onChange={e => setRefInsta(e.target.value)}
            placeholder={category === 'Decoração' ? 'https://www.pinterest.com/pin/123…/' : '@perfil ou https://www.instagram.com/p/…/'}
            className="mt-2" maxLength={2000}/>
        </label>
        <label className="block text-sm">Nome da referência
          <Input value={refTitle} onChange={e => setRefTitle(e.target.value)}
            placeholder={category === 'Decoração' ? 'Mesa posta em jardim' : 'Local para o casamento'} maxLength={160} className="mt-2"/>
        </label>
        <label className="block text-sm">O que gostaram?
          <Textarea value={refDescription} onChange={e => setRefDescription(e.target.value)} className="mt-2"/>
        </label>
        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-primary/35 bg-secondary/35 px-4 text-sm">
          <Camera size={22} className="text-primary"/>
          <span>{manualPhoto ? 'Foto selecionada: ' + manualPhoto.name : 'Anexar fotografia (JPG, PNG ou WebP)'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
            aria-label="Anexar foto à nova inspiração"
            onChange={event => { setManualPhoto(event.target.files?.[0] ?? null); event.currentTarget.value=''; }}/>
        </label>
        <p className="text-xs text-muted-foreground">O Instagram pode liberar a foto pública automaticamente. No Pinterest, é necessário anexar uma imagem que vocês possam usar.</p>
        <Button type="submit" disabled={busy} className="w-full rounded-2xl">{busy ? 'Salvando foto…' : 'Adicionar ao Dream Match'}</Button>
      </form>
    </DialogContent>
  </Dialog>
  </div>;
}

function voteLabel(v: Row<'votes'> | undefined) { return v ? v.liked ? 'curtiu ♡' : 'não curtiu' : 'ainda não avaliou'; }
function Section({ title, action }: { title: string; action?: React.ReactNode }) { return <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2>{action}</div>; }
function Empty({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) { return <div className="border-y border-dashed border-border py-9 text-center"><Flower2 className="mx-auto mb-4 text-success" size={28} strokeWidth={1.3}/><p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">{text}</p>{action && <Button variant="outline" onClick={onClick} className="mt-5">{action}<Plus size={14}/></Button>}</div>; }
function Select({ label, value, options, onChange, noAll }: { label: string; value: string; options: string[]; onChange: (s: string) => void; noAll?: boolean }) { return <label className="block min-w-0 text-[11px] text-muted-foreground">{label}<select aria-label={label} value={value} onChange={e => onChange(e.target.value)} className="mt-1 h-10 w-full min-w-0 rounded-md border border-input bg-card px-2 text-xs text-foreground">{!noAll && <option value="">Todos</option>}{options.map(o => <option key={o} value={o}>{o}</option>)}</select></label>; }
