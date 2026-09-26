'use client';

import Link from 'next/link';

export default function ErrorPage({ reset }) {
  return <main className="aha-error-page"><section><div aria-hidden="true">!</div><h1>ระบบเปิดหน้านี้ไม่สำเร็จ</h1><p>อุปกรณ์อาจเชื่อมต่อไม่สมบูรณ์ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง</p><button type="button" onClick={() => reset()}>ลองใหม่</button><Link href="/">กลับหน้าเข้าสู่ระบบ</Link></section><style jsx>{`.aha-error-page{min-height:100vh;display:grid;place-items:center;padding:22px;background:#f5f8f8;color:#20343c;font-family:var(--font-trirong),"Trirong",serif}.aha-error-page section{width:min(430px,100%);padding:32px 24px;text-align:center;background:#fff;border:1px solid #dbe6e8;border-radius:20px;box-shadow:0 18px 45px rgba(30,67,80,.12)}.aha-error-page section>div{width:52px;height:52px;margin:0 auto 15px;display:grid;place-items:center;border-radius:50%;background:#fff2e8;color:#b85b24;font-size:27px;font-weight:900}.aha-error-page h1{margin:0 0 10px;font-size:24px}.aha-error-page p{margin:0 0 21px;color:#687d85;line-height:1.65}.aha-error-page button,.aha-error-page a{display:block;width:100%;box-sizing:border-box;padding:14px;border-radius:12px;font-weight:800}.aha-error-page button{border:0;background:#2085b1;color:#fff;font-size:16px}.aha-error-page a{margin-top:10px;color:#247f9f;text-decoration:none}`}</style></main>;
}
