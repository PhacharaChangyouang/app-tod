const AUTH_API_BASE = '/api/bff/auth';
const REMINDER_API_BASE = '/api/bff/reminder';
const NOTIFICATION_API_BASE = '/api/bff/notification';

function getApiErrorMessage(data, status) {
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors.map((item) => item?.msg || item?.message).filter(Boolean).join(' • ');
  return `Request failed (${status})`;
}

async function request(baseUrl, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-AHA-Request': '1' } : {}) },
    credentials: 'include', cache: 'no-store', ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { success: false, message: text || 'Invalid server response' }; }
  if (!res.ok) { const err = new Error(getApiErrorMessage(data, res.status)); err.status = res.status; err.data = data; throw err; }
  return data;
}

export const authApi = {
  loginWithPin: (phone, pin) => request(AUTH_API_BASE, '/auth/login', { method: 'POST', body: { phone, pin } }),
  registerWithPassword: (payload) => request(AUTH_API_BASE, '/auth/register-password', { method: 'POST', body: payload }),
  loginWithPassword: (identifier, password) => request(AUTH_API_BASE, '/auth/login-password', { method: 'POST', body: { identifier, password } }),
  loginWithGoogle: (credential) => request(AUTH_API_BASE, '/auth/google', { method: 'POST', body: { credential } }),
  completeGoogleSignup: (payload) => request(AUTH_API_BASE, '/auth/google/complete', { method: 'POST', body: payload }),
  session: () => request(AUTH_API_BASE, '/auth/session'),
  requestPasswordReset: (email) => request(AUTH_API_BASE, '/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password, confirmPassword) => request(AUTH_API_BASE, '/auth/reset-password', { method: 'POST', body: { token, password, confirmPassword } }),
  logout: () => request(AUTH_API_BASE, '/auth/logout', { method: 'POST', body: {} }),
  me: () => request(AUTH_API_BASE, '/auth/me', { auth: true }),
  updateMe: (payload) => request(AUTH_API_BASE, '/auth/me', { method: 'PATCH', body: payload, auth: true }),
  changePin: (currentPin, newPin, confirmNewPin) => request(AUTH_API_BASE, '/auth/me/change-pin', { method: 'POST', body: { currentPin, newPin, confirmNewPin }, auth: true }),
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
  contactSupport: (payload) => request(NOTIFICATION_API_BASE, '/api/support/contact', { method: 'POST', body: payload, auth: true }),
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
