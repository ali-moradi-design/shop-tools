import { describe, expect, it } from 'vitest';
import type { SpecDefinition } from '@/entities/category';
import { deriveSlug, isAllowedImage, productFormSchema, productToFormValues, toProductPayload, toSpecs } from '../product-form';

const defs = [
  { key: 'torque', label: 'Torque', kind: 'number', unit: 'Nm' },
  { key: 'motor', label: 'Motor', kind: 'text' },
] as SpecDefinition[];

const base = () => ({
  ...productToFormValues(undefined, ['BER', 'HAM'], 'drills'),
  title: 'Hammer Drill',
  model: 'DCD805',
  price: '199.00',
});

describe('product form', () => {
  it('builds the URL from model and name, or uses the typed one', () => {
    expect(deriveSlug({ slug: '', title: 'Hammer Drill', model: 'DCD805' })).toBe('dcd805-hammer-drill');
    expect(deriveSlug({ slug: 'my-drill', title: 'x', model: '' })).toBe('my-drill');
  });

  it('turns the form into the API body: cents, SKUs, specs as numbers', () => {
    const v = { ...base(), compareAtPrice: '249.5', specs: { torque: '95', motor: ' Brushless ', unknown: 'x' } };
    v.variants = [
      { label: 'Body only', sku: '', price: '149', stock: { BER: 2, HAM: 0 } },
      { label: '2 × 5.0 Ah kit', sku: 'kit-1', price: '', stock: { BER: 1, HAM: 3 } },
    ];
    expect(productFormSchema.safeParse(v).success).toBe(true);
    const p = toProductPayload(v, defs);
    expect(p).toMatchObject({ slug: 'dcd805-hammer-drill', price: 19900, compareAtPrice: 24950, specs: { torque: 95, motor: 'Brushless' } });
    expect(p.variants).toEqual([
      { label: 'Body only', sku: 'DCD805-BODY-ONLY', price: 14900, stock: { BER: 2, HAM: 0 } },
      { label: '2 × 5.0 Ah kit', sku: 'KIT-1', stock: { BER: 1, HAM: 3 } },
    ]);
  });

  it('ends a sale with null and uses the model as the only SKU', () => {
    const p = toProductPayload(base(), defs);
    expect(p.compareAtPrice).toBeNull();
    expect(p.variants[0].sku).toBe('DCD805');
  });

  it('rejects a compare-at price below the price and duplicate SKUs', () => {
    const v = { ...base(), compareAtPrice: '100' };
    v.variants = [
      { label: 'A', sku: 'X', price: '', stock: {} },
      { label: 'B', sku: 'x', price: '', stock: {} },
    ];
    const r = productFormSchema.safeParse(v);
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['compareAtPrice', 'variants.1.sku']));
  });

  it('reports a spec that is not a number', () => {
    expect(toSpecs({ torque: 'strong' }, defs).errors).toEqual({ 'specs.torque': 'Enter a number' });
  });

  it('accepts only uploads and catalog photos', () => {
    expect(isAllowedImage('/uploads/products/1-abc.webp')).toBe(true);
    expect(isAllowedImage('/catalog/dcd805.webp')).toBe(true);
    expect(isAllowedImage('https://example.com/a.jpg')).toBe(false);
    expect(isAllowedImage('/uploads/../secret.png')).toBe(false);
  });
});
