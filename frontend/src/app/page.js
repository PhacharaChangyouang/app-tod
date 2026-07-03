'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '../services/auth';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session || !session.accessToken) {
      router.replace('/login');
      return;
    }

    const role = session.user?.role;
    if (role === 'elderly') {
      router.replace('/home');
    } else if (role === 'caregiver') {
      router.replace('/home');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return <div>กำลังตรวจสอบ session…</div>;
}
