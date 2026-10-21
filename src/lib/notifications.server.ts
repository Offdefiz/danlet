import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { pushTo, firebasePushConfigured } from '@/lib/push.server';
import { formatPartnerPush } from '@/lib/push-copy';

export async function drainPartnerPush() {
  // Preserve queued events until Firebase credentials have been configured.
  if (!firebasePushConfigured()) return 0;
  const { data: events, error } = await supabaseAdmin.rpc('claim_duet_push_events');
  if (error) throw error;
  const { data: members, error: memberError } = await supabaseAdmin.from('couple_members').select('user_id, person');
  if (memberError) throw memberError;
  let sent = 0;
  for (const event of events ?? []) {
    const name = members?.find(m => m.user_id === event.actor_id)?.person;
    if (!name) continue;
    const notification = formatPartnerPush(name, event.kind, event.body);
    try {
      sent += await pushTo([event.recipient_id], notification.title, notification.body, event.kind === 'online' ? `online-${event.actor_id}` : event.id);
    } catch (error) {
      console.error('Falha ao enviar aviso do casal', error);
    }
  }
  return sent;
}
