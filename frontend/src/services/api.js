import { getAccessToken } from './auth';

const AUTH_API_BASE =
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  'http://localhost:3001';

const REMINDER_API_BASE =
  process.env.NEXT_PUBLIC_REMINDER_API_URL ||
  'http://localhost:3002';

const NOTIFICATION_API_BASE =
  process.env.NEXT_PUBLIC_NOTIFICATION_API_URL ||
  'http://localhost:3003';

async function request(baseUrl, path, {
  method = 'GET',
  body,
  auth = false,
} = {}) {
  const token = auth ? getAccessToken() : null;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
    credentials: 'include',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    const err = new Error('unauthorized');
    err.status = 401;
    throw err;
  }

  return res.json();
}

/* =========================
   AUTH SERVICE
========================= */

export const authApi = {
  requestOtp: (phone) =>
    request(AUTH_API_BASE, '/auth/request-otp', {
      method: 'POST',
      body: { phone },
    }),

  verifyOtp: (phone, code) =>
    request(AUTH_API_BASE, '/auth/verify-otp', {
      method: 'POST',
      body: { phone, code },
    }),

  register: (payload) =>
    request(AUTH_API_BASE, '/auth/register', {
      method: 'POST',
      body: payload,
    }),

  login: (phone, pin) =>
    request(AUTH_API_BASE, '/auth/login', {
      method: 'POST',
      body: { phone, pin },
    }),

  refresh: (refreshToken) =>
    request(AUTH_API_BASE, '/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    }),

  logout: (refreshToken) =>
    request(AUTH_API_BASE, '/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    }),
};

/* =========================
   REMINDER SERVICE
========================= */

export const reminderApi = {
  list: () =>
    request(REMINDER_API_BASE, '/reminders', {
      auth: true,
    }),

  create: (payload) =>
    request(REMINDER_API_BASE, '/reminders', {
      method: 'POST',
      body: payload,
      auth: true,
    }),

  get: (id) =>
    request(REMINDER_API_BASE, `/reminders/${id}`, {
      auth: true,
    }),

  update: (id, payload) =>
    request(REMINDER_API_BASE, `/reminders/${id}`, {
      method: 'PATCH',
      body: payload,
      auth: true,
    }),

  remove: (id) =>
    request(REMINDER_API_BASE, `/reminders/${id}`, {
      method: 'DELETE',
      auth: true,
    }),
};

/* =========================
   NOTIFICATION SERVICE
========================= */

export const notificationApi = {
  list: () =>
    request(NOTIFICATION_API_BASE, '/api/notifications', {
      auth: true,
    }),

  unread: () =>
    request(NOTIFICATION_API_BASE, '/api/notifications/unread', {
      auth: true,
    }),

  get: (id) =>
    request(NOTIFICATION_API_BASE, `/api/notifications/${id}`, {
      auth: true,
    }),

  create: (payload) =>
    request(NOTIFICATION_API_BASE, '/api/notifications', {
      method: 'POST',
      body: payload,
      auth: true,
    }),

  markRead: (id) =>
    request(
      NOTIFICATION_API_BASE,
      `/api/notifications/${id}/read`,
      {
        method: 'PATCH',
        auth: true,
      }
    ),

  markAllRead: () =>
    request(
      NOTIFICATION_API_BASE,
      '/api/notifications/read-all',
      {
        method: 'PATCH',
        auth: true,
      }
    ),

  remove: (id) =>
    request(
      NOTIFICATION_API_BASE,
      `/api/notifications/${id}`,
      {
        method: 'DELETE',
        auth: true,
      }
    ),
};

/* =========================
   GENERIC AUTH FETCH
========================= */

export async function authFetch(
  path,
  {
    method = 'GET',
    body,
    service = 'auth',
  } = {}
) {
  let baseUrl = AUTH_API_BASE;

  if (service === 'reminder') {
    baseUrl = REMINDER_API_BASE;
  }

  if (service === 'notification') {
    baseUrl = NOTIFICATION_API_BASE;
  }

  return request(baseUrl, path, {
    method,
    body,
    auth: true,
  });
}