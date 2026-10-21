import { Icon } from './Icon';

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={className} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          width={14}
          height={14}
          className="inline-block"
          fill={value >= i - 0.25 ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}
