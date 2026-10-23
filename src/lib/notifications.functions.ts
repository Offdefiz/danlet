import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const syncPartnerNotifications = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ heartbeat: z.boolean() }))
  .handler(async ({ context, data }) => {
    const { data: member, error } = await context.supabase.from('couple_members').select('user_id').eq('user_id', context.userId).maybeSingle();
    if (error || !member) throw new Error('Acesso reservado ao casal.');
    // The couple's authenticated features should not fail just because the
    // optional administrative push backend has not been configured on Render.
    if (!process.env['SUPABASE_SERVICE_ROLE_KEY']) return { sent: 0, backendPending: true };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if (data.heartbeat) {
      const result = await supabaseAdmin.rpc('heartbeat_duet_push', { actor: context.userId });
      if (result.error) throw result.error;
    }
    const { drainPartnerPush } = await import('@/lib/notifications.server');
    return { sent: await drainPartnerPush() };
  });

// A signed-in user may send a test push only to their own registered devices.
// The server derives the recipient from the verified session, never from client input.
const lastTestByUser = new Map<string, number>();
export const sendSelfPushTest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: member, error } = await context.supabase.from('couple_members')
      .select('user_id').eq('user_id', context.userId).maybeSingle();
    if (error || !member) throw new Error('Acesso reservado ao casal.');
    const now = Date.now();
    const previous = lastTestByUser.get(context.userId) ?? 0;
    if (now - previous < 60_000) throw new Error('Aguarde um minuto entre testes de notificação.');
    lastTestByUser.set(context.userId, now);
    try {
      const { pushTo } = await import('@/lib/push.server');
      const sent = await pushTo([context.userId], 'Teste de notificação do Duet ♡',
        'Se você recebeu este aviso no iPhone, o push está funcionando!', 'duet-self-test');
      return { sent };
    } catch (err) {
      lastTestByUser.delete(context.userId);
      throw err;
    }
  });
