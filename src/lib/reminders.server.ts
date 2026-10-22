import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { pushTo, firebasePushConfigured, assertFirebasePushReady } from '@/lib/push.server';
import { currentReminderSlot, reminderMessage } from '@/lib/push-copy';
import { dueQuestion, makeQuestionLink, questions } from '@/lib/weekend-prompts';

/**
 * Intended for an hourly (or more frequent) authenticated cron invocation.
 * Four daytime windows per day, with a durable unique marker in the existing
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
  const prompt = slot.id === 'cafe' ? dueQuestion(now) : null;
  const selected = prompt ? questions.find(q => q.id === prompt.id) : null;
  const body = selected ? selected.title
    : slot.id === 'almoco' ? 'Já bebeu água hoje? Responde pra gente! 💧'
    : slot.id === 'tarde' ? 'Como está seu dia? Que tal dar notícias ao seu par? 💌'
    : reminderMessage(slot.date, slot.id);
  const destination = prompt ? makeQuestionLink(prompt.id, prompt.date)
    : slot.id === 'almoco' ? '/?duet_checkin=water'
    : '/?duet_view=together';
  let sent = 0;
  for (const member of members ?? []) {
    if (optedOut.has(member.user_id)) continue;
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
