import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Duet PWA install assets', () => {
  const publicRoot = join(process.cwd(), 'public');
  const manifest = JSON.parse(readFileSync(join(publicRoot, 'manifest.webmanifest'), 'utf8')) as {
    name: string;
    short_name: string;
    display: string;
    icons: { src: string; sizes: string; type: string }[];
  };

  it('installs as Duet with a real home-screen icon, not the default D', () => {
    expect(manifest.name).toBe('Duet');
    expect(manifest.short_name).toBe('Duet');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map(icon => icon.sizes)).toEqual(['192x192', '512x512']);
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
      const file = join(publicRoot, icon.src.replace(/^\//, ''));
      expect(existsSync(file)).toBe(true);
      const buffer = readFileSync(file);
      expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    }
    expect(existsSync(join(publicRoot, 'icons/duet-180.png'))).toBe(true);
    expect(existsSync(join(publicRoot, 'icons/duet-badge.png'))).toBe(true);
    expect(existsSync(join(publicRoot, 'icons/duet-icon.svg'))).toBe(true);
  });
});
