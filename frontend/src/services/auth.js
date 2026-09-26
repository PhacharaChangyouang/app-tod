let currentUser = null;

if (typeof window !== 'undefined') {
  // Remove secrets written by releases that predated the HttpOnly BFF session.
  for (const key of ['aha_session', 'accessToken', 'refreshToken', 'token']) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export function saveSession(session) {
  const nextUser = session?.user || null;
  currentUser = nextUser && currentUser?.id === nextUser.id
    ? { ...currentUser, ...nextUser }
    : nextUser;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aha-auth-change'));
}

export function getAvatar(userId) {
  if (typeof window === 'undefined' || !userId) return '';
  return localStorage.getItem(`aha_avatar_${userId}`) || '';
}

export function saveAvatar(userId, value) {
  if (typeof window === 'undefined' || !userId) return;
  if (value) localStorage.setItem(`aha_avatar_${userId}`, value);
  else localStorage.removeItem(`aha_avatar_${userId}`);
  window.dispatchEvent(new CustomEvent('aha-avatar-change', { detail: { userId } }));
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
