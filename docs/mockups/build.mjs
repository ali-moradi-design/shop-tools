// Builds the mockup pages (HTML in ./src) and renders them to PNG with Playwright.
// Run: node docs/mockups/build.mjs   (needs the `playwright` package and a Chromium)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT_DIR ?? here;
const DW = process.env.PROFILE === 'dewalt';
const src = join(OUT, 'src');
mkdirSync(src, { recursive: true });

const NAME = 'TOOLBENCH';

const css = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
:root{--bg:#eef0f2;--panel:#fff;--ink:#0f1114;--steel:#3b4249;--mute:#6a727a;--line:#c8cdd2;--line2:#e1e4e7;--acc:#ffc20e;--acc-ink:#1a1400;--ok:#1d8a4a;--warn:#c76a00;--bad:#c62828}
*{box-sizing:border-box;margin:0;padding:0;border-radius:0}
body{width:1440px;background:var(--bg);color:var(--ink);font:400 14px/1.45 'IBM Plex Sans',sans-serif}
.mono{font-family:'IBM Plex Mono',monospace}
h1,h2,h3,.cond{font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.02em;font-weight:700}
a{color:inherit;text-decoration:none}
.util{background:var(--ink);color:#c9ced3;font:500 11px 'IBM Plex Mono',monospace;letter-spacing:.06em;padding:7px 32px;display:flex;justify-content:space-between}
.util b{color:var(--acc);font-weight:500}
header.top{background:var(--panel);border-bottom:2px solid var(--ink);padding:0 32px;display:flex;align-items:center;gap:28px;height:68px}
.logo{display:flex;align-items:center;gap:10px;font:700 28px 'Barlow Condensed';letter-spacing:.08em}
.logo i{width:26px;height:26px;background:var(--acc);border:2px solid var(--ink);display:block;position:relative}
.logo i:after{content:'';position:absolute;left:4px;right:4px;top:9px;height:4px;background:var(--ink)}
.logo small{font:500 10px 'IBM Plex Mono';color:var(--mute);letter-spacing:.12em;display:block;margin-top:-4px}
.search{flex:1;display:flex;border:2px solid var(--ink);height:42px}
.search span{flex:1;padding:10px 14px;color:var(--mute)}
.search b{background:var(--ink);color:#fff;padding:0 22px;display:grid;place-items:center;font:600 13px 'IBM Plex Mono';letter-spacing:.08em}
.acts{display:flex;gap:22px;font-weight:500}
.acts span{display:flex;align-items:center;gap:6px}
.acts em{font:600 11px 'IBM Plex Mono';background:var(--acc);color:var(--acc-ink);padding:1px 6px;font-style:normal}
nav.cats{background:var(--panel);border-bottom:1px solid var(--line);padding:0 32px;display:flex;font:600 13px 'IBM Plex Sans';text-transform:uppercase;letter-spacing:.05em}
nav.cats a{padding:13px 18px;border-right:1px solid var(--line2)}
nav.cats a:first-child{border-left:1px solid var(--line2)}
nav.cats a.on{background:var(--ink);color:var(--acc)}
.wrap{padding:0 32px}
.crumb{font:500 12px 'IBM Plex Mono';color:var(--mute);padding:16px 0}
.crumb b{color:var(--ink);font-weight:500}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--acc);color:var(--acc-ink);border:2px solid var(--ink);font:700 14px 'Barlow Condensed';letter-spacing:.1em;text-transform:uppercase;padding:0 22px;height:46px}
.btn.dark{background:var(--ink);color:#fff}
.btn.ghost{background:transparent;color:var(--ink)}
.tag{font:600 10px 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;border:1px solid var(--ink)}
.tag.y{background:var(--acc);border-color:var(--ink)}
.dot{display:inline-block;width:9px;height:9px;background:var(--ok);margin-right:6px}
.dot.w{background:var(--warn)}.dot.x{background:var(--bad)}
.ph{background:#fff;position:relative;overflow:hidden}
.ph img{width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply;display:block}
.card{background:var(--panel);border:1px solid var(--line);display:flex;flex-direction:column}
.card .ph{height:210px;border-bottom:1px solid var(--line2)}
.card .b{padding:14px 16px 16px;display:flex;flex-direction:column;gap:10px;flex:1}
.card .nm{font:600 15px/1.25 'IBM Plex Sans'}
.card .sku{font:400 11px 'IBM Plex Mono';color:var(--mute)}
.kv{display:grid;grid-template-columns:1fr auto;font:400 12px 'IBM Plex Mono';border-top:1px solid var(--line2)}
.kv div{padding:5px 0;border-bottom:1px solid var(--line2)}
.kv div:nth-child(even){text-align:right;font-weight:600}
.price{font:700 24px 'Barlow Condensed';letter-spacing:.02em}
.price s{font:400 13px 'IBM Plex Mono';color:var(--mute);margin-left:6px}
.row{display:flex;align-items:center}
.sp{flex:1}
footer{margin-top:56px;background:var(--ink);color:#aeb4ba;padding:36px 32px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;font-size:13px}
footer h4{color:#fff;font:700 15px 'Barlow Condensed';letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
footer p{margin:5px 0}
`;

const P = {
  drill1: 'photos/drill-cordless-1.jpg',
  drill2: 'photos/drill-plain.jpg',
  saw: 'photos/saw-circular.jpg',
  wr1: 'photos/wrench-adjustable-1.jpg',
  wr2: 'photos/wrench-adjustable-2.jpg',
  tape: 'photos/tape-measure.jpg',
  bolts: 'photos/bolts-nuts.jpg',
  pliers: 'photos/pliers.jpg',
  sd: 'photos/screwdriver-set.jpg',
  grinder: 'photos/angle-grinder.jpg',
  caliper: 'photos/caliper.jpg',
  mm: 'photos/multimeter.jpg',
  box: 'photos/toolbox-3.jpg',
  sock: 'photos/socket-set.jpg',
  hero: 'photos/toolbox-3.jpg',
};
if (DW) for (const k of Object.keys(P)) P[k] = `photos/${k}.webp`;

const icon = {
  search: '⌕',
};

function shell(title, active, body, extra = '') {
  const cats = ['Power tools', 'Hand tools', 'Measuring', 'Fasteners', 'Abrasives', 'Safety', 'Storage'];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${css}${extra}</style></head><body>
<div class="util"><span>FREE SHIPPING OVER $150 &nbsp;·&nbsp; SHIPS FROM <b>BERLIN</b> / <b>HAMBURG</b> / <b>MUNICH</b></span><span>DEMO SHOP — PAYMENTS ARE SIMULATED</span></div>
<header class="top"><a class="logo"><i></i><span>${NAME}<small>SUPPLY CO. — TECH SPECS FIRST</small></span></a>
<div class="search"><span>Search tools, SKUs or specs — e.g. “18 V brushless 60 Nm”</span><b>SEARCH</b></div>
<div class="acts"><span>Account</span><span>Compare <em>3</em></span><span>Cart <em>2</em></span></div></header>
<nav class="cats">${cats.map((c) => `<a class="${c === active ? 'on' : ''}">${c}</a>`).join('')}</nav>
${body}
<footer><div><h4>${NAME} Supply Co.</h4><p>Demo shop for a portfolio. Photos from Wikimedia Commons (credits in the repo). Prices and stock are generated.</p></div>
<div><h4>Shop</h4><p>Power tools</p><p>Hand tools</p><p>Measuring</p></div><div><h4>Help</h4><p>Shipping</p><p>Returns</p><p>Spec guide</p></div><div><h4>Warehouses</h4><p>Berlin · Hamburg · Munich</p></div></footer>
</body></html>`;
}

const products = [
  { n: 'Cordless Drill/Driver 18 V Brushless', sku: 'DRL-18B-60', img: P.drill1, price: '$129.00', old: '$149.00', specs: [['Voltage', '18 V'], ['Torque', '60 Nm'], ['Chuck', '13 mm'], ['Weight', '1.5 kg']], stock: ['ok', 'In stock — 3 warehouses'] },
  { n: 'Compact Drill 14.4 V Li-Ion', sku: 'DRL-14L-38', img: P.drill2, price: '$89.00', specs: [['Voltage', '14.4 V'], ['Torque', '38 Nm'], ['Chuck', '10 mm'], ['Weight', '1.1 kg']], stock: ['ok', 'In stock — 2 warehouses'] },
  { n: 'Hammer Drill 20 V Max Kit', sku: 'DRL-20H-80', img: P.drill1, price: '$179.00', specs: [['Voltage', '20 V'], ['Torque', '80 Nm'], ['Chuck', '13 mm'], ['Weight', '1.9 kg']], stock: ['w', 'Low — Berlin only (4)'] },
  { n: 'Circular Saw 165 mm 1200 W', sku: 'SAW-165-12', img: P.saw, price: '$119.00', specs: [['Power', '1200 W'], ['Blade', '165 mm'], ['Depth @90°', '57 mm'], ['Weight', '3.6 kg']], stock: ['ok', 'In stock — 3 warehouses'] },
  { n: 'Angle Grinder 125 mm 900 W', sku: 'GRD-125-09', img: P.grinder, price: '$59.00', specs: [['Power', '900 W'], ['Disc', '125 mm'], ['Speed', '11 000 rpm'], ['Weight', '1.8 kg']], stock: ['ok', 'In stock — 3 warehouses'] },
  { n: 'Adjustable Wrench 250 mm CrV', sku: 'WRN-ADJ-250', img: P.wr1, price: '$14.50', specs: [['Length', '250 mm'], ['Jaw opening', '30 mm'], ['Material', 'Cr-V steel'], ['Weight', '0.42 kg']], stock: ['ok', 'In stock — 3 warehouses'] },
  { n: 'Digital Caliper 150 mm', sku: 'MSR-CAL-150', img: P.caliper, price: '$24.90', specs: [['Range', '0–150 mm'], ['Resolution', '0.01 mm'], ['Accuracy', '±0.03 mm'], ['Weight', '0.12 kg']], stock: ['w', 'Low — Hamburg only (3)'] },
  { n: 'Socket Set 1/4″ 40-piece', sku: 'SKT-14-40', img: P.sock, price: '$39.00', specs: [['Drive', '1/4″'], ['Pieces', '40'], ['Range', '4–14 mm'], ['Weight', '1.6 kg']], stock: ['x', 'Out of stock — back 28 Oct'] },
  { n: 'Digital Multimeter CAT III 600 V', sku: 'MSR-DMM-600', img: P.mm, price: '$34.00', specs: [['Max voltage', '600 V'], ['Display', '4000 counts'], ['Category', 'CAT III'], ['Weight', '0.35 kg']], stock: ['ok', 'In stock — 2 warehouses'] },
];

if (DW) {
  Object.assign(products[3], { n: 'Mitre Saw 305 mm 1675 W', sku: 'SAW-305-16', specs: [['Power', '1675 W'], ['Blade', '305 mm'], ['Cut @90°', '115 mm'], ['Weight', '17.2 kg']] });
  Object.assign(products[6], { n: 'Cross Line Laser 12 V Green', sku: 'MSR-LSR-12', specs: [['Range', '30 m'], ['Accuracy', '±3 mm @ 10 m'], ['Lines', '2'], ['Weight', '0.55 kg']] });
  Object.assign(products[8], { n: 'Linesman Pliers 200 mm', sku: 'HND-PLR-200', img: P.pliers, price: '$18.90', specs: [['Length', '200 mm'], ['Cut capacity', '3.4 mm'], ['Material', 'Steel'], ['Weight', '0.58 kg']] });
}

function card(p, { compare = false, checked = false } = {}) {
  return `<div class="card"><div class="ph">${p.img ? `<img src="${p.img}">` : ''}${p.tag ? `<span class="tag y" style="position:absolute;left:12px;top:12px">${p.tag}</span>` : ''}</div>
<div class="b"><div class="sku">${p.sku}</div><div class="nm">${p.n}</div>
<div class="kv">${p.specs.map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join('')}</div>
<div class="row"><div class="price">${p.price}${p.old ? `<s>${p.old}</s>` : ''}</div><span class="sp"></span>${compare ? `<span class="mono" style="font-size:12px"><span style="display:inline-block;width:14px;height:14px;border:2px solid var(--ink);vertical-align:-2px;margin-right:6px;background:${checked ? 'var(--acc)' : '#fff'}"></span>Compare</span>` : ''}</div>
<div style="font-size:12px"><span class="dot ${p.stock[0] === 'ok' ? '' : p.stock[0]}"></span>${p.stock[1]}</div></div></div>`;
}

// ---------- Home ----------
const home = shell('Home', '', `
<section style="display:grid;grid-template-columns:1.05fr 1fr;border-bottom:2px solid var(--ink);background:var(--panel)">
  <div style="padding:64px 48px 56px 32px;display:flex;flex-direction:column;gap:22px;justify-content:center">
    <span class="tag y" style="align-self:flex-start">NEW — FILTER BY REAL SPECS</span>
    <h1 style="font-size:92px;line-height:.92">The right spec.<br>In stock<br>today.</h1>
    <p style="font-size:17px;max-width:520px;color:var(--steel)">Filter by torque, voltage, power or size — with ranges and your units. Compare up to four tools side by side and see what each warehouse has on the shelf.</p>
    <div class="row" style="gap:12px"><a class="btn">Shop power tools →</a><a class="btn ghost">Compare tools</a></div>
    <div class="mono" style="display:flex;gap:26px;font-size:12px;color:var(--steel);margin-top:6px"><span>▪ 320 products</span><span>▪ 8 categories</span><span>▪ 3 warehouses</span></div>
  </div>
  <div class="ph" style="height:560px;border-left:2px solid var(--ink);background:${DW ? '#fff' : '#111'}"><img src="${P.hero}" style="object-fit:${DW ? 'contain' : 'cover'};${DW ? '' : 'mix-blend-mode:normal'}"></div>
</section>
<section class="wrap" style="padding-top:40px">
  <div class="row" style="margin-bottom:16px"><h2 style="font-size:34px">Shop by category</h2><span class="sp"></span><a class="mono" style="font-size:12px">ALL CATEGORIES →</a></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
  ${[['Power tools', P.drill2, 96], ['Hand tools', P.pliers, 74], ['Measuring', DW ? P.tape : P.caliper, 41], ['Drill bits', P.bolts, 63], ['Abrasives', P.grinder, 22], ['Batteries', P.mm, 18], ['Sockets & wrenches', P.sock, 38], ['Accessories', P.box, 28]].map(([t, im, n]) => `<div class="card"><div class="ph" style="height:170px"><img src="${im}"></div><div class="row" style="padding:12px 16px"><h3 style="font-size:22px">${t}</h3><span class="sp"></span><span class="mono" style="font-size:12px;color:var(--mute)">${n}</span></div></div>`).join('')}
  </div>
</section>
<section class="wrap" style="padding-top:44px">
  <div class="row" style="margin-bottom:16px"><h2 style="font-size:34px">Popular right now</h2><span class="sp"></span><a class="mono" style="font-size:12px">VIEW ALL →</a></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${[products[0], products[3], products[4], products[6]].map((p, i) => card({ ...p, tag: i === 0 ? 'BEST SELLER' : i === 2 ? '−10%' : '' })).join('')}</div>
</section>
<section class="wrap" style="padding-top:44px">
  <div style="background:var(--ink);color:#fff;display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;border:2px solid var(--ink)">
    <div style="padding:28px 28px"><h2 style="font-size:34px;color:var(--acc)">Live stock<br>per warehouse</h2><p style="color:#aeb4ba;margin-top:8px;max-width:300px">Every product page shows what each warehouse has right now, so you know where it ships from.</p></div>
    ${[['Berlin', '1 842', 'Same-day dispatch'], ['Hamburg', '1 211', 'Next-day'], ['Munich', '964', 'Next-day']].map(([c, n, s]) => `<div style="padding:28px;border-left:1px solid #2a3037"><div class="mono" style="font-size:12px;color:#aeb4ba">WAREHOUSE</div><div class="cond" style="font-size:40px">${c}</div><div class="mono" style="font-size:26px;color:var(--acc);margin-top:6px">${n}</div><div style="font-size:12px;color:#aeb4ba">units on hand · ${s}</div></div>`).join('')}
  </div>
</section>`);

// ---------- Listing ----------
const slider = (label, lo, hi, a, b, unit, units) => `
<div style="padding:16px 0;border-bottom:1px solid var(--line2)"><div class="row"><b class="cond" style="font-size:16px;letter-spacing:.06em">${label}</b><span class="sp"></span>${units ? `<span class="mono" style="font-size:11px;border:1px solid var(--ink);display:flex">${units.map((u, i) => `<span style="padding:2px 7px;${i === 0 ? 'background:var(--ink);color:#fff' : ''}">${u}</span>`).join('')}</span>` : ''}</div>
<div style="position:relative;height:22px;margin:14px 6px 2px"><div style="position:absolute;top:9px;left:0;right:0;height:4px;background:var(--line)"></div><div style="position:absolute;top:9px;left:${a}%;right:${100 - b}%;height:4px;background:var(--ink)"></div>
<div style="position:absolute;top:2px;left:calc(${a}% - 7px);width:16px;height:18px;background:var(--acc);border:2px solid var(--ink)"></div><div style="position:absolute;top:2px;left:calc(${b}% - 9px);width:16px;height:18px;background:var(--acc);border:2px solid var(--ink)"></div></div>
<div class="row mono" style="font-size:12px;gap:8px;margin-top:8px"><span style="border:1px solid var(--line);padding:4px 8px;flex:1;background:#fff">${lo} ${unit}</span><span>–</span><span style="border:1px solid var(--line);padding:4px 8px;flex:1;background:#fff;text-align:right">${hi} ${unit}</span></div></div>`;
const checks = (label, items) => `<div style="padding:16px 0;border-bottom:1px solid var(--line2)"><b class="cond" style="font-size:16px;letter-spacing:.06em">${label}</b>${items.map(([t, n, on]) => `<div class="row" style="margin-top:8px;font-size:13px"><span style="width:15px;height:15px;border:2px solid var(--ink);margin-right:9px;background:${on ? 'var(--acc)' : '#fff'};display:grid;place-items:center;font-size:10px;font-weight:700">${on ? '✓' : ''}</span>${t}<span class="sp"></span><span class="mono" style="color:var(--mute);font-size:11px">${n}</span></div>`).join('')}</div>`;

const listing = shell('Cordless drills', 'Power tools', `
<div class="wrap"><div class="crumb">Home / Power tools / <b>Cordless drills</b></div>
<div class="row" style="align-items:flex-end;margin-bottom:14px"><h1 style="font-size:54px;line-height:1">Cordless drills</h1><span class="mono" style="margin:0 0 8px 16px;color:var(--mute)">48 results</span><span class="sp"></span>
<span class="mono" style="font-size:12px;margin-bottom:8px">VIEW &nbsp;<b style="background:var(--ink);color:#fff;padding:5px 10px">GRID</b><b style="border:1px solid var(--ink);padding:4px 10px">TABLE</b> &nbsp;&nbsp; SORT <b style="border:1px solid var(--ink);padding:4px 10px;background:#fff">Torque: high → low ▾</b></span></div>
<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:18px">${['Voltage: 18 V ✕', 'Torque: 40–100 Nm ✕', 'Brushless ✕', 'In stock ✕'].map((t) => `<span class="mono" style="font-size:12px;background:var(--ink);color:#fff;padding:5px 10px">${t}</span>`).join('')}<span class="mono" style="font-size:12px;text-decoration:underline;margin-left:6px">Clear all</span></div>
<div style="display:grid;grid-template-columns:290px 1fr;gap:28px;align-items:start">
<aside class="card" style="padding:4px 18px 10px">
${checks('Availability', [['In stock now', 41, true], ['Berlin warehouse', 33, false], ['Hamburg warehouse', 27, false], ['Munich warehouse', 19, false]])}
${slider('Price', '$40', '$320', 12, 62, '', null).replace(/ <\/span>/g, '</span>')}
${checks('Voltage', [['12 V', 6, false], ['14.4 V', 9, false], ['18 V', 21, true], ['20 V Max', 12, false]])}
${slider('Torque', 40, 100, 25, 71, 'Nm', ['Nm', 'in·lb'])}
${slider('Chuck size', 10, 13, 0, 100, 'mm', ['mm', 'in'])}
${slider('Weight', '1.1', '2.4', 8, 70, 'kg', ['kg', 'lb'])}
${checks('Motor', [['Brushless', 29, true], ['Brushed', 19, false]])}
${checks('Battery capacity', [['2.0 Ah', 14, false], ['4.0 Ah', 22, false], ['5.0 Ah', 12, false]])}
</aside>
<div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
${[products[0], { ...products[2], img: P.sd }, products[1], { ...products[0], img: P.drill2, n: 'Drill/Driver 18 V Compact Kit', sku: 'DRL-18C-52', price: '$99.00', specs: [['Voltage', '18 V'], ['Torque', '52 Nm'], ['Chuck', '13 mm'], ['Weight', '1.3 kg']] }, { ...products[1], img: P.sd, n: 'Impact Driver 18 V Brushless', sku: 'IMP-18B-180', price: '$109.00', specs: [['Voltage', '18 V'], ['Torque', '180 Nm'], ['Hex', '1/4″'], ['Weight', '1.2 kg']] }, { ...products[2], n: 'Hammer Drill 18 V 2×4.0 Ah', sku: 'DRL-18H-70', price: '$159.00', specs: [['Voltage', '18 V'], ['Torque', '70 Nm'], ['Chuck', '13 mm'], ['Weight', '1.7 kg']] }].map((p, i) => card(p, { compare: true, checked: i < 3 })).join('')}
</div>
<div class="row mono" style="justify-content:center;gap:6px;margin-top:26px">${['‹', '1', '2', '3', '4', '5', '›'].map((x, i) => `<span style="border:1px solid var(--ink);width:36px;height:36px;display:grid;place-items:center;background:${i === 1 ? 'var(--ink)' : '#fff'};color:${i === 1 ? '#fff' : 'var(--ink)'}">${x}</span>`).join('')}</div>
</div></div></div>
<div style="position:fixed;left:0;bottom:0;height:96px;background:var(--ink);color:#fff;border-top:3px solid var(--acc);display:flex;align-items:center;gap:18px;padding:0 32px;width:1440px">
<b class="cond" style="font-size:22px;letter-spacing:.08em">Compare <span class="mono" style="color:var(--acc)">3 / 4</span></b>
${[P.drill1, P.drill2, P.drill1].map((im) => `<div class="ph" style="width:70px;height:70px;border:1px solid #444"><img src="${im}"></div>`).join('')}<div style="width:70px;height:70px;border:1px dashed #666;display:grid;place-items:center;color:#777;font-size:26px">+</div>
<span class="sp"></span><span class="mono" style="font-size:12px;color:#aeb4ba">Same category only</span><a class="btn">Compare now →</a></div>
`);

// ---------- Product ----------
const specGroup = (title, rows) => `<tr><th colspan="2" class="cond" style="text-align:left;background:var(--ink);color:var(--acc);padding:8px 16px;font-size:16px;letter-spacing:.1em">${title}</th></tr>${rows.map(([k, v], i) => `<tr style="background:${i % 2 ? '#f6f7f8' : '#fff'}"><td style="padding:9px 16px;width:42%;color:var(--steel)">${k}</td><td class="mono" style="padding:9px 16px;font-weight:600">${v}</td></tr>`).join('')}`;

const product = shell('Cordless drill', 'Power tools', `
<div class="wrap"><div class="crumb">Home / Power tools / Cordless drills / <b>DRL-18B-60</b></div>
<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:36px">
<div><div class="card"><div class="ph" style="height:560px"><img src="${P.drill1}"><span class="tag y" style="position:absolute;left:14px;top:14px">BEST SELLER</span></div></div>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:10px">${[P.drill1, P.drill2, P.drill1, P.sd, P.box].map((im, i) => `<div class="card ph" style="height:96px;border:${i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)'}"><img src="${im}"></div>`).join('')}</div></div>
<div style="display:flex;flex-direction:column;gap:16px">
<div class="mono" style="font-size:12px;color:var(--mute)">SKU DRL-18B-60 &nbsp;·&nbsp; BRAND: ORION</div>
<h1 style="font-size:50px;line-height:1">Cordless Drill/Driver 18 V Brushless</h1>
<div class="row" style="gap:10px"><span style="color:var(--warn);letter-spacing:2px">★★★★★</span><span class="mono" style="font-size:12px">4.7 · 86 reviews</span></div>
<div class="row" style="align-items:baseline;gap:10px"><div class="price" style="font-size:46px">$129.00</div><s class="mono" style="color:var(--mute)">$149.00</s><span class="tag y">SAVE $20</span></div>
<div class="kv" style="border-top:2px solid var(--ink)">${[['Voltage', '18 V'], ['Max torque', '60 Nm'], ['Chuck', '13 mm keyless'], ['Speed', '0–1 800 rpm'], ['Weight', '1.5 kg']].map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join('')}</div>
<div><b class="cond" style="font-size:16px;letter-spacing:.06em">KIT</b><div class="row" style="gap:8px;margin-top:6px">${['Body only', '1 × 2.0 Ah', '2 × 4.0 Ah'].map((t, i) => `<span class="mono" style="font-size:12px;border:2px solid var(--ink);padding:9px 14px;background:${i === 2 ? 'var(--ink)' : '#fff'};color:${i === 2 ? '#fff' : 'var(--ink)'}">${t}</span>`).join('')}</div></div>
<div class="card"><div class="row" style="padding:10px 16px;border-bottom:1px solid var(--line2)"><b class="cond" style="font-size:16px;letter-spacing:.06em">STOCK BY WAREHOUSE</b><span class="sp"></span><span class="mono" style="font-size:11px;color:var(--mute)">UPDATED NOW</span></div>
${[['Berlin', 'Same-day dispatch', 12, ''], ['Hamburg', 'Next-day', 4, 'w'], ['Munich', 'Back in stock 28 Oct', 0, 'x']].map(([c, s, n, k]) => `<div class="row" style="padding:10px 16px;border-bottom:1px solid var(--line2)"><span class="dot ${k}"></span><b style="width:90px">${c}</b><span style="color:var(--steel);font-size:12px">${s}</span><span class="sp"></span><span class="mono" style="font-weight:600">${n > 0 ? n + ' units' : 'Out of stock'}</span></div>`).join('')}</div>
<div class="row" style="gap:10px"><span class="mono" style="border:2px solid var(--ink);height:46px;width:120px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:#fff"><span>−</span><b>1</b><span>+</span></span><a class="btn" style="flex:1">Add to cart</a><a class="btn ghost">＋ Compare</a></div>
<div class="mono" style="font-size:12px;color:var(--steel)">▪ Ships from Berlin &nbsp;▪ 30-day returns &nbsp;▪ 2-year warranty</div>
</div></div>
<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:28px;margin-top:44px;align-items:start">
<div><div class="row" style="margin-bottom:10px"><h2 style="font-size:32px">Technical specifications</h2><span class="sp"></span><span class="mono" style="font-size:11px;border:1px solid var(--ink);display:flex"><span style="padding:3px 9px;background:var(--ink);color:#fff">METRIC</span><span style="padding:3px 9px">IMPERIAL</span></span></div>
<table style="width:100%;border-collapse:collapse;border:1px solid var(--line);font-size:14px">
${specGroup('Performance', [['Voltage', '18 V'], ['Max torque (hard / soft)', '60 / 30 Nm'], ['No-load speed', '0–500 / 0–1 800 rpm'], ['Chuck capacity', '1.5–13 mm'], ['Motor', 'Brushless']])}
${specGroup('Battery', [['Capacity', '4.0 Ah'], ['Type', 'Li-Ion'], ['Charge time', '60 min']])}
${specGroup('Dimensions', [['Length', '195 mm'], ['Weight (with battery)', '1.5 kg']])}
</table></div>
<div class="card" style="padding:18px 20px"><h2 style="font-size:26px">Customer reviews</h2><div class="row" style="gap:14px;margin:10px 0"><div class="price" style="font-size:54px">4.7</div><div><span style="color:var(--warn)">★★★★★</span><div class="mono" style="font-size:12px;color:var(--mute)">86 reviews</div></div></div>
${[[5, 78], [4, 14], [3, 5], [2, 2], [1, 1]].map(([s, w]) => `<div class="row mono" style="font-size:11px;gap:8px;margin:3px 0"><span>${s}★</span><div style="flex:1;height:8px;background:var(--line2)"><div style="width:${w}%;height:100%;background:var(--ink)"></div></div><span>${w}%</span></div>`).join('')}
<div style="border-top:1px solid var(--line2);margin-top:14px;padding-top:12px"><b>Plenty of torque for the size</b><div class="mono" style="font-size:11px;color:var(--mute)">Karl M. · verified purchase</div><p style="margin-top:4px;color:var(--steel)">Drives 80 mm screws into hardwood without bogging down. Battery lasts a full day of light work.</p></div></div>
</div></div>`);

// ---------- Cart ----------
const cartLine = (p, qty, from, line) => `<div style="display:grid;grid-template-columns:96px 1fr 120px 110px 30px;gap:16px;align-items:center;padding:16px 18px;border-bottom:1px solid var(--line2)">
<div class="ph" style="height:80px;border:1px solid var(--line2)"><img src="${p.img}"></div><div><div class="mono" style="font-size:11px;color:var(--mute)">${p.sku}</div><b>${p.n}</b><div style="font-size:12px;color:var(--steel);margin-top:3px"><span class="dot ${from[1]}"></span>${from[0]}</div></div>
<span class="mono" style="border:2px solid var(--ink);height:38px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:#fff"><span>−</span><b>${qty}</b><span>+</span></span><b class="price" style="text-align:right;font-size:22px">${line}</b><span class="mono" style="color:var(--mute)">✕</span></div>`;
const cart = shell('Cart', '', `
<div class="wrap"><div class="crumb">Home / <b>Cart</b></div><h1 style="font-size:54px;line-height:1;margin-bottom:18px">Your cart <span class="mono" style="font-size:16px;color:var(--mute);vertical-align:middle">3 items</span></h1>
<div style="display:grid;grid-template-columns:1fr 400px;gap:28px;align-items:start">
<div class="card"><div style="display:grid;grid-template-columns:96px 1fr 120px 110px 30px;gap:16px;padding:10px 18px;background:var(--ink);color:#fff" class="mono"><span style="font-size:11px">ITEM</span><span></span><span style="font-size:11px">QTY</span><span style="font-size:11px;text-align:right">TOTAL</span><span></span></div>
${cartLine(products[0], 1, ['Ships from Berlin — 12 available', ''], '$129.00')}${cartLine(products[6], 2, ['Hamburg — 3 available (low)', 'w'], '$49.80')}${cartLine(products[5], 1, ['Ships from Berlin — 31 available', ''], '$14.50')}
<div class="row mono" style="padding:14px 18px;font-size:12px;color:var(--steel)">▪ Your order ships in 2 parcels: Berlin (2 items), Hamburg (1 item)</div></div>
<div class="card" style="padding:20px"><h2 style="font-size:28px;margin-bottom:12px">Order summary</h2>
<div class="kv" style="font-size:13px">${[['Subtotal', '$193.30'], ['Discount WELCOME10', '−$19.33'], ['Shipping', 'Free'], ['Tax (incl.)', '$27.77']].map(([k, v]) => `<div>${k}</div><div>${v}</div>`).join('')}</div>
<div class="row" style="margin:14px 0"><b class="cond" style="font-size:20px;letter-spacing:.08em">TOTAL</b><span class="sp"></span><span class="price" style="font-size:38px">$173.97</span></div>
<div class="row" style="gap:8px;margin-bottom:14px"><span class="mono" style="flex:1;border:2px solid var(--ink);padding:10px 12px;background:#fff;font-size:13px">WELCOME10</span><a class="btn dark" style="height:44px">Apply</a></div>
<a class="btn" style="width:100%;height:54px;font-size:18px">Checkout →</a><div class="mono" style="font-size:11px;color:var(--mute);margin-top:10px;text-align:center">Demo payment gateway — no real cards</div></div>
</div></div>`);

// ---------- Compare ----------
const cmpCols = [
  { ...products[0], n: 'Drill/Driver 18 V Brushless', best: { torque: 0 } },
  { ...products[2], n: 'Hammer Drill 20 V Max Kit' },
  { ...products[1], n: 'Compact Drill 14.4 V' },
  { ...products[0], n: 'Drill/Driver 18 V Compact', sku: 'DRL-18C-52', price: '$99.00', old: '' },
];
const cmpRows = [
  ['Performance', null],
  ['Voltage', ['18 V', '20 V', '14.4 V', '18 V'], 1],
  ['Max torque', ['60 Nm', '80 Nm', '38 Nm', '52 Nm'], 1],
  ['No-load speed', ['1 800 rpm', '2 000 rpm', '1 500 rpm', '1 800 rpm'], 1],
  ['Chuck', ['13 mm', '13 mm', '10 mm', '13 mm'], -1],
  ['Motor', ['Brushless', 'Brushless', 'Brushed', 'Brushless'], -1],
  ['Battery', null],
  ['Capacity', ['4.0 Ah ×2', '4.0 Ah ×2', '2.0 Ah ×1', '2.0 Ah ×2'], 0],
  ['Charge time', ['60 min', '55 min', '90 min', '60 min'], 2],
  ['Size', null],
  ['Weight', ['1.5 kg', '1.9 kg', '1.1 kg', '1.3 kg'], 2],
  ['Length', ['195 mm', '210 mm', '176 mm', '184 mm'], 2],
  ['Stock', null],
  ['Berlin', ['12', '4', '9', '20'], -1],
  ['Hamburg', ['4', '0', '3', '7'], -1],
  ['Munich', ['0', '0', '5', '11'], -1],
];
const bestIdx = { 'Max torque': 1, Voltage: 1, 'No-load speed': 1, 'Charge time': 1, Weight: 2, Length: 2, Capacity: 0 };
const compare = shell('Compare', 'Power tools', `
<div class="wrap"><div class="crumb">Home / Power tools / <b>Compare</b></div>
<div class="row" style="align-items:flex-end;margin-bottom:16px"><h1 style="font-size:54px;line-height:1">Compare tools</h1><span class="mono" style="margin:0 0 8px 16px;color:var(--mute)">4 / 4 · Cordless drills</span><span class="sp"></span>
<span class="mono" style="font-size:12px;margin-bottom:8px;display:flex;align-items:center;gap:8px"><span style="width:15px;height:15px;border:2px solid var(--ink);background:var(--acc);display:grid;place-items:center;font-size:10px;font-weight:700">✓</span>Show differences only <b style="border:1px solid var(--ink);padding:5px 10px;margin-left:14px">Copy link</b></span></div>
<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line)">
<tr><td style="width:200px;border-right:1px solid var(--line2);vertical-align:bottom;padding:16px" class="mono"><span style="font-size:11px;color:var(--mute)">SPECIFICATION</span></td>
${cmpCols.map((p, i) => `<td style="width:25%;padding:14px 16px;border-right:1px solid var(--line2);vertical-align:top"><div class="ph" style="height:130px"><img src="${i % 2 ? P.drill2 : P.drill1}"></div><div class="mono" style="font-size:11px;color:var(--mute);margin-top:8px">${p.sku}</div><b>${p.n}</b><div class="row" style="margin-top:6px"><span class="price">${p.price}</span><span class="sp"></span><span class="mono" style="font-size:11px;color:var(--mute)">REMOVE ✕</span></div><a class="btn" style="height:38px;width:100%;margin-top:8px;font-size:13px">Add to cart</a></td>`).join('')}</tr>
${cmpRows.map(([k, vals]) => vals === null
  ? `<tr><td colspan="5" class="cond" style="background:var(--ink);color:var(--acc);padding:7px 16px;font-size:16px;letter-spacing:.1em">${k}</td></tr>`
  : `<tr><td style="padding:10px 16px;border-top:1px solid var(--line2);border-right:1px solid var(--line2);color:var(--steel);position:sticky;left:0">${k}</td>${vals.map((v, i) => `<td class="mono" style="padding:10px 16px;border-top:1px solid var(--line2);border-right:1px solid var(--line2);font-weight:600;background:${bestIdx[k] === i ? '#fff3c4' : 'transparent'}">${v}${bestIdx[k] === i ? ' <span style="font-size:10px;background:var(--ink);color:var(--acc);padding:1px 5px;margin-left:6px">BEST</span>' : ''}${(vals[i] === '0') ? ' <span class="dot x" style="margin-left:6px"></span>' : ''}</td>`).join('')}</tr>`).join('')}
</table><div class="mono" style="font-size:12px;color:var(--steel);margin-top:12px">▪ Yellow cells mark the best value in a row (higher torque, lower weight, shorter charge time). Units follow the unit switch.</div></div>`);

const pages = { home, listing, product, cart, compare };
for (const [name, html] of Object.entries(pages)) writeFileSync(join(src, `${name}.html`), html);

const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
for (const name of Object.keys(pages)) {
  const page = await browser.newPage({ viewport: { width: 1440, height: name === 'listing' ? 1300 : 900 } });
  await page.goto(`file://${join(src, `${name}.html`)}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 86, fullPage: name !== 'listing' });
  await page.close();
  console.log('rendered', name);
}
await browser.close();
