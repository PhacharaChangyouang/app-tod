'use client';

import { useState } from 'react';
import AhaIcon from './AhaIcon';

const initialRegister = {
  firstName: '', lastName: '', phone: '', email: '', username: '', password: '', confirmPassword: '',
  role: 'elderly', age: '', pin: '', termsAccepted: false,
};

export default function LoginForm({ onSubmit }) {
  const [mode, setMode] = useState('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState('phone');
  const [register, setRegister] = useState(initialRegister);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (payload) => {
    setError('');
    setBusy(true);
    try {
      await onSubmit({ ...payload, setError, setOtpStep });
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (next) => {
    setMode(next);
    setError('');
    if (next === 'otp') setOtpStep('phone');
  };

  const submit = (event) => {
    event.preventDefault();
    if (mode === 'password') return run({ mode: 'loginPassword', identifier, password });
    if (mode === 'pin') return run({ mode: 'loginPin', phone: otpPhone, pin });
    if (mode === 'otp') {
      return otpStep === 'phone'
        ? run({ mode: 'requestOtp', phone: otpPhone })
        : run({ mode: 'loginOtp', phone: otpPhone, code: otpCode });
    }
    return run({ mode: 'registerPassword', ...register });
  };

  const updateRegister = (key, value) => setRegister((current) => ({ ...current, [key]: value }));

  return (
    <div className="auth-page">
      <div className="auth-card">
        <section className="auth-visual">
          <div>
            <div className="brand">
              <div className="brand-mark"><AhaIcon name="heart" size={24} /></div>
              <span>AHA</span>
            </div>
            <h1>ดูแลสุขภาพ<br />ให้ง่ายขึ้นทุกวัน</h1>
            <p>ผู้ช่วยสุขภาพที่ออกแบบให้ผู้สูงอายุใช้งานง่าย และช่วยให้ครอบครัวติดตามสิ่งสำคัญได้จากระบบเดียว</p>
          </div>
          <div className="auth-bubbles">
            <div className="auth-bubble"><AhaIcon name="pill" size={18} />เตือนยาและเวลาอย่างเป็นระบบ</div>
            <div className="auth-bubble"><AhaIcon name="users" size={18} />เชื่อมผู้สูงอายุกับผู้ดูแล</div>
            <div className="auth-bubble"><AhaIcon name="shield" size={18} />เข้าสู่ระบบด้วยวิธีที่เหมาะกับคุณ</div>
          </div>
        </section>

        <section className="auth-form">
          <div className="auth-heading-row">
            <div>
              <div className="auth-kicker">AHA HEALTH ASSISTANT</div>
              <h2>{mode === 'register' ? 'สร้างบัญชี AHA' : 'เข้าสู่ระบบ'}</h2>
            </div>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="วิธีเข้าสู่ระบบ">
            <button type="button" className={mode === 'password' ? 'active' : ''} onClick={() => changeMode('password')}>บัญชี / รหัสผ่าน</button>
            <button type="button" className={mode === 'pin' ? 'active' : ''} onClick={() => changeMode('pin')}>PIN 4 หลัก</button>
            <button type="button" className={mode === 'otp' ? 'active' : ''} onClick={() => changeMode('otp')}>OTP</button>
          </div>

          {mode !== 'register' && (
            <button type="button" className="register-link" onClick={() => changeMode('register')}>
              ยังไม่มีบัญชี? <strong>สมัครสมาชิก</strong>
            </button>
          )}

          {mode === 'register' && (
            <button type="button" className="back-link" onClick={() => changeMode('password')}>← กลับไปเข้าสู่ระบบ</button>
          )}

          <form onSubmit={submit}>
            {mode === 'password' && (
              <>
                <p className="sub">ใช้ชื่อผู้ใช้หรืออีเมล และรหัสผ่านที่ตั้งไว้</p>
                <div className="field"><label>ชื่อผู้ใช้ / อีเมล</label><input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" placeholder="เช่น aha_user หรือ email@example.com" required autoFocus /></div>
                <div className="field"><label>รหัสผ่าน</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="รหัสผ่านของคุณ" required /></div>
              </>
            )}

            {mode === 'pin' && (
              <>
                <p className="sub">เหมาะสำหรับเครื่องที่ตั้ง PIN ไว้แล้ว</p>
                <div className="field"><label>เบอร์โทรศัพท์</label><input type="tel" inputMode="numeric" value={otpPhone} onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0XXXXXXXXX" required autoFocus /></div>
                <div className="field"><label>PIN 4 หลัก</label><input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" required /></div>
              </>
            )}

            {mode === 'otp' && (
              <>
                <p className="sub">OTP เป็นวิธีเข้าสู่ระบบหลักของ AHA สำหรับการใช้งานในระยะต่อไป</p>
                <div className="field"><label>เบอร์โทรศัพท์</label><input type="tel" inputMode="numeric" value={otpPhone} onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0XXXXXXXXX" required autoFocus /></div>
                {otpStep === 'code' && <div className="field"><label>รหัส OTP 6 หลัก</label><input inputMode="numeric" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" required /></div>}
              </>
            )}

            {mode === 'register' && (
              <>
                <p className="sub">สมัครด้วยข้อมูลพื้นฐาน แล้วใช้ชื่อผู้ใช้และรหัสผ่านเข้าสู่ระบบได้ทันที</p>
                <div className="field-row">
                  <div className="field"><label>ชื่อ</label><input value={register.firstName} onChange={(e) => updateRegister('firstName', e.target.value)} autoComplete="given-name" required /></div>
                  <div className="field"><label>นามสกุล</label><input value={register.lastName} onChange={(e) => updateRegister('lastName', e.target.value)} autoComplete="family-name" required /></div>
                </div>
                <div className="field"><label>เบอร์โทรศัพท์</label><input type="tel" inputMode="numeric" value={register.phone} onChange={(e) => updateRegister('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0XXXXXXXXX" required /></div>
                <div className="field"><label>อีเมล</label><input type="email" value={register.email} onChange={(e) => updateRegister('email', e.target.value)} autoComplete="email" placeholder="name@example.com" required /></div>
                <div className="field"><label>ชื่อผู้ใช้</label><input value={register.username} onChange={(e) => updateRegister('username', e.target.value.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 30))} autoComplete="username" placeholder="อย่างน้อย 4 ตัวอักษร" required /></div>
                <div className="field-row">
                  <div className="field"><label>รหัสผ่าน</label><input type="password" value={register.password} onChange={(e) => updateRegister('password', e.target.value)} autoComplete="new-password" placeholder="8 ตัวขึ้นไป" required /></div>
                  <div className="field"><label>ยืนยันรหัสผ่าน</label><input type="password" value={register.confirmPassword} onChange={(e) => updateRegister('confirmPassword', e.target.value)} autoComplete="new-password" required /></div>
                </div>
                <div className="field"><label>ประเภทบัญชี</label><div className="role-grid">
                  <button type="button" className={register.role === 'elderly' ? 'role-card active' : 'role-card'} onClick={() => updateRegister('role', 'elderly')}><AhaIcon name="heart" size={22} /><strong>ผู้สูงอายุ</strong><small>ติดตามยาและสุขภาพ</small></button>
                  <button type="button" className={register.role === 'caregiver' ? 'role-card active' : 'role-card'} onClick={() => updateRegister('role', 'caregiver')}><AhaIcon name="users" size={22} /><strong>ผู้ดูแล</strong><small>ดูแลและติดตามผู้สูงอายุ</small></button>
                </div></div>
                {register.role === 'elderly' && <div className="field"><label>อายุ</label><input type="number" min="1" max="120" value={register.age} onChange={(e) => updateRegister('age', e.target.value)} placeholder="อายุ" required /></div>}
                <div className="field"><label>PIN 4 หลัก <span>(ใช้สำหรับการเข้าสู่ระบบแบบ PIN)</span></label><input type="password" inputMode="numeric" maxLength={4} value={register.pin} onChange={(e) => updateRegister('pin', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" required /></div>
                <label className="terms"><input type="checkbox" checked={register.termsAccepted} onChange={(e) => updateRegister('termsAccepted', e.target.checked)} required /><span>ฉันยอมรับเงื่อนไขการใช้งาน และรับทราบว่าระบบ AHA จะเก็บและใช้ข้อมูลที่จำเป็นต่อการให้บริการสุขภาพตามนโยบายของระบบ</span></label>
              </>
            )}

            {error && <div className="error" role="alert">{error}</div>}
            <button className="btn btn-primary btn-lg full" disabled={busy}>
              {busy ? 'กำลังดำเนินการ…' : mode === 'password' ? 'เข้าสู่ระบบ' : mode === 'pin' ? 'เข้าสู่ระบบด้วย PIN' : mode === 'otp' ? (otpStep === 'phone' ? 'ส่งรหัส OTP' : 'ยืนยันและเข้าสู่ระบบ') : 'สมัครสมาชิก'}
              <AhaIcon name="arrow" size={19} />
            </button>
          </form>

          {mode === 'otp' && otpStep === 'code' && <button type="button" className="btn btn-ghost full" style={{ marginTop: 8 }} onClick={() => setOtpStep('phone')}>เปลี่ยนเบอร์โทร</button>}
        </section>
      </div>

      <style jsx>{`
        .auth-heading-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}.auth-kicker{font-size:11px;letter-spacing:1.6px;color:#159fe0;font-weight:900;margin-bottom:7px}.auth-tabs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:5px;background:#f1f7fa;border:1px solid #dcebf1;border-radius:16px;margin:18px 0 10px}.auth-tabs button{border:0;background:transparent;border-radius:12px;padding:11px 7px;color:#718896;font-weight:850;font-size:13px}.auth-tabs button.active{background:#fff;color:#116f9f;box-shadow:0 5px 15px rgba(27,115,151,.10)}.register-link,.back-link{border:0;background:transparent;padding:5px 0;color:#718896;font-size:14px;text-align:left}.register-link strong,.back-link{color:#127cab}.auth-form form{margin-top:13px}.field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.role-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.role-card{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:3px 9px;padding:12px;border:2px solid #dce9ef;border-radius:15px;background:#fff;color:#587084;text-align:left}.role-card.active{border-color:#29abe2;background:#eefaff;color:#123a54}.role-card small{grid-column:2;color:#718896;font-size:11px}.terms{display:flex;align-items:flex-start;gap:9px;padding:12px 0;color:#718896;font-size:12px;line-height:1.5}.terms input{margin-top:3px;width:17px;height:17px;flex:0 0 auto}.field label span{font-weight:500;color:#8aa0ac}.auth-form h2{font-size:30px}.auth-form .sub{margin-bottom:17px}@media(max-width:640px){.auth-tabs button{font-size:12px;padding:10px 4px}.field-row,.role-grid{grid-template-columns:1fr}.auth-card{border-radius:24px}.auth-visual h1{font-size:34px}.auth-form{padding:24px 18px}.auth-form h2{font-size:27px}}
      `}</style>
    </div>
  );
}
