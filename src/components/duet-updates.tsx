import { useEffect, useState } from 'react';
import { ArrowRight, BellRing, Check, Clock3, Gift, Heart, Layers3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  releaseNotes, currentVersion, postMigrationHighlights,
  newReleaseNotesSince, releaseAcknowledgementKey,
} from '@/lib/release-notes';

export function openDuetUpdates() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('duet:open-updates'));
}

type UpdateMode = 'migration' | 'new' | 'history';

export function DuetUpdatesDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<UpdateMode>('migration');
  const [lastRead, setLastRead] = useState<string | null>(null);

  useEffect(() => {
    const key = releaseAcknowledgementKey(userId);
    let previous: string | null = null;
    try { previous = localStorage.getItem(key); } catch { /* private browsing */ }
    setLastRead(previous);

    const forcedByPush = new URLSearchParams(window.location.search).get('duet_view') === 'updates';
    // Opening a Juntos vote or incoming chat takes precedence over release news.
    const urgentLink = /(?:duet_proposal|duet_question|duet_view=chat)/.test(window.location.search);
    const shouldOpen = forcedByPush || (!urgentLink && newReleaseNotesSince(previous).length > 0);
    const timeout = shouldOpen ? window.setTimeout(() => {
      setMode(!previous ? 'migration' : forcedByPush && newReleaseNotesSince(previous).length === 0 ? 'history' : 'new');
      setOpen(true);
    }, 1750) : undefined; // after the opening splash animation

    const manual = () => { setMode('history'); setOpen(true); };
    window.addEventListener('duet:open-updates', manual);
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      window.removeEventListener('duet:open-updates', manual);
    };
  }, [userId]);

  const markRead = () => {
    try { localStorage.setItem(releaseAcknowledgementKey(userId), currentVersion); }
    catch { /* show once per session if storage is unavailable */ }
    setLastRead(currentVersion);
    setOpen(false);
  };
  const unread = newReleaseNotesSince(lastRead);
  const title = mode === 'migration' ? 'Tudo que chegou ao Duet ♡'
    : mode === 'new' ? 'Tem novidade no Duet!' : 'Diário de atualizações';

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent aria-label="Novidades e atualizações do Duet"
      className="duet-release-dialog flex h-[min(88dvh,790px)] max-h-[calc(100dvh-20px)] w-[calc(100vw-20px)] max-w-lg flex-col gap-0 overflow-hidden rounded-[30px] border-primary/30 bg-background p-0 shadow-2xl">
      <div className="duet-release-hero relative shrink-0 overflow-hidden border-b border-border px-5 pb-4 pt-6 pr-14 sm:px-7 sm:pt-7">
        <span className="pointer-events-none absolute -right-7 -top-20 h-48 w-48 rounded-full bg-primary/15 blur-3xl"/>
        <DialogHeader className="relative space-y-2 text-left">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary">
            <BellRing size={16}/> Atualização v{currentVersion}
          </span>
          <DialogTitle className="text-2xl font-bold leading-tight sm:text-[28px]">{title}</DialogTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {mode === 'migration'
              ? 'Um tour por tudo que construímos juntos desde a mudança para o novo Supabase.'
              : mode === 'new'
                ? 'Confira o que mudou desde sua última visita. Essas novidades já estão disponíveis!'
                : 'Todas as versões e melhorias ficam guardadas aqui para vocês consultarem.'}
          </p>
        </DialogHeader>
      </div>
      <div className="duet-release-scroll min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7" tabIndex={0}>
        {mode === 'migration' && <>
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={17} className="text-primary"/> Nosso Duet cresceu muito!</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Juntos, conversa, notificações, temas Premium, perfil e navegação para celular: esta é a retrospectiva completa das novidades pós-migração.
            </p>
          </div>
          {postMigrationHighlights.map((section, index) =>
            <section key={section.title} className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <h3 className="flex items-start gap-2.5 text-sm font-bold">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-secondary text-xs font-semibold text-secondary-foreground">{index + 1}</span>
                <span className="pt-1">{section.title}</span>
              </h3>
              <ul className="space-y-2.5 pl-1">
                {section.items.map(item => <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                  <Check size={15} className="mt-0.5 shrink-0 text-success"/>
                  <span>{item}</span>
                </li>)}
              </ul>
            </section>)}
          <Button variant="outline" className="w-full rounded-2xl" onClick={() => setMode('history')}>
            <Layers3 size={16}/> Ver todas as versões
          </Button>
        </>}
        {(mode === 'new' || mode === 'history') && <>
          {mode === 'new' && <p className="text-sm text-muted-foreground">
            {unread.length} {unread.length === 1 ? 'versão nova' : 'versões novas'} desde a última confirmação.
          </p>}
          <ol className="space-y-5 border-l border-border pl-4">
            {(mode === 'new' ? unread : releaseNotes).map((release, index) =>
              <li key={release.version} className="relative">
                <span aria-hidden="true" className="absolute -left-[23px] top-2 h-3 w-3 rounded-full border-2 border-background bg-primary"/>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">v{release.version}</span>
                  {index === 0 && release.version === currentVersion && <span className="text-xs font-semibold text-primary">Atual</span>}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 size={12}/>{new Date(release.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold">{release.title}</h3>
                <p className="mb-2 text-xs text-muted-foreground">{release.kind}</p>
                <ul className="space-y-2">{release.highlights.map(item =>
                  <li key={item} className="flex items-start gap-2 text-sm leading-relaxed">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"/>
                    <span>{item}</span>
                  </li>)}</ul>
              </li>)}
          </ol>
          <Button variant="outline" className="w-full rounded-2xl" onClick={() => setMode('migration')}>
            <Heart size={16}/> Ver tudo desde a migração
          </Button>
        </>}
      </div>
      <div className="duet-release-footer flex shrink-0 flex-col gap-2 border-t border-border bg-card/95 px-5 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-3 sm:flex-row-reverse sm:px-7">
        <Button className="min-h-12 w-full rounded-2xl sm:flex-1" onClick={markRead}>
          <Check size={17}/> Entendi, que venha mais! ♡
        </Button>
        <Button variant="ghost" className="min-h-11 w-full rounded-2xl sm:w-auto"
          onClick={() => setOpen(false)}>Mais tarde</Button>
      </div>
    </DialogContent>
  </Dialog>;
}

export function DuetUpdatesPreview() {
  return <button type="button" onClick={openDuetUpdates}
    aria-label={'Ver novidades do Duet, versão ' + currentVersion}
    className="flex min-h-[90px] w-full items-center gap-3 rounded-2xl border border-primary/30 bg-secondary/50 px-4 py-3 text-left transition-colors hover:bg-secondary">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Gift size={23}/></span>
    <span className="min-w-0 flex-1">
      <span className="block text-xs font-semibold uppercase tracking-wide text-primary">Novidade · v{currentVersion}</span>
      <span className="mt-1 block text-sm font-semibold">{releaseNotes[0]?.title}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">Veja tudo que mudou desde a migração e nas novas versões.</span>
    </span>
    <ArrowRight size={19} className="shrink-0 text-primary"/>
  </button>;
}
