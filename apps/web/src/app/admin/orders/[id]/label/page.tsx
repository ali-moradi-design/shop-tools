import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { orderNumber, type Order } from '@/entities/order';
import { PrintButton } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { ApiError } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { code39 } from '@/shared/lib/barcode';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Shipping label' };

type Props = { params: Promise<{ id: string }> };

/** The shop's return address; one place to change it. */
const FROM = ['Toolbench Supply Co.', 'Warehouse Berlin, Gate 3', '10115 Berlin', 'Germany'];

function Barcode({ value }: { value: string }) {
  const { bars, width } = code39(value);
  return (
    <svg viewBox={`0 0 ${width} 40`} preserveAspectRatio="none" className="h-20 w-full" role="img" aria-label={`Barcode ${value}`}>
      {bars.map(([x, w]) => <rect key={x} x={x} y={0} width={w} height={40} fill="#000" />)}
    </svg>
  );
}

async function Label({ params }: Props) {
  const { id } = await params;
  const reading = early(serverApi<{ data: Order }>(`/orders/${encodeURIComponent(id)}`));
  await requireAdmin(`/admin/orders/${id}/label`);
  let order: Order;
  try {
    order = (await reading).data;
  } catch (err) {
    if (err instanceof ApiError && [400, 404].includes(err.status)) notFound();
    throw err;
  }
  const a = order.shippingAddress;
  const number = orderNumber(order.id).replace('#', 'TB-');
  const units = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <>
      <div className="mb-6 flex items-center gap-4 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-[13px] text-mute underline">← Order</Link>
        <PrintButton />
        <span className="text-[13px] text-mute">4 × 6 in label. Choose “Actual size” in the print dialog.</span>
      </div>
      {/* 4 × 6 inches, the standard thermal label */}
      <article className="print-area mx-auto flex h-[6in] w-[4in] flex-col border-2 border-black bg-white p-4 font-sans text-[11pt] leading-tight text-black">
        <section className="border-b-2 border-black pb-2 text-[9pt]">
          <p className="font-bold uppercase">From</p>
          {FROM.map((l) => <p key={l}>{l}</p>)}
        </section>
        <section className="flex-1 border-b-2 border-black py-3">
          <p className="text-[9pt] font-bold uppercase">Ship to</p>
          <p className="mt-1 text-[15pt] font-bold uppercase">{a.fullName}</p>
          <p className="text-[13pt] uppercase">{a.line1}</p>
          {a.line2 && <p className="text-[13pt] uppercase">{a.line2}</p>}
          <p className="text-[13pt] uppercase">{a.city}{a.state ? `, ${a.state}` : ''} {a.postalCode}</p>
          <p className="text-[13pt] font-bold uppercase">{a.country}</p>
        </section>
        <section className="py-2 text-center">
          <Barcode value={number} />
          <p className="mt-1 font-mono text-[12pt] font-bold tracking-widest">{number}</p>
        </section>
        <section className="flex justify-between border-t-2 border-black pt-2 text-[9pt]">
          <span>{units} item{units === 1 ? '' : 's'}</span>
          {order.shipment && <span>{order.shipment.carrier} {order.shipment.trackingNumber}</span>}
          <span>{new Date(order.createdAt).toISOString().slice(0, 10)}</span>
        </section>
      </article>
    </>
  );
}

export default function LabelPage(props: Props) {
  return (
    <div>
      <Suspense fallback={<Skeleton className="mx-auto h-[6in] w-[4in]" />}>
        <Label {...props} />
      </Suspense>
    </div>
  );
}
