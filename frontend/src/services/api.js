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

  if (!refreshToken) {
    clearSession();
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${AUTH_API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({ refreshToken }),
        });

        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }

        if (!res.ok || !data.accessToken) {
          clearSession();
          return false;
        }

        updateAccessToken(
          data.accessToken,
          data.refreshToken || refreshToken,
          data.user || null
        );

        return true;
      } catch (error) {
        console.error('Failed to refresh access token', error);
        clearSession();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function request(
  baseUrl,
  path,
  { method = 'GET', body, auth = false, retry = true } = {}
) {
  const token = auth ? getAccessToken() : null;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    cache: 'no-store',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      success: false,
      message: text || 'Invalid server response',
    };
  }

  if (res.status === 401 && auth && retry) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return request(baseUrl, path, {
        method,
        body,
        auth: true,
        retry: false,
      });
    }
  }

  if (!res.ok) {
    const err = new Error(
      data.message || `Request failed (${res.status})`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/* --------------------------------------------------------------------------
 * AUTH
 * -------------------------------------------------------------------------- */

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

/* --------------------------------------------------------------------------
 * REMINDER
 * -------------------------------------------------------------------------- */

export const reminderApi = {
  list: () =>
    request(REMINDER_API_BASE, '/api/reminders', { auth: true }),

  today: () =>
    request(REMINDER_API_BASE, '/api/reminders/today', { auth: true }),

  markTaken: (id) =>
    request(REMINDER_API_BASE, `/api/reminders/${id}/taken`, {
      method: 'POST',
      auth: true,
    }),

  create: (payload) =>
    request(REMINDER_API_BASE, '/api/reminders', {
      method: 'POST',
      body: payload,
      auth: true,
    }),

  get: (id) =>
    request(REMINDER_API_BASE, `/api/reminders/${id}`, { auth: true }),

  update: (id, payload) =>
    request(REMINDER_API_BASE, `/api/reminders/${id}`, {
      method: 'PUT',
      body: payload,
      auth: true,
    }),

  updateStatus: (id, isActive) =>
    request(REMINDER_API_BASE, `/api/reminders/${id}/status`, {
      method: 'PATCH',
      body: { is_active: isActive },
      auth: true,
    }),

  remove: (id) =>
    request(REMINDER_API_BASE, `/api/reminders/${id}`, {
      method: 'DELETE',
      auth: true,
    }),
};

/* --------------------------------------------------------------------------
 * NOTIFICATION
 * -------------------------------------------------------------------------- */

export const notificationApi = {
  list: () =>
    request(NOTIFICATION_API_BASE, '/api/notifications', { auth: true }),

  unread: () =>
    request(NOTIFICATION_API_BASE, '/api/notifications/unread', { auth: true }),

  get: (id) =>
    request(NOTIFICATION_API_BASE, `/api/notifications/${id}`, { auth: true }),

  create: (payload) =>
    request(NOTIFICATION_API_BASE, '/api/notifications', {
      method: 'POST',
      body: payload,
      auth: true,
    }),

  markRead: (id) =>
    request(NOTIFICATION_API_BASE, `/api/notifications/${id}/read`, {
      method: 'PATCH',
      auth: true,
    }),

  markAllRead: () =>
    request(NOTIFICATION_API_BASE, '/api/notifications/read-all', {
      method: 'PATCH',
      auth: true,
    }),

  remove: (id) =>
    request(NOTIFICATION_API_BASE, `/api/notifications/${id}`, {
      method: 'DELETE',
      auth: true,
    }),
};

/* --------------------------------------------------------------------------
 * FAMILY
 * -------------------------------------------------------------------------- */

export const familyApi = {
  connections: () =>
    request(AUTH_API_BASE, '/family/connections', { auth: true }),

  connect: (phone) =>
    request(AUTH_API_BASE, '/family/connections', {
      method: 'POST',
      body: { phone },
      auth: true,
    }),

  updateConnection: (id, status) =>
    request(AUTH_API_BASE, `/family/connections/${id}`, {
      method: 'PATCH',
      body: { status },
      auth: true,
    }),
};

/* --------------------------------------------------------------------------
 * EMERGENCY
 * -------------------------------------------------------------------------- */

export const emergencyApi = {
  notify: (payload) =>
    request(NOTIFICATION_API_BASE, '/api/notifications/emergency', {
      method: 'POST',
      body: payload,
      auth: true,
    }),
};

/* --------------------------------------------------------------------------
 * GENERIC AUTH FETCH
 * -------------------------------------------------------------------------- */

export async function authFetch(
  path,
  { method = 'GET', body, service = 'auth' } = {}
) {
  const base =
    service === 'reminder'
      ? REMINDER_API_BASE
      : service === 'notification'
        ? NOTIFICATION_API_BASE
        : AUTH_API_BASE;

  return request(base, path, {
    method,
    body,
    auth: true,
  });
}
