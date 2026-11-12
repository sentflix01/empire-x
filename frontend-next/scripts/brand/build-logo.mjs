#!/usr/bin/env node
/**
 * Builds the vector logo (docs/brand/BRAND_BOOK.md): the network of businesses
 * over the globe, white on brand blue. Every other logo file comes from these.
 *
 *   node scripts/brand/build-logo.mjs && node scripts/brand/render-icons.mjs
 *
 * Writes (names from lib/brandAssets.ts; a changed logo gets new names):
 *   public/brand/nodbusiness-icon-v3.svg          standard icon (light and dark backgrounds)
 *   public/brand/nodbusiness-icon-on-blue-v3.svg  white ring around the disc, for blue backgrounds
 *   public/brand/nodbusiness-icon-small-v3.svg    24 px and below: bolder lines, larger boxes
 *   public/brand/nodbusiness-icon-on-blue-small-v3.svg  both of the above
 *   public/brand/nodbusiness-logo-v3.svg          wordmark with the icon as the "o" (light backgrounds)
 *   public/brand/nodbusiness-logo-white-v3.svg    wordmark for dark backgrounds
 *
 * Continents: Natural Earth 1:110m land (public domain), scripts/brand/data/land-110m.json.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const out = (f) => path.join(ROOT, f);
const BLUE = '#2563eb';
const C = 140; // canvas 280 × 280, centre 140
const R = 100; // globe radius
// View centre, matching the intro video: the Americas left, Africa and Europe right.
const LON0 = -20, LAT0 = 12;

// ── Continents: decode TopoJSON, project orthographically ─────────────────────
const topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/brand/data/land-110m.json'), 'utf8'));
const [sx, sy] = topo.transform.scale;
const [tx, ty] = topo.transform.translate;
const arcs = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
});
const arcPoints = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
const ring = (indexes) => indexes.flatMap((i, k) => (k ? arcPoints(i).slice(1) : arcPoints(i)));

const rad = Math.PI / 180;
const sinP0 = Math.sin(LAT0 * rad), cosP0 = Math.cos(LAT0 * rad);
function project([lon, lat]) {
  const l = (lon - LON0) * rad, p = lat * rad;
  const cosc = sinP0 * Math.sin(p) + cosP0 * Math.cos(p) * Math.cos(l);
  let x = Math.cos(p) * Math.sin(l);
  let y = cosP0 * Math.sin(p) - sinP0 * Math.cos(p) * Math.cos(l);
  if (cosc < 0) { const n = Math.hypot(x, y) || 1; x /= n; y /= n; } // far side: pinned to the rim
  return [C + R * x, C - R * y, cosc >= 0];
}

const polygons = topo.objects.land.geometries.flatMap((g) => (g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []));
const parts = [];
for (const polygon of polygons) {
  for (const indexes of polygon) {
    const pts = ring(indexes).map(project);
    if (!pts.some((p) => p[2])) continue; // entirely on the far side
    const kept = [];
    for (const p of pts) {
      const last = kept[kept.length - 1];
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 1.4) kept.push(p);
    }
    if (kept.length < 3) continue;
    parts.push('M' + kept.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z');
  }
}
const LAND = parts.join('');

// ── Network: eight nodes on the ring ──────────────────────────────────────────
const node = (k) => [C + R * Math.sin((k * Math.PI) / 4), C - R * Math.cos((k * Math.PI) / 4)];
const EDGES = [[0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [2, 4], [2, 5], [2, 6], [2, 7], [3, 5], [3, 6], [3, 7], [4, 6], [4, 7], [5, 7]];
// At 24 px and below only the eight-point star stays readable.
const STAR = [[0, 3], [0, 5], [1, 4], [1, 6], [2, 5], [2, 7], [3, 6], [4, 7]];
const f = (n) => n.toFixed(1);

function icon({ small = false } = {}) {
  const line = small ? 7 : 1.6;
  const ringW = small ? 9 : 3;
  const bw = small ? 50 : 34, bh = small ? 36 : 24;
  const land = small ? 0.5 : 0.5;
  const lines = (small ? STAR : EDGES).map(([a, b]) => { const [x1, y1] = node(a), [x2, y2] = node(b); return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`; }).join('');
  const boxes = Array.from({ length: 8 }, (_, k) => {
    const [x, y] = node(k);
    return `<rect x="${f(x - bw / 2)}" y="${f(y - bh / 2)}" width="${bw}" height="${bh}" rx="${small ? 7 : 4.5}" fill="#fff"/>`
      + `<rect x="${f(x - bw / 2 + bw * 0.2)}" y="${f(y - bh / 2 + bh * 0.2)}" width="${f(bw * 0.32)}" height="${f(bh * 0.2)}" rx="1.2" fill="${BLUE}"/>`;
  }).join('');
  return `<defs><radialGradient id="nb-face" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#5b8ff7"/><stop offset="1" stop-color="#2f6cf0"/></radialGradient>`
    + `<clipPath id="nb-globe"><circle cx="${C}" cy="${C}" r="${R}"/></clipPath></defs>`
    + `<circle cx="${C}" cy="${C}" r="${C}" fill="${BLUE}"/>`
    + `<circle cx="${C}" cy="${C}" r="${R}" fill="url(#nb-face)"/>`
    + `<path d="${LAND}" fill="#fff" fill-opacity="${land}" clip-path="url(#nb-globe)"/>`
    + `<g stroke="#fff" stroke-opacity="${small ? 0.9 : 0.75}" stroke-width="${line}" stroke-linecap="round" fill="none">${lines}</g>`
    + `<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#fff" stroke-width="${ringW}"/>`
    + boxes;
}

const svg = (body, label = 'Nodbusiness') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" role="img" aria-label="${label}">${body}</svg>\n`;
// White ring version: brand blue rim, white ring, then the icon scaled inside.
const ringed = (opts) => `<circle cx="${C}" cy="${C}" r="${C}" fill="${BLUE}"/><circle cx="${C}" cy="${C}" r="128" fill="#fff"/>`
  + `<g transform="translate(${C} ${C}) scale(${(118 / C).toFixed(4)}) translate(-${C} -${C})">${icon(opts)}</g>`;
const onBlue = ringed();

fs.writeFileSync(out('public/brand/nodbusiness-icon-v3.svg'), svg(icon()));
fs.writeFileSync(out('public/brand/nodbusiness-icon-on-blue-v3.svg'), svg(onBlue));
fs.writeFileSync(out('public/brand/nodbusiness-icon-small-v3.svg'), svg(icon({ small: true })));
fs.writeFileSync(out('public/brand/nodbusiness-icon-on-blue-small-v3.svg'), svg(ringed({ small: true })));

// ── Wordmarks: the icon takes the place of the "o" ────────────────────────────
// Letters are text (Poppins, Arial Black fallback); the "o" sits where the old mark was.
function wordmark(fill) {
  const o = 140; // icon size in wordmark units, centred on the old "o" (262.2, 137)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1486 225" role="img" aria-label="Nodbusiness">`
    + `<style>.w{font-family:Poppins,'Arial Black',Arial,Helvetica,sans-serif}</style>`
    + `<text x="40" y="195" class="w" font-size="205" font-weight="700" fill="${fill}" textLength="154" lengthAdjust="spacingAndGlyphs">N</text>`
    + `<svg x="${f(262.2 - o / 2)}" y="${f(137 - o / 2)}" width="${o}" height="${o}" viewBox="0 0 280 280">${fill === '#ffffff' ? onBlue : icon()}</svg>`
    + `<text x="330.2" y="195" class="w" font-size="205" fill="${fill}" textLength="1109" lengthAdjust="spacingAndGlyphs"><tspan font-weight="900">db</tspan><tspan font-weight="700">usiness</tspan></text>`
    + `</svg>\n`;
}
fs.writeFileSync(out('public/brand/nodbusiness-logo-v3.svg'), wordmark('#0f172a'));
fs.writeFileSync(out('public/brand/nodbusiness-logo-white-v3.svg'), wordmark('#ffffff'));

console.log(`logo written: icon, on-blue, small, on-blue small, two wordmarks (${parts.length} land shapes, ${LAND.length} path chars)`);
