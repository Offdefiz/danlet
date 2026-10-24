import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { currentVersion, releaseNotes } from '@/lib/release-notes';
import { themeGroups, themes } from '@/components/duet-theme';

describe('Duet permanent update history', () => {
  it('tracks versions newest first with date and useful content', () => {
    expect(currentVersion).toBe(releaseNotes[0]?.version);
    expect(releaseNotes.length).toBeGreaterThanOrEqual(4);
    const dates = releaseNotes.map(n => n.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(new Set(releaseNotes.map(n => n.version)).size).toBe(releaseNotes.length);
    expect(releaseNotes.every(n => n.highlights.length >= 2)).toBe(true);
  });
  it('includes Barbie, Metallic Purple, Black Diamond and Champagne Gold', () => {
    const body = releaseNotes.flatMap(n => n.highlights).join(' ');
    for (const label of ['Barbie', 'Metallic Purple', 'Black Diamond', 'Champagne Gold', 'Aqua Mercury', 'Opal Holographic', 'Midnight Stardust']) {
      expect(body).toContain(label);
    }
    expect(themeGroups[0]?.label).toBe('Premium');
    expect(themeGroups[0]?.themeIds).toHaveLength(7);
    expect(themes).toHaveLength(16);
  });
  it('uses minimum mobile touch sizes and accommodates reduced motion', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toContain('and (pointer: coarse)');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('font-size: 16px');
    expect(css).toContain('prefers-reduced-motion');
  });
  it('stores event references instead of private message text in SQL queue', () => {
    const sql = readFileSync('drizzle/migrations/0010_partner_message_previews_and_votes.sql', 'utf8');
    expect(sql).toContain("'message:' || NEW.id::text");
    expect(sql).toContain("'proposal_vote','accepted:'");
    expect(sql).toContain("'proposal_vote','agreed:'");
  });
});
