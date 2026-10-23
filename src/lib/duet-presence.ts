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
