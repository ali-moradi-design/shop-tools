/**
 * Units of measure. Every number a specification stores is in the family's base unit;
 * shoppers may read and filter in any other unit of the same family.
 * `factor` converts from the base unit: displayed = base × factor.
 */
export interface UnitOption {
  symbol: string;
  factor: number;
}

interface UnitFamily {
  base: string;
  units: UnitOption[];
  /** Other spellings people type: matched ignoring case, spaces, dots, dashes and middle dots. */
  aliases?: Record<string, string>;
}

const FAMILIES: Record<string, UnitFamily> = {
  length: {
    base: 'mm',
    units: [
      { symbol: 'mm', factor: 1 },
      { symbol: 'cm', factor: 0.1 },
      { symbol: 'm', factor: 0.001 },
      { symbol: 'in', factor: 1 / 25.4 },
      { symbol: 'ft', factor: 1 / 304.8 },
    ],
    aliases: { '″': 'in', '"': 'in', inch: 'in', inches: 'in', foot: 'ft', feet: 'ft' },
  },
  distance: {
    base: 'm',
    units: [
      { symbol: 'm', factor: 1 },
      { symbol: 'cm', factor: 100 },
      { symbol: 'mm', factor: 1000 },
      { symbol: 'ft', factor: 1 / 0.3048 },
      { symbol: 'in', factor: 1 / 0.0254 },
    ],
    aliases: { feet: 'ft', foot: 'ft', inch: 'in' },
  },
  weight: {
    base: 'kg',
    units: [
      { symbol: 'kg', factor: 1 },
      { symbol: 'g', factor: 1000 },
      { symbol: 'lb', factor: 1 / 0.45359237 },
    ],
    aliases: { lbs: 'lb', pound: 'lb', pounds: 'lb' },
  },
  torque: {
    base: 'Nm',
    units: [
      { symbol: 'Nm', factor: 1 },
      { symbol: 'in·lb', factor: 8.850746 },
      { symbol: 'ft·lb', factor: 0.737562 },
    ],
    aliases: { inlb: 'in·lb', inchlb: 'in·lb', ftlb: 'ft·lb', footlb: 'ft·lb' },
  },
  power: {
    base: 'W',
    units: [
      { symbol: 'W', factor: 1 },
      { symbol: 'kW', factor: 0.001 },
      { symbol: 'hp', factor: 1 / 745.69987 },
    ],
    aliases: { watt: 'W', watts: 'W' },
  },
  voltage: { base: 'V', units: [{ symbol: 'V', factor: 1 }], aliases: { volt: 'V', volts: 'V' } },
  capacity: { base: 'Ah', units: [{ symbol: 'Ah', factor: 1 }, { symbol: 'mAh', factor: 1000 }] },
  speed: { base: 'rpm', units: [{ symbol: 'rpm', factor: 1 }] },
  rate: { base: 'bpm', units: [{ symbol: 'bpm', factor: 1 }], aliases: { ipm: 'bpm' } },
  volume: {
    base: 'L',
    units: [
      { symbol: 'L', factor: 1 },
      { symbol: 'ml', factor: 1000 },
      { symbol: 'gal', factor: 1 / 3.785411784 },
    ],
    aliases: { liter: 'L', litre: 'L', litres: 'L', liters: 'L' },
  },
};

/** Letters only, lower case: "in·lb", "In-Lb" and "inlb" are the same unit. */
const squash = (s: string) => s.toLowerCase().replace(/[\s.\-·]/g, '');

export function unitFamilyNames(): string[] {
  return Object.keys(FAMILIES);
}

/** The units a family offers, base unit first. */
export function unitsOf(family: string | null | undefined): UnitOption[] {
  return family && FAMILIES[family] ? FAMILIES[family].units.map((u) => ({ ...u })) : [];
}

export function baseUnitOf(family: string): string | undefined {
  return FAMILIES[family]?.base;
}

/** Looks a unit up by the text a visitor typed. */
export function findUnit(family: string | null | undefined, text: string): UnitOption | undefined {
  if (!family || !FAMILIES[family]) return undefined;
  const wanted = squash(text);
  const { units, aliases = {} } = FAMILIES[family];
  for (const [alias, symbol] of Object.entries(aliases)) {
    if (squash(alias) === wanted) return units.find((u) => u.symbol === symbol);
  }
  const exact = units.find((u) => u.symbol === text);
  if (exact) return exact; // "mm" and "Mm" differ in real life; keep exact first
  return units.find((u) => squash(u.symbol) === wanted);
}

/** A value in `unit` → the family's base unit. */
export function toBase(value: number, unit: UnitOption): number {
  return value / unit.factor;
}

/** A base-unit value → `unit`. */
export function fromBase(value: number, unit: UnitOption): number {
  return value * unit.factor;
}
