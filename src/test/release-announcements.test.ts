import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  from: vi.fn(), configured: vi.fn(), ready: vi.fn(), pushTo: vi.fn(),
  members: vi.fn(), preferences: vi.fn(), inserted: vi.fn(), deleteMarker: vi.fn(),
}));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: db.from } }));
vi.mock('@/lib/push.server', () => ({
  firebasePushConfigured: db.configured,
  assertFirebasePushReady: db.ready,
  pushTo: db.pushTo,
}));

import { currentVersion } from '@/lib/release-notes';
import { releasePushCopy, sendReleaseAnnouncements } from '@/lib/release-announcements.server';

beforeEach(() => {
  vi.clearAllMocks();
  db.configured.mockReturnValue(true);
  db.ready.mockResolvedValue(undefined);
  db.pushTo.mockResolvedValue(2);
  db.members.mockResolvedValue({ data: [{ user_id: 'daniel-id' }, { user_id: 'leticia-id' }], error: null });
  db.preferences.mockResolvedValue({ data: [], error: null });
  db.inserted.mockResolvedValue({ data: [{ id: 'unique-marker' }], error: null });
  db.deleteMarker.mockResolvedValue({ error: null });
  db.from.mockImplementation((table: string) => {
    if (table === 'couple_members') return { select: db.members };
    if (table === 'notification_preferences') return { select: () => ({ eq: db.preferences }) };
    if (table === 'push_event_queue') return {
      upsert: (_payload: unknown, _options: unknown) => ({ select: db.inserted }),
      delete: () => ({ eq: db.deleteMarker }),
    };
    throw new Error('unexpected synthetic Supabase table');
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('Automated new-version notifications', () => {
  it('announces the initial post-Supabase recap once to each member with deep links', async () => {
    const result = await sendReleaseAnnouncements();
    expect(result).toEqual({ sent: 4, version: currentVersion });
    expect(db.inserted).toHaveBeenCalledTimes(2);
    expect(db.pushTo).toHaveBeenCalledTimes(2);
    expect(db.pushTo).toHaveBeenCalledWith(
      ['daniel-id'], expect.stringContaining('Duet'),
      expect.stringContaining('Firecrawl'), 'duet-update-' + currentVersion,
      '/?duet_view=updates', 'high',
    );
    expect(db.pushTo).toHaveBeenCalledWith(
      ['leticia-id'], expect.any(String), expect.any(String),
      'duet-update-' + currentVersion, '/?duet_view=updates', 'high',
    );
    const sendOnlyData = db.from.mock.results.length;
    expect(sendOnlyData).toBeGreaterThan(0);
  });
  it('uses idempotent database markers to avoid duplicate delivery on scheduler retries', async () => {
    db.inserted.mockResolvedValue({ data: [], error: null });
    expect(await sendReleaseAnnouncements()).toEqual({ sent: 0, version: currentVersion });
    expect(db.pushTo).not.toHaveBeenCalled();
  });
  it('respects account-level push preference and does not queue for opted-out members', async () => {
    db.preferences.mockResolvedValue({ data: [{ user_id: 'leticia-id' }], error: null });
    expect((await sendReleaseAnnouncements()).sent).toBe(2);
    expect(db.inserted).toHaveBeenCalledOnce();
    expect(db.pushTo).toHaveBeenCalledWith(['daniel-id'], expect.any(String), expect.any(String),
      expect.any(String), expect.any(String), 'high');
  });
  it('does not consume version markers when Firebase is missing', async () => {
    db.configured.mockReturnValue(false);
    expect(await sendReleaseAnnouncements()).toEqual({ sent: 0, version: currentVersion });
    expect(db.from).not.toHaveBeenCalled();
  });
  it('releases the marker if zero registered devices accepted push', async () => {
    db.pushTo.mockResolvedValue(0);
    expect((await sendReleaseAnnouncements()).sent).toBe(0);
    expect(db.deleteMarker).toHaveBeenCalledTimes(2);
    expect(db.deleteMarker).toHaveBeenNthCalledWith(1, 'id', expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(db.deleteMarker).toHaveBeenNthCalledWith(2, 'id', expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(db.deleteMarker.mock.calls[0]![1]).not.toBe(db.deleteMarker.mock.calls[1]![1]);
  });
  it('changes the notification copy for later versions, keeping the full details in-app', () => {
    expect(releasePushCopy('2.7.0').body).toContain('Supabase');
    expect(releasePushCopy('2.8.0').title).toBe('Duet v2.8.0 disponível! ♡');
    expect(releasePushCopy('2.8.0').body).toContain('Toque para ver todas as novidades.');
  });
});
