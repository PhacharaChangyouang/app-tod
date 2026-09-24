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
  const [alertSound, setAlertSound] = useState(true);

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
    setAlertSound(localStorage.getItem('aha_alert_sound') !== 'false');
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
        <div className="aha-profile-title"><strong>โปรไฟล์</strong><span>บัญชีและการตั้งค่า AHA</span></div>
        <button className="aha-profile-home-button" onClick={() => router.push('/home')} type="button"><AhaIcon name="home" size={19} /><span>หน้าหลัก</span></button>
      </header>

      <main className="aha-profile-wrap">
        <section className="aha-profile-identity">
          <span className="aha-profile-orb orb-one" /><span className="aha-profile-orb orb-two" />
          <button className="aha-profile-edit" onClick={chooseAvatar} type="button">แก้ไขรูป</button>
          <div className="aha-profile-avatar-wrap">
            <button className="aha-profile-avatar" onClick={chooseAvatar} type="button" aria-label="เปลี่ยนรูปโปรไฟล์">
              {avatar ? <img src={avatar} alt="รูปโปรไฟล์" /> : <span>{initial}</span>}
              <i aria-hidden="true" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} hidden />
          </div>
          <div className="aha-profile-identity-copy">
            <span className="aha-profile-role">{user.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</span>
            <h1>{user.name || 'ผู้ใช้งาน AHA'}</h1>
            <p>{user.phone || 'ยังไม่ได้ระบุเบอร์โทรศัพท์'}</p>
            {avatar && <button className="aha-profile-remove-avatar" type="button" onClick={removeAvatar}>ลบรูปโปรไฟล์</button>}
          </div>
          <div className="aha-profile-mark" aria-hidden="true"><span /><span /><span /><span /></div>
        </section>

        {(message || error) && <div className={`aha-profile-alert ${error ? 'error' : 'success'}`}>{error || message}</div>}

        <section className="aha-profile-section aha-profile-personal">
          <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">PROFILE</span><h2>ข้อมูลส่วนตัว</h2><p>ข้อมูลที่ใช้แสดงในระบบ AHA</p></div></div>
          <div className="aha-profile-fields">
            <label>ชื่อที่แสดง<input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></label>
            <label>อายุ<input type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} /></label>
            <label>บทบาท<select value={role} onChange={(e) => setRole(e.target.value)}><option value="elderly">ผู้สูงอายุ</option><option value="caregiver">ผู้ดูแล</option></select></label>
          </div>
          <button className="aha-profile-primary" onClick={saveProfile} disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</button>
        </section>

        <section className="aha-profile-section">
          <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">APPEARANCE</span><h2>สีของระบบ</h2><p>เลือกโทนสีที่อ่านง่ายและเหมาะกับคุณ</p></div></div>
          <div className="aha-theme-grid">{THEMES.map((item) => <button key={item.key} type="button" className={`aha-theme-option ${theme === item.key ? 'active' : ''}`} onClick={() => selectTheme(item.key)}><span style={{ background: item.color }} />{item.name}{theme === item.key && <b>✓</b>}</button>)}</div>
        </section>

        <div className="aha-profile-settings-grid">
          <section className="aha-profile-section">
            <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">NOTIFICATIONS</span><h2>เสียงแจ้งเตือน</h2><p>เสียงแจ้งเตือนภายใน AHA</p></div></div>
            <button type="button" className={`aha-profile-sound-toggle ${alertSound ? 'active' : ''}`} aria-pressed={alertSound} onClick={() => { const next=!alertSound; setAlertSound(next); localStorage.setItem('aha_alert_sound', String(next)); setMessage(next ? 'เปิดเสียงแจ้งเตือนแล้ว' : 'ปิดเสียงแจ้งเตือนแล้ว'); setError(''); }}><span><AhaIcon name="bell" size={20} /></span><strong>{alertSound ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียงแจ้งเตือน'}</strong><i aria-hidden="true"><b /></i></button>
          </section>

          <section className="aha-profile-section">
            <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">PHONE</span><h2>เบอร์โทรศัพท์</h2><p>เปลี่ยนเบอร์ด้วยการยืนยัน OTP</p></div></div>
            <div className="aha-profile-fields single"><label>เบอร์โทรศัพท์ใหม่<input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="0XXXXXXXXX" /></label></div>
            {!phoneOtpSent ? <button className="aha-profile-secondary" onClick={requestPhoneOtp}>ส่ง OTP</button> : <div className="aha-profile-otp"><label>รหัส OTP<input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} /></label><button className="aha-profile-primary" onClick={confirmPhone}>ยืนยันเบอร์ใหม่</button></div>}
          </section>
        </div>

        <section className="aha-profile-section aha-profile-security">
          <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">SECURITY</span><h2>ความปลอดภัยของบัญชี</h2><p>เปลี่ยน PIN สำหรับการเข้าสู่ระบบ — ใช้ตัวเลข 4 หลัก</p></div></div>
          <div className="aha-profile-pin-grid"><label>PIN ปัจจุบัน<input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="current-password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></label><label>PIN ใหม่<input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="new-password" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></label></div>
          <button className="aha-profile-secondary" onClick={changePin} disabled={pinSaving}>{pinSaving ? 'กำลังบันทึก…' : 'เปลี่ยน PIN 4 หลัก'}</button>
        </section>

        <section className="aha-profile-account"><div><span className="aha-profile-kicker">ACCOUNT</span><strong>บัญชี AHA</strong><span>ออกจากระบบเฉพาะอุปกรณ์นี้</span></div><button onClick={logout} type="button">ออกจากระบบ</button></section>
        <footer className="aha-profile-footer">AHA · AI Health Assistant</footer>
      </main>

      <style jsx>{`
        .aha-profile-page{--blue:#2f6bff;--blue-deep:#172d79;--navy:#101c4b;--orange:#ffb84d;--cyan:#42d4cf;min-height:100dvh;background:#fbf8f2;color:#17213d;padding:0 0 calc(118px + env(safe-area-inset-bottom,0px));font-family:Arial,"Noto Sans Thai",sans-serif;overflow-x:hidden}
        .aha-profile-header{height:78px;width:min(1040px,calc(100% - 32px));margin:auto;display:grid;grid-template-columns:46px 1fr auto;align-items:center;gap:14px}
        .aha-profile-icon-button,.aha-profile-home-button{min-height:44px;border:1px solid #e2e5ec;background:#fff;color:#17213d;border-radius:15px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:800;box-shadow:0 7px 20px rgba(30,43,79,.06)}
        .aha-profile-icon-button{width:46px}.aha-profile-home-button{padding:0 15px}.aha-profile-title strong{display:block;font-size:23px}.aha-profile-title span{display:block;color:#7b8395;font-size:12px;margin-top:2px}
        .aha-profile-wrap{width:min(920px,calc(100% - 32px));margin:auto;display:grid;gap:16px}
        .aha-profile-identity{min-height:224px;padding:28px 30px;display:flex;align-items:center;gap:22px;position:relative;isolation:isolate;overflow:hidden;border-radius:28px;background:linear-gradient(135deg,#16286d 0%,#2f54cf 50%,#244bc0 100%);color:#fff;box-shadow:0 18px 45px rgba(31,57,137,.20)}
        .aha-profile-orb{position:absolute;z-index:-1;border-radius:50%;pointer-events:none}.orb-one{width:280px;height:190px;right:-70px;bottom:-100px;background:var(--cyan);opacity:.76}.orb-two{width:300px;height:190px;left:-150px;bottom:-125px;background:var(--orange);opacity:.96}
        .aha-profile-edit{position:absolute;right:22px;top:20px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.16);backdrop-filter:blur(8px);color:#fff;border-radius:99px;padding:9px 15px;font-weight:800;cursor:pointer}
        .aha-profile-avatar-wrap{flex:0 0 auto}.aha-profile-avatar{width:118px;height:118px;border-radius:50%;border:4px solid rgba(255,255,255,.88);background:linear-gradient(145deg,#56d8e1,#e6fbff);color:#17347b;display:grid;place-items:center;font-size:44px;font-weight:900;position:relative;padding:0;overflow:hidden;box-shadow:0 10px 28px rgba(4,16,59,.24)}
        .aha-profile-avatar img{width:100%;height:100%;object-fit:cover}.aha-profile-avatar i{position:absolute;right:5px;bottom:5px;width:22px;height:22px;border:4px solid #fff;border-radius:50%;background:#34c987}
        .aha-profile-identity-copy{min-width:0;position:relative;z-index:2}.aha-profile-role{display:inline-flex;padding:5px 9px;border-radius:99px;background:rgba(255,184,77,.17);color:#ffd58e;border:1px solid rgba(255,202,116,.35);font-size:11px;font-weight:900;margin-bottom:8px}
        .aha-profile-identity-copy h1{font-size:32px;line-height:1.12;margin:0 0 6px;overflow-wrap:anywhere}.aha-profile-identity-copy p{margin:0;color:#dce5ff;font-size:15px}.aha-profile-remove-avatar{margin-top:11px;border:0;background:transparent;color:#ffd5d5;padding:0;font-size:11px;text-decoration:underline}
        .aha-profile-mark{position:absolute;right:28px;bottom:24px;display:flex;gap:4px;align-items:center}.aha-profile-mark span{display:block;width:3px;height:27px;border-radius:3px;background:rgba(255,255,255,.78)}.aha-profile-mark span:nth-child(2){height:18px}.aha-profile-mark span:nth-child(3){height:31px}.aha-profile-mark span:nth-child(4){height:22px}
        .aha-profile-alert{padding:13px 16px;border-radius:15px;font-weight:800;overflow-wrap:anywhere}.aha-profile-alert.success{background:#eafaf6;color:#157a68;border:1px solid #bfe8dd}.aha-profile-alert.error{background:#fff0f0;color:#ad2631;border:1px solid #f3c0c4}
        .aha-profile-section,.aha-profile-account{background:#fff;border:1px solid #e8e8eb;border-radius:24px;box-shadow:0 10px 30px rgba(28,39,72,.055)}
        .aha-profile-section{padding:22px}.aha-profile-section-heading{margin-bottom:17px}.aha-profile-section-heading h2{margin:2px 0 0;font-size:21px;color:#17213d}.aha-profile-section-heading p{margin:5px 0 0;color:#7b8395;font-size:13px;line-height:1.55}.aha-profile-kicker{display:block;color:var(--blue);font-size:10px;font-weight:900;letter-spacing:.12em}
        .aha-profile-fields,.aha-profile-pin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.aha-profile-fields.single{grid-template-columns:1fr}.aha-profile-pin-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:680px}
        .aha-profile-section label{display:grid;gap:7px;font-size:13px;font-weight:800;color:#303a57}.aha-profile-section input,.aha-profile-section select{width:100%;min-width:0;min-height:50px;border:1px solid #dcdfe7;border-radius:14px;background:#fcfcfd;color:#17213d;padding:0 14px;outline:none;font-size:16px;box-sizing:border-box}.aha-profile-section input:focus,.aha-profile-section select:focus{border-color:var(--blue);box-shadow:0 0 0 4px rgba(47,107,255,.09)}
        .aha-profile-primary,.aha-profile-secondary{margin-top:15px;min-height:49px;border-radius:14px;padding:0 18px;font-weight:900;cursor:pointer}.aha-profile-primary{border:0;background:var(--blue);color:#fff;box-shadow:0 8px 18px rgba(47,107,255,.17)}.aha-profile-secondary{background:#f3f6ff;color:#244fbf;border:1px solid #d4ddfb}.aha-profile-primary:disabled,.aha-profile-secondary:disabled{opacity:.55}
        .aha-theme-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:5px;border-radius:18px;background:#f2f3f6}.aha-theme-option{min-width:0;min-height:55px;border:1px solid transparent;background:transparent;border-radius:14px;display:flex;align-items:center;gap:8px;padding:0 11px;color:#4d566c;font-weight:800}.aha-theme-option span{width:19px;height:19px;border-radius:50%;flex:0 0 auto}.aha-theme-option b{margin-left:auto;color:#009b99}.aha-theme-option.active{background:#e6fbf8;border-color:#38bdb7;color:#126b70;box-shadow:0 4px 12px rgba(22,139,137,.09)}
        .aha-profile-settings-grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:16px}.aha-profile-sound-toggle{width:100%;min-height:60px;border:1px solid #e1e4e9;background:#f8f9fb;border-radius:16px;padding:10px 12px;display:flex;align-items:center;gap:10px;color:#536077}.aha-profile-sound-toggle>span{width:39px;height:39px;border-radius:12px;background:#eef1f5;display:grid;place-items:center}.aha-profile-sound-toggle strong{flex:1;text-align:left}.aha-profile-sound-toggle>i{width:47px;height:27px;border-radius:99px;background:#cbd0d8;padding:3px;display:flex;align-items:center}.aha-profile-sound-toggle>i b{width:21px;height:21px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.16);transition:transform .18s ease}.aha-profile-sound-toggle.active{border-color:#b8e3df;background:#effbf9;color:#176f6c}.aha-profile-sound-toggle.active>i{background:#24aaa5}.aha-profile-sound-toggle.active>i b{transform:translateX(20px)}
        .aha-profile-otp{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end}.aha-profile-otp .aha-profile-primary{margin:0;white-space:nowrap}
        .aha-profile-account{padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px}.aha-profile-account strong{display:block;font-size:17px;margin-top:2px}.aha-profile-account>div>span:last-child{display:block;color:#858c9c;font-size:12px;margin-top:3px}.aha-profile-account button{min-height:44px;border:1px solid #f1c4c7;background:#fff1f1;color:#b32e38;border-radius:13px;padding:0 16px;font-weight:900}
        .aha-profile-footer{text-align:center;color:#9aa0ae;font-size:11px;padding:3px 0 10px}.aha-profile-loading{min-height:100dvh;display:grid;place-items:center;color:#6f7890;font-weight:800;background:#fbf8f2}
        @media(max-width:720px){.aha-profile-page{padding-bottom:calc(108px + env(safe-area-inset-bottom,0px))}.aha-profile-header{height:68px;width:calc(100% - 20px);grid-template-columns:42px 1fr 42px;gap:9px}.aha-profile-title strong{font-size:19px}.aha-profile-title span{font-size:11px}.aha-profile-home-button{width:42px;padding:0}.aha-profile-home-button span{display:none}.aha-profile-wrap{width:calc(100% - 20px);gap:12px}.aha-profile-identity{min-height:210px;padding:24px 18px 20px;align-items:flex-end;gap:14px;border-radius:25px}.aha-profile-edit{right:15px;top:15px;padding:8px 12px;font-size:12px}.aha-profile-avatar{width:88px;height:88px;font-size:34px;border-width:3px}.aha-profile-identity-copy{padding-bottom:4px}.aha-profile-identity-copy h1{font-size:24px}.aha-profile-identity-copy p{font-size:12px}.aha-profile-role{font-size:9px;margin-bottom:6px}.aha-profile-mark{right:17px;bottom:18px;opacity:.6}.aha-profile-section{padding:17px;border-radius:20px}.aha-profile-fields,.aha-profile-pin-grid{grid-template-columns:1fr}.aha-profile-settings-grid{grid-template-columns:1fr;gap:12px}.aha-theme-grid{grid-template-columns:1fr 1fr}.aha-theme-option{font-size:12px;padding:0 9px}.aha-profile-otp{grid-template-columns:1fr}.aha-profile-otp .aha-profile-primary{margin-top:0}.aha-profile-account{border-radius:20px}.aha-profile-orb.orb-two{left:-180px}.aha-profile-footer{padding-bottom:4px}}
        @media(max-width:390px){.aha-profile-wrap{width:calc(100% - 14px)}.aha-profile-header{width:calc(100% - 14px)}.aha-profile-identity{padding-left:14px;padding-right:14px}.aha-profile-avatar{width:78px;height:78px}.aha-profile-identity-copy h1{font-size:21px}.aha-theme-grid{grid-template-columns:1fr}.aha-profile-account{align-items:flex-start;flex-direction:column}.aha-profile-account button{width:100%}}
      `}</style>
    </div>
  );
}
