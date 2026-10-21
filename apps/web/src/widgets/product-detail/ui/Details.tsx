import Image from 'next/image';
import type { Product } from '@/entities/product';

export function Details({ product }: { product: Product }) {
  return (
    <section className="grid gap-12 px-4 pb-16 pt-7 sm:px-[58px] lg:grid-cols-[2fr_1fr]">
      <div>
        <h2 className="border-y border-line py-3.5 text-[15px] font-medium">Product Features</h2>
        <ul className="list-disc pl-5 pt-4 text-[14px] leading-8 sm:columns-2">
          {product.features.map((f) => <li key={f}>{f}</li>)}
        </ul>
        {(product.leather || product.construction) && (
          <dl className="mt-6 grid grid-cols-2 gap-px border border-line bg-line text-[14px] sm:grid-cols-4">
            {[
              ['Leather', product.leather],
              ['Construction', product.construction],
              ['Sole', product.sole],
              ['Color', product.color],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="bg-white p-3.5">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-mute">{k}</dt>
                  <dd className="mt-1 font-serif text-[16px] font-semibold">{v}</dd>
                </div>
              ))}
          </dl>
        )}
      </div>
      <div>
        <h2 className="border-y border-line py-3.5 text-[15px] font-medium">Shipping Info</h2>
        <ul className="list-disc pl-5 pt-4 text-[14px] leading-8">
          <li>Free ground shipping on every order</li>
          <li>Free returns within 30 days</li>
          <li>Ships within 1–2 business days</li>
        </ul>
      </div>
    </section>
  );
}

export function Editorial({ product }: { product: Product }) {
  const image = product.images.at(-1) ?? '/media/men-captain-arizona.jpg';
  return (
    <>
      <section className="relative mx-4 h-[540px] sm:mx-[18px]">
        <Image src={image} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-x-4 top-10 bg-white/95 px-6 py-12 text-center sm:left-[88px] sm:right-auto sm:top-[72px] sm:w-[526px] sm:px-10">
          <h2 className="heading mb-4 text-[27px] leading-snug">The {product.name}, built to last</h2>
          <p className="text-[14px] leading-8">
            {product.leather ? `${product.leather} upper` : 'Premium leather'}
            {product.construction ? `, ${product.construction.toLowerCase()} construction` : ''} and a shape
            refined over years of wear. Every detail is chosen so it looks better the longer you own it.
          </p>
        </div>
      </section>
      <section className="m-4 grid items-center gap-10 bg-soft px-6 py-14 sm:m-[18px] sm:px-24 lg:grid-cols-2">
        <h2 className="heading text-center text-[27px] lg:col-span-2">Highest Quality. Honest Prices.</h2>
        <div className="relative h-[300px]">
          {product.images[0] && <Image src={product.images[0]} alt="" fill sizes="50vw" className="object-contain" />}
        </div>
        <p className="text-[14px] leading-8">
          Our leather goods are handcrafted alongside products from brands that charge $300–600. We make zero
          compromises on materials or craftsmanship — we simply skip the retail mark-up.
        </p>
      </section>
    </>
  );
}
