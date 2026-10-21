/** One unit a number can be shown in; displayed = base × factor (the API sends these). */
export interface UnitOption {
  symbol: string;
  factor: number;
}

export type UnitSystem = 'metric' | 'imperial';

/** Which unit each family shows in the "imperial" switch (the first entry is always the base unit). */
const IMPERIAL: Record<string, string> = {
  mm: 'in',
  m: 'ft',
  kg: 'lb',
  Nm: 'in·lb',
  L: 'gal',
};

/** The unit to show for a system: the base unit for metric, the usual imperial unit otherwise. */
export function unitFor(units: UnitOption[], system: UnitSystem): UnitOption | undefined {
  if (units.length === 0) return undefined;
  if (system === 'metric') return units[0];
  const wanted = IMPERIAL[units[0].symbol];
  return units.find((u) => u.symbol === wanted) ?? units[0];
}

export function fromBase(value: number, unit: UnitOption): number {
  return value * unit.factor;
}

export function toBase(value: number, unit: UnitOption): number {
  return value / unit.factor;
}

/** 4 significant digits, no trailing zeros: 8.850746 → "8.851", 1800 → "1800", 0.4536 → "0.4536". */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '';
  const rounded = Number(value.toPrecision(4));
  return Math.abs(rounded) >= 10000
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(rounded)
    : String(rounded);
}

/** "60 Nm", "531 in·lb"; a number without a unit is just the number. */
export function formatQuantity(baseValue: number, units: UnitOption[], system: UnitSystem, fallbackUnit?: string): string {
  const unit = unitFor(units, system);
  if (!unit) return `${formatNumber(baseValue)}${fallbackUnit ? ` ${fallbackUnit}` : ''}`;
  return `${formatNumber(fromBase(baseValue, unit))} ${unit.symbol}`;
}
