/**
 * TODO (รอบหน้า): เปิด next-pwa จริง
 *
 * const withPWA = require('next-pwa')({
 *   dest: 'public',
 *   disable: process.env.NODE_ENV === 'development',
 * });
 * module.exports = withPWA({ reactStrictMode: true });
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
