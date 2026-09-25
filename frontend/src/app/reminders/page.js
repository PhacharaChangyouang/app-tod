'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AhaIcon from '../../components/AhaIcon';
import { getSession } from '../../services/auth';
import { reminderApi } from '../../services/api';

const days = [
  ['monday', 'จ'],
  ['tuesday', 'อ'],
  ['wednesday', 'พ'],
  ['thursday', 'พฤ'],
  ['friday', 'ศ'],
  ['saturday', 'ส'],
  ['sunday', 'อา'],
];

const blank = {
  medicine_name: '',
  dosage: '',
  reminder_time: '08:00',
  frequency: 'daily',
  days_of_week: days.map((item) => item[0]),
  start_date: '',
  end_date: '',
  is_active: true,
};

const listOf = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.reminders)) return response.reminders;
  return [];
};

export default function RemindersPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await reminderApi.list();
      setItems(listOf(response));
    } catch (err) {
      if (err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err.message || 'โหลดรายการไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getSession()?.accessToken) {
      router.replace('/login');
      return;
    }
    load();
  }, [router]);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) =>
        String(a.reminder_time || '').localeCompare(String(b.reminder_time || ''))
      ),
    [items]
  );

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleDay = (day) => {
    setForm((current) => ({
      ...current,
      days_of_week: current.days_of_week.includes(day)
        ? current.days_of_week.filter((item) => item !== day)
        : [...current.days_of_week, day],
    }));
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...blank });
    setOpen(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({
      ...blank,
      ...item,
      medicine_name: String(item.medicine_name ?? ''),
      dosage: String(item.dosage ?? ''),
      reminder_time: String(item.reminder_time || '08:00').slice(0, 5),
      days_of_week:
        Array.isArray(item.days_of_week) && item.days_of_week.length
          ? item.days_of_week
          : blank.days_of_week,
    });
    setOpen(true);
    setError('');
    setSuccess('');
  };

  const save = async (event) => {
    event.preventDefault();

    const medicineName = String(form.medicine_name ?? '').trim();
    const dosage = String(form.dosage ?? '').trim();

    if (!medicineName) {
      setError('กรุณาระบุชื่อยา');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        medicine_name: medicineName,
        dosage: dosage || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      if (editing) {
        await reminderApi.update(editing, payload);
        setSuccess('แก้ไขการเตือนแล้ว');
      } else {
        await reminderApi.create(payload);
        setSuccess('เพิ่มการเตือนแล้ว');
      }

      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item) => {
    try {
      await reminderApi.updateStatus(item.id, !item.is_active);
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, is_active: !row.is_active }
            : row
        )
      );
    } catch (err) {
      setError(err.message || 'เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const remove = async (item) => {
    if (!window.confirm('ลบการเตือน ' + item.medicine_name + ' หรือไม่?')) {
      return;
    }

    try {
      await reminderApi.remove(item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
      setSuccess('ลบรายการแล้ว');
    } catch (err) {
      setError(err.message || 'ลบไม่สำเร็จ');
    }
  };

  return (
    <div className="aha-page">
      <div className="aha-shell">
        <header className="topbar">
          <div className="brand">
            <button
              className="icon-btn"
              onClick={() => router.push('/home')}
              aria-label="กลับหน้าหลัก"
            >
              <AhaIcon name="arrow" size={21} />
            </button>

            <div className="brand-mark">
              <AhaIcon name="pill" />
            </div>
            <span>การเตือนยา</span>
          </div>

          <button className="btn btn-primary" onClick={openNew}>
            <AhaIcon name="plus" />
            เพิ่มการเตือน
          </button>
        </header>

        <div className="nav-row">
          <button className="nav-pill" onClick={() => router.push('/home')}>
            ภาพรวม
          </button>
          <button className="nav-pill active">ยาและเวลา</button>
          <button
            className="nav-pill"
            onClick={() => router.push('/notifications')}
          >
            แจ้งเตือน
          </button>
          <button
            className="nav-pill"
            onClick={() => router.push('/emergency')}
          >
            ฉุกเฉิน
          </button>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        {success && (
          <div className="success" style={{ marginBottom: 14 }}>
            {success}
          </div>
        )}

        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">MEDICATION TIMELINE</div>
            <h1>จัดการการเตือนแบบเข้าใจง่าย</h1>
            <p>ตั้งเวลา เปิด–ปิด แก้ไข และลบรายการยาได้จากหน้าเดียว</p>
          </div>
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <div className="card-head">
            <div>
              <div className="section-title">รายการทั้งหมด</div>
              <div className="muted small">
                {items.filter((item) => item.is_active !== false).length}{' '}
                รายการกำลังใช้งาน
              </div>
            </div>

            <button className="btn btn-soft" onClick={load}>
              <AhaIcon name="activity" />
              รีเฟรช
            </button>
          </div>

          {loading ? (
            <div className="empty">กำลังโหลดรายการ…</div>
          ) : sorted.length === 0 ? (
            <div className="empty">
              <AhaIcon name="pill" size={34} />
              <div style={{ marginTop: 10, fontWeight: 800 }}>
                ยังไม่มีการเตือน
              </div>
              <div>เพิ่มรายการยาแรกเพื่อเริ่มต้นใช้งาน AHA</div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 14 }}
                onClick={openNew}
              >
                <AhaIcon name="plus" />
                เพิ่มรายการ
              </button>
            </div>
          ) : (
            <div className="grid">
              {sorted.map((item) => (
                <article className="reminder-card" key={item.id}>
                  <div className="pill-icon">
                    <AhaIcon name="pill" />
                  </div>

                  <div>
                    <div className="reminder-time">
                      {String(item.reminder_time || '').slice(0, 5)} น.
                    </div>
                    <div style={{ fontWeight: 850, fontSize: 18 }}>
                      {item.medicine_name}
                    </div>
                    <div className="muted small">
                      {item.dosage || 'ไม่ได้ระบุขนาดยา'} ·{' '}
                      {item.frequency === 'weekly' ? 'รายสัปดาห์' : 'ทุกวัน'} ·{' '}
                      {item.is_active !== false ? 'กำลังใช้งาน' : 'ปิดอยู่'}
                    </div>
                  </div>

                  <div className="actions">
                    <button
                      className={
                        'switch ' + (item.is_active !== false ? 'on' : '')
                      }
                      onClick={() => toggle(item)}
                      aria-label="เปิดหรือปิดการเตือน"
                    >
                      <span />
                    </button>

                    <button
                      className="btn btn-soft"
                      onClick={() => openEdit(item)}
                    >
                      <AhaIcon name="edit" size={17} />
                      แก้ไข
                    </button>

                    <button
                      className="btn btn-danger"
                      onClick={() => remove(item)}
                      aria-label="ลบการเตือน"
                    >
                      <AhaIcon name="trash" size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <nav className="footer-nav">
          <div className="footer-nav-inner">
            <button
              className="footer-link"
              onClick={() => router.push('/home')}
            >
              <AhaIcon name="home" size={20} />
              <span>หน้าหลัก</span>
            </button>

            <button className="footer-link active">
              <AhaIcon name="pill" size={20} />
              <span>ยา</span>
            </button>

            <button
              className="footer-link"
              onClick={() => router.push('/notifications')}
            >
              <AhaIcon name="bell" size={20} />
              <span>แจ้งเตือน</span>
            </button>

            <button
              className="footer-link"
              onClick={() => router.push('/emergency')}
            >
              <AhaIcon name="warning" size={20} />
              <span>ฉุกเฉิน</span>
            </button>
          </div>
        </nav>

        {open && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="card-head">
                <div>
                  <div className="section-title">
                    {editing ? 'แก้ไขการเตือน' : 'เพิ่มการเตือน'}
                  </div>
                  <div className="muted small">
                    กรอกข้อมูลที่ผู้สูงอายุอ่านได้ง่าย
                  </div>
                </div>

                <button
                  className="icon-btn"
                  onClick={() => setOpen(false)}
                  aria-label="ปิด"
                >
                  ×
                </button>
              </div>

              <form onSubmit={save} className="grid">
                <div className="form-grid">
                  <div className="field">
                    <label>ชื่อยา *</label>
                    <input
                      value={form.medicine_name}
                      onChange={(event) =>
                        update('medicine_name', event.target.value)
                      }
                      placeholder="เช่น ยาความดัน"
                      autoFocus
                    />
                  </div>

                  <div className="field">
                    <label>ขนาดยา</label>
                    <input
                      value={form.dosage || ''}
                      onChange={(event) =>
                        update('dosage', event.target.value)
                      }
                      placeholder="เช่น 1 เม็ด"
                    />
                  </div>

                  <div className="field">
                    <label>เวลา *</label>
                    <input
                      type="time"
                      value={form.reminder_time}
                      onChange={(event) =>
                        update('reminder_time', event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="field">
                    <label>ความถี่</label>
                    <select
                      value={form.frequency}
                      onChange={(event) =>
                        update('frequency', event.target.value)
                      }
                    >
                      <option value="daily">ทุกวัน</option>
                      <option value="weekly">รายสัปดาห์</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>วันที่เริ่ม</label>
                    <input
                      type="date"
                      value={form.start_date || ''}
                      onChange={(event) =>
                        update('start_date', event.target.value)
                      }
                    />
                  </div>

                  <div className="field">
                    <label>วันที่สิ้นสุด</label>
                    <input
                      type="date"
                      value={form.end_date || ''}
                      onChange={(event) =>
                        update('end_date', event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="field">
                  <label>วันที่ต้องเตือน</label>
                  <div className="checkbox-grid">
                    {days.map(([day, label]) => (
                      <button
                        type="button"
                        className={
                          'check-chip ' +
                          (form.days_of_week.includes(day) ? 'active' : '')
                        }
                        key={day}
                        onClick={() => toggleDay(day)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="switch-row">
                  <div>
                    <b>เปิดใช้งานทันที</b>
                    <div className="muted small">
                      ระบบจะติดตามรายการนี้ตามเวลาที่ตั้ง
                    </div>
                  </div>

                  <button
                    type="button"
                    className={'switch ' + (form.is_active ? 'on' : '')}
                    onClick={() => update('is_active', !form.is_active)}
                  >
                    <span />
                  </button>
                </div>

                {error && <div className="error">{error}</div>}

                <div className="auth-actions">
                  <button
                    type="button"
                    className="btn btn-soft full"
                    onClick={() => setOpen(false)}
                  >
                    ยกเลิก
                  </button>

                  <button
                    className="btn btn-primary full"
                    disabled={saving}
                  >
                    {saving
                      ? 'กำลังบันทึก…'
                      : editing
                        ? 'บันทึกการแก้ไข'
                        : 'สร้างการเตือน'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
