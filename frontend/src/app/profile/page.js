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
    if (!session?.accessToken) { router.replace('/login'); return; }
    const initialUser = session.user || {};
    setUser(initialUser); setName(initialUser.name || ''); setAge(initialUser.age ?? '');
    setRole(initialUser.role || 'elderly'); setPhone(initialUser.phone || '');
    const savedTheme = localStorage.getItem('aha_theme') || 'green';
    setTheme(savedTheme); document.documentElement.dataset.ahaTheme = savedTheme;

    authApi.me().then((result) => {
      if (!result?.user) return;
      const fresh = result.user;
      setUser(fresh); setName(fresh.name || ''); setAge(fresh.age ?? ''); setRole(fresh.role || 'elderly'); setPhone(fresh.phone || '');
      saveSession({ ...getSession(), user: fresh });
    }).catch(() => {});
  }, [router]);

  const selectTheme = (key) => { setTheme(key); localStorage.setItem('aha_theme', key); document.documentElement.dataset.ahaTheme = key; };

  const saveProfile = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await authApi.updateMe({ name: name.trim(), age: age === '' ? null : Number(age), role });
      const fresh = result.user;
      saveSession({ ...getSession(), user: fresh, accessToken: result.accessToken, refreshToken: result.refreshToken || getSession()?.refreshToken });
      setUser(fresh); setMessage('บันทึกข้อมูลโปรไฟล์แล้ว');
    } catch (err) { setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const requestPhoneOtp = async () => {
    setError(''); setMessage('');
    if (!/^0\d{9}$/.test(phone)) { setError('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก'); return; }
    if (phone === user?.phone) { setError('เบอร์ใหม่นี้เหมือนเบอร์เดิม'); return; }
    try { await authApi.requestOtp(phone); setPhoneOtpSent(true); setMessage('ส่งรหัส OTP ไปยังเบอร์ใหม่แล้ว'); }
    catch (err) { setError(err.message || 'ขอ OTP ไม่สำเร็จ'); }
  };

  const confirmPhone = async () => {
    setError(''); setMessage('');
    try {
      const result = await authApi.changePhone(phone, otp);
      saveSession({ ...getSession(), user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken || getSession()?.refreshToken });
      setUser(result.user); setPhoneOtpSent(false); setOtp(''); setMessage('เปลี่ยนเบอร์โทรศัพท์เรียบร้อยแล้ว');
    } catch (err) { setError(err.message || 'เปลี่ยนเบอร์ไม่สำเร็จ'); }
  };

  const changePin = async () => {
    setError(''); setMessage('');
    try { await authApi.changePin(currentPin, newPin); setCurrentPin(''); setNewPin(''); setMessage('เปลี่ยนรหัส PIN เรียบร้อยแล้ว'); }
    catch (err) { setError(err.message || 'เปลี่ยน PIN ไม่สำเร็จ'); }
  };

  const logout = async () => {
    try { await authApi.logout(getSession()?.refreshToken); } catch (_) {}
    clearSession(); router.replace('/login');
  };

  if (!user) return <div className="aha-v3-page"><div className="aha-v3-empty">กำลังโหลดโปรไฟล์…</div></div>;

  return (
    <div className="aha-v3-page aha-profile-page">
      <div className="aha-v3-layout"><div className="aha-v3-main">
        <header className="aha-v3-topbar">
          <button className="aha-profile-back" onClick={() => router.push('/home')} type="button" aria-label="กลับหน้าหลัก"><AhaIcon name="arrow" size={20} /></button>
          <div className="aha-v3-brand"><span className="aha-v3-brand-mark"><span className="aha-v3-brand-wave">⌁</span></span><span><strong>AHA</strong><small>AI Health Assistant</small></span></div>
          <div className="aha-v3-top-message"><strong>โปรไฟล์ของคุณ</strong><span>จัดการข้อมูลและการตั้งค่าบัญชี</span></div>
        </header>

        <main className="aha-profile-content">
          <section className="aha-profile-head"><div className="aha-profile-avatar">{(user.name || 'A').slice(0, 1)}</div><div><h1>{user.name || 'ผู้ใช้งาน AHA'}</h1><p>{user.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'} · {user.phone}</p></div></section>
          {(message || error) && <div className={`aha-profile-alert ${error ? 'error' : 'success'}`}>{error || message}</div>}

          <section className="aha-profile-grid">
            <article className="aha-profile-card"><div className="aha-profile-card-title"><AhaIcon name="activity" size={22} /><div><h2>ข้อมูลส่วนตัว</h2><p>แก้ไขข้อมูลที่ใช้แสดงในระบบ</p></div></div><label>ชื่อที่แสดง<input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></label><label>อายุ<input type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} /></label><label>บทบาทของบัญชี<select value={role} onChange={(e) => setRole(e.target.value)}><option value="elderly">ผู้สูงอายุ</option><option value="caregiver">ผู้ดูแล</option></select></label>{role !== user.role && <div className="aha-profile-warning">การเปลี่ยนบทบาทมีผลต่อหน้าหลัก สิทธิ์ และระบบเชื่อมต่อครอบครัว ควรเปลี่ยนเมื่อจำเป็น</div>}<button className="aha-profile-primary" onClick={saveProfile} disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</button></article>

            <article className="aha-profile-card"><div className="aha-profile-card-title"><AhaIcon name="activity" size={22} /><div><h2>สีของระบบ</h2><p>เลือกสีที่สบายตาและเหมาะกับคุณ</p></div></div><div className="aha-theme-grid">{THEMES.map((item) => <button key={item.key} className={`aha-theme-option ${theme === item.key ? 'active' : ''}`} onClick={() => selectTheme(item.key)} type="button"><span style={{ background: item.color }} />{item.name}</button>)}</div></article>

            <article className="aha-profile-card"><div className="aha-profile-card-title"><AhaIcon name="phone" size={22} /><div><h2>เบอร์โทรศัพท์</h2><p>ต้องยืนยัน OTP ทุกครั้งเมื่อเปลี่ยนเบอร์</p></div></div><label>เบอร์โทรศัพท์ใหม่<input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" /></label>{!phoneOtpSent ? <button className="aha-profile-secondary" onClick={requestPhoneOtp}>ส่ง OTP</button> : <><label>รหัส OTP<input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" /></label><button className="aha-profile-primary" onClick={confirmPhone}>ยืนยันการเปลี่ยนเบอร์</button></>}</article>

            <article className="aha-profile-card"><div className="aha-profile-card-title"><AhaIcon name="activity" size={22} /><div><h2>รหัส PIN</h2><p>ใช้สำหรับเข้าสู่ระบบ AHA</p></div></div><label>PIN ปัจจุบัน<input type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label><label>PIN ใหม่<input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label><button className="aha-profile-secondary" onClick={changePin}>เปลี่ยน PIN</button></article>
          </section>

          <section className="aha-profile-account-row"><div><strong>บัญชี AHA</strong><span>การออกจากระบบจะยกเลิก session ของอุปกรณ์นี้</span></div><button className="aha-profile-danger" onClick={logout} type="button">ออกจากระบบ</button></section>
        </main>

        <style jsx global>{`
          .aha-profile-page{min-height:100vh;background:#f3f9f6}
          .aha-profile-content{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:20px 0 40px}
          .aha-profile-back{width:42px;height:42px;border:1px solid #d7e7df;background:#fff;border-radius:13px;color:#2f9b68;display:grid;place-items:center}
          .aha-profile-head{display:flex;align-items:center;gap:18px;margin:8px 0 22px;padding:24px;border:1px solid #d9e9e1;background:#fff;border-radius:24px;box-shadow:0 14px 35px rgba(35,95,70,.08)}
          .aha-profile-avatar{width:76px;height:76px;border-radius:24px;background:linear-gradient(145deg,#2f9b68,#57b887);color:#fff;display:grid;place-items:center;font-size:32px;font-weight:900;flex:0 0 auto}
          .aha-profile-head h1{margin:0 0 5px;font-size:30px;color:#173c2c}.aha-profile-head p{margin:0;color:#6f887c;font-size:16px}
          .aha-profile-alert{margin-bottom:16px;padding:13px 16px;border-radius:15px;font-weight:700}.aha-profile-alert.success{background:#edf9f2;color:#287c4e;border:1px solid #ccebd8}.aha-profile-alert.error{background:#fff1f1;color:#b82d2a;border:1px solid #ffd1cf}
          .aha-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
          .aha-profile-card{background:#fff;border:1px solid #d9e9e1;border-radius:22px;padding:22px;box-shadow:0 12px 30px rgba(35,95,70,.07);display:grid;gap:14px}
          .aha-profile-card-title{display:flex;align-items:flex-start;gap:11px;color:#2f9b68}.aha-profile-card-title h2{margin:0;color:#183d2e;font-size:20px}.aha-profile-card-title p{margin:4px 0 0;color:#7a9086;font-size:14px}
          .aha-profile-card label{display:grid;gap:7px;color:#315347;font-weight:800;font-size:15px}.aha-profile-card input,.aha-profile-card select{min-height:50px;border:1px solid #cfe1d8;border-radius:14px;padding:0 14px;background:#fbfefc;color:#183d2e;outline:none}.aha-profile-card input:focus,.aha-profile-card select:focus{border-color:#2f9b68;box-shadow:0 0 0 4px rgba(47,155,104,.12)}
          .aha-profile-primary,.aha-profile-secondary,.aha-profile-danger{min-height:50px;border-radius:14px;border:0;padding:0 18px;font-weight:900}.aha-profile-primary{background:#2f9b68;color:#fff;box-shadow:0 9px 20px rgba(47,155,104,.2)}.aha-profile-primary:disabled{opacity:.55}.aha-profile-secondary{background:#edf8f2;color:#287c4e;border:1px solid #cce8d8}.aha-profile-danger{background:#fff1f1;color:#bf3632;border:1px solid #ffd2cf}
          .aha-profile-warning{padding:11px 13px;border-radius:13px;background:#fff8e9;color:#87661b;border:1px solid #f3dfac;font-size:13px;line-height:1.55}
          .aha-theme-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.aha-theme-option{min-height:58px;border:1px solid #d8e7df;background:#fff;border-radius:14px;display:flex;align-items:center;gap:10px;padding:0 12px;color:#345548;font-weight:800;text-align:left}.aha-theme-option span{width:20px;height:20px;border-radius:50%;flex:0 0 auto}.aha-theme-option.active{border-color:#2f9b68;box-shadow:0 0 0 3px rgba(47,155,104,.1);color:#236f48}
          .aha-profile-account-row{margin-top:16px;padding:18px 20px;border:1px solid #d9e9e1;background:#fff;border-radius:20px;display:flex;align-items:center;justify-content:space-between;gap:15px}.aha-profile-account-row strong{display:block;color:#183d2e}.aha-profile-account-row span{display:block;color:#7a9086;font-size:13px;margin-top:3px}
          @media(max-width:700px){.aha-profile-content{width:calc(100% - 18px);padding-top:10px}.aha-profile-grid{grid-template-columns:1fr}.aha-profile-head{padding:18px}.aha-profile-head h1{font-size:24px}.aha-profile-avatar{width:62px;height:62px;border-radius:19px;font-size:27px}.aha-theme-grid{grid-template-columns:1fr}.aha-profile-account-row{align-items:stretch;flex-direction:column}.aha-profile-danger{width:100%}}
        `}</style>
      </div></div>
    </div>
  );
}
