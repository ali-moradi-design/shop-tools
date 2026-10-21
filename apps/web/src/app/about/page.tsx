import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Our Story',
  description: 'Why we build leather goods with full-grain hides and Goodyear welts — and sell them at honest prices.',
};

export default function AboutPage() {
  return (
    <>
      <section className="relative flex h-[360px] items-end text-white">
        <Image src="/media/factory.jpg" alt="A sole being pressed in the workshop" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <h1 className="heading relative mb-12 ml-6 text-[44px] sm:ml-[73px]">Our Story</h1>
      </section>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-16 text-[16px] leading-8">
        <p>
          Welt &amp; Grain started with a simple idea: the boots our grandparents wore were built to be repaired, not
          replaced. We make leather goods the same way — and sell them without the luxury mark-up.
        </p>
        <h2 id="leather" className="heading scroll-mt-40 pt-4 text-[28px]">Full-grain leather</h2>
        <p>
          Full grain is the top layer of the hide, with the natural grain left intact. It is the strongest and most
          breathable leather there is, and it develops a patina instead of wearing out.
        </p>
        <h2 id="craft" className="heading scroll-mt-40 pt-4 text-[28px]">The welt</h2>
        <p>
          A Goodyear welt is a strip of leather stitched between the upper and the sole. It keeps water out and lets a
          cobbler replace the sole again and again, so a good pair lasts for decades.
        </p>
        <p className="rounded border border-line bg-soft p-4 text-[14px] leading-7">
          This is a portfolio demo shop. Product names, photos and prices come from the public thursdayboots.com
          catalog and are used only as sample content; nothing here is for sale.
        </p>
        <Link href="/collections/mens-boots" className="btn">Shop the collection</Link>
      </div>
    </>
  );
}
