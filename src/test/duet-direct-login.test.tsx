import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  login: vi.fn(), reset: vi.fn(), signOut: vi.fn(), member: vi.fn(), from: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { signInWithPassword: db.login, resetPasswordForEmail: db.reset, signOut: db.signOut },
    from: db.from,
  },
}));
import { DuetLogin, loginEmailKey } from '@/components/duet-login';

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  db.login.mockResolvedValue({ data: { user: { id: 'daniel-uid' } }, error: null });
  db.reset.mockResolvedValue({ error: null });
  db.signOut.mockResolvedValue({ error: null });
  db.member.mockResolvedValue({ data: { person: 'Daniel' }, error: null });
  db.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: db.member }) }) }));
});
afterEach(() => cleanup());

describe('Direct Supabase sign-in without service-role key', () => {
  it('signs in with email and password and validates selected couple membership', async () => {
    render(<DuetLogin/>);
    fireEvent.change(screen.getByLabelText('E-mail de Daniel'), { target: { value: 'DANIEL@EXAMPLE.COM' } });
    fireEvent.change(screen.getByLabelText('Senha de Daniel'), { target: { value: 'test-pass-123' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar no nosso espaço/i }));
    await waitFor(() => expect(db.member).toHaveBeenCalledOnce());
    expect(db.login).toHaveBeenCalledWith({ email: 'daniel@example.com', password: 'test-pass-123' });
    await waitFor(() => expect(window.localStorage.getItem(loginEmailKey('Daniel'))).toBe('daniel@example.com'));
    expect(db.signOut).not.toHaveBeenCalled();
  });
  it('rejects another member identity and does not cache the login email', async () => {
    db.member.mockResolvedValue({ data: { person: 'Letícia' }, error: null });
    render(<DuetLogin/>);
    fireEvent.change(screen.getByLabelText('E-mail de Daniel'), { target: { value: 'other@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha de Daniel'), { target: { value: 'example-pass' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar no nosso espaço/i }));
    await waitFor(() => expect(db.signOut).toHaveBeenCalledOnce());
    expect(screen.getByRole('status').textContent).toMatch(/não corresponde ao perfil selecionado/i);
    expect(window.localStorage.getItem(loginEmailKey('Daniel'))).toBeNull();
  });
  it('offers password recovery through Supabase Auth without server admin access', async () => {
    render(<DuetLogin/>);
    fireEvent.click(screen.getByRole('button', { name: /Definir ou recuperar minha senha/i }));
    fireEvent.change(screen.getByLabelText('E-mail de Daniel'), { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    await waitFor(() => expect(db.reset).toHaveBeenCalledOnce());
    expect(db.login).not.toHaveBeenCalled();
  });
  it('clears the password when switching between Daniel and Letícia', () => {
    render(<DuetLogin/>);
    fireEvent.change(screen.getByLabelText('Senha de Daniel'), { target: { value: 'temporary' } });
    fireEvent.click(screen.getByRole('button', { name: /L Letícia/i }));
    expect((screen.getByLabelText('Senha de Letícia') as HTMLInputElement).value).toBe('');
  });
});
