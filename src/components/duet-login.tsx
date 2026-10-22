import { useEffect, useState } from 'react';
import { Heart, LockKeyhole, ArrowRight, Flower2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import type { Person } from '@/lib/duet.types';

// Email is merely a convenience remembered locally, per person and per phone.
// Login always verifies credentials with Supabase Auth and membership with RLS.
export const loginEmailKey = (person: Person) => `duet:login-email:${person}`;
export function readLoginEmail(person: Person) {
  try { return window.localStorage.getItem(loginEmailKey(person)) ?? ''; } catch { return ''; }
}
export function rememberLoginEmail(person: Person, email: string) {
  try { window.localStorage.setItem(loginEmailKey(person), email.trim().toLowerCase()); } catch { /* storage may be unavailable on private mode */ }
}

export function DuetLogin() {
  const [person, setPerson] = useState<Person>('Daniel');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { setEmail(readLoginEmail(person)); }, [person]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage('Se o e-mail estiver cadastrado, você receberá um link para definir sua senha.');
        return;
      }
      // Do not use the old server-side nameLogin lookup: that endpoint needs a
      // Supabase service-role credential which is intentionally not public.
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error || !data.user) throw new Error('E-mail ou senha incorretos. Confira os dados da sua conta.');
      const membership = await supabase.from('couple_members')
        .select('person')
        .eq('user_id', data.user.id)
        .maybeSingle();
      if (membership.error || membership.data?.person !== person) {
        await supabase.auth.signOut();
        throw new Error(membership.error
          ? 'Não foi possível confirmar seu vínculo com o casal no banco de dados.'
          : 'Esta conta não corresponde ao perfil selecionado.');
      }
      rememberLoginEmail(person, normalizedEmail);
      setPassword('');
      // Auth listener in the root component will open the organizer.
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível entrar. Verifique a conexão e tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  return <main className="login-scene min-h-screen px-6 py-10">
    <header className="flex items-center justify-center gap-2 text-primary"><Heart size={21}/><span className="text-2xl font-bold text-foreground">duet.</span></header>
    <p className="mt-1 text-center text-xs text-muted-foreground">App do casal DanLet</p>
    <div className="mx-auto mt-16 max-w-sm sm:mt-24">
      <div className="mb-6 flex justify-center"><span className="flex size-20 items-center justify-center rounded-full bg-secondary text-success"><Flower2 size={42} strokeWidth={1.2}/></span></div>
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daniel & Letícia</p>
      <h1 className="mt-3 text-center text-4xl font-semibold leading-tight">O nosso próximo<span className="text-primary"> capítulo.</span></h1>
      <p className="mt-4 text-center text-sm text-muted-foreground">Um lugar só nosso. ♡</p>
      <form onSubmit={submit} className="mt-10 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {(['Daniel','Letícia'] as Person[]).map(name => <Button key={name} type="button" variant={person === name ? 'default' : 'outline'}
            onClick={() => { setPerson(name); setMessage(''); setPassword(''); }} className="h-14 gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-background/30">{name[0]}</span>{name}
          </Button>)}
        </div>
        <label className="block text-sm font-medium">E-mail de {person}
          <Input className="mt-2 h-12 bg-card" type="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} maxLength={254} required/>
        </label>
        {!reset && <label className="block text-sm font-medium">Senha de {person}
          <Input className="mt-2 h-12 bg-card" type="password" autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)} required/>
        </label>}
        {message && <p role="status" className="text-sm text-danger">{message}</p>}
        <Button disabled={busy} className="h-12 w-full" type="submit">{busy ? 'Aguarde…' : reset ? 'Enviar link' : 'Entrar no nosso espaço'}<ArrowRight size={17}/></Button>
        <Button type="button" variant="link" onClick={() => { setReset(!reset); setMessage(''); }} className="w-full text-muted-foreground">{reset ? 'Voltar à entrada' : 'Definir ou recuperar minha senha'}</Button>
      </form>
      <p className="mt-5 text-center text-xs text-muted-foreground">Na primeira entrada neste aparelho, informe o e-mail cadastrado. A senha nunca é armazenada pelo Duet.</p>
      <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={13}/>Privado. Apenas nós dois.</p>
    </div>
  </main>;
}
