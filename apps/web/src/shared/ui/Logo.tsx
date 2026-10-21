import { cn } from '@/shared/lib/cn';

/** Wordmark: a yellow square with a bar (a spirit-level window), TOOLBENCH, SUPPLY CO. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <span aria-hidden className="relative block h-[26px] w-[26px] border-2 border-ink bg-accent">
        <span className="absolute inset-x-1 top-[9px] h-1 bg-ink" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[28px] font-bold tracking-[0.08em]">TOOLBENCH</span>
        <span className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-mute">SUPPLY CO. — TECH SPECS FIRST</span>
      </span>
    </span>
  );
}
