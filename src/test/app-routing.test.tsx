import { QueryClient } from '@tanstack/react-query';
import { createRouter, rootRouteId } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { routeTree } from '@/routeTree.gen';

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
