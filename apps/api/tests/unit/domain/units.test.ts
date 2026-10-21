import { describe, expect, it } from 'vitest';
import { findUnit, fromBase, toBase, unitsOf, baseUnitOf } from '../../../src/modules/catalog/domain/units';

describe('units', () => {
  it('offers the base unit first, with factor 1', () => {
    for (const family of ['length', 'weight', 'torque', 'power', 'voltage', 'capacity', 'speed']) {
      const units = unitsOf(family);
      expect(units[0].symbol).toBe(baseUnitOf(family));
      expect(units[0].factor).toBe(1);
    }
    expect(unitsOf('nope')).toEqual([]);
    expect(unitsOf(undefined)).toEqual([]);
  });

  it('finds units however they are typed', () => {
    expect(findUnit('torque', 'in·lb')?.symbol).toBe('in·lb');
    expect(findUnit('torque', 'in-lb')?.symbol).toBe('in·lb');
    expect(findUnit('torque', 'InLb')?.symbol).toBe('in·lb');
    expect(findUnit('torque', 'Nm')?.symbol).toBe('Nm');
    expect(findUnit('length', 'inches')?.symbol).toBe('in');
    expect(findUnit('weight', 'LBS')?.symbol).toBe('lb');
    expect(findUnit('power', 'watts')?.symbol).toBe('W');
    expect(findUnit('length', 'parsec')).toBeUndefined();
    expect(findUnit('voltage', 'mm')).toBeUndefined();
  });

  it('converts to the base unit and back', () => {
    const inch = findUnit('length', 'in')!;
    expect(toBase(1, inch)).toBeCloseTo(25.4, 6);
    expect(fromBase(25.4, inch)).toBeCloseTo(1, 6);

    const lb = findUnit('weight', 'lb')!;
    expect(toBase(2.20462, lb)).toBeCloseTo(1, 4);

    const inLb = findUnit('torque', 'in·lb')!;
    expect(fromBase(toBase(500, inLb), inLb)).toBeCloseTo(500, 9);
    expect(toBase(885.0746, inLb)).toBeCloseTo(100, 3);
  });
});
