import { describe, expect, it } from 'vitest';
import { AGENDA_PREFIX, calendarIcs, decodeCalendarRecord, googleCalendarLink } from '@/lib/duet-calendar';
import type { Row } from '@/lib/duet.types';
const e = { title: 'Dentista', date: '2026-11-12', time: '14:00', location: 'Belo Horizonte', notes: 'Lembrar documento' };
describe('Couple calendar exports', () => {
 it('uses stored shared records without a new database migration', () => {
   const row = { kind:'setting', title: AGENDA_PREFIX + e.title, body: JSON.stringify(e) } as Row<'records'>;
   expect(decodeCalendarRecord(row)).toEqual(e);
 });
 it('builds valid iCalendar file with event reminder', () => {
   const ics = calendarIcs(e, 'abc');
   expect(ics).toContain('BEGIN:VCALENDAR');
   expect(ics).toContain('SUMMARY:Dentista');
   expect(ics).toContain('TRIGGER:-PT15M');
   expect(ics).toContain('END:VCALENDAR');
 });
 it('opens a pre-filled Google Calendar event', () => {
   const url = new URL(googleCalendarLink(e));
   expect(url.hostname).toBe('calendar.google.com');
   expect(url.searchParams.get('text')).toBe('Dentista');
   expect(url.searchParams.get('ctz')).toBe('America/Sao_Paulo');
 });
});
