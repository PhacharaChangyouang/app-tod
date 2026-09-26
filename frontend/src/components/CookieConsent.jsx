'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const CONSENT_KEY = 'aha_cookie_consent_v1';
const DISMISSED_KEY = 'aha_cookie_banner_dismissed';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(CONSENT_KEY) === 'accepted';
      const dismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true';
      setVisible(!accepted && !dismissed);
    } catch (_) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      localStorage.setItem(`${CONSENT_KEY}_at`, new Date().toISOString());
    } catch (_) {}
    setVisible(false);
  };

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISSED_KEY, 'true'); } catch (_) {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="aha-cookie-banner" role="dialog" aria-live="polite" aria-label="การใช้คุกกี้">
      <button className="aha-cookie-close" type="button" onClick={dismiss} aria-label="ปิดข้อความคุกกี้">×</button>
      <div className="aha-cookie-copy">
        <strong>การใช้คุกกี้</strong>
        <p>เว็บไซต์นี้ใช้คุกกี้เพื่อสร้างประสบการณ์ที่ดีมีประสิทธิภาพยิ่งขึ้น อ่านเพิ่มเติมคลิก <Link href="/privacy-policy">Privacy Policy</Link> และ <Link href="/cookies-policy">Cookies Policy</Link></p>
      </div>
      <button className="aha-cookie-accept" type="button" onClick={accept}>ยอมรับ</button>
      <style jsx>{`
        .aha-cookie-banner{position:fixed;z-index:10000;left:50%;bottom:max(18px,env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(920px,calc(100% - 28px));display:flex;align-items:center;gap:18px;padding:18px 54px 18px 20px;border:1px solid #cfe1e5;border-radius:18px;background:#fff;color:#20343c;box-shadow:0 18px 55px rgba(18,55,70,.2);font-family:var(--font-trirong),"Trirong",serif}.aha-cookie-copy{flex:1;min-width:0}.aha-cookie-copy strong{display:block;font-size:15px;margin-bottom:4px}.aha-cookie-copy p{margin:0;color:#5e747c;font-size:13px;line-height:1.65}.aha-cookie-copy :global(a){color:#111;font-weight:800;text-decoration:underline;text-underline-offset:2px}.aha-cookie-accept{flex:0 0 auto;min-width:104px;min-height:44px;border:1px solid #aebbc0;border-radius:12px;background:#fff;color:#20343c;font-weight:900;cursor:pointer;box-shadow:0 3px 10px rgba(18,55,70,.09)}.aha-cookie-accept:hover{background:#f7f9f9;border-color:#83949b}.aha-cookie-close{position:absolute;right:12px;top:10px;width:34px;height:34px;border:0;border-radius:50%;background:#eef4f5;color:#536c75;font-size:25px;line-height:1;cursor:pointer}.aha-cookie-accept:focus-visible,.aha-cookie-close:focus-visible,.aha-cookie-copy :global(a:focus-visible){outline:3px solid rgba(32,52,60,.22);outline-offset:2px}
        @media(max-width:640px){.aha-cookie-banner{bottom:max(10px,env(safe-area-inset-bottom,0px));display:grid;gap:12px;padding:17px 48px 15px 16px;border-radius:16px}.aha-cookie-accept{width:100%}.aha-cookie-copy p{font-size:12px}}
      `}</style>
    </aside>
  );
}
