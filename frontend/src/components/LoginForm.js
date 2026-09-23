'use client';

import { useState } from 'react';
import AhaIcon from './AhaIcon';

export default function LoginForm({ onSubmit }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState('elderly');
  const [step, setStep] = useState('phone');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (payload) => {
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ ...payload, setStep, setError });
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (step === 'phone') run({ mode: 'requestOtp', phone });
    else if (step === 'verify') run({ mode: 'verifyOtp', phone, code });
    else if (step === 'register') run({ mode: 'register', phone, name, age: role === 'elderly' ? age : null, role, pin });
    else run({ mode: 'login', phone, pin });
  };

  const stepIndex = { phone: 1, verify: 2, register: 3, login: 3 }[step];

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
            <div className="auth-bubble"><AhaIcon name="shield" size={18} />มีศูนย์ฉุกเฉินใน flow หลัก</div>
          </div>
        </section>

        <section className="auth-form">
          <div className="step-dots">
            {[1, 2, 3].map((number) => <span key={number} className={`step-dot ${number <= stepIndex ? 'active' : ''}`} />)}
          </div>

          {step === 'phone' && <><h2>เริ่มต้นกับ AHA</h2><p className="sub">ใช้เบอร์โทรเพื่อขอรหัส OTP และเข้าสู่ระบบ</p></>}
          {step === 'verify' && <><h2>ยืนยันเบอร์โทร</h2><p className="sub">กรอกรหัส OTP 6 หลักที่ส่งไปยัง {phone}</p></>}
          {step === 'register' && (
            <>
              <h2>{role === 'caregiver' ? 'สร้างบัญชีผู้ดูแล' : 'สร้างบัญชีผู้สูงอายุ'}</h2>
              <p className="sub">{role === 'caregiver' ? 'บัญชีนี้ใช้สำหรับดูแล ติดตาม และจัดการตารางยาของผู้สูงอายุที่เชื่อมต่อ' : 'บัญชีนี้ใช้สำหรับติดตามยาและสุขภาพของผู้สูงอายุ'}</p>
            </>
          )}
          {step === 'login' && <><h2>ยินดีต้อนรับกลับ</h2><p className="sub">กรอก PIN 4 หลักเพื่อเข้าสู่ AHA</p></>}

          <form onSubmit={submit}>
            {step === 'phone' && (
              <div className="field">
                <label>เบอร์โทรศัพท์</label>
                <input type="tel" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0XXXXXXXXX" required autoFocus />
              </div>
            )}

            {step === 'verify' && (
              <div className="field">
                <label>รหัส OTP</label>
                <input inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" maxLength={6} required autoFocus />
              </div>
            )}

            {step === 'register' && (
              <>
                <div className="field">
                  <label>ประเภทบัญชี</label>
                  <div className="aha-role-picker">
                    <button type="button" className={role === 'elderly' ? 'active' : ''} onClick={() => setRole('elderly')}>
                      <AhaIcon name="heart" size={22} />
                      <span><strong>ผู้สูงอายุ</strong><small>ติดตามยาและสุขภาพของฉัน</small></span>
                    </button>
                    <button type="button" className={role === 'caregiver' ? 'active' : ''} onClick={() => setRole('caregiver')}>
                      <AhaIcon name="users" size={22} />
                      <span><strong>ผู้ดูแล</strong><small>ดูแลและติดตามผู้สูงอายุ</small></span>
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>ชื่อ</label>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder={role === 'caregiver' ? 'ชื่อผู้ดูแล' : 'ชื่อที่ต้องการให้ AHA เรียก'} required />
                </div>

                {role === 'elderly' && (
                  <div className="field">
                    <label>อายุ</label>
                    <input type="number" min="1" max="120" value={age} onChange={(event) => setAge(event.target.value)} placeholder="อายุ" required />
                  </div>
                )}

                {role === 'caregiver' && (
                  <div className="aha-caregiver-note">
                    <AhaIcon name="shield" size={20} />
                    <span>บัญชีผู้ดูแลจะไม่แสดงหน้าหลักแบบผู้สูงอายุ และจะเน้นการติดตามคนที่คุณดูแล</span>
                  </div>
                )}

                <div className="field">
                  <label>PIN 4 หลัก</label>
                  <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" required />
                </div>
              </>
            )}

            {step === 'login' && (
              <>
                <div className="field"><label>เบอร์โทร</label><input value={phone} disabled /></div>
                <div className="field"><label>PIN 4 หลัก</label><input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} required autoFocus /></div>
              </>
            )}

            {error && <div className="error">{error}</div>}
            <button className="btn btn-primary btn-lg full" disabled={busy}>
              {busy ? 'กำลังดำเนินการ…' : step === 'phone' ? 'ขอรหัส OTP' : step === 'verify' ? 'ยืนยัน OTP' : step === 'register' ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}
              <AhaIcon name="arrow" size={19} />
            </button>
          </form>

          {step === 'verify' && <button className="btn btn-ghost full" style={{ marginTop: 8 }} onClick={() => setStep('phone')}>เปลี่ยนเบอร์โทร</button>}
          {step === 'login' && <button className="btn btn-ghost full" style={{ marginTop: 8 }} onClick={() => setStep('phone')}>เริ่มขั้นตอนใหม่</button>}
        </section>
      </div>

      <style jsx>{`
        .aha-role-picker { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .aha-role-picker button { display:flex; align-items:center; gap:10px; text-align:left; padding:14px; border:2px solid #dce9ef; border-radius:16px; background:#fff; color:#587084; cursor:pointer; }
        .aha-role-picker button.active { border-color:#159fe0; background:#eefaff; color:#123a54; }
        .aha-role-picker span { display:flex; flex-direction:column; gap:2px; }
        .aha-role-picker strong { font-size:17px; }
        .aha-role-picker small { font-size:12px; line-height:1.3; }
        .aha-caregiver-note { display:flex; gap:10px; align-items:flex-start; margin:-2px 0 16px; padding:13px 15px; border-radius:15px; background:#f1f8fc; color:#587084; font-size:14px; line-height:1.45; }
        @media (max-width: 520px) { .aha-role-picker { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}
