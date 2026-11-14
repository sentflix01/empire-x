'use client';
/**
 * The landing logo with a real turning Earth (owner, 2026-11-14): the ring, the
 * network lines and the eight boxes stay in place while the continents turn west
 * to east like the real planet, very slowly: two full turns (720°) over a minute,
 * easing in and out, then a short rest, then the same turn again. 720° brings the
 * view back to where it began, so each turn starts and ends on the still logo.
 * While it turns, signals run along the network lines from box to box and a box
 * glows when one arrives; they rest with the globe.
 *
 * There is no pause button (owner: a logo should not carry play/pause controls);
 * the motion rests between turns, never runs off screen or in a hidden tab, and
 * with reduced motion it is the still logo. It paints at most 30 times a second.
 *
 * Layers, in the drawing order of public/brand/nodbusiness-icon-on-blue-v3.svg
 * (scripts/brand/build-logo.mjs):
 *   back SVG   outer disc, white ring, globe face, and the still land (vector)
 *   canvas     the turning land, drawn pixel by pixel: each pixel of the globe
 *              looks up its latitude/longitude on a flat world map drawn once from
 *              lib/brand/globeLand.json. No polygon clipping, so continents
 *              crossing the edge of the globe are always right.
 *   front SVG  network lines with their signals, globe rim and the eight boxes
 */
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { GLOBE_C as C, GLOBE_R as R, GLOBE_LON0, inverse, landPath } from '@/lib/brand/orthographic';
import LAND from '@/lib/brand/globeLand.json';
import { LOGO_COLORS } from '@/lib/brand/logoColors';

const BLUE = LOGO_COLORS.blue;
/** One turn: two full turns of the Earth, west to east, over a minute; then a rest; then again. */
export const GLOBE_TURN_DEGREES = 720;
export const GLOBE_TURN_MS = 60000;
export const GLOBE_REST_MS = 8000;
export const GLOBE_CYCLE_MS = GLOBE_TURN_MS + GLOBE_REST_MS;
/** At most 30 paints a second: plenty at this speed. */
const PAINT_EVERY_MS = 1000 / 30;

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

/**
 * One signal per line: its own length of trip (2.6–4.4 s), start delay and
 * direction, so messages keep crossing the globe between the boxes. A signal
 * travels during the first 70% of its period (globals.css @keyframes globe-signal).
 */
export const SIGNALS = EDGES.map(([a, b], i) => {
  const duration = 2.6 + ((i * 7) % 10) * 0.2;
  const delay = -(((i * 11) % 20) / 20) * duration; // already under way on load
  const [from, to] = i % 2 ? [b, a] : [a, b];
  return { from, to, duration, delay };
});
/** Each box glows when the first signal that ends there arrives (same period and delay). */
const GLOWS = Array.from({ length: 8 }, (_, k) => SIGNALS.find((sig) => sig.to === k) ?? null);

/** A gentle sine ease: the globe sets off and settles softly, and is visibly moving within a second. */
export const easeInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

