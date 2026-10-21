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
    // Supabase can redirect with either an implicit-flow hash or a PKCE ?code.
    // Wait for a verified auth session before showing the password form.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const recoveryLink = ['recovery', 'invite'].includes(hash.get('type') ?? query.get('type') ?? '') || query.has('code');
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || recoveryLink) {
        setCanReset(Boolean(session));
      }
      setChecking(false);
    });
    void supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (data.session && recoveryLink) setCanReset(true);
        setChecking(false);
      })
      .catch(() => { if (mounted) setChecking(false); });

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
      </form> : <p className="text-sm text-muted-foreground">Link expirado ou inválido. Solicite outro link pela área de configurações do Duet.</p>}
    {message && <p role="status">{message}</p>}
    <Button variant="link" onClick={() => navigate({ to: '/' })}>Voltar ao Duet</Button>
  </main>;
}
