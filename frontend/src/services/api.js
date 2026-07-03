const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// TODO (รอบหน้า): implement เมื่อ auth-service มี endpoint จริง
export const authApi = {
  requestOtp: (phone) => post('/auth/request-otp', { phone }),
  verifyOtp: (phone, code) => post('/auth/verify-otp', { phone, code }),
  register: (payload) => post('/auth/register', payload),
  login: (phone, pin) => post('/auth/login', { phone, pin }),
};
