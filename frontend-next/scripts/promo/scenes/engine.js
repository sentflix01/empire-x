/*
 * Shot engine for the 9:16 promo clips (guide.html, landing.html).
 *
 * Frame layout (360 x 640 units):
 *   - the app screen ("scene") is drawn at 80% in a rounded card at the top;
 *   - below it, the subtitle band: a step tab (number + title) and one or two
 *     lines of subtitles with **highlighted** words (copy.js);
 *   - title cards (guide only) open each step full-frame.
 *
 * A clip is a list of shots played one after another with a short
 * cross-fade. Each shot draws one screen in its own time (lt, seconds) and
 * may give:
 *   cam:      [[lt, scale, focusX, focusY], ...]        zoom about a point
 *   hand:     [[lt, x, y, tap?, calloutKey?], ...]      the pointing hand
 *   title:    copy key of its step title; step: 1..6 (0 = no number)
 *   captions: [[from, to, copyKey], ...]                 guide subtitles
 *   land:     copy key of its one landing subtitle
 * A clip can replay a shot faster with { ...shot, k: 2 } (k = speed).
 * Everything is a function of t, so frames are exact (render.mjs).
 * Needs copy.js and common.js first.
 */
/* eslint-disable */
(function () {
const { C, prog, lerp, easeOut, easeInOut, easeIn, back, place } = window.PROMO;

// ---------- Words ----------

const LANG = new URLSearchParams(location.search).get('lang') || 'en';
const FONT = 'PromoInter, Inter, Arial, sans-serif';
const HL = 'hsl(221 83% 78%)'; // the primary blue, lightened, for highlighted words on dark
function lookup(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
/** L('ui.cats.2') → the word in the current language (English if missing). */
function L(path) {
  const v = lookup(window.COPY[LANG], path);
  return v == null ? lookup(window.COPY.en, path) ?? path : v;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = (s) => String(s).replace(/\*\*/g, '');

/** A text label. fit = max width; the font shrinks to fit (after fonts load). */
function tx(x, y, str, o = {}) {
  const { size = 14, weight = 600, fill = C.ink, anchor = 'start', fit = 0, k = '', ls = 0, opacity = 1 } = o;
  return `<text ${k ? `data-k="${k}"` : ''} x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${fit ? ` data-fit="${fit}"` : ''}${ls ? ` letter-spacing="${ls}"` : ''} opacity="${opacity}">${esc(str)}</text>`;
}
function fitTexts(root) {
  root.querySelectorAll('text[data-fit]').forEach((t) => {
    const max = Number(t.getAttribute('data-fit'));
    const len = t.getComputedTextLength();
    if (len > max) t.setAttribute('font-size', (Number(t.getAttribute('font-size')) * max / len).toFixed(2));
  });
}
const canvas = document.createElement('canvas').getContext('2d');
function measure(str, size, weight) { canvas.font = `${weight} ${size}px PromoInter, Inter, Arial, sans-serif`; return canvas.measureText(str).width; }

/** Splits "a **b c** d" into words with a bold flag, then into lines no wider than maxW. */
function wrapRich(str, size, maxW) {
  // A word that starts a part with no space before it (e.g. "**feed**.") is glued to the previous word.
  const words = [];
  const parts = String(str).split('**');
  parts.forEach((part, i) => {
    const glueFirst = i > 0 && part.length > 0 && !/^\s/.test(part) && !/\s$/.test(parts[i - 1]);
    part.split(/\s+/).filter(Boolean).forEach((w, j) => words.push({ w, bold: i % 2 === 1, glue: glueFirst && j === 0 && words.length > 0 }));
  });
  const space = measure(' ', size, 600);
  const lines = [[]]; let width = 0;
  words.forEach((word) => {
    const ww = measure(word.w, size, word.bold ? 800 : 500);
    const line = lines[lines.length - 1];
    const gap = line.length && !word.glue ? space : 0;
    if (line.length && !word.glue && width + gap + ww > maxW) { lines.push([word]); width = ww; }
    else { width += gap + ww; line.push(word); }
  });
  return lines;
}

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
const $ = (root, k) => root.querySelector(`[data-k="${k}"]`);
/** P(root)('name', {x, y, s, r, o}) places the element data-k="name" in that shot. */
const P = (root) => (k, o) => place($(root, k), o);
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

const SCENE = { x: 36, y: 12, s: 0.8 };       // the app screen inside the frame
const toCanvas = (x, y) => ({ x: SCENE.x + SCENE.s * x, y: SCENE.y + SCENE.s * y });
const CAP = { size: 15.5, line: 20, maxW: 312, bottom: 630 };
const LEAD = 2.0;                              // seconds of title card before a step

function run(shots, opts = {}) {
  const W = 360, H = 640, FADE = 0.35;
  const svg = document.getElementById('svg');
  const titleCards = !!opts.titleCards;
  const mode = opts.captions || 'full';
  let t = 0;
  shots.forEach((s, i) => {
    s.k = s.k || 1;
    s.lead = titleCards && s.title && (i === 0 || shots[i - 1].title !== s.title) ? LEAD : 0;
    s.start = t; s.len = (s.lead + s.dur) / s.k; t += s.len;
  });
  const total = t;

  // Subtitles on the clip's own clock, also exported for the WebVTT track.
  const caps = [];
  shots.forEach((s) => {
    const list = mode === 'landing' ? (s.land ? [[0.15, s.dur - 0.1, s.land]] : []) : (s.captions || []);
    list.forEach(([a, b, key]) => caps.push({
      start: s.start + (s.lead + a) / s.k, end: Math.min(s.start + (s.lead + b) / s.k, s.start + s.len), key, shot: s,
    }));
  });
  window.CAPTIONS = caps.map((c) => ({ start: c.start, end: c.end, text: plain(L(`cap.${c.key}`)) }));

  svg.innerHTML = `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ink}"/><stop offset="1" stop-color="#172554"/></linearGradient>
      <linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.violet}"/></linearGradient>
      <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#ffffff" stop-opacity=".35"/></linearGradient>
      <clipPath id="sceneClip"><rect width="${W}" height="${H}" rx="26"/></clipPath>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="330" cy="560" r="120" fill="${C.violet}" opacity=".18"/><circle cx="20" cy="610" r="90" fill="${C.blue}" opacity=".18"/>
    <g transform="translate(${SCENE.x} ${SCENE.y}) scale(${SCENE.s})">
      <g clip-path="url(#sceneClip)">
        <rect width="${W}" height="${H}" fill="${C.page}"/>
        ${shots.map((s, i) => `<g data-shot="${i}" opacity="0" style="display:none"><g class="cam"><rect width="${W}" height="${H}" fill="${s.bg || C.page}"/>${s.markup}</g></g>`).join('')}
      </g>
      <rect width="${W}" height="${H}" rx="26" fill="none" stroke="#ffffff" stroke-opacity=".14" stroke-width="2"/>
      <g id="hand" opacity="0">
        <circle id="hand-ring" r="16" fill="none" stroke="${C.blue}" stroke-width="3" opacity="0"/>
        <g id="hand-body">${HAND}</g>
      </g>
    </g>
    <g id="callout" opacity="0">
      <path id="co-tail" d="M-8 0 L0 9 L8 0 Z" fill="#ffffff"/>
      <rect id="co-box" x="0" y="0" width="10" height="32" rx="16" fill="#ffffff"/>
      <text id="co-text" x="0" y="21" font-family="${FONT}" font-size="14" font-weight="700" fill="${C.ink}" text-anchor="middle"></text>
    </g>
    <g id="caps" opacity="0">
      <g id="tab">
        <rect id="tab-box" x="12" y="0" width="10" height="24" rx="12" fill="${C.blue}"/>
        <circle id="tab-num-bg" cx="25" cy="12" r="9" fill="#ffffff"/>
        <text id="tab-num" x="25" y="16.5" font-family="${FONT}" font-size="12" font-weight="800" fill="${C.blue}" text-anchor="middle"></text>
        <text id="tab-title" x="40" y="16.5" font-family="${FONT}" font-size="12.5" font-weight="700" fill="#ffffff"></text>
      </g>
      <rect id="band" x="12" y="0" width="336" height="44" rx="16" fill="#020617" opacity=".9" stroke="#ffffff" stroke-opacity=".1"/>
      <text id="cap-a" font-family="${FONT}" font-size="${CAP.size}" font-weight="500" fill="#ffffff" text-anchor="middle"></text>
      <text id="cap-b" font-family="${FONT}" font-size="${CAP.size}" font-weight="500" fill="#ffffff" text-anchor="middle"></text>
    </g>
    <g id="tcard" opacity="0">
      <rect width="${W}" height="${H}" fill="url(#card)"/>
      <circle cx="300" cy="90" r="120" fill="#ffffff" opacity=".07"/><circle cx="40" cy="560" r="150" fill="#ffffff" opacity=".06"/>
      <text id="tc-eyebrow" x="180" y="0" font-family="${FONT}" font-size="13" font-weight="800" fill="#ffffff" fill-opacity=".8" letter-spacing="3" text-anchor="middle"></text>
      <g id="tc-words"></g>
      <rect id="tc-line" x="0" y="0" width="0" height="5" rx="2.5" fill="url(#sweep)"/>
    </g>`;
  shots.forEach((s, i) => { s.root = svg.querySelector(`[data-shot="${i}"]`); s.camEl = s.root.querySelector('.cam'); });

  const el = (id) => document.getElementById(id);
  const handEl = el('hand'), ringEl = el('hand-ring'), bodyEl = el('hand-body');

  // Layouts that need the font: subtitles, step tab, title cards, callouts.
  let ready = false;
  const capLayout = {};
  const titleLayout = {};
  function layout() {
    fitTexts(svg);
    caps.forEach((c) => {
      if (capLayout[c.key]) return;
      const lines = wrapRich(L(`cap.${c.key}`), CAP.size, CAP.maxW);
      const body = lines.map((line, i) => `<tspan x="180" dy="${i ? CAP.line : 0}">${line.map((wd, j) => `<tspan font-weight="${wd.bold ? 800 : 500}" fill="${wd.bold ? HL : '#ffffff'}">${j && !wd.glue ? ' ' : ''}${esc(wd.w)}</tspan>`).join('')}</tspan>`).join('');
      capLayout[c.key] = { body, n: lines.length };
    });
    shots.forEach((s) => {
      if (!s.title || titleLayout[s.title]) return;
      const text = L(`title.${s.title}`);
      const size = 34, maxW = 300;
      const lines = wrapRich(text, size, maxW);
      const space = measure(' ', size, 800);
      const widths = lines.map((ln) => ln.reduce((a, w, j) => a + measure(w.w, size, 800) + (j ? space : 0), 0));
      const y0 = 312 - ((lines.length - 1) * 42) / 2;
      let idx = 0;
      const words = lines.map((ln, li) => {
        let x = 180 - widths[li] / 2;
        return ln.map((w) => {
          const m = `<text class="tw" data-i="${idx++}" x="${x.toFixed(1)}" y="${(y0 + li * 42).toFixed(1)}" font-family="${FONT}" font-size="${size}" font-weight="800" fill="#ffffff">${esc(w.w)}</text>`;
          x += measure(w.w, size, 800) + space;
          return m;
        }).join('');
      }).join('');
      titleLayout[s.title] = { words, count: idx, lineY: y0 + (lines.length - 1) * 42 + 22, lineW: Math.max(...widths), eyebrowY: y0 - 46, tabW: measure(text, 12.5, 700) };
    });
    ready = true;
  }

  function camOf(s, lt) {
    if (!s.cam) return { z: 1, fx: W / 2, fy: H / 2 };
    const [z, fx, fy] = keyed(s.cam, lt);
    return { z, fx, fy };
  }

  let shownCard = null, capKeyA = null, capKeyB = null, calloutKey = null;
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
      if (i === 0) o = Math.max(o, prog(T, 0, 0.25));
      if (last) o = Math.min(o, 1 - prog(T, total - 0.6, total));
      s.root.setAttribute('opacity', o.toFixed(3));
      const lt = (T - s.start) * s.k - s.lead;
      const c = camOf(s, lt);
      s.camEl.setAttribute('transform', `translate(${c.fx} ${c.fy}) scale(${c.z.toFixed(4)}) translate(${-c.fx} ${-c.fy})`);
      s.draw && s.draw(lt, s.root);
    });
    const s = active;
    const lt = s ? (T - s.start) * s.k - s.lead : 0;

    // The hand follows the active shot's keys, through its camera.
    let callout = null;
    if (s && s.hand && lt > -0.2) {
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
      let press = 1, ring = 0;
      keys.forEach(([tk, kx, ky, tapK, call]) => {
        if (tapK) {
          press = Math.min(press, 1 - 0.16 * Math.sin(Math.PI * prog(lt, tk - 0.1, tk + 0.15)));
          const r = prog(lt, tk, tk + 0.5);
          if (r > 0 && r < 1) ring = r;
        }
        if (call && opts.callouts !== false && lt > tk - 1.0 && lt < tk + 0.35) {
          const cc = camOf(s, lt);
          const p = toCanvas(cc.fx + cc.z * (kx - cc.fx), cc.fy + cc.z * (ky - cc.fy));
          callout = { key: call, x: p.x, y: p.y, o: Math.min(prog(lt, tk - 1.0, tk - 0.8), 1 - prog(lt, tk + 0.15, tk + 0.35)), pop: back(prog(lt, tk - 1.0, tk - 0.7)) };
        }
      });
      place(bodyEl, { s: press });
      ringEl.setAttribute('r', (12 + 24 * easeOut(ring)).toFixed(2));
      ringEl.setAttribute('opacity', ring > 0 ? (0.8 * (1 - ring)).toFixed(3) : 0);
    } else {
      handEl.setAttribute('opacity', 0);
    }

    // Callout bubble above (or below) the target.
    const co = el('callout');
    if (callout && ready) {
      if (calloutKey !== callout.key) {
        calloutKey = callout.key;
        el('co-text').textContent = L(`call.${callout.key}`);
      }
      const w = measure(L(`call.${callout.key}`), 14, 700) + 28;
      const below = callout.y < 90;
      const bx = Math.min(Math.max(callout.x, w / 2 + 8), W - w / 2 - 8);
      const by = below ? callout.y + 26 : callout.y - 50;
      el('co-box').setAttribute('x', (-w / 2).toFixed(1)); el('co-box').setAttribute('width', w.toFixed(1));
      el('co-tail').setAttribute('transform', below ? `translate(${(callout.x - bx).toFixed(1)} 0) scale(1 -1)` : `translate(${(callout.x - bx).toFixed(1)} 32)`);
      co.setAttribute('transform', `translate(${bx.toFixed(1)} ${by.toFixed(1)}) scale(${callout.pop.toFixed(3)})`);
      co.setAttribute('opacity', callout.o.toFixed(3));
    } else {
      co.setAttribute('opacity', 0);
    }

    // Subtitles: the current line fades in over the last one.
    const capsEl = el('caps');
    if (ready && caps.length) {
      const now = caps.filter((c) => T >= c.start - 0.05 && T <= c.end + 0.3);
      const cur = now[now.length - 1] || null;
      const prev = now.length > 1 ? now[now.length - 2] : null;
      const anyNear = caps.some((c) => T >= c.start - 0.3 && T <= c.end + 0.5);
      const bandO = anyNear ? Math.min(1, ...caps.filter((c) => T >= c.start - 0.3 && T <= c.end + 0.5).map((c) => Math.min(prog(T, c.start - 0.3, c.start), 1 - prog(T, c.end + 0.2, c.end + 0.5)))) : 0;
      // A step's band stays up between its lines.
      const stepUp = s && caps.some((c) => c.shot.title === s.title && T >= c.start - 0.3) && caps.some((c) => c.shot.title === s.title && T <= c.end + 0.5);
      capsEl.setAttribute('opacity', (stepUp ? 1 : bandO).toFixed(3));
      const setCap = (id, key, o) => {
        const t_ = el(id);
        if (!key) { t_.setAttribute('opacity', 0); return; }
        if (t_.dataset.key !== key) { t_.innerHTML = capLayout[key].body; t_.dataset.key = key; }
        t_.setAttribute('opacity', o.toFixed(3));
      };
      const n = cur ? capLayout[cur.key].n : 1;
      const h = 24 + CAP.line * n;
      const bandY = CAP.bottom - h;
      el('band').setAttribute('y', bandY); el('band').setAttribute('height', h);
      const textY = bandY + 12 + CAP.size * 0.82;
      ['cap-a', 'cap-b'].forEach((id) => el(id).setAttribute('y', textY.toFixed(1)));
      // The old line fades out first, then the new one fades in: never two lines on top of each other.
      const handover = prev && cur && T < cur.start + 0.3;
      if (cur) setCap('cap-a', cur.key, Math.min(handover ? prog(T, cur.start + 0.12, cur.start + 0.3) : prog(T, cur.start, cur.start + 0.2), 1 - prog(T, cur.end, cur.end + 0.25)));
      else setCap('cap-a', null, 0);
      if (handover) setCap('cap-b', prev.key, 1 - prog(T, cur.start - 0.06, cur.start + 0.12));
      else setCap('cap-b', null, 0);
      // Step tab above the band.
      const tabT = s && s.title && titleLayout[s.title];
      el('tab').setAttribute('opacity', tabT ? 1 : 0);
      if (tabT) {
        const hasNum = !!s.step;
        el('tab-num').textContent = hasNum ? String(s.step) : '';
        el('tab-num-bg').setAttribute('opacity', hasNum ? 1 : 0);
        el('tab-title').textContent = L(`title.${s.title}`);
        el('tab-title').setAttribute('x', hasNum ? 40 : 24);
        el('tab-box').setAttribute('width', (tabT.tabW + (hasNum ? 40 : 24)).toFixed(1));
        el('tab').setAttribute('transform', `translate(0 ${bandY - 30})`);
      }
    } else {
      capsEl.setAttribute('opacity', 0);
    }

    // Title card for the first shot of a step.
    const card = el('tcard');
    if (ready && s && s.lead > 0 && (T - s.start) * s.k < s.lead) {
      const r = (T - s.start) * s.k;
      const L_ = titleLayout[s.title];
      if (shownCard !== s.title) {
        shownCard = s.title;
        el('tc-words').innerHTML = L_.words;
        el('tc-eyebrow').textContent = s.step ? `${L('step')} ${s.step}` : L('welcome');
        el('tc-eyebrow').setAttribute('y', L_.eyebrowY.toFixed(1));
        el('tc-line').setAttribute('y', L_.lineY.toFixed(1));
      }
      card.setAttribute('opacity', Math.min(prog(r, 0, 0.25), 1 - prog(r, s.lead - 0.35, s.lead)).toFixed(3));
      el('tc-eyebrow').setAttribute('opacity', prog(r, 0.1, 0.4).toFixed(3));
      card.querySelectorAll('.tw').forEach((w) => {
        const i = Number(w.dataset.i), f = easeOut(prog(r, 0.15 + 0.09 * i, 0.55 + 0.09 * i));
        w.setAttribute('transform', `translate(0 ${(16 * (1 - f)).toFixed(2)})`);
        w.setAttribute('opacity', f.toFixed(3));
      });
      const lw = L_.lineW * easeInOut(prog(r, 0.6, 1.15)) * 0.6;
      el('tc-line').setAttribute('x', (180 - lw / 2).toFixed(1)); el('tc-line').setAttribute('width', lw.toFixed(1));
    } else {
      card.setAttribute('opacity', 0);
    }
  };
  window.setTime(0);
  window.READY = (async () => {
    await document.fonts.ready;
    await Promise.all([...svg.querySelectorAll('image')].map((im) => new Promise((resolve) => { const i = new Image(); i.onload = i.onerror = resolve; i.src = im.getAttribute('href'); })));
    layout();
    window.setTime(0);
    return true;
  })();
}

window.ENGINE = { $, P, face, mood, photo, bar, GLYPH, HAND, phoneFrame, keyed, run, L, tx, FONT, measure };
})();
