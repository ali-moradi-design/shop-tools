'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui';

/**
 * Product photos: one large photo at a time in a scroll-snap strip (swipe on
 * phones, arrows and thumbnails on desktop), dots on phones, and a full-screen
 * view with zoom. Only the first photo loads up front; the rest load as needed.
 */
export function Gallery({ images, title, badge }: { images: string[]; title: string; badge?: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;

  // the photo in view decides the index (works for swipe, keys and buttons alike)
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setIndex(Number((e.target as HTMLElement).dataset.index));
      },
      { root: el, threshold: 0.6 },
    );
    for (const child of el.children) io.observe(child);
    return () => io.disconnect();
  }, [count]);

  const go = useCallback((i: number) => {
    const el = strip.current;
    if (!el) return;
    const next = (i + count) % count;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setIndex(next);
  }, [count]);

  if (count === 0) return <div className="panel aspect-square" />;

  return (
    <div className={cn(count > 1 && 'lg:grid lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-3')}>
      {count > 1 && (
        <ul className="no-scrollbar hidden max-h-[658px] flex-col gap-2 overflow-y-auto lg:flex" aria-label="Photos">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1} of ${count}`}
                aria-current={i === index ? 'true' : undefined}
                className={cn('relative block aspect-square w-full border-2 bg-paper', i === index ? 'border-ink' : 'border-line hover:border-ink')}
              >
                <Image src={src} alt="" fill sizes="72px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="panel group relative">
        <div
          ref={strip}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          role="region"
          aria-roledescription="carousel"
          aria-label={`${title} photos`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
          }}
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              data-index={i}
              onClick={() => { setIndex(i); setOpen(true); }}
              aria-label={`Open photo ${i + 1} of ${count} full screen`}
              className="relative aspect-square max-h-[560px] w-full shrink-0 snap-center cursor-zoom-in bg-paper"
            >
              <Image
                src={src}
                alt={i === 0 ? title : `${title}, view ${i + 1}`}
                fill
                preload={i === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain p-4 mix-blend-multiply"
              />
            </button>
          ))}
        </div>
        {badge && <span className="tag tag-accent pointer-events-none absolute left-3.5 top-3.5">{badge}</span>}
        {count > 1 && (
          <>
            <ArrowButton side="left" onClick={() => go(index - 1)} label="Previous photo" />
            <ArrowButton side="right" onClick={() => go(index + 1)} label="Next photo" />
            <p className="absolute bottom-3 right-3 bg-paper px-2 py-0.5 font-mono text-[12px] text-ink lg:hidden" aria-live="polite">
              {index + 1} / {count}
            </p>
            <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden>
              {images.map((src, i) => (
                <span key={src} className={cn('h-1.5 transition-all', i === index ? 'w-5 bg-ink' : 'w-1.5 bg-line')} />
              ))}
            </div>
          </>
        )}
      </div>
      {open && (
        <Lightbox
          images={images}
          title={title}
          index={index}
          onIndex={go}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function ArrowButton({ side, onClick, label }: { side: 'left' | 'right'; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center border-2 border-ink bg-paper text-ink opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 lg:grid',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon name="chevron" width={18} height={18} style={{ transform: `rotate(${side === 'left' ? 90 : -90}deg)` }} />
    </button>
  );
}

/** Full-screen photos in a native modal dialog; click a photo to zoom where you clicked. */
function Lightbox({
  images,
  title,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  title: string;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  // No close() on cleanup: it fires "close", which would unmount the dialog
  // right after React's dev double-mount. Removing the element closes it anyway.
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  const step = (delta: number) => {
    setZoom(null);
    onIndex(index + delta);
  };
  const origin = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  return (
    <dialog
      ref={dialog}
      aria-label={`${title} photos`}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(1);
        if (e.key === 'ArrowLeft') step(-1);
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-paper p-0 backdrop:bg-ink/60"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-3 text-[14px]">
          <span className="text-mute" aria-live="polite">{index + 1} / {images.length}</span>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="grid h-10 w-10 place-items-center" autoFocus>
            <Icon name="close" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <button
            type="button"
            aria-label={zoom ? 'Zoom out' : 'Zoom in'}
            className={cn('relative block h-full w-full', zoom ? 'cursor-zoom-out' : 'cursor-zoom-in')}
            onClick={(e) => setZoom(zoom ? null : origin(e))}
            onMouseMove={(e) => zoom && setZoom(origin(e))}
          >
            <Image
              src={images[index]}
              alt={index === 0 ? title : `${title}, view ${index + 1}`}
              fill
              sizes="100vw"
              quality={90}
              className="object-contain transition-transform duration-200"
              style={zoom ? { transform: 'scale(2.2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          </button>
          {images.length > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center border-2 border-ink bg-paper">
                <Icon name="chevron" style={{ transform: 'rotate(90deg)' }} />
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center border-2 border-ink bg-paper">
                <Icon name="chevron" style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </>
          )}
        </div>
        {images.length > 1 && (
          <ul className="no-scrollbar flex justify-center gap-2 overflow-x-auto px-4 py-3">
            {images.map((src, i) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => step(i - index)}
                  aria-label={`Photo ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                  className={cn('relative block h-14 w-14 border-2 bg-paper', i === index ? 'border-ink' : 'border-line')}
                >
                  <Image src={src} alt="" fill sizes="56px" className="object-contain p-1" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
