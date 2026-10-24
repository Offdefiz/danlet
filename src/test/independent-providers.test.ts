import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateKeyPairSync, verify } from 'node:crypto';
import { firebaseAccessToken, firebaseCredentials } from '@/lib/firebase-direct.server';
import { isPublicHttpsUrl, searchWeb } from '@/lib/firecrawl-direct.server';
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
  it('uses the official free keyless Firecrawl tier for an arbitrary region', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    const fake = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ success: true, data: {
        web: [{ title: 'Espaço em Tiradentes', url: 'https://www.instagram.com/p/Tira1234/', description: 'Casamento em Tiradentes' }],
        images: [{
          title: 'Espaço em Tiradentes', url: 'https://www.instagram.com/p/Tira1234/',
          imageUrl: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3882650950662597379',
        }],
      } }),
    });
    vi.stubGlobal('fetch', fake);
    const results = await searchWeb('casamento em Tiradentes MG site:instagram.com', 8);
    expect(results).toHaveLength(1);
    expect(results[0]?.image).toContain('lookaside.instagram.com');
    expect(fake).toHaveBeenCalledOnce();
    const [endpoint, options] = fake.mock.calls[0]!;
    expect(endpoint).toBe('https://api.firecrawl.dev/v2/search');
    expect(options.headers).not.toHaveProperty('Authorization');
    expect(options.headers).toHaveProperty('Content-Type', 'application/json');
    expect(JSON.parse(options.body).sources).toEqual([{ type: 'web' }, { type: 'images' }]);
  });
  it('prioritizes image-index matches over ten text-only web matches', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    const fake = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({
        success: true,
        data: {
          web: Array.from({ length: 10 }, (_, i) => ({
            title: 'Evento sem foto ' + i,
            url: 'https://www.instagram.com/perfil' + i + '/',
            description: 'Foto de evento em Tiradentes',
          })),
          images: Array.from({ length: 5 }, (_, i) => ({
            title: 'Lugar com foto ' + i,
            url: 'https://www.instagram.com/p/foto' + i + '/',
            imageUrl: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=' + String(3882650950662597300n + BigInt(i)),
          })),
        },
      }),
    });
    vi.stubGlobal('fetch', fake);
    const items = await searchWeb('casamento em São José dos Campos site:instagram.com', 10);
    expect(items).toHaveLength(10);
    expect(items.slice(0, 5).every(item => Boolean(item.image))).toBe(true);
    expect(items[0]?.title).toBe('Lugar com foto 0');
    expect(items.slice(5).every(item => !item.image)).toBe(true);
  });
  it('explains daily keyless rate limiting without exposing API credentials', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(searchWeb('casamento em Paris França', 6)).rejects.toThrow('limite temporário');
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
