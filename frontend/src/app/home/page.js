'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { getSession, clearSession } from '../../services/auth';
import { reminderApi, notificationApi } from '../../services/api';

const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function listOf(response, key) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.[key])) return response[key];
  return [];
}

function timeOf(value) {
  return String(value || '').slice(0, 5) || '--:--';
}

function Brand() {
  return (
    <div className="aha-v3-brand">
      <span className="aha-v3-brand-mark">
        <svg viewBox="0 0 60 42" fill="none" aria-hidden="true">
          <path d="M3 25C12 25 12 5 21 5s9 30 18 30 9-25 18-25" stroke="#159FE0" strokeWidth="8" strokeLinecap="round" />
          <path d="M40 29c7 0 8-13 17-13" stroke="#22B8AA" strokeWidth="8" strokeLinecap="round" />
        </svg>
      </span>
      <span>
        <strong>AHA</strong>
        <small>AI Health Assistant</small>
      </span>
    </div>
  );
}

function SideNav({ active, router }) {
  const items = [
    ['home', 'หน้าหลัก', '/home'],
    ['pill', 'ยา', '/reminders'],
    ['bell', 'แจ้งเตือน', '/notifications'],
    ['warning', 'ฉุกเฉิน', '/emergency'],
  ];

  return (
    <aside className="aha-v3-sidebar">
      <Brand />
      <nav className="aha-v3-side-links">
        {items.map(([icon, label, path]) => (
          <button
            key={path}
            className={active === path ? 'active' : ''}
            onClick={() => router.push(path)}
          >
            <AhaIcon name={icon} size={24} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="aha-v3-side-spacer" />

      <div className="aha-v3-side-care">
        <AhaIcon name="users" size={25} />
        <div>
          <strong>ผู้ดูแล</strong>
          <span><i /> เชื่อมต่อแล้ว</span>
        </div>
      </div>

      <div className="aha-v3-side-wellness">
        <AhaIcon name="heart" size={31} />
        <strong>สุขภาพดี<br />เริ่มได้ทุกวัน</strong>
        <span className="aha-v3-wave">〰</span>
      </div>
    </aside>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [now, setNow] = useState(new Date());
  const [voice, setVoice] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session?.accessToken) {
      router.replace('/login');
      return;
    }

    setUser(session.user || null);
    let mounted = true;

    Promise.allSettled([reminderApi.list(), notificationApi.unread()]).then(([r, n]) => {
      if (!mounted) return;
      if (r.status === 'fulfilled') setReminders(listOf(r.value, 'reminders'));
      if (n.status === 'fulfilled') setNotifications(listOf(n.value, 'notifications'));
      if (r.status === 'rejected' && n.status === 'rejected') setError('ยังเชื่อมต่อข้อมูลล่าสุดไม่ได้');
      setLoading(false);
    });

    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [router]);

  const activeReminders = useMemo(
    () => reminders.filter((x) => x.is_active !== false).sort((a, b) =>
      String(a.reminder_time || '').localeCompare(String(b.reminder_time || ''))
    ),
    [reminders],
  );

  const nextReminder = activeReminders[0];
  const completed = activeReminders.filter((x) => x.completed || x.taken || x.is_taken).length;
  const total = activeReminders.length;
  const displayName = user?.name || 'คุณสมชาย';
  const dateText = `${days[now.getDay()]} ${new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)}`;

  const startVoice = () => {
    const Recognition = typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

    if (!Recognition) {
      setVoice(true);
      window.setTimeout(() => setVoice(false), 1200);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    setVoice(true);
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      setVoice(false);
      if (/ยา|เตือน|กิน/.test(text)) router.push('/reminders');
    };
    recognition.onerror = () => setVoice(false);
    recognition.onend = () => setVoice(false);
    recognition.start();
  };

  const logout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <div className="aha-v3-page">
      <div className="aha-v3-layout">
        <SideNav active="/home" router={router} />

        <div className="aha-v3-main">
          <header className="aha-v3-topbar">
            <Brand />

            <button className={`aha-v3-voice-pill ${voice ? 'listening' : ''}`} onClick={startVoice}>
              <span><AhaIcon name="mic" size={23} /></span>
              <strong>{voice ? 'กำลังฟัง…' : 'พูดกับ AHA'}</strong>
            </button>

            <div className="aha-v3-top-message">
              <strong>ถามได้ทุกเรื่องสุขภาพ</strong>
              <span>AHA พร้อมดูแลคุณ</span>
            </div>

            <div className="aha-v3-top-actions">
              <button onClick={() => router.push('/notifications')} aria-label="แจ้งเตือน">
                <AhaIcon name="bell" size={22} />
                {notifications.length > 0 && <b>{notifications.length > 9 ? '9+' : notifications.length}</b>}
              </button>
              <button onClick={logout} aria-label="ออกจากระบบ">
                <span className="aha-v3-user-avatar">{displayName.slice(0, 1)}</span>
              </button>
              <button aria-label="ตั้งค่า"><AhaIcon name="activity" size={21} /></button>
            </div>
          </header>

          <main className="aha-v3-content">
            {error && <div className="error">{error}</div>}

            <section className="aha-v3-hero">
              <div className="aha-v3-hero-copy">
                <h1>สวัสดี {displayName}</h1>
                <p>สุขภาพดีในวันนี้ คือพลังสำคัญสำหรับวันพรุ่งนี้</p>
                <span className="aha-v3-hero-line" />
              </div>

              <div className="aha-v3-hero-photo">
                <img src="/elderly-hero.svg" alt="ผู้สูงอายุ" />
                <div className="aha-v3-hero-note">ดูแลตัวเอง<br />ไปด้วยกัน<br /><b>ในทุกวัน</b></div>
              </div>
            </section>

            <section className="aha-v3-actions">
              <button className="aha-v3-action blue" onClick={() => router.push('/reminders')}>
                <span className="aha-v3-action-icon"><AhaIcon name="pill" size={33} /></span>
                <strong>จัดการยา</strong>
                <span className="aha-v3-arrow">›</span>
              </button>

              <button className="aha-v3-action green" onClick={startVoice}>
                <span className="aha-v3-action-icon"><AhaIcon name="mic" size={33} /></span>
                <strong>{voice ? 'กำลังฟัง…' : 'พูดกับ AHA'}</strong>
                <span className="aha-v3-arrow">›</span>
              </button>

              <button className="aha-v3-action red" onClick={() => router.push('/emergency')}>
                <span className="aha-v3-action-icon"><AhaIcon name="phone" size={33} /></span>
                <strong>ฉุกเฉิน SOS</strong>
                <span className="aha-v3-arrow">›</span>
              </button>
            </section>

            <section className="aha-v3-grid-3">
              <article className="aha-v3-card aha-v3-next">
                <div className="aha-v3-card-title">ยาครั้งถัดไป <button onClick={() => router.push('/reminders')}>ดูทั้งหมด <AhaIcon name="arrow" size={15} /></button></div>
                <div className="aha-v3-next-inner">
                  <span className="aha-v3-clock"><AhaIcon name="clock" size={42} /></span>
                  <div>
                    <strong>{nextReminder ? timeOf(nextReminder.reminder_time) : '--:--'}</strong>
                    <span>{nextReminder?.medicine_name || 'ยังไม่มีรายการยา'}</span>
                    <small>{nextReminder?.dosage || 'เพิ่มรายการยาเพื่อเริ่มติดตาม'}</small>
                  </div>
                </div>
                <button className="aha-v3-primary-button" onClick={() => router.push('/reminders')}>
                  <AhaIcon name="bell" size={18} /> {nextReminder ? 'เตือนยาเมื่อถึงเวลา' : 'เพิ่มรายการยา'}
                </button>
              </article>

              <article className="aha-v3-card aha-v3-progress">
                <div className="aha-v3-card-title">ความคืบหน้าการกินยา วันนี้</div>
                <div className="aha-v3-progress-inner">
                  <div className="aha-v3-ring" style={{ '--progress': total ? `${Math.round((completed / total) * 100)}%` : '0%' }}>
                    <span><b>{completed}/{total}</b>รายการ</span>
                  </div>
                  <div>
                    <strong>{completed ? 'เยี่ยมมาก!' : 'เริ่มต้นได้เลย'}</strong>
                    <span>คุณดูแลตัวเองได้ดีมากในวันนี้</span>
                  </div>
                </div>
                <div className="aha-v3-mini-note"><AhaIcon name="check" size={18} /> ติดตามการกินยาได้จากรายการด้านล่าง</div>
              </article>

              <article className="aha-v3-card aha-v3-today">
                <div className="aha-v3-card-title">ไทม์ไลน์การกินยา วันนี้</div>
                <div className="aha-v3-mini-timeline">
                  {activeReminders.slice(0, 3).map((item, i) => {
                    const isDone = item.completed || item.taken || item.is_taken;
                    return (
                      <div className="aha-v3-mini-row" key={item.id || `${item.medicine_name}-${item.reminder_time}`}>
                        <span className={isDone ? 'done' : i === 0 ? 'current' : ''} />
                        <time>{timeOf(item.reminder_time)}</time>
                        <div><strong>{item.medicine_name}</strong><small>{isDone ? 'กินแล้ว' : i === 0 ? 'รอถึงเวลา' : 'รออยู่'}</small></div>
                      </div>
                    );
                  })}
                  {!activeReminders.length && <div className="aha-v3-empty-mini">ยังไม่มีรายการยา</div>}
                </div>
              </article>
            </section>

            <section className="aha-v3-today-card">
              <div className="aha-v3-section-title">
                <h2>รายการยาวันนี้</h2>
                <button onClick={() => router.push('/reminders')}>ดูทั้งหมด <AhaIcon name="arrow" size={17} /></button>
              </div>

              {loading ? (
                <div className="aha-v3-empty">กำลังโหลดข้อมูล…</div>
              ) : !activeReminders.length ? (
                <div className="aha-v3-empty">ยังไม่มีรายการยา <button onClick={() => router.push('/reminders')}>+ เพิ่มรายการยา</button></div>
              ) : (
                <div className="aha-v3-table">
                  {activeReminders.slice(0, 4).map((item, i) => {
                    const isDone = item.completed || item.taken || item.is_taken;
                    return (
                      <div className="aha-v3-med-row" key={item.id || i}>
                        <time>{timeOf(item.reminder_time)}</time>
                        <span className={`aha-v3-dot ${isDone ? 'done' : i === 0 ? 'current' : ''}`} />
                        <div><strong>{item.medicine_name}</strong><small>{item.dosage || '1 รายการ'}</small></div>
                        <span className={`aha-v3-status ${isDone ? 'done' : i === 0 ? 'wait' : 'later'}`}>{isDone ? 'กินแล้ว' : i === 0 ? 'รอถึงเวลา' : 'รออยู่'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="aha-v3-bottom-grid">
              <article className="aha-v3-care-card">
                <div className="aha-v3-care-icon"><AhaIcon name="users" size={32} /></div>
                <div>
                  <h2>ผู้ดูแล: <span>เชื่อมต่อแล้ว</span> <i>●</i></h2>
                  <p>ครอบครัวของคุณสามารถดูแลและติดตามได้</p>
                </div>
                <AhaIcon name="chevron" size={25} />
              </article>

              <article className="aha-v3-wellness">
                <AhaIcon name="heart" size={34} />
                <div><h2>สุขภาพดี... ทำได้ทุกวัน</h2><p>AHA อยู่เคียงข้างคุณเสมอ</p></div>
                <span>〰</span>
              </article>
            </section>
          </main>

          <nav className="aha-v3-mobile-nav">
            <button className="active"><AhaIcon name="home" size={23} /><span>หน้าหลัก</span></button>
            <button onClick={() => router.push('/reminders')}><AhaIcon name="pill" size={23} /><span>ยา</span></button>
            <button onClick={() => router.push('/notifications')}><AhaIcon name="bell" size={23} /><span>แจ้งเตือน</span></button>
            <button className="danger" onClick={() => router.push('/emergency')}><AhaIcon name="phone" size={23} /><span>ฉุกเฉิน</span></button>
          </nav>
        </div>
      </div>
    </div>
  );
}
