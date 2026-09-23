'use client';

import { useRouter } from 'next/navigation';
import LoginForm from '../../components/LoginForm';
import { authApi } from '../../services/api';
import { saveSession } from '../../services/auth';

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = async ({ mode, phone, pin, code, identifier, password, setError, setOtpStep, ...registerData }) => {
    try {
      let response;

      if (mode === 'loginPassword') {
        response = await authApi.loginWithPassword(identifier, password);
      } else if (mode === 'loginPin') {
        response = await authApi.login(phone, pin);
      } else if (mode === 'requestOtp') {
        response = await authApi.requestOtp(phone);
        if (!response.success) throw new Error(response.message || 'ไม่สามารถขอ OTP ได้');
        setOtpStep('code');
        return;
      } else if (mode === 'loginOtp') {
        response = await authApi.loginOtp(phone, code);
      } else if (mode === 'registerPassword') {
        response = await authApi.registerWithPassword(registerData);
      } else {
        throw new Error('ไม่พบวิธีเข้าสู่ระบบ');
      }

      if (!response?.success) throw new Error(response?.message || 'ไม่สามารถดำเนินการได้');
      saveSession({ accessToken: response.accessToken, refreshToken: response.refreshToken, user: response.user });
      router.push('/home');
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  return <LoginForm onSubmit={handleSubmit} />;
}
