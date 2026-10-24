import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  compareReleaseVersions, currentVersion, newReleaseNotesSince,
  postMigrationHighlights, releaseAcknowledgementKey, releaseNotes,
} from '@/lib/release-notes';
import { DuetUpdatesDialog } from '@/components/duet-updates';

const daniel = '11111111-1111-4111-8111-111111111111';
const leticia = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('Every Duet update announces what changed', () => {
  it('tracks semantic version order and avoids showing old notes again', () => {
    expect(compareReleaseVersions('2.7.0','2.6.0')).toBe(1);
    expect(compareReleaseVersions('2.6.0','2.7.0')).toBe(-1);
    expect(compareReleaseVersions('2.6.0','2.6.0')).toBe(0);
    expect(currentVersion).toBe('2.8.3');
    expect(newReleaseNotesSince(null)).toEqual(releaseNotes);
    expect(newReleaseNotesSince('2.6.0').map(note => note.version)).toEqual(['2.8.3','2.8.2','2.8.1','2.8.0','2.7.0']);
    expect(newReleaseNotesSince(currentVersion)).toHaveLength(0);
  });
  it('includes ALL major post-migration additions in the first walkthrough', () => {
    const sections = postMigrationHighlights.map(group => group.title);
    expect(sections).toEqual([
      'Juntos e planos compartilhados',
      'Notificações e lembretes',
      'Chat e presença',
      'Temas e personalização',
      'Perfil, fotos e navegação',
      'Novidades do próprio Duet',
    ]);
    const words = postMigrationHighlights.flatMap(group => group.items).join(' ');
    for (const important of ['22 ideias','Agenda','Reenviar notificação','20 minutos','online',
      'prévia','Barbie Glitter','Metallic Purple','Black Diamond','Champagne Gold',
      'Aqua Mercury','Opal Holographic','Midnight Stardust','16 opções',
      'foto','teclado','flutuante']) expect(words).toContain(important);
  });
  it('automatically opens the complete migration tour on first sign-in', async () => {
    render(<DuetUpdatesDialog userId={daniel}/>);
    const popup = await screen.findByRole('dialog', undefined, { timeout: 4000 });
    expect(popup.textContent).toContain('Tudo que chegou ao Duet');
    expect(popup.textContent).toContain('Juntos e planos compartilhados');
    expect(popup.textContent).toContain('Midnight Stardust');
    expect(window.localStorage.getItem(releaseAcknowledgementKey(daniel))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Entendi, que venha mais/ }));
    await waitFor(() => expect(window.localStorage.getItem(releaseAcknowledgementKey(daniel))).toBe(currentVersion));
    expect(window.localStorage.getItem(releaseAcknowledgementKey(leticia))).toBeNull();
  });
  it('shows ONLY the subsequent release after a previous version was acknowledged', async () => {
    window.localStorage.setItem(releaseAcknowledgementKey(daniel), '2.6.0');
    render(<DuetUpdatesDialog userId={daniel}/>);
    const popup = await screen.findByRole('dialog', undefined, { timeout: 4000 });
    expect(popup.textContent).toContain('Tem novidade no Duet');
    expect(popup.textContent).toContain('uma vez por lançamento');
    expect(popup.textContent).not.toContain('22 ideias');
    fireEvent.click(screen.getByRole('button', { name: /Entendi, que venha mais/ }));
    expect(window.localStorage.getItem(releaseAcknowledgementKey(daniel))).toBe(currentVersion);
  });
  it('does not auto-open an already-seen version but can show history manually', async () => {
    window.localStorage.setItem(releaseAcknowledgementKey(daniel), currentVersion);
    render(<DuetUpdatesDialog userId={daniel}/>);
    expect(screen.queryByRole('dialog')).toBeNull();
    window.dispatchEvent(new Event('duet:open-updates'));
    const popup = await screen.findByRole('dialog');
    expect(popup.textContent).toContain('Diário de atualizações');
    expect(popup.textContent).toContain('v2.6.0');
  });
  it('opening a Juntos decision never gets interrupted by a release modal', async () => {
    window.history.replaceState(null, '', '/?duet_view=together&duet_proposal=aaaa1111');
    render(<DuetUpdatesDialog userId={daniel}/>);
    await new Promise(resolve => setTimeout(resolve, 1850));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
