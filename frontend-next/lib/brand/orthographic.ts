/**
 * Orthographic projection for the brand globe: the same maths as
 * scripts/brand/build-logo.mjs `project()`, so the landing logo
 * (components/brand/GlobeLogo.tsx) draws exactly the still logo when it rests.
 */
export const GLOBE_C = 140; // canvas 280 × 280, centre 140
export const GLOBE_R = 100; // globe radius
/** View centre of the still logo: the Americas left, Africa and Europe right. */
export const GLOBE_LON0 = -20;
export const GLOBE_LAT0 = 12;

const rad = Math.PI / 180;

/**
 * Projects [lon, lat] (degrees) seen from above (lon0, lat0). Points on the far
 * side are pinned to the rim, as in build-logo.mjs; `visible` says whether the
 * point faces the viewer.
 */
export function project(lon: number, lat: number, lon0: number, lat0 = GLOBE_LAT0): [number, number, boolean] {
  const l = (lon - lon0) * rad;
  const p = lat * rad;
  const sinP0 = Math.sin(lat0 * rad), cosP0 = Math.cos(lat0 * rad);
  const cosc = sinP0 * Math.sin(p) + cosP0 * Math.cos(p) * Math.cos(l);
  let x = Math.cos(p) * Math.sin(l);
  let y = cosP0 * Math.sin(p) - sinP0 * Math.cos(p) * Math.cos(l);
  if (cosc < 0) { const n = Math.hypot(x, y) || 1; x /= n; y /= n; }
  return [GLOBE_C + GLOBE_R * x, GLOBE_C - GLOBE_R * y, cosc >= 0];
}

/**
 * The still logo's land: rings stored as flat [lon×10, lat×10, …] lists,
 * projected for the resting view. Pinning far-side points to the rim is only
 * right for this one view (as in build-logo.mjs); the turning globe is drawn
 * pixel by pixel instead (inverse below), which needs no clipping at all.
 */
export function landPath(rings: readonly (readonly number[])[], lon0 = GLOBE_LON0, lat0 = GLOBE_LAT0): string {
  const parts: string[] = [];
  for (const ring of rings) {
    const pts: [number, number, boolean][] = [];
    let anyVisible = false;
    for (let i = 0; i < ring.length; i += 2) {
      const pt = project(ring[i] / 10, ring[i + 1] / 10, lon0, lat0);
      if (pt[2]) anyVisible = true;
      pts.push(pt);
    }
    if (!anyVisible) continue;
    parts.push('M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z');
  }
  return parts.join('');
}

/**
 * Inverse orthographic: for a point (x, y) on the unit disc (x right, y up),
 * the latitude and the longitude relative to the view centre, in degrees.
 * Turning the Earth only adds to that longitude, so it is computed once.
 */
export function inverse(x: number, y: number, lat0 = GLOBE_LAT0): [number, number] | null {
  const rho2 = x * x + y * y;
  if (rho2 > 1) return null;
  const z = Math.sqrt(1 - rho2);
  const sinP0 = Math.sin(lat0 * rad), cosP0 = Math.cos(lat0 * rad);
  const lat = Math.asin(Math.max(-1, Math.min(1, z * sinP0 + y * cosP0))) / rad;
  const dLon = Math.atan2(x, z * cosP0 - y * sinP0) / rad;
  return [lat, dLon];
}
