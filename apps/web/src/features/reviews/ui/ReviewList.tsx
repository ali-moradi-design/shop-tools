import { apiGetJson } from "@/shared/api";
import { Stars } from "@/shared/ui";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: { name?: string } | string;
}

/** Latest reviews, read fresh on each visit (a dynamic hole in the product page). */
export async function ReviewList({ slug }: { slug: string }) {
  // Read the product fresh (by slug, the stable key) so the id and rating are current.
  const { data: product } = await apiGetJson<{ data: { id: string; ratingAvg: number; ratingCount: number } }>(
    `/products/slug/${encodeURIComponent(slug)}`,
    { cache: 'no-store' },
  );
  const { data } = await apiGetJson<{ data: Review[] }>(`/reviews?product=${product.id}&limit=20`, { cache: 'no-store' });
  if (data.length === 0)
    return (
      <p className="text-[14px] text-mute">
        No reviews yet. Be the first to review this product.
      </p>
    );
  return (
    <>
      <p className="-mt-3 mb-6 flex items-center gap-2 text-[14px]">
        <Stars value={product.ratingAvg} /> {product.ratingAvg.toFixed(1)} out
        of 5 · {product.ratingCount} reviews
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((r) => (
          <li
            key={r.id}
            className="border border-line p-6 text-[14px]"
            data-testid="review"
          >
            <Stars value={r.rating} />
            {r.comment && <p className="mt-2">{r.comment}</p>}
            <p className="mt-4 text-mute">
              {typeof r.user === "object" && r.user.name
                ? r.user.name
                : "Customer"}{" "}
              ·{" "}
              {new Date(r.createdAt).toLocaleDateString("en-US", {
                dateStyle: "medium",
              })}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
