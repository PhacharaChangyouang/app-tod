'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { familyApi } from '../../services/api';
import { getSession } from '../../services/auth';

function listOf(response) {
  return Array.isArray(response?.data) ? response.data : [];
}

export default function FamilyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [linkedElderly, setLinkedElderly] = useState([]);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setError('');
    try {
      const [connectionResponse, elderlyResponse] = await Promise.all([
        familyApi.connections(),
        familyApi.linkedElderly(),
      ]);
      setConnections(listOf(connectionResponse));
      setLinkedElderly(listOf(elderlyResponse));
    } catch (err) {
      setError(err.message || 'ยังโหลดข้อมูลครอบครัวไม่ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (!session?.accessToken) {
      router.replace('/login');
      return;
    }
    setUser(session.user || null);
    load();
  }, [router]);

  const incoming = useMemo(
    () => connections.filter((item) => item.status === 'pending' && item.direction === 'incoming'),
    [connections],
  );
  const outgoing = useMemo(
    () => connections.filter((item) => item.status === 'pending' && item.direction === 'outgoing'),
    [connections],
  );
  const accepted = useMemo(
    () => connections.filter((item) => item.status === 'accepted'),
    [connections],
  );

  const submitConnect = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const normalized = phone.replace(/\D/g, '');
    if (!/^0\d{9}$/.test(normalized)) {
      setError('กรุณากรอกเบอร์โทร 10 หลัก');
      return;
    }
    setBusy(true);
    try {
      await familyApi.connect(normalized);
      setPhone('');
      setSuccess('ส่งคำขอเชื่อมต่อแล้ว รออีกฝ่ายยืนยัน');
      await load();
    } catch (err) {
      setError(err.message || 'ส่งคำขอเชื่อมต่อไม่สำเร็จ');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const respond = async (id, status) => {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      await familyApi.updateConnection(id, status);
      setSuccess(status === 'accepted' ? 'เชื่อมต่อสำเร็จแล้ว' : 'ปฏิเสธคำขอแล้ว');
      await load();
    } catch (err) {
      setError(err.message || 'ดำเนินการกับคำขอไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const isCaregiver = user?.role === 'caregiver';

  return (
    <div className="aha-v3-page aha-family-page">
      <main className="aha-family-shell">
        <header className="aha-family-header">
          <button className="aha-family-back" onClick={() => router.push('/home')} aria-label="กลับหน้าหลัก">
            <AhaIcon name="arrow" size={22} />
          </button>
          <div>
            <span className="aha-family-eyebrow">AHA FAMILY</span>
            <h1>{isCaregiver ? 'ดูแลคนที่คุณรัก' : 'เชื่อมต่อกับผู้ดูแล'}</h1>
            <p>{isCaregiver ? 'เชื่อมต่อผู้สูงอายุเพื่อดูแลยาและสถานะการกินยา' : 'ให้ผู้ดูแลที่ไว้ใจได้ช่วยติดตามการดูแลของคุณ'}</p>
          </div>
        </header>

        {(error || success) && (
          <div className={`aha-family-alert ${error ? 'error' : 'success'}`}>{error || success}</div>
        )}

        <section className="aha-family-connect-card">
          <div className="aha-family-card-icon"><AhaIcon name="users" size={32} /></div>
          <div className="aha-family-card-copy">
            <h2>{isCaregiver ? 'เพิ่มผู้สูงอายุที่คุณดูแล' : 'เพิ่มผู้ดูแลของคุณ'}</h2>
            <p>กรอกเบอร์โทรศัพท์ที่อีกฝ่ายใช้สมัคร AHA แล้วส่งคำขอเชื่อมต่อ</p>
            <form onSubmit={submitConnect} className="aha-family-connect-form">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric"
                type="tel"
                placeholder="0XXXXXXXXX"
                aria-label="เบอร์โทรศัพท์"
                maxLength={10}
              />
              <button type="submit" disabled={busy}>{busy ? 'กำลังส่ง…' : 'ส่งคำขอ'}</button>
            </form>
          </div>
        </section>

        {incoming.length > 0 && (
          <section className="aha-family-section">
            <div className="aha-family-section-title"><h2>คำขอที่รอคุณยืนยัน</h2><span>{incoming.length}</span></div>
            {incoming.map((item) => (
              <article className="aha-family-person-card pending" key={item.id}>
                <div className="aha-family-avatar">{(item.name || '?').slice(0, 1)}</div>
                <div className="aha-family-person-main">
                  <strong>{item.name || 'ผู้ใช้ AHA'}</strong>
                  <span>{item.phone} · {item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</span>
                  <small>ต้องการเชื่อมต่อกับคุณ</small>
                </div>
                <div className="aha-family-actions">
                  <button className="primary" onClick={() => respond(item.id, 'accepted')} disabled={busy}>ยอมรับ</button>
                  <button className="secondary" onClick={() => respond(item.id, 'rejected')} disabled={busy}>ปฏิเสธ</button>
                </div>
              </article>
            ))}
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="aha-family-section">
            <div className="aha-family-section-title"><h2>คำขอที่ส่งไป</h2><span>{outgoing.length}</span></div>
            {outgoing.map((item) => (
              <article className="aha-family-person-card" key={item.id}>
                <div className="aha-family-avatar">{(item.name || '?').slice(0, 1)}</div>
                <div className="aha-family-person-main">
                  <strong>{item.name || 'ผู้ใช้ AHA'}</strong>
                  <span>{item.phone} · {item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</span>
                  <small>รอการยืนยันจากอีกฝ่าย</small>
                </div>
                <span className="aha-family-status waiting">รอการยืนยัน</span>
              </article>
            ))}
          </section>
        )}

        <section className="aha-family-section">
          <div className="aha-family-section-title"><h2>เชื่อมต่อแล้ว</h2><span>{accepted.length}</span></div>
          {loading ? (
            <div className="aha-family-empty">กำลังโหลดข้อมูล…</div>
          ) : accepted.length === 0 ? (
            <div className="aha-family-empty">ยังไม่มีบัญชีที่เชื่อมต่อกัน</div>
          ) : (
            accepted.map((item) => (
              <article className="aha-family-person-card connected" key={item.id}>
                <div className="aha-family-avatar">{(item.name || '?').slice(0, 1)}</div>
                <div className="aha-family-person-main">
                  <strong>{item.name || 'ผู้ใช้ AHA'}</strong>
                  <span>{item.phone} · {item.role === 'caregiver' ? 'ผู้ดูแล' : 'ผู้สูงอายุ'}</span>
                  <small>เชื่อมต่อและแชร์การแจ้งเตือนที่เกี่ยวข้องแล้ว</small>
                </div>
                <span className="aha-family-status connected">เชื่อมต่อแล้ว</span>
              </article>
            ))
          )}
        </section>

        {isCaregiver && (
          <section className="aha-family-dashboard-card">
            <div>
              <span className="aha-family-eyebrow">CAREGIVER</span>
              <h2>ผู้สูงอายุที่คุณดูแล</h2>
              <p>หลังเชื่อมต่อสำเร็จ ระบบจะใช้บัญชีที่เชื่อมต่อเพื่อแสดงตารางยาและสถานะการกินยาในแดชบอร์ดผู้ดูแล</p>
            </div>
            <div className="aha-family-linked-count"><strong>{linkedElderly.length}</strong><span>คน</span></div>
          </section>
        )}
      </main>

      <style jsx>{`
        .aha-family-page { min-height: 100vh; }
        .aha-family-shell { width: min(980px, calc(100% - 40px)); margin: 0 auto; padding: 38px 0 120px; }
        .aha-family-header { display:flex; gap:18px; align-items:flex-start; margin-bottom:24px; }
        .aha-family-back { width:54px; height:54px; border:0; border-radius:18px; background:#eef8fc; color:#198fc5; transform:rotate(180deg); cursor:pointer; flex:0 0 auto; }
        .aha-family-eyebrow { font-size:13px; font-weight:800; letter-spacing:.12em; color:#159fe0; }
        .aha-family-header h1 { margin:4px 0 6px; font-size:clamp(30px,4vw,44px); line-height:1.1; color:#16324b; }
        .aha-family-header p { margin:0; font-size:18px; color:#718294; }
        .aha-family-alert { padding:15px 18px; border-radius:16px; margin-bottom:18px; font-weight:700; }
        .aha-family-alert.error { background:#fff1f1; color:#b52e38; }
        .aha-family-alert.success { background:#effbf6; color:#19784f; }
        .aha-family-connect-card,.aha-family-dashboard-card { display:flex; gap:22px; align-items:center; background:#fff; border:1px solid #dcecf4; border-radius:26px; padding:24px; box-shadow:0 12px 35px rgba(37,103,136,.08); }
        .aha-family-card-icon { width:66px; height:66px; border-radius:20px; display:grid; place-items:center; color:#159fe0; background:#eaf8fd; flex:0 0 auto; }
        .aha-family-card-copy { flex:1; }
        .aha-family-card-copy h2,.aha-family-dashboard-card h2 { margin:0 0 6px; color:#17344c; font-size:25px; }
        .aha-family-card-copy p,.aha-family-dashboard-card p { margin:0 0 16px; color:#738496; font-size:16px; line-height:1.55; }
        .aha-family-connect-form { display:flex; gap:10px; }
        .aha-family-connect-form input { min-width:0; flex:1; height:58px; border:2px solid #d8e9f1; border-radius:16px; padding:0 18px; font-size:20px; outline:none; }
        .aha-family-connect-form input:focus { border-color:#159fe0; }
        .aha-family-connect-form button { height:58px; padding:0 24px; border:0; border-radius:16px; background:#159fe0; color:#fff; font-weight:800; font-size:17px; cursor:pointer; }
        .aha-family-connect-form button:disabled { opacity:.6; cursor:wait; }
        .aha-family-section { margin-top:28px; }
        .aha-family-section-title { display:flex; align-items:center; gap:10px; margin:0 4px 12px; }
        .aha-family-section-title h2 { margin:0; color:#213a50; font-size:23px; }
        .aha-family-section-title span { min-width:28px; height:28px; padding:0 8px; border-radius:99px; display:grid; place-items:center; background:#eaf8fd; color:#168ec3; font-weight:800; }
        .aha-family-person-card { display:flex; align-items:center; gap:16px; background:#fff; border:1px solid #dfebf1; border-radius:20px; padding:17px 20px; margin-bottom:10px; }
        .aha-family-person-card.pending { border-color:#bfe5f4; }
        .aha-family-avatar { width:52px; height:52px; border-radius:16px; display:grid; place-items:center; background:#eaf8fd; color:#178fc6; font-weight:900; font-size:22px; flex:0 0 auto; }
        .aha-family-person-main { min-width:0; flex:1; display:flex; flex-direction:column; gap:3px; }
        .aha-family-person-main strong { color:#213a50; font-size:19px; }
        .aha-family-person-main span { color:#63778a; font-size:15px; }
        .aha-family-person-main small { color:#8797a5; font-size:14px; }
        .aha-family-actions { display:flex; gap:8px; }
        .aha-family-actions button { min-height:46px; padding:0 17px; border-radius:13px; font-weight:800; cursor:pointer; }
        .aha-family-actions .primary { border:0; background:#159fe0; color:#fff; }
        .aha-family-actions .secondary { border:1px solid #d9e5eb; background:#fff; color:#687b8b; }
        .aha-family-status { white-space:nowrap; padding:9px 13px; border-radius:99px; font-size:14px; font-weight:800; }
        .aha-family-status.waiting { background:#fff7e8; color:#a36b16; }
        .aha-family-status.connected { background:#ecfaf4; color:#237a55; }
        .aha-family-empty { padding:30px; text-align:center; background:#fff; border:1px dashed #cbdde6; border-radius:20px; color:#7c8c9a; font-size:17px; }
        .aha-family-dashboard-card { margin-top:30px; justify-content:space-between; }
        .aha-family-linked-count { width:105px; height:105px; border-radius:28px; display:flex; flex-direction:column; justify-content:center; align-items:center; background:#eaf8fd; color:#159fe0; flex:0 0 auto; }
        .aha-family-linked-count strong { font-size:38px; line-height:1; }
        .aha-family-linked-count span { font-size:14px; font-weight:800; }
        @media (max-width:700px) {
          .aha-family-shell { width:min(100% - 24px, 640px); padding-top:24px; }
          .aha-family-connect-card,.aha-family-dashboard-card { align-items:flex-start; padding:18px; border-radius:21px; }
          .aha-family-connect-card { flex-direction:column; }
          .aha-family-connect-form { flex-direction:column; }
          .aha-family-connect-form button { width:100%; }
          .aha-family-person-card { align-items:flex-start; flex-wrap:wrap; padding:15px; }
          .aha-family-person-main { min-width:calc(100% - 70px); }
          .aha-family-actions { width:100%; margin-left:68px; }
          .aha-family-actions button { flex:1; }
          .aha-family-status { margin-left:68px; }
          .aha-family-dashboard-card { justify-content:space-between; }
        }
      `}</style>
    </div>
  );
}
