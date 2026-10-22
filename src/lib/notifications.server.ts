import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { pushTo, firebasePushConfigured, assertFirebasePushReady } from '@/lib/push.server';
import { formatPartnerPush, formatQuickReplyPush } from '@/lib/push-copy';

export async function drainPartnerPush() {
  // Preserve queued events until Firebase credentials have been configured.
  if (!firebasePushConfigured()) return 0;
  await assertFirebasePushReady();
  const { data: members, error: memberError } = await supabaseAdmin.from('couple_members').select('user_id, person');
  if (memberError) throw memberError;
  const { data: events, error } = await supabaseAdmin.rpc('claim_duet_push_events');
  if (error) throw error;
  let sent = 0;
  let releaseFailed = false;
  for (const event of events ?? []) {
    const name = members?.find(m => m.user_id === event.actor_id)?.person;
    if (!name) continue;
    let notification = formatPartnerPush(name, event.kind, event.body);
    // The database trigger only exposes a generic "chat message" event.
    // A tightly scoped lookup may reveal the special quick-answer status,
    // never arbitrary chat text or the user's private messages on the lock screen.
    if (event.kind === 'addition'
      && event.body === 'enviou uma mensagem no chat'
      && typeof event.created_at === 'string') {
      const at = Date.parse(event.created_at);
      if (Number.isFinite(at)) {
        try {
          const { data: replies, error: messageError } = await supabaseAdmin.from('messages')
            .select('body').eq('user_id', event.actor_id)
            .gte('created_at', new Date(at - 5000).toISOString())
            .lte('created_at', new Date(at + 5000).toISOString())
            .order('created_at', { ascending: false }).limit(1);
          if (!messageError && replies?.[0]?.body) {
            notification = formatQuickReplyPush(name, replies[0].body) ?? notification;
          }
        } catch { /* generic message notification is always a safe fallback */ }
      }
    }
    try {
      sent += await pushTo([event.recipient_id], notification.title, notification.body, event.kind === 'online' ? `online-${event.actor_id}` : event.id);
    } catch {
      console.error('Falha ao enviar aviso do casal');
      // Retries remain subject to the SQL freshness and presence cooldown rules.
      const { error: releaseError } = await supabaseAdmin.from('push_event_queue').update({ processed_at: null }).eq('id', event.id);
      if (releaseError) releaseFailed = true;
    }
  }
  if (releaseFailed) throw new Error('Não foi possível liberar um aviso para nova tentativa.');
  return sent;
}
