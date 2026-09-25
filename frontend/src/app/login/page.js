'use client';

import { useRouter } from 'next/navigation';
import LoginForm from '../../components/LoginForm';
import { authApi } from '../../services/api';
import { saveSession } from '../../services/auth';

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = async (payload) => {
    const { mode, identifier, setError, ...data } = payload;

    try {
      let response;

      if (mode === 'loginPassword') {
        response = await authApi.loginWithPassword(identifier, data.password);
      } else if (mode === 'registerPassword') {
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

  return <LoginForm onSubmit={handleSubmit} />;
}
