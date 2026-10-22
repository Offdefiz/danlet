import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { pushTo, firebasePushConfigured, assertFirebasePushReady } from '@/lib/push.server';
import { currentReminderSlot, reminderMessage } from '@/lib/push-copy';
import { makeQuestionLink } from '@/lib/weekend-prompts';
import { alreadyAnsweredQuestion, isWaterCheckin, proposedCoupleQuestion } from '@/lib/duet-notification-schedule';

/**
 * Intended for an hourly (or more frequent) authenticated cron invocation.
 * Five daytime windows per day, with a durable unique marker in the existing
 * queue so concurrent scheduler workers do not start the same reminder window.
 * Nothing depends on an open browser tab or requires a new database table.
 */
export async function sendDueInspirations(now = new Date()) {
  // Do not consume daily idempotency slots when no push service is configured.
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
  // Read only the metadata needed to suppress duplicate planning questions.
  // The dataset is small and already protected by Supabase service-role access.
  const question = proposedCoupleQuestion(slot.date, slot.id);
  let answeredRecords: Array<{ body: string; updated_by: string | null }> = [];
  if (question) {
    const { data, error: recordsError } = await supabaseAdmin.from('records')
      .select('body,updated_by').eq('kind', 'setting').limit(300);
    if (recordsError) throw recordsError;
    answeredRecords = data ?? [];
  }
  // Do not buzz a partner already spending time inside the app. This is
  // optional optimization; failure to read presence must not interrupt push.
  let recentlyHere = new Set<string>();
  try {
    const { data, error: presenceError } = await supabaseAdmin.from('duet_presence')
      .select('user_id').gte('last_seen', new Date(now.getTime() - 25 * 60_000).toISOString());
    if (!presenceError) recentlyHere = new Set((data ?? []).map(row => row.user_id));
  } catch { /* older Supabase schemas can lack optional presence metadata */ }
  let sent = 0;
  for (const member of members ?? []) {
    if (optedOut.has(member.user_id)) continue;
    const pendingQuestion = question && !alreadyAnsweredQuestion(answeredRecords, member.user_id, question.id, question.date)
      ? question : null;
    const water = !pendingQuestion && isWaterCheckin(slot.date, slot.id);
    // Cute messages are suppressed while the user is active. A meaningful
    // question/check-in can still arrive independently from PWA screen state.
    if (!pendingQuestion && !water && recentlyHere.has(member.user_id)) continue;
    const body = pendingQuestion ? pendingQuestion.title
      : water ? 'Já bebeu água hoje? Um sim ou não já vale um carinho. 💧'
      : reminderMessage(slot.date, slot.id, member.user_id);
    const destination = pendingQuestion ? makeQuestionLink(pendingQuestion.id, pendingQuestion.date)
      : water ? '/?duet_checkin=water'
      : '/';
    const digest = createHash('sha256').update(`duet:${member.user_id}:${slot.date}:${slot.id}`).digest('hex');
    // Valid UUID, stable per user + local date + 3h window.
    const id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
    const { data: inserted, error: insertError } = await supabaseAdmin.from('push_event_queue')
      .upsert({
        id,
        actor_id: member.user_id,
        recipient_id: member.user_id,
        kind: 'reminder',
        body,
        processed_at: now.toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (insertError) throw insertError;
    if (!inserted?.length) continue;
    try {
      sent += await pushTo([member.user_id], 'Duet ♡', body, `carinho-${slot.date}-${slot.id}`, destination);
    } catch {
      // Retrying after a partial multi-device delivery can repeat an alert.
      const { error: releaseError } = await supabaseAdmin.from('push_event_queue').delete().eq('id', id);
      console.error('Falha ao enviar lembrete carinhoso do Duet');
      if (releaseError) throw new Error('Não foi possível liberar o lembrete para nova tentativa.');
    }
  }
  return { sent, slot: slot.id };
}
