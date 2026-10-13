import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Heart, LockKeyhole, ArrowRight, Flower2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { nameLogin } from '@/lib/duet.functions';
import type { Person } from '@/lib/duet.types';

export function DuetLogin() {
  const [person, setPerson] = useState<Person>('Daniel');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const login = useServerFn(nameLogin);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage('Se o e-mail estiver cadastrado, você receberá um link para definir sua senha.');
      } else {
        const result = await login({ data: { person, password } });
        if (!result.session) throw new Error(result.error ?? 'Não foi possível entrar.');
        const { error } = await supabase.auth.setSession(result.session);
        if (error) throw error;
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Não foi possível entrar.'); }
    finally { setBusy(false); }
  }
  return <main className="login-scene min-h-screen px-6 py-10"><header className="flex items-center justify-center gap-2 text-primary"><Heart size={21} /><span className="text-2xl font-bold text-foreground">duet.</span></header><div className="mx-auto mt-16 max-w-sm sm:mt-24"><div className="mb-6 flex justify-center"><span className="flex size-20 items-center justify-center rounded-full bg-secondary text-success"><Flower2 size={42} strokeWidth={1.2}/></span></div><p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daniel & Letícia</p><h1 className="mt-3 text-center text-4xl font-semibold leading-tight">O nosso próximo<br/><span className="text-primary">capítulo.</span></h1><p className="mt-4 text-center text-sm text-muted-foreground">Um lugar só nosso. ♡</p><form onSubmit={submit} className="mt-10 space-y-5"><div className="grid grid-cols-2 gap-3">{(['Daniel','Letícia'] as Person[]).map(name => <Button key={name} type="button" variant={person === name ? 'default' : 'outline'} onClick={() => { setPerson(name); setMessage(''); }} className="h-14 gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-background/30">{name[0]}</span>{name}</Button>)}</div><label className="block text-sm font-medium">{reset ? 'Seu e-mail' : `Senha de ${person}`}<Input className="mt-2 h-12 bg-card" type={reset ? 'email' : 'password'} autoComplete={reset ? 'email' : 'current-password'} value={reset ? email : password} onChange={e => reset ? setEmail(e.target.value) : setPassword(e.target.value)} required /></label>{message && <p role="status" className="text-sm text-danger">{message}</p>}<Button disabled={busy} className="h-12 w-full">{busy ? 'Aguarde…' : reset ? 'Enviar link' : 'Entrar no nosso espaço'}<ArrowRight size={17}/></Button><Button type="button" variant="link" onClick={() => { setReset(!reset); setMessage(''); }} className="w-full text-muted-foreground">{reset ? 'Voltar à entrada' : 'Definir ou recuperar minha senha'}</Button></form><p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={13}/>Privado. Apenas nós dois.</p></div></main>;
}