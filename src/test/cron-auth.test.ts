import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

const secretNames = [
  'DUET_CRON_SECRET',
  'DUET_CRON_SECRET_PREVIOUS',
  'LOVABLE_CRON_SECRET',
  'LOVABLE_CRON_SECRET_PREVIOUS',
] as const;

function request(authorization?: string) {
  return new Request('https://duet.example/api/public/jobs/partner-notifications', {
    headers: authorization ? { authorization } : {},
    method: 'POST',
  });
}

describe('cron request authentication', () => {
  beforeEach(() => {
    for (const name of secretNames) vi.stubEnv(name, undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it('accepts the canonical Duet secret without a legacy secret', async () => {
    vi.stubEnv('DUET_CRON_SECRET', 'test-duet-current');

    expect(await authenticateCronRequest(request('Bearer test-duet-current'))).toBeNull();
  });

  it('accepts the canonical previous secret during rotation', async () => {
    vi.stubEnv('DUET_CRON_SECRET', 'test-duet-current');
    vi.stubEnv('DUET_CRON_SECRET_PREVIOUS', 'test-duet-previous');

    expect(await authenticateCronRequest(request('Bearer test-duet-previous'))).toBeNull();
  });

  it('does not keep legacy secrets authorized once the canonical secret is set', async () => {
    vi.stubEnv('DUET_CRON_SECRET', 'test-duet-current');
    vi.stubEnv('LOVABLE_CRON_SECRET', 'test-legacy-current');
    vi.stubEnv('LOVABLE_CRON_SECRET_PREVIOUS', 'test-legacy-previous');

    expect(await authenticateCronRequest(request('Bearer test-duet-current'))).toBeNull();
    for (const secret of ['test-legacy-current', 'test-legacy-previous']) {
      const response = await authenticateCronRequest(request(`Bearer ${secret}`));
      expect(response?.status).toBe(401);
    }
  });

  it('keeps the legacy current and previous secrets working before migration', async () => {
    vi.stubEnv('LOVABLE_CRON_SECRET', 'test-legacy-current');
    vi.stubEnv('LOVABLE_CRON_SECRET_PREVIOUS', 'test-legacy-previous');
    vi.stubEnv('DUET_CRON_SECRET_PREVIOUS', 'test-unused-duet-previous');

    expect(await authenticateCronRequest(request('Bearer test-legacy-current'))).toBeNull();
    expect(await authenticateCronRequest(request('Bearer test-legacy-previous'))).toBeNull();
    expect((await authenticateCronRequest(request('Bearer test-unused-duet-previous')))?.status).toBe(401);
  });

  it('treats an empty canonical secret as unconfigured and keeps the legacy fallback', async () => {
    vi.stubEnv('DUET_CRON_SECRET', '');
    vi.stubEnv('LOVABLE_CRON_SECRET', 'test-legacy-current');

    expect(await authenticateCronRequest(request('Bearer test-legacy-current'))).toBeNull();
  });

  it('fails closed when only a previous secret is configured', async () => {
    vi.stubEnv('DUET_CRON_SECRET_PREVIOUS', 'test-duet-previous');

    const response = await authenticateCronRequest(request('Bearer test-duet-previous'));
    expect(response?.status).toBe(401);
    expect(await response?.text()).toBe('Unauthorized');
  });

  it.each([
    undefined,
    'Basic test-duet-current',
    'Bearer wrong',
    'Bearer test-duet-current,other',
    'Bearer test-duet-current other',
  ])('rejects invalid authorization without exposing secrets: %s', async authorization => {
    vi.stubEnv('DUET_CRON_SECRET', 'test-duet-current');

    const response = await authenticateCronRequest(request(authorization));
    expect(response?.status).toBe(401);
    expect(await response?.text()).toBe('Unauthorized');
  });
});
