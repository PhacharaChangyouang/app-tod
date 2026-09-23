'use client';

import { useRouter } from 'next/navigation';
import LoginForm from '../../components/LoginForm';
import { authApi } from '../../services/api';
import { saveSession } from '../../services/auth';

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = async (payload) => {
    const { mode, code, identifier, setError, setOtpStep, ...data } = payload;

    try {
      let response;

      if (mode === 'loginPassword') {
        response = await authApi.loginWithPassword(identifier, data.password);
      } else if (mode === 'loginPin') {
        response = await authApi.login(data.phone, data.pin);
      } else if (mode === 'requestOtp') {
        response = await authApi.requestOtp(data.phone);
        if (!response.success) throw new Error(response.message || 'ไม่สามารถขอ OTP ได้');
        setOtpStep('code');
        return;
      } else if (mode === 'loginOtp') {
        response = await authApi.loginOtp(data.phone, code);
      } else if (mode === 'registerPassword') {
        // IMPORTANT: keep the complete registration payload.
        // password, confirmPassword, phone and pin must all reach the API.
        response = await authApi.registerWithPassword({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          username: data.username,
          password: data.password,
          confirmPassword: data.confirmPassword,
          role: data.role,
          age: data.age,
          pin: data.pin,
          termsAccepted: data.termsAccepted,
        });
      } else {
        throw new Error('ไม่พบวิธีเข้าสู่ระบบ');
      }

      if (!response?.success) {
        throw new Error(response?.message || 'ไม่สามารถดำเนินการได้');
      }

      saveSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      });
      router.push('/home');
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  return <LoginForm onSubmit={handleSubmit} />;
}
