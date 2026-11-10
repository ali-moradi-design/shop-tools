import { describe, expect, it } from 'vitest';
import { parseCsv, parseCsvObjects, toCsv } from '../../../src/shared/csv';

describe('csv', () => {
  it('quotes commas, quotes and new lines, and adds a BOM for Excel', () => {
    const csv = toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['line\nbreak', 3]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"x,y","say ""hi"""');
    expect(parseCsv(csv)).toEqual([['a', 'b'], ['x,y', 'say "hi"'], ['line\nbreak', '3']]);
  });

  it('defuses spreadsheet formulas in text cells', () => {
    const csv = toCsv(['v'], [['=HYPERLINK("http://evil")'], ['+1'], ['@cmd'], [-5]]);
    const [, ...rows] = parseCsv(csv);
    expect(rows.map((r) => r[0])).toEqual(['\'=HYPERLINK("http://evil")', "'+1", "'@cmd", '-5']);
  });

  it('reads rows as objects keyed by the lower-cased header', () => {
    expect(parseCsvObjects('Slug, Title\r\ndrill,"A, B"\r\n').records).toEqual([{ slug: 'drill', title: 'A, B' }]);
  });
});
