'use client';

import { useState } from 'react';

export default function LoginForm({ onSubmit, buttonText, children }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState('elderly');
  const [step, setStep] = useState('phone');
  const [error, setError] = useState(null);

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError(null);
    await onSubmit({ mode: 'requestOtp', phone, setStep, setError });
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError(null);
    await onSubmit({ mode: 'verifyOtp', phone, code, setStep, setError });
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError(null);
    await onSubmit({ mode: 'register', phone, name, age, role, pin, setError });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError(null);
    await onSubmit({ mode: 'login', phone, pin, setError });
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
      <h1>เข้าสู่ระบบ</h1>
      {step === 'phone' && (
        <form onSubmit={handleSendOtp}>
          <label>
            เบอร์โทร
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0XXXXXXXXX"
              type="tel"
              required
            />
          </label>
          <button type="submit">ขอ OTP</button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerifyOtp}>
          <input type="hidden" value={phone} />
          <label>
            รหัส OTP
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              type="text"
              required
            />
          </label>
          <button type="submit">ยืนยัน OTP</button>
        </form>
      )}

      {step === 'register' && (
        <form onSubmit={handleRegister}>
          <label>
            เบอร์โทร
            <input value={phone} disabled />
          </label>
          <label>
            ชื่อ
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            อายุ
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              type="number"
              min="0"
              max="120"
              required
            />
          </label>
          <label>
            บทบาท
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="elderly">ผู้สูงอายุ</option>
              <option value="caregiver">ผู้ดูแล</option>
            </select>
          </label>
          <label>
            PIN 4 หลัก
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type="password"
              maxLength="4"
              required
            />
          </label>
          <button type="submit">สมัครสมาชิก</button>
        </form>
      )}

      {step === 'login' && (
        <form onSubmit={handleLogin}>
          <label>
            เบอร์โทร
            <input value={phone} disabled />
          </label>
          <label>
            PIN 4 หลัก
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type="password"
              maxLength="4"
              required
            />
          </label>
          <button type="submit">เข้าสู่ระบบ</button>
        </form>
      )}

      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      {children}
    </div>
  );
}
