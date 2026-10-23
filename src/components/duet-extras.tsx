import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Bell, MessageCircle, Send, Heart, House, ListChecks, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { enablePush } from '@/lib/push-client';
import type { Row } from '@/lib/duet.types';
import { syncPartnerNotifications, sendSelfPushTest } from '@/lib/notifications.functions';
import { playDuetSound } from '@/lib/duet-sounds';

export function Avatar({ profile, name, size = 36, onPick }: { profile?: Row<'profiles'> | undefined; name: string; size?: number; onPick?: (f: File) => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => { let a = true; setUrl(''); if (profile?.avatar_path) void supabase.storage.from('duet-photos').createSignedUrl(profile.avatar_path, 3600).then(({ data }) => { if (a) setUrl(data?.signedUrl ?? ''); }); return () => { a = false; }; }, [profile?.avatar_path]);
  const face = <span style={{ width: size, height: size }} className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-primary">{url ? <img src={url} alt={name} className="h-full w-full object-cover"/> : name[0]}{onPick && <Camera size={11} className="absolute bottom-0 right-0 rounded-full bg-card"/>}</span>;
  if (!onPick) return face;
  return <label className="cursor-pointer" title="Trocar foto de perfil">{face}<input type="file" accept="image/*" className="sr-only" aria-label="Trocar foto de perfil" onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); }}/></label>;
}

