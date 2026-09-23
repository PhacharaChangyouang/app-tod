'use client';

import { useRouter, usePathname } from 'next/navigation';
import AhaIcon from './AhaIcon';

function Brand() {
  return (
    <div className="aha-v3-brand">
      <span className="aha-v3-brand-mark">
        <svg viewBox="0 0 60 42" fill="none" aria-hidden="true">
          <path d="M3 25C12 25 12 5 21 5s9 30 18 30 9-25 18-25" stroke="#159FE0" strokeWidth="8" strokeLinecap="round" />
          <path d="M40 29c7 0 8-13 17-13" stroke="#22B8AA" strokeWidth="8" strokeLinecap="round" />
        </svg>
      </span>
      <span>
        <strong>AHA</strong>
        <small>AI Health Assistant</small>
      </span>
    </div>
  );
}

export default function AhaNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || pathname === '/' || pathname.startsWith('/login')) return null;

  const items = [
    ['home', 'หน้าหลัก', '/home'],
    ['pill', 'ยา', '/reminders'],
    ['mic', 'พูดกับ AHA', '/voice'],
    ['bell', 'แจ้งเตือน', '/notifications'],
    ['warning', 'ฉุกเฉิน', '/emergency'],
  ];

  return (
    <aside className="aha-v3-sidebar" data-aha-navigation="true">
      <Brand />
      <nav className="aha-v3-side-links" aria-label="เมนูหลัก AHA">
        {items.map(([icon, label, path]) => {
          const active = pathname === path || pathname.startsWith(`${path}/`);
          return (
            <button
              key={path}
              type="button"
              className={`${active ? 'active' : ''}${path === '/voice' ? ' aha-v3-nav-voice' : ''}${path === '/emergency' ? ' danger' : ''}`}
              onClick={() => router.push(path)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <AhaIcon name={icon} size={path === '/voice' ? 26 : 24} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="aha-v3-side-spacer" />

      <div className="aha-v3-side-care">
        <AhaIcon name="users" size={25} />
        <div>
          <strong>ผู้ดูแล</strong>
          <span><i /> เชื่อมต่อแล้ว</span>
        </div>
      </div>

      <div className="aha-v3-side-wellness">
        <AhaIcon name="heart" size={31} />
        <strong>สุขภาพดี<br />เริ่มได้ทุกวัน</strong>
        <span className="aha-v3-wave">〰</span>
      </div>
    </aside>
  );
}
