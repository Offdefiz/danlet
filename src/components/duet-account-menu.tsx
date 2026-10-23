import { useEffect, useState } from 'react';
import { Bell, HelpCircle, LogOut, Mail, Palette, Settings, Shield, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/duet-extras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import type { Row } from '@/lib/duet.types';

export function DuetAccountMenu({ name, profile, onProfile, onSignOut, online, sync }: {
  name: string;
  profile?: Row<'profiles'> | undefined;
  onProfile: () => void;
  onSignOut: () => void;
  online: boolean;
  sync: string;
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!accountOpen) return;
    let mounted = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error) { toast.error('Não foi possível consultar sua conta.'); return; }
      setOriginalEmail(data.user?.email ?? '');
      setEmail(data.user?.email ?? '');
    });
    return () => { mounted = false; };
  }, [accountOpen]);

  async function updateEmail(e: React.FormEvent) {
    e.preventDefault();
    const next = email.trim();
    if (!next || next === originalEmail) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) throw error;
      toast.success('Solicitação enviada. Confira os e-mails de confirmação antes de usar o novo endereço.');
      setAccountOpen(false);
    } catch { toast.error('Não foi possível solicitar a alteração de e-mail.'); }
    finally { setBusy(false); }
  }
  async function setPassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      toast.error('A senha precisa ter pelo menos 8 caracteres e coincidir com a confirmação.');
      return;
    }
    setBusy(true);
    try {
      // Only the current authenticated Supabase user can change their own password.
      // No admin key, temporary shared password, or server-side bypass is needed.
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Sua sessão expirou. Entre novamente para definir uma senha.');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha definida! Você já pode entrar com e-mail e senha.');
      setNewPassword('');
      setConfirmPassword('');
      setAccountOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível definir a senha.');
    } finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!originalEmail) { toast.error('Seu e-mail não está disponível.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(originalEmail, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      toast.success('Se o e-mail estiver cadastrado, você receberá o link de redefinição.');
    } catch { toast.error('Não foi possível solicitar a redefinição.'); }
    finally { setBusy(false); }
  }
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="h-12 gap-2 rounded-full border border-border px-2" aria-label="Abrir configurações">
          <Avatar profile={profile} name={name} size={34}/>
          <span className="max-w-20 truncate text-xs font-medium">{name}</span>
          <Settings size={17} className="text-muted-foreground"/>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">{online ? sync : 'Sem conexão'}</div>
        <DropdownMenuSeparator/>
        <DropdownMenuItem onSelect={onProfile}><UserRound/>Meu perfil</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.dispatchEvent(new Event('duet:open-theme'))}><Palette/>Alterar tema</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.dispatchEvent(new Event('duet:open-notifications'))}><Bell/>Notificações</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setAccountOpen(true)}><Mail/>E-mail e senha</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setPrivacyOpen(true)}><Shield/>Privacidade</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setHelpOpen(true)}><HelpCircle/>Ajuda</DropdownMenuItem>
        <DropdownMenuSeparator/>
        <DropdownMenuItem onSelect={onSignOut}><LogOut/>Sair da conta</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
      <DialogContent><DialogHeader><DialogTitle>Minha conta</DialogTitle></DialogHeader>
        <form onSubmit={updateEmail} className="space-y-3">
          <label className="block text-sm">E-mail<Input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2"/></label>
          <Button disabled={busy || !email.trim() || email.trim() === originalEmail} className="w-full">Solicitar alteração de e-mail</Button>
        </form>
        <form onSubmit={setPassword} className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Definir ou alterar senha sem e-mail</p>
          <p className="text-xs text-muted-foreground">Disponível somente com sua conta já conectada. A senha fica protegida pelo Supabase, não é salva no Duet.</p>
          <label className="block text-sm">Nova senha
            <Input className="mt-2" type="password" minLength={8} maxLength={200} autoComplete="new-password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
          </label>
          <label className="block text-sm">Confirmar nova senha
            <Input className="mt-2" type="password" minLength={8} maxLength={200} autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/>
          </label>
          <Button type="submit" className="w-full" disabled={busy || newPassword.length < 8 || newPassword !== confirmPassword}>{busy ? 'Salvando…' : 'Salvar minha senha'}</Button>
        </form>
        <Button variant="outline" disabled={busy || !originalEmail} onClick={resetPassword}>Receber link para alterar senha</Button>
        <p className="text-xs text-muted-foreground">Por segurança, mudanças de e-mail podem exigir confirmação nas caixas de entrada.</p>
      </DialogContent>
    </Dialog>
    <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
      <DialogContent><DialogHeader><DialogTitle>Privacidade</DialogTitle></DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">Suas cores são guardadas apenas neste navegador, separadas por conta. Mensagens, metas e escolhas são compartilhadas com o outro integrante do casal por meio do Supabase. Evite acessar a conta em aparelhos públicos.</p>
        <Button onClick={() => setPrivacyOpen(false)}>Entendi</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent><DialogHeader><DialogTitle>Como usar o Duet</DialogTitle></DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">No Dream Match, arraste para a direita para curtir e para a esquerda para descartar. Ambos precisam curtir para formar um match. Em Planos, uma meta só é concluída após as duas assinaturas. Na conversa, as mensagens são compartilhadas com o parceiro.</p>
        <Button onClick={() => setHelpOpen(false)}>Fechar</Button>
      </DialogContent>
    </Dialog>
  </>;
}
