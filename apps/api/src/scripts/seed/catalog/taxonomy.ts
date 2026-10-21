import type { SpecDefinition, Warehouse } from '../../../modules/catalog';
import type { CategorySlug } from './classify';

/** Dispatch order: Berlin first, then Hamburg, then Munich. */
export const WAREHOUSES: Warehouse[] = [
  { code: 'BER', name: 'Berlin', city: 'Berlin', sortOrder: 1 },
  { code: 'HAM', name: 'Hamburg', city: 'Hamburg', sortOrder: 2 },
  { code: 'MUC', name: 'Munich', city: 'Munich', sortOrder: 3 },
];

type Opts = { filterable?: boolean; better?: 'higher' | 'lower' };
let order = 0;

const num = (key: string, label: string, group: string, unit: string | undefined, family: string | undefined, o: Opts = {}): SpecDefinition => ({
  key,
  label,
  group,
  kind: 'number',
  unit,
  unitFamily: family,
  filterable: o.filterable ?? true,
  better: o.better,
  sortOrder: ++order,
});
const text = (key: string, label: string, group: string, o: Opts = {}): SpecDefinition => ({
  key,
  label,
  group,
  kind: 'text',
  filterable: o.filterable ?? true,
  better: o.better,
  sortOrder: ++order,
});

const weight = () => num('weight', 'Weight', 'Dimensions', 'kg', 'weight', { better: 'lower' });

export interface CategoryDef {
  slug: CategorySlug;
  name: string;
  description: string;
  sortOrder: number;
  specs: SpecDefinition[];
}

function def(slug: CategorySlug, name: string, description: string, sortOrder: number, specs: () => SpecDefinition[]): CategoryDef {
  order = 0; // sort order restarts for every category
  return { slug, name, description, sortOrder, specs: specs() };
}

export const CATEGORIES: CategoryDef[] = [
  def('drills', 'Drills & drivers', 'Drill drivers, hammer drills and impact drivers.', 1, () => [
    text('power-source', 'Power source', 'Power'),
    num('voltage', 'Voltage', 'Power', 'V', 'voltage'),
    text('motor', 'Motor', 'Power'),
    num('torque', 'Max torque', 'Performance', 'Nm', 'torque', { better: 'higher' }),
    num('speed', 'No-load speed', 'Performance', 'rpm', 'speed', { better: 'higher' }),
    num('chuck', 'Chuck capacity', 'Performance', 'mm', 'length'),
    num('battery-capacity', 'Battery capacity', 'Battery', 'Ah', 'capacity', { better: 'higher' }),
    num('batteries-included', 'Batteries included', 'Battery', undefined, undefined),
    weight(),
  ]),
  def('saws', 'Saws', 'Mitre, table, reciprocating and chain saws.', 2, () => [
    text('power-source', 'Power source', 'Power'),
    num('voltage', 'Voltage', 'Power', 'V', 'voltage'),
    num('power', 'Power', 'Power', 'W', 'power', { better: 'higher' }),
    num('blade', 'Blade diameter', 'Performance', 'mm', 'length'),
    num('cut-depth', 'Max cutting depth', 'Performance', 'mm', 'length', { better: 'higher' }),
    num('speed', 'No-load speed', 'Performance', 'rpm', 'speed', { better: 'higher' }),
    weight(),
  ]),
  def('grinders', 'Grinders & sanders', 'Angle grinders and sanders.', 3, () => [
    text('power-source', 'Power source', 'Power'),
    num('voltage', 'Voltage', 'Power', 'V', 'voltage'),
    text('motor', 'Motor', 'Power'),
    num('power', 'Power', 'Power', 'W', 'power', { better: 'higher' }),
    num('disc', 'Disc diameter', 'Performance', 'mm', 'length'),
    num('speed', 'No-load speed', 'Performance', 'rpm', 'speed', { better: 'higher' }),
    weight(),
  ]),
  def('power-tools', 'Other power tools', 'Routers, nailers, mixers, demolition hammers and more.', 4, () => [
    text('type', 'Type', 'General'),
    text('power-source', 'Power source', 'Power'),
    num('voltage', 'Voltage', 'Power', 'V', 'voltage'),
    num('power', 'Power', 'Power', 'W', 'power', { better: 'higher' }),
    weight(),
  ]),
  def('blades', 'Blades, discs & abrasives', 'Saw blades, hole saws, cutting discs and abrasives.', 5, () => [
    text('type', 'Type', 'General'),
    num('diameter', 'Diameter', 'Dimensions', 'mm', 'length'),
    num('teeth', 'Teeth', 'Performance', undefined, undefined, { better: 'higher' }),
    num('pack', 'Pack size', 'General', undefined, undefined),
  ]),
  def('bits', 'Drill bits, driver bits & sockets', 'Bits for drilling and driving, socket sets and chisels.', 6, () => [
    text('type', 'Type', 'General'),
    num('diameter', 'Diameter', 'Dimensions', 'mm', 'length'),
    num('length', 'Length', 'Dimensions', 'mm', 'length'),
    num('pack', 'Pack size', 'General', undefined, undefined),
  ]),
  def('fasteners', 'Fasteners', 'Nails, staples and screws.', 7, () => [
    text('type', 'Type', 'General'),
    num('length', 'Length', 'Dimensions', 'mm', 'length'),
    num('diameter', 'Diameter', 'Dimensions', 'mm', 'length'),
    num('pack', 'Pack size', 'General', undefined, undefined),
  ]),
  def('hand-tools', 'Hand tools', 'Pliers, hammers, chisels, knives and wrecking bars.', 8, () => [
    text('type', 'Type', 'General'),
    text('material', 'Material', 'General'),
    num('length', 'Length', 'Dimensions', 'mm', 'length'),
    weight(),
  ]),
  def('measuring', 'Measuring & lasers', 'Lasers, levels and tape measures.', 9, () => [
    text('type', 'Type', 'General'),
    text('laser-colour', 'Laser colour', 'General'),
    num('range', 'Range', 'Performance', 'm', 'distance', { better: 'higher' }),
    num('accuracy', 'Accuracy', 'Performance', 'mm', 'length', { better: 'lower' }),
    num('length', 'Length', 'Dimensions', 'm', 'distance'),
    weight(),
  ]),
  def('batteries', 'Batteries & chargers', 'Batteries for the 12 V, 18 V and 54 V platforms.', 10, () => [
    text('type', 'Type', 'General'),
    num('voltage', 'Voltage', 'Power', 'V', 'voltage'),
    num('capacity', 'Capacity', 'Power', 'Ah', 'capacity', { better: 'higher' }),
    weight(),
  ]),
  def('accessories', 'Accessories & parts', 'Guards, paddles, attachments and other parts.', 11, () => [
    text('type', 'Type', 'General'),
    weight(),
  ]),
];

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));
