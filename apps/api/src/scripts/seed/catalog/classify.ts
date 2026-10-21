export const CATEGORY_SLUGS = [
  'drills',
  'saws',
  'grinders',
  'power-tools',
  'blades',
  'bits',
  'fasteners',
  'hand-tools',
  'measuring',
  'batteries',
  'accessories',
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/**
 * Decides the category of a product from its name. The first matching rule wins, so
 * the order matters: a "Mitre Saw Blade" is a blade before it is a saw.
 */
const RULES: [CategorySlug, RegExp][] = [
  // parts that only fit another tool
  ['accessories', /\b(guard|shroud|holster|apron|nose ?piece|contact trip|attachment|adaptor|adapter|mixer paddle|dust bag|carry bag|spare|replacement|chuck key|trolley)\b/i],
  ['blades', /\b(blades?|hole ?saw|cutting (wheel|disc)|flap disc|grinding (wheel|disc)|bonded abrasive|sanding|ros sheet|saw chain)\b/i],
  ['fasteners', /\b(nails?|staples?|screws?|brads?|anchors?|rivets?)\b(?!\s*(set|gun|er))|\bnail set\b/i],
  ['measuring', /\b(tape measure|laser|spirit level|box beam level|level\b|detector|plumb|rangefinder|measuring wheel|\bsquare\b)\b/i],
  ['batteries', /\b(battery|charger)\s*$|\bpowerstack\b[^,]*battery$|^[^,]*\b(compact|extended) battery\b/i],
  ['bits', /\b(drill bits?|driver bits?|bit set|bits?\b|auger|nut driver|socket (set|driver)|impact socket|hex shank|magnetic (screwdriving|bit)|sds[ -]?(plus|max)? ?(chisel|bit)|chisel(?! set))\b|\bsds (plus|max)\b.*\b(bit|chisel)\b/i],
  ['grinders', /\b(grinder|sander|polisher)\b/i],
  ['saws', /\b(mitre saw|miter saw|circular saw|table saw|jigsaw|reciprocating saw|combination saw|chopsaw|chop saw|pole saw|band ?saw|chainsaw|plunge saw|track saw)\b|\b\d+\s?W\b.*\bsaw\b/i],
  ['drills', /\b(drill ?driver|hammer drill|impact driver|impact wrench|combi(?: drill)?|percussion drill|rotary hammer|sds (plus|max) hammer|screwdriver)\b.*\b(\d+\s?V|\d+\s?W|xr|cordless|corded|brushless|tool only)\b|\b(percussion|hammer) drill\b|\bdrill\b(?!.*\bbit)|\bsds\b.*\bhammer\b/i],
  ['power-tools', /\b(router|nailer|mixer|trimmer|mower|thicknesser|planer|extractor|pruner|multi[- ]?tool|vacuum|blower|heat gun|radio|jobsite|hedge|strimmer|pressure washer|compressor|generator|fan|demolition hammer|breaker|stapler|tacker|chalk line)\b.*|^\s*\d+\s?(V|W)\b/i],
  ['hand-tools', /./],
];

export function classify(name: string): CategorySlug {
  for (const [slug, rule] of RULES) if (rule.test(name)) return slug;
  return 'hand-tools';
}
