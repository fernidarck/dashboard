/* Service Worker OneControl — recibe push y abre la app al tocar la notificación.
   Funciona con la app cerrada / celular bloqueado (no si está totalmente apagado). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'OneControl', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'OneControl';
  const options = {
    body: data.body || '',
    icon: '/logo-onecontrol.png',
    badge: '/logo-onecontrol.png',
    data: { url: data.url || '/' },
    vibrate: [300, 120, 300, 120, 300],
    renotify: true,
    requireInteraction: true, // se queda en pantalla hasta que la toques (no desaparece sola)
    silent: false,            // que suene/vibre (no silenciosa)
    tag: 'onecontrol-' + Date.now()
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) { c.navigate && c.navigate(url); return c.focus(); } }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
