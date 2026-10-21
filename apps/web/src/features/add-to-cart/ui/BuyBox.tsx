'use client';

import { useMemo, useState } from 'react';
import type { ProductVariant } from '@/entities/product/model/types';
import { useCart } from '@/features/cart';
import { WAREHOUSE_NAMES } from '@/shared/config';
import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/money';

const DISPATCH: Record<string, string> = { BER: 'Same-day dispatch', HAM: 'Next-day', MUC: 'Next-day' };

/** Variant (kit) picker, stock per warehouse for the picked variant, and the add-to-cart button. */
export function BuyBox({
  productId,
  price,
  variants,
  warehouses,
}: {
  productId: string;
  price: number;
  variants: ProductVariant[];
  /** Every warehouse, in dispatch order (so a warehouse with no stock row still shows up as 0). */
  warehouses: { code: string; name: string }[];
}) {
  const { add, busy } = useCart();
  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];
  const [sku, setSku] = useState(firstInStock?.sku);
  const [addError, setAddError] = useState<string | null>(null);
  const selected = variants.find((v) => v.sku === sku) ?? variants[0];
  const soldOut = variants.every((v) => v.stock === 0);
  const unit = selected?.price ?? price;

  const rows = useMemo(
    () =>
      warehouses.map((w) => ({
        ...w,
        quantity: selected?.stockByWarehouse.find((s) => s.warehouse === w.code)?.quantity ?? 0,
      })),
    [warehouses, selected],
  );
  const shipsFrom = rows.find((r) => r.quantity > 0);

  const onAdd = async () => {
    if (!selected) return;
    setAddError(null);
    await add(productId, selected.sku).catch((err: unknown) =>
      setAddError(err instanceof Error ? err.message : 'Could not add to cart'),
    );
  };

  return (
    <div className="space-y-4">
      {variants.length > 1 && (
        <fieldset>
          <legend className="font-display text-[16px] font-bold uppercase tracking-[0.06em]">Option</legend>
          <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Option">
            {variants.map((v) => {
              const out = v.stock === 0;
              return (
                <button
                  key={v.sku}
                  type="button"
                  role="radio"
                  aria-checked={v.sku === sku}
                  onClick={() => setSku(v.sku)}
                  className={cn(
                    'border-2 border-ink px-3.5 py-2 text-left font-mono text-[12px]',
                    v.sku === sku ? 'bg-ink text-white' : 'bg-white hover:bg-soft',
                    out && v.sku !== sku && 'text-mute line-through',
                  )}
                >
                  {v.label}
                  {v.price !== undefined && v.price !== price && <span className="ml-2 opacity-70">{formatMoney(v.price)}</span>}
                  {out && <span className="ml-2 no-underline">· sold out</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="panel" data-testid="warehouse-stock">
        <div className="flex items-center border-b border-line-soft px-4 py-2.5">
          <h3 className="font-display text-[16px] font-bold uppercase tracking-[0.06em]">Stock by warehouse</h3>
          <span className="flex-1" />
          <span className="font-mono text-[11px] text-mute">UPDATED NOW</span>
        </div>
        {rows.map((r) => (
          <div key={r.code} className="flex items-center gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0" data-warehouse={r.code}>
            <span className={r.quantity === 0 ? 'dot dot-out' : r.quantity <= 5 ? 'dot dot-low' : 'dot'} aria-hidden />
            <b className="w-24">{WAREHOUSE_NAMES[r.code] ?? r.name}</b>
            <span className="text-[12px] text-steel">{r.quantity > 0 ? DISPATCH[r.code] : 'Not available here'}</span>
            <span className="flex-1" />
            <span className="font-mono font-semibold">{r.quantity > 0 ? `${r.quantity} units` : 'Out of stock'}</span>
          </div>
        ))}
      </div>

      {addError && <p role="alert" className="text-[13px] text-danger">{addError}</p>}
      <button type="button" onClick={onAdd} disabled={busy || soldOut || (selected?.stock ?? 0) === 0} className="btn w-full text-[16px]" data-testid="add-to-cart">
        {soldOut ? 'Sold out' : (selected?.stock ?? 0) === 0 ? 'This option is sold out' : `Add to cart — ${formatMoney(unit)}`}
      </button>
      <p className="font-mono text-[12px] text-steel">
        {shipsFrom ? `▪ Ships from ${shipsFrom.name}` : '▪ Back in stock soon'} &nbsp;▪ 30-day returns &nbsp;▪ 2-year warranty
      </p>
    </div>
  );
}

export function BuyBoxSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="panel h-40 animate-pulse" />
      <div className="h-11 animate-pulse bg-line" />
    </div>
  );
}
