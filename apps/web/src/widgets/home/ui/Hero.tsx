import Image from 'next/image';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative h-[560px] sm:h-[680px] lg:h-[790px]">
      <Image src="/media/dualgender.jpg" alt="Two people walking in leather boots" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
      <div className="absolute bottom-12 left-6 text-white sm:bottom-[74px] sm:left-[73px]">
        <p className="eyebrow">Handcrafted with integrity</p>
        <h1 className="heading mt-3 mb-7 text-[40px] leading-[1.12] sm:text-[64px]">
          Full-Grain Leather.
          <br />
          Honest Prices.
        </h1>
        <div className="flex flex-wrap gap-1.5">
          <Link href="/collections/mens-boots" className="btn btn-light">Shop Men</Link>
          <Link href="/collections/womens-boots" className="btn btn-light">Shop Women</Link>
        </div>
      </div>
    </section>
  );
}
