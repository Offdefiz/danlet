export const onlineCooldowns = [5, 15, 30, 60] as const;
export function shouldDeliverEvent(kind: string, preferences: { enabled: boolean; additions: boolean; online: boolean; online_cooldown_minutes: number; last_online_notice: string | null }, now: number) {
  if (!preferences.enabled) return false;
  if (kind === 'addition') return preferences.additions;
  if (kind !== 'online') return true;
  return preferences.online && (!preferences.last_online_notice || now - Date.parse(preferences.last_online_notice) >= preferences.online_cooldown_minutes * 60_000);
}