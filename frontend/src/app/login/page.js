'use client';

import { useRouter } from 'next/navigation';
import LoginForm from '../../components/LoginForm';
import { authApi } from '../../services/api';
import { saveSession } from '../../services/auth';

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = async ({ mode, code, identifier, password, setError, setOtpStep, ...registerData }) => {
    try {
      let response;

      if (mode === 'loginPassword') {
        response = await authApi.loginWithPassword(identifier, password);
      } else if (mode === 'loginPin') {
        response = await authApi.login(registerData.phone, registerData.pin);
      } else if (mode === 'requestOtp') {
        response = await authApi.requestOtp(registerData.phone);
        if (!response.success) throw new Error(response.message || 'ไม่สามารถขอ OTP ได้');
        setOtpStep('code');
        return;
      } else if (mode === 'loginOtp') {
        response = await authApi.loginOtp(registerData.phone, code);
      } else if (mode === 'registerPassword') {
        // Keep the complete registration payload, including phone and PIN.
        // Previously phone/pin were destructured here and silently removed,
        // causing /auth/register-password to receive no phone and return 400.
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
