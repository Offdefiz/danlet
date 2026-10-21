import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateKeyPairSync, verify } from 'node:crypto';
import { firebaseAccessToken, firebaseCredentials } from '@/lib/firebase-direct.server';
import { isPublicHttpsUrl, searchWeb, SearchNotConfigured } from '@/lib/firecrawl-direct.server';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Independent providers', () => {
  it('rejects unsafe URL schemes and local network resources', () => {
    expect(isPublicHttpsUrl('https://www.instagram.com/example/')).toBe(true);
    expect(isPublicHttpsUrl('http://localhost/test')).toBe(false);
    expect(isPublicHttpsUrl('https://127.0.0.1/')).toBe(false);
    expect(isPublicHttpsUrl('https://192.168.1.2/')).toBe(false);
    expect(isPublicHttpsUrl('javascript:alert(1)')).toBe(false);
  });
  it('uses Firecrawl directly without Lovable headers or gateway', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', 'test-key');
    const fake = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ success: true, data: { web: [
        { title: 'Casa de festas', url: 'https://example.com/venue', description: 'Real' },
        { title: 'Internal', url: 'http://localhost/admin', description: '' },
      ] } }),
    });
    vi.stubGlobal('fetch', fake);
    const data = await searchWeb('casamento MG', 8);
    expect(data).toEqual([{ title: 'Casa de festas', url: 'https://example.com/venue', description: 'Real' }]);
    expect(fake.mock.calls[0]?.[0]).toBe('https://api.firecrawl.dev/v2/search');
    expect(fake.mock.calls[0]?.[1]?.headers).not.toHaveProperty('X-Connection-Api-Key');
    expect(fake.mock.calls[0]?.[1]?.headers?.Authorization).toBe('Bearer test-key');
  });
  it('reports missing optional search key without contacting a gateway', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    await expect(searchWeb('casamento')).rejects.toBeInstanceOf(SearchNotConfigured);
  });
  it('signs an OAuth assertion for direct Firebase HTTP v1', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const creds = { project_id: 'duet-test-project', client_email: 'duet@example.test', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'test-oauth-token', expires_in: 3500 }) });
    vi.stubGlobal('fetch', mock);
    const access = await firebaseAccessToken(creds);
    expect(access).toBe('test-oauth-token');
    const [url, opts] = mock.mock.calls[0]!;
    expect(url).toBe('https://oauth2.googleapis.com/token');
    const assertion = new URLSearchParams(opts.body).get('assertion')!;
    const segments = assertion.split('.');
    expect(segments).toHaveLength(3);
    const ok = verify('RSA-SHA256', Buffer.from(segments[0] + '.' + segments[1]), publicKey, Buffer.from(segments[2]!, 'base64url'));
    expect(ok).toBe(true);
    const claims = JSON.parse(Buffer.from(segments[1]!, 'base64url').toString('utf8')) as { scope: string };
    expect(claims.scope).toBe('https://www.googleapis.com/auth/firebase.messaging');
  });
  it('accepts service-account JSON from server environment only', () => {
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_JSON', JSON.stringify({ project_id: 'duet-test-project', client_email: 'test@example.test', private_key: 'fake' }));
    expect(firebaseCredentials()?.project_id).toBe('duet-test-project');
  });
});
