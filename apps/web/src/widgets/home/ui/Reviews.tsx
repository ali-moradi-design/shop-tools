import { Stars } from '@/shared/ui';

const REVIEWS = [
  { title: 'Leather like butter', body: 'Broke in within a week and they look better every month. Better than pairs costing twice as much.', name: 'Daniel R.' },
  { title: 'Worth every penny', body: 'The stitching and the leather are flawless. Comfortable right out of the box.', name: 'Sara K.' },
  { title: 'My go-to boots', body: 'I wear them to work and on weekends. Resoled once already and they feel new.', name: 'Marcus T.' },
  { title: 'Quietly luxurious', body: 'The bag is beautiful — the leather smells and feels incredible. Great service too.', name: 'Lena M.' },
];

export function Reviews() {
  return (
    <section className="mt-24 bg-soft px-4 py-16 sm:px-[25px] sm:py-[72px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <h2 className="heading text-[24px] sm:text-[28px]">120,000+ 5-star reviews</h2>
        <span className="flex items-center gap-2 text-[13px]"><Stars value={4.8} /> 4.8/5 average</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REVIEWS.map((r) => (
          <figure key={r.name} className="min-h-[230px] border border-line bg-white p-6 text-[13px]">
            <Stars value={5} />
            <figcaption className="my-2.5 text-[15px] font-medium">{r.title}</figcaption>
            <blockquote>{r.body}</blockquote>
            <p className="mt-8 text-mute">{r.name}, Verified Customer</p>
          </figure>
        ))}
      </div>
    </section>
  );
}
