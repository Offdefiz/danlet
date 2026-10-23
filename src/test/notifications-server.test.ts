import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), configured: vi.fn(), ready: vi.fn(), pushTo: vi.fn(),
}));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: boundary.from, rpc: boundary.rpc } }));
vi.mock('@/lib/push.server', () => ({
  firebasePushConfigured: boundary.configured,
  assertFirebasePushReady: boundary.ready,
  pushTo: boundary.pushTo,
}));

import { drainPartnerPush } from '@/lib/notifications.server';
import { sendDueInspirations } from '@/lib/reminders.server';

const event = { id: 'event-test', actor_id: 'actor-test', recipient_id: 'recipient-test', kind: 'addition', body: 'adicionou uma meta' };
const members = vi.fn();
const release = vi.fn();
const removeMarker = vi.fn();
const upsertMarker = vi.fn();
const selectMarker = vi.fn();
const day = new Date('2026-10-22T13:30:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  boundary.configured.mockReturnValue(true);
  boundary.ready.mockResolvedValue(undefined);
  boundary.pushTo.mockResolvedValue(1);
  boundary.rpc.mockResolvedValue({ data: [event], error: null });
  members.mockResolvedValue({ data: [{ user_id: 'actor-test', person: 'Daniel' }], error: null });
  release.mockResolvedValue({ error: null });
  removeMarker.mockResolvedValue({ error: null });
  selectMarker.mockResolvedValue({ data: [{ id: 'marker-test' }], error: null });
  upsertMarker.mockReturnValue({ select: selectMarker });
  boundary.from.mockImplementation((table: string) => {
    if (table === 'couple_members') return { select: members };
    if (table === 'notification_preferences') return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
    if (table === 'records') return { select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) };
    if (table === 'duet_presence') return { select: () => ({ gte: async () => ({ data: [], error: null }) }) };
    if (table === 'push_event_queue') return {
      update: () => ({ eq: release }),
      delete: () => ({ eq: removeMarker }),
      upsert: upsertMarker,
    };
    throw new Error('Unexpected synthetic table');
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('Partner queue delivery', () => {
  it('preserves queued events and reminder slots without Firebase configuration', async () => {
    boundary.configured.mockReturnValue(false);
    expect(await drainPartnerPush()).toBe(0);
    expect(await sendDueInspirations(day)).toEqual({ sent: 0, reason: 'push-not-configured' });
    expect(boundary.ready).not.toHaveBeenCalled();
    expect(boundary.from).not.toHaveBeenCalled();
    expect(boundary.rpc).not.toHaveBeenCalled();
  });

  it('never claims events or reminder slots when OAuth authentication fails', async () => {
    boundary.ready.mockRejectedValue(new Error('Firebase authentication unavailable'));
    await expect(drainPartnerPush()).rejects.toThrow('Firebase authentication unavailable');
    await expect(sendDueInspirations(day)).rejects.toThrow('Firebase authentication unavailable');
    expect(boundary.from).not.toHaveBeenCalled();
    expect(boundary.rpc).not.toHaveBeenCalled();
  });

  it('does not consume a queue batch if loading its actors fails', async () => {
    members.mockResolvedValue({ data: null, error: new Error('Synthetic member read failure') });
    await expect(drainPartnerPush()).rejects.toThrow('Synthetic member read failure');
    expect(boundary.rpc).not.toHaveBeenCalled();
    expect(boundary.pushTo).not.toHaveBeenCalled();
  });

  it('delivers real chat text by its exact message ID to the other account', async () => {
    const chat = {
      id: '6ad452dc-cde0-42a7-9dd8-6629efb925f1',
      body: 'Vamos jantar? 🍝',
    };
    boundary.rpc.mockResolvedValue({ data: [{ ...event, kind: 'message', body: 'message:' + chat.id }], error: null });
    const select = { maybeSingle: async () => ({ data: { body: chat.body }, error: null }) };
    const byId = { eq: vi.fn(() => select) };
    const first = { eq: vi.fn(() => byId) };
    boundary.from.mockImplementation((table: string) => {
      if (table === 'couple_members') return { select: members };
      if (table === 'messages') return { select: () => first };
      if (table === 'notification_preferences') return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
      throw new Error('Unexpected synthetic table: ' + table);
    });
    expect(await drainPartnerPush()).toBe(1);
    expect(first.eq).toHaveBeenCalledWith('id', chat.id);
    expect(byId.eq).toHaveBeenCalledWith('user_id', 'actor-test');
    expect(boundary.pushTo).toHaveBeenCalledWith(
      ['recipient-test'], expect.stringMatching(/Daniel.*mensagem/), chat.body,
      'event-test', '/?duet_view=chat', 'high',
    );
  });
  it('notifies the partner explicitly when a suggestion is accepted', async () => {
    const id = 'f91a8266-497a-430d-9c76-c46be1ff79bf';
    boundary.rpc.mockResolvedValue({ data: [{ ...event, kind: 'proposal_vote', body: 'accepted:' + id }], error: null });
    const byId = { maybeSingle: async () => ({ data: { title: 'Guacamole hoje?' }, error: null }) };
    const lookup = { eq: () => byId };
    boundary.from.mockImplementation((table: string) => {
      if (table === 'couple_members') return { select: members };
      if (table === 'couple_proposals') return { select: () => lookup };
      if (table === 'notification_preferences') return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
      throw new Error('Unexpected synthetic table');
    });
    expect(await drainPartnerPush()).toBe(1);
    expect(boundary.pushTo).toHaveBeenCalledWith(
      ['recipient-test'], expect.stringMatching(/topou/),
      expect.stringMatching(/Guacamole hoje/), 'event-test',
      expect.stringContaining('duet_proposal='), 'high',
    );
  });

  it('releases a failed delivery claim without logging its raw error', async () => {
    boundary.pushTo.mockRejectedValue(new Error('sensitive-test-marker'));
    expect(await drainPartnerPush()).toBe(0);
    expect(release).toHaveBeenCalledWith('id', 'event-test');
    expect(console.error).toHaveBeenCalledWith('Falha ao enviar aviso do casal');
    expect(console.error).not.toHaveBeenCalledWith(expect.anything(), expect.anything());
  });

  it('reports a failed claim release after attempting the remaining batch', async () => {
    boundary.rpc.mockResolvedValue({ data: [event, { ...event, id: 'second-event-test' }], error: null });
    boundary.pushTo.mockRejectedValueOnce(new Error('Synthetic provider failure')).mockResolvedValueOnce(1);
    release.mockResolvedValue({ error: new Error('sensitive-test-marker') });
    await expect(drainPartnerPush()).rejects.toThrow(/liberar.*aviso/i);
    expect(boundary.pushTo).toHaveBeenCalledTimes(2);
  });
});

describe('Reminder markers', () => {
  it('uses the same durable marker and skips an already claimed reminder window', async () => {
    selectMarker.mockResolvedValueOnce({ data: [{ id: 'marker-test' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    expect(await sendDueInspirations(day)).toEqual({ sent: 1, slot: 't10-20', proposal: false });
    expect(await sendDueInspirations(day)).toEqual({ sent: 0, slot: 't10-20', proposal: false });
    expect(boundary.pushTo).toHaveBeenCalledTimes(1);
    const first = upsertMarker.mock.calls[0]!;
    const second = upsertMarker.mock.calls[1]!;
    expect(first[0].id).toBe(second[0].id);
    expect(first[1]).toEqual({ onConflict: 'id', ignoreDuplicates: true });
  });

  it('releases a failed reminder marker without logging its raw error', async () => {
    boundary.pushTo.mockRejectedValue(new Error('sensitive-test-marker'));
    expect(await sendDueInspirations(day)).toEqual({ sent: 0, slot: 't10-20', proposal: false });
    expect(removeMarker).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('Falha ao enviar aviso proativo do Duet');
    expect(console.error).not.toHaveBeenCalledWith(expect.anything(), expect.anything());
  });

  it('reports a failed marker release with a sanitized error', async () => {
    boundary.pushTo.mockRejectedValue(new Error('Synthetic provider failure'));
    removeMarker.mockResolvedValue({ error: new Error('sensitive-test-marker') });
    await expect(sendDueInspirations(day)).rejects.toThrow(/liberar.*aviso/i);
  });
});
