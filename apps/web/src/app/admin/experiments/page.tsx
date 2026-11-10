import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { EXPERIMENTS } from '@/shared/lib/ab';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'A/B tests' };

interface VsControl {
  uplift: number | null;
  pValue: number | null;
}

interface Result {
  key: string;
  started: string;
  variants: {
    name: string;
    visitors: number;
    addToCart: number;
    purchases: number;
    addToCartRate: number;
    purchaseRate: number;
    addToCartVsControl: VsControl | null;
    purchaseVsControl: VsControl | null;
  }[];
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

/** Uplift against the control, and whether the difference is likely real (p < 0.05). */
function Verdict({ vs }: { vs: VsControl | null }) {
  if (!vs) return <span className="text-mute">baseline</span>;
  if (vs.uplift === null || vs.pValue === null) return <span className="text-mute">not enough data</span>;
  const sign = vs.uplift >= 0 ? '+' : '';
  const sure = vs.pValue < 0.05;
  return (
    <span className={sure ? (vs.uplift >= 0 ? 'font-semibold text-ok' : 'font-semibold text-danger') : 'text-mute'}>
      {sign}{(vs.uplift * 100).toFixed(1)}%
      <span className="block text-[11px] font-normal">{sure ? 'significant' : 'not significant yet'} · p={vs.pValue.toFixed(3)}</span>
    </span>
  );
}

async function Results() {
  const reading = early(serverApi<{ data: Result[] }>('/experiments/results'));
  await requireAdmin('/admin/experiments');
  const { data } = await reading;
  const keys = [...new Set([...Object.keys(EXPERIMENTS), ...data.map((r) => r.key)])];
  return (
    <div className="space-y-10">
      {keys.map((key) => {
        const r = data.find((x) => x.key === key);
        const live = key in EXPERIMENTS;
        return (
          <section key={key} data-testid="experiment">
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <h2 className="heading text-[22px]">{key}</h2>
              <span className={live ? 'tag tag-accent' : 'text-[12px] uppercase tracking-[0.16em] text-mute'}>{live ? 'Running' : 'Ended'}</span>
              {r && <span className="text-[13px] text-mute">since {day.format(new Date(r.started))}</span>}
            </div>
            {!r ? (
              <p className="text-[14px] text-mute">No visitors yet.</p>
            ) : (
              <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[640px] text-left text-[14px]">
                  <thead className="border-b border-line text-[11px] uppercase tracking-[0.16em] text-mute">
                    <tr>
                      <th scope="col" className="py-3 pr-4 font-medium">Variant</th>
                      <th scope="col" className="pr-4 font-medium">Visitors</th>
                      <th scope="col" className="pr-4 font-medium">Add to cart</th>
                      <th scope="col" className="pr-4 font-medium">vs control</th>
                      <th scope="col" className="pr-4 font-medium">Purchase</th>
                      <th scope="col" className="font-medium">vs control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.variants.map((v) => (
                      <tr key={v.name} className="border-b border-line align-top">
                        <th scope="row" className="py-3 pr-4 font-medium text-ink">{v.name}</th>
                        <td className="py-3 pr-4">{v.visitors}</td>
                        <td className="py-3 pr-4">{pct(v.addToCartRate)} <span className="text-mute">({v.addToCart})</span></td>
                        <td className="py-3 pr-4"><Verdict vs={v.addToCartVsControl} /></td>
                        <td className="py-3 pr-4">{pct(v.purchaseRate)} <span className="text-mute">({v.purchases})</span></td>
                        <td className="py-3"><Verdict vs={v.purchaseVsControl} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <div>
      <PageHeader title="A/B tests" />
      <p className="-mt-3 mb-8 max-w-2xl text-[14px] text-mute">
        Each visitor sees one variant and keeps it. Rates count unique visitors who saw the test. Wait for “significant” before you pick a winner; tests are set in <code>shared/lib/ab/experiments.ts</code>.
      </p>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Results />
      </Suspense>
    </div>
  );
}
