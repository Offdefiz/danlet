import { supabaseAdmin } from '@/integrations/supabase/client.server';

export async function pushTo(userIds: string[] | null, title: string, body: string) {
  const auth = process.env['LOVABLE_API_KEY'];
  const key = process.env['FIREBASE_MESSAGING_API_KEY'];
  if (!auth || !key) throw new Error('Notificações não configuradas.');
  let q = supabaseAdmin.from('push_tokens').select('token');
  if (userIds) q = q.in('user_id', userIds);
  const { data } = await q;
  let sent = 0;
  for (const { token } of data ?? []) {
    const res = await fetch('https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}`, 'X-Connection-Api-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, notification: { title, body }, webpush: { fcm_options: { link: '/' } } } }),
    });
    if (res.ok) sent++;
    else if (res.status === 404 || res.status === 400) await supabaseAdmin.from('push_tokens').delete().eq('token', token);
    else console.error(`FCM [${res.status}]: ${await res.text()}`);
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
