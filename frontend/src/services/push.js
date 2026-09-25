import { notificationApi } from './api';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
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
    throw new Error('การแจ้งเตือนต้องเปิดจากอุปกรณ์ที่รองรับ');
  }

  if (!PUBLIC_KEY) {
    throw new Error('ระบบยังไม่ได้ตั้งค่า VAPID Public Key');
  }

  if (!window.isSecureContext) {
    throw new Error('ต้องเปิด AHA ผ่าน HTTPS เพื่อใช้การแจ้งเตือน');
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    if (isIosDevice() && !isStandalonePwa()) {
      throw new Error('iPhone/iPad ต้องเลือก “เพิ่มไปยังหน้าจอโฮม” แล้วเปิด AHA จากไอคอนบนหน้าจอโฮมก่อน จึงจะรับ Push ได้');
    }
    throw new Error('Browser นี้ไม่รองรับ Push Notification ให้ใช้ Chrome/Edge บน Android หรือเพิ่ม AHA ไปยังหน้าจอโฮมบน iPhone/iPad');
  }

  if (!('Notification' in window)) {
    throw new Error('Browser นี้ไม่รองรับ Notification API แต่ AHA ยังแสดง Popup เตือนยาได้ขณะเปิดเว็บ');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    if (permission === 'denied') {
      throw new Error('คุณบล็อก Notification ไว้ ให้เปิดสิทธิ์การแจ้งเตือนของ AHA ในการตั้งค่า Browser');
    }
    throw new Error('ยังไม่ได้อนุญาตการแจ้งเตือน');
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
    try {
      await notificationApi.pushUnsubscribe(subscription.endpoint);
    } finally {
      await subscription.unsubscribe();
    }
  }

  localStorage.setItem('aha_push_enabled', 'false');
}

export function isAhaPushEnabledLocally() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('aha_push_enabled') === 'true';
}
