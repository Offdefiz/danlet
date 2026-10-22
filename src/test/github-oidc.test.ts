import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyDuetSchedulerIdentity } from '@/lib/github-oidc.server';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = keys.publicKey.export({ format: 'jwk' });
const now = Math.floor(Date.now() / 1000);
const valid = {
  iss: 'https://token.actions.githubusercontent.com',
  aud: 'duet-render-cron',
  sub: 'repo:Offdefiz/danlet:ref:refs/heads/main',
  repository: 'Offdefiz/danlet',
  ref: 'refs/heads/main',
  workflow_ref: 'Offdefiz/danlet/.github/workflows/duet-reminders.yml@refs/heads/main',
  event_name: 'schedule',
  iat: now - 5,
  exp: now + 240,
};
function makeToken(overrides: Record<string, unknown> = {}, algorithm = 'RS256') {
  const header = Buffer.from(JSON.stringify({ kid: 'test-kid', typ: 'JWT', alg: algorithm })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...valid, ...overrides })).toString('base64url');
  const text = header + '.' + body;
  return text + '.' + sign('RSA-SHA256', Buffer.from(text), keys.privateKey).toString('base64url');
}
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ keys: [{ ...jwk, kid: 'test-kid', alg: 'RS256', use: 'sig' }] }),
  }));
  vi.stubEnv('DUET_CRON_SECRET', undefined);
  vi.stubEnv('LOVABLE_CRON_SECRET', undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Signed GitHub Actions identity', () => {
  it('authenticates the trusted scheduler without a long-lived secret', async () => {
    const token = makeToken();
    expect(await verifyDuetSchedulerIdentity(token)).toBe(true);
    const request = new Request('https://danlet.onrender.com/api/public/jobs/inspire', {
      method: 'POST', headers: { authorization: 'Bearer ' + token },
    });
    expect(await authenticateCronRequest(request)).toBeNull();
  });
  it.each([
    { repository: 'somebody/other-repo' },
    { aud: 'other-service' },
    { ref: 'refs/heads/untrusted' },
    { event_name: 'pull_request' },
    { workflow_ref: 'Offdefiz/danlet/.github/workflows/other.yml@refs/heads/main' },
    { exp: now - 20 },
    { iat: now + 500 },
  ])('rejects an identity with invalid claims %#', async change => {
    expect(await verifyDuetSchedulerIdentity(makeToken(change))).toBe(false);
  });
  it('accepts main-branch updates for diagnostics', async () => { expect(await verifyDuetSchedulerIdentity(makeToken({ event_name: 'push' }))).toBe(true); });
  it('rejects altered signatures and non-RS256 headers', async () => {
    const token = makeToken();
    const bits = token.split('.');
    const replacement = Buffer.alloc(256, 1).toString('base64url');
    expect(await verifyDuetSchedulerIdentity(bits[0] + '.' + bits[1] + '.' + replacement)).toBe(false);
    expect(await verifyDuetSchedulerIdentity(makeToken({}, 'none'))).toBe(false);
  });
  it('denies missing and malformed credentials without a secret', async () => {
    const response = await authenticateCronRequest(new Request('https://danlet.onrender.com/api/public/jobs/inspire', { method: 'POST' }));
    expect(response?.status).toBe(401);
    expect(await verifyDuetSchedulerIdentity('not.a.jwt')).toBe(false);
  });
});
