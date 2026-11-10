import { fetchProducts, ProductCard, type Product } from '@/entities/product';

/** Other tools from the same category that are in stock; part of the server render. */
export async function RelatedProducts({ product }: { product: Product }) {
  const { data } = await fetchProducts({ category: product.category, inStock: true, sort: 'rating', order: 'desc', limit: 9 });
  const picks = data.filter((p) => p.id !== product.id).slice(0, 8);
  if (picks.length === 0) return null;
  return (
    <section className="mt-12" aria-labelledby="related-products">
      <h2 id="related-products" className="heading mb-4 text-[28px]">More {product.categoryName.toLowerCase()}</h2>
      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {picks.map((p) => (
          <li key={p.id} className="w-[62vw] shrink-0 sm:w-[260px]">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
