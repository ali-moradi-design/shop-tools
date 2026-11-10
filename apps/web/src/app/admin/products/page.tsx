import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { Suspense } from 'react';
import { fetchCategories } from '@/entities/category';
import type { Product } from '@/entities/product';
import { PageHeader, Pagination, ProductsTable, type ProductRow } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import type { ApiPaginated } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Products' };

type Search = { q?: string; page?: string; category?: string; stock?: string; sort?: string; order?: string };
type Props = { searchParams: Promise<Search> };

const SORTS = ['title', 'price', 'stock', 'createdAt'] as const;
const STOCK = ['low', 'out'] as const;
const LOW_STOCK = 5;
const pick = <T extends string>(list: readonly T[], v?: string) => (list.includes(v as T) ? (v as T) : undefined);

/** Only what the table shows goes to the browser, not whole products. */
const toRow = (p: Product): ProductRow => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  sku: p.variants[0]?.sku,
  image: p.images[0],
  category: p.categoryName,
  price: p.price,
  compareAtPrice: p.compareAtPrice,
  stock: p.stock,
  warehouses: p.warehouses,
  featured: p.featured,
});

async function Products({ searchParams }: Props) {
  const sp = await searchParams;
  // needed first: only a known category from the URL is passed on
  const categories = await fetchCategories();
  const filters = {
    q: sp.q?.trim().slice(0, 100) || undefined,
    category: pick(categories.map((c) => c.slug), sp.category),
    stock: pick(STOCK, sp.stock),
    sort: pick(SORTS, sp.sort) ?? 'title',
    order: sp.order === 'desc' ? 'desc' : 'asc',
  } as const;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const query: Record<string, string> = { limit: '30', page: String(page), sort: filters.sort, order: filters.order };
  if (filters.q) query.q = filters.q;
  if (filters.category) query.category = filters.category;
  if (filters.stock === 'low') query.maxStock = String(LOW_STOCK);
  if (filters.stock === 'out') query.inStock = 'false';
  const qs = new URLSearchParams(query);
  const list = early(serverApi<ApiPaginated<Product>>(`/products?${qs}`));
  await requireAdmin('/admin/products');
  const { data, meta } = await list;

  const select = 'border-2 border-ink bg-paper px-2 py-2 text-[14px]';
  return (
    <>
      <Form action="/admin/products" className="mb-5 flex flex-wrap items-end gap-3 text-[14px]" role="search">
        <input type="hidden" name="sort" value={filters.sort} />
        <input type="hidden" name="order" value={filters.order} />
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-mute">Search</span>
          <input name="q" defaultValue={filters.q} placeholder="Name, brand, model or SKU" maxLength={100} className="field" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-mute">Category</span>
          <select name="category" defaultValue={filters.category ?? ''} className={select}>
            <option value="">All</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-mute">Stock</span>
          <select name="stock" defaultValue={filters.stock ?? ''} className={select}>
            <option value="">Any</option>
            <option value="low">{LOW_STOCK} or fewer</option>
            <option value="out">Sold out</option>
          </select>
        </label>
        <button type="submit" className="btn">Filter</button>
        {(filters.q || filters.category || filters.stock) && (
          <Link href="/admin/products" className="pb-2.5 text-mute underline underline-offset-4">Clear</Link>
        )}
      </Form>
      {/* a new key on every page or filter change clears the selection */}
      <ProductsTable key={qs.toString()} rows={data.map(toRow)} />
      <Pagination
        path="/admin/products"
        params={{ q: filters.q, category: filters.category, stock: filters.stock, sort: filters.sort, order: filters.order }}
        page={meta.page}
        pages={meta.pages}
        total={meta.total}
        noun="products"
      />
    </>
  );
}

export default function AdminProductsPage(props: Props) {
  return (
    <div>
      <PageHeader title="Products">
        <a href="/api/v1/admin/export/products.csv" download className="text-[14px] text-mute underline underline-offset-4">Export CSV</a>
        <Link href="/admin/products/import" className="text-[14px] text-mute underline underline-offset-4">Import</Link>
        <Link href="/admin/products/trash" className="text-[14px] text-mute underline underline-offset-4">Trash</Link>
        <Link href="/admin/products/new" className="btn">+ New product</Link>
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Products {...props} />
      </Suspense>
    </div>
  );
}
