import { generateKeyPairSync, verify } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const files = vi.hoisted(() => ({ readFileSync: vi.fn() }));
vi.mock('node:fs', () => ({ readFileSync: files.readFileSync, default: { readFileSync: files.readFileSync } }));

const keyPair = () => generateKeyPairSync('rsa', { modulusLength: 2048 });
const firstKey = keyPair();
const secondKey = keyPair();
const account = (key = firstKey) => ({
  project_id: 'duet-test-project',
  client_email: 'duet@example.test',
  private_key: key.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
});
const credentialVariables = [
  'FIREBASE_SERVICE_ACCOUNT_JSON', 'FIREBASE_SERVICE_ACCOUNT_FILE',
  'GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY',
] as const;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const name of credentialVariables) vi.stubEnv(name, '');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Firebase server credentials', () => {
  it.each(['FIREBASE_SERVICE_ACCOUNT_FILE', 'GOOGLE_APPLICATION_CREDENTIALS'] as const)(
    'reads only the explicitly configured %s path', async variable => {
      vi.stubEnv(variable, '/synthetic/firebase-service-account.json');
      files.readFileSync.mockReturnValue(JSON.stringify(account()));
      const { firebaseCredentials } = await import('@/lib/firebase-direct.server');
      expect(firebaseCredentials()?.project_id).toBe('duet-test-project');
      expect(files.readFileSync).toHaveBeenCalledWith('/synthetic/firebase-service-account.json', 'utf8');
    },
  );

  it('preserves JSON precedence and never discovers credential files implicitly', async () => {
    const { firebaseCredentials } = await import('@/lib/firebase-direct.server');
    expect(firebaseCredentials()).toBeNull();
    expect(files.readFileSync).not.toHaveBeenCalled();
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_JSON', JSON.stringify(account()));
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_FILE', '/synthetic/unused.json');
    expect(firebaseCredentials()?.client_email).toBe('duet@example.test');
    expect(files.readFileSync).not.toHaveBeenCalled();
  });

  it('fails closed without exposing an unreadable configured file', async () => {
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_FILE', '/synthetic/missing.json');
    vi.stubEnv('FIREBASE_PROJECT_ID', 'legacy-project');
    vi.stubEnv('FIREBASE_CLIENT_EMAIL', 'legacy@example.test');
    vi.stubEnv('FIREBASE_PRIVATE_KEY', account().private_key);
    files.readFileSync.mockImplementation(() => { throw new Error('sensitive-test-marker'); });
    const { firebaseCredentials, firebasePushConfigured } = await import('@/lib/firebase-direct.server');
    expect(firebaseCredentials() === null).toBe(true);
    expect(firebasePushConfigured()).toBe(false);
  });

  it('continues accepting legacy environment fields and escaped PEM newlines', async () => {
    vi.stubEnv('FIREBASE_PROJECT_ID', 'duet-test-project');
    vi.stubEnv('FIREBASE_CLIENT_EMAIL', 'duet@example.test');
    vi.stubEnv('FIREBASE_PRIVATE_KEY', account().private_key.replace(/\n/g, '\\n'));
    const { firebaseCredentials, firebasePushConfigured } = await import('@/lib/firebase-direct.server');
    expect(firebaseCredentials()?.private_key === account().private_key).toBe(true);
    expect(firebasePushConfigured()).toBe(true);
  });
});

describe('Firebase direct OAuth', () => {
  it('sanitizes an invalid signing key before any network request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { firebaseAccessToken } = await import('@/lib/firebase-direct.server');
    await expect(firebaseAccessToken({ ...account(), private_key: 'PRIVATE KEY synthetic malformed' })).rejects.toThrow(/Firebase/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs the direct HTTP v1 assertion and refreshes after private-key rotation', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'oauth-test-a', expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'oauth-test-b', expires_in: 3600 }) });
    vi.stubGlobal('fetch', fetchMock);
    const { firebaseAccessToken } = await import('@/lib/firebase-direct.server');
    expect(await firebaseAccessToken(account())).toBe('oauth-test-a');
    expect(await firebaseAccessToken(account())).toBe('oauth-test-a');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await firebaseAccessToken(account(secondKey))).toBe('oauth-test-b');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[1]!;
    expect(url).toBe('https://oauth2.googleapis.com/token');
    const form = new URLSearchParams(options.body);
    expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    const parts = form.get('assertion')!.split('.');
    expect(verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), secondKey.publicKey, Buffer.from(parts[2]!, 'base64url'))).toBe(true);
    const claims = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()) as Record<string, unknown>;
    expect(claims).toMatchObject({
      iss: 'duet@example.test', aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    });
  });

  it.each(['network', 'json'] as const)('sanitizes OAuth %s errors', async failure => {
    const fetchMock = failure === 'network'
      ? vi.fn().mockRejectedValue(new Error('sensitive-test-marker'))
      : vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('sensitive-test-marker'); } });
    vi.stubGlobal('fetch', fetchMock);
    const { firebaseAccessToken } = await import('@/lib/firebase-direct.server');
    const error = await firebaseAccessToken(account()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Firebase/);
    expect((error as Error).message).not.toContain('sensitive-test-marker');
  });
});
