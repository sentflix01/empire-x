'use client';
/**
 * The landing logo with a real turning Earth (owner, 2026-11-14): the ring, the
 * network lines and the eight boxes stay still while the continents turn west to
 * east like the real planet — two full turns (720°) when the page opens and again
 * on hover or tap, then it rests. It never restarts mid-turn and never loops, so
 * there is no endless motion to pause (WCAG 2.2.2). With reduced motion it is the
 * still logo.
 *
 * Layers, in the drawing order of public/brand/nodbusiness-icon-on-blue-v3.svg
 * (scripts/brand/build-logo.mjs):
 *   back SVG   outer disc, white ring, globe face, and the still land (vector)
 *   canvas     the turning land, drawn pixel by pixel while it turns: each pixel
 *              of the globe looks up its latitude/longitude on a flat world map
 *              drawn once from lib/brand/globeLand.json. No polygon clipping, so
 *              continents crossing the edge of the globe are always right.
 *   front SVG  network lines, globe rim and the eight boxes (never move)
 */
import { useCallback, useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { GLOBE_C as C, GLOBE_R as R, GLOBE_LON0, inverse, landPath } from '@/lib/brand/orthographic';
import LAND from '@/lib/brand/globeLand.json';
import { LOGO_COLORS } from '@/lib/brand/logoColors';

const BLUE = LOGO_COLORS.blue;
/** One spin: two full turns of the Earth, west to east. */
export const GLOBE_TURN_DEGREES = 720;
export const GLOBE_SPIN_MS = 3200;

const RINGS = LAND as number[][];
const REST_LAND = landPath(RINGS);
const SCALE = 118 / C; // the on-blue logo draws the icon at 118/140 inside its white ring
/** The globe disc inside the 280-unit logo, as a share of the logo's width. */
const GLOBE_LEFT = (C - R * SCALE) / (2 * C);
const GLOBE_SIZE = (2 * R * SCALE) / (2 * C);

const node = (k: number): [number, number] => [C + R * Math.sin((k * Math.PI) / 4), C - R * Math.cos((k * Math.PI) / 4)];
const EDGES: [number, number][] = [[0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [2, 4], [2, 5], [2, 6], [2, 7], [3, 5], [3, 6], [3, 7], [4, 6], [4, 7], [5, 7]];
const BW = 34, BH = 24;
const INNER = `translate(${C} ${C}) scale(${SCALE.toFixed(4)}) translate(-${C} -${C})`;

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

// ── The flat world map (equirectangular), drawn once and shared ───────────────
const TEX_W = 2048, TEX_H = 1024;
let texture: { land: Uint8Array; grid: Uint8Array } | null = null;
function worldTexture() {
  if (texture) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W; canvas.height = TEX_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const X = (lon: number) => ((lon + 180) / 360) * TEX_W;
  const Y = (lat: number) => ((90 - lat) / 180) * TEX_H;
  ctx.fillStyle = 'rgb(255,0,0)'; // land in the red channel
  ctx.beginPath();
  for (const ring of RINGS) {
    for (let i = 0; i < ring.length; i += 2) {
      const x = X(ring[i] / 10), y = Y(ring[i + 1] / 10);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.fill('evenodd');
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgb(0,255,0)'; // meridians and parallels in the green channel
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let lon = -180; lon < 180; lon += 30) { ctx.moveTo(X(lon), 0); ctx.lineTo(X(lon), TEX_H); }
  for (let lat = -60; lat <= 60; lat += 30) { ctx.moveTo(0, Y(lat)); ctx.lineTo(TEX_W, Y(lat)); }
  ctx.stroke();
  const rgba = ctx.getImageData(0, 0, TEX_W, TEX_H).data;
  const land = new Uint8Array(TEX_W * TEX_H), grid = new Uint8Array(TEX_W * TEX_H);
  for (let i = 0; i < land.length; i++) { land[i] = rgba[i * 4]; grid[i] = rgba[i * 4 + 1]; }
  texture = { land, grid };
  return texture;
}

/** Per-pixel latitude row, view-relative longitude and limb shading for an n × n globe. */
function pixelMap(n: number) {
  const row = new Int32Array(n * n).fill(-1);
  const dLon = new Float32Array(n * n);
  const shade = new Float32Array(n * n);
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      const x = ((px + 0.5) / n) * 2 - 1, y = 1 - ((py + 0.5) / n) * 2;
      const geo = inverse(x, y);
      if (!geo) continue;
      const i = py * n + px;
      row[i] = Math.min(TEX_H - 1, Math.max(0, Math.floor(((90 - geo[0]) / 180) * TEX_H))) * TEX_W;
      dLon[i] = geo[1];
      shade[i] = 0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - x * x - y * y)); // darker towards the edge
    }
  }
  return { row, dLon, shade };
}

