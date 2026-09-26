/**
 * AHA uses the dedicated public/sw.js service worker for Web Push.
 * Do not add another service-worker generator without checking that it cannot
 * replace or interfere with medication notifications.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        ...(process.env.NODE_ENV === 'production'
          ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
          : []),
      ],
    }];
  },
};

module.exports = nextConfig;
