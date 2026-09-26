'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LegalDocument({ eyebrow, title, summary, children }) {
  const router = useRouter();
  return (
    <main className="aha-legal-page">
      <header className="aha-legal-header">
        <button type="button" onClick={() => router.back()} aria-label="ย้อนกลับ"><span aria-hidden="true">←</span> กลับ</button>
        <Link className="aha-legal-brand" href="/">AHA <span>AI Health Assistant</span></Link>
      </header>
      <article className="aha-legal-card">
        <span className="aha-legal-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="aha-legal-summary">{summary}</p>
        <p className="aha-legal-updated">ปรับปรุงล่าสุด: 26 กันยายน 2026</p>
        <div className="aha-legal-content">{children}</div>
      </article>
      <footer>© 2026 ahahealth.online - สงวนลิขสิทธิ์</footer>
      <style jsx>{`
        .aha-legal-page,.aha-legal-page *{box-sizing:border-box}.aha-legal-page{min-height:100dvh;background:var(--aha-bg,#f7f7f5);color:var(--aha-text,#111);padding:0 18px 52px;font-family:var(--font-trirong),"Trirong",serif}.aha-legal-header{width:min(860px,100%);height:72px;margin:auto;display:flex;align-items:center;justify-content:space-between}.aha-legal-brand{color:var(--aha-text,#111);font-size:22px;font-weight:900;text-align:right;text-decoration:none}.aha-legal-brand span{display:block;color:var(--aha-text,#111);font-size:10px;font-weight:700}.aha-legal-header button{min-height:42px;border:1px solid var(--aha-border,#e2e3e6);border-radius:11px;background:var(--aha-surface,#fff);color:var(--aha-text,#111);padding:0 14px;font-weight:800;cursor:pointer}.aha-legal-header button span{font-size:18px;margin-right:3px}.aha-legal-card{width:min(860px,100%);margin:auto;padding:42px 48px;background:var(--aha-surface,#fff);border:1px solid var(--aha-border,#e2e3e6);border-radius:24px;box-shadow:var(--aha-shadow,0 16px 45px rgba(30,67,80,.08))}.aha-legal-eyebrow{color:var(--aha-text,#111);font-size:11px;font-weight:900;letter-spacing:.12em}.aha-legal-card h1{margin:7px 0 8px;font-size:34px;line-height:1.25;color:var(--aha-text,#111)}.aha-legal-summary{margin:0;color:var(--aha-text,#111);line-height:1.7}.aha-legal-updated{margin:12px 0 30px;color:var(--aha-text,#111);font-size:12px}.aha-legal-content{display:grid;gap:23px}.aha-legal-content :global(section){padding-top:22px;border-top:1px solid var(--aha-border,#e2e3e6)}.aha-legal-content :global(h2){margin:0 0 8px;color:var(--aha-text,#111);font-size:20px}.aha-legal-content :global(p),.aha-legal-content :global(li){color:var(--aha-text,#111);font-size:14px;line-height:1.8}.aha-legal-content :global(p){margin:0}.aha-legal-content :global(ul){margin:7px 0 0;padding-left:22px}.aha-legal-content :global(a){color:var(--aha-text,#111);font-weight:800;text-decoration:underline}footer{width:min(860px,100%);margin:20px auto 0;text-align:center;color:var(--aha-text,#111);font-size:12px}
        @media(max-width:620px){.aha-legal-page{padding:0 10px 38px}.aha-legal-header{height:62px}.aha-legal-card{padding:27px 19px;border-radius:19px}.aha-legal-card h1{font-size:27px}.aha-legal-content :global(h2){font-size:18px}}
      `}</style>
    </main>
  );
}
