import { useEffect, useState } from 'react';
import { ArrowRight, Clock3, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { releaseNotes, currentVersion } from '@/lib/release-notes';

export function openDuetUpdates() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('duet:open-updates'));
}

export function DuetUpdatesDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('duet:open-updates', show);
    return () => window.removeEventListener('duet:open-updates', show);
  }, []);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-h-[min(88dvh,760px)] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Diário de evolução</p>
        <DialogTitle className="flex items-center gap-2 text-2xl"><Sparkles size={22}/>Novidades do Duet</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">Tudo que mudamos, versão por versão. De uma ideia pequena aos novos temas.</p>
      <ol className="mt-2 space-y-5 border-l border-border pl-4">
        {releaseNotes.map((release, index) => <li key={release.version} className="relative">
          <span aria-hidden="true" className="absolute -left-[23px] top-2 h-3 w-3 rounded-full border-2 border-background bg-primary"/>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">v{release.version}</span>
            {index === 0 && <span className="text-xs font-semibold text-primary">Atual</span>}
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={12}/>{new Date(release.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold">{release.title}</h3>
          <p className="mb-2 text-xs text-muted-foreground">{release.kind}</p>
          <ul className="space-y-2">{release.highlights.map(item =>
            <li key={item} className="flex items-start gap-2 text-sm leading-relaxed">
              <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"/>
              <span>{item}</span>
            </li>)}</ul>
        </li>)}
      </ol>
      <Button variant="outline" className="mt-2 w-full" onClick={() => setOpen(false)}>Voltar ao Duet</Button>
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
      <span className="mt-0.5 block text-xs text-muted-foreground">Novos temas, perfil e notificações. Veja o que mudou.</span>
    </span>
    <ArrowRight size={19} className="shrink-0 text-primary"/>
  </button>;
}
