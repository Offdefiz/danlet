import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { brazilianToday, calendarIcs, googleCalendarLink } from '@/lib/duet-calendar';
import { DuetHighlights } from '@/components/duet-highlights';
import type { Row } from '@/lib/duet.types';

describe('Barbie glitter and accessibility', () => {
  it('keeps visibly animated sparkle but does not block clicks or reduced-motion users', () => {
    const styles = readFileSync('src/styles.css', 'utf8');
    expect(styles).toContain('[data-theme="pink-glitter"] body::after');
    expect(styles).toContain('duet-barbie-twinkle');
    expect(styles).toContain('pointer-events: none');
    expect(styles).toMatch(/prefers-reduced-motion:[ ]*reduce/);
    expect(styles).toContain('.duet-glitter-preview');
  });
});

describe('Couple today and export time', () => {
  it('uses Brazilian local date across the UTC calendar boundary', () => {
    expect(brazilianToday(new Date('2026-10-22T01:30:00.000Z'))).toBe('2026-10-21');
    expect(brazilianToday(new Date('2026-10-22T13:30:00.000Z'))).toBe('2026-10-22');
  });
  it('exports matching local times to Apple and Google Calendar regardless of browser timezone', () => {
    const e = { title: 'Dentista', date: '2026-11-12', time: '14:00', location: 'BH', notes: '' };
    const ics = calendarIcs(e, 'meeting1');
    expect(ics).toContain('DTSTART;TZID=America/Sao_Paulo:20261112T140000');
    expect(ics).toContain('DTEND;TZID=America/Sao_Paulo:20261112T150000');
    const url = new URL(googleCalendarLink(e));
    expect(url.searchParams.get('dates')).toBe('20261112T140000/20261112T150000');
    expect(url.searchParams.get('ctz')).toBe('America/Sao_Paulo');
  });
});

describe('Actionable couple overview', () => {
  it('uses real empty counts, upcoming appointments and opens the right tabs', () => {
    const open = vi.fn();
    const entry = {
      id: 'test-event', kind: 'setting', title: 'Agenda: Nossa consulta',
      body: JSON.stringify({ date: '2099-01-04', time: '10:00', location: 'BH', notes: '' }),
    } as Row<'records'>;
    const task = { id: 'test-task', kind: 'task', title: 'Preparar documentos', done: false } as Row<'records'>;
    render(<DuetHighlights records={[entry, task]} references={[]} votes={[]} userId="abc" onNavigate={open}/>);
    expect(screen.getByRole('button', { name: /1 tarefas pendentes/i })).toBeTruthy();
    expect(screen.getByText('Nossa consulta')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /1 tarefas pendentes/i }));
    expect(open).toHaveBeenCalledWith('list');
    fireEvent.click(screen.getByRole('button', { name: /próximos compromissos/i }));
    expect(open).toHaveBeenCalledWith('calendar');
    cleanup();
  });
});
