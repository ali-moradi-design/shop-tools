import type { CreateProductInput, VariantInput } from '../../../modules/catalog';
import products from './dewalt-products.json';
import { classify, type CategorySlug } from './classify';
import { CATEGORY_BY_SLUG, WAREHOUSES } from './taxonomy';
import { seeded, type Rand } from './random';

/** How many products are marked as featured on the home page. */
export const FEATURED_COUNT = 16;

type Specs = Record<string, number | string>;

const NUM = '(\\d+(?:\\.\\d+)?)';
const volts = (n: string) => Number(n.match(new RegExp(`${NUM}\\s?V\\b`, 'i'))?.[1]);
const watts = (n: string) => Number(n.match(/(\d{3,4})\s?W\b/i)?.[1]);
const mms = (n: string) => [...n.matchAll(new RegExp(`${NUM}\\s?mm`, 'gi'))].map((m) => Number(m[1]));
const ahOf = (n: string) => Number(n.match(new RegExp(`${NUM}\\s?Ah`, 'i'))?.[1]);
const packOf = (n: string) => Number(n.match(/\((\d+)\s*(?:Pc|Pk|Piece)/i)?.[1] ?? n.match(/\b(\d+)\s*Pk\b/i)?.[1]);
const teethOf = (n: string) => Number(n.match(/\b(\d{2,3})\s?t\b/i)?.[1]);
const batteryCount = (n: string) => Number(n.match(/\((\d)\)\s*[\d.]+\s*ah/i)?.[1] ?? n.match(/(\d)\s*x\s*[\d.]+\s*ah/i)?.[1]);
const round1 = (x: number) => Math.round(x * 10) / 10;
const between = (r: Rand, lo: number, hi: number, decimals = 1) => {
  const f = 10 ** decimals;
  return Math.round((lo + r.next() * (hi - lo)) * f) / f;
};
const defined = <T extends Specs>(s: Record<string, number | string | undefined>): T =>
  Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && !(typeof v === 'number' && Number.isNaN(v)))) as T;
const firstWord = (n: string, words: [RegExp, string][], fallback: string) => words.find(([re]) => re.test(n))?.[1] ?? fallback;

/** Is this a battery-powered tool? (12 V, 18 V, 20 V, 36 V or 54 V in the name) */
function cordlessVoltage(name: string): number | undefined {
  const v = volts(name);
  return [12, 14.4, 18, 20, 36, 54].includes(v) ? v : undefined;
}

function powerFields(name: string, r: Rand) {
  const cordless = cordlessVoltage(name);
  const corded = !cordless;
  return {
    'power-source': corded ? 'Corded' : 'Cordless',
    voltage: cordless ?? 230,
    motor: /brushless/i.test(name) ? 'Brushless' : corded ? 'Brushed' : r.chance(0.5) ? 'Brushless' : 'Brushed',
    cordless,
  };
}

function torqueFor(voltage: number | undefined, r: Rand): number {
  if (!voltage) return between(r, 40, 90, 0);
  if (voltage <= 12) return between(r, 28, 55, 0);
  if (voltage <= 20) return between(r, 55, 135, 0);
  return between(r, 120, 210, 0);
}

