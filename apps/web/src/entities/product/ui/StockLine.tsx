import { WAREHOUSE_NAMES } from '@/shared/config';
import type { Product } from '../model/types';

/** "In stock — 3 warehouses", "Low — Berlin only (4)" or "Out of stock". */
export function StockLine({ product, className }: { product: Pick<Product, 'stock' | 'warehouses'>; className?: string }) {
  const stocked = product.warehouses.filter((w) => w.quantity > 0);
  let state: 'ok' | 'low' | 'out' = 'ok';
  let text: string;
  if (product.stock === 0) {
    state = 'out';
    text = 'Out of stock';
  } else if (product.stock <= 5) {
    state = 'low';
    text = `Low — ${stocked.map((w) => WAREHOUSE_NAMES[w.warehouse] ?? w.warehouse).join(', ')} (${product.stock})`;
  } else {
    text = `In stock — ${stocked.length} ${stocked.length === 1 ? 'warehouse' : 'warehouses'}`;
  }
  return (
    <span className={className} data-testid="stock-line">
      <span className={state === 'ok' ? 'dot' : state === 'low' ? 'dot dot-low' : 'dot dot-out'} aria-hidden />
      {text}
    </span>
  );
}
