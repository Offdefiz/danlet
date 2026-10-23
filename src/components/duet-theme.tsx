import { useEffect, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const themes = [
  // Top of the gallery: rich animated finishes. These are free, not paid unlocks.
  { id: 'pink-glitter', label: 'Barbie Glitter ✨', description: 'Rosa cintilante e partículas delicadas', colors: ['#FFF6FB', '#BB4D86', '#F6BBD9'] },
  { id: 'metallic-purple', label: 'Metallic Purple', description: 'Lilás cromado e metal líquido', colors: ['#100A23', '#B9A0FA', '#6D3EBF'] },
  { id: 'black-diamond', label: 'Black Diamond', description: 'Obsidiana, prata e reflexos de diamante', colors: ['#080C17', '#99A9CE', '#3D4771'] },
  { id: 'champagne-gold', label: 'Champagne Gold', description: 'Champanhe acetinado e ouro líquido', colors: ['#F9F1E5', '#B78B4D', '#E7CDA4'] },
  { id: 'dark-elegant', label: 'Escuro Elegante', description: 'Noturno e sofisticado', colors: ['#171719', '#C5849A', '#E8D9C8'] },
  { id: 'clean-luxe', label: 'Clean Luxo', description: 'Minimalista refinado', colors: ['#F9F7F3', '#262626', '#CBB8A0'] },
  { id: 'pastel-romantic', label: 'Pastel Romântico', description: 'Lavanda e rosa suave', colors: ['#FCF6FC', '#9A82BB', '#E6A3C1'] },
  { id: 'earthy', label: 'Natureza e tons terrosos', description: 'Verde e terracota', colors: ['#F7F3EB', '#5F806C', '#BF8067'] },
  { id: 'clean-modern', label: 'Clean Modern', description: 'Claro e contemporâneo', colors: ['#FAF8F8', '#C97A8B', '#5C8C74'] },
  { id: 'romance', label: 'Romântico original', description: 'Paleta original', colors: ['#FAF8F8', '#B88E5F', '#F0D5DA'] },
  { id: 'sage', label: 'Jardim original', description: 'Verde suave', colors: ['#FAF8F8', '#5C8C74', '#D7E4D9'] },
  { id: 'rose', label: 'Rosa original', description: 'Rosa intenso', colors: ['#FAF8F8', '#B85B85', '#F0D5E1'] },
  { id: 'ocean', label: 'Oceano original', description: 'Azul relaxante', colors: ['#FAF8F8', '#427A99', '#D3E5EF'] },
] as const;

export const themeGroups = [
  { id: 'premium', label: 'Premium', description: 'Acabamentos especiais, vidro e reflexos', themeIds: ['pink-glitter', 'metallic-purple', 'black-diamond', 'champagne-gold'] },
  { id: 'elegant', label: 'Elegantes', description: 'Sofisticados para o dia a dia', themeIds: ['dark-elegant', 'clean-luxe', 'pastel-romantic', 'earthy'] },
  { id: 'simple', label: 'Simples', description: 'Paletas leves e originais', themeIds: ['clean-modern', 'romance', 'sage', 'rose', 'ocean'] },
] as const;

type ThemeId = (typeof themes)[number]['id'];
const DEFAULT_THEME: ThemeId = 'romance';
const STORAGE_PREFIX = 'duet:personal-theme:';

function isThemeId(value: string | null): value is ThemeId {
  return themes.some((item) => item.id === value);
}

export function readPersonalTheme(userId: string): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const saved = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return isThemeId(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function persistPersonalTheme(userId: string, value: ThemeId): boolean {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, value);
    return true;
  } catch {
    return false;
  }
}

export function ThemePicker({ userId, hideTrigger = false }: { userId: string; hideTrigger?: boolean }) {
  const [open, setOpen] = useState(false);
  // Match the server-rendered default before loading device-only storage.
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [selected, setSelected] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    setTheme(readPersonalTheme(userId));
  }, [userId]);

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);

  useEffect(() => {
    const openFromMenu = () => { setSelected(theme); setOpen(true); };
    window.addEventListener('duet:open-theme', openFromMenu);
    return () => window.removeEventListener('duet:open-theme', openFromMenu);
  }, [theme]);

  const toggleOpen = (next: boolean) => {
    if (next) setSelected(theme);
    setOpen(next);
  };

  function applyTheme() {
    if (selected === theme) { setOpen(false); return; }
    setTheme(selected);
    if (persistPersonalTheme(userId, selected)) {
      toast.success('Tema salvo neste aparelho.');
    } else {
      toast.error('Tema aplicado, mas não foi possível salvar a preferência neste aparelho.');
    }
    setOpen(false);
  }
  return <>{!hideTrigger && <Button variant="ghost" size="icon" aria-label="Escolher cores do app" title="Cores do app" onClick={() => toggleOpen(true)}><Palette size={18}/></Button>}
    <Dialog open={open} onOpenChange={toggleOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Minhas cores</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Escolha uma prévia e toque em Aplicar tema. As cores mudam só no seu aparelho.</p>
      <div className="space-y-5">{themeGroups.map(group => <section key={group.id} aria-label={group.label} className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <div><h3 className="text-base font-semibold">{group.label}</h3><p className="text-xs text-muted-foreground">{group.description}</p></div>
          <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">{group.themeIds.length} temas</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{group.themeIds.map(id => {
          const item = themes.find(t => t.id === id)!;
          return <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}
            className={`flex min-h-[76px] items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${selected === item.id ? 'border-primary bg-secondary ring-1 ring-primary' : 'border-border bg-card hover:bg-muted'}`}>
            {item.id === 'pink-glitter'
              ? <span className="duet-glitter-preview flex h-12 w-[76px] shrink-0 items-center justify-center rounded-xl border border-[#E5A4BF]" aria-hidden="true"><span className="relative z-[1] text-xl text-white">♡</span></span>
              : ['metallic-purple','black-diamond','champagne-gold'].includes(item.id)
                ? <span className={`flex h-12 w-[76px] shrink-0 items-center justify-center rounded-xl ${item.id === 'metallic-purple' ? 'duet-liquid-purple-preview' : item.id === 'black-diamond' ? 'duet-black-diamond-preview' : 'duet-champagne-preview'}`} aria-hidden="true"><span className="relative z-[1] text-xl text-white drop-shadow-md">♡</span></span>
                : <span className="flex shrink-0 -space-x-2" aria-hidden="true">{item.colors.map((color,i) => <span key={i} className="h-8 w-8 rounded-full border border-black/10" style={{ backgroundColor: color }}/>)}</span>}
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span>
            {selected === item.id && <Check size={17} className="shrink-0 text-primary"/>}
          </button>;
        })}</div>
      </section>)}</div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={applyTheme} disabled={selected === theme}>Aplicar tema</Button></div></DialogContent></Dialog></>;
}
