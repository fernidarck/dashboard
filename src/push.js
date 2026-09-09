// Utilidades de notificaciones push (PWA) para el dashboard OneControl.

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission() {
  return (typeof Notification !== 'undefined') ? Notification.permission : 'denied';
}

// Sincroniza la suscripción existente con el backend sin volver a pedir permiso
export async function syncPushSubscription(apiBase, authToken) {
  try {
    if (!pushSupported()) return false;
    if (pushPermission() !== 'granted') return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    // Si aún no está suscrito a nivel navegador, suscribirse usando la clave VAPID
    if (!sub) {
      const keyRes = await fetch(`${apiBase}/api/push/public-key`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (!keyRes.ok) return false;
      const { publicKey } = await keyRes.json();
      if (!publicKey) return false;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    if (sub) {
      await fetch(`${apiBase}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ subscription: sub })
      });
      return true;
    }
  } catch (e) {
    console.warn('syncPushSubscription:', e.message);
  }
  return false;
}

// Registra el SW, pide permiso, se suscribe y manda la suscripción al backend.
// Devuelve { ok, reason }.
export async function enablePush(apiBase, authToken) {
  try {
    if (!pushSupported()) return { ok: false, reason: 'no-soportado' };
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: 'permiso-denegado' };

    const keyRes = await fetch(`${apiBase}/api/push/public-key`, { headers: { Authorization: `Bearer ${authToken}` } });
    const { publicKey } = await keyRes.json();
    if (!publicKey) return { ok: false, reason: 'sin-vapid' };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }
    await fetch(`${apiBase}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ subscription: sub })
    });
    return { ok: true };
  } catch (e) {
    console.error('enablePush:', e);
    return { ok: false, reason: e.message };
  }
}

// Solo registra el SW (para que las notificaciones funcionen si ya está suscrito).
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}
