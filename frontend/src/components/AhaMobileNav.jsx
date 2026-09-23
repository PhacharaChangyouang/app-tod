'use client';

import { usePathname, useRouter } from 'next/navigation';
import AhaIcon from './AhaIcon';

const items = [
  { key: 'home', label: 'หน้าหลัก', path: '/home', icon: 'home' },
  { key: 'medicine', label: 'ยา', path: '/reminders', icon: 'pill' },
  { key: 'voice', label: 'พูดกับ AHA', path: '/voice', icon: 'mic', featured: true },
  { key: 'notifications', label: 'แจ้งเตือน', path: '/notifications', icon: 'bell' },
  { key: 'emergency', label: 'ฉุกเฉิน', path: '/emergency', icon: 'phone', danger: true },
];

export default function AhaMobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || pathname === '/' || pathname.startsWith('/login')) return null;

  return (
    <nav className="aha-mobile-nav" aria-label="เมนูหลัก AHA">
      <div className="aha-mobile-nav-inner">
        {items.map((item) => {
          const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <button
              key={item.key}
              type="button"
              className={`aha-mobile-nav-item${active ? ' active' : ''}${item.featured ? ' featured' : ''}${item.danger ? ' danger' : ''}`}
              onClick={() => router.push(item.path)}
              aria-label={item.label}
            >
              <span className="aha-mobile-nav-icon">
                <AhaIcon name={item.icon} size={item.featured ? 28 : 23} />
              </span>
              <span className="aha-mobile-nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