export default function GlobeLogo({ className, label }: { className?: string; label?: string }) {
  const id = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spinning = useRef(false);
  const frame = useRef(0);

  const spin = useCallback(() => {
    if (spinning.current || prefersReducedMotion()) return;
    const root = rootRef.current, canvas = canvasRef.current;
    if (!root || !canvas) return;
    spinning.current = true;
    root.dataset.spinning = 'true';

    // Draw only if the browser can; the turn still runs (and ends) either way.
    const ctx = canvas.getContext?.('2d') ?? null;
    const tex = ctx ? worldTexture() : null;
    let n = 0, map: ReturnType<typeof pixelMap> | null = null, image: ImageData | null = null;
    if (ctx && tex) {
      const css = canvas.getBoundingClientRect().width || 160;
      n = Math.max(32, Math.round(css * Math.min(2, window.devicePixelRatio || 1)));
      canvas.width = n; canvas.height = n;
      map = pixelMap(n);
      image = ctx.createImageData(n, n);
    }
    const paint = (lon0: number) => {
      if (!ctx || !tex || !map || !image) return;
      const out = image.data;
      const base = ((lon0 + 180) / 360) * TEX_W;
      for (let i = 0; i < n * n; i++) {
        const r = map.row[i];
        const o = i * 4;
        if (r < 0) { out[o + 3] = 0; continue; }
        let col = Math.floor(base + (map.dLon[i] / 360) * TEX_W) % TEX_W;
        if (col < 0) col += TEX_W;
        const land = tex.land[r + col] / 255, grid = tex.grid[r + col] / 255;
        const a = land * 0.5 * map.shade[i] + grid * 0.16 * (1 - land * 0.5);
        out[o] = 255; out[o + 1] = 255; out[o + 2] = 255; out[o + 3] = Math.round(a * 255);
      }
      ctx.putImageData(image, 0, 0);
    };

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / GLOBE_SPIN_MS);
      // A lower view longitude moves the land left to right: west to east, like the Earth.
      const lon0 = GLOBE_LON0 - GLOBE_TURN_DEGREES * easeInOut(t);
      root.dataset.lon = lon0.toFixed(2);
      paint(lon0);
      if (t < 1) { frame.current = requestAnimationFrame(step); return; }
      spinning.current = false;
      root.dataset.spinning = 'false';
      root.dataset.lon = String(GLOBE_LON0);
    };
    frame.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    spin();
    return () => cancelAnimationFrame(frame.current);
  }, [spin]);

  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  return (
    <span
      ref={rootRef}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-testid="globe-logo"
      data-spinning="false"
      data-lon={GLOBE_LON0}
      onMouseEnter={spin}
      onClick={spin}
      className={cn('group/globe relative block aspect-square select-none', className)}
    >
      <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-face`} cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor={LOGO_COLORS.faceLight} />
            <stop offset="1" stopColor={LOGO_COLORS.faceDark} />
          </radialGradient>
          <clipPath id={`${id}-globe`}><circle cx={C} cy={C} r={R} /></clipPath>
        </defs>
        <circle cx={C} cy={C} r={C} fill={BLUE} />
        <circle cx={C} cy={C} r={128} fill="#fff" />
        <g transform={INNER}>
          <circle cx={C} cy={C} r={C} fill={BLUE} />
          <circle cx={C} cy={C} r={R} fill={`url(#${id}-face)`} />
          {/* The still land: shown at rest, hidden while the canvas turns. */}
          <path
            data-testid="globe-land"
            d={REST_LAND}
            fill="#fff"
            fillOpacity={0.5}
            clipPath={`url(#${id}-globe)`}
            className="group-data-[spinning=true]/globe:opacity-0"
          />
        </g>
      </svg>
      <canvas
        ref={canvasRef}
        data-testid="globe-canvas"
        aria-hidden="true"
        className="absolute rounded-full opacity-0 group-data-[spinning=true]/globe:opacity-100"
        style={{ left: pct(GLOBE_LEFT), top: pct(GLOBE_LEFT), width: pct(GLOBE_SIZE), height: pct(GLOBE_SIZE) }}
      />
      <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <g transform={INNER}>
          <g stroke="#fff" strokeOpacity={0.75} strokeWidth={1.6} strokeLinecap="round" fill="none">
            {EDGES.map(([a, b]) => {
              const [x1, y1] = node(a), [x2, y2] = node(b);
              return <line key={`${a}-${b}`} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} />;
            })}
          </g>
          <circle cx={C} cy={C} r={R} fill="none" stroke="#fff" strokeWidth={3} />
          {Array.from({ length: 8 }, (_, k) => {
            const [x, y] = node(k);
            return (
              <g key={k}>
                <rect x={(x - BW / 2).toFixed(1)} y={(y - BH / 2).toFixed(1)} width={BW} height={BH} rx={4.5} fill="#fff" />
                <rect x={(x - BW / 2 + BW * 0.2).toFixed(1)} y={(y - BH / 2 + BH * 0.2).toFixed(1)} width={(BW * 0.32).toFixed(1)} height={(BH * 0.2).toFixed(1)} rx={1.2} fill={BLUE} />
              </g>
            );
          })}
        </g>
      </svg>
    </span>
  );
}
