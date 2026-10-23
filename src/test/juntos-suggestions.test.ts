import { describe, expect, it } from 'vitest';
import { dailyProposalSuggestion, juntosIdeas, makeProposalLink, parseProposalLink, proactiveProposalHours } from '@/lib/juntos-suggestions';
import { currentReminderSlot } from '@/lib/push-copy';

describe('Juntos: shared proposals, daily options and notification limits', () => {
  it('offers several genuine day-to-day categories, including guacamole', () => {
    expect(juntosIdeas.length).toBeGreaterThanOrEqual(20);
    expect(juntosIdeas.some(idea => idea.title === 'Guacamole hoje?')).toBe(true);
    expect(new Set(juntosIdeas.map(idea => idea.category)).size).toBeGreaterThanOrEqual(5);
  });
  it('keeps six interactive proposals and twenty-minute reminders around the clock', () => {
    expect(proactiveProposalHours).toHaveLength(6);
    const picks = proactiveProposalHours.map(hour => dailyProposalSuggestion('2026-10-23', hour));
    expect(new Set(picks.map(p => p?.dedupeKey)).size).toBe(6);
    expect(new Set(picks.map(p => p?.title)).size).toBe(6);
    expect(picks.every(p => p?.date === '2026-10-23')).toBe(true);
    expect(picks.every(p => p && Number(p.time.slice(0,2)) >= 9 && Number(p.time.slice(0,2)) <= 21)).toBe(true);
    expect(dailyProposalSuggestion('2026-10-23', 21)).toBeNull();
    expect(currentReminderSlot(new Date('2026-10-24T01:00:00Z'))?.id).toBe('t22-00');
  });
  it('builds private in-app deep links only for valid UUIDs', () => {
    const id = '15ad632e-46e4-46e6-a1f0-886be02a6f31';
    expect(parseProposalLink(makeProposalLink(id).split('?')[1]!)).toBe(id);
    expect(parseProposalLink('duet_proposal=../../admin')).toBeNull();
  });
});
