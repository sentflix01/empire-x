/*
 * Shot engine for the 9:16 promo clips (guide.html, landing.html).
 *
 * A clip is a list of shots played one after another with a short
 * cross-fade. Each shot draws one screen in its own time (lt, seconds) and
 * may give:
 *   cam:  [[lt, scale, focusX, focusY], ...]   zoom about a point (eased)
 *   hand: [[lt, x, y, tap?], ...]              the pointing hand; tap = press
 *   step: 1..6                                 the step badge (guide only)
 * A clip can replay a shot faster with { ...shot, k: 2 } (k = speed).
 * Everything is a function of t, so frames are exact (render.mjs).
 * Needs common.js first.
 */
/* eslint-disable */
(function () {
const { C, prog, lerp, easeOut, easeInOut, easeIn, back, place } = window.PROMO;

const $ = (root, k) => root.querySelector(`[data-k="${k}"]`);
/** P(root)('name', {x, y, s, r, o}) places the element data-k="name" in that shot. */
const P = (root) => (k, o) => place($(root, k), o);

// ---------- Shared pictures ----------

/** A pointing hand; the fingertip is at (0, 0). */
const HAND = `
  <g transform="rotate(-18)">
    <path d="M-5 2 C-5 -5 5 -5 5 2 L5 24 C6 19 14 19 14 25 L14 28 C15 23 23 23 23 29 L23 32 C24 27 32 28 32 34 L32 50 C32 64 24 72 12 72 L2 72 C-8 72 -12 66 -16 59 L-26 40 C-29 34 -22 29 -17 33 L-5 42 Z"
      fill="#ffffff" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14 28 L14 40 M23 32 L23 42" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" opacity=".5"/>
  </g>`;

/** A friendly round face with moods: smile, big, confused, surprised. */
function face(k = 'face', fill = C.blueTint) {
  const ink = C.ink;
  return `<g data-k="${k}">
    <circle r="24" fill="${fill}" stroke="${ink}" stroke-width="2.5"/>
    <g class="e-dot"><circle cx="-8" cy="-5" r="3" fill="${ink}"/><circle cx="8" cy="-5" r="3" fill="${ink}"/></g>
    <path class="e-happy" d="M-12 -4 Q-8 -10 -4 -4 M4 -4 Q8 -10 12 -4" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round" opacity="0"/>
    <path class="b-worry" d="M-13 -13 L-5 -11 M13 -13 L5 -11" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" opacity="0"/>
    <path class="m-smile" d="M-9 7 Q0 15 9 7" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
    <path class="m-big" d="M-11 5 Q0 21 11 5 Z" fill="${ink}" opacity="0"/>
    <path class="m-wavy" d="M-9 10 Q-5 6 -1 10 T8 10" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round" opacity="0"/>
    <ellipse class="m-o" cx="0" cy="10" rx="4.5" ry="5.5" fill="${ink}" opacity="0"/>
    <g class="cheeks" opacity="0"><circle cx="-14" cy="5" r="4" fill="${C.violet}" opacity=".25"/><circle cx="14" cy="5" r="4" fill="${C.violet}" opacity=".25"/></g>
  </g>`;
}
function mood(root, k, m) {
  const g = $(root, k);
  if (!g) return;
  const show = (cls, on) => g.querySelector(`.${cls}`).setAttribute('opacity', on ? 1 : 0);
  show('e-dot', m !== 'big');
  show('e-happy', m === 'big');
  show('b-worry', m === 'confused');
  show('m-smile', m === 'smile');
  show('m-big', m === 'big');
  show('m-wavy', m === 'confused');
  show('m-o', m === 'surprised');
  show('cheeks', m === 'big' || m === 'smile');
}

/** A photo placeholder: a landscape with hills and a sun. */
function photo(x, y, w, h, sky = C.blueTint, hill = C.blue, rx = 10) {
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${sky}"/>
    <circle cx="${x + w * 0.72}" cy="${y + h * 0.32}" r="${Math.min(w, h) * 0.11}" fill="${C.paper}" opacity=".9"/>
    <path d="M${x} ${y + h * 0.82} L${x + w * 0.32} ${y + h * 0.45} L${x + w * 0.55} ${y + h * 0.72} L${x + w * 0.72} ${y + h * 0.56} L${x + w} ${y + h * 0.86} L${x + w} ${y + h - rx} Q${x + w} ${y + h} ${x + w - rx} ${y + h} L${x + rx} ${y + h} Q${x} ${y + h} ${x} ${y + h - rx} Z" fill="${hill}" opacity=".85"/>
  </g>`;
}

const bar = (x, y, w, h, fill, o = 1, k = '') => `<rect ${k ? `data-k="${k}"` : ''} x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" opacity="${o}"/>`;

/** Extra icons, centred on (0, 0), about 40 units across. */
const GLYPH = {
  camera: (f) => `<rect x="-17" y="-10" width="34" height="24" rx="6" fill="${f}"/><rect x="-7" y="-15" width="14" height="7" rx="2" fill="${f}"/><circle cx="0" cy="2" r="7" fill="${C.paper}"/><circle cx="0" cy="2" r="3.5" fill="${f}"/>`,
  gallery: (f) => `<rect x="-16" y="-14" width="32" height="28" rx="5" fill="none" stroke="${f}" stroke-width="3.5"/><path d="M-12 10 L-4 0 L2 6 L6 2 L12 10 Z" fill="${f}"/><circle cx="6" cy="-6" r="3" fill="${f}"/>`,
  heart: (f) => `<path d="M0 14 C-22 0 -14 -16 0 -6 C14 -16 22 0 0 14 Z" fill="${f}"/>`,
  comment: (f) => `<path d="M-15 -11 H15 A4 4 0 0 1 19 -7 V7 A4 4 0 0 1 15 11 H-3 L-11 17 L-10 11 H-15 A4 4 0 0 1 -19 7 V-7 A4 4 0 0 1 -15 -11 Z" fill="${f}"/>`,
  plus: (f) => `<path d="M-9 0 H9 M0 -9 V9" stroke="${f}" stroke-width="4" stroke-linecap="round"/>`,
  clipboard: (f) => `<rect x="-12" y="-14" width="24" height="30" rx="4" fill="${f}"/><rect x="-6" y="-18" width="12" height="7" rx="2" fill="${C.ink}"/><path d="M-6 -2 H6 M-6 5 H4" stroke="${C.paper}" stroke-width="2.5" stroke-linecap="round"/>`,
  globe: (f) => `<circle r="16" fill="none" stroke="${f}" stroke-width="3"/><ellipse rx="7" ry="16" fill="none" stroke="${f}" stroke-width="2.5"/><path d="M-16 0 H16 M-13 -8 H13 M-13 8 H13" stroke="${f}" stroke-width="2"/>`,
  clock: (f) => `<circle r="15" fill="none" stroke="${f}" stroke-width="3.5"/><path class="hand-h" d="M0 0 V-8" stroke="${f}" stroke-width="3.5" stroke-linecap="round"/><path class="hand-m" d="M0 0 H9" stroke="${f}" stroke-width="3" stroke-linecap="round"/>`,
  play: (f) => `<rect x="-16" y="-11" width="32" height="22" rx="6" fill="${f}"/><path d="M-4 -6 L7 0 L-4 6 Z" fill="${C.paper}"/>`,
  palette: (f) => `<path d="M0 -16 C12 -16 18 -8 16 0 C14 6 6 3 4 8 C2 14 8 16 0 16 C-10 16 -16 8 -16 0 C-16 -9 -9 -16 0 -16 Z" fill="${f}"/><circle cx="-7" cy="-5" r="3" fill="${C.paper}"/><circle cx="2" cy="-9" r="3" fill="${C.paper}"/><circle cx="-8" cy="5" r="3" fill="${C.paper}"/>`,
  monitor: (f) => `<rect x="-20" y="-14" width="40" height="26" rx="3" fill="none" stroke="${f}" stroke-width="3.5"/><path d="M-7 18 H7 M0 12 V18" stroke="${f}" stroke-width="3.5" stroke-linecap="round"/>`,
  tablet: (f) => `<rect x="-13" y="-17" width="26" height="34" rx="4" fill="none" stroke="${f}" stroke-width="3.5"/><circle cx="0" cy="12" r="1.8" fill="${f}"/>`,
  phoneG: (f) => `<rect x="-9" y="-17" width="18" height="34" rx="4" fill="none" stroke="${f}" stroke-width="3.5"/><path d="M-3 12 H3" stroke="${f}" stroke-width="2.5" stroke-linecap="round"/>`,
  sparkle: (f) => `<path d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4 Z" fill="${f}"/>`,
  qr: (f) => `<rect x="-15" y="-15" width="30" height="30" rx="3" fill="${C.paper}" stroke="${f}" stroke-width="2"/><rect x="-11" y="-11" width="9" height="9" fill="${f}"/><rect x="2" y="-11" width="9" height="9" fill="${f}"/><rect x="-11" y="2" width="9" height="9" fill="${f}"/><rect x="4" y="4" width="3" height="3" fill="${f}"/><rect x="8" y="8" width="3" height="3" fill="${f}"/><rect x="4" y="9" width="3" height="3" fill="${f}"/>`,
  // Business categories (the wizard's 10)
  cross: (f) => `<path d="M-5 -15 H5 V-5 H15 V5 H5 V15 H-5 V5 H-15 V-5 H-5 Z" fill="${f}"/>`,
  helmet: (f) => `<path d="M-17 6 A17 17 0 0 1 17 6 Z" fill="${f}"/><rect x="-20" y="5" width="40" height="6" rx="3" fill="${f}"/><path d="M0 -11 V5" stroke="${C.paper}" stroke-width="3"/>`,
  truck: (f) => `<rect x="-19" y="-10" width="24" height="18" rx="2" fill="${f}"/><path d="M5 -4 H13 L19 3 V8 H5 Z" fill="${f}"/><circle cx="-11" cy="11" r="4.5" fill="${C.ink}"/><circle cx="11" cy="11" r="4.5" fill="${C.ink}"/>`,
  cap: (f) => `<path d="M0 -12 L20 -3 L0 6 L-20 -3 Z" fill="${f}"/><path d="M-11 2 V10 Q0 16 11 10 V2" fill="${f}"/><path d="M16 -1 V10" stroke="${f}" stroke-width="2.5"/>`,
  briefcase: (f) => `<rect x="-18" y="-8" width="36" height="24" rx="4" fill="${f}"/><path d="M-6 -8 V-13 H6 V-8" fill="none" stroke="${f}" stroke-width="3.5"/><path d="M-18 2 H18" stroke="${C.paper}" stroke-width="2" opacity=".6"/>`,
  leaf: (f) => `<path d="M-14 14 C-16 -6 -2 -16 16 -16 C16 4 4 16 -14 14 Z" fill="${f}"/><path d="M-12 12 L8 -8" stroke="${C.paper}" stroke-width="2.5" stroke-linecap="round"/>`,
  bed: (f) => `<rect x="-19" y="-2" width="38" height="12" rx="3" fill="${f}"/><rect x="-19" y="-12" width="10" height="10" rx="3" fill="${f}"/><path d="M-19 10 V16 M19 10 V16" stroke="${f}" stroke-width="3.5" stroke-linecap="round"/>`,
  scissors: (f) => `<circle cx="-9" cy="10" r="6" fill="none" stroke="${f}" stroke-width="3.5"/><circle cx="9" cy="10" r="6" fill="none" stroke="${f}" stroke-width="3.5"/><path d="M-5 5 L10 -16 M5 5 L-10 -16" stroke="${f}" stroke-width="3.5" stroke-linecap="round"/>`,
};

/** A phone outline (screen 0..w, 0..h inside), centred on (0, 0). */
function phoneFrame(w, h, inner = '', k = '') {
  return `<g ${k ? `data-k="${k}"` : ''}>
    <rect x="${-w / 2 - 7}" y="${-h / 2 - 9}" width="${w + 14}" height="${h + 18}" rx="22" fill="${C.ink}"/>
    <svg x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">
      <rect width="${w}" height="${h}" rx="15" fill="${C.paper}"/>${inner}
    </svg>
  </g>`;
}

// ---------- Interpolation ----------

/** Eased value along keys [[t, ...values]]; holds before the first and after the last key. */
function keyed(keys, lt) {
  if (lt <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    if (lt <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i];
      const x = easeInOut(prog(lt, a[0], b[0]));
      return a.slice(1).map((v, j) => (typeof v === 'number' ? lerp(v, b[j + 1], x) : b[j + 1]));
    }
  }
  return keys[keys.length - 1].slice(1);
}

// ---------- Runner ----------

function run(shots, opts = {}) {
  const W = 360, H = 640, FADE = 0.35;
  const svg = document.getElementById('svg');
  let t = 0;
  shots.forEach((s) => { s.k = s.k || 1; s.start = t; s.len = s.dur / s.k; t += s.len; });
  const total = t;

  const steps = opts.steps ? `
    <g id="stepbar" opacity="0">
      <rect x="96" y="602" width="168" height="30" rx="15" fill="${C.ink}" opacity=".78"/>
      <circle id="stepnum-bg" cx="114" cy="617" r="12" fill="${C.blue}"/>
      <text id="stepnum" x="114" y="622" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="15" fill="#fff">1</text>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<circle class="dot" cx="${140 + i * 20}" cy="617" r="5" fill="#fff" opacity=".35"/>`).join('')}
    </g>` : '';

  svg.innerHTML = `<rect width="${W}" height="${H}" fill="${C.page}"/>
    ${shots.map((s, i) => `<g data-shot="${i}" opacity="0" style="display:none"><g class="cam"><rect width="${W}" height="${H}" fill="${s.bg || C.page}"/>${s.markup}</g></g>`).join('')}
    ${steps}
    <g id="hand" opacity="0">
      <circle id="hand-ring" r="16" fill="none" stroke="${C.blue}" stroke-width="3" opacity="0"/>
      <g id="hand-body">${HAND}</g>
    </g>`;
  shots.forEach((s, i) => { s.root = svg.querySelector(`[data-shot="${i}"]`); s.camEl = s.root.querySelector('.cam'); });

  const handEl = document.getElementById('hand');
  const ringEl = document.getElementById('hand-ring');
  const bodyEl = document.getElementById('hand-body');

  function camOf(s, lt) {
    if (!s.cam) return { z: 1, fx: W / 2, fy: H / 2 };
    const [z, fx, fy] = keyed(s.cam, lt);
    return { z, fx, fy };
  }

  window.DURATION = total;
  window.setTime = function (T) {
    let active = null;
    shots.forEach((s, i) => {
      const end = s.start + s.len;
      const last = i === shots.length - 1;
      const on = T >= s.start && (last ? T <= end : T < end + FADE);
      s.root.style.display = on ? '' : 'none';
      if (!on) return;
      if (T < end || last) active = s;
      let o = prog(T, s.start, s.start + FADE);
      if (i === 0 && !opts.fadeInFirst) o = Math.max(o, prog(T, 0, 0.25));
      if (last) o = Math.min(o, 1 - prog(T, total - 0.8, total));
      s.root.setAttribute('opacity', o.toFixed(3));
      const lt = (T - s.start) * s.k;
      const c = camOf(s, lt);
      s.camEl.setAttribute('transform', `translate(${c.fx} ${c.fy}) scale(${c.z.toFixed(4)}) translate(${-c.fx} ${-c.fy})`);
      s.draw && s.draw(lt, s.root);
    });

    // The hand follows the active shot's keys, through its camera.
    const s = active;
    if (s && s.hand) {
      const lt = (T - s.start) * s.k;
      const keys = s.hand;
      const first = keys[0][0], lastK = keys[keys.length - 1][0];
      let x = keys[0][1], y = keys[0][2];
      for (let i = 1; i < keys.length; i++) {
        const [tb, xb, yb] = keys[i];
        const ta = keys[i - 1][0];
        const travel = Math.min(0.75, (tb - ta) * 0.75);
        if (lt >= tb) { x = xb; y = yb; continue; }
        const f = easeInOut(prog(lt, tb - travel, tb));
        x = lerp(keys[i - 1][1], xb, f); y = lerp(keys[i - 1][2], yb, f);
        break;
      }
      const c = camOf(s, lt);
      const sx = c.fx + c.z * (x - c.fx), sy = c.fy + c.z * (y - c.fy);
      const vis = Math.min(prog(lt, first - 0.5, first - 0.2), 1 - prog(lt, lastK + 0.5, lastK + 0.8));
      const enter = 1 - easeOut(prog(lt, first - 0.5, first - 0.1));
      place(handEl, { x: sx + 60 * enter, y: sy + 90 * enter, o: vis * (T < s.start + 0.15 ? 0 : 1) });
      // Press and ring on tap keys.
      let press = 1, ring = 0;
      keys.forEach(([tk, , , tapK]) => {
        if (!tapK) return;
        press = Math.min(press, 1 - 0.16 * Math.sin(Math.PI * prog(lt, tk - 0.1, tk + 0.15)));
        const r = prog(lt, tk, tk + 0.5);
        if (r > 0 && r < 1) ring = r;
      });
      place(bodyEl, { s: press });
      ringEl.setAttribute('r', (12 + 24 * easeOut(ring)).toFixed(2));
      ringEl.setAttribute('opacity', ring > 0 ? (0.8 * (1 - ring)).toFixed(3) : 0);
    } else {
      handEl.setAttribute('opacity', 0);
    }

    if (opts.steps) {
      const bar_ = document.getElementById('stepbar');
      const step = s && s.step ? s.step : 0;
      const shown = step > 0 ? 1 : 0;
      bar_.setAttribute('opacity', (shown * 0.95).toFixed(2));
      if (step) {
        document.getElementById('stepnum').textContent = String(step);
        bar_.querySelectorAll('.dot').forEach((d, i) => {
          d.setAttribute('opacity', i < step ? 1 : 0.35);
          d.setAttribute('fill', i === step - 1 ? C.blueTint : '#fff');
          d.setAttribute('r', i === step - 1 ? 6.5 : 5);
        });
      }
    }
  };
  window.setTime(0);
  window.READY = new Promise((resolve) => {
    const imgs = [...svg.querySelectorAll('image')];
    if (!imgs.length) return resolve(true);
    let n = imgs.length;
    imgs.forEach((im) => { const i = new Image(); i.onload = i.onerror = () => { if (--n === 0) resolve(true); }; i.src = im.getAttribute('href'); });
  });
}

window.ENGINE = { $, P, face, mood, photo, bar, GLYPH, HAND, phoneFrame, keyed, run };
})();
