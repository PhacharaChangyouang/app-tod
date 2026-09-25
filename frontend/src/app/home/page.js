'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AhaIcon from '../../components/AhaIcon';
import { saveSession } from '../../services/auth';
import { authApi, caregiverApi, reminderApi, notificationApi } from '../../services/api';

function listOf(response, key) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.[key])) return response[key];
  return [];
}

function timeOf(value) { return String(value || '').slice(0, 5) || '--:--'; }

function Brand() {
  return <div className="aha-v3-brand"><span className="aha-v3-brand-mark" aria-hidden="true"><span className="aha-v3-brand-wave">⌁</span></span><span><strong>AHA</strong><small>AI Health Assistant</small></span></div>;
}

function StatusPill({ done, current }) {
  return <span className={`aha-v3-status ${done ? 'done' : current ? 'wait' : 'later'}`}>{done ? 'กินแล้ว' : current ? 'รอถึงเวลา' : 'รออยู่'}</span>;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [caregiverSummary, setCaregiverSummary] = useState({ elderly: [], today: [], history: [] });
  const [voice, setVoice] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let currentUser = null;
    let mounted = true;
    const syncAvatar = () => { if (currentUser?.id) setAvatar(localStorage.getItem(`aha_avatar_${currentUser.id}`) || ''); };
    window.addEventListener('focus', syncAvatar);
    window.addEventListener('storage', syncAvatar);
    authApi.me().then(async (result) => {
      currentUser = result?.user || null;
      if (!mounted || !currentUser) return;
      saveSession({ user: currentUser });
      setUser(currentUser);
      syncAvatar();
      const dataPromise = currentUser.role === 'caregiver' ? caregiverApi.summary() : reminderApi.today();
      const [dataResult, notificationResult] = await Promise.allSettled([dataPromise, notificationApi.unread()]);
      if (!mounted) return;
      if (dataResult.status === 'fulfilled') {
        if (currentUser.role === 'caregiver') setCaregiverSummary(dataResult.value?.data || { elderly: [], today: [], history: [] });
        else setReminders(listOf(dataResult.value, 'reminders'));
      }
      if (notificationResult.status === 'fulfilled') setNotifications(listOf(notificationResult.value, 'notifications'));
      if (dataResult.status === 'rejected' && notificationResult.status === 'rejected') setError('ยังเชื่อมต่อข้อมูลล่าสุดไม่ได้');
    }).catch(() => { if (mounted) router.replace('/login'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; window.removeEventListener('focus', syncAvatar); window.removeEventListener('storage', syncAvatar); };
  }, [router]);

  const isCaregiver = user?.role === 'caregiver';
  const activeReminders = useMemo(() => reminders.filter((item) => item.is_active !== false).sort((a, b) => String(a.reminder_time || '').localeCompare(String(b.reminder_time || ''))), [reminders]);
  const nextReminder = activeReminders[0];
  const completed = activeReminders.filter((item) => item.completed || item.taken || item.is_taken).length;
  const total = activeReminders.length;
  const caregiverPeople = caregiverSummary.elderly || [];
  const caregiverToday = caregiverSummary.today || [];
  const caregiverTaken = caregiverToday.filter((item) => item.taken).length;
  const caregiverWaiting = caregiverToday.filter((item) => !item.taken).length;
  const displayName = user?.name || (isCaregiver ? 'ผู้ดูแล' : 'คุณสมชาย');

  const startVoice = () => {
    const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    if (!Recognition) { setVoice(true); window.setTimeout(() => setVoice(false), 1200); return; }
    const recognition = new Recognition();
    recognition.lang = 'th-TH'; recognition.interimResults = false; setVoice(true);
    recognition.onresult = (event) => { const transcript = event.results?.[0]?.[0]?.transcript || ''; setVoice(false); if (/ยา|เตือน|กิน/.test(transcript)) router.push('/reminders'); };
    recognition.onerror = () => setVoice(false); recognition.onend = () => setVoice(false); recognition.start();
  };

  const markTaken = async (id) => {
    try { await reminderApi.markTaken(id); setReminders((rows) => rows.map((row) => row.id === id ? { ...row, taken: true, completed: true } : row)); }
    catch (err) { setError(err.message || 'บันทึกการกินยาไม่สำเร็จ'); }
  };

  return (
    <div className="aha-v3-page"><div className="aha-v3-layout"><div className="aha-v3-main">
      <header className="aha-v3-topbar">
        <Brand />
        <button className={`aha-v3-voice-pill ${voice ? 'listening' : ''}`} onClick={startVoice} type="button"><span><AhaIcon name="mic" size={23} /></span><strong>{voice ? 'กำลังฟัง…' : 'พูดกับ AHA'}</strong></button>
        <div className="aha-v3-top-message"><strong>{isCaregiver ? 'ดูแลคนที่คุณรัก' : 'ถามได้ทุกเรื่องสุขภาพ'}</strong><span>{isCaregiver ? 'ติดตามสถานะจาก AHA ได้ในที่เดียว' : 'AHA พร้อมดูแลคุณ'}</span></div>
        <div className="aha-v3-top-actions">
          <button onClick={() => router.push('/notifications')} aria-label="แจ้งเตือน" type="button"><AhaIcon name="bell" size={22} />{notifications.length > 0 && <b>{notifications.length > 9 ? '9+' : notifications.length}</b>}</button>
          <button onClick={() => router.push('/profile')} aria-label="โปรไฟล์" type="button"><span className="aha-v3-user-avatar">{avatar ? <Image src={avatar} alt="" fill sizes="42px" unoptimized /> : displayName.slice(0, 1)}</span></button>
          <button onClick={() => router.push('/profile')} aria-label="ตั้งค่า" type="button"><AhaIcon name="activity" size={21} /></button>
        </div>
      </header>

      <main className="aha-v3-content">{error && <div className="error">{error}</div>}
        <section className="aha-v3-hero"><div className="aha-v3-hero-copy"><h1>{`สวัสดี ${displayName}`}</h1><p>{isCaregiver ? 'วันนี้คุณกำลังดูแลใครอยู่บ้าง?' : 'ดูแลตัวเองไปด้วยกันในทุกวัน'}</p><span className="aha-v3-hero-line" /></div><div className="aha-v3-hero-photo"><Image src="/elderly-hero.jpg" alt="ผู้สูงอายุ" fill priority sizes="(max-width: 760px) 100vw, 48vw" /><div className="aha-v3-hero-note">{isCaregiver ? <><span>ดูแลคนที่รัก</span><span>ติดตามยา</span><b>ได้ทุกวัน</b></> : <><span>ดูแลตัวเอง</span><span>ไปด้วยกัน</span><b>ในทุกวัน</b></>}</div></div></section>

        {isCaregiver ? <>
          <section className="aha-v3-feature-row"><article className="aha-v3-card aha-v3-next"><div className="aha-v3-card-title">ผู้สูงอายุที่ดูแล <button onClick={() => router.push('/family')} type="button">จัดการ <AhaIcon name="arrow" size={15} /></button></div><div className="aha-v3-next-inner"><span className="aha-v3-clock"><AhaIcon name="users" size={42} /></span><div><strong>{caregiverPeople.length}</strong><span>คนที่เชื่อมต่อแล้ว</span><small>เลือกดูตารางยาและสถานะการทานยา</small></div></div><button className="aha-v3-primary-button" onClick={() => router.push('/family')} type="button"><AhaIcon name="users" size={18} /> ดูแดชบอร์ดผู้ดูแล</button></article><div className="aha-v3-action-stack" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'14px',marginTop:'8px'}}><button className="aha-v3-action blue" onClick={() => router.push('/family')} type="button"><span className="aha-v3-action-icon"><AhaIcon name="users" size={33} /></span><strong>ติดตามผู้สูงอายุ</strong><span className="aha-v3-arrow">›</span></button><button className="aha-v3-action blue" onClick={startVoice} type="button"><span className="aha-v3-action-icon"><AhaIcon name="mic" size={33} /></span><strong>{voice ? 'กำลังฟัง…' : 'พูดกับ AHA'}</strong><span className="aha-v3-arrow">›</span></button><button className="aha-v3-action red" onClick={() => router.push('/emergency')} type="button"><span className="aha-v3-action-icon"><AhaIcon name="phone" size={33} /></span><strong>ฉุกเฉิน SOS</strong><span className="aha-v3-arrow">›</span></button></div></section>
          <section className="aha-v3-metrics-row"><article className="aha-v3-card aha-v3-progress"><div className="aha-v3-card-title">สถานะการทานยาของผู้สูงอายุ วันนี้</div><div className="aha-v3-progress-inner"><div className="aha-v3-ring" style={{ '--progress': caregiverToday.length ? `${Math.round((caregiverTaken / caregiverToday.length) * 100)}%` : '0%' }}><span><b>{caregiverTaken}/{caregiverToday.length}</b>รายการ</span></div><div><strong>{caregiverWaiting ? `รอติดตาม ${caregiverWaiting} รายการ` : 'วันนี้ครบแล้ว'}</strong><span>ดูรายละเอียดและจัดการยาได้จากแดชบอร์ด</span></div></div><div className="aha-v3-mini-note"><AhaIcon name="users" size={18} /> ระบบจะแจ้งเตือนผู้ดูแลเมื่อเลยเวลาทานยา</div></article><article className="aha-v3-card aha-v3-today"><div className="aha-v3-card-title">สถานะยาที่ต้องติดตาม</div><div className="aha-v3-mini-timeline">{caregiverToday.slice(0, 3).map((item) => <div className="aha-v3-mini-row" key={item.reminder_id}><span className={item.taken ? 'done' : 'current'} /><time>{timeOf(item.reminder_time)}</time><div><strong>{item.medicine_name}</strong><small>{item.taken ? 'ผู้สูงอายุทานแล้ว' : 'รอการยืนยัน'}</small></div></div>)}{!caregiverToday.length && <div className="aha-v3-empty-mini">ยังไม่มีรายการยาของผู้สูงอายุ</div>}</div></article><article className="aha-v3-care-card aha-v3-care-card-large"><div className="aha-v3-care-icon"><AhaIcon name="users" size={32} /></div><div><h2>โหมด: <span>ผู้ดูแล</span></h2><p>เน้นติดตามผู้สูงอายุ ไม่ใช่จัดการสุขภาพของตัวเอง</p></div><button onClick={() => router.push('/family')} aria-label="เปิดศูนย์ดูแล" type="button"><AhaIcon name="chevron" size={25} /></button></article></section>
          <section className="aha-v3-today-card"><div className="aha-v3-section-title"><h2>ผู้สูงอายุที่กำลังติดตาม</h2><button onClick={() => router.push('/family')} type="button">ดูทั้งหมด <AhaIcon name="arrow" size={17} /></button></div>{loading ? <div className="aha-v3-empty">กำลังโหลดข้อมูล…</div> : !caregiverPeople.length ? <div className="aha-v3-empty">ยังไม่มีผู้สูงอายุที่เชื่อมต่อ <button onClick={() => router.push('/family')} type="button">+ เชื่อมต่อผู้สูงอายุ</button></div> : <div className="aha-v3-table">{caregiverPeople.slice(0, 4).map((person) => { const rows = caregiverToday.filter((item) => String(item.user_id) === String(person.user_id)); const taken = rows.filter((item) => item.taken).length; return <div className="aha-v3-med-row" key={person.user_id}><span className="aha-v3-dot done" /><div><strong>{person.name || 'ผู้สูงอายุ'}</strong><small>{person.phone}</small></div><div className="aha-v3-row-actions"><StatusPill done={rows.length > 0 && taken === rows.length} current={rows.length > 0 && taken < rows.length} /><button className="aha-v3-take-button" onClick={() => router.push('/family')} type="button">ดูสถานะ</button></div></div>; })}</div>}</section>
        </> : <>
          <section className="aha-v3-feature-row"><article className="aha-v3-card aha-v3-next"><div className="aha-v3-card-title">ยาครั้งถัดไป <button onClick={() => router.push('/reminders')} type="button">ดูทั้งหมด <AhaIcon name="arrow" size={15} /></button></div><div className="aha-v3-next-inner"><span className="aha-v3-clock"><AhaIcon name="clock" size={42} /></span><div><strong>{nextReminder ? timeOf(nextReminder.reminder_time) : '--:--'}</strong><span>{nextReminder?.medicine_name || 'ยังไม่มีรายการยา'}</span><small>{nextReminder?.dosage || 'เพิ่มรายการยาเพื่อเริ่มติดตาม'}</small></div></div><button className="aha-v3-primary-button" onClick={() => router.push('/reminders')} type="button"><AhaIcon name="bell" size={18} /> {nextReminder ? 'เตือนยาเมื่อถึงเวลา' : 'เพิ่มรายการยา'}</button></article><div className="aha-v3-action-stack" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'14px',marginTop:'8px'}}><button className="aha-v3-action blue" onClick={() => router.push('/reminders')} type="button"><span className="aha-v3-action-icon"><AhaIcon name="pill" size={33} /></span><strong>จัดการยา</strong><span className="aha-v3-arrow">›</span></button><button className="aha-v3-action blue" onClick={startVoice} type="button"><span className="aha-v3-action-icon"><AhaIcon name="mic" size={33} /></span><strong>{voice ? 'กำลังฟัง…' : 'พูดกับ AHA'}</strong><span className="aha-v3-arrow">›</span></button><button className="aha-v3-action red" onClick={() => router.push('/emergency')} type="button"><span className="aha-v3-action-icon"><AhaIcon name="phone" size={33} /></span><strong>ฉุกเฉิน SOS</strong><span className="aha-v3-arrow">›</span></button></div></section>
          <section className="aha-v3-metrics-row"><article className="aha-v3-card aha-v3-progress"><div className="aha-v3-card-title">ความคืบหน้าการกินยา วันนี้</div><div className="aha-v3-progress-inner"><div className="aha-v3-ring" style={{ '--progress': total ? `${Math.round((completed / total) * 100)}%` : '0%' }}><span><b>{completed}/{total}</b>รายการ</span></div><div><strong>{completed ? 'เยี่ยมมาก!' : 'เริ่มต้นได้เลย'}</strong><span>คุณดูแลตัวเองได้ดีมากในวันนี้</span></div></div><div className="aha-v3-mini-note"><AhaIcon name="check" size={18} /> ติดตามการกินยาได้จากรายการด้านล่าง</div></article><article className="aha-v3-card aha-v3-today"><div className="aha-v3-card-title">ไทม์ไลน์การกินยา วันนี้</div><div className="aha-v3-mini-timeline">{activeReminders.slice(0, 3).map((item, index) => { const done = item.completed || item.taken || item.is_taken; return <div className="aha-v3-mini-row" key={item.id || `${item.medicine_name}-${item.reminder_time}`}><span className={done ? 'done' : index === 0 ? 'current' : ''} /><time>{timeOf(item.reminder_time)}</time><div><strong>{item.medicine_name}</strong><small>{done ? 'กินแล้ว' : index === 0 ? 'รอถึงเวลา' : 'รออยู่'}</small></div></div>; })}{!activeReminders.length && <div className="aha-v3-empty-mini">ยังไม่มีรายการยา</div>}</div></article><article className="aha-v3-care-card aha-v3-care-card-large" onClick={() => router.push('/family')}><div className="aha-v3-care-icon"><AhaIcon name="users" size={32} /></div><div><h2>ผู้ดูแล: <span>เชื่อมต่อแล้ว</span> <i>●</i></h2><p>ครอบครัวของคุณสามารถดูแลและติดตามได้</p></div><AhaIcon name="chevron" size={25} /></article></section>
          <section className="aha-v3-today-card"><div className="aha-v3-section-title"><h2>รายการยาวันนี้</h2><button onClick={() => router.push('/reminders')} type="button">ดูทั้งหมด <AhaIcon name="arrow" size={17} /></button></div>{loading ? <div className="aha-v3-empty">กำลังโหลดข้อมูล…</div> : !activeReminders.length ? <div className="aha-v3-empty">ยังไม่มีรายการยา <button onClick={() => router.push('/reminders')} type="button">+ เพิ่มรายการยา</button></div> : <div className="aha-v3-table">{activeReminders.slice(0, 4).map((item, index) => { const done = item.completed || item.taken || item.is_taken; return <div className="aha-v3-med-row" key={item.id || index}><time>{timeOf(item.reminder_time)}</time><span className={`aha-v3-dot ${done ? 'done' : index === 0 ? 'current' : ''}`} /><div><strong>{item.medicine_name}</strong><small>{item.dosage || '1 รายการ'}</small></div><div className="aha-v3-row-actions"><StatusPill done={done} current={index === 0} />{!done && <button className="aha-v3-take-button" onClick={() => markTaken(item.id)} type="button">กินแล้ว</button>}</div></div>; })}</div>}</section>
        </>}
        <section className="aha-v3-bottom-grid"><article className="aha-v3-wellness"><AhaIcon name="heart" size={34} /><div><h2>{isCaregiver ? 'ดูแลคนที่รัก... ทำได้ทุกวัน' : 'สุขภาพดี... ทำได้ทุกวัน'}</h2><p>{isCaregiver ? 'AHA ช่วยให้คุณติดตามสิ่งสำคัญได้ง่ายขึ้น' : 'AHA อยู่เคียงข้างคุณเสมอ'}</p></div><span>〰</span></article><article className="aha-v3-wellness aha-v3-wellness-photo"><div><h2>{isCaregiver ? 'ติดตามยาอย่างใกล้ชิด โดยไม่รบกวนการใช้ชีวิต' : 'ดูแลตัวเองไปด้วยกันในทุกวัน'}</h2><p>{isCaregiver ? 'ทุกการเปลี่ยนแปลงตารางยาจะแจ้งให้ผู้สูงอายุทราบ' : 'สุขภาพดี เริ่มได้จากสิ่งเล็ก ๆ ในทุกวัน'}</p></div></article></section>
      </main>
    </div></div></div>
  );
}
