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

function ResetPassword() {
  const [canReset, setCanReset] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    // Supabase may consume the recovery URL fragment before React mounts,
    // so checking for a "type=recovery" parameter here is not reliable.
    // Only a verified session authorizes updateUser; URL tokens alone do not.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setCanReset(false);
        setChecking(false);
      } else if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setCanReset(Boolean(session));
        // INITIAL_SESSION can be null while redirect authentication is
        // being processed; let the getSession promise settle first.
        if (session) setChecking(false);
      }
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        setCanReset(!error && Boolean(data.session));
        setChecking(false);
      })
      .catch(() => {
        if (mounted) {
          setCanReset(false);
          setChecking(false);
        }
      });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canReset || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Senha alterada com sucesso.');
      await navigate({ to: '/', replace: true });
    } catch {
      setMessage('Não foi possível alterar a senha. Solicite um novo link ou tente novamente.');
    } finally { setBusy(false); }
  }

  return <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-6">
    <h1 className="text-3xl font-semibold">Uma nova senha. ♡</h1>
    {checking ? <p role="status" className="text-sm text-muted-foreground">Validando seu link de recuperação…</p>
      : canReset ? <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm">Nova senha
          <Input type="password" required minLength={8} maxLength={200} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" className="mt-2"/>
        </label>
        <Button disabled={busy} className="w-full">{busy ? 'Salvando…' : 'Salvar senha'}</Button>
      </form> : <p className="text-sm text-muted-foreground">Não foi possível validar sua sessão de recuperação. Solicite um novo link e abra-o no mesmo navegador.</p>}
    {message && <p role="status">{message}</p>}
    <Button variant="link" onClick={() => navigate({ to: '/' })}>Voltar ao Duet</Button>
  </main>;
}
