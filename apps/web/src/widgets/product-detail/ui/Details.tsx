import type { Product } from '@/entities/product';

export function Details({ product }: { product: Product }) {
  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <div className="panel p-5">
        <h2 className="heading mb-2 text-[26px]">Features</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[14px]">
          {product.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
        {product.description && <p className="mt-4 border-t border-line-soft pt-4 text-[14px] text-steel">{product.description}</p>}
      </div>
      <div className="panel p-5">
        <h2 className="heading mb-2 text-[26px]">Shipping & returns</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[14px]">
          <li>Free shipping over $150; the order ships from the nearest warehouse that has every item</li>
          <li>Berlin dispatches the same day when ordered before 14:00</li>
          <li>30-day returns, 2-year warranty</li>
        </ul>
      </div>
    </section>
  );
}
