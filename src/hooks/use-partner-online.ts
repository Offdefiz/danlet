import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { readPartnerPresence } from '@/lib/notifications.functions';
import { hasPartnerPresence } from '@/lib/duet-presence';

/** Real-time presence first; authenticated heartbeat polling as a fallback.
 * Realtime signals are scoped to the known partner's user ID (not just
 * "someone else joined") and hidden tabs explicitly stop tracking.
 */
export function usePartnerOnline(userId: string, partnerId: string | undefined) {
  const checkPresence = useServerFn(readPartnerPresence);
  const [socketOnline, setSocketOnline] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [checking, setChecking] = useState(true);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId) {
      setChecking(false);
      return;
    }
    let active = true;
    let subscribed = false;
    const channel = supabase.channel('duet-presence', {
      config: { presence: { key: userId } },
    });
    const refreshRealtime = () => {
      if (!active) return;
      const present = hasPartnerPresence(
        channel.presenceState() as Record<string, unknown>, partnerId,
      );
      setSocketOnline(present);
      if (present) {
        // Supabase presence includes the partner's own most recent track time.
        // It is newer than the 30-second durable heartbeat when online.
        const presences = channel.presenceState()[partnerId];
        if (Array.isArray(presences)) for (const entry of presences) {
          if (!entry || typeof entry !== 'object') continue;
          const raw = (entry as unknown as Record<string, unknown>)['at'];
          if (typeof raw !== 'number' || !Number.isFinite(raw) || Math.abs(Date.now() - raw) > 120_000) continue;
          const stamp = new Date(raw).toISOString();
          setLastSeen(old => !old || Date.parse(stamp) > Date.parse(old) ? stamp : old);
        }
        setChecking(false);
      }
    };
    const poll = async () => {
      if (!active || document.visibilityState !== 'visible' || !navigator.onLine) return;
      try {
        const status = await checkPresence();
        if (!active) return;
        setServerOnline(status.online);
        if (status.lastSeen && Number.isFinite(Date.parse(status.lastSeen))) {
          setLastSeen(old => !old || Date.parse(status.lastSeen!) > Date.parse(old) ? status.lastSeen : old);
        }
        setChecking(false);
      } catch {
        // A temporarily failed REST request must not turn a live WebSocket
        // presence signal into "offline".
        if (active) setChecking(false);
      }
    };
    const trackIfVisible = () => {
      if (!subscribed || !active) return;
      if (document.visibilityState === 'visible') {
        void channel.track({ user_id: userId, active: true, at: Date.now() });
        void poll();
      } else {
        void channel.untrack();
      }
    };
    channel.on('presence', { event: 'sync' }, refreshRealtime)
      .on('presence', { event: 'join' }, refreshRealtime)
      .on('presence', { event: 'leave' }, refreshRealtime)
      .subscribe(status => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          trackIfVisible();
          refreshRealtime();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          subscribed = false;
          setSocketOnline(false);
          void poll();
        }
      });
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        setSocketOnline(false);
        setServerOnline(false);
      }
      trackIfVisible();
    };
    const onReconnect = () => { if (document.visibilityState === 'visible') { trackIfVisible(); void poll(); } };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onReconnect);
    window.addEventListener('online', onReconnect);
    window.addEventListener('offline', onVisibility);
    const refresh = window.setInterval(() => { void poll(); }, 15_000);
    void poll();
    return () => {
      active = false;
      window.clearInterval(refresh);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onReconnect);
      window.removeEventListener('online', onReconnect);
      window.removeEventListener('offline', onVisibility);
      if (subscribed) void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [userId, partnerId, checkPresence]);

  return { online: socketOnline || serverOnline, checking, lastSeen };
}
