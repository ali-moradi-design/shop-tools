import type { MetadataRoute } from 'next';

/** Crawlers that train AI models or archive pages, which ignore noindex. */
const BLOCKED = ['GPTBot', 'ChatGPT-User', 'CCBot', 'Google-Extended', 'anthropic-ai', 'ClaudeBot', 'PerplexityBot', 'Bytespider', 'Amazonbot', 'Applebot-Extended', 'ia_archiver'];

/**
 * The demo shop stays out of search results. Search engines may fetch pages only so they see
 * the noindex header and tag (a page blocked here could still be listed by its URL alone);
 * AI and archive crawlers are refused outright. No sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/account', '/admin', '/checkout', '/pay', '/api'] },
      { userAgent: BLOCKED, disallow: '/' },
    ],
  };
}
