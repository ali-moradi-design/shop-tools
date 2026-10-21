import { DomainError } from '@shared/domain/DomainError';
import type { SpecDefinition } from './spec.entity';
import { findUnit, toBase } from './units';

/** A condition on one specification, already in the base unit. */
export type SpecFilter =
  | { key: string; kind: 'range'; min?: number; max?: number }
  | { key: string; kind: 'options'; values: string[] };

export const SPEC_PARAM_PREFIX = 'spec.';

const NUMBER = /^-?\d+(?:\.\d+)?$/;

function parseNumber(text: string, label: string): number | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  if (!NUMBER.test(t)) throw new DomainError(`"${text}" is not a number (${label})`, 'VALIDATION');
  return Number(t);
}

/**
 * Turns `spec.torque=40..100Nm`, `spec.voltage=18`, `spec.motor=Brushless,Brushed`
 * into typed filters. Numbers may carry a unit of the specification's family
 * (`in·lb`, `ft`, `lb` ...); they are converted to the base unit here, once.
 *
 *   40..100Nm   between 40 and 100        ..100   at most 100        40..   at least 40
 *   18          exactly 18 (a tiny tolerance for converted values)
 */
export function parseSpecFilters(
  raw: Record<string, string | undefined>,
  definitions: SpecDefinition[],
): SpecFilter[] {
  const filters: SpecFilter[] = [];
  for (const [param, value] of Object.entries(raw)) {
    if (!param.startsWith(SPEC_PARAM_PREFIX) || value === undefined || value === '') continue;
    const key = param.slice(SPEC_PARAM_PREFIX.length);
    const def = definitions.find((d) => d.key === key);
    if (!def) throw new DomainError(`Unknown specification "${key}" for this category`, 'VALIDATION');
    if (!def.filterable) throw new DomainError(`"${def.label}" cannot be used as a filter`, 'VALIDATION');

    if (def.kind === 'text') {
      const values = value.split(',').map((v) => v.trim()).filter(Boolean);
      if (values.length === 0) continue;
      filters.push({ key, kind: 'options', values });
      continue;
    }

    // number: split the unit off the end ("40..100Nm" → numbers "40..100", unit "Nm")
    const unitStart = value.search(/[^\d\s.-]/);
    const numbers = unitStart === -1 ? value : value.slice(0, unitStart);
    const unitText = unitStart === -1 ? '' : value.slice(unitStart).trim();
    const unit = unitText ? findUnit(def.unitFamily, unitText) : undefined;
    if (unitText && !unit) {
      throw new DomainError(`Unit "${unitText}" does not fit "${def.label}"`, 'VALIDATION');
    }
    const convert = (n: number | undefined) => (n === undefined ? undefined : unit ? toBase(n, unit) : n);

    let min: number | undefined;
    let max: number | undefined;
    if (numbers.includes('..')) {
      const [lo, hi, ...extra] = numbers.split('..');
      if (extra.length) throw new DomainError(`"${value}" is not a range`, 'VALIDATION');
      min = convert(parseNumber(lo, def.label));
      max = convert(parseNumber(hi, def.label));
    } else {
      const exact = convert(parseNumber(numbers, def.label));
      if (exact === undefined) continue;
      const tolerance = Math.max(1e-6, Math.abs(exact) * 1e-6);
      min = exact - tolerance;
      max = exact + tolerance;
    }
    if (min === undefined && max === undefined) continue;
    if (min !== undefined && max !== undefined && min > max) {
      throw new DomainError(`The range for "${def.label}" is upside down`, 'VALIDATION');
    }
    filters.push({ key, kind: 'range', ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) });
  }
  return filters;
}
