import Image from 'next/image';
import Link from 'next/link';

export function Hero({ productCount, categoryCount }: { productCount: number; categoryCount: number }) {
  return (
    <section className="grid border-b-2 border-ink bg-white lg:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col justify-center gap-5 px-4 py-12 sm:px-8 lg:py-16">
        <span className="tag tag-accent self-start">New — filter by real specs</span>
        <h1 className="heading text-[56px] leading-[0.92] sm:text-[84px]">
          The right spec.<br />In stock<br />today.
        </h1>
        <p className="max-w-xl text-[17px] text-steel">
          Filter by torque, voltage, power or size — with ranges and your units. Compare up to four tools side by side and
          see what each warehouse has on the shelf.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/categories/drills" className="btn">Shop drills →</Link>
          <Link href="/compare" className="btn btn-outline">Compare tools</Link>
        </div>
        <p className="flex gap-6 font-mono text-[12px] text-steel">
          <span>▪ {productCount} products</span>
          <span>▪ {categoryCount} categories</span>
          <span>▪ 3 warehouses</span>
        </p>
      </div>
      <div className="relative min-h-[320px] border-t-2 border-ink bg-white lg:border-l-2 lg:border-t-0">
        <Image src="/catalog/dhs780t2-gb.webp" alt="A mitre saw with two batteries" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain p-6" />
      </div>
    </section>
  );
}
