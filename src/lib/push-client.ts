import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';

// Prefer credentials belonging to the Duet owners; legacy public settings are
// supported temporarily while devices move to a self-managed Firebase project.
const env = import.meta.env;
const ownProject = ['API_KEY', 'PROJECT_ID', 'APP_ID', 'MESSAGING_SENDER_ID', 'VAPID_KEY']
  .some(key => Boolean(env[`VITE_FIREBASE_${key}`]?.trim()));
// Select one complete configuration; mixing projects produces invalid FCM tokens.
const setting = (name: string, legacy: string) =>
  (env[ownProject ? `VITE_FIREBASE_${name}` : `VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_${legacy}`] ?? '').trim();
const appId = setting('APP_ID', 'APP_ID');
const vapidKey = setting('VAPID_KEY', 'VAPID_KEY');
const config = {
  apiKey: setting('API_KEY', 'WEB_API_KEY'),
  projectId: setting('PROJECT_ID', 'PROJECT_ID'),
  appId,
  messagingSenderId: setting('MESSAGING_SENDER_ID', 'SENDER_ID') || appId.split(':')[1] || '',
};

function validVapidKey(key: string) {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(key)) return false;
  try {
    const bytes = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
    return bytes.length === 65 && bytes.charCodeAt(0) === 4;
  } catch { return false; }
}

async function activatedWorker(registration: ServiceWorkerRegistration) {
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (worker?.state === 'activated') return;
  if (!worker || worker.state === 'redundant') throw new Error('Não foi possível ativar o service worker de notificações.');
  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      worker.removeEventListener('statechange', changed);
      if (error) reject(error); else resolve();
    };
    const changed = () => {
      if (worker.state === 'activated') finish();
      else if (worker.state === 'redundant') finish(new Error('O service worker de notificações foi interrompido.'));
    };
    const timeout = setTimeout(() => finish(new Error('Tempo esgotado ao ativar o service worker de notificações.')), 20_000);
    worker.addEventListener('statechange', changed);
    changed();
  });
}

export type PushStatus = 'registered' | 'not-configured' | 'unsupported' | 'open-in-new-tab' | 'install-required' | 'denied';

export async function enablePush(userId: string): Promise<PushStatus> {
  if (!config.apiKey || !config.projectId || !config.appId || !validVapidKey(vapidKey) || !config.messagingSenderId) return 'not-configured';
  if (window.top !== window.self) return 'open-in-new-tab';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !installed) return 'install-required';
  if (!window.isSecureContext || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  // Safari requires the permission request to stay inside the original tap.
  // Do not await Firebase's asynchronous capability check before this call.
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  if (!(await isSupported())) return 'unsupported';
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(config)}`, { updateViaCache: 'none' });
  await activatedWorker(reg);
  // Firebase reuses a browser subscription even when its VAPID key changes.
  // Renew only this device's subscription when moving to the selected project.
  const subscription = await reg.pushManager.getSubscription();
  if (subscription) {
    const currentKey = subscription.options.applicationServerKey;
    const wantedKey = atob(vapidKey.replace(/-/g, '+').replace(/_/g, '/'));
    const currentBytes = currentKey ? new Uint8Array(currentKey) : new Uint8Array();
    const matches = currentBytes.length === wantedKey.length && currentBytes.every((byte, i) => byte === wantedKey.charCodeAt(i));
    if (!matches && !(await subscription.unsubscribe())) throw new Error('Não foi possível atualizar as notificações deste aparelho.');
  }
  const app = getApps().find(a => a.name === 'duet-push') ?? initializeApp(config, 'duet-push');
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return 'denied';
  const { error } = await supabase.from('push_tokens').upsert({ token, user_id: userId });
  if (error) throw new Error('Não foi possível salvar este aparelho para receber avisos.');
  return 'registered';
}
