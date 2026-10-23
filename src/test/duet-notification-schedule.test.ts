import { describe, expect, it } from 'vitest';
import { reminderMessage, sweetReminders, currentReminderSlot, reminderSlots } from '@/lib/push-copy';
import { alreadyAnsweredQuestion, isWaterCheckin, proposedCoupleQuestion } from '@/lib/duet-notification-schedule';

describe('Cute Duet notifications and gentle scheduling', () => {
  it('provides a large library of harmless playful messages without an LLM', () => {
    expect(sweetReminders.length).toBeGreaterThanOrEqual(30);
    expect(new Set(sweetReminders).size).toBe(sweetReminders.length);
    expect(reminderSlots).toHaveLength(72);
  });
  it('rotates distinct notes in each daily window, separately for the partners', () => {
    const a = reminderSlots.map(s => reminderMessage('2026-10-22', s.id, 'daniel-user'));
    const b = reminderSlots.map(s => reminderMessage('2026-10-22', s.id, 'leticia-user'));
    expect(new Set(a).size).toBe(72);
    expect(a.every(m => m.length > 20)).toBe(true);
    expect(b.every(m => m.length > 20)).toBe(true);
    expect(a.some((m,i) => m !== b[i])).toBe(true);
  });
  it('keeps sending every twenty minutes even in the evening and overnight', () => {
    expect(currentReminderSlot(new Date('2026-10-22T23:30:00Z'))?.id).toBe('t20-20');
    expect(currentReminderSlot(new Date('2026-10-23T00:30:00Z'))?.id).toBe('t21-20');
    expect(currentReminderSlot(new Date('2026-10-23T09:00:00Z'))?.id).toBe('t06-00');
  });
  it('starts weekend planning midweek, but offers surprises between plans', () => {
    expect(proposedCoupleQuestion('2026-10-21','noite')?.id).toBe('saturday');
    expect(proposedCoupleQuestion('2026-10-22','cafe')?.id).toBe('friday');
    expect(proposedCoupleQuestion('2026-10-23','cafe')?.id).toBe('friday');
    expect(proposedCoupleQuestion('2026-10-24','cafe')?.id).toBe('saturday');
    expect(proposedCoupleQuestion('2026-10-25','cafe')?.id).toBe('sunday');
    expect(proposedCoupleQuestion('2026-10-25','noite')?.id).toBe('remember');
    expect(proposedCoupleQuestion('2026-10-22','tarde')).toBeNull();
  });
  it('suppresses a question only when that person answered the matching date', () => {
    const body = JSON.stringify({ origin: 'duet-question', questionId: 'friday', date: '2026-10-23', by: 'daniel-id', answer: 'Pizza' });
    const r = [{ body, updated_by: 'daniel-id' }];
    expect(alreadyAnsweredQuestion(r,'daniel-id','friday','2026-10-23')).toBe(true);
    expect(alreadyAnsweredQuestion(r,'leticia-id','friday','2026-10-23')).toBe(false);
    expect(alreadyAnsweredQuestion(r,'daniel-id','friday','2026-10-30')).toBe(false);
    expect(alreadyAnsweredQuestion([{body:'invalid JSON'}],'daniel-id','friday','2026-10-23')).toBe(false);
  });
  it('offers quick water check-ins some days without calendar entries', () => {
    expect(isWaterCheckin('2026-10-23','almoco')).toBe(true);
    expect(isWaterCheckin('2026-10-24','almoco')).toBe(false);
    expect(isWaterCheckin('2026-10-23','noite')).toBe(false);
  });
});
