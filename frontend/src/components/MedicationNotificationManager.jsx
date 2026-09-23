'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken, getUser } from '../services/auth';
import { notificationApi, reminderApi } from '../services/api';
import {
  disableAhaPush,
  enableAhaPush,
  getAhaPushSubscription,
  registerAhaServiceWorker,
} from '../services/push';

const SEEN_KEY = 'aha_seen_medicine_notifications';

function getSeenIds() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  } catch {
    return [];
  }
}

function rememberId(id) {
  if (!id) return;
  const next = [...new Set([...getSeenIds(), id])].slice(-100);
  localStorage.setItem(SEEN_KEY, JSON.stringify(next));
}

function normalizeNotification(item) {
  if (!item) return null;
  return {
    ...item,
    id: item.id || item.notificationId || null,
    related_id: item.related_id || item.relatedId || null,
    title: item.title || 'AHA แจ้งเตือน',
    message: item.message || 'มีการแจ้งเตือนจาก AHA',
    type: item.type || 'notification',
  };
}

function isMedicineNotification(item) {
  const n = normalizeNotification(item);
  return n?.type === 'medicine_reminder' && n.related_id;
}

export default function MedicationNotificationManager() {
  const [authenticated, setAuthenticated] = useState(false);
  const [alert, setAlert] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState('default');
  const handledActions = useRef(new Set());

  useEffect(() => {
    const syncAuth = () => {
      setAuthenticated(Boolean(getAccessToken() && getUser()));
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
    };
    syncAuth();
    const timer = window.setInterval(syncAuth, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const showAlert = useCallback((rawNotification) => {
    const notification = normalizeNotification(rawNotification);
    if (!isMedicineNotification(notification)) return;
    if (getSeenIds().includes(notification.id)) return;
    rememberId(notification.id);
    setAlert(notification);
  }, []);

  const syncPushState = useCallback(async () => {
    if (!getAccessToken()) {
      setPushEnabled(false);
      setReady(true);
      return;
    }

    try {
      await registerAhaServiceWorker();
      const status = await notificationApi.pushStatus();
      const subscription = await getAhaPushSubscription();
      const enabled = Boolean(status?.subscribed && subscription);
      setPushEnabled(enabled);
      localStorage.setItem('aha_push_enabled', String(enabled));
    } catch (err) {
      console.warn('AHA push status unavailable:', err);
      setPushEnabled(false);
    } finally {
      setReady(true);
    }
  }, []);

  const pollUnread = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const result = await notificationApi.unread();
      const notifications = Array.isArray(result?.data) ? result.data : [];
      const medicine = notifications.find(isMedicineNotification);
      if (medicine) showAlert(medicine);
    } catch (err) {
      if (err?.status !== 401) console.warn('AHA notification polling failed:', err);
    }
  }, [showAlert]);

  const handleAction = useCallback(async (action, rawNotification) => {
    const notification = normalizeNotification(rawNotification);
    if (!notification?.id || !notification?.related_id) return;

    const actionKey = `${notification.id}:${action}`;
    if (handledActions.current.has(actionKey)) return;
    handledActions.current.add(actionKey);
    setBusy(true);
    setError('');

    try {
      if (action === 'taken') {
        await reminderApi.markTaken(notification.related_id);
        await notificationApi.markRead(notification.id);
        setAlert(null);
      } else if (action === 'snooze') {
        await reminderApi.snooze(notification.related_id, 10);
        await notificationApi.markRead(notification.id);
        setAlert(null);
      } else {
        await notificationApi.markRead(notification.id);
        setAlert(null);
      }
    } catch (err) {
      handledActions.current.delete(actionKey);
      setError(err?.message || 'ไม่สามารถบันทึกการตอบสนองได้');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleServiceWorkerMessage = useCallback((event) => {
    const message = event?.data;
    if (!message) return;

    if (message.type === 'AHA_MEDICINE_REMINDER' && message.notification) {
      showAlert(message.notification);
    }

    if (message.type === 'AHA_NOTIFICATION_ACTION') {
      handleAction(message.action, message.notification);
    }
  }, [handleAction, showAlert]);

  useEffect(() => {
    if (!authenticated) {
      setPushEnabled(false);
      setReady(false);
      setAlert(null);
      return undefined;
    }

    syncPushState();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [authenticated, handleServiceWorkerMessage, syncPushState]);

  useEffect(() => {
    if (!ready) return undefined;
    pollUnread();
    const timer = window.setInterval(pollUnread, 3000);
    return () => window.clearInterval(timer);
  }, [ready, pollUnread]);

  useEffect(() => {
    if (!authenticated) return undefined;

    const url = new URL(window.location.href);
    const action = url.searchParams.get('aha_action');
    const reminderId = url.searchParams.get('reminderId');
    const notificationId = url.searchParams.get('notificationId');
    if (!action || !reminderId || !notificationId) return undefined;

    handleAction(action, {
      id: notificationId,
      related_id: reminderId,
      type: 'medicine_reminder',
    });

    url.searchParams.delete('aha_action');
    url.searchParams.delete('reminderId');
    url.searchParams.delete('notificationId');
    window.history.replaceState({}, '', url.toString());
    return undefined;
  }, [authenticated, handleAction]);

  const togglePush = async () => {
    if (!authenticated) return;
    setBusy(true);
    setError('');
    try {
      if (pushEnabled) {
        await disableAhaPush();
        setPushEnabled(false);
        setPermission('default');
      } else {
        await enableAhaPush();
        setPushEnabled(true);
        setPermission('granted');
      }
    } catch (err) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
      setError(err?.message || 'ไม่สามารถตั้งค่าการแจ้งเตือนได้');
    } finally {
      setBusy(false);
    }
  };

  if (!authenticated) return null;

  return (
    <>
      <button
        type="button"
        onClick={togglePush}
        disabled={busy}
        aria-label={pushEnabled ? 'ปิดการแจ้งเตือน AHA' : 'เปิดการแจ้งเตือน AHA'}
        title={pushEnabled ? 'ปิดการแจ้งเตือน' : 'เปิดการแจ้งเตือน'}
        style={{
          position: 'fixed',
          right: 14,
          top: 'max(76px, env(safe-area-inset-top) + 62px)',
          zIndex: 10001,
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,.95)',
          background: pushEnabled ? '#0ea981' : '#64748b',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          cursor: busy ? 'wait' : 'pointer',
          fontSize: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <img src="/icons/aha-icon.svg" alt="" width="29" height="29" style={{ borderRadius: 8 }} />
        <span style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, borderRadius: '50%', background: pushEnabled ? '#16a34a' : '#64748b', border: '2px solid #fff' }} />
      </button>

      {!pushEnabled && ready && (
        <div style={{
          position: 'fixed',
          right: 14,
          top: 'max(132px, env(safe-area-inset-top) + 118px)',
          zIndex: 10000,
          width: 'min(330px, calc(100vw - 28px))',
          background: '#fff',
          borderRadius: 16,
          padding: '13px 15px',
          boxShadow: '0 10px 35px rgba(0,0,0,.16)',
          border: '1px solid #dbe5ee',
          color: '#0f172a',
          fontSize: 15,
        }}>
          <strong>เปิดการแจ้งเตือนยา</strong>
          <div style={{ marginTop: 4, color: '#475569', lineHeight: 1.45 }}>
            {permission === 'denied'
              ? 'การแจ้งเตือนถูกบล็อก ให้เปิด Notification ในการตั้งค่า Browser แล้วลองอีกครั้ง'
              : 'กดปุ่มนี้เพื่ออนุญาตให้ AHA แจ้งเตือนเมื่อถึงเวลาทานยา'}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{
          position: 'fixed', left: '50%', bottom: 'max(18px, env(safe-area-inset-bottom) + 18px)', transform: 'translateX(-50%)',
          zIndex: 10002, background: '#991b1b', color: '#fff', padding: '12px 16px',
          borderRadius: 12, maxWidth: 'calc(100vw - 40px)', fontSize: 16, lineHeight: 1.4,
        }}>
          {error}
        </div>
      )}

      {alert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="aha-medicine-alert-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10003,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(15,23,42,.62)',
            backdropFilter: 'blur(5px)',
          }}
        >
          <div style={{
            width: 'min(520px, 100%)',
            background: '#fff',
            borderRadius: 26,
            padding: '26px 22px 22px',
            boxShadow: '0 24px 70px rgba(0,0,0,.3)',
            textAlign: 'center',
            border: `4px solid ${alert.title?.includes('เลยเวลา') ? '#f59e0b' : '#0ea981'}`,
          }}>
            <img src="/icons/aha-icon.svg" alt="AHA" width="70" height="70" style={{ display: 'block', margin: '0 auto 12px', borderRadius: 18 }} />
            <div style={{ fontSize: 18, color: alert.title?.includes('เลยเวลา') ? '#b45309' : '#0b7d63', fontWeight: 800, marginBottom: 7 }}>
              {alert.title || 'AHA แจ้งเตือน'}
            </div>
            <h2 id="aha-medicine-alert-title" style={{ margin: 0, fontSize: 'clamp(28px, 6vw, 36px)', lineHeight: 1.2, color: '#0f172a', fontWeight: 900 }}>
              {alert.title?.includes('เลยเวลา') ? 'เลยเวลาทานยาแล้ว' : 'ถึงเวลาทานยาแล้ว'}
            </h2>
            <p style={{ margin: '14px 0 24px', fontSize: 'clamp(20px, 4.5vw, 24px)', lineHeight: 1.55, color: '#334155', fontWeight: 700 }}>
              {alert.message}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('snooze', alert)}
                style={{
                  minHeight: 64,
                  borderRadius: 15,
                  border: '2px solid #168ee0',
                  background: '#eef8ff',
                  color: '#075b95',
                  fontSize: 'clamp(17px, 4vw, 21px)',
                  fontWeight: 900,
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                เลื่อน 10 นาที
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('taken', alert)}
                style={{
                  minHeight: 64,
                  borderRadius: 15,
                  border: 0,
                  background: '#0ea981',
                  color: '#fff',
                  fontSize: 'clamp(18px, 4vw, 22px)',
                  fontWeight: 900,
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                ทานยาแล้ว
              </button>
            </div>

            <div style={{ marginTop: 13, color: '#64748b', fontSize: 15, lineHeight: 1.45 }}>
              หากยังไม่ยืนยัน ระบบจะแจ้งเตือนอีกครั้งเมื่อเลยเวลา 10 นาที
            </div>
          </div>
        </div>
      )}
    </>
  );
}
