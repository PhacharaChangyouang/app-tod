'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { authApi } from '../../services/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authApi.requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      const raw = String(err?.message || '');
      if (/Email service is not configured|RESEND_API_KEY|MAIL_FROM/i.test(raw)) {
        setError('ขณะนี้ระบบส่งอีเมลยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้งภายหลัง');
      } else if (/provider rejected|resend/i.test(raw)) {
        setError('ระบบส่งอีเมลไม่สำเร็จ กรุณาตรวจสอบอีเมลแล้วลองใหม่อีกครั้ง');
      } else {
        setError(raw || 'ไม่สามารถส่งลิงก์ตั้งรหัสผ่านได้');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="aha-auth-page">
      <section className="aha-auth-card">
        <aside className="aha-auth-brand-panel">
          <div className="aha-auth-brand"><div className="aha-auth-logo"><AhaIcon name="heart" size={25}/></div><div><strong>AHA</strong><span>AI Health Assistant</span></div></div>
          <div className="aha-auth-message"><small>ความปลอดภัยของบัญชี</small><h1>กลับมาใช้งาน<br/>ได้อย่างมั่นใจ</h1><p>ตั้งรหัสผ่านใหม่ผ่านอีเมลที่ผูกกับบัญชี AHA ของคุณ ลิงก์มีอายุจำกัดเพื่อความปลอดภัย</p></div>
          <div className="aha-auth-points"><div><AhaIcon name="activity" size={18}/><span>ลิงก์ใช้ได้ครั้งเดียว</span></div><div><AhaIcon name="heart" size={18}/><span>หมดอายุภายใน 15 นาที</span></div></div>
        </aside>
        <section className="aha-auth-form-panel">
          <button className="aha-auth-back" type="button" onClick={() => router.push('/login')}>← กลับเข้าสู่ระบบ</button>
          <div className="aha-auth-heading"><div className="aha-auth-kicker">AHA ACCOUNT</div><h2>{sent ? 'ตรวจสอบอีเมลของคุณ' : 'ลืมรหัสผ่าน?'}</h2><p>{sent ? 'เราได้ดำเนินการคำขอเรียบร้อยแล้ว' : 'กรอกอีเมลที่ใช้สมัคร AHA เพื่อรับลิงก์ตั้งรหัสผ่านใหม่'}</p></div>
          {sent ? <div className="aha-forgot-result"><div className="aha-forgot-success-icon">✓</div><h3>ส่งลิงก์เรียบร้อยแล้ว</h3><p>ถ้าอีเมลนี้มีบัญชี AHA ระบบได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว กรุณาตรวจสอบ Inbox และ Spam</p><button className="aha-auth-submit" type="button" onClick={() => router.push('/login')}>กลับไปเข้าสู่ระบบ</button></div> :
          <form className="aha-forgot-form" onSubmit={submit}><div className="aha-auth-field"><label>อีเมล</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" required autoFocus /></div>{error&&<div className="aha-auth-error" role="alert"><strong>ไม่สามารถดำเนินการได้</strong><span>{error}</span></div>}<button className="aha-auth-submit" type="submit" disabled={busy}>{busy?'กำลังส่งลิงก์…':'ส่งลิงก์ตั้งรหัสผ่านใหม่'}</button></form>}
          <p className="aha-forgot-note">เพื่อความปลอดภัย ระบบจะไม่เปิดเผยว่าอีเมลใดมีบัญชีอยู่หรือไม่</p>
        </section>
      </section>
      <style jsx>{`
        .aha-auth-page{min-height:100vh;display:grid;place-items:center;padding:22px;background:#f5f8f8;color:#20343c;font-family:Arial,"Noto Sans Thai",sans-serif}.aha-auth-card{width:min(980px,100%);display:grid;grid-template-columns:42% 58%;background:#fff;border:1px solid #dbe6e8;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(30,67,80,.12)}.aha-auth-brand-panel{background:#eef8f9;padding:40px 36px;display:flex;flex-direction:column;justify-content:space-between;min-height:570px;border-right:1px solid #dbe8e9}.aha-auth-brand{display:flex;align-items:center;gap:11px;color:#173f50}.aha-auth-brand>div:last-child strong{display:block;font-size:25px;line-height:1}.aha-auth-brand span{display:block;font-size:11px;color:#78909a;margin-top:3px}.aha-auth-logo{width:46px;height:46px;border-radius:14px;background:#fff;border:1px solid #cfe3e7;display:grid;place-items:center;color:#2189ad}.aha-auth-message{margin:auto 0}.aha-auth-message small,.aha-auth-kicker{font-weight:900;color:#2b9abf;font-size:12px;letter-spacing:.04em}.aha-auth-message h1{font-size:39px;line-height:1.18;margin:12px 0;color:#203c47}.aha-auth-message p{max-width:310px;color:#667e87;font-size:15px;line-height:1.75;margin:0}.aha-auth-points{display:grid;gap:9px}.aha-auth-points div{display:flex;align-items:center;gap:9px;color:#536c75;font-size:13px}.aha-auth-points svg{color:#2b9abf}.aha-auth-form-panel{padding:40px 48px;display:flex;flex-direction:column;justify-content:center}.aha-auth-back{align-self:flex-start;border:0;background:transparent;color:#2484a8;font-weight:800;padding:0;margin-bottom:22px;cursor:pointer}.aha-auth-heading{margin-bottom:22px}.aha-auth-heading h2{margin:6px 0 0;font-size:30px;line-height:1.25;color:#203c47}.aha-auth-heading p{margin:7px 0 0;color:#788b92;font-size:14px;line-height:1.55}.aha-forgot-form{display:grid;gap:14px}.aha-auth-field{display:grid;gap:7px}.aha-auth-field label{font-size:14px;font-weight:800;color:#304b55}.aha-auth-field input{width:100%;box-sizing:border-box;min-height:50px;border:1px solid #d3e0e3;border-radius:12px;background:#fff;color:#20343c;padding:0 14px;outline:none;font-size:16px}.aha-auth-field input:focus{border-color:#39acd0;box-shadow:0 0 0 3px rgba(57,172,208,.11)}.aha-auth-submit{width:100%;min-height:54px;border:0;border-radius:13px;background:#2085b1;color:#fff;font-weight:900;font-size:16px;box-shadow:0 9px 20px rgba(32,133,177,.18);cursor:pointer}.aha-auth-submit:disabled{opacity:.55}.aha-auth-error{padding:11px 13px;border-radius:11px;background:#fff1f1;color:#b5302d;border:1px solid #ffd2d0;display:grid;gap:2px;font-size:13px}.aha-forgot-result{text-align:center;padding:10px 0}.aha-forgot-result h3{margin:0 0 7px;color:#203c47;font-size:22px}.aha-forgot-result p{color:#667e87;line-height:1.65;margin:0 0 18px}.aha-forgot-success-icon{width:50px;height:50px;border-radius:50%;background:#e9f7ef;color:#287c4e;display:grid;place-items:center;margin:0 auto 13px;font-size:24px;font-weight:900}.aha-forgot-note{margin:20px 0 0;padding-top:16px;border-top:1px solid #edf1f2;color:#819198;font-size:12px;line-height:1.6;text-align:center}
        @media(max-width:820px){.aha-auth-card{grid-template-columns:1fr}.aha-auth-brand-panel{min-height:auto;padding:25px 24px;border-right:0;border-bottom:1px solid #dbe8e9}.aha-auth-message{margin:25px 0}.aha-auth-message h1{font-size:31px}.aha-auth-points{display:none}.aha-auth-form-panel{padding:28px 24px}}
        @media(max-width:520px){.aha-auth-page{padding:0;display:block}.aha-auth-card{width:100%;min-height:100vh;border:0;border-radius:0;box-shadow:none}.aha-auth-brand-panel{padding:20px 18px 18px}.aha-auth-logo{width:40px;height:40px}.aha-auth-message{margin:18px 0 0}.aha-auth-message h1{font-size:27px;margin:8px 0}.aha-auth-message p{font-size:13px;line-height:1.55}.aha-auth-form-panel{padding:22px 18px 30px}.aha-auth-heading h2{font-size:25px}.aha-auth-submit{min-height:56px}}
      `}</style>
    </main>
  );
}
