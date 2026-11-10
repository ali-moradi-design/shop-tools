'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProductVariant } from '@/entities/product/model/types';
import { useCartActions } from '@/features/cart';
import { WAREHOUSE_NAMES } from '@/shared/config';
import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/money';
import { NotifyMe } from './NotifyMe';

const DISPATCH: Record<string, string> = { BER: 'Same-day dispatch', HAM: 'Next-day', MUC: 'Next-day' };

/** Variant (kit) picker, stock per warehouse for the picked variant, and the add-to-cart button. */
export function BuyBox({
  productId,
  title,
  price,
  variants,
  warehouses,
}: {
  productId: string;
  /** Shown in the phone's sticky bar. */
  title: string;
  price: number;
  variants: ProductVariant[];
  /** Every warehouse, in dispatch order (so a warehouse with no stock row still shows up as 0). */
  warehouses: { code: string; name: string }[];
}) {
  const { add } = useCartActions();
  const [adding, setAdding] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const showBar = useScrolledPast(buttonRef);
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
    setAdding(true);
    await add(productId, selected.sku).catch((err: unknown) =>
      setAddError(err instanceof Error ? err.message : 'Could not add to cart'),
    );
    setAdding(false);
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

      {selected && selected.stock > 0 && selected.stock <= 3 && (
        <p className="font-mono text-[12px] font-semibold"><span className="dot dot-low" aria-hidden />Only {selected.stock} left{variants.length > 1 ? ' of this option' : ''}.</p>
      )}
      {addError && <p role="alert" className="text-[13px] text-danger">{addError}</p>}
      <button ref={buttonRef} type="button" onClick={onAdd} disabled={adding || soldOut || (selected?.stock ?? 0) === 0} className="btn w-full text-[16px]" data-testid="add-to-cart">
        {soldOut ? 'Sold out' : (selected?.stock ?? 0) === 0 ? 'This option is sold out' : `Add to cart — ${formatMoney(unit)}`}
      </button>
      <NotifyMe key={selected?.sku} productId={productId} soldOut={variants.filter((v) => v.stock === 0)} selected={selected?.sku} />
      <p className="font-mono text-[12px] text-steel">
        {shipsFrom ? `▪ Ships from ${shipsFrom.name}` : '▪ Back in stock soon'} &nbsp;▪ 30-day returns &nbsp;▪ 2-year warranty
      </p>
      {showBar && !soldOut && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t-2 border-ink bg-paper px-4 py-3 lg:hidden" data-testid="sticky-buy-bar">
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[14px] text-ink">{title}</span>
            <span className="font-mono text-[12px] text-steel">{variants.length > 1 && selected ? `${selected.label} · ` : ''}{formatMoney(unit)}</span>
          </span>
          <button type="button" onClick={onAdd} disabled={adding || (selected?.stock ?? 0) === 0} className="btn h-11 shrink-0 px-5 text-[13px]">
            Add to cart
          </button>
        </div>
      )}
    </div>
  );
}

/** True once the element has scrolled up out of view (for the phone's sticky add-to-cart bar). */
function useScrolledPast(ref: React.RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The root reaches far below the screen, so only crossing the top edge counts:
    // an element below the fold still "intersects", one scrolled above it does not.
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting), { rootMargin: '0px 0px 100000px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return past;
}

export function BuyBoxSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="panel h-40 animate-pulse" />
      <div className="h-11 animate-pulse bg-line" />
    </div>
  );
}
