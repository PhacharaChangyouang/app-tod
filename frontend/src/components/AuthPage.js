'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from './LoginForm';
import { authApi } from '../services/api';
import { saveSession } from '../services/auth';

export default function AuthPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('SESSION_CHECK_TIMEOUT')), 12000);
    });
    Promise.race([authApi.session(), timeout]).then((result) => {
      if (!active) return;
      if (!result?.authenticated || !result?.user) {
        setCheckingSession(false);
        return;
      }
      saveSession({ user: result.user });
      router.replace('/home');
    }).catch(() => {
      if (active) setCheckingSession(false);
    }).finally(() => {
      window.clearTimeout(timeoutId);
    });
    return () => { active = false; window.clearTimeout(timeoutId); };
  }, [router]);

  const handleSubmit = async (payload) => {
    const { mode, identifier, setError, ...data } = payload;

    try {
      let response;

      if (mode === 'loginPassword') {
        response = await authApi.loginWithPassword(identifier, data.password);
      } else if (mode === 'loginPin') {
        response = await authApi.loginWithPin(data.phone, data.pin);
      } else if (mode === 'registerPassword') {
        response = await authApi.registerWithPassword({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          username: data.username,
          password: data.password,
          confirmPassword: data.confirmPassword,
          pin: data.pin,
          confirmPin: data.confirmPin,
          role: data.role,
          age: data.age,
          termsAccepted: data.termsAccepted,
        });
      } else if (mode === 'google') {
        response = await authApi.loginWithGoogle(data.credential);
      } else if (mode === 'googleComplete') {
        response = await authApi.completeGoogleSignup(data);
      } else {
        throw new Error('ไม่พบวิธีเข้าสู่ระบบ');
      }

      if (!response?.success) {
        throw new Error(response?.message || 'ไม่สามารถดำเนินการได้');
      }

      if (response.requiresCompletion) return response;

      saveSession({
        user: response.user,
      });
      router.push('/home');
      return response;
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  if (checkingSession) return <main className="aha-session-check" role="status"><span className="aha-session-spinner"/><strong>กำลังตรวจสอบการเข้าสู่ระบบ</strong><small>กรุณารอสักครู่…</small><style jsx>{`.aha-session-check{min-height:100vh;display:grid;place-content:center;justify-items:center;gap:10px;background:#f5f8f8;color:#20343c;font-family:Arial,"Noto Sans Thai",sans-serif}.aha-session-spinner{width:36px;height:36px;border:4px solid #dce9ec;border-top-color:#2085b1;border-radius:50%;animation:spin .8s linear infinite}.aha-session-check strong{font-size:17px}.aha-session-check small{color:#71858c}@keyframes spin{to{transform:rotate(360deg)}}`}</style></main>;
  return <LoginForm onSubmit={handleSubmit} />;
}
