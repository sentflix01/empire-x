/*
 * Shared helpers for the promo scenes (scripts/promo/render.mjs).
 *
 * Every scene exposes window.setTime(t) and draws the frame for t seconds.
 * Nothing runs on a clock, so each rendered frame is exact and repeatable.
 * Colours are the brand tokens in app/globals.css (decision 2026-11-07:
 * blue primary, violet secondary, no decorative accent).
 */
/* eslint-disable */
(function () {
const C = {
  blue: '#2563eb',
  blueDeep: '#1d4ed8',
  blueSubtle: '#eff6ff',
  blueTint: '#dbeafe',
  violet: '#7c3aed',
  violetSubtle: '#f5f3ff',
  violetTint: '#ede9fe',
  green: '#157a3a',
  greenBright: '#22a355',
  greenSubtle: '#f0fdf4',
  ink: '#0f172a',
  slate: '#64748b',
  line: '#e2e8f0',
  paper: '#ffffff',
  page: '#f8fafc',
};

// Timing
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeIn = (x) => x * x * x;
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
/** 0 → 1 between a and b, 1 → 0 between c and d. */
const window_ = (t, a, b, c, d) => Math.min(easeOut(prog(t, a, b)), 1 - easeIn(prog(t, c, d)));

/** Places a group: centre (x, y), scale s, rotation r (deg), opacity o. */
function place(id, { x = 0, y = 0, s = 1, r = 0, o = 1 } = {}) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (!el) return;
  el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(2)}) scale(${Math.max(s, 0.0001).toFixed(4)})`);
  el.setAttribute('opacity', clamp(o).toFixed(3));
}

/** A point on a quadratic curve from p0 through control c to p1. */
function arc(p0, c, p1, x) {
  const u = 1 - x;
  return { x: u * u * p0.x + 2 * u * x * c.x + x * x * p1.x, y: u * u * p0.y + 2 * u * x * c.y + x * x * p1.y };
}

// Icons: SVG markup centred on (0, 0), about 40 units across.
const ICON = {
  store: (fill = C.paper) => `
    <path d="M-16 -4 L-16 16 L16 16 L16 -4" fill="none" stroke="${fill}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M-19 -6 L-15 -16 L15 -16 L19 -6 Q19 0 13 0 Q8 0 6.5 -4 Q4 0 0 0 Q-4 0 -6.5 -4 Q-8 0 -13 0 Q-19 0 -19 -6 Z" fill="${fill}"/>
    <rect x="-5" y="4" width="10" height="12" rx="1.5" fill="${fill}"/>`,
  bag: (fill = C.paper) => `
    <path d="M-15 -6 L15 -6 L17 18 L-17 18 Z" fill="${fill}" stroke="${fill}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-7 -6 V-10 A7 7 0 0 1 7 -10 V-6" fill="none" stroke="${fill}" stroke-width="3.5" stroke-linecap="round"/>`,
  dress: (fill) => `
    <path d="M-7 -20 L-3 -12 L3 -12 L7 -20 L11 -18 L8 -6 L18 20 L-18 20 L-8 -6 L-11 -18 Z" fill="${fill}" stroke-linejoin="round"/>
    <path d="M-8 -6 L8 -6" stroke="${C.paper}" stroke-width="2.5" opacity=".7"/>`,
  cup: (fill) => `
    <path d="M-14 -6 L14 -6 L11 18 Q10 21 7 21 L-7 21 Q-10 21 -11 18 Z" fill="${fill}"/>
    <path d="M13 -1 Q22 -1 21 7 Q20 13 11 13" fill="none" stroke="${fill}" stroke-width="3.5"/>
    <path d="M-5 -12 Q-8 -16 -5 -20 M3 -12 Q0 -16 3 -20" fill="none" stroke="${fill}" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`,
  shoe: (fill) => `
    <path d="M-20 4 L-20 -12 L-8 -12 Q-4 -2 6 0 L16 2 Q21 4 21 10 L21 14 L-20 14 Z" fill="${fill}" stroke-linejoin="round"/>
    <path d="M-20 14 L21 14" stroke="${C.ink}" stroke-width="3" opacity=".25"/>
    <path d="M-6 -6 L-1 -8 M-3 -2 L2 -4" stroke="${C.paper}" stroke-width="2" stroke-linecap="round"/>`,
  basket: (fill) => `
    <path d="M-20 -4 L20 -4 L15 18 L-15 18 Z" fill="${fill}" stroke-linejoin="round"/>
    <path d="M-12 -4 L-4 -18 M12 -4 L4 -18" stroke="${fill}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M-8 2 L-6 14 M0 2 V14 M8 2 L6 14" stroke="${C.paper}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`,
  link: (fill) => `
    <g fill="none" stroke="${fill}" stroke-width="4.5" stroke-linecap="round">
      <path d="M-3 5 L-8 10 A6.5 6.5 0 0 1 -17 1 L-12 -4 A6.5 6.5 0 0 1 -4 -5"/>
      <path d="M3 -5 L8 -10 A6.5 6.5 0 0 1 17 -1 L12 4 A6.5 6.5 0 0 1 4 5"/>
      <path d="M-5 5 L5 -5"/>
    </g>`,
  pin: (fill) => `
    <path d="M0 22 Q-18 2 -18 -6 A18 18 0 0 1 18 -6 Q18 2 0 22 Z" fill="${fill}"/>
    <circle cx="0" cy="-6" r="7" fill="${C.paper}"/>`,
  cart: (fill) => `
    <path d="M-18 -14 L-12 -14 L-7 8 L13 8 L17 -8 L-10 -8" fill="none" stroke="${fill}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="-5" cy="15" r="3.2" fill="${fill}"/><circle cx="11" cy="15" r="3.2" fill="${fill}"/>`,
  check: (fill, w = 5) => `<path d="M-11 0 L-3 8 L12 -9" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
  bell: (fill) => `
    <path d="M-14 10 Q-12 6 -12 -2 A12 12 0 0 1 12 -2 Q12 6 14 10 Z" fill="${fill}"/>
    <circle cx="0" cy="14" r="4" fill="${fill}"/><circle cx="0" cy="-15" r="2.5" fill="${fill}"/>`,
  coin: () => `
    <circle r="15" fill="${C.green}"/><circle r="11" fill="none" stroke="${C.paper}" stroke-width="2" opacity=".55"/>
    <path d="M-5 -4 L5 -4 M-5 0 L5 0 M-5 4 L5 4" stroke="${C.paper}" stroke-width="2.4" stroke-linecap="round"/>`,
  arrow: (fill) => `<path d="M-10 0 L10 0 M3 -7 L10 0 L3 7" fill="none" stroke="${fill}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/** A touch marker: a soft dot that presses and sends out a ring. */
