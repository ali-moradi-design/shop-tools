import type { MetadataRoute } from 'next';
import { SITE } from '@/shared/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/account', '/admin', '/checkout', '/pay', '/search', '/api'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
