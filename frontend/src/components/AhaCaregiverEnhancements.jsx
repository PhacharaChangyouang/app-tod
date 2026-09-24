'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';

function AvatarSync() {
  useEffect(() => {
    const sync = () => {
      let id = '';
      try { id = JSON.parse(localStorage.getItem('aha_session') || '{}')?.user?.id || ''; } catch (_) {}
      if (!id) return;
      const src = localStorage.getItem(`aha_avatar_${id}`);
      document.querySelectorAll('.aha-v3-user-avatar').forEach((el) => {
        if (src) { el.style.backgroundImage = `url(${JSON.stringify(src)})`; el.style.backgroundSize='cover'; el.style.backgroundPosition='center'; el.style.backgroundRepeat='no-repeat'; el.style.color='transparent'; el.textContent=''; }
      });
    };
    sync();
    const onStorage = (e) => { if (!e.key || e.key.startsWith('aha_avatar_') || e.key === 'aha_session') sync(); };
    window.addEventListener('storage', onStorage);
    const timer = window.setInterval(sync, 700);
    return () => { window.removeEventListener('storage', onStorage); window.clearInterval(timer); };
  }, []);
  return null;
}

function CaregiverCalendar() {
  const days = useMemo(() => {
    const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1); const count = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate(); const offset=(first.getDay()+6)%7;
    return [...Array(offset).fill(null), ...Array.from({length:count},(_,i)=>i+1)];
  }, []);
  const now = new Date(); const month=now.toLocaleDateString('th-TH',{month:'long',year:'numeric'});
  return <section className="aha-care-calendar" aria-label="ปฏิทินการดูแล"><div className="aha-care-calendar-head"><div><span>PLAN YOUR CARE</span><h2>ปฏิทินการดูแล</h2><p>วางแผนและติดตามการดูแลในแต่ละวัน</p></div><div className="aha-care-calendar-badge">📅 <b>{now.getDate()}</b><small>วันนี้</small></div></div><div className="aha-care-calendar-month"><strong>{month}</strong><span>วันนี้ · {now.getDate()}</span></div><div className="aha-care-calendar-grid aha-care-week"><b>จ</b><b>อ</b><b>พ</b><b>พฤ</b><b>ศ</b><b>ส</b><b>อา</b></div><div className="aha-care-calendar-grid">{days.map((day,i)=><span key={`${day}-${i}`} className={day===now.getDate()?'today':''}>{day||''}</span>)}</div><div className="aha-care-calendar-legend"><span><i className="dot-blue"/>วันนี้</span><span><i className="dot-orange"/>ติดตามยา</span><span>💙 ดูแลกันทุกวัน</span></div></section>;
}

function DashboardShowcase() {
  return <div className="aha-care-showcase"><div className="aha-care-showcase-copy"><span>SMART CARE OVERVIEW</span><h2>ดูแลคนที่คุณรัก<br/><em>ได้ง่ายขึ้นทุกวัน</em></h2><p>รวมสถานะการทานยา ตารางวันนี้ และสิ่งที่ควรติดตามไว้ในมุมมองเดียว</p></div><div className="aha-care-showcase-cards"><div><b>✓</b><strong>ติดตามยา</strong><small>เห็นรายการที่ทานแล้วและรอยืนยัน</small></div><div><b>◷</b><strong>วันนี้</strong><small>ดูสิ่งสำคัญของผู้สูงอายุได้ทันที</small></div><div><b>♡</b><strong>ใส่ใจทุกวัน</strong><small>ติดตามจากระยะไกลอย่างสบายใจ</small></div></div></div>;
}

