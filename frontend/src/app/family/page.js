'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { caregiverApi, familyApi } from '../../services/api';
import { getSession } from '../../services/auth';

const EMPTY_FORM = {
  medicine_name: '', dosage: '', reminder_time: '', frequency: 'daily',
  days_of_week: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  start_date: '', end_date: '', is_active: true,
};

function listOf(response) { return Array.isArray(response?.data) ? response.data : []; }
function timeOf(value) { return String(value || '').slice(0, 5); }
function dateKey(date) { return date.toISOString().slice(0, 10); }
function shortDate(value) { const s = String(value || '').slice(5, 10); return s ? `${s.slice(3,5)}/${s.slice(0,2)}` : ''; }

function HistoryChart({ rows }) {
  const chart = useMemo(() => {
    const map = new Map();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      map.set(dateKey(d), { date: dateKey(d), taken: 0, total: 0 });
    }
    rows.forEach((row) => {
      const key = String(row.scheduled_date || '').slice(0, 10);
      if (!map.has(key)) return;
      const item = map.get(key);
      item.total += 1;
      if (row.status === 'taken') item.taken += 1;
    });
    const points = Array.from(map.values());
    const max = Math.max(1, ...points.map((p) => p.total));
    const width = 760, height = 250, left = 42, right = 18, top = 24, bottom = 42;
    const innerW = width - left - right, innerH = height - top - bottom;
    const x = (i) => left + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
    const y = (v) => top + innerH - (innerH * v) / max;
    return { points, max, width, height, x, y };
  }, [rows]);

  const line = chart.points.map((p, i) => `${chart.x(i)},${chart.y(p.taken)}`).join(' ');
  const totalLine = chart.points.map((p, i) => `${chart.x(i)},${chart.y(p.total)}`).join(' ');

  return (
    <section className="family-chart-card">
      <div className="section-heading chart-heading">
        <div><span className="aha-family-eyebrow">7 DAYS</span><h3>แนวโน้มการทานยา</h3><p>ข้อมูลจริงจากประวัติการแจ้งเตือนของระบบ</p></div>
        <div className="chart-legend"><span><i className="legend-taken" />ทานแล้ว</span><span><i className="legend-total" />รายการทั้งหมด</span></div>
      </div>
      {rows.length === 0 ? (
        <div className="chart-empty">ยังไม่มีประวัติการทานยาในช่วง 7 วันที่ผ่านมา</div>
      ) : (
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="กราฟแนวโน้มการทานยา 7 วัน">
            {[0, .5, 1].map((ratio) => <line key={ratio} x1="42" x2="742" y1={chart.y(chart.max * ratio)} y2={chart.y(chart.max * ratio)} className="chart-grid" />)}
            <polyline points={totalLine} fill="none" className="chart-line chart-line-total" />
            <polyline points={line} fill="none" className="chart-line chart-line-taken" />
            {chart.points.map((p, i) => (
              <g key={p.date}>
                <circle cx={chart.x(i)} cy={chart.y(p.total)} r="4" className="chart-dot-total" />
                <circle cx={chart.x(i)} cy={chart.y(p.taken)} r="5" className="chart-dot-taken" />
                <text x={chart.x(i)} y="232" textAnchor="middle" className="chart-label">{shortDate(p.date)}</text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}

export default function FamilyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [linkedElderly, setLinkedElderly] = useState([]);
  const [dashboard, setDashboard] = useState({ elderly: [], today: [], history: [] });
  const [selectedElderly, setSelectedElderly] = useState('');
  const [phone, setPhone] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isCaregiver = user?.role === 'caregiver';

  const load = async () => {
    setError('');
    try {
      const [connectionResponse, elderlyResponse] = await Promise.all([familyApi.connections(), familyApi.linkedElderly()]);
      setConnections(listOf(connectionResponse));
      const elderly = listOf(elderlyResponse);
      setLinkedElderly(elderly);
      if (elderly.length && !selectedElderly) setSelectedElderly(elderly[0].user_id);
      if (isCaregiver) {
        const summary = await caregiverApi.summary();
        setDashboard(summary?.data || { elderly: [], today: [], history: [] });
      }
    } catch (err) { setError(err.message || 'ยังโหลดข้อมูลครอบครัวไม่ได้'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const session = getSession();
    if (!session?.accessToken) { router.replace('/login'); return; }
    setUser(session.user || null);
  }, [router]);
  useEffect(() => { if (user) load(); }, [user]);

  const incoming = useMemo(() => connections.filter((item) => item.status === 'pending' && item.direction === 'incoming'), [connections]);
  const outgoing = useMemo(() => connections.filter((item) => item.status === 'pending' && item.direction === 'outgoing'), [connections]);
  const accepted = useMemo(() => connections.filter((item) => item.status === 'accepted'), [connections]);
  const selectedPerson = dashboard.elderly.find((person) => String(person.user_id) === String(selectedElderly)) || linkedElderly.find((person) => String(person.user_id) === String(selectedElderly));
  const selectedToday = dashboard.today.filter((item) => String(item.user_id) === String(selectedElderly));
  const selectedHistory = dashboard.history.filter((item) => String(item.user_id) === String(selectedElderly));

  const stats = useMemo(() => {
    const total = selectedToday.length;
    const taken = selectedToday.filter((item) => item.taken).length;
    const overdue = selectedToday.filter((item) => !item.taken && new Date(`1970-01-01T${timeOf(item.reminder_time)}:00`) < new Date(`1970-01-01T${new Date().toTimeString().slice(0,5)}:00`)).length;
    return { total, taken, overdue, rate: total ? Math.round((taken / total) * 100) : 0 };
  }, [selectedToday]);

  const submitConnect = async (event) => {
    event.preventDefault(); setError(''); setSuccess('');
    const normalized = phone.replace(/\D/g, '');
    if (!/^0\d{9}$/.test(normalized)) { setError('กรุณากรอกเบอร์โทร 10 หลัก'); return; }
    setBusy(true);
    try { await familyApi.connect(normalized); setPhone(''); setSuccess('ส่งคำขอเชื่อมต่อแล้ว รออีกฝ่ายยืนยัน'); await load(); }
    catch (err) { setError(err.message || 'ส่งคำขอเชื่อมต่อไม่สำเร็จ'); await load(); }
    finally { setBusy(false); }
  };

  const respond = async (id, status) => {
    setError(''); setSuccess(''); setBusy(true);
    try { await familyApi.updateConnection(id, status); setSuccess(status === 'accepted' ? 'เชื่อมต่อสำเร็จแล้ว' : 'ปฏิเสธคำขอแล้ว'); await load(); }
    catch (err) { setError(err.message || 'ดำเนินการกับคำขอไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); };
  const refreshSummary = async () => { const summary = await caregiverApi.summary(); setDashboard(summary?.data || { elderly: [], today: [], history: [] }); };

  const submitReminder = async (event) => {
    event.preventDefault();
    if (!selectedElderly) { setError('กรุณาเลือกผู้สูงอายุ'); return; }
    setError(''); setSuccess(''); setBusy(true);
    try {
      if (editingId) await caregiverApi.updateReminder(editingId, form);
      else await caregiverApi.createReminder({ ...form, elderly_user_id: selectedElderly });
      resetForm(); setSuccess(editingId ? 'แก้ไขยาแล้ว และส่งแจ้งเตือนไปยังผู้สูงอายุแล้ว' : 'เพิ่มยาแล้ว และส่งแจ้งเตือนไปยังผู้สูงอายุแล้ว'); await refreshSummary();
    } catch (err) { setError(err.message || 'บันทึกตารางยาไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const startEdit = (item) => {
    setEditingId(item.reminder_id);
    setForm({ medicine_name:item.medicine_name || '', dosage:item.dosage || '', reminder_time:timeOf(item.reminder_time), frequency:item.frequency || 'daily', days_of_week:item.days_of_week || EMPTY_FORM.days_of_week, start_date:String(item.start_date || '').slice(0,10), end_date:String(item.end_date || '').slice(0,10), is_active:item.is_active !== false });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };
  const removeReminder = async (item) => {
    if (!window.confirm(`ลบยา ${item.medicine_name} เวลา ${timeOf(item.reminder_time)} หรือไม่?\nผู้สูงอายุจะได้รับการแจ้งเตือน`)) return;
    setBusy(true); setError(''); setSuccess('');
    try { await caregiverApi.removeReminder(item.reminder_id); setSuccess('ลบรายการยาแล้ว และแจ้งผู้สูงอายุแล้ว'); await refreshSummary(); }
    catch (err) { setError(err.message || 'ลบรายการยาไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  return (
    <div className="aha-v3-page aha-family-page">
      <main className="aha-family-shell">
        <header className="aha-family-header">
          <button className="aha-family-back" onClick={() => router.push('/home')} aria-label="กลับหน้าหลัก"><AhaIcon name="arrow" size={22} /></button>
          <div><span className="aha-family-eyebrow">AHA FAMILY</span><h1>{isCaregiver ? 'ศูนย์ดูแลผู้สูงอายุ' : 'เชื่อมต่อกับผู้ดูแล'}</h1><p>{isCaregiver ? 'ติดตามยาและสถานะของผู้สูงอายุที่คุณดูแลจากที่เดียว' : 'ให้ผู้ดูแลที่ไว้ใจได้ช่วยติดตามการดูแลของคุณ'}</p></div>
        </header>
        {(error || success) && <div className={`aha-family-alert ${error ? 'error' : 'success'}`}>{error || success}</div>}

        {isCaregiver && <section className="caregiver-focus">
          <div className="caregiver-focus-head"><div><span className="aha-family-eyebrow">CAREGIVER DASHBOARD</span><h2>ภาพรวมการดูแล</h2></div><span className="caregiver-count">{linkedElderly.length} คน</span></div>
          {loading ? <div className="aha-family-empty">กำลังโหลดข้อมูล…</div> : linkedElderly.length === 0 ? <div className="aha-family-empty">ยังไม่มีผู้สูงอายุที่เชื่อมต่อ</div> : <>
            <div className="elderly-selector">{linkedElderly.map((person) => <button key={person.user_id} className={String(selectedElderly) === String(person.user_id) ? 'active' : ''} onClick={() => setSelectedElderly(person.user_id)}><span className="elderly-avatar">{(person.name || '?').slice(0,1)}</span><span><strong>{person.name || 'ผู้สูงอายุ'}</strong><small>{person.phone}</small></span></button>)}</div>
            {selectedPerson && <div className="elderly-overview"><div className="elderly-overview-title"><div><h3>{selectedPerson.name || 'ผู้สูงอายุ'}</h3><p>สถานะวันนี้ · ติดตามการทานยา</p></div><span className="care-status">กำลังดูแล</span></div><div className="caregiver-stats"><div><strong>{stats.total}</strong><span>รายการยาวันนี้</span></div><div><strong>{stats.taken}</strong><span>ทานแล้ว</span></div><div className={stats.overdue ? 'warning' : ''}><strong>{stats.overdue}</strong><span>ยังไม่ได้ยืนยัน</span></div><div><strong>{stats.rate}%</strong><span>อัตราทานยาวันนี้</span></div></div></div>}
            <HistoryChart rows={selectedHistory} />
            <div className="medication-section"><div className="section-heading"><div><h3>ตารางยาของวันนี้</h3><p>ดูสถานะการทานยาแบบล่าสุด</p></div></div>{selectedToday.length === 0 ? <div className="aha-family-empty">วันนี้ยังไม่มีรายการยา</div> : selectedToday.map((item) => <article className="medication-row" key={item.reminder_id}><div className="med-time">{timeOf(item.reminder_time)}</div><div className="med-main"><strong>{item.medicine_name}</strong><span>{item.dosage || 'ไม่ได้ระบุขนาดยา'}</span></div><span className={`med-state ${item.taken ? 'taken' : 'waiting'}`}>{item.taken ? 'ทานแล้ว' : 'รอยืนยัน'}</span><div className="med-actions"><button onClick={() => startEdit(item)} disabled={busy}>แก้ไข</button><button className="danger" onClick={() => removeReminder(item)} disabled={busy}>ลบ</button></div></article>)}</div>
            <form className="med-editor" onSubmit={submitReminder}><div className="section-heading"><div><h3>{editingId ? 'แก้ไขตารางยา' : 'เพิ่มยาให้ผู้สูงอายุ'}</h3><p>ข้อมูลจะถูกบันทึกผ่าน Reminder Service ของ AHA</p></div>{editingId && <button type="button" className="cancel-edit" onClick={resetForm}>ยกเลิก</button>}</div><div className="editor-grid"><label>ชื่อยา<input value={form.medicine_name} onChange={(e) => setForm({ ...form, medicine_name:e.target.value })} placeholder="เช่น วิตามินซี" required /></label><label>ขนาดยา<input value={form.dosage} onChange={(e) => setForm({ ...form, dosage:e.target.value })} placeholder="เช่น 1 เม็ด" /></label><label>เวลา<input type="time" value={form.reminder_time} onChange={(e) => setForm({ ...form, reminder_time:e.target.value })} required /></label><label>ความถี่<select value={form.frequency} onChange={(e) => setForm({ ...form, frequency:e.target.value })}><option value="daily">ทุกวัน</option><option value="weekly">รายสัปดาห์</option></select></label></div><button className="save-med" disabled={busy}>{busy ? 'กำลังบันทึก…' : editingId ? 'บันทึกการแก้ไข + แจ้งผู้สูงอายุ' : 'เพิ่มยา + แจ้งผู้สูงอายุ'}</button></form>
          </>}
        </section>}

        <section className="aha-family-connect-card"><div className="aha-family-card-icon"><AhaIcon name="users" size={32} /></div><div className="aha-family-card-copy"><h2>{isCaregiver ? 'เพิ่มผู้สูงอายุที่คุณดูแล' : 'เพิ่มผู้ดูแลของคุณ'}</h2><p>กรอกเบอร์โทรศัพท์ที่อีกฝ่ายใช้สมัคร AHA แล้วส่งคำขอเชื่อมต่อ</p><form onSubmit={submitConnect} className="aha-family-connect-form"><input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" type="tel" placeholder="0XXXXXXXXX" aria-label="เบอร์โทรศัพท์" maxLength={10} /><button type="submit" disabled={busy}>ส่งคำขอ</button></form></div></section>

        {incoming.length > 0 && <section className="aha-family-section"><div className="aha-family-section-title"><h2>คำขอที่รอคุณยืนยัน</h2><span>{incoming.length}</span></div>{incoming.map((item) => <article className="aha-family-person-card pending" key={item.id}><div className="aha-family-avatar">{(item.name || '?').slice(0,1)}</div><div className="aha-family-person-main"><strong>{item.name || 'ผู้ใช้ AHA'}</strong><span>{item.phone} · {item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</span><small>ต้องการเชื่อมต่อกับคุณ</small></div><div className="aha-family-actions"><button className="primary" onClick={() => respond(item.id, 'accepted')} disabled={busy}>ยอมรับ</button><button className="secondary" onClick={() => respond(item.id, 'rejected')} disabled={busy}>ปฏิเสธ</button></div></article>)}</section>}
        {outgoing.length > 0 && <section className="aha-family-section"><div className="aha-family-section-title"><h2>คำขอที่ส่งไป</h2><span>{outgoing.length}</span></div>{outgoing.map((item) => <article className="aha-family-person-card" key={item.id}><div className="aha-family-avatar">{(item.name || '?').slice(0,1)}</div><div className="aha-family-person-main"><strong>{item.name || 'ผู้ใช้ AHA'}</strong><span>{item.phone} · {item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</span><small>รอการยืนยันจากอีกฝ่าย</small></div><span className="aha-family-status waiting">รอการยืนยัน</span></article>)}</section>}
        <section className="aha-family-section"><div className="aha-family-section-title"><h2>เชื่อมต่อแล้ว</h2><span>{accepted.length}</span></div>{accepted.length === 0 ? <div className="aha-family-empty">ยังไม่มีบัญชีที่เชื่อมต่อกัน</div> : accepted.map((item) => <article className="aha-family-person-card connected" key={item.id}><div className="aha-family-avatar">{(item.name || '?').slice(0,1)}</div><div className="aha-family-person-main"><strong>{item.name || 'ผู้ใช้ AHA'}</strong><span>{item.phone} · {item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</span><small>{isCaregiver && item.role === 'elderly' ? 'พร้อมติดตามยาและสถานะการทานยา' : 'เชื่อมต่อแล้ว'}</small></div><span className="aha-family-status connected">เชื่อมต่อแล้ว</span></article>)}</section>
      </main>
      <style jsx>{`
        .aha-family-page{min-height:100vh;background:#f6f8fc}.aha-family-shell{width:min(980px,calc(100% - 32px));margin:0 auto;padding:28px 0 120px;display:flex;flex-direction:column;gap:22px}.aha-family-header{display:flex;gap:16px;align-items:flex-start}.aha-family-back{width:48px;height:48px;border:1px solid #dfe7ef;border-radius:15px;background:#fff;color:#2f6bff;transform:rotate(180deg);cursor:pointer;flex:0 0 auto}.aha-family-eyebrow{font-size:11px;font-weight:900;letter-spacing:.12em;color:#2f6bff}.aha-family-header h1{margin:4px 0 5px;font-size:clamp(27px,4vw,38px);line-height:1.1;color:#172033}.aha-family-header p{margin:0;color:#69778b}.aha-family-alert{padding:13px 16px;border-radius:14px;font-weight:700}.aha-family-alert.error{background:#fff1f1;color:#b52e38}.aha-family-alert.success{background:#effbf6;color:#19784f}
        .caregiver-focus{background:#fff;border:1px solid #e1e7ef;border-radius:22px;padding:22px;box-shadow:0 10px 30px rgba(31,48,76,.06)}.caregiver-focus-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.caregiver-focus h2{margin:4px 0 0;color:#172033;font-size:25px}.caregiver-count{padding:8px 12px;border-radius:99px;background:#edf3ff;color:#2f6bff;font-weight:900}.elderly-selector{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-top:18px}.elderly-selector button{display:flex;align-items:center;gap:10px;min-height:68px;text-align:left;padding:11px;border:1px solid #e0e6ee;border-radius:15px;background:#fff;color:#172033;cursor:pointer}.elderly-selector button.active{border-color:#2f6bff;background:#f2f6ff}.elderly-avatar{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:#eaf0ff;color:#2f6bff;font-weight:900;font-size:18px;flex:0 0 auto}.elderly-selector span:last-child{display:flex;flex-direction:column;gap:2px}.elderly-selector small{color:#7b8798}.elderly-overview{margin-top:18px;padding:18px;border-radius:17px;background:#f8faff;border:1px solid #e4eaf2}.elderly-overview-title{display:flex;justify-content:space-between;gap:12px;align-items:center}.elderly-overview h3{margin:0;color:#172033;font-size:21px}.elderly-overview p{margin:4px 0 0;color:#758197}.care-status{padding:7px 11px;border-radius:99px;background:#eaf8f0;color:#287c4e;font-size:12px;font-weight:900}.caregiver-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.caregiver-stats div{background:#fff;border:1px solid #e1e7ef;border-radius:14px;padding:14px}.caregiver-stats strong{display:block;font-size:25px;color:#2f6bff}.caregiver-stats span{color:#758197;font-size:12px}.caregiver-stats .warning strong{color:#d58a1c}
        .family-chart-card{margin-top:18px;padding:19px;border:1px solid #e1e7ef;border-radius:18px;background:#fff}.chart-heading{margin-bottom:4px}.chart-legend{display:flex;gap:14px;color:#718096;font-size:12px;flex-wrap:wrap}.chart-legend span{display:flex;align-items:center;gap:5px}.chart-legend i{width:9px;height:9px;border-radius:50%;display:inline-block}.legend-taken{background:#2f6bff}.legend-total{background:#aab5c4}.chart-wrap{width:100%;overflow:hidden;margin-top:5px}.chart-wrap svg{display:block;width:100%;height:auto;min-height:180px}.chart-grid{stroke:#e9eef4;stroke-width:1}.chart-line{stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.chart-line-taken{stroke:#2f6bff}.chart-line-total{stroke:#aab5c4;stroke-dasharray:6 5}.chart-dot-taken{fill:#2f6bff;stroke:#fff;stroke-width:2}.chart-dot-total{fill:#aab5c4;stroke:#fff;stroke-width:2}.chart-label{font-size:11px;fill:#7b8798}.chart-empty{padding:30px 15px;text-align:center;color:#7b8798;background:#f8fafc;border-radius:14px}
        .medication-section,.med-editor{margin-top:18px;padding-top:18px;border-top:1px solid #e5ebf1}.section-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}.section-heading h3{margin:0;color:#172033;font-size:19px}.section-heading p{margin:4px 0 0;color:#7b8798;font-size:13px}.medication-row{display:grid;grid-template-columns:76px minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid #edf1f5}.med-time{font-size:18px;font-weight:900;color:#2f6179}.med-main{display:flex;flex-direction:column;gap:2px;min-width:0}.med-main strong{color:#203c50;font-size:17px}.med-main span{color:#82909b;font-size:13px}.med-state{padding:6px 10px;border-radius:99px;font-size:12px;font-weight:900;white-space:nowrap}.med-state.taken{background:#eaf8f0;color:#287c4e}.med-state.waiting{background:#fff4df;color:#9a6a25}.med-actions{display:flex;gap:6px}.med-actions button,.cancel-edit{border:1px solid #d8e2eb;background:#fff;color:#537184;border-radius:10px;padding:7px 10px;font-weight:800;cursor:pointer}.med-actions .danger{color:#b44a4a;background:#fff7f7}.editor-grid{display:grid;grid-template-columns:2fr 1.3fr 1fr 1fr;gap:10px}.editor-grid label{display:flex;flex-direction:column;gap:6px;color:#637989;font-size:13px;font-weight:800}.editor-grid input,.editor-grid select{height:46px;border:1px solid #dce3ec;border-radius:12px;padding:0 12px;font-size:15px;color:#234257;background:#fff;outline:none}.save-med{margin-top:12px;width:100%;height:50px;border:0;border-radius:13px;background:#2f6bff;color:#fff;font-size:15px;font-weight:900;cursor:pointer}.save-med:disabled{opacity:.6}
        .aha-family-connect-card{display:flex;gap:18px;align-items:center;background:#fff;border:1px solid #e1e7ef;border-radius:20px;padding:20px;box-shadow:0 8px 24px rgba(31,48,76,.05)}.aha-family-card-icon{width:58px;height:58px;border-radius:17px;display:grid;place-items:center;color:#2f6bff;background:#eaf0ff;flex:0 0 auto}.aha-family-card-copy{flex:1}.aha-family-card-copy h2{margin:0 0 5px;color:#172033;font-size:21px}.aha-family-card-copy p{margin:0 0 13px;color:#738496;font-size:14px}.aha-family-connect-form{display:flex;gap:8px}.aha-family-connect-form input{min-width:0;flex:1;height:50px;border:1px solid #d8e3ec;border-radius:13px;padding:0 14px;font-size:17px;outline:none}.aha-family-connect-form button{height:50px;padding:0 20px;border:0;border-radius:13px;background:#2f6bff;color:#fff;font-weight:900;cursor:pointer}.aha-family-section{margin:0}.aha-family-section-title{display:flex;align-items:center;gap:9px;margin:0 2px 10px}.aha-family-section-title h2{margin:0;color:#213a50;font-size:20px}.aha-family-section-title span{min-width:26px;height:26px;padding:0 7px;border-radius:99px;display:grid;place-items:center;background:#edf3ff;color:#527489;font-weight:900}.aha-family-person-card{display:flex;align-items:center;gap:13px;background:#fff;border:1px solid #dfebf1;border-radius:17px;padding:14px 16px;margin-bottom:8px}.aha-family-avatar{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:#eaf0ff;color:#2f6bff;font-weight:900;font-size:20px;flex:0 0 auto}.aha-family-person-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}.aha-family-person-main strong{color:#213a50;font-size:17px}.aha-family-person-main span{color:#63778a;font-size:13px}.aha-family-person-main small{color:#8797a5;font-size:12px}.aha-family-actions{display:flex;gap:7px}.aha-family-actions button{min-height:42px;padding:0 14px;border-radius:11px;font-weight:800;cursor:pointer}.aha-family-actions .primary{border:0;background:#2f6bff;color:#fff}.aha-family-actions .secondary{border:1px solid #d9e5eb;background:#fff;color:#687b8b}.aha-family-status{white-space:nowrap;padding:7px 11px;border-radius:99px;font-size:12px;font-weight:900}.aha-family-status.waiting{background:#fff4df;color:#9a6a25}.aha-family-status.connected{background:#eaf8f0;color:#287c4e}.aha-family-empty{padding:20px;border:1px dashed #d5e3e9;border-radius:15px;color:#80909c;background:#fbfdfe;text-align:center}
        @media(max-width:760px){.aha-family-shell{width:calc(100% - 20px);padding-top:18px;gap:18px}.aha-family-header p{font-size:14px}.caregiver-focus,.aha-family-connect-card{padding:17px;border-radius:18px}.caregiver-stats{grid-template-columns:1fr 1fr}.caregiver-stats div:last-child{grid-column:1/-1}.elderly-selector{grid-template-columns:1fr}.medication-row{grid-template-columns:62px 1fr;gap:9px}.med-state{grid-column:2;justify-self:start}.med-actions{grid-column:1/-1}.editor-grid{grid-template-columns:1fr 1fr}.aha-family-person-card{align-items:flex-start;flex-wrap:wrap}.aha-family-status{margin-left:61px}.aha-family-actions{width:100%;margin-left:61px}.aha-family-connect-card{align-items:flex-start}.aha-family-connect-form{flex-direction:column}.aha-family-connect-form button{width:100%}.chart-legend{display:none}}
        @media(max-width:480px){.aha-family-header{gap:11px}.aha-family-back{width:44px;height:44px}.caregiver-focus h2{font-size:22px}.elderly-overview-title{align-items:flex-start;flex-direction:column}.editor-grid{grid-template-columns:1fr}.medication-row{grid-template-columns:58px 1fr}.med-state{grid-column:2}.med-actions{grid-column:1/-1;margin-left:0}.aha-family-actions,.aha-family-status{margin-left:0}.aha-family-person-main strong{font-size:16px}.family-chart-card{padding:14px}.chart-wrap svg{min-height:155px}}
      `}</style>
    </div>
  );
}
