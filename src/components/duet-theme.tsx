import { useEffect, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const themes = [{ id: 'romance', label: 'Romântico' }, { id: 'sage', label: 'Jardim' }, { id: 'rose', label: 'Rosa' }, { id: 'ocean', label: 'Oceano' }] as const;
export function ThemePicker({ userId, theme }: { userId: string; theme: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cache = useQueryClient();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => { delete document.documentElement.dataset.theme; };
  }, [theme]);
  async function choose(value: string) {
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ color_theme: value }).eq('id', userId);
    if (error) toast.error('Não foi possível salvar sua cor.');
    else { await cache.invalidateQueries({ queryKey: ['duet', userId] }); setOpen(false); }
    setBusy(false);
  }
  return <><Button variant="ghost" size="icon" aria-label="Escolher cores do app" title="Cores do app" onClick={() => setOpen(true)}><Palette size={18}/></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Minhas cores</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-3">{themes.map(item => <Button key={item.id} data-theme={item.id} variant="outline" disabled={busy} aria-pressed={theme === item.id} onClick={() => choose(item.id)} className="h-16 justify-start gap-3 bg-background text-foreground"><span className="flex gap-1" aria-hidden="true"><span className="h-5 w-5 rounded-full bg-primary"/><span className="h-5 w-5 rounded-full bg-secondary"/></span>{item.label}{theme === item.id && <Check size={14} className="ml-auto"/>}</Button>)}</div></DialogContent></Dialog></>;
}