/**
 * Small RFC 4180 CSV helpers for exports and the product import. Values that
 * start with = + - @ get a leading quote mark so spreadsheets do not run them
 * as formulas (CSV injection).
 */

type Cell = string | number | boolean | null | undefined | Date;

function cell(value: Cell): string {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s) && typeof value === 'string') s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  // BOM so Excel reads UTF-8
  return '\uFEFF' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** Parses CSV text into rows of strings. Handles quotes, escaped quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

/** Rows as objects keyed by the (trimmed, lower-cased) header. */
export function parseCsvObjects(text: string): { header: string[]; records: Record<string, string>[] } {
  const [head = [], ...rest] = parseCsv(text);
  const header = head.map((h) => h.trim().toLowerCase());
  return {
    header,
    records: rest.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()]))),
  };
}
