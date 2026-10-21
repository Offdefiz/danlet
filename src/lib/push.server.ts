import { supabaseAdmin } from '@/integrations/supabase/client.server';

// Prefer the Render origin or a configured custom domain when independently hosted.
const APP_URL = new URL('/', process.env['PUBLIC_APP_URL'] || process.env['RENDER_EXTERNAL_URL'] || 'https://danlet.lovable.app').href;
const APP_ICON = `${APP_URL}icons/duet-192.png`;
const APP_BADGE = `${APP_URL}icons/duet-badge.png`;

/** FCM renders inside the OS: we control text/icons, not Apple's system chrome. */
export async function pushTo(userIds: string[] | null, title: string, body: string, tag?: string) {
  const auth = process.env['LOVABLE_API_KEY'];
  const key = process.env['FIREBASE_MESSAGING_API_KEY'];
  if (!auth || !key) throw new Error('Notificações não configuradas.');
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
    const res = await fetch('https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}`, 'X-Connection-Api-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body, image: undefined },
          webpush: {
            fcm_options: { link: APP_URL },
            notification: {
              title, body, icon: APP_ICON, badge: APP_BADGE,
              lang: 'pt-BR', dir: 'ltr', silent: false,
              vibrate: [130, 70, 130],
              ...(tag ? { tag, renotify: !tag.startsWith('online-') } : {}),
            },
          },
        },
      }),
    });
    if (res.ok) sent++;
    else {
      const message = await res.text();
      console.error(`FCM [${res.status}]: ${message}`);
      if (message.includes('UNREGISTERED') || (res.status === 400 && message.includes('registration token')))
        await supabaseAdmin.from('push_tokens').delete().eq('token', token);
    }
  }
  return sent;
}
