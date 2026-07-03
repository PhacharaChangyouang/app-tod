'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '../../services/auth';

export default function RemindersPage() {
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

  return (
    <main style={{ padding: 24 }}>
      <h1>Reminders</h1>
      <p>ยินดีต้อนรับ {user?.name || 'ผู้ใช้'}</p>
      <p>ยังไม่มีรายการเตือนจริงในเวอร์ชันนี้</p>
    </main>
  );
}
