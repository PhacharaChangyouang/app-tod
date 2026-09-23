/**
 * AHA uses a dedicated public/sw.js service worker for Web Push.
 * next-pwa remains installed for future offline caching, but is intentionally
 * not enabled here so it cannot replace or interfere with the medication
 * notification service worker.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
