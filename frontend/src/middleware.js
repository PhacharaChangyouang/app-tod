import { NextResponse } from 'next/server';

export function middleware(request) {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com/gsi/client${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' https://accounts.google.com/gsi/",
    "frame-src https://accounts.google.com/gsi/",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}

export const config = {
  matcher: [{ source: '/((?!api/bff|_next/static|_next/image|favicon.ico|sw.js|icons/).*)', missing: [{ type: 'header', key: 'next-router-prefetch' }] }],
};
