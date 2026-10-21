'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Product } from '@/entities/product/model/types';
import { clientApi } from '@/shared/api/client';

const toCents = (dollars: string) => Math.round(Number(dollars) * 100);

/** Price, featured flag and per-size stock of one product. */
export function ProductEditor({ product, warehouses }: { product: Product; warehouses: { code: string; name: string }[] }) {
  const router = useRouter();
  // units per variant (sku) and warehouse code
  const [stock, setStock] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(
      product.variants.map((v) => [
        v.sku,
        Object.fromEntries(warehouses.map((w) => [w.code, v.stockByWarehouse.find((s) => s.warehouse === w.code)?.quantity ?? 0])),
      ]),
    ),
  );
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
          variants: product.variants.map((v) => ({
            sku: v.sku,
            label: v.label,
            ...(v.price !== undefined ? { price: v.price } : {}),
            stock: stock[v.sku],
          })),
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

  const field = 'mt-1 block w-full border-2 border-ink bg-white px-3 py-2 outline-none focus:border-accent';
  return (
    <form onSubmit={onSubmit} className="space-y-6 text-[14px]">
      <div className="grid gap-4 sm:grid-cols-3">
        <label>Price (USD)<input name="price" type="number" step="0.01" min="0" required defaultValue={(product.price / 100).toFixed(2)} className={field} /></label>
        <label>Compare-at price (optional)<input name="compareAtPrice" type="number" step="0.01" min="0" defaultValue={product.compareAtPrice ? (product.compareAtPrice / 100).toFixed(2) : ''} className={field} /></label>
        <label className="flex items-center gap-2 pt-6"><input name="featured" type="checkbox" defaultChecked={product.featured} /> Featured on the home page</label>
      </div>
      <fieldset>
        <legend className="eyebrow mb-2">Stock per warehouse</legend>
        <div className="panel overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-ink text-accent">
              <tr>
                <th className="px-3 py-2 font-display text-[15px] font-bold uppercase tracking-[0.08em]">Option</th>
                {warehouses.map((w) => (
                  <th key={w.code} className="px-3 py-2 font-display text-[15px] font-bold uppercase tracking-[0.08em]">{w.name}</th>
                ))}
                <th className="px-3 py-2 font-display text-[15px] font-bold uppercase tracking-[0.08em]">Total</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => (
                <tr key={v.sku} className="border-t border-line-soft">
                  <th scope="row" className="px-3 py-2 font-normal">
                    {v.label}
                    <span className="block font-mono text-[11px] text-mute">{v.sku}</span>
                  </th>
                  {warehouses.map((w) => (
                    <td key={w.code} className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={stock[v.sku]?.[w.code] ?? 0}
                        aria-label={`Stock of ${v.label} in ${w.name}`}
                        onChange={(e) => setStock({ ...stock, [v.sku]: { ...stock[v.sku], [w.code]: Math.max(0, Math.floor(Number(e.target.value))) } })}
                        className="field !border w-24 py-1"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 font-mono font-semibold">{Object.values(stock[v.sku] ?? {}).reduce((n, q) => n + q, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-mute">Total: {Object.values(stock).reduce((n, row) => n + Object.values(row).reduce((m, q) => m + q, 0), 0)}</p>
      </fieldset>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? '' : 'text-danger'}>{msg.text}</p>}
      <button type="submit" disabled={busy} className="btn">Save changes</button>
    </form>
  );
}
