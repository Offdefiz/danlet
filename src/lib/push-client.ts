import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';

const appId = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID'] as string | undefined;
const vapidKey = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY'] as string | undefined;
const config = {
  apiKey: (import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY'] as string | undefined) ?? '',
  projectId: (import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID'] as string | undefined) ?? '',
  appId: appId ?? '',
  messagingSenderId: appId?.split(':')[1] ?? '',
};

export type PushStatus = 'registered' | 'not-configured' | 'unsupported' | 'open-in-new-tab' | 'denied';

export async function enablePush(userId: string): Promise<PushStatus> {
  if (!config.apiKey || !config.projectId || !vapidKey || !config.messagingSenderId) return 'not-configured';
  if (!('Notification' in window) || !(await isSupported())) return 'unsupported';
  if (window.top !== window.self) return 'open-in-new-tab';
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(config)}`);
  const app = getApps()[0] ?? initializeApp(config);
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return 'denied';
  await supabase.from('push_tokens').upsert({ token, user_id: userId });
  return 'registered';
}
