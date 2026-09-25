'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getUser, saveSession } from '../services/auth';
import { authApi, notificationApi, reminderApi } from '../services/api';
import {
  disableAhaPush,
  enableAhaPush,
  getAhaPushSubscription,
  registerAhaServiceWorker,
} from '../services/push';

const SEEN_KEY = 'aha_seen_medicine_notifications';

function getSeenIds() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
}
function rememberId(id) {
  if (!id) return;
  localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...getSeenIds(), id])].slice(-100)));
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
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [alert, setAlert] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState('default');
  const [showPushHint,setShowPushHint]=useState(true);
  const [showBell,setShowBell]=useState(true);
  const handledActions = useRef(new Set());
  const bellDrag = useRef({ active:false, moved:false, pointerId:null, dx:0, dy:0 });
  const [bellPosition,setBellPosition]=useState(null);

  useEffect(() => {
    if (!authenticated) return undefined;
    setShowBell(true); setShowPushHint(true);
    const timer = window.setTimeout(() => { setShowBell(false); setShowPushHint(false); }, 5000);
    return () => window.clearTimeout(timer);
  }, [authenticated]);

  useEffect(() => {
    try { const saved=JSON.parse(localStorage.getItem('aha_bell_position') || 'null'); if(saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setBellPosition(saved); } catch (_) {}
  }, []);

  const startBellDrag = (event) => {
    if (busy) return;
    const rect=event.currentTarget.getBoundingClientRect();
    bellDrag.current={active:true,moved:false,pointerId:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveBell = (event) => {
    if(!bellDrag.current.active) return;
    const x=Math.max(6,Math.min(window.innerWidth-58,event.clientX-bellDrag.current.dx));
    const y=Math.max(6,Math.min(window.innerHeight-58,event.clientY-bellDrag.current.dy));
    if(Math.abs(event.movementX||0)+Math.abs(event.movementY||0)>1) bellDrag.current.moved=true;
    setBellPosition({x,y});
  };
  const endBellDrag = () => {
    if(!bellDrag.current.active) return;
    if(bellPosition) localStorage.setItem('aha_bell_position',JSON.stringify(bellPosition));
    window.setTimeout(()=>{bellDrag.current.active=false;bellDrag.current.moved=false;},0);
  };

  useEffect(() => {
    let active = true;
    const syncAuth = () => {
      if (!active) return;
      setAuthenticated(Boolean(getUser()));
      if (typeof window !== 'undefined' && 'Notification' in window) setPermission(Notification.permission);
    };
    const restoreAuth = async () => {
      try {
        const result = await authApi.me();
        if (active && result?.user) saveSession({ user: result.user });
      } catch (_) {}
      syncAuth();
    };
    restoreAuth();
    window.addEventListener('aha-auth-change', syncAuth);
    return () => { active = false; window.removeEventListener('aha-auth-change', syncAuth); };
  }, []);

  const showAlert = useCallback((rawNotification) => {
    const notification = normalizeNotification(rawNotification);
    if (!isMedicineNotification(notification)) return;
    if (getSeenIds().includes(notification.id)) return;
    rememberId(notification.id);
    setAlert(notification);
  }, []);

  const syncPushState = useCallback(async () => {
    if (!getUser()) {
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
    if (!getUser()) return;
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
    if (message.type === 'AHA_MEDICINE_REMINDER' && message.notification) showAlert(message.notification);
    if (message.type === 'AHA_NOTIFICATION_ACTION') handleAction(message.action, message.notification);
  }, [handleAction, showAlert]);

  useEffect(() => {
    if (!authenticated) {
      setPushEnabled(false);
      setReady(false);
      setAlert(null);
      return undefined;
    }
    syncPushState();
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
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
    handleAction(action, { id: notificationId, related_id: reminderId, type: 'medicine_reminder' });
    url.searchParams.delete('aha_action');
    url.searchParams.delete('reminderId');
    url.searchParams.delete('notificationId');
    window.history.replaceState({}, '', url.toString());
    return undefined;
  }, [authenticated, handleAction]);

  const openNotificationSettings = () => {
    if (bellDrag.current.moved) return;
    router.push('/profile');
  };

  if (!authenticated) return null;

  return (
    <>
      {showBell && <button
        type="button"
        onClick={openNotificationSettings}
        onPointerDown={startBellDrag}
        onPointerMove={moveBell}
        onPointerUp={endBellDrag}
        onPointerCancel={endBellDrag}
        onContextMenu={(event)=>event.preventDefault()}
        aria-label="ไปตั้งค่าการแจ้งเตือนยา"
        title="ตั้งค่าการแจ้งเตือนยา"
        style={{
          position: 'fixed', ...(bellPosition ? {left:bellPosition.x,top:bellPosition.y,right:'auto'} : {right:14,top:'max(76px, env(safe-area-inset-top) + 62px)'}), zIndex: 10050,
          width: 52, height: 52, borderRadius: '50%', border: '1px solid #d8eaf2',
          background: 'rgba(255,255,255,.96)', color: '#0f9b76', boxShadow: '0 8px 22px rgba(28,108,148,.16)',
          cursor: busy ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, fontSize: 29, lineHeight: 1, touchAction:'none', userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none',
        }}
      >
        <span className="aha-notification-emoji" aria-hidden="true">🔔</span>
        <span className="aha-notification-status" aria-hidden="true" />
      </button>}

      {showBell && showPushHint && ready && (
        <div style={{ position: 'fixed', right: 14, top: 'max(132px, env(safe-area-inset-top) + 118px)', zIndex: 10000, width: 'min(330px, calc(100vw - 28px))', background: '#fff', borderRadius: 16, padding: '13px 15px', boxShadow: '0 10px 35px rgba(0,0,0,.16)', border: '1px solid #dbe5ee', color: '#0f172a', fontSize: 15 }}>
          <strong>อย่าลืมตั้งค่าการแจ้งเตือนยา</strong>
          <div style={{ marginTop: 4, color: '#475569', lineHeight: 1.45 }}>
            {permission === 'denied' ? 'การแจ้งเตือนถูกบล็อก สามารถจัดการได้จากหน้าโปรไฟล์และการตั้งค่า Browser' : 'แตะกระดิ่งเพื่อไปเปิดหรือปิดการแจ้งเตือนยาในหน้าโปรไฟล์ ข้อความนี้จะหายไปใน 5 วินาที'}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ position: 'fixed', left: '50%', bottom: 'max(18px, env(safe-area-inset-bottom) + 18px)', transform: 'translateX(-50%)', zIndex: 10052, background: '#991b1b', color: '#fff', padding: '12px 16px', borderRadius: 12, maxWidth: 'calc(100vw - 40px)', fontSize: 16, lineHeight: 1.4 }}>
          {error}
        </div>
      )}

      {alert && (
        <div role="dialog" aria-modal="true" aria-labelledby="aha-medicine-alert-title" style={{ position: 'fixed', inset: 0, zIndex: 10003, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(15,23,42,.62)', backdropFilter: 'blur(5px)' }}>
          <div style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 26, padding: '26px 22px 22px', boxShadow: '0 24px 70px rgba(0,0,0,.3)', textAlign: 'center', border: `4px solid ${alert.title?.includes('เลยเวลา') ? '#f59e0b' : '#0ea981'}` }}>
            <Image src="/icons/aha-icon.svg" alt="AHA" width={70} height={70} style={{ display: 'block', margin: '0 auto 12px', borderRadius: 18 }} />
            <div style={{ fontSize: 18, color: alert.title?.includes('เลยเวลา') ? '#b45309' : '#0b7d63', fontWeight: 800, marginBottom: 7 }}>{alert.title || 'AHA แจ้งเตือน'}</div>
            <h2 id="aha-medicine-alert-title" style={{ margin: 0, fontSize: 'clamp(28px, 6vw, 36px)', lineHeight: 1.2, color: '#0f172a', fontWeight: 900 }}>{alert.title?.includes('เลยเวลา') ? 'เลยเวลาทานยาแล้ว' : 'ถึงเวลาทานยาแล้ว'}</h2>
            <p style={{ margin: '14px 0 24px', fontSize: 'clamp(20px, 4.5vw, 24px)', lineHeight: 1.55, color: '#334155', fontWeight: 700 }}>{alert.message}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button type="button" disabled={busy} onClick={() => handleAction('snooze', alert)} style={{ minHeight: 64, borderRadius: 15, border: '2px solid #168ee0', background: '#eef8ff', color: '#075b95', fontSize: 'clamp(17px, 4vw, 21px)', fontWeight: 900, cursor: busy ? 'wait' : 'pointer' }}>เลื่อน 10 นาที</button>
              <button type="button" disabled={busy} onClick={() => handleAction('taken', alert)} style={{ minHeight: 64, borderRadius: 15, border: 0, background: '#0ea981', color: '#fff', fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 900, cursor: busy ? 'wait' : 'pointer' }}>ทานยาแล้ว</button>
            </div>
            <div style={{ marginTop: 13, color: '#64748b', fontSize: 15, lineHeight: 1.45 }}>หากยังไม่ยืนยัน ระบบจะแจ้งเตือนอีกครั้งเมื่อเลยเวลา 10 นาที</div>
          </div>
        </div>
      )}
    </>
  );
}
