import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { pushTo } from '@/lib/push.server';

export async function drainPartnerPush() {
  const { data: events, error } = await supabaseAdmin.rpc('claim_duet_push_events');
  if (error) throw error;
  const { data: members, error: memberError } = await supabaseAdmin.from('couple_members').select('user_id, person');
  if (memberError) throw memberError;
  let sent = 0;
  for (const event of events ?? []) {
    const name = members?.find(m => m.user_id === event.actor_id)?.person;
    if (!name) continue;
    // Claims are durable and at-most-once, even across tabs and scheduler overlap.
    try { sent += await pushTo([event.recipient_id], `${name} no Duet ♡`, `${name} ${event.body}`, event.kind === 'online' ? `online-${event.actor_id}` : event.id); }
    catch (error) { console.error('Falha ao enviar aviso do casal', error); }
  }
  return sent;
}