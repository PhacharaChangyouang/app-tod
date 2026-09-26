import { NextResponse } from 'next/server';

const isProduction = process.env.NODE_ENV === 'production';

const SERVICE_URLS = {
  auth: process.env.AUTH_API_URL || (isProduction ? '' : 'http://localhost:3001'),
  reminder: process.env.REMINDER_API_URL || (isProduction ? '' : 'http://localhost:3002'),
  notification: process.env.NOTIFICATION_API_URL || (isProduction ? '' : 'http://localhost:3003'),
};

const PUBLIC_AUTH_PATHS = new Set([
  'auth/login-password',
  'auth/login',
  'auth/register-password',
  'auth/forgot-password',
  'auth/reset-password',
  'auth/google',
  'auth/google/complete',
]);

const ROUTES = {
  auth: [
    ['POST', /^auth\/(login|login-password|register-password|forgot-password|reset-password|google|google\/complete|logout|me\/change-pin)$/],
    ['GET', /^auth\/me$/],
    ['PATCH', /^auth\/me$/],
    ['GET', /^family\/(connections|linked-elderly)$/],
    ['POST', /^family\/connections$/],
    ['PATCH', /^family\/connections\/[0-9a-f-]{36}$/i],
  ],
  reminder: [
    ['GET', /^api\/reminders(?:\/today|\/[0-9a-f-]{36})?$/i],
    ['POST', /^api\/reminders(?:\/[0-9a-f-]{36}\/(taken|snooze))?$/i],
    ['PUT', /^api\/reminders\/[0-9a-f-]{36}$/i],
    ['PATCH', /^api\/reminders\/[0-9a-f-]{36}\/status$/i],
    ['DELETE', /^api\/reminders\/[0-9a-f-]{36}$/i],
    ['GET', /^api\/caregiver\/summary$/],
    ['POST', /^api\/caregiver\/reminders$/],
    ['PUT', /^api\/caregiver\/reminders\/[0-9a-f-]{36}$/i],
    ['DELETE', /^api\/caregiver\/reminders\/[0-9a-f-]{36}$/i],
  ],
  notification: [
    ['GET', /^api\/(notifications(?:\/unread|\/[0-9a-f-]{36})?|push\/status)$/i],
    ['POST', /^api\/(notifications|notifications\/emergency|push\/subscribe|support\/contact)$/],
    ['PATCH', /^api\/notifications\/(read-all|[0-9a-f-]{36}\/read)$/i],
    ['DELETE', /^api\/(notifications\/[0-9a-f-]{36}|push\/subscribe)$/i],
  ],
};

const accessCookie = isProduction ? '__Host-aha-access' : 'aha-access';
const refreshCookie = isProduction ? '__Host-aha-refresh' : 'aha-refresh';
const refreshInFlight = new Map();

function cookieOptions(maxAge) {
  return { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/', priority: 'high', maxAge };
}

function isAllowed(service, method, path) {
  return Boolean(ROUTES[service]?.some(([allowedMethod, pattern]) => allowedMethod === method && pattern.test(path)));
}

function isSameOriginMutation(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  if (!origin) return false;
  let originUrl;
  try { originUrl = new URL(origin); } catch { return false; }
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto || new URL(request.url).protocol.replace(':', '');
  const configuredFrontend = process.env.FRONTEND_URL?.replace(/\/$/, '');
  return origin === configuredFrontend || (host && originUrl.host === host && originUrl.protocol === `${protocol}:`);
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { success: false, message: 'Invalid upstream response' }; }
}

function safeResponse(payload, status, session = null, clear = false) {
  const response = NextResponse.json(payload, { status });
  response.headers.set('Cache-Control', 'no-store');
  if (session?.accessToken) response.cookies.set(accessCookie, session.accessToken, cookieOptions(15 * 60));
  if (session?.refreshToken) response.cookies.set(refreshCookie, session.refreshToken, cookieOptions(30 * 24 * 60 * 60));
  if (clear) {
    response.cookies.set(accessCookie, '', cookieOptions(0));
    response.cookies.set(refreshCookie, '', cookieOptions(0));
  }
  return response;
}

