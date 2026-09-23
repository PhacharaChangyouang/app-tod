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
    <main className="aha-forgot-page">
      <section className="aha-forgot-card" aria-labelledby="forgot-title">
        <button className="aha-forgot-back" type="button" onClick={() => router.push('/login')}>← กลับเข้าสู่ระบบ</button>
        <div className="aha-forgot-icon" aria-hidden="true"><AhaIcon name="activity" size={28} /></div>
        <div className="aha-forgot-heading">
          <span>AHA · บัญชีผู้ใช้</span>
          <h1 id="forgot-title">ลืมรหัสผ่าน?</h1>
          <p>ไม่ต้องกังวล เราจะช่วยคุณตั้งรหัสผ่านใหม่</p>
        </div>
        {sent ? (
          <div className="aha-forgot-result">
            <div className="aha-forgot-success-icon">✓</div>
            <h2>ส่งลิงก์เรียบร้อยแล้ว</h2>
            <p>ถ้าอีเมลนี้มีบัญชี AHA อยู่ ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว</p>
            <div className="aha-forgot-success">กรุณาตรวจสอบกล่องจดหมายและโฟลเดอร์ Spam ลิงก์จะหมดอายุตามเวลาที่กำหนด</div>
            <button className="aha-forgot-submit" type="button" onClick={() => router.push('/login')}>กลับไปเข้าสู่ระบบ</button>
          </div>
        ) : (
          <form className="aha-forgot-form" onSubmit={submit}>
            <div className="aha-forgot-description">กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ</div>
            <label className="aha-forgot-field"><span>อีเมล</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" required autoFocus /></label>
            {error && <div className="aha-forgot-error" role="alert">{error}</div>}
            <button className="aha-forgot-submit" type="submit" disabled={busy}>{busy ? 'กำลังส่งลิงก์…' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}</button>
          </form>
        )}
        <p className="aha-forgot-note">หากไม่ได้รับอีเมลภายในไม่กี่นาที ให้ตรวจสอบโฟลเดอร์ Spam ก่อนลองอีกครั้ง</p>
      </section>
      <style jsx>{`
        .aha-forgot-page{min-height:100svh;box-sizing:border-box;display:grid;place-items:center;background:#f4f8f8;padding:24px 16px;font-family:Arial,"Noto Sans Thai",sans-serif;color:#20343c}
        .aha-forgot-card{box-sizing:border-box;width:min(470px,100%);background:#fff;border:1px solid #dbe6e8;border-radius:24px;padding:30px;box-shadow:0 18px 50px rgba(30,67,80,.10);overflow:hidden}
        .aha-forgot-back{display:inline-flex;align-items:center;border:0;background:transparent;color:#247f9f;font-weight:800;font-size:15px;padding:4px 0;margin:0 0 24px;cursor:pointer}
        .aha-forgot-icon{width:58px;height:58px;border-radius:17px;background:#eef8f9;color:#2386aa;display:grid;place-items:center;margin-bottom:18px}
        .aha-forgot-heading span{display:block;color:#2a9cbd;font-size:13px;font-weight:800;margin-bottom:5px}.aha-forgot-heading h1{margin:0;font-size:30px;line-height:1.25}.aha-forgot-heading p{margin:7px 0 0;color:#71858c;line-height:1.6;font-size:15px}
        .aha-forgot-form{display:grid;gap:15px;margin-top:24px}.aha-forgot-description{color:#526a73;line-height:1.65;font-size:15px}.aha-forgot-field{display:grid;gap:8px;font-weight:800;font-size:15px}.aha-forgot-field input{box-sizing:border-box;width:100%;min-height:54px;border:1px solid #cfdfe2;border-radius:13px;padding:0 15px;font-size:17px;outline:none;background:#fff;color:#20343c}.aha-forgot-field input:focus{border-color:#39acd0;box-shadow:0 0 0 3px rgba(57,172,208,.11)}
        .aha-forgot-submit{width:100%;min-height:54px;border:0;border-radius:13px;background:#2085b1;color:#fff;font-size:16px;font-weight:900;padding:0 16px;cursor:pointer}.aha-forgot-submit:disabled{opacity:.55;cursor:wait}.aha-forgot-error{box-sizing:border-box;width:100%;padding:12px 13px;border-radius:12px;background:#fff5f4;color:#a52d29;border:1px solid #ffd7d4;line-height:1.55;font-size:14px;overflow-wrap:anywhere}
        .aha-forgot-result{text-align:center;margin-top:24px}.aha-forgot-result h2{margin:0 0 7px;font-size:22px}.aha-forgot-result p{color:#667e87;line-height:1.65;margin:0 0 15px;font-size:15px}.aha-forgot-success-icon{width:48px;height:48px;border-radius:50%;background:#e9f7ef;color:#287c4e;display:grid;place-items:center;margin:0 auto 12px;font-size:24px;font-weight:900}.aha-forgot-success{box-sizing:border-box;width:100%;padding:13px;border-radius:12px;background:#edf9f2;color:#287c4e;border:1px solid #ccebd8;line-height:1.6;font-size:14px;text-align:left;margin-bottom:15px}.aha-forgot-note{margin:22px 0 0;padding-top:16px;border-top:1px solid #edf1f2;color:#819198;font-size:12px;line-height:1.6;text-align:center}
        @media (max-width:480px){.aha-forgot-page{padding:14px 12px}.aha-forgot-card{padding:23px 18px;border-radius:20px}.aha-forgot-back{margin-bottom:20px}.aha-forgot-icon{width:52px;height:52px;margin-bottom:14px}.aha-forgot-heading h1{font-size:27px}.aha-forgot-heading p,.aha-forgot-description{font-size:14px}.aha-forgot-form{margin-top:20px}.aha-forgot-field input{min-height:52px;font-size:16px}.aha-forgot-submit{min-height:52px}.aha-forgot-note{margin-top:18px}}
      `}</style>
    </main>
  );
}
