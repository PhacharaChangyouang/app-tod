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
  for (const client of clients) client.postMessage(message);
  return clients;
}

function normalizePayload(payload) {
  return {
    ...payload,
    notificationId: payload.notificationId || payload.notification_id || payload.id || null,
    relatedId: payload.relatedId || payload.related_id || null,
    title: payload.title || 'AHA',
    message: payload.message || payload.body || 'มีการแจ้งเตือนจาก AHA',
  };
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

  payload = normalizePayload(payload);

  event.waitUntil((async () => {
    const clients = await getWindowClients();
    const hasVisibleClient = clients.some((client) => client.visibilityState === 'visible');

    if (payload.type === 'medicine_reminder') {
      await postToClients({
        type: 'AHA_MEDICINE_REMINDER',
        notification: {
          id: payload.notificationId,
          related_id: payload.relatedId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
        },
      });
    }

    if (hasVisibleClient) return;

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
      icon: '/icons/aha-icon.svg',
      badge: '/icons/aha-icon.svg',
      image: '/icons/aha-icon.svg',
      tag: payload.notificationId || `aha-${Date.now()}`,
      renotify: true,
      requireInteraction: payload.type === 'medicine_reminder',
      vibrate: payload.type === 'medicine_reminder' ? [300, 150, 300, 150, 500] : [200, 100, 200],
      actions,
      data: {
        ...payload,
        related_id: payload.relatedId,
        notification_id: payload.notificationId,
      },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action || 'open';
  const data = event.notification.data || {};
  const reminderId = data.related_id || data.relatedId || null;
  const notificationId = data.notification_id || data.notificationId || null;

  event.waitUntil((async () => {
    const clients = await getWindowClients();
    const target = clients.find((client) => 'focus' in client);

    if (target) {
      await target.focus();
      target.postMessage({
        type: 'AHA_NOTIFICATION_ACTION',
        action,
        notification: {
          id: notificationId,
          related_id: reminderId,
          type: data.type,
          title: data.title,
          message: data.message,
        },
      });
      return;
    }

    const url = new URL(data.url || '/', self.location.origin);
    if (action === 'taken' || action === 'snooze') {
      url.searchParams.set('aha_action', action);
      if (reminderId) url.searchParams.set('reminderId', reminderId);
      if (notificationId) url.searchParams.set('notificationId', notificationId);
    }

    await self.clients.openWindow(url.toString());
  })());
});
