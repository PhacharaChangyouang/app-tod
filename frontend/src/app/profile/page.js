'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { authApi } from '../../services/api';
import { clearSession, getSession, saveSession } from '../../services/auth';

const THEMES = [
  { key: 'green', name: 'เขียว AHA', color: '#2f9b68' },
  { key: 'blue', name: 'ฟ้าอ่อน', color: '#3b82c4' },
  { key: 'teal', name: 'เขียวอมฟ้า', color: '#2a9d8f' },
  { key: 'purple', name: 'ม่วงอ่อน', color: '#8064b5' },
];

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState('elderly');
  const [theme, setTheme] = useState('green');
  const [avatar, setAvatar] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session?.accessToken) { router.replace('/login'); return; }
    const initial = session.user || {};
    setUser(initial);
    setName(initial.name || '');
    setAge(initial.age ?? '');
    setRole(initial.role || 'elderly');
    setPhone(initial.phone || '');
    setTheme(localStorage.getItem('aha_theme') || 'green');
    setAvatar(localStorage.getItem(`aha_avatar_${initial.id}`) || '');
    document.documentElement.dataset.ahaTheme = localStorage.getItem('aha_theme') || 'green';

    authApi.me().then((result) => {
      if (!result?.user) return;
      const fresh = result.user;
      setUser(fresh); setName(fresh.name || ''); setAge(fresh.age ?? ''); setRole(fresh.role || 'elderly'); setPhone(fresh.phone || '');
      setAvatar(localStorage.getItem(`aha_avatar_${fresh.id}`) || '');
      saveSession({ ...getSession(), user: fresh });
    }).catch(() => {});
  }, [router]);

  const flash = (ok, text) => { setError(ok ? '' : text); setMessage(ok ? text : ''); };

  const selectTheme = (key) => {
    setTheme(key);
    localStorage.setItem('aha_theme', key);
    document.documentElement.dataset.ahaTheme = key;
    flash(true, 'เปลี่ยนสีระบบแล้ว');
  };

  const chooseAvatar = () => fileRef.current?.click();

  const onAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { flash(false, 'กรุณาเลือกไฟล์รูปภาพ'); return; }
    if (file.size > 2 * 1024 * 1024) { flash(false, 'รูปภาพต้องมีขนาดไม่เกิน 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      setAvatar(value);
      if (user?.id) localStorage.setItem(`aha_avatar_${user.id}`, value);
      flash(true, 'เปลี่ยนรูปโปรไฟล์แล้ว');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const removeAvatar = () => {
    setAvatar('');
    if (user?.id) localStorage.removeItem(`aha_avatar_${user.id}`);
    flash(true, 'ลบรูปโปรไฟล์แล้ว');
  };

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
    if (!/^\d{4}$/.test(currentPin)) { setError('PIN ปัจจุบันต้องเป็นตัวเลข 4 หลัก'); return; }
    if (!/^\d{4}$/.test(newPin)) { setError('PIN ใหม่ต้องเป็นตัวเลข 4 หลัก'); return; }
    if (currentPin === newPin) { setError('PIN ใหม่ต้องไม่เหมือน PIN เดิม'); return; }
    setPinSaving(true);
    try { await authApi.changePin(currentPin, newPin); setCurrentPin(''); setNewPin(''); setMessage('เปลี่ยนรหัส PIN 4 หลักเรียบร้อยแล้ว'); }
    catch (err) { setError(err.message || 'เปลี่ยน PIN ไม่สำเร็จ'); }
    finally { setPinSaving(false); }
  };

  const logout = async () => {
    try { await authApi.logout(getSession()?.refreshToken); } catch (_) {}
    clearSession(); router.replace('/login');
  };

  if (!user) return <div className="aha-profile-page"><div className="aha-profile-loading">กำลังโหลดโปรไฟล์…</div></div>;

  const initial = (user.name || 'A').slice(0, 1).toUpperCase();

  return (
    <div className="aha-profile-page">
      <header className="aha-profile-header">
        <button className="aha-profile-icon-button" onClick={() => router.push('/home')} type="button" aria-label="กลับหน้าหลัก"><AhaIcon name="arrow" size={22} /></button>
        <div className="aha-profile-title"><strong>โปรไฟล์ของคุณ</strong><span>ข้อมูลและการตั้งค่า</span></div>
        <button className="aha-profile-home-button" onClick={() => router.push('/home')} type="button"><AhaIcon name="home" size={19} /><span>หน้าหลัก</span></button>
      </header>

      <main className="aha-profile-wrap">
        <section className="aha-profile-identity">
          <div className="aha-profile-avatar-wrap">
            <button className="aha-profile-avatar" onClick={chooseAvatar} type="button" aria-label="เปลี่ยนรูปโปรไฟล์">
              {avatar ? <img src={avatar} alt="รูปโปรไฟล์" /> : <span>{initial}</span>}
              <i><AhaIcon name="activity" size={16} /></i>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} hidden />
          </div>
          <div className="aha-profile-identity-copy"><h1>{user.name || 'ผู้ใช้งาน AHA'}</h1><p>{user.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'} · {user.phone}</p><div><button type="button" onClick={chooseAvatar}>เปลี่ยนรูป</button>{avatar && <button type="button" onClick={removeAvatar}>ลบรูป</button>}</div></div>
        </section>

        {(message || error) && <div className={`aha-profile-alert ${error ? 'error' : 'success'}`}>{error || message}</div>}

        <section className="aha-profile-section">
          <div className="aha-profile-section-heading"><div><h2>ข้อมูลส่วนตัว</h2><p>ข้อมูลที่ใช้แสดงในระบบ AHA</p></div></div>
          <div className="aha-profile-fields">
            <label>ชื่อที่แสดง<input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></label>
            <label>อายุ<input type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} /></label>
            <label>บทบาท<select value={role} onChange={(e) => setRole(e.target.value)}><option value="elderly">ผู้สูงอายุ</option><option value="caregiver">ผู้ดูแล</option></select></label>
          </div>
          <button className="aha-profile-primary" onClick={saveProfile} disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</button>
        </section>

        <section className="aha-profile-section">
          <div className="aha-profile-section-heading"><div><h2>ลักษณะการแสดงผล</h2><p>เลือกสีที่อ่านง่ายและสบายตา</p></div></div>
          <div className="aha-theme-grid">{THEMES.map((item) => <button key={item.key} type="button" className={`aha-theme-option ${theme === item.key ? 'active' : ''}`} onClick={() => selectTheme(item.key)}><span style={{ background: item.color }} />{item.name}{theme === item.key && <b>✓</b>}</button>)}</div>
        </section>

        <section className="aha-profile-section">
          <div className="aha-profile-section-heading"><div><h2>เปลี่ยนเบอร์โทรศัพท์</h2><p>ต้องยืนยัน OTP ไปยังเบอร์ใหม่</p></div></div>
          <div className="aha-profile-fields single"><label>เบอร์โทรศัพท์ใหม่<input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="0XXXXXXXXX" /></label></div>
          {!phoneOtpSent ? <button className="aha-profile-secondary" onClick={requestPhoneOtp}>ส่ง OTP</button> : <div className="aha-profile-otp"><label>รหัส OTP<input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} /></label><button className="aha-profile-primary" onClick={confirmPhone}>ยืนยันการเปลี่ยนเบอร์</button></div>}
        </section>

        <section className="aha-profile-section">
          <div className="aha-profile-section-heading"><div><h2>รหัส PIN</h2><p>ใช้ PIN สำหรับการเข้าสู่ระบบแบบ PIN — ต้องเป็นตัวเลข 4 หลักเท่านั้น</p></div></div>
          <div className="aha-profile-pin-grid"><label>PIN ปัจจุบัน<input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="current-password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></label><label>PIN ใหม่<input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="new-password" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></label></div>
          <button className="aha-profile-secondary" onClick={changePin} disabled={pinSaving}>{pinSaving ? 'กำลังบันทึก…' : 'เปลี่ยน PIN 4 หลัก'}</button>
        </section>

        <section className="aha-profile-account"><div><strong>บัญชี AHA</strong><span>ออกจากระบบเฉพาะอุปกรณ์นี้</span></div><button onClick={logout} type="button">ออกจากระบบ</button></section>
      </main>

      <nav className="aha-profile-mobile-nav"><button onClick={() => router.push('/home')} type="button"><AhaIcon name="home" size={20} /><span>หน้าหลัก</span></button><button className="active" type="button"><AhaIcon name="activity" size={20} /><span>โปรไฟล์</span></button></nav>

      <style jsx>{`
        .aha-profile-page{min-height:100vh;background:#f4f9f7;color:#183d2e;padding-bottom:28px;font-family:Arial,"Noto Sans Thai",sans-serif}
        .aha-profile-header{height:76px;width:min(1040px,calc(100% - 28px));margin:auto;display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:14px}
        .aha-profile-icon-button,.aha-profile-home-button{border:1px solid #d7e7df;background:#fff;color:#2f9b68;border-radius:14px;min-height:44px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:800}
        .aha-profile-icon-button{width:44px}.aha-profile-home-button{padding:0 14px}.aha-profile-title strong{display:block;font-size:22px}.aha-profile-title span{display:block;color:#789087;font-size:13px;margin-top:2px}
        .aha-profile-wrap{width:min(920px,calc(100% - 28px));margin:auto;display:grid;gap:16px}
        .aha-profile-identity,.aha-profile-section,.aha-profile-account{background:#fff;border:1px solid #dbeae3;border-radius:22px;box-shadow:0 10px 28px rgba(35,95,70,.06)}
        .aha-profile-identity{padding:22px;display:flex;align-items:center;gap:18px}.aha-profile-avatar-wrap{flex:0 0 auto}.aha-profile-avatar{width:92px;height:92px;border-radius:26px;border:0;background:linear-gradient(145deg,#2f9b68,#58b989);color:#fff;display:grid;place-items:center;font-size:38px;font-weight:900;position:relative;padding:0;overflow:hidden}.aha-profile-avatar img{width:100%;height:100%;object-fit:cover}.aha-profile-avatar i{position:absolute;right:4px;bottom:4px;width:29px;height:29px;border-radius:10px;background:#fff;color:#2f9b68;display:grid;place-items:center;font-style:normal;box-shadow:0 3px 10px rgba(0,0,0,.12)}
        .aha-profile-identity-copy h1{font-size:28px;margin:0 0 5px}.aha-profile-identity-copy p{margin:0;color:#71877e;font-size:15px}.aha-profile-identity-copy>div{display:flex;gap:8px;margin-top:10px}.aha-profile-identity-copy button{border:0;background:#edf8f2;color:#287c4e;border-radius:10px;padding:8px 11px;font-weight:800}
        .aha-profile-alert{padding:13px 16px;border-radius:14px;font-weight:800}.aha-profile-alert.success{background:#edf9f2;color:#287c4e;border:1px solid #ccebd8}.aha-profile-alert.error{background:#fff1f1;color:#b82d2a;border:1px solid #ffd1cf}
        .aha-profile-section{padding:22px}.aha-profile-section-heading{margin-bottom:17px}.aha-profile-section-heading h2{margin:0;font-size:21px}.aha-profile-section-heading p{margin:5px 0 0;color:#789087;font-size:14px;line-height:1.55}
        .aha-profile-fields,.aha-profile-pin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.aha-profile-fields.single{grid-template-columns:minmax(0,420px)}.aha-profile-pin-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:680px}
        .aha-profile-section label{display:grid;gap:7px;font-size:15px;font-weight:800;color:#315347}.aha-profile-section input,.aha-profile-section select{width:100%;min-height:50px;border:1px solid #cfe1d8;border-radius:13px;background:#fbfefc;color:#183d2e;padding:0 14px;outline:none;font-size:17px}.aha-profile-section input:focus,.aha-profile-section select:focus{border-color:#2f9b68;box-shadow:0 0 0 4px rgba(47,155,104,.1)}
        .aha-profile-primary,.aha-profile-secondary{margin-top:15px;min-height:50px;border-radius:13px;padding:0 18px;font-weight:900;border:0}.aha-profile-primary{background:#2f9b68;color:#fff}.aha-profile-secondary{background:#edf8f2;color:#287c4e;border:1px solid #cce8d8}.aha-profile-primary:disabled,.aha-profile-secondary:disabled{opacity:.55}
        .aha-theme-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.aha-theme-option{min-height:58px;border:1px solid #d8e7df;background:#fff;border-radius:13px;display:flex;align-items:center;gap:9px;padding:0 12px;color:#345548;font-weight:800}.aha-theme-option span{width:20px;height:20px;border-radius:50%;flex:0 0 auto}.aha-theme-option b{margin-left:auto;color:#2f9b68}.aha-theme-option.active{border-color:#2f9b68;box-shadow:0 0 0 3px rgba(47,155,104,.09)}
        .aha-profile-otp{display:flex;gap:12px;align-items:end;max-width:680px}.aha-profile-otp label{flex:1}.aha-profile-otp .aha-profile-primary{margin:0;white-space:nowrap}
        .aha-profile-account{padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px}.aha-profile-account strong{display:block}.aha-profile-account span{display:block;color:#789087;font-size:13px;margin-top:3px}.aha-profile-account button{min-height:46px;border:1px solid #ffd1cf;background:#fff2f1;color:#bd3935;border-radius:12px;padding:0 16px;font-weight:900}
        .aha-profile-mobile-nav{display:none}.aha-profile-loading{min-height:100vh;display:grid;place-items:center;color:#6e867b;font-weight:800}
        @media(max-width:720px){.aha-profile-page{padding-bottom:86px}.aha-profile-header{height:68px;width:calc(100% - 18px);grid-template-columns:42px 1fr auto;gap:9px}.aha-profile-title strong{font-size:18px}.aha-profile-title span{font-size:12px}.aha-profile-home-button{width:42px;padding:0}.aha-profile-home-button span{display:none}.aha-profile-wrap{width:calc(100% - 18px);gap:12px}.aha-profile-identity{padding:16px;gap:13px;border-radius:18px}.aha-profile-avatar{width:70px;height:70px;border-radius:21px;font-size:30px}.aha-profile-identity-copy h1{font-size:22px}.aha-profile-identity-copy p{font-size:13px}.aha-profile-section{padding:17px;border-radius:18px}.aha-profile-fields,.aha-profile-pin-grid,.aha-theme-grid{grid-template-columns:1fr 1fr}.aha-profile-fields.single,.aha-profile-pin-grid{grid-template-columns:1fr}.aha-profile-theme-option{font-size:14px}.aha-profile-otp{display:grid;grid-template-columns:1fr}.aha-profile-otp .aha-profile-primary{margin-top:0}.aha-profile-account{border-radius:18px}.aha-profile-mobile-nav{position:fixed;left:9px;right:9px;bottom:9px;height:64px;background:rgba(255,255,255,.96);border:1px solid #d7e7df;border-radius:19px;display:grid;grid-template-columns:1fr 1fr;z-index:40;box-shadow:0 10px 30px rgba(30,80,60,.14);backdrop-filter:blur(12px)}.aha-profile-mobile-nav button{border:0;background:transparent;color:#71877e;display:grid;place-items:center;gap:2px;font-size:11px;font-weight:900}.aha-profile-mobile-nav button.active{color:#2f9b68}.aha-profile-mobile-nav span{line-height:1}.aha-profile-identity-copy>div{margin-top:7px}}
        @media(max-width:430px){.aha-profile-fields{grid-template-columns:1fr}.aha-theme-grid{grid-template-columns:1fr 1fr}.aha-profile-identity-copy h1{font-size:19px}.aha-profile-section-heading h2{font-size:19px}}
      `}</style>
    </div>
  );
}
