'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const HIDE_UNTIL_KEY = 'aha_flood_emergency_hide_until';
const HIDE_DAYS = 7;

export default function FloodEmergencyPopup() {
  const [visible, setVisible] = useState(false);
  const [hideForSevenDays, setHideForSevenDays] = useState(false);

  useEffect(() => {
    const hideUntil = Number(localStorage.getItem(HIDE_UNTIL_KEY) || 0);
    setVisible(!Number.isFinite(hideUntil) || Date.now() >= hideUntil);
  }, []);

  const close = () => {
    if (hideForSevenDays) {
      localStorage.setItem(HIDE_UNTIL_KEY, String(Date.now() + HIDE_DAYS * 24 * 60 * 60 * 1000));
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="aha-flood-backdrop" role="dialog" aria-modal="true" aria-labelledby="aha-flood-title">
      <section className="aha-flood-popup">
        <button type="button" className="aha-flood-close" onClick={close} aria-label="ปิดข้อมูลเบอร์ฉุกเฉินน้ำท่วม">×</button>
        <h2 id="aha-flood-title" className="sr-only">เบอร์ฉุกเฉินเมื่อเกิดน้ำท่วม</h2>
        <Image className="aha-flood-image" src="/flood-emergency-numbers.svg" alt="เบอร์ฉุกเฉินน้ำท่วม สายด่วน ปภ. 1784 และการแพทย์ฉุกเฉิน 1669" width={900} height={1080} priority />
        <label className="aha-flood-choice">
          <input type="checkbox" checked={hideForSevenDays} onChange={(event) => setHideForSevenDays(event.target.checked)} />
          <span>ไม่แสดงข้อความนี้อีกเป็นเวลา {HIDE_DAYS} วัน</span>
        </label>
      </section>
      <style jsx>{`
        .aha-flood-backdrop{position:fixed;inset:0;z-index:10060;display:grid;place-items:center;padding:18px;background:rgba(7,22,39,.7);backdrop-filter:blur(6px)}
        .aha-flood-popup{position:relative;width:min(520px,100%);max-height:calc(100dvh - 36px);overflow:auto;background:#fff;border:1px solid #d8e4ea;border-radius:24px;padding:12px 12px 18px;box-shadow:0 28px 80px rgba(0,0,0,.35)}
        .aha-flood-close{position:absolute;z-index:2;right:20px;top:20px;width:44px;height:44px;border:1px solid rgba(255,255,255,.75);border-radius:50%;background:rgba(255,255,255,.94);color:#15334a;font-size:30px;line-height:1;display:grid;place-items:center;cursor:pointer;box-shadow:0 5px 16px rgba(0,0,0,.18)}
        .aha-flood-popup :global(.aha-flood-image){display:block;width:100%;height:auto;border-radius:16px}
        .aha-flood-choice{display:flex;align-items:center;justify-content:center;gap:10px;padding:15px 8px 0;color:#263b47;font-size:15px;font-weight:800;line-height:1.4;cursor:pointer}.aha-flood-choice input{width:20px;height:20px;accent-color:#176d9a;flex:0 0 auto}
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        @media(max-width:520px){.aha-flood-backdrop{padding:10px}.aha-flood-popup{padding:8px 8px 15px;border-radius:19px}.aha-flood-close{right:15px;top:15px;width:40px;height:40px}.aha-flood-choice{font-size:14px;padding-inline:4px}}
      `}</style>
    </div>
  );
}
