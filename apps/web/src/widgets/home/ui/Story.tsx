import Image from 'next/image';
import Link from 'next/link';

export function Why() {
  return (
    <section className="grid items-center gap-10 px-4 py-20 sm:px-10 lg:grid-cols-3 lg:py-24">
      <div>
        <h2 className="heading mb-4 text-[30px]">Why ‘Welt &amp; Grain’?</h2>
        <p className="mb-4 text-[14px]">
          The welt is the stitch that lets a boot be resoled for life; full grain is the strongest layer of the hide.
          Together they are our promise: everything we make is built to last for decades.
        </p>
        <p className="mb-4 text-[14px]">
          We work directly with our tannery and workshop, so you get heirloom quality without the luxury mark-up.
        </p>
        <Link href="/about" className="link-underline text-[13px]">Our Story</Link>
      </div>
      <div className="relative h-[420px]">
        <Image src="/media/factory.jpg" alt="A boot sole being pressed in the workshop" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
      </div>
      <div className="relative h-[420px] lg:mt-10">
        <Image src="/media/men-weekender-oldenglish.jpg" alt="A leather weekender bag" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
      </div>
    </section>
  );
}

export function PressBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-4 border-y border-line px-6 py-8 font-serif text-[30px] font-bold text-[#222] lg:justify-between lg:px-24">
      <span className="font-sans text-[13px] font-normal">As Featured In:</span>
      <span>GQ</span>
      <span className="font-normal tracking-[0.08em]">VOGUE</span>
      <span className="font-sans font-medium">Esquire</span>
      <span>WSJ</span>
      <span className="italic">Forbes</span>
    </div>
  );
}

export function CtaBand() {
  return (
    <section className="bg-ink px-6 py-16 text-center text-white">
      <h2 className="heading text-[32px]">Explore the Collection</h2>
      <p className="mb-6 mt-3">Thoughtfully crafted for wherever the day takes you.</p>
      <div className="flex justify-center gap-1.5">
        <Link href="/collections/mens-boots" className="btn btn-light">Shop Men</Link>
        <Link href="/collections/womens-boots" className="btn btn-light">Shop Women</Link>
      </div>
    </section>
  );
}
