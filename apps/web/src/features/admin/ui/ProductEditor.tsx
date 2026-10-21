'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Product } from '@/entities/product/model/types';
import { clientApi } from '@/shared/api/client';

const toCents = (dollars: string) => Math.round(Number(dollars) * 100);

/** Price, featured flag and per-size stock of one product. */
export function ProductEditor({ product }: { product: Product }) {
  const router = useRouter();
  const [variants, setVariants] = useState(product.variants);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const compare = String(form.get('compareAtPrice') ?? '');
    setBusy(true);
    setMsg(null);
    try {
      await clientApi(`/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          price: toCents(String(form.get('price'))),
          ...(compare ? { compareAtPrice: toCents(compare) } : {}),
          featured: form.get('featured') === 'on',
          variants,
        }),
      });
      setMsg({ ok: true, text: 'Saved. The shop shows the change now.' });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setBusy(false);
    }
  };

  const field = 'mt-1 block w-full border border-line px-3 py-2 outline-none focus:border-ink';
  return (
    <form onSubmit={onSubmit} className="space-y-6 text-[14px]">
      <div className="grid gap-4 sm:grid-cols-3">
        <label>Price (USD)<input name="price" type="number" step="0.01" min="0" required defaultValue={(product.price / 100).toFixed(2)} className={field} /></label>
        <label>Compare-at price (optional)<input name="compareAtPrice" type="number" step="0.01" min="0" defaultValue={product.compareAtPrice ? (product.compareAtPrice / 100).toFixed(2) : ''} className={field} /></label>
        <label className="flex items-center gap-2 pt-6"><input name="featured" type="checkbox" defaultChecked={product.featured} /> Featured on the home page</label>
      </div>
      <fieldset>
        <legend className="eyebrow mb-2">Stock per size</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
          {variants.map((v, i) => (
            <label key={v.sku} className="border border-line p-2">
              <span className="block text-mute">{v.size}{v.width ? ` · ${v.width}` : ''}</span>
              <input
                type="number"
                min="0"
                value={v.stock}
                aria-label={`Stock for size ${v.size}${v.width ? ` ${v.width}` : ''}`}
                onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, stock: Math.max(0, Number(e.target.value)) } : x)))}
                className="mt-1 w-full border border-line px-2 py-1"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-mute">Total: {variants.reduce((n, v) => n + v.stock, 0)}</p>
      </fieldset>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? '' : 'text-danger'}>{msg.text}</p>}
      <button type="submit" disabled={busy} className="btn">Save changes</button>
    </form>
  );
}
