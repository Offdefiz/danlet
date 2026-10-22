import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, MessageCircle, Heart, CalendarDays, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { playDuetSound, setSoundsEnabled, soundsEnabled } from '@/lib/duet-sounds';
import type { Row, Tab } from '@/lib/duet.types';

type Notice = { id: string; timestamp: string; text: string; tab: Tab | 'chat'; icon: 'message' | 'heart' | 'calendar' };
type Props = {
  userId: string;
  activity: Row<'activity'>[];
  messages: Row<'messages'>[];
  members: Row<'couple_members'>[];
  onNavigate: (tab: Tab | 'chat') => void;
};
const seenKey = (userId: string) => `duet:notice-seen:${userId}`;

function activityNotice(event: Row<'activity'>, person: string): Notice {
  const snapshot = event.snapshot;
  const info = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : {};
  const label = typeof info['title'] === 'string' ? info['title'].slice(0, 95) : '';
  const kind = event.entity_type;
  const text = kind === 'votes' ? `${person} fez uma escolha no Dream Match ♡`
    : kind === 'signatures' ? `${person} assinou uma meta do casal.`
    : kind === 'references_catalog' ? `${person} sugeriu uma inspiração${label ? `: ${label}` : '.'}`
    : kind === 'profiles' ? `${person} atualizou a foto ou o perfil.`
    : kind === 'records' ? `${person} ${event.action === 'DELETE' ? 'removeu' : event.action === 'INSERT' ? 'adicionou' : 'atualizou'} ${label || 'um plano'}.`
    : `${person} fez uma atualização no Duet.`;
  return { id: `a-${event.id}`, timestamp: event.created_at, text, tab: kind === 'votes' || kind === 'references_catalog' ? 'dream' : kind === 'signatures' ? 'plans' : label.startsWith('Agenda: ') ? 'together' : 'list', icon: kind === 'votes' ? 'heart' : 'calendar' };
}

export function DuetNotificationCenter({ userId, activity, messages, members, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const previousLatest = useRef<string | null>(null);
  const notices = useMemo(() => {
    const person = (id: string) => members.find(m => m.user_id === id)?.person ?? 'Seu par';
    return [
      ...activity.filter(item => item.actor_id && item.actor_id !== userId && item.entity_type !== 'messages')
        .map(item => activityNotice(item, person(item.actor_id ?? ''))),
      ...messages.filter(item => item.user_id !== userId).map(item => ({
        id: `m-${item.id}`, timestamp: item.created_at,
        text: item.body.startsWith('Já bebeu água hoje? — ') ? `${person(item.user_id)} respondeu: ${item.body.slice(21, 80)} 💧` : item.body.includes(' — Ainda não sei') || item.body.includes(' — Nada planejado') ? `${person(item.user_id)} ainda está decidindo um plano ♡` : `${person(item.user_id)} te mandou uma mensagem 💌`,
        tab: 'chat' as const, icon: 'message' as const,
      })),
    ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 60);
  }, [activity, members, messages, userId]);

  useEffect(() => {
    try { setLastSeen(Number(localStorage.getItem(seenKey(userId))) || 0); } catch { /* private mode */ }
    setSoundOn(soundsEnabled(userId));
  }, [userId]);
  const newest = notices[0];
  useEffect(() => {
    if (!newest) return;
    if (previousLatest.current !== null && previousLatest.current !== newest.id) playDuetSound('notification', userId);
    previousLatest.current = newest.id;
  }, [newest?.id, userId]);
  const unread = notices.filter(item => new Date(item.timestamp).getTime() > lastSeen).length;
  const toggle = (next: boolean) => {
    setOpen(next);
    if (next) {
      const now = Date.now();
      setLastSeen(now);
      try { localStorage.setItem(seenKey(userId), String(now)); } catch { /* private mode */ }
    }
  };
  return <>
    <Button size="icon" variant="ghost" title="Central de notificações" aria-label={unread ? `Notificações: ${unread} não lidas` : 'Abrir notificações'} onClick={() => toggle(true)} className="relative">
      <Bell size={19}/>{unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
    </Button>
    <Dialog open={open} onOpenChange={toggle}><DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-lg">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Bell size={20} className="text-primary"/>Notificações do casal</DialogTitle></DialogHeader>
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <span className="text-xs text-muted-foreground">Atualizações de vocês dois neste aparelho</span>
        <Button size="sm" variant="outline" aria-label={soundOn ? 'Silenciar sons do aplicativo' : 'Ativar sons do aplicativo'} onClick={() => { setSoundOn(!soundOn); setSoundsEnabled(userId, !soundOn); }}>
          {soundOn ? <Bell size={15}/> : <BellOff size={15}/>}{soundOn ? 'Som ligado' : 'Som desligado'}
        </Button>
      </div>
      <div className="min-h-32 space-y-1 overflow-y-auto">
        {notices.map(item => <button key={item.id} type="button" className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary" onClick={() => { setOpen(false); onNavigate(item.tab); }}>
          <span className="rounded-full bg-secondary p-2 text-primary" aria-hidden="true">{item.icon === 'message' ? <MessageCircle size={17}/> : item.icon === 'heart' ? <Heart size={17}/> : <CalendarDays size={17}/>}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm">{item.text}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></span>
          {new Date(item.timestamp).getTime() <= lastSeen && <CheckCheck size={15} className="mt-2 text-muted-foreground"/>}
        </button>)}
        {!notices.length && <p className="py-12 text-center text-sm text-muted-foreground">Ainda não há novidades. As próximas aparecerão aqui. ♡</p>}
      </div>
      <Button variant="outline" onClick={() => { setOpen(false); window.dispatchEvent(new Event('duet:open-notifications')); }}>Configurar notificações push</Button>
    </DialogContent></Dialog>
  </>;
}
