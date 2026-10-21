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
function dates(event: CoupleEvent) {
  const start = new Date(`${event.date}T${event.time}:00`);
  return { start, end: new Date(start.getTime() + 60 * 60_000) };
}
const escapeIcs = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const utcIcs = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export function calendarIcs(event: CoupleEvent, id: string) {
  const { start, end } = dates(event);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Duet//Agenda do Casal//PT-BR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${id}@duet`, `DTSTAMP:${utcIcs(new Date())}`,
    `DTSTART:${utcIcs(start)}`, `DTEND:${utcIcs(end)}`,
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
    dates: `${utcIcs(start)}/${utcIcs(end)}`, ctz: 'America/Sao_Paulo',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
