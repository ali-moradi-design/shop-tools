import type { MetadataRoute } from 'next';
import { fetchProducts } from '@/entities/product';
import { COLLECTIONS, SITE } from '@/shared/config';

// built on every request: the product list comes from the API, which may not run at build time
export const dynamic = 'force-dynamic';

/** Home, collections, content pages and every product. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await fetchProducts({ page, limit: 100, sort: 'title' });
    products.push(...data);
    if (page >= meta.pages) break;
  }
  return [
    { url: SITE.url, changeFrequency: 'daily', priority: 1 },
    ...COLLECTIONS.map((c) => ({ url: `${SITE.url}/collections/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...['about', 'help'].map((p) => ({ url: `${SITE.url}/${p}`, changeFrequency: 'monthly' as const, priority: 0.3 })),
    ...products.map((p) => ({
      url: `${SITE.url}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
      images: p.images.slice(0, 1),
    })),
  ];
}
