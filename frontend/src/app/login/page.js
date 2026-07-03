'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import LoginForm from '../../components/LoginForm';
import { authApi } from '../../services/api';
import { saveSession } from '../../services/auth';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState('phone');

  const handleSubmit = async ({ mode, phone, code, name, age, role, pin, setStep, setError }) => {
    try {
      if (mode === 'requestOtp') {
        const response = await authApi.requestOtp(phone);
        if (!response.success) throw new Error(response.message || 'ไม่สามารถขอ OTP ได้');
        setStep('verify');
        return;
      }

      if (mode === 'verifyOtp') {
        const response = await authApi.verifyOtp(phone, code);
        if (!response.success) throw new Error(response.message || 'ไม่สามารถยืนยัน OTP ได้');
        setStep('register');
        return;
      }

      if (mode === 'register') {
        const response = await authApi.register({ phone, name, age, role, pin });
        if (!response.success) throw new Error(response.message || 'ไม่สามารถสมัครสมาชิกได้');
        saveSession({ accessToken: response.accessToken, refreshToken: response.refreshToken, user: response.user });
        router.push('/home');
        return;
      }

      if (mode === 'login') {
        const response = await authApi.login(phone, pin);
        if (!response.success) throw new Error(response.message || 'ไม่สามารถเข้าสู่ระบบได้');
        saveSession({ accessToken: response.accessToken, refreshToken: response.refreshToken, user: response.user });
        router.push('/home');
        return;
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return <LoginForm onSubmit={handleSubmit} />;
}
