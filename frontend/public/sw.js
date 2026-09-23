self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function getWindowClients() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
}

async function postToClients(message) {
  const clients = await getWindowClients();
  for (const client of clients) {
    client.postMessage(message);
  }
  return clients;
}

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'AHA',
      message: event.data ? event.data.text() : 'มีการแจ้งเตือนใหม่',
    };
  }

  event.waitUntil((async () => {
    const clients = await getWindowClients();
    const hasVisibleClient = clients.some((client) => client.visibilityState === 'visible');

    if (payload.type === 'medicine_reminder') {
      await postToClients({
        type: 'AHA_MEDICINE_REMINDER',
        notification: payload,
      });
    }

    if (hasVisibleClient) {
      return;
    }

    const actions = Array.isArray(payload.actions) && payload.actions.length
      ? payload.actions
      : payload.type === 'medicine_reminder'
        ? [
            { action: 'snooze', title: 'เลื่อน 10 นาที' },
            { action: 'taken', title: 'ทานยาแล้ว' },
          ]
        : [];

    await self.registration.showNotification(payload.title || 'AHA', {
      body: payload.message || 'มีการแจ้งเตือนใหม่จาก AHA',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.notificationId || `aha-${Date.now()}`,
      renotify: true,
      requireInteraction: payload.type === 'medicine_reminder',
      vibrate: payload.type === 'medicine_reminder' ? [300, 150, 300, 150, 500] : [200, 100, 200],
      actions,
      data: payload,
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action || 'open';
  const data = event.notification.data || {};

  event.waitUntil((async () => {
    const clients = await getWindowClients();
    const target = clients.find((client) => 'focus' in client);

    if (target) {
      await target.focus();
      target.postMessage({
        type: 'AHA_NOTIFICATION_ACTION',
        action,
        notification: data,
      });
      return;
    }

    const url = new URL(data.url || '/', self.location.origin);

    if (action === 'taken' || action === 'snooze') {
      url.searchParams.set('aha_action', action);
      if (data.relatedId) url.searchParams.set('reminderId', data.relatedId);
      if (data.notificationId) url.searchParams.set('notificationId', data.notificationId);
    }

    await self.clients.openWindow(url.toString());
  })());
});
