import { notificationApi } from './api';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function registerAhaServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function getAhaPushSubscription() {
  const registration = await registerAhaServiceWorker();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function enableAhaPush() {
  if (typeof window === 'undefined') {
    throw new Error('Push is only available in the browser');
  }

  if (!PUBLIC_KEY) {
    throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured');
  }

  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  if (!('PushManager' in window)) {
    throw new Error('This browser does not support push notifications');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  const registration = await registerAhaServiceWorker();
  if (!registration) throw new Error('Service worker is unavailable');

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
    });
  }

  await notificationApi.pushSubscribe(subscription.toJSON());
  localStorage.setItem('aha_push_enabled', 'true');

  return subscription;
}

export async function disableAhaPush() {
  const subscription = await getAhaPushSubscription();
  if (subscription) {
    await notificationApi.pushUnsubscribe(subscription.endpoint);
    await subscription.unsubscribe();
  }

  localStorage.setItem('aha_push_enabled', 'false');
}

export function isAhaPushEnabledLocally() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('aha_push_enabled') === 'true';
}
