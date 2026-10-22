import { brazilianToday, AGENDA_PREFIX } from '@/lib/duet-calendar';
import type { Row } from '@/lib/duet.types';
export const questions = [
  { id: 'friday', day: 5, title: 'O que você quer jantar na sexta?', label: 'Jantar de sexta', time: '19:30', example: 'Pizza, sushi ou cozinhar em casa?' },
  { id: 'saturday', day: 6, title: 'O que vamos fazer sábado?', label: 'Passeio de sábado', time: '15:00', example: 'Cinema, café ou passeio ao ar livre?' },
  { id: 'sunday', day: 0, title: 'O que vamos fazer domingo?', label: 'Domingo juntos', time: '12:00', example: 'Almoço, filme ou descansar?' },
  { id: 'remember', day: 0, title: 'O que não podemos esquecer?', label: 'Lembrete', time: '18:00', example: 'Uma compra, tarefa ou compromisso…' },
] as const;
export type QuestionId = (typeof questions)[number]['id'];
export function isQuestionId(value: string): value is QuestionId { return questions.some(q => q.id === value); }
export function nextQuestionDate(id: QuestionId, now = new Date()) {
  const base = new Date(brazilianToday(now) + 'T12:00:00Z');
  const target = questions.find(q => q.id === id)!.day;
  base.setUTCDate(base.getUTCDate() + (target - base.getUTCDay() + 7) % 7);
  return base.toISOString().slice(0, 10);
}
export function parseQuestionLink(search: string) {
  const u = new URLSearchParams(search), id = u.get('duet_question') || '', date = u.get('date') || '';
  return isQuestionId(id) && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date + 'T12:00:00Z')) ? { id, date } : null;
}
export function makeQuestionLink(id: QuestionId, date: string) {
  return '/?' + new URLSearchParams({ duet_question: id, date }).toString();
}
export type QuestionAnswer = { questionId: QuestionId; date: string; time: string; answer: string; by: string };
export function readQuestionAnswer(record: Row<'records'>): QuestionAnswer | null {
  if (record.kind !== 'setting' || !record.title.startsWith(AGENDA_PREFIX)) return null;
  try {
    const data = JSON.parse(record.body) as Record<string, unknown>;
    const questionId = String(data['questionId'] || '');
    if (data['origin'] !== 'duet-question' || !isQuestionId(questionId)) return null;
    return { questionId, date: String(data['date'] || ''), time: String(data['time'] || ''), answer: String(data['answer'] || ''), by: String(data['by'] || '') };
  } catch { return null; }
}
export function makeAnswerRecord(input: QuestionAnswer) {
  const title = questions.find(q => q.id === input.questionId)!.label;
  const answer = input.answer.trim().slice(0, 150);
  if (!answer || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) throw new Error('Preencha sua ideia, data e horário.');
  return {
    kind: 'setting' as const,
    title: AGENDA_PREFIX + title + ': ' + answer.slice(0, 65),
    body: JSON.stringify({ origin: 'duet-question', questionId: input.questionId,
      date: input.date, time: input.time, answer, by: input.by, notes: answer, location: '' }),
    period: 'Curto Prazo', updated_by: input.by,
  };
}
export function dueQuestion(now: Date): { id: QuestionId; date: string } | null {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const hour = Number(parts.find(p => p.type === 'hour')?.value);
  const weekday = new Date(brazilianToday(now) + 'T12:00:00Z').getUTCDay();
  const id: QuestionId | null = weekday === 5 && hour >= 9 && hour < 12 ? 'friday' :
    weekday === 6 && hour >= 9 && hour < 12 ? 'saturday' :
    weekday === 0 && hour >= 9 && hour < 12 ? 'remember' : null;
  return id ? { id, date: nextQuestionDate(id, now) } : null;
}
