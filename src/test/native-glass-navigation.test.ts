import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { pressBottomTab, primaryTabs } from '@/components/duet-bottom-navigation';
import { themeGroups, themes } from '@/components/duet-theme';

describe('native-like floating tab bar', () => {
  it('returns to the top when the currently selected tab is tapped again', () => {
    const setTab = vi.fn();
    const scroll = vi.fn();
    const schedule = vi.fn();
    expect(pressBottomTab('home','home',setTab,scroll,schedule,false)).toBe('scroll-top');
    expect(scroll).toHaveBeenCalledExactlyOnceWith('smooth');
    expect(setTab).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });
  it('respects reduced motion when re-tapping the same page', () => {
    const scroll = vi.fn();
    expect(pressBottomTab('together','together',vi.fn(),scroll,vi.fn(),true)).toBe('scroll-top');
    expect(scroll).toHaveBeenCalledWith('instant');
  });
  it('switches tabs and schedules an immediate reset to top without sliding the old page', () => {
    const setTab = vi.fn();
    const scroll = vi.fn();
    let pending: (() => void) | null = null;
    const schedule = vi.fn((fn: () => void) => { pending = fn; });
    expect(pressBottomTab('calendar','home',setTab,scroll,schedule)).toBe('navigate');
    expect(setTab).toHaveBeenCalledExactlyOnceWith('calendar');
    expect(scroll).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledOnce();
    if (pending) (pending as () => void)();
    expect(scroll).toHaveBeenCalledExactlyOnceWith('instant');
  });
  it('keeps accessible nav ordering and room for five finger-sized targets', () => {
    expect(primaryTabs.map(item => item.label)).toEqual(['Início','Dream','Juntos','Agenda']);
    const css = readFileSync('src/styles.css','utf8');
    expect(css).toContain('.duet-nav-shell');
    expect(css).toContain('backdrop-filter: blur(28px) saturate(180%)');
    expect(css).toContain('.duet-nav-selection');
    expect(css).toContain('min-height: 60px');
    expect(css).toContain('prefers-reduced-transparency');
    const organizer = readFileSync('src/components/duet-organizer.tsx','utf8');
    expect(organizer).toContain('<DuetBottomNavigation active={tab}');
    expect(organizer).toContain('pb-[calc(118px+env(safe-area-inset-bottom,0px))]');
  });
});

describe('chat opened without iOS keyboard', () => {
  it('prevents Radix auto-focus on its input and focuses only non-editable messages', () => {
    const source = readFileSync('src/components/duet-extras.tsx','utf8');
    expect(source).toContain('onOpenAutoFocus={event => {');
    expect(source).toContain('event.preventDefault();');
    expect(source).toContain('messagesRef.current?.focus({ preventScroll: true })');
    expect(source).toContain('ref={messagesRef} tabIndex={-1} role="log"');
    expect(source).not.toMatch(/autoFocus\s*=\s*\{?true/);
  });
});

describe('animated premium designs', () => {
  it('keeps seven premium themes at the top of 16 palettes, all unique', () => {
    expect(themeGroups[0]?.label).toBe('Premium');
    expect(themeGroups[0]?.themeIds).toHaveLength(7);
    expect(themes).toHaveLength(16);
    expect(new Set(themes.map(t => t.id)).size).toBe(16);
    const names = ['aqua-mercury','opal-holographic','midnight-stardust'];
    for (const theme of names) expect(themeGroups[0]?.themeIds).toContain(theme);
  });
  it('animates liquid metal, spectral opal and starlight with reduced-motion fallback', () => {
    const css = readFileSync('src/styles.css','utf8');
    for (const fragment of [
      'duet-aqua-current','duet-aqua-metal-shift',
      'duet-opal-spectrum-drift','duet-star-shimmer',
      'duet-aqua-mercury-preview','duet-opal-holographic-preview',
      'duet-midnight-stardust-preview','prefers-reduced-motion: reduce'
    ]) expect(css).toContain(fragment);
  });
});
