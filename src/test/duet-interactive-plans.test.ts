import { describe, expect, it } from 'vitest';
import { currentReminderSlot } from '@/lib/push-copy';
import { questions, nextQuestionDate, makeAnswerRecord, parseQuestionLink, makeQuestionLink, dueQuestion } from '@/lib/weekend-prompts';

describe('Duet interactive plans', () => {
  it('keeps Friday/Saturday/Sunday plans in the correct Brazilian local date', () => {
    const now = new Date('2026-10-22T13:00:00Z');
    expect(nextQuestionDate('friday', now)).toBe('2026-10-23');
    expect(nextQuestionDate('saturday', now)).toBe('2026-10-24');
    expect(nextQuestionDate('sunday', now)).toBe('2026-10-25');
  });
  it('generates valid deep links for the opening push', () => {
    const url = makeQuestionLink('friday', '2026-10-23');
    expect(parseQuestionLink(url.split('?')[1]!)).toEqual({ id: 'friday', date: '2026-10-23' });
    expect(parseQuestionLink('duet_question=unknown&date=2026-10-23')).toBeNull();
    expect(parseQuestionLink('duet_question=friday&date=bad')).toBeNull();
  });
  it('persists a real choice in the pre-existing shared calendar format', () => {
    const entry = makeAnswerRecord({ questionId: 'friday', date: '2026-10-23', time: '19:30', answer: 'Pizza na sexta', by: 'user-abc' });
    expect(entry.kind).toBe('setting');
    expect(entry.title).toContain('Agenda: Jantar de sexta');
    const details = JSON.parse(entry.body) as Record<string,string>;
    expect(details.date).toBe('2026-10-23');
    expect(details.notes).toBe('Pizza na sexta');
    expect(details.location).toBe('');
  });
  it('does not create a calendar plan without an answer', () => {
    expect(() => makeAnswerRecord({questionId:'friday',date:'2026-10-23',time:'19:30',answer:'  ',by:'abc'})).toThrow();
  });
  it('provides four daytime windows without night alerts', () => {
    expect(currentReminderSlot(new Date('2026-10-22T12:00:00Z'))?.id).toBe('cafe');
    expect(currentReminderSlot(new Date('2026-10-22T15:00:00Z'))?.id).toBe('almoco');
    expect(currentReminderSlot(new Date('2026-10-22T18:00:00Z'))?.id).toBe('tarde');
    expect(currentReminderSlot(new Date('2026-10-22T22:00:00Z'))?.id).toBe('noite');
    expect(currentReminderSlot(new Date('2026-10-23T02:00:00Z'))).toBeNull();
    expect(questions).toHaveLength(4);
  });
  it('schedules the Friday question in the Friday morning slot', () => {
    expect(dueQuestion(new Date('2026-10-23T13:00:00Z'))).toEqual({id:'friday',date:'2026-10-23'});
  });
});
