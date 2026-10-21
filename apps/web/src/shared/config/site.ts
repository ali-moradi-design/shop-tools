export const SITE = {
  name: 'Toolbench Supply Co.',
  legalName: 'Toolbench Supply Co.',
  description:
    'Power tools, hand tools and accessories with the technical specs up front: filter by torque, voltage or size in your units, compare up to four tools, see stock per warehouse.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
};

/** Warehouses the demo ships from (the API is the source of truth; this is only a display fallback). */
export const WAREHOUSE_NAMES: Record<string, string> = { BER: 'Berlin', HAM: 'Hamburg', MUC: 'Munich' };

/** A product photo that stands for each category on the home page and in menus. */
export const CATEGORY_IMAGES: Record<string, string> = {
  drills: '/catalog/dcd805e2t-gb.webp',
  saws: '/catalog/dws780-gb.webp',
  grinders: '/catalog/dcg405p2-gb.webp',
  'power-tools': '/catalog/dwe46150-xj.webp',
  blades: '/catalog/dt1957-qz.webp',
  bits: '/catalog/dt71507-qz.webp',
  fasteners: '/catalog/dwht0-70276.webp',
  'hand-tools': '/catalog/dwht0-70276.webp',
  measuring: '/catalog/dce088d1g-gb.webp',
  batteries: '/catalog/dcbp518-xj.webp',
  accessories: '/catalog/dt83001-qz.webp',
};