/** Where the globe is `elapsed` ms after the page opened: turning (eased 720°) or resting. */
export function globeAt(elapsed: number): { lon: number; turning: boolean; cycle: number } {
  const phase = elapsed % GLOBE_CYCLE_MS;
  const cycle = Math.floor(elapsed / GLOBE_CYCLE_MS) + 1;
  if (phase >= GLOBE_TURN_MS) return { lon: GLOBE_LON0, turning: false, cycle };
  return { lon: GLOBE_LON0 - GLOBE_TURN_DEGREES * easeInOut(phase / GLOBE_TURN_MS), turning: true, cycle };
}

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
  /** Set after mount: false with reduced motion (the still logo, no button). */
  const [motion, setMotion] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  /** Turning time so far, kept across pauses so play resumes where it stopped. */
  const elapsed = useRef(0);

  useEffect(() => { setMotion(!prefersReducedMotion()); }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  const running = motion && onScreen && tabVisible;

  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current;
    if (!root || !canvas) return;
    if (!running) { root.dataset.spinning = 'false'; return; }

    // Draw only if the browser can; the turn still runs either way.
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
      root.dataset.drawn = 'true';
    };

    let frame = 0;
    let last = performance.now();
    let lastPaint = -Infinity;
    const step = (now: number) => {
      // A long gap (a slow frame) never jumps the Earth forward.
      elapsed.current += Math.min(100, Math.max(0, now - last));
      last = now;
      const { lon: lon0, turning, cycle } = globeAt(elapsed.current);
      if (root.dataset.spinning !== String(turning)) root.dataset.spinning = String(turning);
      root.dataset.cycle = String(cycle);
      // Resting: the canvas already shows the start view; nothing to repaint.
      if (turning && now - lastPaint >= PAINT_EVERY_MS) {
        root.dataset.lon = lon0.toFixed(2);
        paint(lon0);
        lastPaint = now;
      } else if (!turning && root.dataset.lon !== String(GLOBE_LON0)) {
        root.dataset.lon = String(GLOBE_LON0);
        paint(GLOBE_LON0);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  return (
    <span
      ref={rootRef}
      data-testid="globe-logo"
      data-spinning="false"
      data-lon={GLOBE_LON0}
      data-cycle="1"
      className={cn('group/globe relative block aspect-square select-none', className)}
    >
      <span
        data-testid="globe-art"
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className="absolute inset-0"
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
            {/* The still land: shown until the canvas has drawn the turning Earth. */}
            <path
              data-testid="globe-land"
              d={REST_LAND}
              fill="#fff"
              fillOpacity={0.5}
              clipPath={`url(#${id}-globe)`}
              className="group-data-[drawn=true]/globe:opacity-0"
            />
          </g>
        </svg>
        <canvas
          ref={canvasRef}
          data-testid="globe-canvas"
          aria-hidden="true"
          className="absolute rounded-full opacity-0 group-data-[drawn=true]/globe:opacity-100"
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
            {/* Signals: a short bright dash running from one box to another (CSS only). */}
            {motion && (
              <g data-testid="globe-signals" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" fill="none">
                {SIGNALS.map(({ from, to, duration, delay }) => {
                  const [x1, y1] = node(from), [x2, y2] = node(to);
                  return (
                    <path
                      key={`${from}-${to}`}
                      d={`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`}
                      pathLength={1}
                      className="globe-signal"
                      style={{ animationDuration: `${duration}s`, animationDelay: `${delay.toFixed(2)}s` }}
                    />
                  );
                })}
              </g>
            )}
            <circle cx={C} cy={C} r={R} fill="none" stroke="#fff" strokeWidth={3} />
            {Array.from({ length: 8 }, (_, k) => {
              const [x, y] = node(k);
              const glow = motion ? GLOWS[k] : null;
              return (
                <g key={k}>
                  {glow && (
                    <rect
                      x={(x - BW / 2 - 5).toFixed(1)} y={(y - BH / 2 - 5).toFixed(1)} width={BW + 10} height={BH + 10} rx={8}
                      fill="#fff" className="globe-glow"
                      style={{ animationDuration: `${glow.duration}s`, animationDelay: `${glow.delay.toFixed(2)}s` }}
                    />
                  )}
                  <rect x={(x - BW / 2).toFixed(1)} y={(y - BH / 2).toFixed(1)} width={BW} height={BH} rx={4.5} fill="#fff" />
                  <rect x={(x - BW / 2 + BW * 0.2).toFixed(1)} y={(y - BH / 2 + BH * 0.2).toFixed(1)} width={(BW * 0.32).toFixed(1)} height={(BH * 0.2).toFixed(1)} rx={1.2} fill={BLUE} />
                </g>
              );
            })}
          </g>
        </svg>
      </span>
    </span>
  );
}
