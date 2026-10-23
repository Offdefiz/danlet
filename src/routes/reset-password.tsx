import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/reset-password')({
  head: () => ({
    meta: [
      { title: 'Definir senha — Duet de Daniel e Letícia' },
      { name: 'description', content: 'Recupere seu acesso privado ao Duet.' },
    ],
  }),
  component: ResetPassword,
});

type RecoveryRedirect =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'otp'; tokenHash: string; type: 'recovery' | 'invite' }
  | { kind: 'code'; code: string }
  | { kind: 'error' }
  | { kind: 'none' };

// Read callback values *before* auth-js initialization potentially consumes
// the fragment. Both hash (standard implicit flow) and query are handled,
// including redirects produced by an older email template.
export function parseRecoveryRedirect(location: { hash: string; search: string }): RecoveryRedirect {
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(location.search);
  const get = (key: string) => fragment.get(key) ?? query.get(key);
  if (get('error') || get('error_code')) return { kind: 'error' };

  const accessToken = get('access_token');
  const refreshToken = get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };

  const tokenHash = get('token_hash');
  const type = get('type');
  if (tokenHash && (type === 'recovery' || type === 'invite')) {
    return { kind: 'otp', tokenHash, type };
  }
  const code = get('code');
  if (code) return { kind: 'code', code };
  return { kind: 'none' };
}

function ResetPassword() {
  const [canReset, setCanReset] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const callback = parseRecoveryRedirect(window.location);

    void (async () => {
      try {
        if (callback.kind === 'error') {
          throw new Error('O provedor rejeitou este link. Solicite um novo e abra apenas o mais recente.');
        }

        // The SDK normally handles callbacks automatically, but Safari may
        // reach this component before its implicit URL session is persisted.
        // A preexisting session can also be expired or belong to a prior login.
        const initial = await supabase.auth.getSession();
        let session = initial.error ? null : initial.data.session;

        if (callback.kind === 'tokens') {
          if (!session || session.access_token !== callback.accessToken) {
            const result = await supabase.auth.setSession({
              access_token: callback.accessToken,
              refresh_token: callback.refreshToken,
            });
            if (result.error || !result.data.session) {
              throw new Error('O link não pôde estabelecer uma sessão. Peça outro link de recuperação.');
            }
            session = result.data.session;
          }
        } else if (callback.kind === 'otp') {
          const result = await supabase.auth.verifyOtp({
            token_hash: callback.tokenHash,
            type: callback.type,
          });
          if (result.error || !result.data.session) {
            throw new Error('O código de recuperação já foi utilizado ou expirou.');
          }
          session = result.data.session;
        } else if (callback.kind === 'code' && !session) {
          const result = await supabase.auth.exchangeCodeForSession(callback.code);
          if (result.error || !result.data.session) {
            throw new Error('Não foi possível trocar o código de recuperação. Abra o link no mesmo navegador em que o solicitou.');
          }
          session = result.data.session;
        }

        if (!session) {
          throw new Error('Não foi possível autenticar a recuperação. Solicite um novo link de e-mail.');
        }
        // getUser validates with the Supabase Auth server, unlike getSession's
        // local cache, so a stale/expired JWT cannot unlock the password form.
        const verified = await supabase.auth.getUser();
        if (verified.error || !verified.data.user) {
          throw new Error('O Supabase não conseguiu validar a sessão. Solicite um novo link.');
        }
        if (mounted) setCanReset(true);
      } catch (error) {
        if (mounted) {
          setCanReset(false);
          setMessage(error instanceof Error ? error.message : 'Não foi possível validar a recuperação.');
        }
      } finally {
        // The URL may contain access/refresh tokens. Never leave them visible
        // in browser history after attempting validation.
        if (callback.kind !== 'none') {
          window.history.replaceState(window.history.state, '', '/reset-password');
        }
        if (mounted) setChecking(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canReset || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Sua sessão expirou. Solicite outro link.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Senha alterada com sucesso.');
      await navigate({ to: '/', replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível alterar a senha. Tente novamente.');
    } finally { setBusy(false); }
  }

  return <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-6">
    <h1 className="text-3xl font-semibold">Uma nova senha. ♡</h1>
    {checking ? <p role="status" className="text-sm text-muted-foreground">Validando sua sessão com o Supabase…</p>
      : canReset ? <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm">Nova senha
          <Input type="password" required minLength={8} maxLength={200} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" className="mt-2"/>
        </label>
        <Button disabled={busy} className="w-full">{busy ? 'Salvando…' : 'Salvar senha'}</Button>
      </form> : <p className="text-sm text-muted-foreground">Não foi possível concluir a recuperação.</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <Button variant="link" onClick={() => navigate({ to: '/' })}>Voltar ao Duet</Button>
  </main>;
}
