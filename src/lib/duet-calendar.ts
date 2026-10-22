import type { Row } from '@/lib/duet.types';

export const AGENDA_PREFIX = 'Agenda: ';
export type CoupleEvent = { title: string; date: string; time: string; location: string; notes: string };
export function isCalendarRecord(record: Row<'records'>) {
  return record.kind === 'setting' && record.title.startsWith(AGENDA_PREFIX);
}
export function decodeCalendarRecord(record: Row<'records'>): CoupleEvent | null {
  if (!isCalendarRecord(record)) return null;
  try {
    const parsed: unknown = JSON.parse(record.body);
    if (typeof parsed !== 'object' || !parsed || Array.isArray(parsed)) return null;
    const data = parsed as Record<string, unknown>;
    const date = String(data['date'] ?? '');
    const time = String(data['time'] ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
    return { title: record.title.slice(AGENDA_PREFIX.length), date, time, location: String(data['location'] ?? ''), notes: String(data['notes'] ?? '') };
  } catch { return null; }
}
export function brazilianToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
/** Build wall-clock stamps independent from device timezone (important on iPhone).
 * Consumers use TZID=America/Sao_Paulo instead of local browser UTC offsets. */
function dates(event: CoupleEvent): { start: string; end: string } {
  const start = new Date(`${event.date}T${event.time}:00Z`);
  if (Number.isNaN(start.getTime())) throw new Error('Data do compromisso inválida.');
  const end = new Date(start.getTime() + 60 * 60_000);
  const stamp = (date: Date) => date.toISOString().slice(0, 19).replace(/[-:]/g, '');
  return { start: stamp(start), end: stamp(end) };
}
const escapeIcs = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const utcIcs = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export function calendarIcs(event: CoupleEvent, id: string) {
  const { start, end } = dates(event);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Duet//Agenda do Casal//PT-BR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${id}@duet`, `DTSTAMP:${utcIcs(new Date())}`,
    `DTSTART;TZID=America/Sao_Paulo:${start}`, `DTEND;TZID=America/Sao_Paulo:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`, `LOCATION:${escapeIcs(event.location)}`,
    `DESCRIPTION:${escapeIcs(event.notes)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de compromisso do casal', 'TRIGGER:-PT15M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
export function googleCalendarLink(event: CoupleEvent) {
  const { start, end } = dates(event);
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: event.title, details: event.notes, location: event.location,
    dates: `${start}/${end}`, ctz: 'America/Sao_Paulo',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
