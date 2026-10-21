'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clientApi } from '@/shared/api/client';
import type { Cart } from './types';

interface CartContextValue {
  cart: Cart | null;
  open: boolean;
  busy: boolean;
  error: string | null;
  setOpen: (open: boolean) => void;
  add: (productId: string, sku: string, quantity?: number) => Promise<void>;
  update: (productId: string, sku: string, quantity: number) => Promise<void>;
  remove: (productId: string, sku: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Client cart state; the cart itself lives in the API (guest cookie or account). */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (request: () => Promise<{ data: Cart }>) => {
    setBusy(true);
    setError(null);
    try {
      setCart((await request()).data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const refresh = useCallback(() => run(() => clientApi<{ data: Cart }>('/cart')).catch(() => {}), [run]);

  // Load the visitor's cart once (the guest cookie or session decides which).
  useEffect(() => {
    let alive = true;
    clientApi<{ data: Cart }>('/cart')
      .then((res) => alive && setCart(res.data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      open,
      busy,
      error,
      setOpen,
      refresh,
      add: async (productId, sku, quantity = 1) => {
        await run(() =>
          clientApi('/cart/items', { method: 'POST', body: JSON.stringify({ productId, sku, quantity }) }),
        );
        setOpen(true);
      },
      update: (productId, sku, quantity) =>
        run(() =>
          clientApi(`/cart/items/${productId}/${encodeURIComponent(sku)}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
          }),
        ),
      remove: (productId, sku) =>
        run(() => clientApi(`/cart/items/${productId}/${encodeURIComponent(sku)}`, { method: 'DELETE' })),
    }),
    [cart, open, busy, error, refresh, run],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
