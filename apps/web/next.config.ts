import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy. Scripts need 'unsafe-inline' because the prerendered
 * (PPR) pages carry Next.js' inline bootstrap scripts and nonces would make every
 * page dynamic; everything else is locked to this origin and the product CDN.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.shopify.com",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
];

/**
 * Partial Prerendering via Cache Components (Next.js 16+): a static shell with
 * Suspense holes for per-visitor parts (cart, account, live stock).
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  // small self-contained server for the Docker image
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.shopify.com', pathname: '/s/files/**' }],
  },
};

export default nextConfig;