function specsFor(category: CategorySlug, name: string, r: Rand): Specs {
  const w = watts(name);
  const sizes = mms(name);
  const pack = packOf(name);
  switch (category) {
    case 'drills': {
      const p = powerFields(name, r);
      const kit = /\bwith\b|\bx\b.*ah|\(\d\)/i.test(name) && !/tool only/i.test(name);
      const count = batteryCount(name) || (kit && p.cordless ? 1 : 0);
      return defined({
        'power-source': p['power-source'],
        voltage: p.voltage,
        motor: p.motor,
        torque: torqueFor(p.cordless, r),
        speed: p.cordless ? r.pick([1650, 1800, 2000, 2100]) : r.pick([3000, 3200, 2800]),
        chuck: sizes[0] && sizes[0] <= 16 ? sizes[0] : r.pick([10, 13]),
        'battery-capacity': count ? ahOf(name) || r.pick([1.5, 2, 4, 5]) : undefined,
        'batteries-included': count,
        weight: p.cordless ? round1(between(r, 1, 2.8) + (p.cordless > 20 ? 0.8 : 0)) : between(r, 1.8, 3.4),
      });
    }
    case 'saws': {
      const p = powerFields(name, r);
      const blade = sizes[0] ?? r.pick([165, 184, 216, 250, 305]);
      return defined({
        'power-source': p['power-source'],
        voltage: p.voltage,
        power: w || (p.cordless ? between(r, 900, 1800, 0) : between(r, 1100, 2200, 0)),
        blade,
        'cut-depth': Math.round(blade * between(r, 0.2, 0.36, 2)),
        speed: r.pick([3000, 3800, 4500, 5200, 6200]),
        weight: round1(blade / 11 + between(r, 0.5, 3)),
      });
    }
    case 'grinders': {
      const p = powerFields(name, r);
      const sander = /sander/i.test(name);
      return defined({
        'power-source': p['power-source'],
        voltage: p.voltage,
        motor: p.motor,
        power: w || between(r, 750, 2600, 0),
        disc: sander ? undefined : sizes[0] ?? 125,
        speed: sander ? r.pick([10000, 12000]) : r.pick([6500, 8500, 9000, 11000]),
        weight: between(r, 1.4, 5),
      });
    }
    case 'power-tools': {
      const p = powerFields(name, r);
      return defined({
        type: firstWord(
          name,
          [
            [/router/i, 'Router'], [/nailer/i, 'Nailer'], [/mixer/i, 'Mixer'], [/demolition/i, 'Demolition hammer'],
            [/thicknesser/i, 'Thicknesser'], [/pruner/i, 'Pruner'], [/multi[- ]?tool/i, 'Multi-tool'], [/extractor|vacuum/i, 'Dust extractor'],
            [/mower/i, 'Lawn mower'], [/trimmer|strimmer/i, 'Trimmer'], [/tacker|stapler/i, 'Tacker'], [/chalk/i, 'Marking'],
          ],
          'Power tool',
        ),
        'power-source': p['power-source'],
        voltage: p.voltage,
        power: w || (p.cordless ? undefined : between(r, 600, 1600, 0)),
        weight: between(r, 1.5, 18),
      });
    }
    case 'blades':
      return defined({
        type: firstWord(
          name,
          [
            [/hole ?saw/i, 'Hole saw'], [/circular saw/i, 'Circular saw blade'], [/jigsaw/i, 'Jigsaw blade'], [/reciprocating/i, 'Reciprocating saw blade'],
            [/band ?saw/i, 'Band saw blade'], [/flap/i, 'Flap disc'], [/cutting (wheel|disc)/i, 'Cutting disc'], [/grinding/i, 'Grinding disc'],
            [/sand|ros/i, 'Sanding sheet'], [/chain/i, 'Saw chain'],
          ],
          'Saw blade',
        ),
        diameter: sizes[0],
        teeth: teethOf(name),
        pack: pack || 1,
      });
    case 'bits':
      return defined({
        type: firstWord(
          name,
          [
            [/socket/i, 'Impact socket set'], [/sds/i, 'SDS drill bit'], [/auger/i, 'Auger bit'], [/screwdriving|driver bit|driving/i, 'Driver bit'],
            [/chisel/i, 'Chisel'], [/drill/i, 'Drill bit'],
          ],
          'Bit',
        ),
        diameter: sizes[0],
        length: sizes[1] ?? sizes[2],
        pack: pack || 1,
      });
    case 'fasteners':
      return defined({
        type: firstWord(name, [[/staple/i, 'Staples'], [/screw/i, 'Screws'], [/brad/i, 'Brads'], [/nail/i, 'Nails']], 'Fasteners'),
        length: sizes[0],
        diameter: sizes[1],
        pack: pack || 1,
      });
    case 'hand-tools': {
      const kg = Number(name.match(new RegExp(`${NUM}\\s?kg`, 'i'))?.[1]);
      return defined({
        type: firstWord(
          name,
          [
            [/plier/i, 'Pliers'], [/hammer/i, 'Hammer'], [/chisel/i, 'Chisel'], [/knife/i, 'Knife'], [/wrecking|pry|bar\b/i, 'Bar'],
            [/hex key/i, 'Hex keys'], [/wrench|spanner/i, 'Wrench'], [/tacker|staple gun/i, 'Staple gun'], [/chalk/i, 'Marking'],
          ],
          'Hand tool',
        ),
        material: /carbon/i.test(name) ? 'Carbon fibre' : /hickory|wood/i.test(name) ? 'Hickory' : 'Steel',
        length: sizes.at(-1) ?? r.pick([150, 200, 250, 300, 450, 600]),
        weight: kg || between(r, 0.1, 2.5, 2),
      });
    }
    case 'measuring': {
      const laser = /laser/i.test(name);
      const tape = /tape/i.test(name);
      const metres = Number(name.match(/(\d+(?:\.\d+)?)\s?M\b/)?.[1]) || (sizes.find((s) => s >= 600) ?? 0) / 1000;
      return defined({
        type: laser ? 'Laser' : tape ? 'Tape measure' : 'Level',
        'laser-colour': laser ? (/green/i.test(name) ? 'Green' : 'Red') : undefined,
        range: laser ? (/rotary/i.test(name) ? 150 : r.pick([15, 25, 30, 50])) : undefined,
        accuracy: laser ? r.pick([0.3, 0.5, 1, 3]) : undefined,
        length: tape ? metres || r.pick([3, 5, 8, 10]) : undefined,
        weight: laser ? between(r, 0.4, 2.2, 2) : between(r, 0.1, 0.9, 2),
      });
    }
    case 'batteries':
      return defined({
        type: /charger/i.test(name) ? 'Charger' : 'Battery',
        voltage: volts(name) || 18,
        capacity: ahOf(name) || undefined,
        weight: between(r, 0.4, 1.6, 2),
      });
    default:
      return defined({ type: 'Accessory', weight: between(r, 0.05, 1.5, 2) });
  }
}