async function callUpstream(url, method, body, token) {
  return fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
    redirect: 'manual',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function refreshSession(request) {
  const token = request.cookies.get(refreshCookie)?.value;
  if (!token) return null;
  const active = refreshInFlight.get(token);
  if (active) return active;
  const operation = (async () => {
    const response = await callUpstream(`${SERVICE_URLS.auth}/auth/refresh`, 'POST', { refreshToken: token });
    if (!response.ok) return null;
    const payload = await readJson(response);
    return payload.accessToken && payload.refreshToken ? payload : null;
  })();
  refreshInFlight.set(token, operation);
  try { return await operation; } finally { refreshInFlight.delete(token); }
}

async function handler(request, context) {
  const { service, path: pathParts } = await context.params;
  const path = Array.isArray(pathParts) ? pathParts.join('/') : '';
  if (!(service in SERVICE_URLS) || !isAllowed(service, request.method, path)) {
    return safeResponse({ success: false, message: 'Not found' }, 404);
  }
  if (!SERVICE_URLS[service]) {
    return safeResponse({ success: false, message: 'Service unavailable' }, 503);
  }
  if (!isSameOriginMutation(request) || (request.method !== 'GET' && request.headers.get('x-aha-request') !== '1')) {
    return safeResponse({ success: false, message: 'Cross-site request rejected' }, 403);
  }

  let body;
  if (!['GET', 'HEAD'].includes(request.method)) {
    const text = await request.text();
    if (text.length > 32768) return safeResponse({ success: false, message: 'Request body too large' }, 413);
    if (text) {
      try { body = JSON.parse(text); } catch { return safeResponse({ success: false, message: 'Invalid JSON' }, 400); }
    }
  }

  const isLogin = service === 'auth' && ['auth/login', 'auth/login-password', 'auth/register-password', 'auth/google', 'auth/google/complete'].includes(path);
  const isLogout = service === 'auth' && path === 'auth/logout';
  const isPublic = service === 'auth' && PUBLIC_AUTH_PATHS.has(path);
  const query = new URL(request.url).search;
  const upstreamUrl = `${SERVICE_URLS[service].replace(/\/$/, '')}/${path}${query}`;
  let accessToken = request.cookies.get(accessCookie)?.value || null;

  if (isLogout) {
    body = { refreshToken: request.cookies.get(refreshCookie)?.value || null };
  } else if (!isPublic && !accessToken) {
    const session = await refreshSession(request);
    if (!session) return safeResponse({ success: false, message: 'Unauthorized' }, 401, null, true);
    accessToken = session.accessToken;
    const upstream = await callUpstream(upstreamUrl, request.method, body, accessToken);
    const payload = await readJson(upstream);
    delete payload.accessToken;
    delete payload.refreshToken;
    return safeResponse(payload, upstream.status, session);
  }

  let upstream = await callUpstream(upstreamUrl, request.method, body, accessToken);
  let rotatedSession = null;
  if (upstream.status === 401 && !isPublic && !isLogout) {
    rotatedSession = await refreshSession(request);
    if (rotatedSession) upstream = await callUpstream(upstreamUrl, request.method, body, rotatedSession.accessToken);
  }

  const payload = await readJson(upstream);
  if (isLogin || payload.accessToken || payload.refreshToken) {
    rotatedSession = {
      accessToken: payload.accessToken || rotatedSession?.accessToken,
      refreshToken: payload.refreshToken || rotatedSession?.refreshToken,
    };
    delete payload.accessToken;
    delete payload.refreshToken;
  }
  return safeResponse(payload, upstream.status, rotatedSession, isLogout || upstream.status === 401);
}

async function guardedHandler(request, context) {
  try {
    return await handler(request, context);
  } catch (error) {
    console.error('BFF upstream request failed', { method: request.method, cause: error?.name || 'Error' });
    return safeResponse({ success: false, message: 'Upstream service unavailable' }, 502);
  }
}

export const dynamic = 'force-dynamic';
export const GET = guardedHandler;
export const POST = guardedHandler;
export const PUT = guardedHandler;
export const PATCH = guardedHandler;
export const DELETE = guardedHandler;
