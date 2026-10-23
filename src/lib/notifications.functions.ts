import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { heartbeatIsOnline } from '@/lib/duet-presence';

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


/** Only two authenticated Duet members may check the other's activity.
 * This reads the existing server-maintained heartbeat; it never reveals
 * device tokens, IP addresses, or unrelated accounts.
 */
export const readPartnerPresence = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: members, error: memberError } = await context.supabase
      .from('couple_members').select('user_id');
    if (memberError) throw memberError;
    if (!members?.some(member => member.user_id === context.userId)) {
      throw new Error('Acesso reservado ao casal.');
    }
    const partner = members.find(member => member.user_id !== context.userId);
    if (!partner) return { online: false, lastSeen: null };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin.from('duet_presence')
      .select('last_seen').eq('user_id', partner.user_id).maybeSingle();
    if (error) throw error;
    return {
      online: heartbeatIsOnline(data?.last_seen ?? null),
      lastSeen: data?.last_seen ?? null,
    };
  });
