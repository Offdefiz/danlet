import { useEffect, useRef, useState } from 'react';
import { Bell, MessageCircle, Send, Heart, House, ListChecks, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { enablePush } from '@/lib/push-client';
import type { Row } from '@/lib/duet.types';

export function Avatar({ profile, name, size = 36, onPick }: { profile?: Row<'profiles'> | undefined; name: string; size?: number; onPick?: (f: File) => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => { let a = true; setUrl(''); if (profile?.avatar_path) void supabase.storage.from('duet-photos').createSignedUrl(profile.avatar_path, 3600).then(({ data }) => { if (a) setUrl(data?.signedUrl ?? ''); }); return () => { a = false; }; }, [profile?.avatar_path]);
  const face = <span style={{ width: size, height: size }} className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-primary">{url ? <img src={url} alt={name} className="h-full w-full object-cover"/> : name[0]}{onPick && <Camera size={11} className="absolute bottom-0 right-0 rounded-full bg-card"/>}</span>;
  if (!onPick) return face;
  return <label className="cursor-pointer" title="Trocar foto de perfil">{face}<input type="file" accept="image/*" className="sr-only" aria-label="Trocar foto de perfil" onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); }}/></label>;
}

export function Chat({ userId, me, partner, messages, profiles }: { userId: string; me: string; partner: string; messages: Row<'messages'>[]; profiles: Row<'profiles'>[] }) {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(false);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ch = supabase.channel('duet-presence', { config: { presence: { key: userId } } });
    ch.on('presence', { event: 'sync' }, () => setOnline(Object.keys(ch.presenceState()).some(k => k !== userId)))
      .subscribe(s => { if (s === 'SUBSCRIBED') void ch.track({ at: Date.now() }); });
    return () => { void supabase.removeChannel(ch); };
  }, [userId]);
  useEffect(() => { if (open) end.current?.scrollIntoView(); }, [open, messages.length]);
  async function send(e: React.FormEvent) {
    e.preventDefault(); const body = text.trim(); if (!body) return;
    setText(''); const { error } = await supabase.from('messages').insert({ body, user_id: userId });
    if (error) { setText(body); toast.error('Mensagem não enviada.'); }
  }
  const partnerProfile = profiles.find(p => p.id !== userId);
  return <>
    <Button variant="ghost" size="icon" title="Conversa" aria-label="Abrir conversa" onClick={() => setOpen(true)} className="relative"><MessageCircle size={18}/><span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-background ${online ? 'bg-success' : 'bg-muted-foreground/40'}`}/></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="flex max-h-[85vh] flex-col">
      <DialogHeader><DialogTitle className="flex items-center gap-3"><Avatar profile={partnerProfile} name={partner}/><span>{partner}<span className={`block text-xs font-normal ${online ? 'text-success' : 'text-muted-foreground'}`}>{online ? 'online agora' : 'offline'}</span></span></DialogTitle></DialogHeader>
      <div className="min-h-48 flex-1 space-y-2 overflow-y-auto py-2">{messages.map(m => <div key={m.id} className={`flex ${m.user_id === userId ? 'justify-end' : ''}`}><p className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.user_id === userId ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>{m.body}<span className="mt-1 block text-[10px] opacity-70">{new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></p></div>)}{!messages.length && <p className="text-center text-sm text-muted-foreground">Mande um oi para {partner}, {me}. ♡</p>}<div ref={end}/></div>
      <form onSubmit={send} className="flex gap-2"><Input value={text} onChange={e => setText(e.target.value)} placeholder="Escreva uma mensagem…" maxLength={2000}/><Button size="icon" aria-label="Enviar"><Send/></Button></form>
    </DialogContent></Dialog>
  </>;
}

const steps = [
  { icon: House, title: 'Nosso espaço', text: 'Anotem próximos passos e lembretes. Tudo que um muda aparece na hora para o outro.' },
  { icon: Heart, title: 'Dream Match', text: 'Arraste o card para a direita (curti) ou esquerda (não é para nós). Quando os dois curtem, vira Match! Toque no + para adicionar um local só com o @ do Instagram.' },
  { icon: ListChecks, title: 'Nossos planos', text: 'Metas só são concluídas quando os dois assinam.' },
  { icon: MessageCircle, title: 'Conversa e perfil', text: 'No topo: o balão mostra se o outro está online e abre o chat. Toque na sua foto para trocá-la.' },
];
export function Tutorial({ userId }: { userId: string }) {
  const key = `duet-tutorial-${userId}`;
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => { if (!localStorage.getItem(key)) setOpen(true); }, [key]);
  const close = () => { localStorage.setItem(key, '1'); setOpen(false); };
  const s = steps[i]!;
  return <Dialog open={open} onOpenChange={o => { if (!o) close(); }}><DialogContent>
    <DialogHeader><DialogTitle className="flex items-center gap-2"><s.icon className="text-primary" size={20}/>{s.title}</DialogTitle></DialogHeader>
    <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{i + 1} de {steps.length}</span><div className="flex gap-2"><Button variant="ghost" onClick={close}>Pular</Button><Button onClick={() => i < steps.length - 1 ? setI(i + 1) : close()}>{i < steps.length - 1 ? 'Próximo' : 'Começar ♡'}</Button></div></div>
  </DialogContent></Dialog>;
}

const pushMsg: Record<string, string> = { registered: 'Notificações ativadas! ♡', 'not-configured': 'Notificações ainda não configuradas.', unsupported: 'Este navegador não aceita notificações. No iPhone, adicione o Duet à Tela de Início.', 'open-in-new-tab': 'Abra o Duet numa aba própria para ativar.', denied: 'Permita notificações nas configurações do navegador.' };
export function PushButton({ userId }: { userId: string }) {
  return <Button variant="ghost" size="icon" title="Ativar notificações" aria-label="Ativar notificações" onClick={async () => { try { const s = await enablePush(userId); s === 'registered' ? toast.success(pushMsg[s]) : toast.error(pushMsg[s]); } catch { toast.error('Não foi possível ativar.'); } }}><Bell size={18}/></Button>;
}
