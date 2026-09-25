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
    authApi.me().then((result) => {
      if (!active) return;
      if (!result?.user) {
        setCheckingSession(false);
        return;
      }
      saveSession({ user: result.user });
      router.replace('/home');
    }).catch(() => {
      if (active) setCheckingSession(false);
    });
    return () => { active = false; };
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
      } else {
        throw new Error('ไม่พบวิธีเข้าสู่ระบบ');
      }

      if (!response?.success) {
        throw new Error(response?.message || 'ไม่สามารถดำเนินการได้');
      }

      saveSession({
        user: response.user,
      });
      router.push('/home');
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  if (checkingSession) return <div>กำลังตรวจสอบ session…</div>;
  return <LoginForm onSubmit={handleSubmit} />;
}