export function Chat({ userId, me, partner, messages, profiles }: { userId: string; me: string; partner: string; messages: Row<'messages'>[]; profiles: Row<'profiles'>[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const show = () => setOpen(true); window.addEventListener('duet:open-chat', show); return () => window.removeEventListener('duet:open-chat', show); }, []);
  const [online, setOnline] = useState(false);
  const [text, setText] = useState('');
  const [outgoing, setOutgoing] = useState<Array<{ id: string; body: string; user_id: string; created_at: string; status: 'sending' | 'sent' }>>([]);
  const cache = useQueryClient();
  const notify = useServerFn(syncPartnerNotifications);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const deliveredIds = new Set(messages.map(message => message.id));
    setOutgoing(previous => previous.filter(message => !deliveredIds.has(message.id)));
  }, [messages]);
  const visibleMessages = [...messages, ...outgoing.filter(message => !messages.some(saved => saved.id === message.id))]
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  useEffect(() => {
    const ch = supabase.channel('duet-presence', { config: { presence: { key: userId } } });
    ch.on('presence', { event: 'sync' }, () => setOnline(Object.keys(ch.presenceState()).some(k => k !== userId)))
      .subscribe(s => { if (s === 'SUBSCRIBED') void ch.track({ at: Date.now() }); });
    return () => { void supabase.removeChannel(ch); };
  }, [userId]);
  useEffect(() => { if (open) end.current?.scrollIntoView(); }, [open, visibleMessages.length]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    const temporaryId = crypto.randomUUID();
    setText('');
    setOutgoing(current => [...current, { id: temporaryId, body, user_id: userId, created_at: new Date().toISOString(), status: 'sending' }]);
    try {
      const { data, error } = await supabase.from('messages').insert({ body, user_id: userId }).select('id,created_at').single();
      if (error || !data) throw error ?? new Error('Mensagem não confirmada.');
      setOutgoing(current => current.map(message => message.id === temporaryId ? { ...message, id: data.id, created_at: data.created_at, status: 'sent' } : message));
      // Realtime not guaranteed on every network: refresh immediately on acknowledgement.
      playDuetSound('success', userId);
      void cache.invalidateQueries({ queryKey: ['duet', userId] });
      // Trigger pending push notifications without waiting for the next heartbeat.
      void notify({ data: { heartbeat: false } }).catch(error => console.warn('Avisos pendentes', error));
    } catch {
      setOutgoing(current => current.filter(message => message.id !== temporaryId));
      setText(current => current || body);
      toast.error('Mensagem não enviada. Tente novamente.');
    }
  }
  const partnerProfile = profiles.find(p => p.id !== userId);
  return <>
    <Button variant="ghost" size="icon" title="Conversa" aria-label="Abrir conversa" onClick={() => setOpen(true)} className="relative"><MessageCircle size={18}/><span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-background ${online ? 'bg-success' : 'bg-muted-foreground/40'}`}/></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="flex max-h-[85vh] flex-col">
      <DialogHeader><DialogTitle className="flex items-center gap-3"><Avatar profile={partnerProfile} name={partner}/><span>{partner}<span className={`block text-xs font-normal ${online ? 'text-success' : 'text-muted-foreground'}`}>{online ? 'online agora' : 'offline'}</span></span></DialogTitle></DialogHeader>
      <div className="min-h-48 flex-1 space-y-2 overflow-y-auto py-2">{visibleMessages.map(m => <div key={m.id} className={`flex ${m.user_id === userId ? 'justify-end' : ''}`}><p className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.user_id === userId ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>{m.body}<span className="mt-1 block text-[10px] opacity-70">{'status' in m && m.status === 'sending' ? 'Enviando… · ' : ''}{new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></p></div>)}{!visibleMessages.length && <p className="text-center text-sm text-muted-foreground">Mande um oi para {partner}, {me}. ♡</p>}<div ref={end}/></div>
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
  const s = steps[i] ?? steps[0];
  if (!s) return null;
  return <Dialog open={open} onOpenChange={o => { if (!o) close(); }}><DialogContent>
    <DialogHeader><DialogTitle className="flex items-center gap-2"><s.icon className="text-primary" size={20}/>{s.title}</DialogTitle></DialogHeader>
    <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{i + 1} de {steps.length}</span><div className="flex gap-2"><Button variant="ghost" onClick={close}>Pular</Button><Button onClick={() => i < steps.length - 1 ? setI(i + 1) : close()}>{i < steps.length - 1 ? 'Próximo' : 'Começar ♡'}</Button></div></div>
  </DialogContent></Dialog>;
}

const pushMsg: Record<string, string> = { registered: 'Notificações ativadas! ♡', 'not-configured': 'As notificações deste aplicativo ainda precisam ser configuradas.', unsupported: 'Este aparelho não oferece suporte a estes avisos. No iPhone, use iOS 16.4 ou mais recente e abra o app pela Tela de Início.', 'install-required': 'No Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra o Duet pelo novo ícone e ative os avisos.', 'open-in-new-tab': 'Abra o Duet numa aba própria para ativar.', denied: 'Permita notificações nas configurações deste aplicativo no aparelho.' };
export function PushButton({ userId, hideTrigger = false }: { userId: string; hideTrigger?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('duet:open-notifications', show);
    return () => window.removeEventListener('duet:open-notifications', show);
  }, []);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState({ enabled: true, additions: true, online: true, online_cooldown_minutes: 15 });
  const sendTest = useServerFn(sendSelfPushTest);
  useEffect(() => {
    if (!open) return;
    let active = true; setLoaded(false);
    void supabase.from('notification_preferences').select('enabled, additions, online, online_cooldown_minutes').eq('user_id', userId).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { toast.error('Não foi possível abrir suas preferências.'); return; }
      if (data) setPreferences(data);
      setLoaded(true);
    });
    return () => { active = false; };
  }, [open, userId]);
  async function save() {
    setBusy(true);
    const { data: existing, error: readError } = await supabase.from('notification_preferences').select('user_id').eq('user_id', userId).maybeSingle();
    const result = readError ? { error: readError } : existing
      ? await supabase.from('notification_preferences').update(preferences).eq('user_id', userId)
      : await supabase.from('notification_preferences').insert({ user_id: userId, ...preferences });
    setBusy(false);
    if (result.error) toast.error('Não foi possível salvar seus avisos.');
    else { toast.success('Preferências salvas ♡'); setOpen(false); }
  }
  return <>
    {!hideTrigger && <Button variant="ghost" size="icon" title="Notificações" aria-label="Preferências de notificações" onClick={() => setOpen(true)}><Bell size={18}/></Button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nossos avisos ♡</DialogTitle></DialogHeader>
      <div className="rounded-xl border border-border bg-secondary/50 p-3 text-sm">
        <p className="font-medium">Um carinho para lembrar de nós 💗</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Mensagens e novas entradas online têm prioridade e não dependem dos lembretes automáticos. Os carinhos e sugestões automáticos são verificados aproximadamente a cada 20 minutos, inclusive de madrugada. O iOS pode agrupar ou silenciar avisos conforme as configurações do aparelho.</p>
        <p className="mt-1 text-xs text-muted-foreground">Para não receber avisos, desligue «Receber notificações push». No iPhone, abra o Duet pelo ícone adicionado à Tela de Início para ativar os avisos.</p>
      </div>
      {!loaded ? <p role="status" className="text-sm text-muted-foreground">Abrindo preferências…</p> : <div className="space-y-5">
        {([{ key: 'enabled', label: 'Receber notificações push' }, { key: 'additions', label: 'Outras novidades do parceiro' }, { key: 'online', label: 'Quando o parceiro ficar online' }] as const).map(item => <label key={item.key} className="flex items-center justify-between gap-4 text-sm"><span>{item.label}</span><Switch aria-label={item.label} checked={preferences[item.key]} disabled={busy || (item.key !== 'enabled' && !preferences.enabled)} onCheckedChange={value => setPreferences(p => ({ ...p, [item.key]: value }))}/></label>)}
        <p className="text-xs text-muted-foreground">Mensagens do chat continuam prioritárias quando os avisos push estiverem ligados. A opção de novidades não bloqueia mensagens.</p>
        <div className="flex flex-wrap justify-between gap-3"><Button variant="outline" disabled={busy || !preferences.enabled} onClick={async () => { setBusy(true); try { const status = await enablePush(userId); if (status === 'registered') toast.success(pushMsg[status]); else toast.error(pushMsg[status]); } catch { toast.error('Não foi possível ativar este aparelho.'); } finally { setBusy(false); } }}><Bell size={16}/>Ativar neste aparelho</Button><Button variant="outline" disabled={busy || !preferences.enabled} onClick={async () => {
          setBusy(true);
          try {
            const result = await sendTest();
            if (result.sent > 0) toast.success('Firebase aceitou o envio. Confira a notificação no iPhone.');
            else toast.error('Nenhum dispositivo habilitado recebeu o envio. Confira a inscrição deste aparelho.');
          } catch (err) { toast.error(err instanceof Error ? err.message : 'Falha ao testar notificações.'); }
          finally { setBusy(false); }
        }}><Bell size={16}/>Enviar notificação de teste</Button><Button disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar preferências'}</Button></div>
      </div>}
    </DialogContent></Dialog>
  </>;
}
