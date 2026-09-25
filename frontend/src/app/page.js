'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession } from '../services/auth';
import { authApi } from '../services/api';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    authApi.me().then((result) => {
      if (!active || !result?.user) return;
      saveSession({ user: result.user });
      router.replace('/home');
    }).catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; };
  }, [router]);

  return <div>กำลังตรวจสอบ session…</div>;
}
