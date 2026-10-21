import { cn } from '@/shared/lib/cn';

/** Wordmark: serif name, italic ampersand, a dashed welt stitch and LEATHER CO. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-col items-center leading-none text-ink', className)}>
      <span className="whitespace-nowrap font-serif text-[22px] font-bold tracking-[0.06em] sm:text-[26px]">
        WELT<em className="mx-[0.14em] font-medium italic tracking-normal">&amp;</em>GRAIN
      </span>
      <span aria-hidden className="mt-[6px] w-full border-t-[1.5px] border-dashed border-ink" />
      <span aria-hidden className="mt-[5px] flex items-center gap-2 text-[7.5px] font-medium tracking-[0.42em]">
        <i className="w-5 border-t border-ink" />
        LEATHER CO.
        <i className="w-5 border-t border-ink" />
      </span>
    </span>
  );
}
