'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function FamilyHomeShortcut() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/home') return undefined;

    const card = document.querySelector('.aha-v3-care-card-large');
    if (!card) return undefined;

    const openFamily = () => router.push('/family');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'จัดการการเชื่อมต่อผู้ดูแลและครอบครัว');
    card.addEventListener('click', openFamily);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openFamily();
      }
    });

    return () => {
      card.removeEventListener('click', openFamily);
    };
  }, [pathname, router]);

  return null;
}
