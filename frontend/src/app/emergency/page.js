'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { saveSession } from '../../services/auth';
import { authApi, emergencyApi } from '../../services/api';

export default function EmergencyPage() {
  const router = useRouter();
  const timer = useRef(null);
  const [holding, setHolding] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [location, setLocation] = useState(null);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('1669');

  useEffect(() => {
    let active = true;
    authApi.me().then((result) => { if (active && result?.user) saveSession({ user: result.user }); }).catch(() => { if (active) router.replace('/'); });
    return () => { active = false; if (timer.current) clearTimeout(timer.current); };
  }, [router]);

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('อุปกรณ์นี้ไม่รองรับตำแหน่ง GPS'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
  });

  const confirmEmergency = async () => {
    setSending(true);
    setMessage('');
    try {
      let coords = null;
      try {
        const position = await getLocation();
        coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(coords);
      } catch {
        setLocation(null);
      }

      await emergencyApi.notify({
        message: 'ผู้ใช้ AHA กดขอความช่วยเหลือฉุกเฉิน',
        ...(coords || {}),
      });

      setSent(true);
      setMessage('ส่งการแจ้งเหตุไปยังผู้ใช้ที่เชื่อมต่อแล้ว สามารถโทร 1669 ต่อได้ทันที');
    } catch (error) {
      setMessage(error.message || 'ส่งการแจ้งเหตุไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  };

  const start = () => {
    if (sending) return;
    setHolding(true);
    setSent(false);
    setMessage('กดค้างต่ออีกเล็กน้อยเพื่อยืนยัน');
    timer.current = setTimeout(() => {
      setHolding(false);
      confirmEmergency();
    }, 2000);
  };

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    setHolding(false);
  };

  const maps = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : '';

  return (
    <div className="aha-page">
      <div className="aha-shell">
        <header className="topbar">
          <div className="brand">
            <button className="icon-btn" onClick={() => router.push('/home')} aria-label="กลับหน้าหลัก">
              <AhaIcon name="arrow" size={21} />
            </button>
            <div className="brand-mark aha-danger-mark"><AhaIcon name="warning" /></div>
            <span>ฉุกเฉิน</span>
          </div>
          <button className="btn btn-soft" onClick={() => router.push('/home')}>กลับหน้าหลัก</button>
        </header>

        <main className="aha-emergency-page">
          <section className="aha-emergency-hero">
            <div className="eyebrow">EMERGENCY CENTER</div>
            <h1>ต้องการความช่วยเหลือ?</h1>
            <p>กดปุ่มค้าง 2 วินาทีเพื่อยืนยัน AHA จะส่งแจ้งเหตุพร้อมตำแหน่งให้ผู้ดูแลที่เชื่อมต่อ</p>

            <div className={`aha-sos-wrap ${holding ? 'holding' : ''}`}>
              <button
                className="aha-sos-button"
                onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); start(); }}
                onPointerUp={(event) => { event.preventDefault(); stop(); }}
                onPointerLeave={stop}
                onPointerCancel={stop}
                onContextMenu={(event) => event.preventDefault()}
                onDragStart={(event) => event.preventDefault()}
                aria-label="กดค้างเพื่อขอความช่วยเหลือ"
                style={{ touchAction:'none', userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none' }}
              >
                <AhaIcon name="warning" size={42} />
                <strong>{sending ? 'กำลังส่ง' : holding ? 'ยืนยัน...' : 'SOS'}</strong>
                <span>{sent ? 'แจ้งเหตุแล้ว' : 'กดค้าง 2 วินาที'}</span>
              </button>
            </div>

            {message && (
              <div className={sent ? 'success aha-emergency-message' : 'error aha-emergency-message'}>
                <AhaIcon name={sent ? 'check' : 'warning'} size={20} />
                <span>{message}</span>
              </div>
            )}

            {location && (
              <div className="aha-location-card">
                <div><AhaIcon name="location" size={22} /><strong>ส่งตำแหน่ง GPS แล้ว</strong></div>
                <span>คลาดเคลื่อนประมาณ {Math.round(location.accuracy)} เมตร</span>
                <a href={maps} target="_blank" rel="noreferrer" className="btn btn-soft full">เปิดตำแหน่งบนแผนที่</a>
              </div>
            )}

            <div className="aha-emergency-call">
              <label>สายฉุกเฉิน</label>
              <div>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
                <button className="btn btn-danger btn-lg" onClick={() => { window.location.href = `tel:${phone || '1669'}`; }}>
                  <AhaIcon name="phone" /> โทรทันที
                </button>
              </div>
              <small>ปุ่ม SOS ด้านบนส่งแจ้งเหตุให้ผู้ดูแล แต่จะไม่โทรออกอัตโนมัติ หากต้องการโทร 1669 ให้กด “โทรทันที”</small>
            </div>
          </section>
        </main>

        <nav className="footer-nav">
          <div className="footer-nav-inner">
            <button className="footer-link" onClick={() => router.push('/home')}><AhaIcon name="home" size={20} /><span>หน้าหลัก</span></button>
            <button className="footer-link" onClick={() => router.push('/reminders')}><AhaIcon name="pill" size={20} /><span>ยา</span></button>
            <button className="footer-link" onClick={() => router.push('/voice')}><AhaIcon name="mic" size={20} /><span>พูดกับ AHA</span></button>
            <button className="footer-link active danger"><AhaIcon name="warning" size={20} /><span>ฉุกเฉิน</span></button>
          </div>
        </nav>
      </div>
    </div>
  );
}