/** Price in cents, ending in 99, inside a range that fits the category. */
function priceFor(category: CategorySlug, name: string, specs: Specs, r: Rand): number {
  const kit = /\bwith\b|\(\d\)/i.test(name) && !/tool only/i.test(name);
  const ranges: Record<CategorySlug, [number, number]> = {
    drills: specs['power-source'] === 'Corded' ? [69, 149] : kit ? [179, 429] : [99, 189],
    saws: [179, 899],
    grinders: kit ? [159, 349] : [79, 259],
    'power-tools': [89, 699],
    blades: [9, 79],
    bits: Number(specs.pack) >= 10 ? [29, 129] : [5, 49],
    fasteners: [7, 29],
    'hand-tools': [12, 99],
    measuring: /laser/i.test(name) ? [89, 399] : [19, 49],
    batteries: [49, 199],
    accessories: [9, 119],
  };
  const [lo, hi] = ranges[category];
  return Math.round(lo + r.next() * (hi - lo)) * 100 - 1;
}

function stockFor(r: Rand, scale = 1): Record<string, number> {
  const base: Record<string, number> = { BER: 40, HAM: 25, MUC: 18 };
  const tier = r.next();
  const out: Record<string, number> = {};
  for (const { code } of WAREHOUSES) {
    if (tier < 0.06) out[code] = 0; // sold out everywhere
    else if (tier < 0.16) out[code] = r.chance(0.35) ? r.int(1, 4) : 0; // running low
    else out[code] = r.chance(0.12) ? 0 : Math.round(r.int(1, base[code]) * scale);
  }
  return out;
}

