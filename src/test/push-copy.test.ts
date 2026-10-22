import { describe, expect, it } from 'vitest';
import { currentReminderSlot, formatPartnerPush, reminderMessage, reminderSlots } from '@/lib/push-copy';

describe('Duet notification presentation', () => {
  it('does not repeat Duet/actor in notification title and formats partner presence', () => {
    expect(formatPartnerPush('Letícia', 'online', 'ficou online no Duet ♡')).toEqual({
      title: 'Duet ♡',
      body: 'Letícia está por aqui! Que tal mandar um oi? 💗',
    });
  });
  it('keeps message content private on the lock screen', () => {
    const result = formatPartnerPush('Daniel', 'addition', 'enviou uma mensagem no chat');
    expect(result.title).toBe('Duet ♡');
    expect(result.body).toMatch(/Daniel.*mensagem/);
  });
  it('creates varied, bounded reminders with daylight-only hours', () => {
    expect(reminderSlots).toHaveLength(4);
    expect(currentReminderSlot(new Date('2026-10-20T06:00:00Z'))).toBeNull(); // 03h Brazil
    expect(currentReminderSlot(new Date('2026-10-20T13:30:00Z'))).toEqual({ id: 'cafe', date: '2026-10-20' });
    expect(currentReminderSlot(new Date('2026-10-20T16:00:00Z'))).toEqual({ id: 'almoco', date: '2026-10-20' });
    expect(currentReminderSlot(new Date('2026-10-20T22:00:00Z'))).toEqual({ id: 'noite', date: '2026-10-20' });
    expect(currentReminderSlot(new Date('2026-10-21T01:00:00Z'))).toBeNull();
    expect(reminderMessage('2026-10-20','manha').length).toBeGreaterThan(12);
    expect(reminderMessage('2026-10-20','manha')).toBe(reminderMessage('2026-10-20','manha'));
  });
});