export default function AhaCaregiverEnhancements(){
  const pathname=usePathname();
  return <><AvatarSync />{pathname==='/family'&&<><DashboardShowcase/><CaregiverCalendar/></>}<style jsx global>{`
    .aha-care-showcase{width:min(1040px,calc(100% - 28px));margin:18px auto 14px;padding:26px 28px;border-radius:28px;background:linear-gradient(135deg,#2f6bff 0%,#5b88ff 58%,#7ca0ff 100%);color:#fff;position:relative;overflow:hidden;box-shadow:0 18px 40px rgba(47,107,255,.20)}
    .aha-care-showcase:after{content:'';position:absolute;width:220px;height:220px;border-radius:50%;right:-65px;top:-100px;background:rgba(255,255,255,.13);box-shadow:-80px 150px 0 20px rgba(255,184,77,.16)}
    .aha-care-showcase-copy{position:relative;z-index:1;max-width:520px}.aha-care-showcase-copy>span{font-size:10px;font-weight:900;letter-spacing:.14em;opacity:.8}.aha-care-showcase h2{margin:6px 0 8px;font-size:28px;line-height:1.15}.aha-care-showcase h2 em{font-style:normal;color:#fff}.aha-care-showcase p{margin:0;max-width:500px;font-size:13px;line-height:1.6;opacity:.9}
    .aha-care-showcase-cards{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}.aha-care-showcase-cards div{padding:13px;border-radius:16px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(5px)}.aha-care-showcase-cards b{display:block;font-size:18px;color:#ffcf75}.aha-care-showcase-cards strong{display:block;font-size:13px;margin-top:4px}.aha-care-showcase-cards small{display:block;margin-top:3px;font-size:10px;line-height:1.45;opacity:.78}
    .aha-care-calendar{width:min(1040px,calc(100% - 28px));margin:0 auto 34px;padding:20px;border:1px solid #dce9f7;border-radius:24px;background:linear-gradient(145deg,#fff,#f5f9ff);box-shadow:0 12px 30px rgba(47,107,255,.09);color:#1d2b3a}.aha-care-calendar-head{display:flex;justify-content:space-between;align-items:center;gap:16px}.aha-care-calendar-head span{color:#2f6bff;font-size:10px;font-weight:900;letter-spacing:.12em}.aha-care-calendar-head h2{margin:3px 0 4px;font-size:22px}.aha-care-calendar-head p{margin:0;color:#718096;font-size:13px}.aha-care-calendar-badge{width:58px;height:62px;flex:0 0 58px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:16px;background:#eaf2ff;color:#2f6bff}.aha-care-calendar-badge b{font-size:20px;line-height:1}.aha-care-calendar-badge small{font-size:9px;color:#6f7e92;margin-top:3px}.aha-care-calendar-month{display:flex;justify-content:space-between;align-items:center;margin:18px 0 10px;padding:9px 12px;border-radius:14px;background:#f1f6ff}.aha-care-calendar-month strong{font-size:15px}.aha-care-calendar-month span{font-size:10px;color:#718096}.aha-care-calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}.aha-care-calendar-grid span,.aha-care-week b{min-height:38px;display:grid;place-items:center;border-radius:11px;font-size:13px}.aha-care-week b{min-height:30px;color:#8794a6;font-size:10px}.aha-care-calendar-grid span{background:#fff;border:1px solid #edf1f6}.aha-care-calendar-grid span:empty{background:transparent;border-color:transparent}.aha-care-calendar-grid span.today{background:#2f6bff;color:#fff;border-color:#2f6bff;font-weight:900;box-shadow:0 5px 12px rgba(47,107,255,.24)}.aha-care-calendar-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px;color:#6d7b8e;font-size:10px}.aha-care-calendar-legend i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}.dot-blue{background:#2f6bff}.dot-orange{background:#ffb84d}
    button[aria-label*="กลับ"] svg,.aha-family-back svg,.aha-profile-icon-button svg,.aha-page-back svg,.aha-back-button svg,.aha-voice-back svg,.aha-emergency-back svg{transform:rotate(180deg)!important}.aha-profile-page{background:#f3f7ff!important;color:#23324a!important}.aha-profile-icon-button,.aha-profile-home-button{border-color:#d8e5fb!important;background:#fff!important;color:#2f6bff!important}.aha-profile-section,.aha-profile-identity,.aha-profile-account{border-color:#dce7f8!important;background:#fff!important;box-shadow:0 8px 24px rgba(47,107,255,.055)!important}.aha-profile-primary{background:#2f6bff!important;box-shadow:0 7px 16px rgba(47,107,255,.14)!important}.aha-profile-secondary{border-color:#cfdcf4!important;background:#edf4ff!important;color:#2f6bff!important}.aha-theme-option.active{border-color:#2f6bff!important;background:#eef4ff!important;color:#245be0!important}.aha-theme-option span{box-shadow:0 0 0 2px #fff,0 0 0 3px #dbe6f7!important}.aha-v3-top-actions>button:nth-child(2) .aha-v3-user-avatar{background-color:#2f6bff!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important}
    @media(max-width:760px){.aha-care-showcase{width:calc(100% - 20px);padding:21px 18px;border-radius:22px}.aha-care-showcase h2{font-size:23px}.aha-care-showcase p{font-size:11px}.aha-care-showcase-cards{gap:7px}.aha-care-showcase-cards div{padding:10px}.aha-care-showcase-cards small{font-size:9px}.aha-care-calendar{width:calc(100% - 20px);padding:16px;border-radius:20px}.aha-care-calendar-head h2{font-size:19px}.aha-care-calendar-head p{font-size:11px}.aha-care-calendar-grid span{min-height:34px;font-size:12px}}
  `}</style></>;
}
