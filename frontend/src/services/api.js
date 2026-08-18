import { getAccessToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// ใช้กับ endpoint ที่ไม่ต้อง login (request-otp, verify-otp, register, login)
async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ใช้กับ endpoint ที่ต้อง login เท่านั้น (reminders, emergency, profile, ฯลฯ)
// เดิม: ไม่มีฟังก์ชันนี้เลย -> เรียก protected API แล้วโดน 401 ตลอด
// เพราะ auth-service middleware เช็ค Authorization header ทุกครั้ง
async function authFetch(path, { method = 'GET', body } = {}) {
  const accessToken = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  // access token หมดอายุ -> ปล่อยให้ผู้เรียกจัดการ (เช่น เด้งไป refresh หรือ login ใหม่)
  if (res.status === 401) {
    const err = new Error('unauthorized');
    err.status = 401;
    throw err;
  }

  return res.json();
}

export const authApi = {
  requestOtp: (phone) => post('/auth/request-otp', { phone }),
  verifyOtp: (phone, code) => post('/auth/verify-otp', { phone, code }),
  register: (payload) => post('/auth/register', payload),
  login: (phone, pin) => post('/auth/login', { phone, pin }),
  refresh: (refreshToken) => post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => post('/auth/logout', { refreshToken }),
};

// ตัวอย่างการใช้งานสำหรับ reminder-service ในอนาคต:
// export const reminderApi = {
//   list: () => authFetch('/reminders'),
//   create: (payload) => authFetch('/reminders', { method: 'POST', body: payload }),
// };

export { authFetch };