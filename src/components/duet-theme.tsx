import { useEffect, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const themes = [
  { id: 'clean-modern', label: 'Clean Modern', description: 'Claro e contemporâneo', colors: ['#FAF8F8', '#C97A8B', '#5C8C74'] },
  { id: 'dark-elegant', label: 'Escuro Elegante', description: 'Noturno e sofisticado', colors: ['#171719', '#C5849A', '#E8D9C8'] },
  { id: 'earthy', label: 'Natureza e tons terrosos', description: 'Verde e terracota', colors: ['#F7F3EB', '#5F806C', '#BF8067'] },
  { id: 'pastel-romantic', label: 'Pastel Romântico', description: 'Lavanda e rosa suave', colors: ['#FCF6FC', '#9A82BB', '#E6A3C1'] },
  { id: 'clean-luxe', label: 'Clean Luxo', description: 'Minimalista refinado', colors: ['#F9F7F3', '#262626', '#CBB8A0'] },
  { id: 'romance', label: 'Romântico original', description: 'Paleta original', colors: ['#FAF8F8', '#B88E5F', '#F0D5DA'] },
  { id: 'sage', label: 'Jardim original', description: 'Verde suave', colors: ['#FAF8F8', '#5C8C74', '#D7E4D9'] },
  { id: 'rose', label: 'Rosa original', description: 'Rosa intenso', colors: ['#FAF8F8', '#B85B85', '#F0D5E1'] },
  { id: 'ocean', label: 'Oceano original', description: 'Azul relaxante', colors: ['#FAF8F8', '#427A99', '#D3E5EF'] },
] as const;

export function ThemePicker({ userId, theme }: { userId: string; theme: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cache = useQueryClient();
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
    return () => { delete document.documentElement.dataset['theme']; };
  }, [theme]);
  async function choose(value: string) {
    if (busy || value === theme) { setOpen(false); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('profiles').update({ color_theme: value }).eq('id', userId);
      if (error) throw error;
      await cache.invalidateQueries({ queryKey: ['duet', userId] });
      toast.success('Tema salvo para sua conta.');
      setOpen(false);
    } catch {
      toast.error('Não foi possível salvar seu tema. Verifique se a migração do banco foi aplicada.');
    } finally { setBusy(false); }
  }
  return <><Button variant="ghost" size="icon" aria-label="Escolher cores do app" title="Cores do app" onClick={() => setOpen(true)}><Palette size={18}/></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Minhas cores</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">O tema é pessoal: sua escolha não muda as cores da outra pessoa.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{themes.map(item =>
        <button key={item.id} type="button" disabled={busy} aria-pressed={theme === item.id} onClick={() => void choose(item.id)}
          className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left text-foreground transition-colors hover:bg-muted disabled:opacity-60">
          <span className="flex shrink-0 -space-x-2" aria-hidden="true">{item.colors.map((color, i) =>
            <span key={i} className="h-8 w-8 rounded-full border border-black/10" style={{ backgroundColor: color }}/>)}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span>
          {theme === item.id && <Check size={17} className="shrink-0 text-primary"/>}
        </button>)}</div></DialogContent></Dialog></>;
}
