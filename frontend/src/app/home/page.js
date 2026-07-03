'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession, getUser } from '../../services/auth';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = getSession();
    if (!session || !session.accessToken) {
      router.replace('/login');
      return;
    }
    setUser(session.user);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>สวัสดี, {user?.name || 'ผู้ใช้'}</h1>
      <p>ยินดีต้อนรับสู่ AHA</p>
      <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
        <button type="button" onClick={() => router.push('/reminders')}>
          ดูรายการเตือน
        </button>
        <button type="button" onClick={() => router.push('/emergency')}>
          ฉุกเฉิน
        </button>
        <button type="button" onClick={() => router.push('/login')}>
          เปลี่ยนผู้ใช้ / login ใหม่
        </button>
        <button type="button" onClick={handleLogout}>ออกจากระบบ</button>
      </div>
    </main>
  );
}
