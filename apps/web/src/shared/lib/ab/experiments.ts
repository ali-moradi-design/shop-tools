/**
 * Running A/B tests. Each visitor gets one variant per experiment, kept in a
 * cookie for 180 days (set in proxy.ts). Change a key to start a fresh test;
 * remove an entry to end it (everyone then sees the control).
 */
export const EXPERIMENTS = {
  /** Product page buy box: price only, or the shipping, returns and warranty promise above the button. */
  'pdp-cta': { variants: ['control', 'benefits'], weights: [50, 50] },
} as const satisfies Record<string, { variants: readonly string[]; weights: readonly number[] }>;

export type ExperimentKey = keyof typeof EXPERIMENTS;
export type VariantOf<K extends ExperimentKey> = (typeof EXPERIMENTS)[K]['variants'][number];

export const VISITOR_COOKIE = 'tb_vid';
export const cookieName = (key: string) => `ab_${key}`;
export const AB_MAX_AGE = 60 * 60 * 24 * 180;

/** Picks a variant by weight from a random number in [0, 1). */
export function pickVariant<K extends ExperimentKey>(key: K, random: number): VariantOf<K> {
  const { variants, weights } = EXPERIMENTS[key];
  const total = weights.reduce((a, b) => a + b, 0);
  let point = random * total;
  for (let i = 0; i < variants.length; i++) {
    point -= weights[i];
    if (point < 0) return variants[i] as VariantOf<K>;
  }
  return variants[0] as VariantOf<K>;
}

export function isVariant<K extends ExperimentKey>(key: K, value: string | undefined): value is VariantOf<K> {
  return value !== undefined && (EXPERIMENTS[key].variants as readonly string[]).includes(value);
}
