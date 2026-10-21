import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { pushTo } from '@/lib/push.server';
import { currentReminderSlot, reminderMessage } from '@/lib/push-copy';

/**
 * Intended for an hourly (or more frequent) authenticated cron invocation.
 * Three daytime windows per day, with a durable unique marker in the existing
 * queue so retries and multiple scheduler workers cannot send duplicate nudges.
 * Nothing depends on an open browser tab or requires a new database table.
 */
export async function sendDueInspirations(now = new Date()) {
  const slot = currentReminderSlot(now);
  if (!slot) return { sent: 0, reason: 'quiet-hours' as const };
  const { data: members, error } = await supabaseAdmin.from('couple_members').select('user_id');
  if (error) throw error;
  const { data: disabled, error: preferenceError } = await supabaseAdmin.from('notification_preferences')
    .select('user_id').eq('enabled', false);
  if (preferenceError) throw preferenceError;
  const optedOut = new Set((disabled ?? []).map(row => row.user_id));
  const body = reminderMessage(slot.date, slot.id);
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
      sent += await pushTo([member.user_id], 'Duet ♡', body, `carinho-${slot.date}-${slot.id}`);
    } catch (sendError) {
      // Claim stays consumed; avoid hammering the provider or duplicate alerts.
      console.error('Falha ao enviar lembrete carinhoso do Duet', sendError);
    }
  }
  return { sent, slot: slot.id };
}
