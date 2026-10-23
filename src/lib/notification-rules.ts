/** Recipient opt-out remains sovereign; ordinary additions can be muted,
 * but messages are not additions and a real new online transition has no
 * server-imposed cooldown. Kept in sync with claim_duet_push_events SQL.
 */
export function shouldDeliverEvent(kind: string, preferences: {
  enabled: boolean; additions: boolean; online: boolean;
  online_cooldown_minutes: number; last_online_notice: string | null;
}, _now: number) {
  if (!preferences.enabled) return false;
  if (kind === 'addition') return preferences.additions;
  if (kind === 'online') return preferences.online;
  return true;
}
