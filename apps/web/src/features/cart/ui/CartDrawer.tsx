'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Product } from '@/entities/product/model/types';
import { clientApi } from '@/shared/api/client';
import { formatMoney } from '@/shared/lib/money';
import { Icon } from '@/shared/ui/Icon';
import { useCart } from '../model/CartProvider';

const UPSELL_CATEGORIES = ['batteries', 'accessories', 'bits'] as const;

/** Right side sheet like the reference: "Also needed" + "Your Cart". */
export function CartDrawer() {
  const { cart, open, setOpen, busy, error, update, remove } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const upsells = useUpsells(open);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, setOpen]);

  if (!open) return null;
  const items = cart?.items ?? [];

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close cart" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-[700px] bg-white"
        data-testid="cart-drawer"
      >
        <aside aria-label="Also needed" className="hidden w-[250px] shrink-0 overflow-y-auto bg-soft px-3 py-5 sm:block">
          <h2 className="mb-3.5 text-[15px]">Also needed</h2>
          {upsells.map((p) => (
            <Upsell key={p.id} product={p} />
          ))}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col px-6 py-5">
          <div className="flex items-center justify-between">
            <h2 id="cart-title" className="heading text-[30px]">Your Cart</h2>
            <button ref={closeRef} type="button" aria-label="Close cart" onClick={() => setOpen(false)}>
              <Icon name="close" width={26} height={26} />
            </button>
          </div>
          <p className="flex items-center gap-2.5 border-b border-line py-4 text-[14.5px]">
            <span className="grid h-4 w-4 place-items-center bg-ink text-white">
              <Icon name="check" width={10} height={10} strokeWidth={3} />
            </span>
            Free shipping over $150 · ships from the nearest warehouse
          </p>
          {error && <p role="alert" className="mt-3 text-[14px] text-danger">{error}</p>}
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="heading text-[22px]">Your cart is empty.</p>
              <Link href="/categories/drills" className="btn mt-6" onClick={() => setOpen(false)}>Shop drills</Link>
            </div>
          ) : (
            <>
              <ul className="-mr-2 flex-1 overflow-y-auto pr-2" aria-busy={busy}>
                {items.map((line) => (
                  <li key={line.productId + line.sku} className="grid grid-cols-[110px_1fr] gap-4 border-b border-line py-5 text-[14.5px] leading-[1.7]" data-testid="cart-line">
                    <div className="relative h-[110px] bg-soft">
                      {line.image && <Image src={line.image} alt="" fill sizes="110px" className="object-contain" />}
                    </div>
                    <div>
                      <Link href={`/products/${line.slug}`} onClick={() => setOpen(false)} className="hover:underline">{line.title}</Link>
                      <div>{formatMoney(line.price)}</div>
                      <div className="font-mono text-[12px] text-steel">{line.label}</div>
                      <span className="tag my-1">30-day returns</span>
                      <div className="flex items-center gap-3">
                        <span>Qty:</span>
                        <span className="inline-flex border border-line">
                          <button type="button" aria-label="Decrease quantity" disabled={busy || line.quantity <= 1} onClick={() => update(line.productId, line.sku, line.quantity - 1)} className="w-7 disabled:opacity-30">−</button>
                          <span className="w-7 text-center" aria-label="Quantity">{line.quantity}</span>
                          <button type="button" aria-label="Increase quantity" disabled={busy || line.quantity >= line.available} onClick={() => update(line.productId, line.sku, line.quantity + 1)} className="w-7 disabled:opacity-30">+</button>
                        </span>
                        <button type="button" className="text-mute underline" disabled={busy} onClick={() => remove(line.productId, line.sku)}>Remove</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="py-3.5 text-[14.5px]">
                <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
                <div className="flex justify-between"><span>Subtotal</span><span data-testid="cart-subtotal">{formatMoney(cart!.subtotal)}</span></div>
              </div>
              <Link href="/checkout" className="btn w-full text-[16px]" onClick={() => setOpen(false)}>
                <Icon name="lock" width={16} height={16} /> Checkout
              </Link>
              <p className="mt-3 text-center text-[13px] text-mute">Taxes and discount codes at checkout</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function useUpsells(open: boolean): Product[] {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (!open || products.length) return;
    Promise.all(
      UPSELL_CATEGORIES.map((c) =>
        clientApi<{ data: Product[] }>(`/products?category=${c}&inStock=true&limit=1`).then((r) => r.data[0]),
      ),
    )
      .then((list) => setProducts(list.filter(Boolean)))
      .catch(() => {});
  }, [open, products.length]);
  return products;
}

function Upsell({ product }: { product: Product }) {
  const { add, busy } = useCart();
  const inStock = product.variants.filter((v) => v.stock > 0);
  const [sku, setSku] = useState(inStock[0]?.sku ?? '');
  return (
    <div className="mb-2 border border-line bg-white px-2.5 pb-4 pt-4 text-center text-[14px]">
      <div className="relative mx-auto mb-2 h-24 w-24">
        {product.images[0] && <Image src={product.images[0]} alt="" fill sizes="96px" className="object-contain" />}
      </div>
      <div className="font-semibold leading-tight">{product.title}</div>
      <div className="font-mono text-[12px]">{formatMoney(product.price)}</div>
      {inStock.length > 1 && (
        <label className="mt-1.5 flex items-center justify-center gap-2">
          Option
          <select className="border border-ink px-1" value={sku} onChange={(e) => setSku(e.target.value)}>
            {inStock.map((v) => (
              <option key={v.sku} value={v.sku}>{v.label}</option>
            ))}
          </select>
        </label>
      )}
      <button type="button" disabled={busy || !sku} onClick={() => add(product.id, sku)} className="mt-1.5 block w-full font-mono text-[12px] uppercase underline underline-offset-[3px]">
        Add To Cart
      </button>
    </div>
  );
}
