#!/usr/bin/env node
/**
 * Writes the land outlines the spinning landing logo turns (components/brand/GlobeLogo.tsx):
 *
 *   node scripts/brand/build-globe-data.mjs
 *
 * Source: Natural Earth 1:110m land (public domain), scripts/brand/data/land-110m.json,
 * the same map scripts/brand/build-logo.mjs draws the still logo from.
 * Output: lib/brand/globeLand.json — a list of rings, each a flat list of
 * [lon×10, lat×10, lon×10, lat×10, …] integers. Points closer than 0.8° to the
 * previous one are dropped: at the logo's 100-unit globe radius that is about
 * 1.4 units, the same detail build-logo.mjs keeps.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
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
/** Angle between two points on the sphere, in degrees. */
function arc([lon1, lat1], [lon2, lat2]) {
  const s = Math.sin(lat1 * rad) * Math.sin(lat2 * rad) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lon2 - lon1) * rad);
  return Math.acos(Math.min(1, Math.max(-1, s))) / rad;
}

const MIN_STEP = 0.8;
const polygons = topo.objects.land.geometries.flatMap((g) => (g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []));
const rings = [];
for (const polygon of polygons) {
  for (const indexes of polygon) {
    const kept = [];
    for (const p of ring(indexes)) {
      const last = kept[kept.length - 1];
      if (!last || arc(last, p) >= MIN_STEP) kept.push(p);
    }
    if (kept.length < 3) continue;
    rings.push(kept.flatMap(([lon, lat]) => [Math.round(lon * 10), Math.round(lat * 10)]));
  }
}

const file = path.join(ROOT, 'lib/brand/globeLand.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(rings) + '\n');
const points = rings.reduce((n, r) => n + r.length / 2, 0);
console.log(`globe land written: ${rings.length} rings, ${points} points, ${fs.statSync(file).size} bytes`);
