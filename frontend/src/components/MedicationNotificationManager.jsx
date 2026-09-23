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

function isMedicineNotification(item) {
  return item?.type === 'medicine_reminder' && item?.related_id;
}

export default function MedicationNotificationManager() {
  const [alert, setAlert] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const handledActions = useRef(new Set());

  const showAlert = useCallback((notification) => {
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
    if (!getAccessToken() || !pushEnabled) return;

    try {
      const result = await notificationApi.unread();
      const notifications = Array.isArray(result?.data) ? result.data : [];
      const medicine = notifications.find(isMedicineNotification);
      if (medicine) showAlert(medicine);
    } catch (err) {
      if (err?.status !== 401) {
        console.warn('AHA notification polling failed:', err);
      }
    }
  }, [pushEnabled, showAlert]);

  const handleAction = useCallback(async (action, notification) => {
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
      const { action, notification } = message;
      handleAction(action, notification);
    }
  }, [handleAction, showAlert]);

  useEffect(() => {
    if (!getAccessToken()) {
      setReady(true);
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
  }, [handleServiceWorkerMessage, syncPushState]);

  useEffect(() => {
    if (!ready || !pushEnabled) return undefined;

    pollUnread();
    const timer = window.setInterval(pollUnread, 10000);
    return () => window.clearInterval(timer);
  }, [ready, pushEnabled, pollUnread]);

  useEffect(() => {
    if (!getAccessToken()) return undefined;

    const url = new URL(window.location.href);
    const action = url.searchParams.get('aha_action');
    const reminderId = url.searchParams.get('reminderId');
    const notificationId = url.searchParams.get('notificationId');

    if (!action || !reminderId || !notificationId) return undefined;

    const key = `${notificationId}:${action}`;
    if (handledActions.current.has(key)) return undefined;

    handledActions.current.add(key);
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
  }, [handleAction]);

  const togglePush = async () => {
    if (!getAccessToken()) return;

    setBusy(true);
    setError('');

    try {
      if (pushEnabled) {
        await disableAhaPush();
        setPushEnabled(false);
      } else {
        await enableAhaPush();
        setPushEnabled(true);
      }
    } catch (err) {
      setError(err?.message || 'ไม่สามารถตั้งค่าการแจ้งเตือนได้');
    } finally {
      setBusy(false);
    }
  };

  if (!getUser()) return null;

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
          right: 18,
          bottom: 18,
          zIndex: 10001,
          width: 54,
          height: 54,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,.9)',
          background: pushEnabled ? '#16a34a' : '#64748b',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          cursor: busy ? 'wait' : 'pointer',
          fontSize: 24,
        }}
      >
        {pushEnabled ? '🔔' : '🔕'}
      </button>

      {!pushEnabled && ready && (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: 82,
            zIndex: 10000,
            maxWidth: 320,
            background: '#fff',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: '0 10px 35px rgba(0,0,0,.16)',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            fontSize: 14,
          }}
        >
          <strong>เปิดการแจ้งเตือนยา</strong>
          <div style={{ marginTop: 4, color: '#475569' }}>
            เพื่อให้ AHA แจ้งเตือนแม้คุณอยู่หน้าอื่นหรือหน้าจอล็อก
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            zIndex: 10002,
            background: '#991b1b',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 12,
            maxWidth: 'calc(100vw - 40px)',
          }}
        >
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
            padding: 20,
            background: 'rgba(15,23,42,.58)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              background: '#fff',
              borderRadius: 28,
              padding: '30px 26px 24px',
              boxShadow: '0 24px 70px rgba(0,0,0,.3)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 14 }}>💊</div>
            <div style={{ fontSize: 18, color: '#64748b', marginBottom: 8 }}>AHA แจ้งเตือน</div>
            <h2 id="aha-medicine-alert-title" style={{ margin: 0, fontSize: 30, lineHeight: 1.25, color: '#0f172a' }}>
              ถึงเวลาทานยาแล้ว
            </h2>
            <p style={{ margin: '16px 0 26px', fontSize: 20, lineHeight: 1.5, color: '#334155' }}>
              {alert.message}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('snooze', alert)}
                style={{
                  minHeight: 58,
                  borderRadius: 16,
                  border: '2px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: 19,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⏰ เลื่อน 10 นาที
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('taken', alert)}
                style={{
                  minHeight: 58,
                  borderRadius: 16,
                  border: '0',
                  background: '#16a34a',
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ✓ โอเค / ทานแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
