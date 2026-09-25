'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { CaregiverEnhancementPanel } from '../../components/AhaCaregiverEnhancements';
import { authApi, caregiverApi, familyApi } from '../../services/api';
import { saveSession } from '../../services/auth';
import './family-dashboard.css';

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isCaregiver = user?.role === 'caregiver';

  const load = useCallback(async () => {
    setError('');
    try {
      const [connectionResponse, elderlyResponse] = await Promise.all([familyApi.connections(), familyApi.linkedElderly()]);
      setConnections(listOf(connectionResponse));
      const elderly = listOf(elderlyResponse);
      setLinkedElderly(elderly);
      setSelectedElderly((current) => current || elderly[0]?.user_id || '');
      if (isCaregiver) {
        const summary = await caregiverApi.summary();
        setDashboard(summary?.data || { elderly: [], today: [], history: [] });
      }
    } catch (err) { setError(err.message || 'ยังโหลดข้อมูลครอบครัวไม่ได้'); }
    finally { setLoading(false); }
  }, [isCaregiver]);

  useEffect(() => {
    let active = true;
    authApi.me().then((result) => {
      if (!active || !result?.user) return;
      saveSession({ user: result.user });
      setUser(result.user);
    }).catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; };
  }, [router]);
  useEffect(() => { if (user) load(); }, [user, load]);

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

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setEditorOpen(false); };
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
    setEditorOpen(true);
    setForm({ medicine_name:item.medicine_name || '', dosage:item.dosage || '', reminder_time:timeOf(item.reminder_time), frequency:item.frequency || 'daily', days_of_week:item.days_of_week || EMPTY_FORM.days_of_week, start_date:String(item.start_date || '').slice(0,10), end_date:String(item.end_date || '').slice(0,10), is_active:item.is_active !== false });
    window.setTimeout(() => document.getElementById('med-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
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
        {isCaregiver && <CaregiverEnhancementPanel />}
        {(error || success) && <div className={`aha-family-alert ${error ? 'error' : 'success'}`}>{error || success}</div>}

        {isCaregiver && <section className="caregiver-focus">
          <div className="caregiver-focus-head"><div><span className="aha-family-eyebrow">CAREGIVER DASHBOARD</span><h2>ภาพรวมการดูแล</h2></div><span className="caregiver-count">{linkedElderly.length} คน</span></div>
          {loading ? <div className="aha-family-empty">กำลังโหลดข้อมูล…</div> : linkedElderly.length === 0 ? <div className="aha-family-empty">ยังไม่มีผู้สูงอายุที่เชื่อมต่อ</div> : <>
            <div className="elderly-selector">{linkedElderly.map((person) => <button key={person.user_id} className={String(selectedElderly) === String(person.user_id) ? 'active' : ''} onClick={() => setSelectedElderly(person.user_id)}><span className="elderly-avatar">{(person.name || '?').slice(0,1)}</span><span><strong>{person.name || 'ผู้สูงอายุ'}</strong><small>{person.phone}</small></span></button>)}</div>
            {selectedPerson && <div className="elderly-overview"><div className="elderly-overview-title"><div><h3>{selectedPerson.name || 'ผู้สูงอายุ'}</h3><p>สถานะวันนี้ · ติดตามการทานยา</p></div><span className="care-status">กำลังดูแล</span></div><div className="caregiver-stats"><div><strong>{stats.total}</strong><span>รายการยาวันนี้</span></div><div><strong>{stats.taken}</strong><span>ทานแล้ว</span></div><div className={stats.overdue ? 'warning' : ''}><strong>{stats.overdue}</strong><span>ยังไม่ได้ยืนยัน</span></div><div><strong>{stats.rate}%</strong><span>อัตราทานยาวันนี้</span></div></div></div>}
            <HistoryChart rows={selectedHistory} />
            <div className="medication-section"><div className="section-heading"><div><h3>ตารางยาของวันนี้</h3><p>ดูสถานะการทานยาแบบล่าสุด</p></div></div>{selectedToday.length === 0 ? <div className="aha-family-empty">วันนี้ยังไม่มีรายการยา</div> : selectedToday.map((item) => <article className="medication-row" key={item.reminder_id}><div className="med-time">{timeOf(item.reminder_time)}</div><div className="med-main"><strong>{item.medicine_name}</strong><span>{item.dosage || 'ไม่ได้ระบุขนาดยา'}</span></div><span className={`med-state ${item.taken ? 'taken' : 'waiting'}`}>{item.taken ? 'ทานแล้ว' : 'รอยืนยัน'}</span><div className="med-actions"><button onClick={() => startEdit(item)} disabled={busy}>แก้ไข</button><button className="danger" onClick={() => removeReminder(item)} disabled={busy}>ลบ</button></div></article>)}</div>
            <div className="medication-manage-bar"><div><h3>จัดการยา</h3><p>เพิ่มรายการใหม่หรือแก้ไขตารางยาของผู้สูงอายุ</p></div><button type="button" className="open-med-editor" onClick={() => { resetForm(); setEditorOpen(true); }}>+ เพิ่มยา</button></div>
            {editorOpen && <form id="med-editor" className="med-editor" onSubmit={submitReminder}><div className="section-heading"><div><h3>{editingId ? 'แก้ไขตารางยา' : 'เพิ่มยาให้ผู้สูงอายุ'}</h3><p>ข้อมูลจะถูกบันทึกผ่าน Reminder Service ของ AHA</p></div><button type="button" className="cancel-edit" onClick={resetForm}>ยกเลิก</button></div><div className="editor-grid"><label>ชื่อยา<input value={form.medicine_name} onChange={(e) => setForm({ ...form, medicine_name:e.target.value })} placeholder="เช่น วิตามินซี" required /></label><label>ขนาดยา<input value={form.dosage} onChange={(e) => setForm({ ...form, dosage:e.target.value })} placeholder="เช่น 1 เม็ด" /></label><label>เวลา<input type="time" value={form.reminder_time} onChange={(e) => setForm({ ...form, reminder_time:e.target.value })} required /></label><label>ความถี่<select value={form.frequency} onChange={(e) => setForm({ ...form, frequency:e.target.value })}><option value="daily">ทุกวัน</option><option value="weekly">รายสัปดาห์</option></select></label></div><button className="save-med" disabled={busy}>{busy ? 'กำลังบันทึก…' : editingId ? 'บันทึกการแก้ไข + แจ้งผู้สูงอายุ' : 'เพิ่มยา + แจ้งผู้สูงอายุ'}</button></form>}
          </>}
        </section>}

        <section className="aha-family-connect-card"><div className="aha-family-card-icon"><AhaIcon name="users" size={32} /></div><div className="aha-family-card-copy"><h2>{isCaregiver ? 'เพิ่มผู้สูงอายุที่คุณดูแล' : 'เพิ่มผู้ดูแลของคุณ'}</h2><p>กรอกเบอร์โทรศัพท์ที่อีกฝ่ายใช้สมัคร AHA แล้วส่งคำขอเชื่อมต่อ</p><form onSubmit={submitConnect} className="aha-family-connect-form"><input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" type="tel" placeholder="0XXXXXXXXX" aria-label="เบอร์โทรศัพท์" maxLength={10} /><button type="submit" disabled={busy}>ส่งคำขอ</button></form></div></section>

        {incoming.length > 0 && <section className="aha-family-section"><div className="aha-family-section-title"><h2>คำขอที่รอคุณยืนยัน</h2><span>{incoming.length}</span></div>{incoming.map((item) => <article className="aha-family-person-card pending" key={item.id}><div className="aha-family-avatar">{(item.name || '?').slice(0,1)}</div><div className="aha-family-person-main"><strong>{item.name || 'ผู้ใช้ AHA'}</strong><span>{item.phone} · {item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</span><small>ต้องการเชื่อมต่อกับคุณ</small></div><div className="aha-family-actions"><button className="primary" onClick={() => respond(item.id, 'accepted')} disabled={busy}>ยอมรับ</button><button className="secondary" onClick={() => respond(item.id, 'rejected')} disabled={busy}>ปฏิเสธ</button></div></article>)}</section>}
        {outgoing.length > 0 && <section className="aha-family-section"><div className="aha-family-section-title"><h2>คำขอที่ส่งไป</h2><span>{outgoing.length}</span></div>{outgoing.map((item) => <article className="aha-family-person-card" key={item.id}><div className="aha-family-avatar">{(item.name || '?').slice(0,1)}</div><div className="aha-family-person-main"><strong>{item.name || 'ผู้ใช้ AHA'}</strong><span>{item.phone} · {item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</span><small>รอการยืนยันจากอีกฝ่าย</small></div><span className="aha-family-status waiting">รอการยืนยัน</span></article>)}</section>}
        <section className="aha-family-section"><div className="aha-family-section-title"><h2>เชื่อมต่อแล้ว</h2><span>{accepted.length}</span></div>{accepted.length === 0 ? <div className="aha-family-empty">ยังไม่มีบัญชีที่เชื่อมต่อกัน</div> : accepted.map((item) => <article className="aha-family-person-card connected" key={item.id}><div className="aha-family-avatar">{(item.name || '?').slice(0,1)}</div><div className="aha-family-person-main"><strong>{item.name || 'ผู้ใช้ AHA'}</strong><span>{item.phone} · {item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</span><small>{isCaregiver && item.role === 'elderly' ? 'พร้อมติดตามยาและสถานะการทานยา' : 'เชื่อมต่อแล้ว'}</small></div><span className="aha-family-status connected">เชื่อมต่อแล้ว</span></article>)}</section>
      </main>

    </div>
  );
}
