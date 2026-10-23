// Firebase shows HTTP v1 notification payloads when the PWA is closed.
// Foreground banners are shown explicitly by the React page. Only those
// custom banners carry the marker below, so background Firebase clicks keep
// their own standard behavior without duplicate handling.
self.addEventListener('notificationclick', event => {
  const data = event.notification.data;
  if (!data || data.duetForeground !== true) return;
  event.stopImmediatePropagation();
  event.notification.close();
  let url;
  try {
    url = new URL(data.url || '/', self.location.origin);
    if (url.origin !== self.location.origin) return;
  } catch { return; }
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const candidate = all.find(client => new URL(client.url).origin === url.origin);
    if (candidate) {
      if ('navigate' in candidate) await candidate.navigate(url.href);
      await candidate.focus();
    } else {
      await self.clients.openWindow(url.href);
    }
  })());
});

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
// Notification payloads from HTTP v1 are displayed by the Firebase SDK.
// Adding showNotification here would produce duplicate background alerts.
firebase.messaging();
