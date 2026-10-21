import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { firebaseAccessToken, firebaseCredentials, firebasePushConfigured } from '@/lib/firebase-direct.server';

// Notifications follow the independently hosted web app (or a custom domain).
const APP_URL = new URL('/', process.env['PUBLIC_APP_URL'] || process.env['RENDER_EXTERNAL_URL'] || 'https://danlet.onrender.com').href;
const APP_ICON = new URL('icons/duet-192.png', APP_URL).href;
const APP_BADGE = new URL('icons/duet-badge.png', APP_URL).href;
export { firebasePushConfigured };
export async function assertFirebasePushReady(): Promise<void> {
  const config = firebaseCredentials();
  if (!firebasePushConfigured() || !config) throw new Error('Firebase push não configurado.');
  await firebaseAccessToken(config);
}

export async function pushTo(userIds: string[] | null, title: string, body: string, tag?: string) {
  const creds = firebaseCredentials();
  if (!firebasePushConfigured() || !creds) throw new Error('Notificações push pendentes: configure a conta de serviço Firebase no Render.');
  const access = await firebaseAccessToken(creds);
  let q = supabaseAdmin.from('push_tokens').select('token,user_id');
  if (userIds) q = q.in('user_id', userIds);
  const { data, error } = await q;
  if (error) throw error;
  const { data: disabled, error: preferenceError } = await supabaseAdmin.from('notification_preferences').select('user_id').eq('enabled', false);
  if (preferenceError) throw preferenceError;
  const disabledIds = new Set((disabled ?? []).map(p => p.user_id));
  let sent = 0;
  for (const { token, user_id } of data ?? []) {
    if (disabledIds.has(user_id)) continue;
    const response = await fetch('https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(creds.project_id) + '/messages:send', {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          webpush: {
            fcm_options: { link: APP_URL },
            notification: {
              title, body, icon: APP_ICON, badge: APP_BADGE, lang: 'pt-BR',
              silent: false, vibrate: [130, 70, 130],
              ...(tag ? { tag, renotify: !tag.startsWith('online-') } : {}),
            },
          },
        },
      }),
    });
    if (response.ok) { sent++; continue; }
    const text = await response.text();
    if (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500) {
      throw new Error('Falha temporária no envio Firebase (HTTP ' + response.status + ').');
    }
    // Don't log credentials, individual messages or sensitive device tokens.
    console.warn('[FCM] Push rejected: HTTP ' + response.status);
    if (text.includes('UNREGISTERED') || text.includes('registration-token-not-registered')) {
      await supabaseAdmin.from('push_tokens').delete().eq('token', token);
    }
  }
  return sent;
}
