import { describe, expect, it } from 'vitest';
import { shouldDeliverEvent } from '@/lib/notification-rules';

const now = Date.parse('2026-10-19T12:00:00Z');
const base = { enabled: true, additions: true, online: true, online_cooldown_minutes: 15, last_online_notice: null };
describe('partner notification controls', () => {
  it('disabling all push blocks additions and online events', () => {
    for (const kind of ['addition', 'online', 'message', 'update']) expect(shouldDeliverEvent(kind, { ...base, enabled: false }, now)).toBe(false);
  });
  it('addition switch disables only addition notices', () => {
    expect(shouldDeliverEvent('addition', { ...base, additions: false }, now)).toBe(false);
    expect(shouldDeliverEvent('online', { ...base, additions: false }, now)).toBe(true);
    expect(shouldDeliverEvent('message', { ...base, additions: false }, now)).toBe(true);
  });
  it('online switch prevents presence notices', () => {
    expect(shouldDeliverEvent('online', { ...base, online: false }, now)).toBe(false);
  });
  it('never suppresses a genuine new online transition with an artificial cooldown', () => {
    const p = { ...base, last_online_notice: new Date(now - 1000).toISOString() };
    expect(shouldDeliverEvent('online', p, now)).toBe(true);
    expect(shouldDeliverEvent('online', p, now + 1000)).toBe(true);
  });
});