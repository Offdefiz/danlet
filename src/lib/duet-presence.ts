/** A received real-time presence signal takes priority. The authenticated
 * server heartbeat is a fallback when mobile Safari loses its WebSocket. */
export const PARTNER_ONLINE_WINDOW_MS = 75_000;

export function heartbeatIsOnline(lastSeen: string | null, now = Date.now()): boolean {
  if (!lastSeen) return false;
  const last = Date.parse(lastSeen);
  return Number.isFinite(last) && last <= now + 5_000 && now - last < PARTNER_ONLINE_WINDOW_MS;
}

export function hasPartnerPresence(
  state: Record<string, unknown>, partnerId: string,
): boolean {
  const entries = state[partnerId];
  return Array.isArray(entries) && entries.some(entry => {
    if (!entry || typeof entry !== 'object') return false;
    return (entry as Record<string, unknown>)['active'] !== false;
  });
}


/** Last *server recorded* activity: browser focus and heartbeat may lag. */
export function formatPartnerLastSeen(lastSeen: string | null, now = new Date()): string {
  if (!lastSeen) return 'offline · última atividade indisponível';
  const lastDate = new Date(lastSeen);
  if (!Number.isFinite(lastDate.getTime())) return 'offline · última atividade indisponível';
  const zone = 'America/Sao_Paulo';
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  const hour = new Intl.DateTimeFormat('pt-BR', {
    timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(lastDate);
  const today = day(now);
  const date = day(lastDate);
  const yesterday = day(new Date(now.getTime() - 86_400_000));
  const label = date === today ? 'hoje' : date === yesterday ? 'ontem'
    : new Intl.DateTimeFormat('pt-BR', { timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(lastDate);
  return `Visto por último ${label} às ${hour}`;
}
