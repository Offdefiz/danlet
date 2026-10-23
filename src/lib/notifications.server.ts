import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { pushTo, firebasePushConfigured, assertFirebasePushReady } from '@/lib/push.server';
import { formatPartnerPush, formatQuickReplyPush } from '@/lib/push-copy';
import { makeProposalLink } from '@/lib/juntos-suggestions';

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
    let destination: string | undefined;
    if (event.kind === 'proposal') {
      const match = /^proposal:([0-9a-f-]{36})$/i.exec(event.body);
      if (match) {
        const { data: proposal, error: proposalError } = await supabaseAdmin.from('couple_proposals')
          .select('title,status').eq('id', match[1]!).maybeSingle();
        if (proposalError) throw proposalError;
        if (proposal) {
          destination = makeProposalLink(match[1]!);
          notification = proposal.status === 'agreed'
            ? { title: 'Combinado pelos dois! ♡', body: proposal.title + ' já entrou na agenda.' }
            : proposal.status === 'declined'
              ? { title: 'Juntos ♡', body: name + ' respondeu à proposta: ' + proposal.title }
              : { title: 'Uma decisão para vocês dois ♡', body: proposal.title + ' — toque para responder.' };
        }
      }
    }
    // The database trigger only exposes a generic "chat message" event.
    // A tightly scoped lookup may reveal the special quick-answer status,
    // never arbitrary chat text or the user's private messages on the lock screen.
    if ((event.kind === 'message' || event.kind === 'addition')
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
      sent += await pushTo([event.recipient_id], notification.title, notification.body, event.id, destination, event.kind === 'online' || event.kind === 'message' ? 'high' : 'normal');
    } catch {
      console.error('Falha ao enviar aviso do casal');
      // Preserve retry eligibility; durable message events have a longer freshness window.
      const { error: releaseError } = await supabaseAdmin.from('push_event_queue').update({ processed_at: null }).eq('id', event.id);
      if (releaseError) releaseFailed = true;
    }
  }
  if (releaseFailed) throw new Error('Não foi possível liberar um aviso para nova tentativa.');
  return sent;
}
