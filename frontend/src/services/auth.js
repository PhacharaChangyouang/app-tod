const SESSION_KEY = 'aha_session';

export function saveSession(session) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save session', err);
  }
}

export function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const json = localStorage.getItem(SESSION_KEY);
    return json ? JSON.parse(json) : null;
  } catch (err) {
    console.error('Failed to read session', err);
    return null;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export function getAccessToken() {
  const session = getSession();
  return session?.accessToken || null;
}

export function getUser() {
  return getSession()?.user || null;
}
