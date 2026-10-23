import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { syncPartnerNotifications } from '@/lib/notifications.functions';
import { subscribeForegroundPush } from '@/lib/push-client';
import { playDuetSound } from '@/lib/duet-sounds';
import { toast } from 'sonner';

export function useDuet(userId: string) {
  const cache = useQueryClient();
  const syncNotifications = useServerFn(syncPartnerNotifications);
  const query = useQuery({ queryKey: ['duet', userId], queryFn: async () => {
    const member = await supabase.from('couple_members').select('*');
    if (member.error) throw member.error;
    if (!member.data.some(m => m.user_id === userId)) throw new Error('Esta conta não está vinculada ao casal.');
    const [records, references, votes, signatures, activity, profiles, messages, proposals, proposalVotes] = await Promise.all([
      supabase.from('records').select('*').order('created_at', { ascending: false }),
      supabase.from('references_catalog').select('*').order('created_at'),
      supabase.from('votes').select('*'), supabase.from('signatures').select('*'),
      supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('*'), supabase.from('messages').select('*').order('created_at').limit(200),
      supabase.from('couple_proposals').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('couple_proposal_votes').select('*'),
    ]);
    for (const r of [records, references, votes, signatures, activity, profiles, messages, proposals, proposalVotes]) if (r.error) throw r.error;
    return { members: member.data, records: records.data ?? [], references: references.data ?? [], votes: votes.data ?? [], signatures: signatures.data ?? [], activity: activity.data ?? [], profiles: profiles.data ?? [], messages: messages.data ?? [], proposals: proposals.data ?? [], proposalVotes: proposalVotes.data ?? [] };
  }, refetchOnWindowFocus: true });
  useEffect(() => {
    const channel = supabase.channel(`duet-${userId}`);
    for (const table of ['records', 'references_catalog', 'votes', 'signatures', 'activity', 'messages', 'couple_proposals', 'couple_proposal_votes']) channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => void cache.invalidateQueries({ queryKey: ['duet', userId] }));
    const drain = () => { void syncNotifications({ data: { heartbeat: false } }).catch(error => console.warn('Avisos pendentes', error)); };
    for (const table of ['records', 'references_catalog', 'messages', 'activity', 'profiles', 'couple_proposals', 'couple_proposal_votes']) channel.on('postgres_changes', { event: '*', schema: 'public', table }, drain);
    channel.subscribe(status => { if (status === 'SUBSCRIBED') void cache.invalidateQueries({ queryKey: ['duet', userId] }); });
    const reconnect = () => void cache.invalidateQueries({ queryKey: ['duet', userId] });
    window.addEventListener('online', reconnect);
    return () => { void supabase.removeChannel(channel); window.removeEventListener('online', reconnect); };
  }, [cache, userId, syncNotifications]);
  useEffect(() => {
    const heartbeat = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      void syncNotifications({ data: { heartbeat: true } }).catch(error => console.warn('Presença não atualizada', error));
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 30_000);
    window.addEventListener('online', heartbeat);
    document.addEventListener('visibilitychange', heartbeat);
    return () => { window.clearInterval(interval); window.removeEventListener('online', heartbeat); document.removeEventListener('visibilitychange', heartbeat); };
  }, [syncNotifications, userId]);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    void subscribeForegroundPush(notice => {
      // Foreground Firebase messages do not automatically create a visible
      // notification. Keep it visible in the app even when iOS hides the banner.
      toast(notice.title, {
        description: notice.body,
        duration: 7000,
        action: { label: 'Abrir', onClick: () => { window.location.href = notice.url; } },
      });
      playDuetSound('notification', userId);
      if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
        void navigator.serviceWorker.ready.then(reg =>
          reg.showNotification(notice.title, {
            body: notice.body,
            tag: 'duet-foreground-' + Date.now(),
            icon: '/icons/duet-192.png',
            data: { duetForeground: true, url: notice.url },
          })
        ).catch(() => { /* In-app alert is the reliable foreground fallback. */ });
      }
    }).then(unsub => {
      if (cancelled) unsub?.(); else unsubscribe = unsub;
    }).catch(() => { /* Realtime + next Firebase registration remain available. */ });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [userId]);
  return query;
}