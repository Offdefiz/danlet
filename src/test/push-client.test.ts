import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fcm = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: 'duet-push' })),
  getApps: vi.fn(() => []),
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(async () => 'test-device-token'),
  onMessage: vi.fn((_messaging: unknown, _handler: (payload: unknown) => void) => vi.fn()),
  isSupported: vi.fn(async () => true),
  upsert: vi.fn(async () => ({ error: null })),
}));
vi.mock('firebase/app', () => fcm);
vi.mock('firebase/messaging', () => fcm);
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ upsert: fcm.upsert }) } }));

const vapid = btoa(String.fromCharCode(4) + 'x'.repeat(64)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
let register: ReturnType<typeof vi.fn>;
let requestPermission: ReturnType<typeof vi.fn>;
let getSubscription: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const [key, value] of Object.entries({
    API_KEY: 'public-test-key', PROJECT_ID: 'duet-test', APP_ID: '1:123:web:test',
    MESSAGING_SENDER_ID: '123', VAPID_KEY: vapid,
  })) vi.stubEnv(`VITE_FIREBASE_${key}`, value);
  getSubscription = vi.fn(async () => null);
  register = vi.fn(async () => ({ active: { state: 'activated' }, installing: null, waiting: null, pushManager: { getSubscription } }));
  requestPermission = vi.fn(async () => 'granted');
  vi.stubGlobal('Notification', { permission: 'default', requestPermission });
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('navigator', { serviceWorker: { register }, userAgent: 'Chrome', platform: 'Linux', maxTouchPoints: 0 });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('FCM device registration', () => {
  it('requests permission inside the original user gesture before asynchronous capability checks', async () => {
    const { enablePush } = await import('@/lib/push-client');
    const result = enablePush('user-test');
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(await result).toBe('registered');
    expect(fcm.getToken).toHaveBeenCalledWith(expect.anything(), { vapidKey: vapid, serviceWorkerRegistration: await register.mock.results[0]!.value });
    expect(fcm.upsert).toHaveBeenCalledWith({ token: 'test-device-token', user_id: 'user-test' });
  });

  it('guides iPhone Safari users to install before requesting permission', async () => {
    vi.stubGlobal('navigator', { serviceWorker: { register }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 });
    const { enablePush } = await import('@/lib/push-client');
    expect(await enablePush('user-test')).toBe('install-required');
    expect(requestPermission).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it('allows the installed iPhone app to register', async () => {
    vi.stubGlobal('navigator', { serviceWorker: { register }, userAgent: 'iPhone', standalone: true, platform: 'iPhone', maxTouchPoints: 5 });
    const { enablePush } = await import('@/lib/push-client');
    expect(await enablePush('user-test')).toBe('registered');
  });

  it('waits for an installing service worker to activate before requesting the FCM token', async () => {
    const worker = Object.assign(new EventTarget(), { state: 'installing' });
    register.mockResolvedValue({ active: null, installing: worker, waiting: null, pushManager: { getSubscription } });
    const { enablePush } = await import('@/lib/push-client');
    const result = enablePush('user-test');
    await vi.waitFor(() => expect(register).toHaveBeenCalledOnce());
    expect(fcm.getToken).not.toHaveBeenCalled();
    worker.state = 'activated';
    worker.dispatchEvent(new Event('statechange'));
    expect(await result).toBe('registered');
  });

  it('rejects a redundant worker without saving a token', async () => {
    register.mockResolvedValue({ active: null, installing: { state: 'redundant' }, waiting: null });
    const { enablePush } = await import('@/lib/push-client');
    await expect(enablePush('user-test')).rejects.toThrow('service worker');
    expect(fcm.upsert).not.toHaveBeenCalled();
  });

  it('replaces a subscription bound to the previous project VAPID key', async () => {
    const unsubscribe = vi.fn(async () => true);
    getSubscription.mockResolvedValue({ options: { applicationServerKey: new Uint8Array(65).buffer }, unsubscribe });
    const { enablePush } = await import('@/lib/push-client');
    expect(await enablePush('user-test')).toBe('registered');
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(unsubscribe.mock.invocationCallOrder[0]).toBeLessThan(fcm.getToken.mock.invocationCallOrder[0]!);
  });

  it('preserves a subscription using the selected VAPID key', async () => {
    const unsubscribe = vi.fn(async () => true);
    getSubscription.mockResolvedValue({ options: { applicationServerKey: Uint8Array.from(atob(vapid.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer }, unsubscribe });
    const { enablePush } = await import('@/lib/push-client');
    expect(await enablePush('user-test')).toBe('registered');
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it('does not mix an incomplete independent project with legacy connector settings', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    vi.stubEnv('VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY', 'legacy-key');
    const { enablePush } = await import('@/lib/push-client');
    expect(await enablePush('user-test')).toBe('not-configured');
    expect(register).not.toHaveBeenCalled();
  });

  it('subscribes to foreground Firebase pushes without prompting again', async () => {
    vi.stubGlobal('Notification', { permission: 'granted', requestPermission });
    const listener = vi.fn();
    const { subscribeForegroundPush } = await import('@/lib/push-client');
    const unsubscribe = await subscribeForegroundPush(listener);
    expect(fcm.onMessage).toHaveBeenCalledOnce();
    const onReceive = fcm.onMessage.mock.calls[0]![1] as (payload: unknown) => void;
    onReceive({ notification: { title: 'Duet ♡', body: 'Letícia enviou uma mensagem' },
      fcmOptions: { link: 'https://outside.test/evil' } });
    expect(listener).toHaveBeenCalledWith({ title: 'Duet ♡', body: 'Letícia enviou uma mensagem', url: '/' });
    expect(typeof unsubscribe).toBe('function');
  });
  it('rejects an invalid VAPID key before prompting', async () => {
    vi.stubEnv('VITE_FIREBASE_VAPID_KEY', 'invalid');
    const { enablePush } = await import('@/lib/push-client');
    expect(await enablePush('user-test')).toBe('not-configured');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('does not register or save tokens after permission is refused', async () => {
    requestPermission.mockResolvedValue('denied');
    const { enablePush } = await import('@/lib/push-client');
    expect(await enablePush('user-test')).toBe('denied');
    expect(register).not.toHaveBeenCalled();
    expect(fcm.upsert).not.toHaveBeenCalled();
  });
});
