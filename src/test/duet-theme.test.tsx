import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemePicker, readPersonalTheme, themes, themeGroups } from '@/components/duet-theme';

const { successToast, errorToast } = vi.hoisted(() => ({
  successToast: vi.fn(),
  errorToast: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: { success: successToast, error: errorToast },
}));

const daniel = '11111111-1111-4111-8111-111111111111';
const leticia = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  window.localStorage.clear();
  successToast.mockReset();
  errorToast.mockReset();
});

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset['theme'];
});

describe('Personal themes stored on each device', () => {
  it('preserves the original palettes and adds glitter and purple chrome', () => {
    expect(themes).toHaveLength(13);
    expect(themes.find(t => t.id === 'pink-glitter')?.label).toMatch(/Glitter/);
    expect(themes.find(t => t.id === 'metallic-purple')?.label).toBe('Metallic Purple');
  });

  it('shows Premium first, including two new freely available luxury themes', () => {
    expect(themeGroups.map(g => g.label)).toEqual(['Premium', 'Elegantes', 'Simples']);
    expect(themeGroups[0]?.themeIds).toEqual([
      'pink-glitter', 'metallic-purple', 'black-diamond', 'champagne-gold',
    ]);
    const allIds = themeGroups.flatMap(group => group.themeIds);
    expect(new Set(allIds).size).toBe(13);
    expect(themes.map(theme => theme.id).sort()).toEqual([...allIds].sort());
    render(<ThemePicker userId={daniel}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Escolher cores do app' }));
    expect(screen.getByRole('button', { name: /Black Diamond/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Champagne Gold/i })).toBeTruthy();
  });

  it('saves a palette in localStorage and restores it when reopened', async () => {
    render(<ThemePicker userId={daniel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escolher cores do app' }));
    fireEvent.click(screen.getByRole('button', { name: /Escuro Elegante/i }));

    // Selection is staged: colors must change only after confirmation.
    expect(document.documentElement.dataset['theme']).toBe('romance');
    expect(window.localStorage.getItem(`duet:personal-theme:${daniel}`)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar tema' }));
    // Confirming immediately updates the active page, without a reload.
    await waitFor(() => expect(document.documentElement.dataset['theme']).toBe('dark-elegant'));
    expect(window.localStorage.getItem(`duet:personal-theme:${daniel}`)).toBe('dark-elegant');
    expect(successToast).toHaveBeenCalledWith('Tema salvo neste aparelho.');
    expect(errorToast).not.toHaveBeenCalled();

    cleanup();
    render(<ThemePicker userId={daniel} />);
    await waitFor(() => expect(document.documentElement.dataset['theme']).toBe('dark-elegant'));
  });

  it('applies Metallic Purple individually without changing the partner palette', async () => {
    window.localStorage.setItem(`duet:personal-theme:${leticia}`, 'pink-glitter');
    render(<ThemePicker userId={daniel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Escolher cores do app' }));
    const metallic = screen.getByRole('button', { name: /Metallic Purple/i });
    fireEvent.click(metallic);
    expect(document.documentElement.dataset['theme']).toBe('romance');
    expect(metallic.querySelector('.duet-liquid-purple-preview')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar tema' }));
    await waitFor(() => expect(document.documentElement.dataset['theme']).toBe('metallic-purple'));
    expect(window.localStorage.getItem(`duet:personal-theme:${daniel}`)).toBe('metallic-purple');
    expect(window.localStorage.getItem(`duet:personal-theme:${leticia}`)).toBe('pink-glitter');
  });

  it('discards an unconfirmed palette when the picker is closed', async () => {
    render(<ThemePicker userId={daniel} />);
    await waitFor(() => expect(document.documentElement.dataset['theme']).toBe('romance'));
    fireEvent.click(screen.getByRole('button', { name: 'Escolher cores do app' }));
    fireEvent.click(screen.getByRole('button', { name: /Natureza e tons terrosos/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(document.documentElement.dataset['theme']).toBe('romance');
    expect(window.localStorage.getItem(`duet:personal-theme:${daniel}`)).toBeNull();
  });

  it('keeps each account separate on a shared browser', () => {
    window.localStorage.setItem(`duet:personal-theme:${daniel}`, 'earthy');
    window.localStorage.setItem(`duet:personal-theme:${leticia}`, 'pastel-romantic');
    expect(readPersonalTheme(daniel)).toBe('earthy');
    expect(readPersonalTheme(leticia)).toBe('pastel-romantic');
  });

  it('ignores unknown or obsolete palette IDs', () => {
    window.localStorage.setItem(`duet:personal-theme:${daniel}`, 'unrecognized');
    expect(readPersonalTheme(daniel)).toBe('romance');
  });
});
