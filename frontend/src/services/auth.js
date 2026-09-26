let currentUser = null;

function safeStorage(storageName, action, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const storage = window[storageName];
    return action(storage);
  } catch (_) {
    return fallback;
  }
}

function emit(name, detail) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(name, detail === undefined ? undefined : { detail }));
  } catch (_) {
    // Storage/session updates must not crash older or restricted WebViews.
  }
}

if (typeof window !== 'undefined') {
  // Remove secrets written by releases that predated the HttpOnly BFF session.
  for (const key of ['aha_session', 'accessToken', 'refreshToken', 'token']) {
    safeStorage('localStorage', (storage) => storage.removeItem(key));
    safeStorage('sessionStorage', (storage) => storage.removeItem(key));
  }
}

export function saveSession(session) {
  const nextUser = session?.user || null;
  currentUser = nextUser && currentUser?.id === nextUser.id
    ? { ...currentUser, ...nextUser }
    : nextUser;
  emit('aha-auth-change');
}

export function getAvatar(userId) {
  if (typeof window === 'undefined' || !userId) return '';
  return safeStorage('localStorage', (storage) => storage.getItem(`aha_avatar_${userId}`), '') || '';
}

export function saveAvatar(userId, value) {
  if (typeof window === 'undefined' || !userId) return;
  safeStorage('localStorage', (storage) => value
    ? storage.setItem(`aha_avatar_${userId}`, value)
    : storage.removeItem(`aha_avatar_${userId}`));
  emit('aha-avatar-change', { userId });
}

export function clearSession() {
  const userId = currentUser?.id;
  currentUser = null;
  if (typeof window !== 'undefined') {
    if (userId) safeStorage('localStorage', (storage) => storage.removeItem(`aha_avatar_${userId}`));
    safeStorage('localStorage', (storage) => storage.removeItem('aha_seen_medicine_notifications'));
    safeStorage('localStorage', (storage) => storage.removeItem('aha_push_enabled'));
    emit('aha-auth-change');
  }
}

export function getUser() {
  return currentUser;
}