function variantsFor(category: CategorySlug, name: string, model: string, price: number, specs: Specs, r: Rand): VariantInput[] {
  const power = ['drills', 'saws', 'grinders', 'power-tools'].includes(category);
  const count = Number(specs['batteries-included'] ?? batteryCount(name)) || 0;
  const ah = Number(specs['battery-capacity'] ?? ahOf(name)) || 0;
  const toolOnly = /tool only/i.test(name);
  const pack = Number(specs.pack);

  let label = 'Standard';
  if (power && count && ah) label = `${count} × ${ah} Ah kit`;
  else if (power && toolOnly) label = 'Body only';
  else if (pack > 1) label = `Pack of ${pack}`;

  const variants: VariantInput[] = [{ sku: model, label, stock: stockFor(r) }];
  if (power && specs['power-source'] === 'Cordless') {
    if (count && r.chance(0.6)) variants.push({ sku: `${model}-BODY`, label: 'Body only', price: Math.round((price * 0.62) / 100) * 100 - 1, stock: stockFor(r, 0.7) });
    else if (toolOnly && r.chance(0.5)) variants.push({ sku: `${model}-KIT`, label: '2 × 4.0 Ah kit', price: Math.round((price * 1.7) / 100) * 100 - 1, stock: stockFor(r, 0.5) });
  }
  return variants;
}

function describe(title: string, categoryName: string, specs: Specs): string {
  const shown = Object.entries(specs)
    .filter(([key]) => !['power-source', 'type'].includes(key))
    .slice(0, 4)
    .map(([key, value]) => `${key.replace(/-/g, ' ')} ${value}`);
  return `${title}. ${categoryName}${shown.length ? ` — ${shown.join(', ')}` : ''}. Demo product for the Toolbench shop: price and stock are generated.`;
}

function featuresFor(specs: Specs, category: CategorySlug): string[] {
  const f: string[] = [];
  if (specs.voltage && specs['power-source'] === 'Cordless') f.push(`${specs.voltage} V battery platform`);
  if (specs.motor === 'Brushless') f.push('Brushless motor for longer run time');
  if (specs.torque) f.push(`Up to ${specs.torque} Nm torque`);
  if (specs.power) f.push(`${specs.power} W motor`);
  if (specs.pack && Number(specs.pack) > 1) f.push(`Pack of ${specs.pack}`);
  f.push('Ships from the nearest warehouse', category === 'batteries' ? 'Fits the matching tool platform' : 'Two-year warranty');
  return f.slice(0, 5);
}

let cache: CreateProductInput[] | undefined;

/** The whole demo catalog: deterministic, so every run (and every machine) gets the same data. */
export function generateCatalog(): CreateProductInput[] {
  if (cache) return cache;
  const items = products.map((p): CreateProductInput => {
    const r = seeded(p.sku);
    const category = classify(p.name);
    const def = CATEGORY_BY_SLUG.get(category)!;
    const title = p.name.replace(/[®™]/g, '').replace(/^DEWALT\s+/i, '').replace(/\s+/g, ' ').trim();
    const allowed = new Set(def.specs.map((s) => s.key));
    const specs = Object.fromEntries(Object.entries(specsFor(category, p.name, r)).filter(([k]) => allowed.has(k)));
    const model = p.sku.toUpperCase();
    const price = priceFor(category, p.name, specs, r);
    return {
      slug: p.sku.toLowerCase(),
      title,
      brand: 'DEWALT',
      model,
      category,
      description: describe(title, def.name, specs),
      features: featuresFor(specs, category),
      price,
      compareAtPrice: r.chance(0.15) ? Math.round((price * 1.18) / 100) * 100 - 1 : undefined,
      images: [`/catalog/${p.sku}.webp`],
      variants: variantsFor(category, p.name, model, price, specs, r),
      specs,
      tags: [category, 'dewalt', ...(specs['power-source'] ? [String(specs['power-source']).toLowerCase()] : [])],
    };
  });

  // featured: take the in-stock products round-robin across the main categories
  const order: CategorySlug[] = ['drills', 'saws', 'grinders', 'measuring', 'power-tools', 'batteries'];
  const inStock = (p: CreateProductInput) => p.variants.some((v) => Object.values(v.stock).some((q) => q > 0));
  const pools = order.map((c) => items.filter((p) => p.category === c && inStock(p)));
  const featured: CreateProductInput[] = [];
  for (let i = 0; featured.length < FEATURED_COUNT && i < 20; i++) {
    for (const pool of pools) {
      if (pool[i] && featured.length < FEATURED_COUNT) featured.push(pool[i]);
    }
  }
  featured.forEach((p, i) => {
    p.featured = true;
    p.featuredOrder = i;
  });
  cache = items;
  return items;
}
