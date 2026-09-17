/* Service Worker OneControl — recibe push y abre la app al tocar la notificación.
   Funciona con la app cerrada / celular bloqueado (no si está totalmente apagado). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'OneControl', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'OneControl';
  const url = data.url || '/';
  const chatId = data.chatId || (url && url.includes('chat=') ? (new URL(url, 'http://localhost')).searchParams.get('chat') : null);
  const urgent = (data.level || 'urgent') === 'urgent';
  const options = {
    body: data.body || '',
    icon: '/logo-onecontrol.png',
    badge: '/logo-onecontrol.png',
    data: { url, chatId },
    // Urgente (handoff/pedido): vibra fuerte y se queda en pantalla. Normal (interesado): más suave.
    vibrate: urgent ? [300, 120, 300, 120, 300] : [200, 100, 200],
    renotify: true,
    requireInteraction: urgent,
    silent: false,
    tag: data.tag || (chatId ? `onecontrol-chat-${chatId}` : ('onecontrol-' + Date.now()))
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const url = notifData.url || '/';
  const chatId = notifData.chatId || null;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          if (client.postMessage) {
            client.postMessage({ type: 'OPEN_CHAT', chatId, url });
          }
          if (client.navigate && client.url && !client.url.includes(`chat=${chatId}`)) {
            client.navigate(url);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
