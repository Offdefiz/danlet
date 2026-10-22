import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { firebaseAccessToken, firebaseCredentials, firebasePushConfigured } from '@/lib/firebase-direct.server';

// Notifications follow the independently hosted web app (or a custom domain).
const APP_URL = new URL('/', process.env['PUBLIC_APP_URL'] || process.env['RENDER_EXTERNAL_URL'] || 'https://danlet.onrender.com').href;
const APP_ICON = new URL('icons/duet-192.png', APP_URL).href;
const APP_BADGE = new URL('icons/duet-badge.png', APP_URL).href;
function safeDestination(destination?: string) {
  if (!destination || !destination.startsWith('/?')) return APP_URL;
  const url = new URL(destination, APP_URL);
  return url.origin === new URL(APP_URL).origin ? url.href : APP_URL;
}

function isPermanentFcmTokenFailure(status: number, body: string): boolean {
  const expectedCode = status === 403 ? 'SENDER_ID_MISMATCH' : status === 404 ? 'UNREGISTERED' : null;
  if (!expectedCode) return false;
  try {
    const payload = JSON.parse(body) as { error?: { details?: unknown } } | null;
    const details = payload?.error?.details;
    return Array.isArray(details) && details.some((detail: unknown) => {
      if (!detail || typeof detail !== 'object') return false;
      const value = detail as Record<string, unknown>;
      return value['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError' && value['errorCode'] === expectedCode;
    });
  } catch { return false; }
}

export { firebasePushConfigured };
export async function assertFirebasePushReady(): Promise<void> {
  const config = firebaseCredentials();
  if (!firebasePushConfigured() || !config) throw new Error('Firebase push não configurado.');
  await firebaseAccessToken(config);
}

export async function pushTo(userIds: string[] | null, title: string, body: string, tag?: string, destination?: string) {
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
    let response: Response;
    try {
      response = await fetch('https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(creds.project_id) + '/messages:send', {
        method: 'POST',
        signal: AbortSignal.timeout(12000),
        headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            webpush: {
              fcm_options: { link: safeDestination(destination) },
              notification: {
                title, body, icon: APP_ICON, badge: APP_BADGE, lang: 'pt-BR',
                silent: false, vibrate: [130, 70, 130],
                ...(tag ? { tag, renotify: !tag.startsWith('online-') } : {}),
              },
            },
          },
        }),
      });
    } catch { throw new Error('Falha temporária na conexão com o Firebase.'); }
    if (response.ok) { sent++; continue; }
    const text = await response.text();
    const invalidToken = isPermanentFcmTokenFailure(response.status, text);
    if (!invalidToken && (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500)) {
      throw new Error('Falha temporária no envio Firebase (HTTP ' + response.status + ').');
    }
    // Don't log credentials, individual messages or sensitive device tokens.
    console.warn('[FCM] Push rejected: HTTP ' + response.status);
    if (invalidToken) {
      const { error: cleanupError } = await supabaseAdmin.from('push_tokens').delete().eq('token', token);
      if (cleanupError) throw new Error('Não foi possível remover um aparelho expirado das notificações.');
    }
  }
  return sent;
}
