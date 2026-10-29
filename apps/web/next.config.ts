import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
];

/**
 * Server-side rendering: every page is rendered per request (see `dynamic` in the root
 * layout), so prices and stock are always current. The CSP with its per-request nonce is
 * set in src/proxy.ts; the other security headers are static and live here.
 */
const nextConfig: NextConfig = {
  // small self-contained server for the Docker image
  output: 'standalone',
  poweredByHeader: false,
  // Nginx on the server compresses the responses
  compress: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
