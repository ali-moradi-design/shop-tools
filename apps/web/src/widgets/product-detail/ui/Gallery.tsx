import Image from 'next/image';

/** Two-column image grid like the reference; product shots on light grey. */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {images.map((src, i) => (
        <div key={src} className="relative aspect-square bg-soft">
          <Image
            src={src}
            alt={i === 0 ? title : `${title}, view ${i + 1}`}
            fill
            priority={i < 2}
            sizes="(min-width: 1024px) 365px, 50vw"
            className="object-contain"
          />
        </div>
      ))}
    </div>
  );
}
