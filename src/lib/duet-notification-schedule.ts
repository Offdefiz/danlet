import { nextQuestionDate, questions, type QuestionId } from '@/lib/weekend-prompts';

type Window = 'cafe' | 'almoco' | 'tarde' | 'fim-dia' | 'noite';

/** The prompt rotates by day so planning starts before Friday and continues
 * into the weekend; personal answers suppress duplicate prompts to a person. */
export function proposedCoupleQuestion(day: string, window: Window): { id: QuestionId; date: string; title: string } | null {
  const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
  const id: QuestionId | null = weekday === 3 && window === 'noite' ? 'saturday'
    : weekday === 4 && window === 'cafe' ? 'friday'
    : weekday === 5 && window === 'cafe' ? 'friday'
    : weekday === 6 && window === 'cafe' ? 'saturday'
    : weekday === 0 && window === 'cafe' ? 'sunday'
    : weekday === 0 && window === 'noite' ? 'remember'
    : null;
  if (!id) return null;
  const title = questions.find(item => item.id === id)!.title;
  // At local noon this date calculation remains stable in Sao Paulo.
  const current = new Date(day + 'T15:00:00Z');
  return { id, date: nextQuestionDate(id, current), title };
}

export function alreadyAnsweredQuestion(
  records: Array<{ body: string; updated_by?: string | null }>,
  userId: string,
  id: QuestionId,
  date: string,
): boolean {
  return records.some(record => {
    try {
      const body: unknown = JSON.parse(record.body);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
      const r = body as Record<string, unknown>;
      return r['origin'] === 'duet-question' && r['questionId'] === id
        && r['date'] === date && (r['by'] === userId || record.updated_by === userId);
    } catch { return false; }
  });
}

/** A daytime check-in is lighter than a plan: it does not create agenda items. */
export function isWaterCheckin(day: string, window: Window): boolean {
  const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
  return window === 'almoco' && [1, 3, 5].includes(weekday);
}
