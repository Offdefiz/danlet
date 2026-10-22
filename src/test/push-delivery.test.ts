import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({ from: vi.fn(), removeToken: vi.fn(), filterRecipients: vi.fn() }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: database.from } }));
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const credentials = {
  project_id: 'duet-test-project', client_email: 'duet@example.test',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
};
let disabled: { user_id: string }[] = [];
const oauth = { ok: true, json: async () => ({ access_token: 'synthetic-access', expires_in: 3600 }) };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_JSON', JSON.stringify(credentials));
  for (const name of ['FIREBASE_SERVICE_ACCOUNT_FILE', 'GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) vi.stubEnv(name, '');
  vi.stubEnv('PUBLIC_APP_URL', 'https://danlet.onrender.com');
  disabled = [];
  database.removeToken.mockResolvedValue({ error: null });
  database.filterRecipients.mockResolvedValue({ data: [{ token: 'synthetic-device', user_id: 'recipient-test' }], error: null });
  database.from.mockImplementation((table: string) => {
    if (table === 'push_tokens') return {
      select: () => ({ in: database.filterRecipients }),
      delete: () => ({ eq: database.removeToken }),
    };
    if (table === 'notification_preferences') return { select: () => ({ eq: async () => ({ data: disabled, error: null }) }) };
    throw new Error('Unexpected synthetic table');
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Direct Firebase HTTP v1 delivery', () => {
  it('sends to the recipient through OAuth and FCM without a connector gateway', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(oauth).mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { pushTo } = await import('@/lib/push.server');
    expect(await pushTo(['recipient-test'], 'Duet ♡', 'Synthetic message', 'event-test')).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]![0]).toBe('https://oauth2.googleapis.com/token');
    const [url, request] = fetchMock.mock.calls[1]!;
    expect(url).toBe('https://fcm.googleapis.com/v1/projects/duet-test-project/messages:send');
    expect(request.headers).toEqual({ Authorization: 'Bearer synthetic-access', 'Content-Type': 'application/json' });
    const payload = JSON.parse(request.body) as { message: Record<string, unknown> };
    expect(payload.message).toMatchObject({
      token: 'synthetic-device', notification: { title: 'Duet ♡', body: 'Synthetic message' },
      webpush: { fcm_options: { link: 'https://danlet.onrender.com/' }, notification: { icon: 'https://danlet.onrender.com/icons/duet-192.png', tag: 'event-test' } },
    });
    expect(database.filterRecipients).toHaveBeenCalledWith('user_id', ['recipient-test']);
  });

  it('does not contact OAuth, FCM or the database without server configuration', async () => {
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_JSON', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { pushTo } = await import('@/lib/push.server');
    await expect(pushTo(['recipient-test'], 'Duet', 'Synthetic message')).rejects.toThrow(/configure/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(database.from).not.toHaveBeenCalled();
  });

  it('does not send to a recipient who has disabled push', async () => {
    disabled = [{ user_id: 'recipient-test' }];
    const fetchMock = vi.fn().mockResolvedValue(oauth);
    vi.stubGlobal('fetch', fetchMock);
    const { pushTo } = await import('@/lib/push.server');
    expect(await pushTo(['recipient-test'], 'Duet', 'Synthetic message')).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([429, 500, 503])('signals retryable HTTP %s without exposing the provider body', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(oauth).mockResolvedValueOnce({
      ok: false, status, text: async () => 'sensitive-test-marker',
    }));
    const { pushTo } = await import('@/lib/push.server');
    await expect(pushTo(['recipient-test'], 'Duet', 'Synthetic message')).rejects.toThrow('Falha temporária no envio Firebase (HTTP ' + status + ').');
    expect(database.removeToken).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('removes an UNREGISTERED device and does not print its provider payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(oauth).mockResolvedValueOnce({
      ok: false, status: 404, text: async () => JSON.stringify({ error: { details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }] } }),
    }));
    const { pushTo } = await import('@/lib/push.server');
    expect(await pushTo(['recipient-test'], 'Duet', 'Synthetic message')).toBe(0);
    expect(database.removeToken).toHaveBeenCalledWith('token', 'synthetic-device');
    expect(console.warn).toHaveBeenCalledWith('[FCM] Push rejected: HTTP 404');
  });

  it('sanitizes an FCM network failure before it reaches job logs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(oauth).mockRejectedValueOnce(new Error('sensitive-test-marker')));
    const { pushTo } = await import('@/lib/push.server');
    const error = await pushTo(['recipient-test'], 'Duet', 'Synthetic message').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Firebase/);
    expect((error as Error).message).not.toContain('sensitive-test-marker');
  });

  it('reports failed UNREGISTERED-token cleanup without exposing database details', async () => {
    database.removeToken.mockResolvedValue({ error: new Error('sensitive-test-marker') });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(oauth).mockResolvedValueOnce({
      ok: false, status: 404,
      text: async () => JSON.stringify({ error: { details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }] } }),
    }));
    const { pushTo } = await import('@/lib/push.server');
    await expect(pushTo(['recipient-test'], 'Duet', 'Synthetic message')).rejects.toThrow(/remover.*aparelho/i);
  });

  it('removes a sender-mismatched legacy device and still delivers to the next valid device', async () => {
    database.filterRecipients.mockResolvedValue({ data: [
      { token: 'synthetic-legacy-device', user_id: 'recipient-test' },
      { token: 'synthetic-current-device', user_id: 'recipient-test' },
    ], error: null });
    const fetchMock = vi.fn().mockResolvedValueOnce(oauth).mockResolvedValueOnce({
      ok: false, status: 403,
      text: async () => JSON.stringify({ error: { details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'SENDER_ID_MISMATCH' }] } }),
    }).mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { pushTo } = await import('@/lib/push.server');
    expect(await pushTo(['recipient-test'], 'Duet', 'Synthetic message')).toBe(1);
    expect(database.removeToken).toHaveBeenCalledExactlyOnceWith('token', 'synthetic-legacy-device');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body).message.token).toBe('synthetic-current-device');
    expect(console.warn).toHaveBeenCalledWith('[FCM] Push rejected: HTTP 403');
  });

  it.each([
    'IAM permission denied',
    JSON.stringify({ error: { message: 'SENDER_ID_MISMATCH' } }),
    JSON.stringify({ error: { details: [{ errorCode: 'SENDER_ID_MISMATCH' }] } }),
    JSON.stringify({ error: { details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', errorCode: 'SENDER_ID_MISMATCH' }] } }),
  ])('preserves tokens and throws on a 403 without a typed FCM sender mismatch (%#)', async providerBody => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(oauth).mockResolvedValueOnce({ ok: false, status: 403, text: async () => providerBody }));
    const { pushTo } = await import('@/lib/push.server');
    await expect(pushTo(['recipient-test'], 'Duet', 'Synthetic message')).rejects.toThrow('Falha temporária no envio Firebase (HTTP 403).');
    expect(database.removeToken).not.toHaveBeenCalled();
  });

  it.each([
    'An arbitrary message mentioning UNREGISTERED',
    JSON.stringify({ error: { message: 'UNREGISTERED' } }),
    JSON.stringify({ error: { details: [{ errorCode: 'UNREGISTERED' }] } }),
  ])('does not remove a token based on an arbitrary UNREGISTERED reference (%#)', async providerBody => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(oauth).mockResolvedValueOnce({ ok: false, status: 404, text: async () => providerBody }));
    const { pushTo } = await import('@/lib/push.server');
    expect(await pushTo(['recipient-test'], 'Duet', 'Synthetic message')).toBe(0);
    expect(database.removeToken).not.toHaveBeenCalled();
  });
});
