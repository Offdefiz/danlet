importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
// Notification payloads from HTTP v1 are displayed by the Firebase SDK.
// Adding showNotification here would produce duplicate background alerts.
firebase.messaging();
