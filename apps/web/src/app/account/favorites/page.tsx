import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { requireUser } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { formatMoney } from '@/shared/lib/money';

export const metadata: Metadata = { title: 'Favorites', robots: { index: false } };

interface Favorite {
  productId: string;
  populated?: { product?: { title: string; slug: string; price: number; image?: string } };
}

async function Favorites() {
  await requireUser('/account/favorites');
  const { data } = await serverApi<{ data: Favorite[] }>('/favorites');
  const items = data.filter((f) => f.populated?.product);
  if (items.length === 0) {
    return <p className="text-mute">Nothing saved yet. Tap the heart on a product to keep it here.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
      {items.map(({ productId, populated }) => {
        const p = populated!.product!;
        return (
          <Link key={productId} href={`/products/${p.slug}`} className="block" data-testid="favorite-item">
            <div className="relative aspect-square bg-soft">
              {p.image && <Image src={p.image} alt={p.title} fill sizes="25vw" className="object-contain" />}
            </div>
            <div className="mt-3 flex justify-between text-[15px]"><span>{p.title}</span><span>{formatMoney(p.price)}</span></div>
          </Link>
        );
      })}
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <div className="container-page py-14">
      <Link href="/account" className="text-[13px] text-mute underline">← My account</Link>
      <h1 className="heading mb-8 mt-3 text-[32px]">Favorites</h1>
      <Suspense fallback={<div className="h-64" />}>
        <Favorites />
      </Suspense>
    </div>
  );
}