function tapMarkup(id) {
  return `<g id="${id}" opacity="0">
    <circle class="ring" r="14" fill="none" stroke="${C.ink}" stroke-width="2.5" opacity=".35"/>
    <circle class="dot" r="14" fill="${C.ink}" opacity=".28"/>
  </g>`;
}
function tap(id, x, y, t, t0, k = 1) {
  const el = document.getElementById(id);
  const vis = window_(t, t0 - 0.35, t0 - 0.15, t0 + 0.3, t0 + 0.5);
  const press = 1 - 0.25 * Math.sin(Math.PI * prog(t, t0 - 0.08, t0 + 0.12));
  place(el, { x, y, s: press * k, o: vis });
  const ring = el.querySelector('.ring');
  const r = prog(t, t0, t0 + 0.45);
  ring.setAttribute('r', (14 + 22 * easeOut(r)).toFixed(2));
  ring.setAttribute('opacity', (r > 0 && r < 1 ? 0.35 * (1 - r) : 0).toFixed(3));
}

/** Small confetti pieces in brand colours, deterministic. */
function confettiMarkup(id, n = 14) {
  let s = `<g id="${id}">`;
  const cols = [C.blue, C.violet, C.green, C.blueTint];
  for (let i = 0; i < n; i++) s += `<rect class="bit" x="-3" y="-1.5" width="6" height="3" rx="1" fill="${cols[i % cols.length]}"/>`;
  return s + '</g>';
}
function confetti(id, cx, cy, t, t0, spread = 90) {
  const bits = document.querySelectorAll(`#${id} .bit`);
  const x = prog(t, t0, t0 + 1.1);
  bits.forEach((b, i) => {
    const a = (i / bits.length) * Math.PI * 2 + 0.4;
    const d = spread * easeOut(x) * (0.6 + 0.4 * ((i * 37) % 10) / 10);
    const gx = cx + Math.cos(a) * d, gy = cy + Math.sin(a) * d + 30 * x * x;
    place(b, { x: gx, y: gy, r: i * 47 + 360 * x, o: x > 0 && x < 1 ? 1 - easeIn(x) : 0 });
  });
}

window.PROMO = { C, clamp, prog, lerp, easeOut, easeInOut, easeIn, back, window_, place, arc, ICON, tapMarkup, tap, confettiMarkup, confetti };
})();
