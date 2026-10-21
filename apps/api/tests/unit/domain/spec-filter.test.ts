import { describe, expect, it } from 'vitest';
import { parseSpecFilters } from '../../../src/modules/catalog/domain/spec-filter';
import type { SpecDefinition } from '../../../src/modules/catalog/domain/spec.entity';

const def = (key: string, over: Partial<SpecDefinition>): SpecDefinition => ({
  key,
  label: key,
  group: 'g',
  kind: 'number',
  filterable: true,
  sortOrder: 1,
  ...over,
});

const defs = [
  def('torque', { unit: 'Nm', unitFamily: 'torque' }),
  def('voltage', { unit: 'V', unitFamily: 'voltage' }),
  def('chuck', { unit: 'mm', unitFamily: 'length' }),
  def('weight', { unit: 'kg', unitFamily: 'weight' }),
  def('motor', { kind: 'text' }),
  def('secret', { filterable: false }),
];

const parse = (raw: Record<string, string>) => parseSpecFilters(raw, defs);

describe('parseSpecFilters', () => {
  it('reads a range, an open range and an exact value', () => {
    expect(parse({ 'spec.torque': '40..100' })).toEqual([{ key: 'torque', kind: 'range', min: 40, max: 100 }]);
    expect(parse({ 'spec.torque': '..100' })).toEqual([{ key: 'torque', kind: 'range', max: 100 }]);
    expect(parse({ 'spec.torque': '40..' })).toEqual([{ key: 'torque', kind: 'range', min: 40 }]);
    const [exact] = parse({ 'spec.voltage': '18' });
    expect(exact).toMatchObject({ key: 'voltage', kind: 'range' });
    if (exact.kind === 'range') {
      expect(exact.min).toBeCloseTo(18, 4);
      expect(exact.max).toBeCloseTo(18, 4);
      expect(exact.min).toBeLessThan(exact.max!);
    }
  });

  it('converts a typed unit to the base unit', () => {
    const [f] = parse({ 'spec.torque': '354.02984..885.0746in·lb' });
    expect(f.kind === 'range' && f.min).toBeCloseTo(40, 3);
    expect(f.kind === 'range' && f.max).toBeCloseTo(100, 3);

    const [len] = parse({ 'spec.chuck': '..0.5in' });
    expect(len.kind === 'range' && len.max).toBeCloseTo(12.7, 6);

    const [w] = parse({ 'spec.weight': '1..2lb' });
    expect(w.kind === 'range' && w.min).toBeCloseTo(0.4536, 3);
  });

  it('reads word lists', () => {
    expect(parse({ 'spec.motor': 'Brushless, Brushed' })).toEqual([
      { key: 'motor', kind: 'options', values: ['Brushless', 'Brushed'] },
    ]);
  });

  it('ignores other parameters and empty values', () => {
    expect(parse({ q: 'drill', 'spec.torque': '' })).toEqual([]);
  });

  it('rejects what it cannot understand', () => {
    expect(() => parse({ 'spec.nope': '1' })).toThrow(/Unknown specification/);
    expect(() => parse({ 'spec.secret': '1' })).toThrow(/cannot be used as a filter/);
    expect(() => parse({ 'spec.torque': 'lots' })).toThrow(/does not fit|not a number/);
    expect(() => parse({ 'spec.torque': '40..100kg' })).toThrow(/does not fit/);
    expect(() => parse({ 'spec.torque': '100..40' })).toThrow(/upside down/);
    expect(() => parse({ 'spec.torque': '1..2..3' })).toThrow(/not a range/);
    expect(() => parse({ 'spec.voltage': '1.2.3' })).toThrow(/not a number/);
  });
});
