'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../services/api';
import AhaIcon from '../../components/AhaIcon';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try { await authApi.requestPasswordReset(email.trim()); setSent(true); }
    catch (err) { setError(err.message || 'ไม่สามารถส่งอีเมลได้'); }
    finally { setBusy(false); }
  };

  return <main className="aha-forgot-page"><section className="aha-forgot-card">
    <button className="aha-forgot-back" type="button" onClick={() => router.push('/login')}>← กลับเข้าสู่ระบบ</button>
    <div className="aha-forgot-icon"><AhaIcon name="activity" size={28}/></div>
    <h1>ลืมรหัสผ่าน?</h1>
    {sent ? <><p>ถ้าอีเมลนี้มีบัญชี AHA อยู่ ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว</p><div className="aha-forgot-success">กรุณาตรวจสอบกล่องจดหมายและโฟลเดอร์ Spam ลิงก์จะหมดอายุภายในเวลาที่กำหนด</div><button className="aha-forgot-submit" type="button" onClick={() => router.push('/login')}>กลับไปเข้าสู่ระบบ</button></> : <form onSubmit={submit}><p>กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ</p><label>อีเมล<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="name@example.com" required autoFocus/></label>{error&&<div className="aha-forgot-error">{error}</div>}<button className="aha-forgot-submit" disabled={busy}>{busy?'กำลังส่ง…':'ส่งลิงก์ไปทางอีเมล'}</button></form>}
    <style jsx>{`
      .aha-forgot-page{min-height:100vh;display:grid;place-items:center;background:#f5f8f8;padding:20px;font-family:Arial,"Noto Sans Thai",sans-serif;color:#20343c}.aha-forgot-card{width:min(470px,100%);background:#fff;border:1px solid #dbe6e8;border-radius:22px;padding:34px;box-shadow:0 20px 55px rgba(30,67,80,.11)}.aha-forgot-back{border:0;background:transparent;color:#2484a8;font-weight:800;padding:0;margin-bottom:26px}.aha-forgot-icon{width:58px;height:58px;border-radius:18px;background:#eef8f9;color:#2386aa;display:grid;place-items:center;margin-bottom:18px}.aha-forgot-card h1{margin:0 0 7px;font-size:29px}.aha-forgot-card p{color:#71858c;line-height:1.65;margin:0 0 20px}.aha-forgot-card label{display:grid;gap:7px;font-weight:800}.aha-forgot-card input{min-height:52px;border:1px solid #d3e0e3;border-radius:12px;padding:0 14px;font-size:16px;outline:none}.aha-forgot-card input:focus{border-color:#39acd0;box-shadow:0 0 0 3px rgba(57,172,208,.11)}.aha-forgot-submit{width:100%;min-height:53px;border:0;border-radius:13px;background:#2085b1;color:#fff;font-weight:900;margin-top:16px}.aha-forgot-submit:disabled{opacity:.55}.aha-forgot-success{padding:13px;border-radius:12px;background:#edf9f2;color:#287c4e;border:1px solid #ccebd8;line-height:1.6;font-size:14px}.aha-forgot-error{margin-top:12px;padding:11px 13px;border-radius:11px;background:#fff1f1;color:#b5302d;border:1px solid #ffd2d0;font-size:13px}
    `}</style>
  </section></main>;
}
