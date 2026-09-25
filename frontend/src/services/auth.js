let currentUser = null;

if (typeof window !== 'undefined') {
  // Remove secrets written by releases that predated the HttpOnly BFF session.
  for (const key of ['aha_session', 'accessToken', 'refreshToken', 'token']) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export function saveSession(session) {
  currentUser = session?.user || null;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aha-auth-change'));
}

export function clearSession() {
  const userId = currentUser?.id;
  currentUser = null;
  if (typeof window !== 'undefined') {
    if (userId) localStorage.removeItem(`aha_avatar_${userId}`);
    localStorage.removeItem('aha_seen_medicine_notifications');
    localStorage.removeItem('aha_push_enabled');
    window.dispatchEvent(new CustomEvent('aha-auth-change'));
  }
}

export function getUser() {
  return currentUser;
}
