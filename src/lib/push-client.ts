import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';

// Prefer credentials belonging to the Duet owners; legacy public settings are
// supported temporarily while devices move to a self-managed Firebase project.
const env = import.meta.env;
const first = (...values: (string | undefined)[]) => values.find(Boolean) ?? '';
const appId = first(env['VITE_FIREBASE_APP_ID'], env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID']);
const vapidKey = first(env['VITE_FIREBASE_VAPID_KEY'], env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY']);
const config = {
  apiKey: first(env['VITE_FIREBASE_API_KEY'], env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY']),
  projectId: first(env['VITE_FIREBASE_PROJECT_ID'], env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID']),
  appId,
  messagingSenderId: first(env['VITE_FIREBASE_MESSAGING_SENDER_ID'], appId.split(':')[1]),
};

export type PushStatus = 'registered' | 'not-configured' | 'unsupported' | 'open-in-new-tab' | 'denied';

export async function enablePush(userId: string): Promise<PushStatus> {
  if (!config.apiKey || !config.projectId || !config.appId || !vapidKey || !config.messagingSenderId) return 'not-configured';
  if (!('Notification' in window) || !(await isSupported())) return 'unsupported';
  if (window.top !== window.self) return 'open-in-new-tab';
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(config)}`);
  const app = getApps().find(a => a.name === 'duet-push') ?? initializeApp(config, 'duet-push');
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return 'denied';
  const { error } = await supabase.from('push_tokens').upsert({ token, user_id: userId });
  if (error) throw new Error('Não foi possível salvar este aparelho para receber avisos.');
  return 'registered';
}
