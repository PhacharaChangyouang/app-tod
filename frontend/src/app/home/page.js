'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { getSession, clearSession } from '../../services/auth';
import { reminderApi, notificationApi } from '../../services/api';

const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function normalizeList(response, keys = []) {
  if (Array.isArray(response)) return response;
  for (const key of ['data', ...keys]) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
}

function shortTime(value) {
  return String(value || '').slice(0, 5) || '--:--';
}

function BrandMark() {
  return (
    <svg viewBox="0 0 60 60" fill="none" aria-hidden="true">
      <path d="M5 34c8 0 8-19 16-19s8 30 16 30 8-25 18-25" stroke="#159fe0" strokeWidth="8" strokeLinecap="round" />
      <path d="M39 40c7 0 8-13 16-13" stroke="#20b6a6" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [voice, setVoice] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = getSession();

    if (!session?.accessToken) {
      router.replace('/login');
      return undefined;
    }

    setUser(session.user || null);
    let mounted = true;

    Promise.allSettled([reminderApi.list(), notificationApi.unread()]).then((results) => {
      if (!mounted) return;

      const [reminderResult, notificationResult] = results;

      if (reminderResult.status === 'fulfilled') {
        setReminders(normalizeList(reminderResult.value, ['reminders']));
      }

      if (notificationResult.status === 'fulfilled') {
        setNotifications(normalizeList(notificationResult.value, ['notifications']));
      }

      if (reminderResult.status === 'rejected' && notificationResult.status === 'rejected') {
        setError('ยังเชื่อมต่อข้อมูลล่าสุดไม่ได้');
      }

      setLoading(false);
    });

    const timer = setInterval(() => setNow(new Date()), 30000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [router]);

  const activeReminders = useMemo(
    () =>
      reminders
        .filter((item) => item.is_active !== false)
        .sort((a, b) =>
          String(a.reminder_time || '').localeCompare(String(b.reminder_time || '')),
        ),
    [reminders],
  );

  const nextReminder = activeReminders[0];
  const completedCount = activeReminders.filter(
    (item) => item.completed || item.taken || item.is_taken,
  ).length;
  const displayName = user?.name || 'ผู้ใช้';
  const dateText = `${dayNames[now.getDay()]} ${new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)}`;

  const speak = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const handleVoice = () => {
    if (voice) {
      setVoice(false);
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      speak('เบราว์เซอร์นี้ยังไม่รองรับการสั่งงานด้วยเสียง');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    setVoice(true);

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setVoice(false);

      if (/เตือน|ยา|กินยา/.test(transcript)) {
        speak('กำลังเปิดรายการยา');
        router.push('/reminders');
      } else {
        speak(`คุณพูดว่า ${transcript}`);
      }
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
    <div className="aha-page home-page">
      <div className="aha-shell home-shell">
        <header className="home-header">
          <div className="home-brand">
            <span className="home-logo">
              <BrandMark />
            </span>
            <span>
              <strong>AHA</strong>
              <small>AI Health Assistant</small>
            </span>
          </div>

          <div className="home-header-actions">
            <span className="home-date">{dateText}</span>

            <button
              className="home-icon-button"
              onClick={() => router.push('/notifications')}
              aria-label="การแจ้งเตือน"
            >
              <AhaIcon name="bell" />
              {notifications.length > 0 && (
                <b className="notification-badge">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </b>
              )}
            </button>

            <button className="home-profile" onClick={logout} aria-label="ออกจากระบบ">
              <span className="home-avatar">{displayName.trim().slice(0, 1)}</span>
              <span className="home-profile-name">{displayName}</span>
              <AhaIcon name="logout" size={17} />
            </button>
          </div>
        </header>

        <main>
          <section className="home-welcome">
            <div className="home-welcome-copy">
              <h1>
                สวัสดี
                <br />
                {displayName}
              </h1>
              <p>วันนี้ AHA ช่วยดูแลเรื่องสำคัญให้คุณ</p>
            </div>

            <div className="home-portrait">
              <div className="home-portrait-halo" />
              <span className="home-welcome-badge">
                สุขภาพดี
                <br />
                ไปด้วยกัน
              </span>
              <img
                className="home-elder-photo"
                src="/elderly-hero.jpg"
                alt="ผู้สูงอายุ"
              />
            </div>
          </section>

          {error && <div className="error home-error">{error}</div>}

          <section className="home-next-card" aria-label="ยาครั้งถัดไป">
            <div className="home-pill-icon">
              <AhaIcon name="pill" size={54} />
            </div>

            <div>
              <div className="home-label">ยาครั้งถัดไป</div>
              <div className="home-next-time">
                {nextReminder ? shortTime(nextReminder.reminder_time) : '--:--'}
              </div>
              <div className="home-medicine">
                {nextReminder?.medicine_name || 'ยังไม่มีรายการยา'}
              </div>
            </div>

            <button className="home-next-side" onClick={() => router.push('/reminders')}>
              <span>
                เหลืออีก
                <br />
                <b>{activeReminders.length} รายการ</b>
              </span>
              <AhaIcon name="chevron" size={25} />
            </button>
          </section>

          <section className="home-actions" aria-label="เมนูด่วน">
            <button
              className="home-action home-action-blue"
              onClick={() => router.push('/reminders')}
            >
              <span className="home-action-icon">
                <AhaIcon name="pill" size={35} />
              </span>
              <strong>จัดการยา</strong>
              <small>รายการยาและการกินยา</small>
              <span className="home-arrow">›</span>
            </button>

            <button className="home-action home-action-green" onClick={handleVoice}>
              <span className="home-action-icon">
                <AhaIcon name="mic" size={35} />
              </span>
              <strong>{voice ? 'กำลังฟัง…' : 'พูดกับ AHA'}</strong>
              <small>สั่งงานด้วยเสียง</small>
              <span className="home-arrow">›</span>
            </button>

            <button
              className="home-action home-action-red"
              onClick={() => router.push('/emergency')}
            >
              <span className="home-action-icon">
                <AhaIcon name="phone" size={35} />
              </span>
              <strong>ฉุกเฉิน SOS</strong>
              <small>ขอความช่วยเหลือ</small>
              <span className="home-arrow">›</span>
            </button>
          </section>

          <section className="home-two-col">
            <article className="home-card">
              <h2>วันนี้กินยาแล้ว</h2>

              <div className="home-progress-wrap">
                <div className="home-ring">
                  <span>
                    <b>{completedCount}/{activeReminders.length || 0}</b>
                    รายการ
                  </span>
                </div>

                <div>
                  <strong>
                    {activeReminders.length
                      ? completedCount
                        ? 'เยี่ยมมาก'
                        : 'เริ่มต้นได้เลย'
                      : 'ยังไม่มีรายการ'}
                  </strong>
                  <small>ติดตามการกินยา</small>
                </div>
              </div>
            </article>

            <article className="home-card home-care-card">
              <h2>
                ผู้ดูแล
                <br />
                {user?.caregiver_name ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}
                {user?.caregiver_name && (
                  <span className="home-online-dot">●</span>
                )}
              </h2>

              <div className="home-care-row">
                <span className="home-care-avatar">
                  {user?.caregiver_name?.slice(0, 1) || 'ค'}
                </span>

                <div>
                  <strong>{user?.caregiver_name || 'ครอบครัวของคุณ'}</strong>
                  <small>ดูแลร่วมกัน</small>
                </div>

                <AhaIcon name="chevron" size={24} />
              </div>
            </article>
          </section>

          <section className="home-card home-timeline-card">
            <div className="home-card-head">
              <h2>รายการยาวันนี้</h2>
              <button onClick={() => router.push('/reminders')}>
                ดูทั้งหมด
                <AhaIcon name="chevron" size={18} />
              </button>
            </div>

            {loading ? (
              <div className="empty">กำลังโหลดข้อมูล…</div>
            ) : activeReminders.length === 0 ? (
              <div className="empty">
                ยังไม่มีรายการยา
                <br />
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 14 }}
                  onClick={() => router.push('/reminders')}
                >
                  <AhaIcon name="plus" />
                  เพิ่มรายการแรก
                </button>
              </div>
            ) : (
              <div className="home-timeline">
                {activeReminders.slice(0, 4).map((item, index) => {
                  const completed = item.completed || item.taken || item.is_taken;

                  return (
                    <div
                      className="home-timeline-row"
                      key={item.id || `${item.medicine_name}-${item.reminder_time}`}
                    >
                      <span className="home-row-time">
                        {shortTime(item.reminder_time)}
                      </span>

                      <span className="home-timeline-line">
                        <i className={completed ? 'done' : ''} />
                      </span>

                      <div>
                        <strong>{item.medicine_name}</strong>
                        <small>{item.dosage || 'ไม่ได้ระบุขนาดยา'}</small>
                      </div>

                      <span
                        className={`home-status ${
                          completed
                            ? 'home-status-done'
                            : index === 0
                              ? 'home-status-wait'
                              : 'home-status-later'
                        }`}
                      >
                        {completed ? 'กินแล้ว' : index === 0 ? 'รอถึงเวลา' : 'รออยู่'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="home-wellness-banner">
            <div>
              <h2>ดูแลสุขภาพ เริ่มได้วันนี้</h2>
              <p>AHA อยู่เคียงข้างคุณ</p>
            </div>

            <svg viewBox="0 0 400 110" fill="none" aria-hidden="true">
              <path
                d="M0 100c55-39 75-28 126-3 46 22 68-40 120-29 59 12 83 41 154 2v45H0Z"
                fill="#6fc7b0"
              />
              <path
                d="M0 98c68-48 105-5 153-17 55-14 72-51 126-30 42 16 76 28 121-3v52H0Z"
                fill="#6cb9df"
              />
            </svg>

            <button aria-label="ดูข้อมูลสุขภาพเพิ่มเติม">
              <AhaIcon name="chevron" size={25} />
            </button>
          </section>
        </main>

        <nav className="footer-nav home-footer-nav" aria-label="เมนูหลัก">
          <div className="footer-nav-inner">
            <button className="footer-link active">
              <AhaIcon name="home" size={21} />
              <span>หน้าหลัก</span>
            </button>

            <button
              className="footer-link"
              onClick={() => router.push('/reminders')}
            >
              <AhaIcon name="pill" size={21} />
              <span>ยา</span>
            </button>

            <button
              className="footer-link"
              onClick={() => router.push('/notifications')}
            >
              <AhaIcon name="bell" size={21} />
              <span>แจ้งเตือน</span>
            </button>

            <button
              className="footer-link home-footer-danger"
              onClick={() => router.push('/emergency')}
            >
              <AhaIcon name="warning" size={21} />
              <span>ฉุกเฉิน</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
