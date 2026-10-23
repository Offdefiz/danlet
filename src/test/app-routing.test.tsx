import { QueryClient } from '@tanstack/react-query';
import { createRouter, rootRouteId } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { routeTree } from '@/routeTree.gen';
import { parseRecoveryRedirect } from '@/routes/reset-password';

// Match routes without running loaders or rendering; browser network is not needed.
describe('App routing', () => {
  const makeRouter = () => createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it('matches the dashboard instead of falling back to not found', () => {
    expect(makeRouter().matchRoutes('/').at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it('has a real password reset destination for Supabase recovery links', () => {
    const match = makeRouter().matchRoutes('/reset-password').at(-1);
    expect(match?.routeId).toBe('/reset-password');
  });
});

describe('Supabase recovery callback formats', () => {
  it('recognizes standard implicit-flow hash tokens', () => {
    expect(parseRecoveryRedirect({
      hash: '#access_token=jwt-sample&refresh_token=refresh-sample&type=recovery',
      search: '',
    })).toEqual({ kind: 'tokens', accessToken: 'jwt-sample', refreshToken: 'refresh-sample' });
  });

  it('recognizes legacy query-string tokens', () => {
    expect(parseRecoveryRedirect({
      hash: '',
      search: '?access_token=query-jwt&refresh_token=query-refresh&type=recovery',
    })).toEqual({ kind: 'tokens', accessToken: 'query-jwt', refreshToken: 'query-refresh' });
  });

  it('accepts a token hash for verification and a PKCE code', () => {
    expect(parseRecoveryRedirect({ hash: '', search: '?token_hash=abc&type=recovery' }))
      .toEqual({ kind: 'otp', tokenHash: 'abc', type: 'recovery' });
    expect(parseRecoveryRedirect({ hash: '', search: '?code=code123' }))
      .toEqual({ kind: 'code', code: 'code123' });
  });

  it('rejects an error callback and unauthenticated URL', () => {
    expect(parseRecoveryRedirect({ hash: '#error=access_denied', search: '' }))
      .toEqual({ kind: 'error' });
    expect(parseRecoveryRedirect({ hash: '', search: '' }))
      .toEqual({ kind: 'none' });
  });
});
