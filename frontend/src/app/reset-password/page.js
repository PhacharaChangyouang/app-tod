'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../services/api';
import PasswordRequirements, { isValidPassword } from '../../components/PasswordRequirements';

// Reset-password page intentionally reads the token from window.location in useEffect.
// This keeps the page compatible with Next.js static generation and avoids useSearchParams()
// during the production prerender step.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
    window.history.replaceState({}, '', '/reset-password');
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('ลิงก์ตั้งรหัสผ่านไม่ถูกต้อง');
      return;
    }
    if (!isValidPassword(password)) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัว พร้อมตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข');
      return;
    }
    if (password !== confirm) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setBusy(true);
    try {
      await authApi.resetPassword(token, password, confirm);
      setDone(true);
    } catch (err) {
      setError(err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="aha-reset-page">
      <section className="aha-reset-card">
        <div className="aha-reset-mark">AHA</div>
        <h1>ตั้งรหัสผ่านใหม่</h1>
        {done ? (
          <>
            <p>เปลี่ยนรหัสผ่านเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที</p>
            <button className="aha-reset-submit" onClick={() => router.push('/')}>
              กลับไปเข้าสู่ระบบ
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p>ตั้งรหัสผ่านใหม่สำหรับบัญชี AHA ของคุณ</p>
            <label>
              รหัสผ่านใหม่
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <PasswordRequirements value={password} />
            <label>
              ยืนยันรหัสผ่าน
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            {error && <div className="aha-reset-error">{error}</div>}
            <button className="aha-reset-submit" disabled={busy}>
              {busy ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}
            </button>
          </form>
        )}
        <style jsx>{`.aha-reset-page{min-height:100vh;display:grid;place-items:center;background:#f5f8f8;padding:20px;font-family:Arial,"Noto Sans Thai",sans-serif;color:#20343c}.aha-reset-card{width:min(470px,100%);background:#fff;border:1px solid #dbe6e8;border-radius:22px;padding:34px;box-shadow:0 20px 55px rgba(30,67,80,.11)}.aha-reset-mark{font-weight:950;color:#2186a9;font-size:25px;margin-bottom:20px}.aha-reset-card h1{margin:0 0 7px;font-size:29px}.aha-reset-card p{color:#71858c;line-height:1.65;margin:0 0 20px}.aha-reset-card form{display:grid;gap:14px}.aha-reset-card label{display:grid;gap:7px;font-weight:800}.aha-reset-card input{min-height:52px;border:1px solid #d3e0e3;border-radius:12px;padding:0 14px;font-size:16px;outline:none}.aha-reset-submit{width:100%;min-height:53px;border:0;border-radius:13px;background:#2085b1;color:#fff;font-weight:900}.aha-reset-submit:disabled{opacity:.55}.aha-reset-error{padding:11px 13px;border-radius:11px;background:#fff1f1;color:#b5302d;border:1px solid #ffd2d0;font-size:13px}`}</style>
      </section>
    </main>
  );
}
