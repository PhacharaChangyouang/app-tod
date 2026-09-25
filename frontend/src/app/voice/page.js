'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { saveSession } from '../../services/auth';
import { authApi, reminderApi } from '../../services/api';

function parseReminder(text) {
  const timeMatch = text.match(/(?:เวลา|ตอน)\s*(\d{1,2})(?:[:.](\d{2}))?/);
  if (!timeMatch) return null;

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] || 0);
  if (hour > 23 || minute > 59) return null;

  const medicine = text
    .replace(/เตือน(?:ให้)?(?:ฉัน)?/g, '')
    .replace(/กินยา/g, '')
    .replace(/ยา/g, '')
    .replace(/เวลา\s*\d{1,2}(?:[:.]\d{2})?/g, '')
    .replace(/ตอน\s*\d{1,2}(?:[:.]\d{2})?/g, '')
    .trim();

  if (!medicine) return null;
  return {
    medicine_name: medicine,
    dosage: null,
    reminder_time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    frequency: 'daily',
    days_of_week: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
    start_date: null,
    end_date: null,
    is_active: true,
  };
}

export default function VoicePage() {
  const router = useRouter();
  const recognitionRef = useRef(null);
  const [state, setState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('พูดกับ AHA ได้เลย เช่น “เตือนยาความดันเวลา 08:00”');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    authApi.me().then((result) => { if (active && result?.user) saveSession({ user: result.user }); }).catch(() => { if (active) router.replace('/'); });
    return () => { active = false; recognitionRef.current?.abort?.(); };
  }, [router]);

  const handleCommand = async (text) => {
    const normalized = text.trim();
    if (!normalized) return;

    if (/^(ไป|เปิด).*(ยา|การเตือน)/.test(normalized) || /จัดการยา/.test(normalized)) {
      setResponse('กำลังเปิดหน้าจัดการยา');
      router.push('/reminders');
      return;
    }

    if (/แจ้งเตือน|การแจ้งเตือน/.test(normalized) && !/เตือนยา/.test(normalized)) {
      router.push('/notifications');
      return;
    }

    if (/ฉุกเฉิน|ขอความช่วยเหลือ/.test(normalized)) {
      router.push('/emergency');
      return;
    }

    const reminder = parseReminder(normalized);
    if (reminder) {
      try {
        setState('processing');
        await reminderApi.create(reminder);
        setResponse(`ตั้งเตือนยา${reminder.medicine_name} เวลา ${reminder.reminder_time} น. เรียบร้อยแล้ว`);
      } catch (err) {
        setError(err.message || 'ตั้งเตือนไม่สำเร็จ');
      } finally {
        setState('done');
      }
      return;
    }

    setResponse('ตอนนี้ AHA รองรับคำสั่งจัดการยาและตั้งเตือนยาแบบเสียงได้ ลองพูดว่า “เตือนยาความดันเวลา 08:00”');
  };

  const startListening = () => {
    setError('');
    setTranscript('');
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการฟังเสียง');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setState('listening');
    recognition.onresult = async (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      setTranscript(text);
      await handleCommand(text);
    };
    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed' ? 'กรุณาอนุญาตการใช้ไมโครโฟนก่อนใช้งาน' : 'ฟังเสียงไม่สำเร็จ ลองใหม่อีกครั้ง');
      setState('idle');
    };
    recognition.onend = () => setState((current) => current === 'listening' ? 'idle' : current);
    recognition.start();
  };

  return (
    <div className="aha-page">
      <div className="aha-shell">
        <header className="topbar">
          <div className="brand">
            <button className="icon-btn" onClick={() => router.push('/home')} aria-label="กลับหน้าหลัก">
              <AhaIcon name="arrow" size={21} />
            </button>
            <div className="brand-mark"><AhaIcon name="mic" /></div>
            <span>พูดกับ AHA</span>
          </div>
          <button className="btn btn-soft" onClick={() => router.push('/home')}>กลับหน้าหลัก</button>
        </header>

        <main className="aha-voice-page">
          <section className="aha-voice-hero">
            <div>
              <div className="eyebrow">AHA VOICE ASSISTANT</div>
              <h1>พูดกับ AHA ได้เลย</h1>
              <p>ไม่ต้องพิมพ์ ใช้เสียงเพื่อเปิดหน้าจอหรือสร้างการเตือนยา</p>
            </div>
            <div className={`aha-voice-orb ${state === 'listening' ? 'listening' : ''}`}>
              <AhaIcon name="mic" size={52} />
            </div>
          </section>

          <section className="aha-voice-card">
            <div className="aha-voice-state">{state === 'listening' ? 'กำลังฟัง...' : state === 'processing' ? 'กำลังทำรายการ...' : state === 'done' ? 'ดำเนินการแล้ว' : 'พร้อมฟัง'}</div>
            <button className="aha-voice-button" onClick={startListening} disabled={state === 'listening' || state === 'processing'}>
              <AhaIcon name="mic" size={34} />
              <strong>{state === 'listening' ? 'กำลังฟัง' : 'แตะเพื่อพูด'}</strong>
              <span>แตะหนึ่งครั้ง แล้วพูดให้ AHA ฟัง</span>
            </button>

            {transcript && (
              <div className="aha-voice-transcript">
                <span>คุณพูดว่า</span>
                <strong>“{transcript}”</strong>
              </div>
            )}

            <div className="aha-voice-response">
              <AhaIcon name="message" size={22} />
              <span>{response}</span>
            </div>
            {error && <div className="error">{error}</div>}
          </section>

          <section className="aha-voice-examples">
            <h2>ตัวอย่างคำสั่ง</h2>
            <button onClick={() => handleCommand('เตือนยาความดันเวลา 08:00')}><AhaIcon name="pill" /> “เตือนยาความดันเวลา 08:00”</button>
            <button onClick={() => router.push('/reminders')}><AhaIcon name="calendar" /> “จัดการรายการยา”</button>
            <button onClick={() => router.push('/emergency')}><AhaIcon name="warning" /> “ฉุกเฉิน”</button>
          </section>
        </main>

        <nav className="footer-nav">
          <div className="footer-nav-inner">
            <button className="footer-link" onClick={() => router.push('/home')}><AhaIcon name="home" size={20} /><span>หน้าหลัก</span></button>
            <button className="footer-link" onClick={() => router.push('/reminders')}><AhaIcon name="pill" size={20} /><span>ยา</span></button>
            <button className="footer-link active"><AhaIcon name="mic" size={20} /><span>พูดกับ AHA</span></button>
            <button className="footer-link" onClick={() => router.push('/emergency')}><AhaIcon name="warning" size={20} /><span>ฉุกเฉิน</span></button>
          </div>
        </nav>
      </div>
    </div>
  );
}
