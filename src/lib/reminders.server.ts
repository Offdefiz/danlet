import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { pushTo, firebasePushConfigured, assertFirebasePushReady } from '@/lib/push.server';
import { currentReminderSlot, reminderMessage } from '@/lib/push-copy';
import { dailyProposalSuggestion, makeProposalLink } from '@/lib/juntos-suggestions';

/** A single deterministic UUID is shared by both phones for each suggestion. */
function stableUuid(value: string): string {
  const digest = createHash('sha256').update(value).digest('hex');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

/** 12 maximum daylight notices per person, half of them interactive proposals.
 * SQL idempotency prevents duplicates when GitHub retries a twenty-minute tick.
 * Proposals are NOT agenda entries: only the vote_duet_proposal RPC may promote
 * them to a calendar record after both partners independently accept.
 */
export async function sendDueInspirations(now = new Date()) {
  if (!firebasePushConfigured()) return { sent: 0, reason: 'push-not-configured' as const };
  await assertFirebasePushReady();
  const slot = currentReminderSlot(now);
  if (!slot) return { sent: 0, reason: 'quiet-hours' as const };

  const { data: members, error } = await supabaseAdmin.from('couple_members').select('user_id');
  if (error) throw error;
  const { data: disabled, error: preferenceError } = await supabaseAdmin.from('notification_preferences')
    .select('user_id').eq('enabled', false);
  if (preferenceError) throw preferenceError;
  const optedOut = new Set((disabled ?? []).map(row => row.user_id));

  const hour = Number(slot.id.slice(1));
  const suggestion = dailyProposalSuggestion(slot.date, hour);
  let proposalId: string | null = null;
  if (suggestion && (members ?? []).some(member => !optedOut.has(member.user_id))) {
    proposalId = stableUuid(suggestion.dedupeKey);
    const { error: proposalError } = await supabaseAdmin.from('couple_proposals')
      .upsert({
        id: proposalId, dedupe_key: suggestion.dedupeKey,
        title: suggestion.title, date: suggestion.date, time: suggestion.time,
        created_by: null,
      }, { onConflict: 'id', ignoreDuplicates: true });
    if (proposalError) throw proposalError;
  }

  let recentlyHere = new Set<string>();
  try {
    const { data, error: presenceError } = await supabaseAdmin.from('duet_presence')
      .select('user_id').gte('last_seen', new Date(now.getTime() - 25 * 60_000).toISOString());
    if (!presenceError) recentlyHere = new Set((data ?? []).map(row => row.user_id));
  } catch { /* Optional presence must not prevent push. */ }

  let sent = 0;
  for (const member of members ?? []) {
    if (optedOut.has(member.user_id)) continue;
    // Engagement/organization suggestions arrive even if the PWA was open
    // recently. Purely decorative messages stay silent while the user is active.
    if (!suggestion && recentlyHere.has(member.user_id)) continue;
    const body = suggestion ? suggestion.title + ' Responda no Juntos: topo ou agora não? ♡'
      : reminderMessage(slot.date, slot.id, member.user_id);
    const destination = proposalId ? makeProposalLink(proposalId) : '/';
    const id = stableUuid(`duet:${member.user_id}:${slot.date}:${slot.id}`);
    const { data: inserted, error: insertError } = await supabaseAdmin.from('push_event_queue')
      .upsert({
        id, actor_id: member.user_id, recipient_id: member.user_id,
        kind: 'reminder', body, processed_at: now.toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (insertError) throw insertError;
    if (!inserted?.length) continue;
    try {
      sent += await pushTo([member.user_id],
        suggestion ? 'Vamos decidir juntos? ♡' : 'Duet ♡', body,
        `carinho-${slot.date}-${slot.id}`, destination);
    } catch {
      const { error: releaseError } = await supabaseAdmin.from('push_event_queue').delete().eq('id', id);
      console.error('Falha ao enviar aviso proativo do Duet');
      if (releaseError) throw new Error('Não foi possível liberar o aviso para nova tentativa.');
    }
  }
  return { sent, slot: slot.id, proposal: Boolean(suggestion) };
}
