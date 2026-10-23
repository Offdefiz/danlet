import { describe, expect, it } from 'vitest';
import { hasPartnerPresence, heartbeatIsOnline, PARTNER_ONLINE_WINDOW_MS } from '@/lib/duet-presence';
import { canRemindPartner } from '@/lib/juntos-suggestions';

describe('Duet online and offline status', () => {
  const now = Date.parse('2026-10-23T21:00:00.000Z');
  it('recognizes recent authenticated heartbeats', () => {
    expect(heartbeatIsOnline(new Date(now - 25_000).toISOString(), now)).toBe(true);
    expect(heartbeatIsOnline(new Date(now - PARTNER_ONLINE_WINDOW_MS + 1000).toISOString(), now)).toBe(true);
    expect(heartbeatIsOnline(new Date(now - PARTNER_ONLINE_WINDOW_MS - 1000).toISOString(), now)).toBe(false);
    expect(heartbeatIsOnline(null, now)).toBe(false);
    expect(heartbeatIsOnline('bad', now)).toBe(false);
    expect(heartbeatIsOnline(new Date(now + 60_000).toISOString(), now)).toBe(false);
  });
  it('does not mistake own presence for the partner', () => {
    const state = { 'daniel-id': [{ active: true, at: now }] };
    expect(hasPartnerPresence(state, 'leticia-id')).toBe(false);
    expect(hasPartnerPresence(state, 'daniel-id')).toBe(true);
  });
  it('supports multiple connections and ignores explicitly inactive entries', () => {
    const state = {
      'leticia-id': [{ active: false }, { active: true, at: now }],
      'other-id': [{ active: true }],
    };
    expect(hasPartnerPresence(state, 'leticia-id')).toBe(true);
    expect(hasPartnerPresence({ 'leticia-id': [{ active: false }] }, 'leticia-id')).toBe(false);
    expect(hasPartnerPresence({ 'leticia-id': [] }, 'leticia-id')).toBe(false);
  });
});

describe('Resend unanswered Juntos notifications', () => {
  const today = '2026-10-23';
  it('permits repeated alerts only for open proposals without partner response', () => {
    expect(canRemindPartner({ status: 'pending', date: today }, false, today)).toBe(true);
    expect(canRemindPartner({ status: 'pending', date: '2026-10-24' }, false, today)).toBe(true);
    expect(canRemindPartner({ status: 'pending', date: today }, true, today)).toBe(false);
    expect(canRemindPartner({ status: 'declined', date: today }, false, today)).toBe(false);
    expect(canRemindPartner({ status: 'agreed', date: today }, false, today)).toBe(false);
    expect(canRemindPartner({ status: 'pending', date: '2026-10-22' }, false, today)).toBe(false);
  });
});
