import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Product } from '@/entities/product';
import { AdminNav } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import type { ApiPaginated } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { formatMoney } from '@/shared/lib/money';

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

async function Products({ searchParams }: Props) {
  await requireAdmin('/admin/products');
  const { q = '', page = '1' } = await searchParams;
  const qs = new URLSearchParams({ limit: '30', page: String(Math.max(1, Number(page) || 1)), sort: 'title', order: 'asc', ...(q && { q }) });
  const { data, meta } = await serverApi<ApiPaginated<Product>>(`/products?${qs}`);
  return (
    <>
      <form className="mb-6 flex max-w-md border-b border-ink" role="search">
        <label htmlFor="admin-q" className="sr-only">Search products</label>
        <input id="admin-q" name="q" defaultValue={q} placeholder="Search by name, brand or SKU" className="min-w-0 flex-1 bg-transparent py-2 outline-none" />
        <button type="submit" className="eyebrow">Search</button>
      </form>
      <table className="w-full text-left text-[14px]">
        <thead className="border-b border-line text-[11px] uppercase tracking-[0.16em] text-mute">
          <tr><th className="py-3 font-medium" colSpan={2}>Product</th><th className="font-medium">Category</th><th className="font-medium">Price</th><th className="font-medium">Stock (BER · HAM · MUC)</th><th /></tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.id} className="border-b border-line">
              <td className="w-14 py-2"><div className="relative h-12 w-12 bg-soft">{p.images[0] && <Image src={p.images[0]} alt="" fill sizes="48px" className="object-contain" />}</div></td>
              <td>{p.title}</td>
              <td>{p.categoryName}</td>
              <td>{formatMoney(p.price)}</td>
              <td className={p.stock <= 5 ? 'text-danger' : ''}>{p.stock} <span className="font-mono text-[12px] text-mute">({p.warehouses.map((w) => w.quantity).join(' · ')})</span></td>
              <td className="text-right"><Link className="link-underline" href={`/admin/products/${p.id}`}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-6 flex gap-6 text-[14px]">
        {meta.page > 1 && <Link className="link-underline" href={`/admin/products?${new URLSearchParams({ q, page: String(meta.page - 1) })}`}>Previous</Link>}
        <span className="text-mute">Page {meta.page} of {meta.pages} · {meta.total} products</span>
        {meta.page < meta.pages && <Link className="link-underline" href={`/admin/products?${new URLSearchParams({ q, page: String(meta.page + 1) })}`}>Next</Link>}
      </p>
    </>
  );
}

export default function AdminProductsPage(props: Props) {
  return (
    <>
      <h1 className="heading mb-6 text-[32px]">Admin</h1>
      <AdminNav current="products" />
      <Suspense fallback={<div className="h-64" />}>
        <Products {...props} />
      </Suspense>
    </>
  );
}
