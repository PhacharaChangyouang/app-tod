'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AhaIcon from '../../components/AhaIcon';
import { authApi } from '../../services/api';
import { clearSession, saveSession } from '../../services/auth';
import { disableAhaPush, enableAhaPush, getAhaPushSubscription, registerAhaServiceWorker } from '../../services/push';
import { notificationApi } from '../../services/api';

const THEMES = [
  { key: 'light', name: 'สว่าง', symbol: '☀' },
  { key: 'dark', name: 'มืด', symbol: '☾' },
  { key: 'system', name: 'ตามระบบ', symbol: '◐' },
];

function applyAppearance(mode) {
  if (typeof window === 'undefined') return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
  document.documentElement.dataset.ahaAppearance = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState('elderly');
  const [theme, setTheme] = useState('light');
  const [avatar, setAvatar] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [medicinePushEnabled, setMedicinePushEnabled] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [appearanceNotice, setAppearanceNotice] = useState('');
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportIssue, setSupportIssue] = useState('');
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    const savedAppearance = localStorage.getItem('aha_appearance') || 'light';
    setTheme(savedAppearance);
    applyAppearance(savedAppearance);
    authApi.me().then((result) => {
      if (!result?.user) throw new Error('Unauthorized');
      const fresh = result.user;
      setUser(fresh); setName(fresh.name || ''); setAge(fresh.age ?? ''); setRole(fresh.role || 'elderly'); setPhone(fresh.phone || '');
      setSupportName((value) => value || fresh.name || '');
      setSupportEmail((value) => value || fresh.email || '');
      setAvatar(localStorage.getItem(`aha_avatar_${fresh.id}`) || '');
      saveSession({ user: fresh });
      return registerAhaServiceWorker().then(async () => {
        const status = await notificationApi.pushStatus();
        const subscription = await getAhaPushSubscription();
        setMedicinePushEnabled(Boolean(status?.subscribed && subscription));
      });
    }).catch((err) => {
      setMedicinePushEnabled(false);
      if (err?.status === 401 || err?.message === 'Unauthorized') router.replace('/');
    });
  }, [router]);

  const flash = (ok, text) => { setError(ok ? '' : text); setMessage(ok ? text : ''); };

  const selectTheme = (key) => {
    setTheme(key);
    localStorage.setItem('aha_appearance', key);
    applyAppearance(key);
    window.dispatchEvent(new CustomEvent('aha-appearance-change', { detail: key }));
    setAppearanceNotice(key === 'dark' ? 'เปลี่ยนเป็นโหมดมืดแล้ว' : key === 'system' ? 'ใช้ธีมตามระบบแล้ว' : 'เปลี่ยนเป็นโหมดสว่างแล้ว');
    window.setTimeout(() => setAppearanceNotice(''), 1800);
  };

  const toggleMedicineNotifications = async () => {
    setNotificationBusy(true); setError(''); setMessage('');
    try {
      if (medicinePushEnabled) {
        await disableAhaPush();
        setMedicinePushEnabled(false);
        localStorage.setItem('aha_push_enabled', 'false');
        setMessage('ปิดการแจ้งเตือนยาแล้ว');
      } else {
        await enableAhaPush();
        setMedicinePushEnabled(true);
        localStorage.setItem('aha_push_enabled', 'true');
        setMessage('เปิดการแจ้งเตือนยาแล้ว');
      }
    } catch (err) {
      setError(err?.message || 'ไม่สามารถเปลี่ยนการตั้งค่าการแจ้งเตือนยาได้');
    } finally { setNotificationBusy(false); }
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
      const result = await authApi.updateMe({ name: name.trim(), age: age === '' ? null : Number(age) });
      const fresh = result.user;
      saveSession({ user: fresh });
      setUser(fresh); setMessage('บันทึกข้อมูลโปรไฟล์แล้ว');
    } catch (err) { setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const changePin = async () => {
    setError(''); setMessage('');
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(confirmNewPin)) {
      setError('PIN ทุกช่องต้องเป็นตัวเลข 4 หลัก'); return;
    }
    if (newPin !== confirmNewPin) { setError('PIN ใหม่และการยืนยัน PIN ไม่ตรงกัน'); return; }
    if (currentPin === newPin) { setError('PIN ใหม่ต้องไม่ซ้ำกับ PIN ปัจจุบัน'); return; }
    setPinSaving(true);
    try {
      await authApi.changePin(currentPin, newPin, confirmNewPin);
      try { await authApi.logout(); } catch (_) {}
      clearSession();
      router.replace('/');
    } catch (err) { setError(err.message || 'เปลี่ยน PIN ไม่สำเร็จ'); }
    finally { setPinSaving(false); }
  };

  const submitSupport = async (event) => {
    event.preventDefault();
    setError(''); setMessage('');
    const cleanName = supportName.trim();
    const cleanEmail = supportEmail.trim();
    const cleanIssue = supportIssue.trim();
    if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanIssue.length < 5) {
      setError('กรุณากรอกชื่อ อีเมล และรายละเอียดปัญหาให้ครบถ้วน');
      return;
    }
    setSupportBusy(true);
    try {
      await notificationApi.contactSupport({ name: cleanName, email: cleanEmail, issue: cleanIssue });
      setSupportIssue('');
      setMessage('ส่งข้อความถึงผู้ดูแลระบบแล้ว');
    } catch (err) {
      setError(err?.message || 'ส่งข้อความถึงผู้ดูแลระบบไม่สำเร็จ');
    } finally { setSupportBusy(false); }
  };

  const logout = async () => {
    try { await disableAhaPush(); } catch (_) {}
    try { await authApi.logout(); } catch (_) {}
    clearSession(); router.replace('/');
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
              {avatar ? <Image src={avatar} alt="รูปโปรไฟล์" fill sizes="120px" unoptimized /> : <span>{initial}</span>}
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

        {(message || error || appearanceNotice) && <div className={`aha-profile-alert ${error ? 'error' : 'success'}`}>{error || message || appearanceNotice}</div>}

        <section className="aha-profile-section aha-profile-personal">
          <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">PROFILE</span><h2>ข้อมูลส่วนตัว</h2><p>ข้อมูลที่ใช้แสดงในระบบ AHA</p></div></div>
          <div className="aha-profile-fields">
            <label>ชื่อที่แสดง<input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></label>
            <label>อายุ<input type="number" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} /></label>
            <label>บทบาท<input value={role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'} readOnly aria-readonly="true" /></label>
          </div>
          <button className="aha-profile-primary" onClick={saveProfile} disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</button>
        </section>

        <section className="aha-profile-section">
          <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">APPEARANCE</span><h2>สีของระบบ</h2><p>เลือกโทนสีที่อ่านง่ายและเหมาะกับคุณ</p></div></div>
          <div className="aha-theme-grid">{THEMES.map((item) => <button key={item.key} type="button" className={`aha-theme-option ${theme === item.key ? 'active' : ''}`} onClick={() => selectTheme(item.key)}><span className="aha-theme-symbol">{item.symbol}</span>{item.name}{theme === item.key && <b>✓</b>}</button>)}</div>
        </section>

        <div className="aha-profile-settings-grid">
          <section className="aha-profile-section">
            <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">NOTIFICATIONS</span><h2>การแจ้งเตือนยา</h2><p>อนุญาตให้ AHA แจ้งเตือนเมื่อถึงเวลาทานยา</p></div></div>
            <button type="button" disabled={notificationBusy} className={`aha-profile-sound-toggle ${medicinePushEnabled ? 'active' : ''}`} aria-pressed={medicinePushEnabled} onClick={toggleMedicineNotifications}><span><AhaIcon name="bell" size={20} /></span><strong>{medicinePushEnabled ? 'เปิดการแจ้งเตือนยา' : 'ปิดการแจ้งเตือนยา'}</strong><i aria-hidden="true"><b /></i></button>
          </section>

          <section className="aha-profile-section">
            <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">PHONE</span><h2>เบอร์โทรศัพท์</h2><p>ปิดการเปลี่ยนเบอร์อัตโนมัติแล้ว หากต้องแก้ไขกรุณาติดต่อผู้ดูแลระบบ</p></div></div>
            <div className="aha-profile-fields single"><label>เบอร์โทรศัพท์<input value={phone} readOnly aria-readonly="true" /></label></div>
          </section>
        </div>

        <section className="aha-profile-section aha-profile-security">
          <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">SECURITY</span><h2>เปลี่ยน PIN 4 หลัก</h2><p>หลังเปลี่ยน PIN ระบบจะให้ออกจากระบบทุกอุปกรณ์เพื่อความปลอดภัย</p></div></div>
          <div className="aha-profile-pin-grid"><label>PIN ปัจจุบัน<input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="current-password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></label><label>PIN ใหม่<input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="new-password" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></label><label>ยืนยัน PIN ใหม่<input type="password" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" autoComplete="new-password" value={confirmNewPin} onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" /></label></div>
          <button className="aha-profile-secondary" type="button" onClick={changePin} disabled={pinSaving}>{pinSaving ? 'กำลังบันทึก…' : 'เปลี่ยน PIN และออกจากระบบ'}</button>
        </section>

        <section className="aha-profile-section aha-profile-support">
          <div className="aha-profile-support-head"><div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">SUPPORT</span><h2>ติดต่อผู้ดูแลระบบ</h2><p>แจ้งปัญหาการใช้งานผ่าน AHA โดยไม่ต้องเปิดแอปอีเมล</p></div></div><button className="aha-profile-support-toggle" type="button" onClick={() => setSupportOpen((value) => !value)} aria-expanded={supportOpen}>{supportOpen ? 'ซ่อน' : 'แสดง'}</button></div>
          {supportOpen && <form className="aha-profile-support-form" onSubmit={submitSupport}>
            <div className="aha-profile-pin-grid">
              <label>ชื่อ<input value={supportName} onChange={(e) => setSupportName(e.target.value)} maxLength={100} autoComplete="name" placeholder="ชื่อผู้ติดต่อ" /></label>
              <label>อีเมลสำหรับตอบกลับ<input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} maxLength={254} autoComplete="email" placeholder="name@example.com" /></label>
            </div>
            <label>ปัญหาที่ต้องการติดต่อ<textarea value={supportIssue} onChange={(e) => setSupportIssue(e.target.value)} maxLength={4000} rows={5} placeholder="อธิบายปัญหาที่พบ หรือสิ่งที่ต้องการให้ผู้ดูแลช่วยเหลือ" /></label>
            <button className="aha-profile-primary" type="submit" disabled={supportBusy}>{supportBusy ? 'กำลังส่ง…' : 'ส่งถึงผู้ดูแลระบบ'}</button>
          </form>}
        </section>

        <section className="aha-profile-section aha-profile-legal">
          <div className="aha-profile-section-heading"><div><span className="aha-profile-kicker">LEGAL &amp; PRIVACY</span><h2>กฎหมายและความเป็นส่วนตัว</h2><p>อ่านรายละเอียดการเก็บข้อมูล การใช้คุกกี้ และขอบเขตการให้บริการของ AHA</p></div></div>
          <div className="aha-profile-legal-links">
            <Link href="/privacy-policy">นโยบายความเป็นส่วนตัว <span>›</span></Link>
            <Link href="/terms-of-service">ข้อกำหนดการใช้บริการ <span>›</span></Link>
            <Link href="/cookies-policy">นโยบายคุกกี้ <span>›</span></Link>
          </div>
        </section>

        <section className="aha-profile-account"><div><span className="aha-profile-kicker">ACCOUNT</span><strong>บัญชี AHA</strong><span>ออกจากระบบเฉพาะอุปกรณ์นี้</span></div><button onClick={logout} type="button">ออกจากระบบ</button></section>
        <footer className="aha-profile-footer">AHA · AI Health Assistant <span aria-hidden="true">·</span> © 2026 ahahealth.online - สงวนลิขสิทธิ์</footer>
      </main>

      <style jsx>{`
        .aha-profile-page,.aha-profile-page *{box-sizing:border-box}
        .aha-profile-page{min-height:100dvh;background:var(--aha-bg,#f7f7f5);color:var(--aha-text,#111);padding:0 0 calc(112px + env(safe-area-inset-bottom,0px));font-family:Arial,"Noto Sans Thai",sans-serif;overflow-x:hidden}
        .aha-profile-header{height:72px;width:min(920px,calc(100% - 32px));margin:auto;display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:12px}
        .aha-profile-icon-button,.aha-profile-home-button{min-height:44px;border:1px solid var(--aha-border,#e2e3e6);background:var(--aha-surface,#fff);color:var(--aha-text,#111);border-radius:14px;display:flex;align-items:center;justify-content:center;gap:7px;font-weight:800}.aha-profile-icon-button{width:44px}.aha-profile-home-button{padding:0 14px}
        .aha-profile-title strong{display:block;color:var(--aha-text,#111);font-size:22px}.aha-profile-title span{display:block;color:var(--aha-text-secondary,#62666d);font-size:12px;margin-top:2px}
        .aha-profile-wrap{width:min(920px,calc(100% - 32px));margin:auto;display:grid;gap:14px}
        .aha-profile-identity{min-height:205px;padding:26px 28px;display:flex;align-items:center;gap:20px;position:relative;isolation:isolate;overflow:hidden;border-radius:26px;background:#244fcb;color:#fff}
        .aha-profile-orb{position:absolute;z-index:-1;border-radius:50%;pointer-events:none}.orb-one{width:250px;height:165px;right:-70px;bottom:-100px;background:#52d3ca}.orb-two{width:275px;height:175px;left:-155px;bottom:-125px;background:#ffb84d}
        .aha-profile-edit{position:absolute;right:20px;top:18px;border:1px solid rgba(255,255,255,.55);background:rgba(0,0,0,.16);color:#fff;border-radius:999px;padding:9px 14px;font-weight:800}
        .aha-profile-avatar{width:106px;height:106px;border-radius:50%;border:4px solid #fff;background:#fff;color:#111;display:grid;place-items:center;font-size:40px;font-weight:900;position:relative;padding:0;overflow:hidden}.aha-profile-avatar img{width:100%;height:100%;object-fit:cover}.aha-profile-avatar i{position:absolute;right:5px;bottom:5px;width:20px;height:20px;border:4px solid #fff;border-radius:50%;background:#16856f}
        .aha-profile-identity-copy{min-width:0;position:relative;z-index:2;color:#fff}.aha-profile-role{display:inline-flex;padding:5px 9px;border-radius:999px;background:rgba(0,0,0,.18);color:#fff;border:1px solid rgba(255,255,255,.42);font-size:11px;font-weight:900;margin-bottom:8px}.aha-profile-identity-copy h1{color:#fff;font-size:30px;line-height:1.15;margin:0 0 5px;overflow-wrap:anywhere}.aha-profile-identity-copy p{margin:0;color:#fff;font-size:14px}.aha-profile-remove-avatar{margin-top:10px;border:0;background:transparent;color:#fff;padding:0;font-size:11px;text-decoration:underline}
        .aha-profile-mark{position:absolute;right:26px;bottom:22px;display:flex;gap:4px;align-items:center}.aha-profile-mark span{display:block;width:3px;height:25px;border-radius:3px;background:#fff}.aha-profile-mark span:nth-child(2){height:17px}.aha-profile-mark span:nth-child(3){height:29px}.aha-profile-mark span:nth-child(4){height:20px}
        .aha-profile-alert{padding:13px 15px;border-radius:14px;font-weight:800;overflow-wrap:anywhere}.aha-profile-alert.success{background:#eaf8f4;color:#126b59;border:1px solid #bde4d9}.aha-profile-alert.error{background:#fff0f0;color:#a5202b;border:1px solid #efc1c5}
        .aha-profile-section,.aha-profile-account{background:var(--aha-surface,#fff);border:1px solid var(--aha-border,#e2e3e6);border-radius:22px;color:var(--aha-text,#111);box-shadow:var(--aha-shadow,0 7px 24px rgba(15,23,42,.055))}
        .aha-profile-section{padding:21px}.aha-profile-section-heading{margin-bottom:16px}.aha-profile-kicker{display:block;color:var(--aha-text,#111);font-size:10px;font-weight:900;letter-spacing:.12em}.aha-profile-section-heading h2{margin:3px 0 0;color:var(--aha-text,#111);font-size:21px}.aha-profile-section-heading p{margin:5px 0 0;color:var(--aha-text-secondary,#62666d);font-size:13px;line-height:1.5}
        .aha-profile-fields,.aha-profile-pin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.aha-profile-fields.single{grid-template-columns:1fr}.aha-profile-pin-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:680px}
        .aha-profile-section label{display:grid;gap:7px;color:var(--aha-text,#111);font-size:13px;font-weight:800}.aha-profile-section input,.aha-profile-section select{width:100%;min-width:0;min-height:50px;border:1px solid var(--aha-border,#e2e3e6);border-radius:13px;background:var(--aha-surface-soft,#f1f2f4);color:var(--aha-text,#111);padding:0 14px;outline:none;font-size:16px}.aha-profile-section input:focus,.aha-profile-section select:focus{border-color:#2f6bff;box-shadow:0 0 0 3px rgba(47,107,255,.12)}
        .aha-profile-primary,.aha-profile-secondary{margin-top:14px;min-height:48px;border-radius:13px;padding:0 17px;font-weight:900}.aha-profile-primary{border:0;background:#2f6bff;color:#fff}.aha-profile-secondary{background:var(--aha-surface-soft,#f1f2f4);color:var(--aha-text,#111);border:1px solid var(--aha-border,#e2e3e6)}
        .aha-theme-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:5px;border-radius:16px;background:var(--aha-surface-soft,#f1f2f4)}.aha-theme-option{min-width:0;min-height:52px;border:1px solid transparent;background:transparent;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 10px;color:var(--aha-text-secondary,#62666d);font-weight:800}.aha-theme-option .aha-theme-symbol{width:25px;height:25px;border-radius:8px;display:grid;place-items:center;background:var(--aha-surface,#fff);color:var(--aha-text,#111)}.aha-theme-option b{color:var(--aha-text,#111)}.aha-theme-option.active{background:var(--aha-surface,#fff);border-color:var(--aha-border,#e2e3e6);color:var(--aha-text,#111);box-shadow:0 2px 8px rgba(0,0,0,.06)}
        .aha-profile-settings-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:14px}.aha-profile-sound-toggle{width:100%;min-height:60px;border:1px solid var(--aha-border,#e2e3e6);background:var(--aha-surface-soft,#f1f2f4);border-radius:15px;padding:10px 12px;display:flex;align-items:center;gap:10px;color:var(--aha-text,#111)}.aha-profile-sound-toggle>span{width:39px;height:39px;border-radius:11px;background:var(--aha-surface,#fff);display:grid;place-items:center}.aha-profile-sound-toggle strong{flex:1;text-align:left;color:var(--aha-text,#111)}.aha-profile-sound-toggle>i{width:48px;height:28px;border-radius:999px;background:#b9bcc2;padding:3px;display:flex;align-items:center}.aha-profile-sound-toggle>i b{width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .18s}.aha-profile-sound-toggle.active>i{background:#16856f}.aha-profile-sound-toggle.active>i b{transform:translateX(20px)}
        .aha-profile-support-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.aha-profile-support-head .aha-profile-section-heading{margin-bottom:0}.aha-profile-support-toggle{min-width:64px;min-height:40px;border:1px solid var(--aha-border,#e2e3e6);border-radius:11px;background:var(--aha-surface-soft,#f1f2f4);color:var(--aha-text,#111);font-weight:900;cursor:pointer}.aha-profile-support-form{display:grid;gap:12px;margin-top:16px}.aha-profile-support-form textarea{width:100%;min-width:0;border:1px solid var(--aha-border,#e2e3e6);border-radius:13px;background:var(--aha-surface-soft,#f1f2f4);color:var(--aha-text,#111);padding:13px 14px;outline:none;font:inherit;line-height:1.55;resize:vertical}.aha-profile-support-form textarea:focus{border-color:#2f6bff;box-shadow:0 0 0 3px rgba(47,107,255,.12)}.aha-profile-support-form .aha-profile-primary{justify-self:start}
        html[data-aha-appearance="dark"] .aha-profile-support-form textarea{background:var(--aha-surface-soft);border-color:var(--aha-border);color:var(--aha-text)}
        .aha-profile-legal-links{display:grid;border:1px solid var(--aha-border,#e2e3e6);border-radius:15px;overflow:hidden}.aha-profile-legal-links :global(a){min-height:52px;padding:0 15px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--aha-text,#111);background:var(--aha-surface-soft,#f1f2f4);font-weight:800;text-decoration:none;border-bottom:1px solid var(--aha-border,#e2e3e6)}.aha-profile-legal-links :global(a:last-child){border-bottom:0}.aha-profile-legal-links :global(a:hover){color:#2f6bff}.aha-profile-legal-links :global(span){font-size:24px;color:#2f6bff}
        .aha-profile-account{padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px}.aha-profile-account strong{display:block;color:var(--aha-text,#111);font-size:17px;margin-top:2px}.aha-profile-account>div>span:last-child{display:block;color:var(--aha-text-secondary,#62666d);font-size:12px;margin-top:3px}.aha-profile-account button{min-height:44px;border:1px solid #e9b6ba;background:#fff0f0;color:#a5202b;border-radius:12px;padding:0 16px;font-weight:900}
        .aha-profile-footer{text-align:center;color:var(--aha-text-secondary,#62666d);font-size:11px;line-height:1.6;padding:3px 0 10px}.aha-profile-footer span{display:inline-block;margin:0 4px}.aha-profile-loading{min-height:100dvh;display:grid;place-items:center;color:var(--aha-text-secondary,#62666d);background:var(--aha-bg,#f7f7f5)}
        @media(max-width:720px){.aha-profile-page{padding-bottom:calc(108px + env(safe-area-inset-bottom,0px))}.aha-profile-header{height:66px;width:calc(100% - 20px);grid-template-columns:42px 1fr 42px;gap:8px}.aha-profile-title strong{font-size:19px}.aha-profile-title span{font-size:11px}.aha-profile-home-button{width:42px;padding:0}.aha-profile-home-button span{display:none}.aha-profile-wrap{width:calc(100% - 20px);gap:11px}.aha-profile-identity{min-height:190px;padding:22px 16px 18px;align-items:flex-end;gap:13px;border-radius:23px}.aha-profile-edit{right:14px;top:14px;font-size:12px}.aha-profile-avatar{width:82px;height:82px;font-size:32px;border-width:3px}.aha-profile-identity-copy h1{font-size:23px}.aha-profile-identity-copy p{font-size:12px}.aha-profile-role{font-size:9px;margin-bottom:5px}.aha-profile-mark{right:16px;bottom:16px;opacity:.65}.aha-profile-section{padding:17px;border-radius:19px}.aha-profile-fields,.aha-profile-pin-grid{grid-template-columns:1fr}.aha-profile-settings-grid{grid-template-columns:1fr;gap:11px}.aha-theme-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.aha-theme-option{font-size:12px;padding:0 5px;gap:4px}.aha-profile-account{border-radius:19px}}
        @media(max-width:390px){.aha-profile-wrap,.aha-profile-header{width:calc(100% - 14px)}.aha-profile-identity{padding-left:13px;padding-right:13px}.aha-profile-avatar{width:74px;height:74px}.aha-profile-identity-copy h1{font-size:20px}.aha-theme-option .aha-theme-symbol{display:none}.aha-profile-account{align-items:flex-start;flex-direction:column}.aha-profile-account button{width:100%}}
      `}</style>
    </div>
  );
}
