import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { usePartnerOnline } from '@/hooks/use-partner-online';
import { cachedAvatarUrl } from '@/lib/avatar-images';
import { formatPartnerLastSeen } from '@/lib/duet-presence';
import { chatIsNearBottom, scrollChatToBottom } from '@/lib/chat-scroll';

export function Avatar({ profile, name, size = 44, onPick }: { profile?: Row<'profiles'> | undefined; name: string; size?: number; onPick?: (f: File) => void }) {
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    setLoaded(false);
    setUrl('');
    const path = profile?.avatar_path;
    if (path) void cachedAvatarUrl(path).then(value => {
      if (active) setUrl(value);
    }).catch(() => { if (active) setUrl(''); });
    return () => { active = false; };
  }, [profile?.avatar_path]);
  const picture = <span style={{ width: size, height: size }}
    className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary font-semibold text-primary shadow-sm"
    aria-label={`Foto de ${name}`}>
    <span className="absolute inset-0 flex items-center justify-center text-[1.4em]" style={{ fontSize: Math.max(17, size * .38) }}>{name[0] ?? '♡'}</span>
    {url && <img src={url} alt={`Foto de ${name}`}
      width={size} height={size} decoding="async"
      loading={size >= 80 ? 'eager' : 'lazy'}
      onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setUrl(''); }}
      className={`relative h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}/>}
    {onPick && <span className="absolute bottom-0 right-0 rounded-full border border-border bg-card/95 p-1 text-foreground"><Camera size={Math.max(13, Math.round(size * .17))}/></span>}
  </span>;
  if (!onPick) return picture;
  return <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full focus-within:ring-2 focus-within:ring-ring" title="Trocar foto de perfil">
    {picture}
    <input type="file" accept="image/*,.heic,.heif" className="sr-only" aria-label="Trocar foto de perfil"
      onChange={e => { const file = e.target.files?.[0]; if (file) onPick(file); e.currentTarget.value = ''; }}/>
  </label>;
}

export function Chat({ userId, partnerId, me, partner, messages, profiles }: { userId: string; partnerId: string | undefined; me: string; partner: string; messages: Row<'messages'>[]; profiles: Row<'profiles'>[] }) {
  const [open, setOpen] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const followBottom = useRef(true);
  const openChat = () => { followBottom.current = true; setOpen(true); };
  useEffect(() => {
    const show = () => { followBottom.current = true; setOpen(true); };
    window.addEventListener('duet:open-chat', show);
    if (new URLSearchParams(window.location.search).get('duet_view') === 'chat') show();
    return () => window.removeEventListener('duet:open-chat', show);
  }, []);
  const { online, checking, lastSeen } = usePartnerOnline(userId, partnerId);
  const status = online ? 'online agora' : checking && !lastSeen
    ? 'verificando presença…' : formatPartnerLastSeen(lastSeen);
  const [text, setText] = useState('');
  const [outgoing, setOutgoing] = useState<Array<{ id: string; body: string; user_id: string; created_at: string; status: 'sending' | 'sent' }>>([]);
  const cache = useQueryClient();
  const notify = useServerFn(syncPartnerNotifications);
  useEffect(() => {
    const deliveredIds = new Set(messages.map(message => message.id));
    setOutgoing(previous => previous.filter(message => !deliveredIds.has(message.id)));
  }, [messages]);
  const visibleMessages = [...messages, ...outgoing.filter(message => !messages.some(saved => saved.id === message.id))]
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const newestMessage = visibleMessages[visibleMessages.length - 1]?.id ?? '';

  // IMPORTANT: scroll only the internal message list, never scrollIntoView().
  // scrollIntoView used to move the page *behind* the dialog on mobile Safari.
  // Opening always starts at the latest message; scrolling upward suspends
  // automatic following until the reader returns to the bottom.
  useLayoutEffect(() => {
    if (!open) return;
    const scrollMessages = () => {
      const list = messagesRef.current;
      if (followBottom.current) scrollChatToBottom(list);
    };
    scrollMessages();
    const frame = window.requestAnimationFrame(scrollMessages);
    return () => window.cancelAnimationFrame(frame);
  }, [open, newestMessage, visibleMessages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    followBottom.current = true;
    const temporaryId = crypto.randomUUID();
    setText('');
    setOutgoing(current => [...current, { id: temporaryId, body, user_id: userId, created_at: new Date().toISOString(), status: 'sending' }]);
    try {
      const { data, error } = await supabase.from('messages').insert({ body, user_id: userId }).select('id,created_at').single();
      if (error || !data) throw error ?? new Error('Mensagem não confirmada.');
      setOutgoing(current => current.map(message => message.id === temporaryId ? { ...message, id: data.id, created_at: data.created_at, status: 'sent' } : message));
      playDuetSound('success', userId);
      void cache.invalidateQueries({ queryKey: ['duet', userId] });
      void notify({ data: { heartbeat: false } }).catch(error => console.warn('Avisos pendentes', error));
    } catch {
      setOutgoing(current => current.filter(message => message.id !== temporaryId));
      setText(current => current || body);
      toast.error('Mensagem não enviada. Tente novamente.');
    }
  }
  const partnerProfile = profiles.find(p => p.id !== userId);
  return <>
    <Button variant="ghost" size="icon" title={`Conversa · ${partner} ${status}`}
      aria-label={`Abrir conversa · ${partner} ${status}`}
      onClick={openChat} className="relative shrink-0 rounded-full">
      <MessageCircle size={20}/>
      <span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-background ${online ? 'bg-success' : checking ? 'bg-amber-400' : 'bg-muted-foreground/40'}`}/>
    </Button>
    <Dialog open={open} onOpenChange={next => { if (next) followBottom.current = true; setOpen(next); }}>
      <DialogContent aria-label="Conversa do casal"
        className="duet-chat-dialog flex h-[min(88dvh,790px)] max-h-[calc(100dvh-16px)] w-[calc(100vw-16px)] max-w-xl min-h-0 flex-col gap-0 overflow-hidden rounded-[28px] border-border bg-background p-0 shadow-2xl sm:h-[min(82dvh,790px)] sm:rounded-[30px]">
        <DialogHeader className="shrink-0 border-b border-border bg-card/90 px-4 py-4 pr-16 text-left sm:px-6 sm:pr-16">
          <DialogTitle className="flex min-w-0 items-center gap-3">
            <Avatar profile={partnerProfile} name={partner} size={54}/>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{partner}</span>
              <span title="Horário da última atividade registrada; pode haver atraso de até um minuto."
                className={`mt-1 block text-xs font-medium leading-snug ${online ? 'text-success' : 'text-muted-foreground'}`}>
                {online && <span aria-hidden="true" className="mr-1 inline-block h-2 w-2 rounded-full bg-success"/>}
                {status}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>
        <div ref={messagesRef} role="log" aria-label="Mensagens do casal" aria-live="polite"
          onScroll={event => {
            const el = event.currentTarget;
            followBottom.current = chatIsNearBottom(el);
          }}
          className="duet-chat-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
          {visibleMessages.map(m => <div key={m.id} className={`flex ${m.user_id === userId ? 'justify-end' : 'justify-start'}`}>
            <p className={`max-w-[86%] break-words whitespace-pre-wrap rounded-[22px] px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[76%] ${m.user_id === userId ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border bg-secondary text-secondary-foreground'}`}>
              {m.body}
              <span className="mt-2 block text-right text-[11px] opacity-75">
                {'status' in m && m.status === 'sending' ? 'Enviando… · ' : ''}
                {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
          </div>)}
          {!visibleMessages.length && <p className="pt-10 text-center text-sm text-muted-foreground">Mande um oi para {partner}, {me}. ♡</p>}
        </div>
        <form onSubmit={send} className="duet-chat-composer flex shrink-0 items-end gap-2 border-t border-border bg-card/95 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <Input value={text} onChange={e => setText(e.target.value)} aria-label="Escrever mensagem"
            placeholder="Escreva uma mensagem…" maxLength={2000}
            className="h-12 min-w-0 flex-1 rounded-2xl bg-background px-4"/>
          <Button type="submit" size="icon" disabled={!text.trim()}
            aria-label="Enviar mensagem" className="h-12 w-12 shrink-0 rounded-full"><Send size={20}/></Button>
        </form>
      </DialogContent>
    </Dialog>
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
