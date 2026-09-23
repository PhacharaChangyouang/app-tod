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
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'จัดการการเชื่อมต่อผู้ดูแลและครอบครัว');
    card.addEventListener('click', openFamily);

    const onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openFamily();
      }
    };
    card.addEventListener('keydown', onKeyDown);

    return () => {
      card.style.cursor = '';
      card.removeEventListener('click', openFamily);
      card.removeEventListener('keydown', onKeyDown);
    };
  }, [pathname, router]);

  return null;
}
