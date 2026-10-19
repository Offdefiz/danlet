import { supabaseAdmin } from '@/integrations/supabase/client.server';

export async function pushTo(userIds: string[] | null, title: string, body: string, tag?: string) {
  const auth = process.env['LOVABLE_API_KEY'];
  const key = process.env['FIREBASE_MESSAGING_API_KEY'];
  if (!auth || !key) throw new Error('Notificações não configuradas.');
  let q = supabaseAdmin.from('push_tokens').select('token');
  if (userIds) q = q.in('user_id', userIds);
  const { data, error } = await q;
  if (error) throw error;
  const { data: disabled, error: preferenceError } = await supabaseAdmin.from('notification_preferences').select('user_id').eq('enabled', false);
  if (preferenceError) throw preferenceError;
  const disabledIds = new Set((disabled ?? []).map(p => p.user_id));
  const { data: tokenOwners, error: ownerError } = await supabaseAdmin.from('push_tokens').select('token,user_id');
  if (ownerError) throw ownerError;
  const blockedTokens = new Set((tokenOwners ?? []).filter(p => disabledIds.has(p.user_id)).map(p => p.token));
  let sent = 0;
  for (const { token } of data ?? []) {
    if (blockedTokens.has(token)) continue;
    const res = await fetch('https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}`, 'X-Connection-Api-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, notification: { title, body }, webpush: { fcm_options: { link: 'https://danlet.lovable.app/' }, notification: { silent: false, vibrate: [200, 100, 200], ...(tag ? { tag, renotify: !tag.startsWith('online-') } : {}) } } } }),
    });
    if (res.ok) sent++;
    else {
      const text = await res.text();
      console.error(`FCM [${res.status}]: ${text}`);
      if (text.includes('UNREGISTERED') || (res.status === 400 && text.includes('registration token'))) await supabaseAdmin.from('push_tokens').delete().eq('token', token);
    }
  }
  return sent;
}

export const inspirations = [
  'Pequenos passos juntos constroem o grande dia. ♡',
  'Que tal curtir um local novo no Dream Match hoje?',
  'O amor também mora nos planos. Deem uma olhadinha nas metas.',
  'Cada escolha a dois é um pedacinho do nosso futuro.',
  'Um jardim floresce com cuidado diário — assim como vocês.',
  'Mande um oi carinhoso no chat do Duet hoje.',
  'Sonhar junto é o primeiro passo para realizar junto.',
];
