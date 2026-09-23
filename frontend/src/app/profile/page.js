'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { authApi } from '../../services/api';
import { clearSession, getSession, saveSession } from '../../services/auth';

const THEMES = [
  { key: 'green', name: 'AHA Green', color: '#2f9b68' },
  { key: 'blue', name: 'Calm Blue', color: '#3b82c4' },
  { key: 'teal', name: 'Soft Teal', color: '#2a9d8f' },
  { key: 'purple', name: 'Gentle Purple', color: '#8064b5' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState('elderly');
  const [theme, setTheme] = useState('green');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session?.accessToken) {
      router.replace('/login');
      return;
    }

    const initialUser = session.user || {};
    setUser(initialUser);
    setName(initialUser.name || '');
    setAge(initialUser.age ?? '');
    setRole(initialUser.role || 'elderly');
    setPhone(initialUser.phone || '');
    setTheme(localStorage.getItem('aha_theme') || 'green');

    authApi.me().then((result) => {
      if (!result?.user) return;
      const fresh = result.user;
      setUser(fresh);
      setName(fresh.name || '');
      setAge(fresh.age ?? '');
      setRole(fresh.role || 'elderly');
      setPhone(fresh.phone || '');
      saveSession({ ...getSession(), user: fresh });
    }).catch(() => {
      // Keep the locally cached session visible; API helper already handles token refresh.
    });
  }, [router]);

  const selectTheme = (key) => {
    setTheme(key);
    localStorage.setItem('aha_theme', key);
    document.documentElement.dataset.ahaTheme = key;
  };

  const saveProfile = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await authApi.updateMe({
        name: name.trim(),
        age: age === '' ? null : Number(age),
        role,
      });
      const fresh = result.user;
      saveSession({ ...getSession(), user: fresh, accessToken: result.accessToken, refreshToken: result.refreshToken || getSession()?.refreshToken });
      setUser(fresh);
      setMessage('บันทึกข้อมูลโปรไฟล์แล้ว');
    } catch (err) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally { setSaving(false); }
  };

  const requestPhoneOtp = async () => {
    setError(''); setMessage('');
    if (!/^0\d{9}$/.test(phone)) {
      setError('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก');
      return;
    }
    if (phone === user?.phone) {
      setError('เบอร์ใหม่นี้เหมือนเบอร์เดิม');
      return;
    }
    try {
      await authApi.requestOtp(phone);
      setPhoneOtpSent(true);
      setMessage('ส่งรหัส OTP ไปยังเบอร์ใหม่แล้ว');
    } catch (err) {
      setError(err.message || 'ขอ OTP ไม่สำเร็จ');
    }
  };

  const confirmPhone = async () => {
    setError(''); setMessage('');
    try {
      const result = await authApi.changePhone(phone, otp);
      saveSession({ ...getSession(), user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken || getSession()?.refreshToken });
      setUser(result.user);
      setPhoneOtpSent(false);
      setOtp('');
      setMessage('เปลี่ยนเบอร์โทรศัพท์เรียบร้อยแล้ว');
    } catch (err) {
      setError(err.message || 'เปลี่ยนเบอร์ไม่สำเร็จ');
    }
  };

  const changePin = async () => {
    setError(''); setMessage('');
    try {
      await authApi.changePin(currentPin, newPin);
      setCurrentPin(''); setNewPin('');
      setMessage('เปลี่ยนรหัส PIN เรียบร้อยแล้ว');
    } catch (err) {
      setError(err.message || 'เปลี่ยน PIN ไม่สำเร็จ');
    }
  };

  const logout = async () => {
    try { await authApi.logout(getSession()?.refreshToken); } catch (_) {}
    clearSession();
    router.replace('/login');
  };

  if (!user) return <div className="aha-v3-page"><div className="aha-v3-empty">กำลังโหลดโปรไฟล์…</div></div>;

  return (
    <div className="aha-v3-page aha-profile-page">
      <div className="aha-v3-layout">
        <div className="aha-v3-main">
          <header className="aha-v3-topbar">
            <button className="aha-profile-back" onClick={() => router.push('/home')} type="button" aria-label="กลับหน้าหลัก"><AhaIcon name="arrow" size={20} /></button>
            <div className="aha-v3-brand"><span className="aha-v3-brand-mark"><span className="aha-v3-brand-wave">⌁</span></span><span><strong>AHA</strong><small>AI Health Assistant</small></span></div>
            <div className="aha-v3-top-message"><strong>โปรไฟล์ของคุณ</strong><span>จัดการข้อมูลและการตั้งค่าบัญชี</span></div>
          </header>

          <main className="aha-profile-content">
            <section className="aha-profile-head">
              <div className="aha-profile-avatar">{(user.name || 'A').slice(0, 1)}</div>
              <div><h1>{user.name || 'ผู้ใช้งาน AHA'}</h1><p>{user.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'} · {user.phone}</p></div>
            </section>

            {(message || error) && <div className={`aha-profile-alert ${error ? 'error' : 'success'}`}>{error || message}</div>}

            <section className="aha-profile-grid">
              <article className="aha-profile-card">
                <div className="aha-profile-card-title"><AhaIcon name="activity" size={22} /><div><h2>ข้อมูลส่วนตัว</h2><p>แก้ไขข้อมูลที่ใช้แสดงในระบบ</p></div></div>
                <label>ชื่อที่แสดง<input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></label>
                <label>อายุ<input type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} /></label>
                <label>บทบาทของบัญชี<select value={role} onChange={(e) => setRole(e.target.value)}><option value="elderly">ผู้สูงอายุ</option><option value="caregiver">ผู้ดูแล</option></select></label>
                {role !== user.role && <div className="aha-profile-warning">การเปลี่ยนบทบาทมีผลต่อหน้าหลัก สิทธิ์ และระบบเชื่อมต่อครอบครัว ควรเปลี่ยนเมื่อจำเป็น</div>}
                <button className="aha-profile-primary" onClick={saveProfile} disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</button>
              </article>

              <article className="aha-profile-card">
                <div className="aha-profile-card-title"><AhaIcon name="activity" size={22} /><div><h2>สีของระบบ</h2><p>เลือกสีที่สบายตาและเหมาะกับคุณ</p></div></div>
                <div className="aha-theme-grid">{THEMES.map((item) => <button key={item.key} className={`aha-theme-option ${theme === item.key ? 'active' : ''}`} onClick={() => selectTheme(item.key)} type="button"><span style={{ background: item.color }} />{item.name}</button>)}</div>
              </article>

              <article className="aha-profile-card">
                <div className="aha-profile-card-title"><AhaIcon name="phone" size={22} /><div><h2>เบอร์โทรศัพท์</h2><p>ต้องยืนยัน OTP ทุกครั้งเมื่อเปลี่ยนเบอร์</p></div></div>
                <label>เบอร์โทรศัพท์ใหม่<input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" /></label>
                {!phoneOtpSent ? <button className="aha-profile-secondary" onClick={requestPhoneOtp}>ส่ง OTP</button> : <><label>รหัส OTP<input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" /></label><button className="aha-profile-primary" onClick={confirmPhone}>ยืนยันการเปลี่ยนเบอร์</button></>}
              </article>

              <article className="aha-profile-card">
                <div className="aha-profile-card-title"><AhaIcon name="activity" size={22} /><div><h2>รหัส PIN</h2><p>ใช้สำหรับเข้าสู่ระบบ AHA</p></div></div>
                <label>PIN ปัจจุบัน<input type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
                <label>PIN ใหม่<input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
                <button className="aha-profile-secondary" onClick={changePin}>เปลี่ยน PIN</button>
              </article>
            </section>

            <section className="aha-profile-account-row">
              <div><strong>บัญชี AHA</strong><span>การออกจากระบบจะยกเลิก session ของอุปกรณ์นี้</span></div>
              <button className="aha-profile-danger" onClick={logout} type="button">ออกจากระบบ</button>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
