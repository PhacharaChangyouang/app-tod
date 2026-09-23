import {
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
  clearSession,
} from './auth';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3001';
const REMINDER_API_BASE = process.env.NEXT_PUBLIC_REMINDER_API_URL || 'http://localhost:3002';
const NOTIFICATION_API_BASE = process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:3003';

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) { clearSession(); return false; }
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${AUTH_API_BASE}/auth/refresh`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'include', cache: 'no-store', body: JSON.stringify({ refreshToken }),
        });
        const text = await res.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
        if (!res.ok || !data.accessToken) { clearSession(); return false; }
        updateAccessToken(data.accessToken, data.refreshToken || refreshToken, data.user || null);
        return true;
      } catch (error) {
        console.error('Failed to refresh access token', error);
        clearSession(); return false;
      } finally { refreshPromise = null; }
    })();
  }
  return refreshPromise;
}

function getApiErrorMessage(data, status) {
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors.map((item) => item?.msg || item?.message).filter(Boolean).join(' • ');
  return `Request failed (${status})`;
}

async function request(baseUrl, path, { method = 'GET', body, auth = false, retry = true } = {}) {
  const token = auth ? getAccessToken() : null;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'include', cache: 'no-store', ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { success: false, message: text || 'Invalid server response' }; }
  if (res.status === 401 && auth && retry) {
    if (await refreshAccessToken()) return request(baseUrl, path, { method, body, auth: true, retry: false });
  }
  if (!res.ok) { const err = new Error(getApiErrorMessage(data, res.status)); err.status = res.status; err.data = data; throw err; }
  return data;
}

export const authApi = {
  requestOtp: (phone) => request(AUTH_API_BASE, '/auth/request-otp', { method: 'POST', body: { phone } }),
  verifyOtp: (phone, code) => request(AUTH_API_BASE, '/auth/verify-otp', { method: 'POST', body: { phone, code } }),
  loginOtp: (phone, code) => request(AUTH_API_BASE, '/auth/login-otp', { method: 'POST', body: { phone, code } }),
  register: (payload) => request(AUTH_API_BASE, '/auth/register', { method: 'POST', body: payload }),
  login: (phone, pin) => request(AUTH_API_BASE, '/auth/login', { method: 'POST', body: { phone, pin } }),
  registerWithPassword: (payload) => request(AUTH_API_BASE, '/auth/register-password', { method: 'POST', body: payload }),
  loginWithPassword: (identifier, password) => request(AUTH_API_BASE, '/auth/login-password', { method: 'POST', body: { identifier, password } }),
  requestPasswordReset: (email) => request(AUTH_API_BASE, '/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password, confirmPassword) => request(AUTH_API_BASE, '/auth/reset-password', { method: 'POST', body: { token, password, confirmPassword } }),
  refresh: (refreshToken) => request(AUTH_API_BASE, '/auth/refresh', { method: 'POST', body: { refreshToken } }),
  logout: (refreshToken) => request(AUTH_API_BASE, '/auth/logout', { method: 'POST', body: { refreshToken } }),
  me: () => request(AUTH_API_BASE, '/auth/me', { auth: true }),
  updateMe: (payload) => request(AUTH_API_BASE, '/auth/me', { method: 'PATCH', body: payload, auth: true }),
  changePin: (currentPin, newPin) => request(AUTH_API_BASE, '/auth/me/change-pin', { method: 'POST', body: { currentPin, newPin }, auth: true }),
  changePhone: (phone, code) => request(AUTH_API_BASE, '/auth/me/change-phone', { method: 'POST', body: { phone, code }, auth: true }),
};

export const reminderApi = {
  list: () => request(REMINDER_API_BASE, '/api/reminders', { auth: true }),
  today: () => request(REMINDER_API_BASE, '/api/reminders/today', { auth: true }),
  markTaken: (id) => request(REMINDER_API_BASE, `/api/reminders/${id}/taken`, { method: 'POST', auth: true }),
  snooze: (id, minutes = 10) => request(REMINDER_API_BASE, `/api/reminders/${id}/snooze`, { method: 'POST', body: { minutes }, auth: true }),
  create: (payload) => request(REMINDER_API_BASE, '/api/reminders', { method: 'POST', body: payload, auth: true }),
  get: (id) => request(REMINDER_API_BASE, `/api/reminders/${id}`, { auth: true }),
  update: (id, payload) => request(REMINDER_API_BASE, `/api/reminders/${id}`, { method: 'PUT', body: payload, auth: true }),
  updateStatus: (id, isActive) => request(REMINDER_API_BASE, `/api/reminders/${id}/status`, { method: 'PATCH', body: { is_active: isActive }, auth: true }),
  remove: (id) => request(REMINDER_API_BASE, `/api/reminders/${id}`, { method: 'DELETE', auth: true }),
};

export const caregiverApi = {
  summary: () => request(REMINDER_API_BASE, '/api/caregiver/summary', { auth: true }),
  createReminder: (payload) => request(REMINDER_API_BASE, '/api/caregiver/reminders', { method: 'POST', body: payload, auth: true }),
  updateReminder: (id, payload) => request(REMINDER_API_BASE, `/api/caregiver/reminders/${id}`, { method: 'PUT', body: payload, auth: true }),
  removeReminder: (id) => request(REMINDER_API_BASE, `/api/caregiver/reminders/${id}`, { method: 'DELETE', auth: true }),
};

export const notificationApi = {
  list: () => request(NOTIFICATION_API_BASE, '/api/notifications', { auth: true }),
  unread: () => request(NOTIFICATION_API_BASE, '/api/notifications/unread', { auth: true }),
  get: (id) => request(NOTIFICATION_API_BASE, `/api/notifications/${id}`, { auth: true }),
  create: (payload) => request(NOTIFICATION_API_BASE, '/api/notifications', { method: 'POST', body: payload, auth: true }),
  markRead: (id) => request(NOTIFICATION_API_BASE, `/api/notifications/${id}/read`, { method: 'PATCH', auth: true }),
  markAllRead: () => request(NOTIFICATION_API_BASE, '/api/notifications/read-all', { method: 'PATCH', auth: true }),
  remove: (id) => request(NOTIFICATION_API_BASE, `/api/notifications/${id}`, { method: 'DELETE', body: {}, auth: true }),
  pushStatus: () => request(NOTIFICATION_API_BASE, '/api/push/status', { auth: true }),
  pushSubscribe: (subscription) => request(NOTIFICATION_API_BASE, '/api/push/subscribe', { method: 'POST', body: subscription, auth: true }),
  pushUnsubscribe: (endpoint) => request(NOTIFICATION_API_BASE, '/api/push/subscribe', { method: 'DELETE', body: { endpoint }, auth: true }),
};

export const familyApi = {
  connections: () => request(AUTH_API_BASE, '/family/connections', { auth: true }),
  connect: (phone) => request(AUTH_API_BASE, '/family/connections', { method: 'POST', body: { phone }, auth: true }),
  updateConnection: (id, status) => request(AUTH_API_BASE, `/family/connections/${id}`, { method: 'PATCH', body: { status }, auth: true }),
  linkedElderly: () => request(AUTH_API_BASE, '/family/linked-elderly', { auth: true }),
};

export const emergencyApi = {
  notify: (payload) => request(NOTIFICATION_API_BASE, '/api/notifications/emergency', { method: 'POST', body: payload, auth: true }),
};

export async function authFetch(path, { method = 'GET', body, service = 'auth' } = {}) {
  const base = service === 'reminder' ? REMINDER_API_BASE : service === 'notification' ? NOTIFICATION_API_BASE : AUTH_API_BASE;
  return request(base, path, { method, body, auth: true });
}
