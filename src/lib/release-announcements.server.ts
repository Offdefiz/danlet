import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { assertFirebasePushReady, firebasePushConfigured, pushTo } from '@/lib/push.server';
import { currentVersion, releaseNotes } from '@/lib/release-notes';

const RELEASE_DESTINATION = '/?duet_view=updates';

/** Uniqueness is stored in Supabase, so multiple Render instances or retrying
 * a GitHub Actions job cannot send the same release twice per person. */
function releaseEventId(version: string, userId: string): string {
  const hash = createHash('sha256').update('duet:release:' + version + ':' + userId).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function releasePushCopy(version: string): { title: string; body: string } {
  const latest = releaseNotes.find(item => item.version === version);
  if (version === '2.7.0') return {
    title: 'O Duet ganhou muitas novidades! ♡',
    body: 'Veja tudo que chegou desde a migração para o Supabase: Juntos, chat, temas, notificações e mais.',
  };
  const firstChange = latest?.highlights[0] ?? 'Novas melhorias no nosso espaço a dois.';
  return {
    title: `Duet v${version} disponível! ♡`,
    body: (firstChange.length > 150 ? firstChange.slice(0, 147) + '…' : firstChange) + ' Toque para ver todas as novidades.',
  };
}

/** Runs with the existing signed 20-minute scheduler. No DDL or secret token.
 * Uses a deterministic processed queue marker per version/person and sends
 * directly, avoiding a public endpoint and observing individual push opt-outs.
 */
export async function sendReleaseAnnouncements(): Promise<{ sent: number; version: string }> {
  const version = currentVersion;
  if (!firebasePushConfigured()) return { sent: 0, version };
  await assertFirebasePushReady();

  const { data: members, error } = await supabaseAdmin.from('couple_members').select('user_id');
  if (error) throw error;
  const { data: disabled, error: preferenceError } = await supabaseAdmin
    .from('notification_preferences').select('user_id').eq('enabled', false);
  if (preferenceError) throw preferenceError;
  const optedOut = new Set((disabled ?? []).map(item => item.user_id));
  const { title, body } = releasePushCopy(version);
  let sent = 0;

  for (const member of members ?? []) {
    if (optedOut.has(member.user_id)) continue;
    const id = releaseEventId(version, member.user_id);
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('push_event_queue').upsert({
        id,
        actor_id: member.user_id,
        recipient_id: member.user_id,
        kind: 'release',
        body: 'version:' + version,
        processed_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (insertError) throw insertError;
    if (!inserted?.length) continue;
    try {
      const accepted = await pushTo(
        [member.user_id], title, body, 'duet-update-' + version, RELEASE_DESTINATION, 'high',
      );
      if (!accepted) {
        // Retry on a later scheduler execution if no device was enrolled.
        const { error: deleteError } = await supabaseAdmin.from('push_event_queue').delete().eq('id', id);
        if (deleteError) throw new Error('Não foi possível liberar o aviso de atualização.');
      } else {
        sent += accepted;
      }
    } catch {
      const { error: deleteError } = await supabaseAdmin.from('push_event_queue').delete().eq('id', id);
      console.error('Falha ao enviar novidades do Duet');
      if (deleteError) throw new Error('Não foi possível liberar um aviso de atualização para nova tentativa.');
    }
  }
  return { sent, version };
}
