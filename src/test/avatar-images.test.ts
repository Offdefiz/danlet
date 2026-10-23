import { beforeEach, describe, expect, it, vi } from 'vitest';

const cache = vi.hoisted(() => ({
  signed: vi.fn(async (path: string) => ({ data: { signedUrl: 'https://private.example/' + path }, error: null })),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl: cache.signed }) } },
}));

import { cachedAvatarUrl } from '@/lib/avatar-images';

describe('Mobile avatar image performance', () => {
  beforeEach(() => cache.signed.mockClear());
  it('shares one signed image URL request across multiple avatar views', async () => {
    const [header, chat, profile] = await Promise.all([
      cachedAvatarUrl('photo-cache-test-1.jpg'),
      cachedAvatarUrl('photo-cache-test-1.jpg'),
      cachedAvatarUrl('photo-cache-test-1.jpg'),
    ]);
    expect(header).toBe(chat);
    expect(header).toBe(profile);
    expect(cache.signed).toHaveBeenCalledTimes(1);
    expect(cache.signed).toHaveBeenCalledWith('photo-cache-test-1.jpg', 3600);
  });
  it('starts a fresh request only for an updated profile image path', async () => {
    await cachedAvatarUrl('photo-cache-test-2.jpg');
    await cachedAvatarUrl('photo-cache-test-3.jpg');
    expect(cache.signed).toHaveBeenCalledTimes(2);
  });
});
