import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const syncPartnerNotifications = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ heartbeat: z.boolean() }))
  .handler(async ({ context, data }) => {
    const { data: member, error } = await context.supabase.from('couple_members').select('user_id').eq('user_id', context.userId).maybeSingle();
    if (error || !member) throw new Error('Acesso reservado ao casal.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if (data.heartbeat) {
      const result = await supabaseAdmin.rpc('heartbeat_duet_push', { actor: context.userId });
      if (result.error) throw result.error;
    }
    const { drainPartnerPush } = await import('@/lib/notifications.server');
    return { sent: await drainPartnerPush() };
  });