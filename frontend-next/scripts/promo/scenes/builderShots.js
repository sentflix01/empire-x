/*
 * The "build and change your website" story (builder.html), app screen
 * 360 x 640 units. It shows only the owner's side: how anyone builds a
 * website from pieces and keeps changing it, with no code. Shopping,
 * feeds and bookings are in the guide video (guide.html).
 *
 *   bProblem      an AI site is quick to make, but changing it means code
 *   bStart     1  choose what you build; ready template or from scratch
 *   bPuzzle    2  add pieces with +; they snap into the live preview
 *   bFill      3  tap a piece, fill a simple form: photo, words, prices
 *   bChange    4  edit, move, delete and add pieces at any time
 *   bStyle     5  pick a colour; computer, tablet, phone
 *   bPublish   6  publish; bookings and orders arrive; a week later Update
 *   bAnyone    7  a city office, a company, a kid, a grandmother
 *   bFinale       code elsewhere vs tap, fill, done here; end card
 * Real Studio features: components/showroom/studio/SectionsPanel.tsx
 * (add, move up/down, remove), views/ShowroomWizard.tsx (template or
 * scratch), BuilderForm / PhotoField, BuilderPreview.
 * Needs copy.js, common.js, engine.js and shots.js first. Words: copy.js (ui.b.*).
 */
/* eslint-disable */
(function () {
const { C, prog, lerp, easeOut, easeInOut, easeIn, back, window_, ICON, confettiMarkup, confetti } = window.PROMO;
const { $, P, face, mood, photo, bar, GLYPH, L, tx } = window.ENGINE;
const { studioBar, typed, textW, at, g, retheme } = window.SHOTS.parts;
const LOGO = '../../../public/brand/nodbusiness-icon-v3.svg';
const RED = '#dc2626', RED_SUBTLE = '#fee2e2';
const MONO = 'DejaVu Sans Mono, Menlo, monospace';
const B = (k) => L(`ui.b.${k}`);
/** Width of a typed() clip for progress f: nothing shows before typing starts. */
const reveal = (root, k, f) => $(root, `${k}-clip`).setAttribute('width', f > 0 ? (textW(root, k) * f + 4).toFixed(1) : '0');

// Extra icons, centred on (0, 0), about 40 units across.
const IC = {
  up: (f) => `<path d="M0 -10 V10 M-8 -2 L0 -10 L8 -2" fill="none" stroke="${f}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  down: (f) => `<path d="M0 10 V-10 M-8 2 L0 10 L8 2" fill="none" stroke="${f}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  x: (f) => `<path d="M-8 -8 L8 8 M8 -8 L-8 8" stroke="${f}" stroke-width="4" stroke-linecap="round"/>`,
  star: (f) => `<path d="M0 -16 L4.7 -5.5 L16 -4.6 L7.4 2.8 L10 14 L0 8 L-10 14 L-7.4 2.8 L-16 -4.6 L-4.7 -5.5 Z" fill="${f}"/>`,
  lock: (f) => `<rect x="-13" y="-3" width="26" height="20" rx="4" fill="${f}"/><path d="M-8 -3 V-9 A8 8 0 0 1 8 -9 V-3" fill="none" stroke="${f}" stroke-width="4"/><circle cy="7" r="3" fill="${C.ink}"/>`,
  code: (f) => `<path d="M-9 -11 L-19 0 L-9 11 M9 -11 L19 0 L9 11 M4 -15 L-4 15" fill="none" stroke="${f}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  office: (f) => `<path d="M-20 -6 L0 -18 L20 -6 Z" fill="${f}"/><rect x="-18" y="12" width="36" height="5" rx="1.5" fill="${f}"/>${[-12, -4, 4, 12].map((x) => `<rect x="${x - 2.5}" y="-4" width="5" height="15" fill="${f}"/>`).join('')}`,
  calendar: (f) => `<rect x="-16" y="-13" width="32" height="30" rx="5" fill="none" stroke="${f}" stroke-width="3.5"/><path d="M-16 -4 H16 M-8 -18 V-9 M8 -18 V-9" stroke="${f}" stroke-width="3.5" stroke-linecap="round"/><rect x="-9" y="2" width="7" height="6" rx="1.5" fill="${f}"/>`,
  bread: (f) => `<path d="M-18 4 C-20 -10 -8 -14 0 -14 C8 -14 20 -10 18 4 L16 14 H-16 Z" fill="${f}"/><path d="M-8 -6 L-4 2 M0 -8 L4 0 M8 -6 L11 0" stroke="${C.paper}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`,
};

/** A puzzle piece w x h with a knob on the top edge and one on the left. */
const piecePath = (w, h, r = 10) => `M${r} 0 H${w / 2 - 8} A8 8 0 0 1 ${w / 2 + 8} 0 H${w - r} Q${w} 0 ${w} ${r} V${h - r} Q${w} ${h} ${w - r} ${h} H${r} Q0 ${h} 0 ${h - r} V${h / 2 + 7} A7 7 0 0 1 0 ${h / 2 - 7} V${r} Q0 0 ${r} 0 Z`;

// ---------------------------------------------------------------- the pieces of the hotel website
const PIECES = {
  cover: { glyph: GLYPH.gallery, c: C.blue, h: 70 },
  rooms: { glyph: GLYPH.bed, c: C.violet, h: 64 },
  gallery: { glyph: GLYPH.camera, c: C.green, h: 44 },
  prices: { glyph: GLYPH.clipboard, c: C.blueDeep, h: 40 },
  hours: { glyph: GLYPH.clock, c: C.blue, h: 30 },
  contact: { glyph: GLYPH.comment, c: C.violet, h: 30 },
  offer: { glyph: GLYPH.sparkle, c: C.violet, h: 34 },
};
const BW = 312;
const ROOM_TINTS = [C.violetSubtle, C.blueSubtle, C.greenSubtle];

/**
 * One piece as it looks on the website, BW wide, from (0, 0).
 * o.k prefixes data-k names; o.typed types the cover words (fill shot);
 * o.empty starts the cover photo and room prices empty; o.edited adds the
 * changed first room price (change shot).
 */
function block(id, theme = C.blue, o = {}) {
  const k = o.k || id, h = PIECES[id].h;
  switch (id) {
    case 'cover': return `<rect class="th" width="${BW}" height="${h}" rx="10" fill="${theme}"/>
      <rect x="6" y="6" width="118" height="58" rx="8" fill="${C.paper}" opacity=".22" stroke="${C.paper}" stroke-width="1.5" stroke-dasharray="5 4"/>
      <g data-k="${k}-ph0">${photo(6, 6, 118, 58, C.blueTint, C.blueDeep, 8)}</g>
      ${o.photoB ? `<g data-k="${k}-ph1">${photo(6, 6, 118, 58, C.greenSubtle, C.green, 8)}</g>` : ''}
      ${o.typed ? typed(`${k}-name`, 134, 28, B('name'), { size: 15, weight: 800, fill: C.paper, fit: 170 }) : tx(134, 28, B('name'), { size: 15, weight: 800, fill: C.paper, fit: 170 })}
      ${o.typed ? typed(`${k}-line`, 134, 44, B('line'), { size: 10.5, weight: 600, fill: C.paper, fit: 170 }) : tx(134, 44, B('line'), { size: 10.5, weight: 600, fill: C.paper, fit: 170 })}
      <rect x="134" y="51" width="70" height="15" rx="7.5" fill="${C.paper}"/>${tx(169, 62, B('book'), { size: 8.5, weight: 800, fill: theme, anchor: 'middle', fit: 62 })}`;
    case 'rooms': return `<rect width="${BW}" height="${h}" rx="10" fill="${C.paper}" stroke="${C.line}"/>
      ${[0, 1, 2].map((i) => `<rect x="${6 + i * 102}" y="6" width="96" height="52" rx="7" fill="${C.page}" stroke="${C.line}"/>
        <rect x="${6 + i * 102}" y="6" width="96" height="26" rx="7" fill="${ROOM_TINTS[i]}"/>${at(54 + i * 102, 19, 0.42, GLYPH.bed(C.violet))}
        ${o.empty ? `<g data-k="${k}-rph${i}">${photo(6 + i * 102, 6, 96, 26, C.violetTint, C.violet, 7)}</g>` : ''}
        ${tx(12 + i * 102, 44, L(`ui.b.roomNames.${i}`), { size: 8.5, weight: 700, fit: 84 })}
        ${o.empty ? typed(`${k}-p${i}`, 12 + i * 102, 54, L(`ui.b.roomPrices.${i}`), { size: 8.5, weight: 800, fill: theme })
          : `<text class="th" data-k="${k}-p${i}" x="${12 + i * 102}" y="54" font-family="${window.ENGINE.FONT}" font-size="8.5" font-weight="800" fill="${theme}">${L(`ui.b.roomPrices.${i}`)}</text>`}
        ${o.edited && i === 0 ? `<text class="th" data-k="${k}-p0b" x="${12 + i * 102}" y="54" font-family="${window.ENGINE.FONT}" font-size="8.5" font-weight="800" fill="${theme}" opacity="0">${B('newPrice')}</text>` : ''}`).join('')}`;
    case 'gallery': return `<rect width="${BW}" height="${h}" rx="10" fill="${C.paper}" stroke="${C.line}"/>
      ${[0, 1, 2, 3].map((i) => photo(6 + i * 76, 6, 72, 32, [C.blueTint, C.violetTint, C.greenSubtle, C.blueSubtle][i], [C.blue, C.violet, C.green, C.blueDeep][i], 6)).join('')}`;
    case 'prices': return `<rect width="${BW}" height="${h}" rx="10" fill="${C.page}" stroke="${C.line}"/>
      ${at(18, 20, 0.45, GLYPH.clipboard(C.blueDeep))}${tx(34, 17, B('priceList'), { size: 10, weight: 800 })}
      ${bar(34, 24, 120, 5, C.line)}${bar(34, 31, 90, 5, C.line)}${bar(240, 24, 56, 5, C.blueTint)}${bar(250, 31, 46, 5, C.blueTint)}`;
    case 'hours': return `<rect width="${BW}" height="${h}" rx="10" fill="${C.page}" stroke="${C.line}"/>
      ${at(18, 15, 0.4, GLYPH.clock(theme))}
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${36 + i * 30}" y="8" width="25" height="14" rx="7" fill="${C.green}"/>${tx(48.5 + i * 30, 18.5, L(`ui.days.${i}`), { size: 8.5, weight: 800, fill: C.paper, anchor: 'middle' })}`).join('')}`;
    case 'contact': return `<rect width="${BW}" height="${h}" rx="10" fill="${C.paper}" stroke="${C.line}"/>
      ${[0, 1, 2, 3].map((i) => `<circle class="th" cx="${20 + i * 28}" cy="15" r="10" fill="${theme}"/>${at(20 + i * 28, 15, 0.3, [GLYPH.comment(C.paper), ICON.pin(C.paper), GLYPH.play(C.paper), GLYPH.globe(C.paper)][i])}`).join('')}
      ${bar(140, 9, 150, 5, C.line)}${bar(140, 17, 100, 5, C.line)}`;
    case 'offer': return `<rect width="${BW}" height="${h}" rx="10" fill="${C.violet}"/>
      ${at(18, 17, 0.45, GLYPH.sparkle(C.paper))}${tx(34, 21.5, B('offerLine'), { size: 10.5, weight: 800, fill: C.paper, fit: 266 })}`;
  }
  return '';
}

/** A piece as a puzzle tile in a list: knob, icon, name (and buttons). */
function tile(id, w, h = 40, extra = '') {
  const p = PIECES[id];
  return `<path d="${piecePath(w, h)}" fill="${C.paper}" stroke="${C.line}" stroke-width="1.5"/>
    <circle cx="${h / 2 + 6}" cy="${h / 2}" r="${h / 2 - 6}" fill="${p.c}" opacity=".12"/>${at(h / 2 + 6, h / 2, 0.5, p.glyph(p.c))}
    ${tx(h + 12, h / 2 + 5, L(`ui.b.pieces.${id}`), { size: 14, weight: 700, fit: extra ? w - h - 112 : w - h - 64 })}${extra}`;
}

/** Positions of a list of pieces stacked top to bottom (y from 0), with fades for changes. */
function stack(order, hOf, gap) {
  const m = {}; let y = 0;
  order.forEach((id) => { m[id] = { y, o: 1, out: 0 }; y += hOf(id) + gap; });
  return { m, total: y - gap };
}
/** From layout a to layout b by f: shared pieces glide, removed fade out, new fade in. */
function mix(a, b, f) {
  const m = {};
  Object.keys(a.m).forEach((id) => {
    m[id] = b.m[id] ? { y: lerp(a.m[id].y, b.m[id].y, f), o: a.m[id].o, out: a.m[id].out } : { y: a.m[id].y, o: a.m[id].o * (1 - f), out: Math.max(a.m[id].out, f) };
  });
  Object.keys(b.m).forEach((id) => { if (!a.m[id]) m[id] = { y: b.m[id].y, o: f, out: 0, in: f }; });
  return { m, total: lerp(a.total, b.total, f) };
}
/** Places preview blocks data-k="pv-<id>" inside the frame top..top+avail, scaled to fit. */
function placePreview(root, lay, top, avail) {
  const s = Math.min(1, avail / lay.total);
  const x0 = 16 + (328 - BW * s) / 2;
  Object.entries(lay.m).forEach(([id, v]) => {
    const el = $(root, `pv-${id}`);
    if (!el) return;
    const pop = v.in != null ? lerp(0.85, 1, back(v.in)) : 1;
    el.setAttribute('transform', `translate(${(x0 + (BW * s * (1 - pop)) / 2).toFixed(2)} ${(top + v.y * s).toFixed(2)}) scale(${(s * pop).toFixed(4)})`);
    el.setAttribute('opacity', v.o.toFixed(3));
  });
}

/** The whole hotel website, 360 x 640 (themed shapes carry class "th"). */
function hotelSite(theme = C.blue, k = 'hs') {
  return `<rect width="360" height="640" fill="${C.paper}"/>
    <rect class="th" width="360" height="58" fill="${theme}"/>
    <circle cx="32" cy="29" r="17" fill="${C.paper}"/>${at(32, 29, 0.5, `<g class="thi">${GLYPH.bed(theme)}</g>`)}
    ${tx(58, 36, B('name'), { size: 18, weight: 800, fill: C.paper, fit: 280 })}
    <g data-k="${k}-ph0">${photo(16, 70, 328, 168, C.blueTint, C.blueDeep, 14)}</g>
    <g data-k="${k}-ph1" opacity="0">${photo(16, 70, 328, 168, C.greenSubtle, C.green, 14)}</g>
    <rect x="16" y="168" width="328" height="70" fill="${C.ink}" opacity=".28"/>
    ${tx(32, 200, B('line'), { size: 19, weight: 800, fill: C.paper, fit: 200 })}
    <rect class="th" x="244" y="190" width="90" height="30" rx="15" fill="${theme}"/>${tx(289, 210, B('book'), { size: 12, weight: 700, fill: C.paper, anchor: 'middle', fit: 80 })}
    ${tx(16, 266, L('ui.b.pieces.rooms'), { size: 15, weight: 800 })}
    ${[0, 1, 2].map((i) => `
      <rect x="${16 + i * 112}" y="276" width="104" height="104" rx="12" fill="${C.paper}" stroke="${C.line}"/>
      <rect x="${22 + i * 112}" y="282" width="92" height="50" rx="9" fill="${ROOM_TINTS[i]}"/>
      ${at(68 + i * 112, 307, 0.8, GLYPH.bed(C.violet))}
      ${tx(24 + i * 112, 352, L(`ui.b.roomNames.${i}`), { size: 12, weight: 700, fit: 88 })}
      <text class="th" x="${24 + i * 112}" y="370" font-family="${window.ENGINE.FONT}" font-size="11.5" font-weight="800" fill="${theme}">${L(`ui.b.roomPrices.${i}`)}</text>`).join('')}
    ${[0, 1, 2, 3].map((i) => photo(16 + i * 84, 394, 76, 70, [C.blueTint, C.violetTint, C.greenSubtle, C.blueSubtle][i], [C.blue, C.violet, C.green, C.blueDeep][i], 10)).join('')}
    <rect x="16" y="478" width="328" height="44" rx="12" fill="${C.page}"/>
    ${at(40, 500, 0.6, `<g class="thi">${GLYPH.clock(theme)}</g>`)}
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${64 + i * 39}" y="488" width="32" height="24" rx="12" fill="${C.green}"/>${tx(80 + i * 39, 504, L(`ui.days.${i}`), { size: 11, weight: 800, fill: C.paper, anchor: 'middle' })}`).join('')}
    ${[0, 1, 2, 3].map((i) => `<circle class="th" cx="${40 + i * 48}" cy="552" r="17" fill="${theme}"/>${at(40 + i * 48, 552, 0.45, [GLYPH.comment(C.paper), ICON.pin(C.paper), GLYPH.play(C.paper), GLYPH.globe(C.paper)][i])}`).join('')}
    ${bar(16, 588, 328, 10, C.line)}${bar(16, 606, 200, 8, C.line, 0.7)}`;
}
/** A device showing the hotel site, cropped to its screen, centred on (0, 0). */
function hotelDevice(w, h, bezel, k) {
  return `<rect x="${-w / 2 - bezel}" y="${-h / 2 - bezel}" width="${w + 2 * bezel}" height="${h + 2 * bezel}" rx="${bezel + 6}" fill="${C.ink}"/>
    <svg x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" viewBox="0 0 360 640" preserveAspectRatio="xMidYMin slice"><g data-k="${k}">${hotelSite(C.blue, k)}</g></svg>`;
}

// ---------------------------------------------------------------- 0 the problem: easy to make, hard to change
const CODE = [
  [C.violet, '<section class="rooms">'],
  [C.blue, '  <div class="card" id="r1">'],
  [C.green, '    <span class="price">2,500</span>'],
  [C.blue, '  </div>'],
  [C.violet, '</section>'],
  [C.slate, '.price { font: 600 1rem/1.2 var(--f);'],
  [C.slate, '  grid-template: auto / 1fr 2fr; }'],
  [C.blue, 'function renderRooms(list) {'],
  [C.green, '  return list.map((r) => card(r))'],
  [C.blue, '}'],
  [C.violet, 'export default { mount, render };'],
  [C.slate, '@media (max-width: 640px) { … }'],
];
function bProblem() {
  const scatter = ['cover', 'rooms', 'gallery', 'prices', 'hours', 'contact'];
  return {
    dur: 12, title: 'bProblem', step: 0,
    captions: [[0.2, 3.4, 'bProb1'], [3.5, 8.3, 'bProb2'], [8.4, 12, 'bProb3']], land: 'bProb2',
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      <g data-k="ai">
        <rect width="360" height="56" fill="${C.paper}"/><rect y="55" width="360" height="1" fill="${C.line}"/>
        ${at(30, 28, 0.6, GLYPH.sparkle(C.slate))}${tx(50, 34, B('aiTitle'), { size: 16, weight: 800, fill: C.slate })}
        <rect x="16" y="72" width="328" height="44" rx="22" fill="${C.paper}" stroke="${C.line}"/>
        ${typed('ask', 34, 99, B('aiAsk'), { size: 14, weight: 600, fit: 220 })}
        <g data-k="go"><circle cx="318" cy="94" r="16" fill="${C.slate}"/>${at(318, 94, 0.5, GLYPH.sparkle(C.paper))}</g>
        <g data-k="gen"><g transform="translate(56 134) scale(.69)">${hotelSite(C.slate, 'ai')}</g><rect x="56" y="134" width="248" height="442" fill="none" stroke="${C.line}"/></g>
        <rect data-k="spin" x="56" y="134" width="248" height="442" fill="${C.line}"/>
      </g>
      <g data-k="note">
        <rect x="-96" y="-34" width="192" height="68" rx="10" fill="${C.violetTint}" stroke="${C.violet}" stroke-width="1.5" transform="rotate(-3)"/>
        <g transform="rotate(-3)">${tx(-84, -8, `• ${B('note1')}`, { size: 12.5, weight: 700, fit: 172 })}${tx(-84, 16, `• ${B('note2')}`, { size: 12.5, weight: 700, fit: 172 })}</g>
      </g>
      <g data-k="code">
        <rect x="0" y="56" width="360" height="584" fill="${C.ink}"/>
        <rect x="0" y="56" width="360" height="30" fill="#1e293b"/>
        ${[RED, '#f59e0b', C.greenBright].map((c, i) => `<circle cx="${20 + i * 16}" cy="71" r="5" fill="${c}"/>`).join('')}
        ${tx(80, 76, 'rooms.html  ·  styles.css  ·  app.js', { size: 11, weight: 600, fill: C.slate })}
        <clipPath id="codeClip"><rect x="0" y="90" width="360" height="550"/></clipPath>
        <g clip-path="url(#codeClip)"><g data-k="lines">
          ${[0, 1, 2].map((rep) => CODE.map(([c, s], i) => { const n = rep * CODE.length + i; return `<g data-k="ln${n}">${tx(14, 112 + n * 26, String(n + 30), { size: 11, weight: 500, fill: '#475569' })}<text x="44" y="${112 + n * 26}" font-family="${MONO}" font-size="12" fill="${c === C.slate ? '#94a3b8' : c === C.violet ? '#c4b5fd' : c === C.blue ? '#93c5fd' : '#86efac'}" xml:space="preserve">${s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text></g>`; }).join('')).join('')}
        </g></g>
        <g data-k="err"><rect x="-96" y="-18" width="192" height="36" rx="18" fill="${RED}"/>${at(-74, 0, 0.45, IC.x(C.paper))}${tx(10, 5, B('error'), { size: 13, weight: 800, fill: C.paper, anchor: 'middle', fit: 150 })}</g>
        <g data-k="lockB"><circle r="30" fill="${C.paper}" opacity=".12"/>${g(IC.lock(C.paper), 'scale(1.1)')}</g>
      </g>
      <g data-k="brand"><rect x="-92" y="-22" width="184" height="44" rx="22" fill="${C.paper}" stroke="${C.line}"/><image href="${LOGO}" x="-80" y="-16" width="32" height="32"/>${tx(12, 6, L('ui.app'), { size: 17, weight: 800, anchor: 'middle' })}</g>
      ${scatter.map((id) => `<g data-k="pc-${id}">${g(tile(id, 220), 'translate(-110 -20)')}</g>`).join('')}
      ${at(0, 0, 1, face('me'))}
      ${['q1', 'q2'].map((k) => `<g data-k="${k}">${tx(0, 0, '?', { size: 26, weight: 800, fill: C.violet, anchor: 'middle' })}</g>`).join('')}
      ${confettiMarkup('cf-prob', 16)}`,
    draw(lt, root) {
      const p = P(root);
      reveal(root, 'ask', prog(lt, 0.4, 1.4));
      p('spin', { o: lt < 1.8 ? 1 : 1 - prog(lt, 1.8, 2.5) });
      p('gen', { o: prog(lt, 1.8, 2.3) });
      $(root, 'go').setAttribute('transform', `translate(318 94) scale(${(1 - 0.15 * Math.sin(Math.PI * prog(lt, 1.55, 1.8))).toFixed(3)}) translate(-318 -94)`);
      p('ai', { o: 1 - prog(lt, 9.0, 9.4) });
      p('note', { x: 230, y: 214, s: back(prog(lt, 3.6, 4.0)), o: Math.min(prog(lt, 3.6, 3.7), 1 - prog(lt, 5.0, 5.3)) });
      // Tap the price: instead of a form, a wall of code.
      const up = easeInOut(prog(lt, 5.1, 5.7));
      p('code', { o: Math.min(prog(lt, 5.1, 5.2), 1 - prog(lt, 8.6, 9.0)) });
      $(root, 'code').setAttribute('transform', `translate(0 ${(584 * (1 - up)).toFixed(1)})`);
      $(root, 'lines').setAttribute('transform', `translate(0 ${(-260 * easeInOut(prog(lt, 5.7, 8.4))).toFixed(1)})`);
      p('err', { x: 180, y: 330, s: back(prog(lt, 6.6, 6.9)), o: Math.min(prog(lt, 6.6, 6.7), 1 - prog(lt, 8.4, 8.6)) });
      p('lockB', { x: 180, y: 260, s: back(prog(lt, 7.2, 7.5)), o: Math.min(prog(lt, 7.2, 7.3), 1 - prog(lt, 8.4, 8.6)) });
      // The face: happy with the quick site, lost in the code, happy with pieces.
      const calm = easeInOut(prog(lt, 9.4, 10.0));
      p('me', { x: lerp(300, 180, calm), y: lerp(560, 520, calm), s: 1.2 * back(prog(lt, 3.3, 3.7)) * lerp(1, 1.3, calm), o: Math.min(prog(lt, 3.3, 3.4), Math.max(1 - prog(lt, 8.9, 9.1), prog(lt, 9.6, 9.8))) });
      mood(root, 'me', lt < 6.2 ? 'smile' : lt < 9.4 ? 'confused' : 'big');
      p('brand', { x: 180, y: 96, s: back(prog(lt, 9.0, 9.4)), o: prog(lt, 9.0, 9.1) });
      ['q1', 'q2'].forEach((k, i) => p(k, { x: 270 + i * 58, y: 520 - 8 * Math.sin(lt * 4 + i), s: back(prog(lt, 6.4 + 0.2 * i, 6.7 + 0.2 * i)), o: Math.min(prog(lt, 6.4 + 0.2 * i, 6.5 + 0.2 * i), 1 - prog(lt, 8.5, 8.8)) }));
      // The code breaks into pieces you can touch.
      scatter.forEach((id, i) => {
        const f = easeInOut(prog(lt, 8.7 + 0.1 * i, 9.7 + 0.1 * i));
        const from = { x: 120 + ((i * 53) % 140), y: 160 + i * 62 };
        p(`pc-${id}`, { x: lerp(from.x, 180, f), y: lerp(from.y, 160 + i * 50, f), r: lerp(i % 2 ? 14 : -12, 0, f), s: lerp(0.6, 1, f), o: prog(lt, 8.7 + 0.1 * i, 8.9 + 0.1 * i) });
      });
      confetti('cf-prob', 180, 300, lt, 10.2, 170);
    },
    hand: [[0.2, 200, 140, true, 'bAsk'], [1.6, 318, 94, true], [2.6, 250, 420], [4.6, 120, 391, true, 'bTapPrice'], [6.0, 220, 470], [7.6, 200, 520]],
  };
}

// ---------------------------------------------------------------- 1 start your way
const KINDS = [
  { glyph: GLYPH.bed, c: C.violet }, { glyph: ICON.store, c: C.blue }, { glyph: IC.office, c: C.blueDeep },
  { glyph: GLYPH.briefcase, c: C.green }, { glyph: GLYPH.cap, c: C.blue }, { glyph: GLYPH.palette, c: C.violet },
];
function bStart() {
  return {
    dur: 9, title: 'bStart', step: 1,
    captions: [[0.2, 2.6, 'bStart1'], [2.7, 6.4, 'bStart2'], [6.5, 9, 'bStart3']], land: 'bStart2',
    markup: `
      <g data-k="scrA">
        <rect width="360" height="640" fill="${C.page}"/>${studioBar(B('what'))}
        ${KINDS.map((c, i) => `<g data-k="kind${i}">
          <rect x="-78" y="-42" width="156" height="84" rx="16" fill="${C.paper}" stroke="${C.line}"/>
          <circle cx="-44" cy="0" r="24" fill="${c.c}" opacity=".12"/>${at(-44, 0, 0.75, c.glyph(c.c))}
          ${tx(-12, 5, L(`ui.b.kinds.${i}`), { size: 14, weight: 800, fit: 84 })}</g>`).join('')}
        <rect data-k="ring" x="14" y="84" width="164" height="92" rx="20" fill="none" stroke="${C.blue}" stroke-width="3"/>
      </g>
      <g data-k="scrB">
        <rect width="360" height="640" fill="${C.page}"/>${studioBar(B('how'))}
        <g data-k="doorA">
          <rect x="16" y="76" width="328" height="250" rx="18" fill="${C.paper}" stroke="${C.line}"/>
          <rect x="30" y="90" width="120" height="222" rx="10" fill="${C.ink}"/>
          <svg x="35" y="95" width="110" height="212" viewBox="0 0 360 640" preserveAspectRatio="xMidYMin slice">${hotelSite(C.blue, 'ta')}</svg>
          ${tx(166, 176, B('tpl'), { size: 18, weight: 800, fit: 166 })}${tx(166, 200, B('tplSub'), { size: 13, weight: 500, fill: C.slate, fit: 166 })}
          <rect x="166" y="220" width="96" height="30" rx="15" fill="${C.blue}"/>${tx(214, 240, B('use'), { size: 12, weight: 800, fill: C.paper, anchor: 'middle', fit: 84 })}
        </g>
        <g data-k="doorB">
          <rect x="16" y="342" width="328" height="196" rx="18" fill="${C.paper}" stroke="${C.blue}" stroke-width="2.5" stroke-dasharray="9 7"/>
          <rect x="30" y="356" width="120" height="168" rx="10" fill="${C.page}" stroke="${C.line}" stroke-dasharray="6 5"/>
          <circle cx="90" cy="440" r="24" fill="${C.blueSubtle}"/>${at(90, 440, 1, GLYPH.plus(C.blue))}
          ${tx(166, 432, B('scratch'), { size: 18, weight: 800, fill: C.blue, fit: 166 })}${tx(166, 456, B('scratchSub'), { size: 13, weight: 500, fill: C.slate, fit: 166 })}
        </g>
        <g data-k="full">${hotelSite(C.blue, 'tf')}</g>
        <g data-k="ok"><circle r="22" fill="${C.green}"/>${ICON.check(C.paper)}</g>
      </g>`,
    draw(lt, root) {
      const p = P(root);
      KINDS.forEach((c, i) => {
        const pop = back(prog(lt, 0.2 + 0.08 * i, 0.6 + 0.08 * i));
        const hit = i === 0 ? 1 + 0.07 * Math.sin(Math.PI * prog(lt, 1.75, 2.05)) : 1;
        p(`kind${i}`, { x: i % 2 ? 264 : 96, y: 130 + Math.floor(i / 2) * 100, s: pop * hit, o: prog(lt, 0.2 + 0.08 * i, 0.3 + 0.08 * i) });
      });
      p('ring', { o: window_(lt, 1.8, 1.9, 2.4, 2.7) });
      p('scrA', { o: 1 - prog(lt, 2.6, 2.9) });
      const inB = easeInOut(prog(lt, 2.5, 3.0));
      p('scrB', { x: lerp(360, 0, inB), o: prog(lt, 2.5, 2.6) });
      // Ready template: the whole site in one tap, then back to the two ways.
      const full = window_(lt, 4.4, 5.0, 6.3, 6.7);
      const s0 = 110 / 360;
      $(root, 'full').setAttribute('transform', `translate(${lerp(35, 0, full).toFixed(2)} ${lerp(95, 0, full).toFixed(2)}) scale(${lerp(s0, 1, full).toFixed(4)})`);
      $(root, 'full').setAttribute('opacity', (full > 0.02 ? 1 : 0));
      p('ok', { x: 316, y: 96, s: back(prog(lt, 5.0, 5.3)), o: Math.min(prog(lt, 5.0, 5.1), 1 - prog(lt, 6.2, 6.4)) });
      p('doorB', { s: 1, o: 1 });
      const pulse = 1 + 0.03 * Math.sin(Math.PI * prog(lt, 7.5, 7.9));
      $(root, 'doorB').setAttribute('transform', `translate(180 440) scale(${pulse.toFixed(4)}) translate(-180 -440)`);
    },
    hand: [[0.6, 240, 420], [1.9, 96, 130, true, 'bHotel'], [3.4, 250, 300], [4.3, 214, 235, true, 'bTemplate'], [6.8, 250, 470], [7.6, 200, 440, true, 'bScratch'], [8.4, 260, 520]],
  };
}

// ---------------------------------------------------------------- 2 build it like a puzzle
const ORDER = ['cover', 'rooms', 'gallery', 'prices', 'hours', 'contact'];
function bPuzzle() {
  const full = stack(ORDER, (id) => PIECES[id].h, 6);
  const PV = { top: 72, avail: 220 };
  const s = Math.min(1, PV.avail / full.total);
  const tiles = ORDER.map((id, i) => ({ id, x: 24, y: 356 + i * 44, t0: 0.9 + 1.2 * i }));
  return {
    dur: 10, title: 'bPuzzle', step: 2,
    captions: [[0.2, 4.6, 'bPuz1'], [4.7, 10, 'bPuz2']], land: 'bPuz1',
    markup: `<rect width="360" height="640" fill="${C.page}"/>${studioBar(B('yourSite'))}
      <rect data-k="frame" x="16" y="64" width="328" height="236" rx="14" fill="${C.paper}" stroke="${C.slate}" stroke-width="2" stroke-dasharray="8 6"/>
      <g data-k="empty">${tx(180, 186, B('empty'), { size: 14, weight: 700, fill: C.slate, anchor: 'middle', fit: 280 })}</g>
      ${ORDER.map((id) => `<g data-k="pv-${id}">${block(id)}</g>`).join('')}
      <rect x="0" y="312" width="360" height="340" rx="24" fill="${C.paper}" stroke="${C.line}"/>${bar(160, 322, 40, 6, C.line)}
      ${tx(24, 346, B('addPiece'), { size: 15, weight: 800 })}
      ${tiles.map((t) => `<g transform="translate(${t.x} ${t.y})">${tile(t.id, 312, 38)}
        <g data-k="plus-${t.id}"><circle r="14" fill="${C.blue}"/>${g(GLYPH.plus(C.paper), 'scale(.8)')}</g>
        <g data-k="done-${t.id}"><circle r="14" fill="${C.green}"/>${g(ICON.check(C.paper), 'scale(.6)')}</g></g>`).join('')}
      ${ORDER.map((id) => `<g data-k="fly-${id}">${g(tile(id, 220, 38), 'translate(-110 -19)')}</g>`).join('')}
      <g data-k="ok"><circle r="20" fill="${C.green}"/>${g(ICON.check(C.paper), 'scale(.9)')}</g>`,
    draw(lt, root) {
      const p = P(root);
      p('empty', { o: 1 - prog(lt, 1.3, 1.6) });
      tiles.forEach((t, i) => {
        const f = easeInOut(prog(lt, t.t0 + 0.05, t.t0 + 0.6));
        const end = full.m[t.id];
        const tx_ = 16 + (328 - BW * s) / 2, ty = PV.top + end.y * s;
        // A tile flies up and turns into its block, which snaps into place.
        p(`fly-${t.id}`, { x: lerp(t.x + 110, 180, f), y: lerp(t.y + 19, ty + (PIECES[t.id].h * s) / 2, f), s: lerp(1, 0.8, f), o: f > 0 && f < 0.85 ? 1 : 0 });
        const snap = prog(lt, t.t0 + 0.5, t.t0 + 0.8);
        const pop = snap > 0 ? lerp(1.08, 1, easeOut(snap)) : 1;
        $(root, `pv-${t.id}`).setAttribute('transform', `translate(${(tx_ + (BW * s * (1 - pop)) / 2).toFixed(2)} ${ty.toFixed(2)}) scale(${(s * pop).toFixed(4)})`);
        $(root, `pv-${t.id}`).setAttribute('opacity', prog(lt, t.t0 + 0.5, t.t0 + 0.6).toFixed(3));
        p(`plus-${t.id}`, { x: 288, y: 19, s: 1 - 0.2 * Math.sin(Math.PI * prog(lt, t.t0 - 0.1, t.t0 + 0.15)), o: 1 - prog(lt, t.t0 + 0.2, t.t0 + 0.3) });
        p(`done-${t.id}`, { x: 288, y: 19, s: back(prog(lt, t.t0 + 0.2, t.t0 + 0.5)), o: prog(lt, t.t0 + 0.2, t.t0 + 0.3) });
      });
      $(root, 'frame').setAttribute('stroke-dasharray', lt > 8.0 ? 'none' : '8 6');
      $(root, 'frame').setAttribute('stroke', lt > 8.0 ? C.line : C.slate);
      p('ok', { x: 320, y: 82, s: back(prog(lt, 8.0, 8.35)), o: prog(lt, 8.0, 8.1) });
    },
    hand: [[0.3, 220, 610], ...tiles.map((t, i) => [t.t0, t.x + 288, t.y + 19, true, i === 0 ? 'bPlus' : undefined]), [8.6, 260, 620]],
  };
}

// ---------------------------------------------------------------- 3 fill a form, not code
function bFill() {
  return {
    dur: 13, title: 'bFill', step: 3,
    captions: [[0.2, 3.6, 'bFill1'], [3.7, 7.0, 'bFill2'], [7.1, 13, 'bFill3']], land: 'bFillL',
    markup: `<rect width="360" height="640" fill="${C.page}"/>${studioBar(B('yourSite'))}
      <rect x="16" y="64" width="328" height="160" rx="14" fill="${C.paper}" stroke="${C.line}"/>
      <g transform="translate(24 72)">${block('cover', C.blue, { k: 'pc', typed: true })}</g>
      <g transform="translate(24 148)">${block('rooms', C.blue, { k: 'pr', empty: true })}</g>
      <rect data-k="hlC" x="20" y="68" width="320" height="78" rx="13" fill="none" stroke="${C.blue}" stroke-width="3"/>
      <rect data-k="hlR" x="20" y="144" width="320" height="72" rx="13" fill="none" stroke="${C.blue}" stroke-width="3"/>
      <g data-k="sheetA">
        <rect x="0" y="236" width="360" height="420" rx="24" fill="${C.paper}" stroke="${C.line}"/>${bar(160, 246, 40, 6, C.line)}
        ${at(36, 274, 0.55, GLYPH.gallery(C.blue))}${tx(56, 280, L('ui.b.pieces.cover'), { size: 16, weight: 800 })}
        <g data-k="fEmpty"><rect x="24" y="296" width="312" height="84" rx="12" fill="${C.violetSubtle}" stroke="${C.violet}" stroke-width="2" stroke-dasharray="7 5"/>${at(126, 338, 0.75, GLYPH.camera(C.violet))}${tx(150, 344, B('addPhoto'), { size: 17, weight: 800, fill: C.violet })}</g>
        <g data-k="fFull">${photo(24, 296, 312, 84, C.blueTint, C.blueDeep, 12)}</g>
        ${[396, 448].map((y) => `<rect x="24" y="${y}" width="312" height="40" rx="10" fill="${C.page}" stroke="${C.line}"/>`).join('')}
        ${tx(40, 421, B('namePh'), { size: 14, weight: 500, fill: C.slate, k: 'phN' })}${typed('fN', 40, 421, B('name'), { size: 15, weight: 800 })}
        ${tx(40, 473, B('linePh'), { size: 14, weight: 500, fill: C.slate, k: 'phL' })}${typed('fL', 40, 473, B('line'), { size: 14, weight: 600 })}
        <rect data-k="caretA" x="0" y="405" width="2.5" height="20" fill="${C.blue}"/>
        <g data-k="picker"><rect x="56" y="390" width="248" height="74" rx="16" fill="${C.paper}" stroke="${C.line}"/>${[0, 1, 2].map((i) => photo(68 + i * 80, 400, 64, 54, [C.blueTint, C.violetTint, C.greenSubtle][i], [C.blueDeep, C.violet, C.green][i], 8)).join('')}</g>
      </g>
      <g data-k="sheetB">
        <rect x="0" y="236" width="360" height="420" rx="24" fill="${C.paper}" stroke="${C.line}"/>${bar(160, 246, 40, 6, C.line)}
        ${at(36, 274, 0.55, GLYPH.bed(C.violet))}${tx(56, 280, L('ui.b.pieces.rooms'), { size: 16, weight: 800 })}
        ${[0, 1].map((i) => `<g transform="translate(0 ${i * 120})">
          <rect x="24" y="296" width="312" height="108" rx="12" fill="${C.page}" stroke="${C.line}"/>
          <rect x="36" y="308" width="84" height="84" rx="10" fill="${C.paper}" stroke="${C.violet}" stroke-width="1.5" stroke-dasharray="5 4"/>${at(78, 350, 0.6, GLYPH.camera(C.violet))}
          <g data-k="bph${i}">${photo(36, 308, 84, 84, C.violetTint, C.violet, 10)}</g>
          ${tx(134, 326, L(`ui.b.roomNames.${i}`), { size: 15, weight: 800, fit: 190 })}
          ${tx(134, 348, B('pricePh'), { size: 11, weight: 600, fill: C.slate })}
          <rect x="134" y="356" width="150" height="34" rx="10" fill="${C.paper}" stroke="${C.line}"/>
          ${typed(`bp${i}`, 146, 379, L(`ui.b.roomPrices.${i}`), { size: 15, weight: 800, fill: C.blueDeep })}
          ${tx(292, 379, B('perNight'), { size: 12, weight: 600, fill: C.slate })}</g>`).join('')}
        <rect data-k="caretB" x="0" y="0" width="2.5" height="20" fill="${C.blue}"/>
      </g>`,
    cam: [[0, 1, 180, 320], [1.4, 1, 180, 320], [1.9, 1.15, 180, 380], [6.6, 1.15, 180, 380], [7.1, 1, 180, 320], [8.0, 1, 180, 320], [8.4, 1.15, 180, 400], [12.0, 1.15, 180, 400], [12.6, 1, 180, 320]],
    draw(lt, root) {
      const p = P(root);
      p('hlC', { o: window_(lt, 0.7, 0.8, 1.2, 1.5) });
      const shA = easeOut(prog(lt, 0.9, 1.4));
      $(root, 'sheetA').setAttribute('transform', `translate(0 ${(420 * (1 - shA)).toFixed(1)})`);
      $(root, 'sheetA').setAttribute('opacity', (1 - prog(lt, 7.3, 7.6)).toFixed(3));
      // Photo: tap the field, pick one, it appears in the form and the site.
      const pk = back(prog(lt, 2.0, 2.3));
      $(root, 'picker').setAttribute('transform', `translate(180 427) scale(${pk.toFixed(4)}) translate(-180 -427)`);
      $(root, 'picker').setAttribute('opacity', Math.min(prog(lt, 2.0, 2.1), 1 - prog(lt, 2.9, 3.1)).toFixed(3));
      p('fEmpty', { o: 1 - prog(lt, 2.9, 3.1) });
      p('fFull', { o: prog(lt, 2.9, 3.1) });
      p('pc-ph0', { o: prog(lt, 3.0, 3.3) });
      // Words: typed in the form and in the site at once.
      const nm = prog(lt, 4.0, 5.0), ln = prog(lt, 5.4, 6.4);
      const set = (k, f) => reveal(root, k, f);
      set('fN', nm); set('fL', ln); set('pc-name', nm); set('pc-line', ln);
      p('phN', { o: lt < 4.0 ? 1 : 0 });
      p('phL', { o: lt < 5.4 ? 1 : 0 });
      const tN = lt > 3.8 && lt < 5.2, tL = lt > 5.2 && lt < 6.6;
      p('caretA', { x: 41 + (tN ? textW(root, 'fN') * nm : textW(root, 'fL') * ln), y: tN ? 0 : 52, o: (tN || tL) && Math.floor(lt * 3) % 2 === 0 ? 1 : 0 });
      // Rooms: tap the rooms piece; add prices and photos.
      p('hlR', { o: window_(lt, 7.0, 7.1, 7.5, 7.8) });
      const shB = easeOut(prog(lt, 7.4, 7.9));
      $(root, 'sheetB').setAttribute('transform', `translate(0 ${(420 * (1 - shB)).toFixed(1)})`);
      $(root, 'sheetB').setAttribute('opacity', prog(lt, 7.3, 7.4).toFixed(3));
      const p0 = prog(lt, 8.6, 9.4), p1 = prog(lt, 11.0, 11.7);
      set('bp0', p0); set('bp1', p1); set('pr-p0', p0); set('pr-p1', p1); set('pr-p2', prog(lt, 11.9, 12.3));
      const c0 = lt > 8.5 && lt < 9.6, c1 = lt > 10.9 && lt < 11.9;
      p('caretB', { x: 147 + (c0 ? textW(root, 'bp0') * p0 : textW(root, 'bp1') * p1), y: c0 ? 360 : 480, o: (c0 || c1) && Math.floor(lt * 3) % 2 === 0 ? 1 : 0 });
      p('bph0', { o: prog(lt, 10.0, 10.3) });
      p('bph1', { o: prog(lt, 12.1, 12.4) });
      p('pr-rph0', { o: prog(lt, 10.1, 10.4) });
      p('pr-rph1', { o: prog(lt, 12.2, 12.5) });
      p('pr-rph2', { o: prog(lt, 12.3, 12.6) });
    },
    hand: [[0.3, 240, 200], [0.8, 180, 107, true, 'bTapPiece'], [1.8, 180, 338, true, 'bAddPhoto'], [2.8, 180, 427, true, 'bPick'], [3.8, 180, 416, true, 'bType'], [5.3, 180, 468, true], [6.6, 260, 560],
      [7.0, 180, 180, true, 'bTapPiece'], [8.5, 210, 373, true, 'bPrice'], [9.9, 78, 350, true, 'bAddPhoto'], [10.9, 210, 493, true], [12.0, 78, 470, true], [12.6, 260, 600]],
  };
}

// ---------------------------------------------------------------- 4 change anything, any time
const O0 = ['cover', 'rooms', 'gallery', 'prices', 'hours', 'contact'];
const O1 = ['cover', 'gallery', 'rooms', 'prices', 'hours', 'contact'];
const O2 = ['cover', 'gallery', 'rooms', 'hours', 'contact'];
const O3 = ['cover', 'gallery', 'rooms', 'hours', 'contact', 'offer'];
const ROW = { y0: 318, h: 40, gap: 6 };
function bChange() {
  const hOf = (id) => PIECES[id].h;
  const pv = [O0, O1, O2, O3].map((o) => stack(o, hOf, 6));
  const rows = [O0, O1, O2, O3].map((o) => stack(o, () => ROW.h, ROW.gap));
  const stages = (lt) => [easeInOut(prog(lt, 4.7, 5.3)), easeInOut(prog(lt, 7.7, 8.3)), easeOut(prog(lt, 10.9, 11.5))];
  const at_ = (list, lt) => { const f = stages(lt); let cur = list[0]; f.forEach((x, i) => { cur = mix(cur, list[i + 1], x); }); return cur; };
  const btn = (x, k, icon, fill, bg) => `<g data-k="${k}" transform="translate(${x} 20)"><circle r="13" fill="${bg}"/>${g(icon(fill), 'scale(.55)')}</g>`;
  const ids = ['cover', 'rooms', 'gallery', 'prices', 'hours', 'contact', 'offer'];
  const rowY = (id) => ROW.y0 + rows[0].m[id].y + 20;
  return {
    dur: 14, title: 'bChange', step: 4,
    captions: [[0.2, 3.9, 'bCh1'], [4.0, 6.9, 'bCh2'], [7.0, 9.9, 'bCh3'], [10.0, 14, 'bCh4']], land: 'bChL',
    markup: `<rect width="360" height="640" fill="${C.page}"/>${studioBar(B('yourSite'))}
      <rect x="16" y="64" width="328" height="236" rx="14" fill="${C.paper}" stroke="${C.line}"/>
      ${ids.map((id) => `<g data-k="pv-${id}">${block(id, C.blue, { k: `b${id}`, edited: id === 'rooms' })}</g>`).join('')}
      <rect x="0" y="306" width="360" height="346" rx="24" fill="${C.paper}" stroke="${C.line}"/>
      ${ids.map((id) => `<g data-k="row-${id}">${tile(id, 328, ROW.h, `${btn(250, `up-${id}`, IC.up, C.ink, C.page)}${btn(280, `dn-${id}`, IC.down, C.ink, C.page)}${btn(312, `del-${id}`, IC.x, RED, RED_SUBTLE)}`)}</g>`).join('')}
      <g data-k="add"><rect x="16" y="598" width="328" height="34" rx="10" fill="${C.blueSubtle}" stroke="${C.blue}" stroke-width="2" stroke-dasharray="7 5"/>${at(136, 615, 0.65, GLYPH.plus(C.blue))}${tx(152, 620, B('addPiece'), { size: 14, weight: 800, fill: C.blue })}</g>
      <g data-k="menu"><rect x="-130" y="-70" width="260" height="140" rx="16" fill="${C.paper}" stroke="${C.line}"/>
        ${['offer', 'prices', 'gallery'].map((id, i) => `<g transform="translate(-118 ${-58 + i * 44})">${tile(id, 236, 36)}</g>`).join('')}
        <rect data-k="menuHl" x="-122" y="-62" width="244" height="44" rx="12" fill="none" stroke="${C.blue}" stroke-width="3"/></g>
      <g data-k="pop"><rect x="-120" y="-44" width="240" height="88" rx="16" fill="${C.paper}" stroke="${C.blue}" stroke-width="2"/>
        ${tx(-104, -18, `${L('ui.b.roomNames.0')} · ${B('pricePh')}`, { size: 12, weight: 700, fill: C.slate, fit: 210 })}
        <rect x="-104" y="-6" width="150" height="36" rx="10" fill="${C.page}" stroke="${C.line}"/>
        <g data-k="old">${tx(-92, 18, L('ui.b.roomPrices.0'), { size: 16, weight: 800, fill: C.blueDeep })}</g>
        <g data-k="new">${tx(-92, 18, B('newPrice'), { size: 16, weight: 800, fill: C.blueDeep })}</g>
        <g data-k="save"><circle cx="82" cy="12" r="20" fill="${C.green}"/>${at(82, 12, 0.7, ICON.check(C.paper))}</g></g>
      ${confettiMarkup('cf-del', 12)}`,
    draw(lt, root) {
      const p = P(root);
      placePreview(root, at_(pv, lt), 70, 224);
      const rl = at_(rows, lt);
      Object.entries(rl.m).forEach(([id, v]) => {
        const el = $(root, `row-${id}`);
        const slide = 80 * easeIn(v.out || 0);
        const pop = v.in != null ? lerp(0.6, 1, back(v.in)) : 1;
        el.setAttribute('transform', `translate(${(16 + slide + 164 * (1 - pop)).toFixed(2)} ${(ROW.y0 + v.y + 20 * (1 - pop)).toFixed(2)}) scale(${pop.toFixed(4)})`);
        el.setAttribute('opacity', v.o.toFixed(3));
      });
      ['offer'].forEach((id) => { if (!rl.m[id]) $(root, `row-${id}`).setAttribute('opacity', 0); });
      ['offer'].forEach((id) => { if (!at_(pv, lt).m[id]) $(root, `pv-${id}`).setAttribute('opacity', 0); });
      // Edit: tap the Rooms piece, change the price, save.
      p('pop', { x: 180, y: rowY('rooms') - 76, s: back(prog(lt, 1.0, 1.3)), o: Math.min(prog(lt, 1.0, 1.1), 1 - prog(lt, 3.3, 3.6)) });
      p('old', { o: 1 - prog(lt, 1.9, 2.1) });
      p('new', { o: prog(lt, 2.2, 2.4) });
      p('save', { s: 1 - 0.15 * Math.sin(Math.PI * prog(lt, 2.9, 3.15)) });
      p('brooms-p0', { o: 1 - prog(lt, 3.0, 3.2) });
      p('brooms-p0b', { o: prog(lt, 3.1, 3.3) });
      // Move: tap the up arrow on Photos.
      $(root, 'up-gallery').setAttribute('transform', `translate(250 20) scale(${(1 - 0.25 * Math.sin(Math.PI * prog(lt, 4.5, 4.75))).toFixed(3)})`);
      $(root, 'del-prices').setAttribute('transform', `translate(312 20) scale(${(1 - 0.25 * Math.sin(Math.PI * prog(lt, 7.5, 7.75))).toFixed(3)})`);
      confetti('cf-del', 300, ROW.y0 + rows[1].m.prices.y + 20, lt, 7.7, 60);
      // Add: tap Add a piece, choose Special offer.
      p('menu', { x: 180, y: 520, s: back(prog(lt, 10.2, 10.5)), o: Math.min(prog(lt, 10.2, 10.3), 1 - prog(lt, 10.85, 11.0)) });
      p('menuHl', { o: window_(lt, 10.6, 10.7, 10.9, 11.0) });
    },
    hand: [[0.3, 220, 610], [0.9, 120, rowY('rooms'), true, 'bEdit'], [1.7, 150, rowY('rooms') - 64, true, 'bType'], [2.9, 262, rowY('rooms') - 64, true],
      [4.6, 266, rowY('gallery'), true, 'bUp'], [7.6, 328, rowY('prices'), true, 'bDelete'], [9.0, 260, 560],
      [10.0, 180, 615, true, 'bAdd'], [10.75, 180, 480, true], [12.4, 260, 560]],
  };
}

// ---------------------------------------------------------------- 5 every screen
const THEMES = [C.blue, C.violet, C.green, C.ink];
function bStyle() {
  return {
    dur: 7, title: 'bStyle', step: 5,
    captions: [[0.2, 3.0, 'bStyle1'], [3.1, 7, 'bStyle2']], land: 'bStyle2',
    markup: `<rect width="360" height="640" fill="${C.page}"/>${studioBar(B('yourSite'))}
      <g data-k="edit">
        <g transform="translate(50 64) scale(.72)"><g data-k="siteS">${hotelSite(C.blue, 'ss')}</g></g>
        <rect x="50" y="64" width="259" height="461" fill="none" stroke="${C.line}"/>
        <rect x="16" y="540" width="328" height="60" rx="30" fill="${C.paper}" stroke="${C.line}"/>
        ${at(40, 570, 0.55, GLYPH.palette(C.slate))}${tx(58, 575, L('ui.colour'), { size: 13, weight: 800, fill: C.slate })}
        ${THEMES.map((c, i) => `<circle cx="${132 + i * 56}" cy="570" r="18" fill="${c}"/>`).join('')}
        <circle data-k="swring" cx="0" cy="570" r="24" fill="none" stroke="${C.ink}" stroke-width="3"/>
      </g>
      <g data-k="devs">
        <g data-k="dMon">${hotelDevice(300, 168, 9, 'dm')}<rect x="-30" y="93" width="60" height="10" rx="5" fill="${C.ink}"/>${tx(0, 130, L('ui.screens.0'), { size: 15, weight: 800, anchor: 'middle' })}</g>
        <g data-k="dTab">${hotelDevice(150, 200, 10, 'dt')}${tx(0, 132, L('ui.screens.1'), { size: 15, weight: 800, anchor: 'middle' })}</g>
        <g data-k="dPho">${hotelDevice(84, 170, 7, 'dp')}${tx(0, 112, L('ui.screens.2'), { size: 15, weight: 800, anchor: 'middle' })}</g>
      </g>`,
    draw(lt, root) {
      const p = P(root);
      let ti = 0;
      [0.8, 1.8].forEach((tk, i) => { if (lt >= tk + 0.05) ti = [1, 2][i]; });
      retheme(root, 'siteS', THEMES[ti]);
      ['dm', 'dt', 'dp'].forEach((k) => retheme(root, k, THEMES[2]));
      p('swring', { x: 132 + ti * 56 });
      p('edit', { o: 1 - prog(lt, 2.9, 3.2) });
      p('devs', { o: prog(lt, 3.0, 3.3) });
      ['dMon', 'dTab', 'dPho'].forEach((k, i) => {
        const pos = [{ x: 180, y: 190 }, { x: 110, y: 430 }, { x: 266, y: 420 }][i];
        p(k, { x: pos.x, y: pos.y, s: back(prog(lt, 3.1 + 0.2 * i, 3.5 + 0.2 * i)), o: prog(lt, 3.1 + 0.2 * i, 3.2 + 0.2 * i) });
      });
    },
    hand: [[0.3, 220, 620], [0.8, 188, 570, true, 'bColour'], [1.8, 244, 570, true], [2.6, 280, 630]],
  };
}

// ---------------------------------------------------------------- 6 publish, and keep updating
function bPublish() {
  const pubBtn = `<g data-k="pub"><rect data-k="pubbg" x="226" y="11" width="122" height="36" rx="18" fill="${C.blue}"/>
    <g data-k="lblP">${at(248, 29, 0.6, ICON.check(C.paper))}${tx(294, 35, B('publish'), { size: 15, weight: 800, fill: C.paper, anchor: 'middle', fit: 76 })}</g>
    <g data-k="lblU">${at(248, 29, 0.6, IC.up(C.paper))}${tx(294, 35, B('update'), { size: 15, weight: 800, fill: C.paper, anchor: 'middle', fit: 76 })}</g>
    <g data-k="lblD">${at(248, 29, 0.6, ICON.check(C.paper))}${tx(294, 35, B('updated'), { size: 15, weight: 800, fill: C.paper, anchor: 'middle', fit: 76 })}</g></g>`;
  return {
    dur: 12, title: 'bPublish', step: 6,
    captions: [[0.2, 3.4, 'bPub1'], [3.5, 6.4, 'bPubSell'], [6.5, 12, 'bPub2']], land: 'bPubSell',
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      <g transform="translate(27 70) scale(.85)">${hotelSite(C.blue, 'pb')}</g>
      ${studioBar(B('yourSite'), pubBtn)}
      <g data-k="picker"><rect x="56" y="196" width="248" height="74" rx="16" fill="${C.paper}" stroke="${C.line}"/>${[0, 1, 2].map((i) => photo(68 + i * 80, 206, 64, 54, [C.greenSubtle, C.violetTint, C.blueSubtle][i], [C.green, C.violet, C.blueDeep][i], 8)).join('')}</g>
      <rect data-k="dim" width="360" height="640" fill="${C.ink}"/>
      <g data-k="rings"><circle data-k="r1" cx="180" cy="270" r="50" fill="none" stroke="${C.paper}" stroke-width="3"/><circle data-k="r2" cx="180" cy="270" r="50" fill="none" stroke="${C.paper}" stroke-width="3"/></g>
      <g data-k="globe"><circle r="54" fill="${C.blue}"/>${g(GLYPH.globe(C.paper), 'scale(2)')}<g transform="translate(40 -40)"><circle r="20" fill="${C.green}"/>${g(ICON.check(C.paper), 'scale(.8)')}</g></g>
      <g data-k="live"><rect x="-52" y="-20" width="104" height="40" rx="20" fill="${C.green}"/>${tx(0, 8, B('live'), { size: 22, weight: 800, fill: C.paper, anchor: 'middle' })}</g>
      ${[0, 1].map((i) => `<g data-k="note${i}"><rect x="-150" y="-30" width="300" height="60" rx="16" fill="${C.paper}" stroke="${C.line}"/>
        <circle cx="-118" cy="0" r="20" fill="${i ? C.blue : C.green}"/>${at(-118, 0, 0.55, i ? ICON.bag(C.paper) : GLYPH.bed(C.paper))}
        ${tx(-88, -4, B(i ? 'newOrder' : 'newBooking'), { size: 14, weight: 800, fit: 220 })}${tx(-88, 15, B(i ? 'newOrderLine' : 'newBookingLine'), { size: 12, weight: 600, fill: C.slate, fit: 220 })}</g>`).join('')}
      <g data-k="week"><rect x="-120" y="-36" width="240" height="72" rx="20" fill="${C.paper}"/>${at(-82, 0, 1, IC.calendar(C.blue))}${tx(-52, 7, B('week'), { size: 19, weight: 800, fit: 160 })}</g>
      <g data-k="toast"><rect x="-110" y="-22" width="220" height="44" rx="22" fill="${C.ink}"/>${at(-84, 0, 0.6, `<circle r="16" fill="${C.green}"/>${ICON.check(C.paper)}`)}${tx(10, 6, B('liveSeconds'), { size: 15, weight: 800, fill: C.paper, anchor: 'middle', fit: 160 })}</g>
      ${confettiMarkup('cf-pub', 22)}`,
    draw(lt, root) {
      const p = P(root);
      $(root, 'pubbg').setAttribute('fill', (lt > 1.1 && lt < 7.6) || lt > 10.2 ? C.green : C.blue);
      p('lblP', { o: lt < 7.6 ? 1 : 0 });
      p('lblU', { o: lt >= 7.6 && lt < 10.2 ? 1 : 0 });
      p('lblD', { o: lt >= 10.2 ? 1 : 0 });
      p('dim', { o: 0.5 * Math.min(prog(lt, 1.4, 1.7), 1 - prog(lt, 3.4, 3.7)) + 0.5 * Math.min(prog(lt, 6.4, 6.6), 1 - prog(lt, 7.5, 7.9)) });
      p('globe', { x: 180, y: 270, s: back(prog(lt, 1.5, 2.0)), o: Math.min(prog(lt, 1.5, 1.6), 1 - prog(lt, 3.3, 3.6)) });
      ['r1', 'r2'].forEach((k, i) => {
        const f = lt > 1.8 && lt < 3.4 ? ((lt - 1.8) / 1.2 + i * 0.5) % 1 : 0;
        const el = $(root, k);
        el.setAttribute('r', (54 + 60 * f).toFixed(1));
        el.setAttribute('opacity', f > 0 ? (0.6 * (1 - f)).toFixed(3) : 0);
      });
      p('live', { x: 180, y: 360, s: back(prog(lt, 1.9, 2.25)), o: Math.min(prog(lt, 1.9, 2.0), 1 - prog(lt, 3.3, 3.6)) });
      confetti('cf-pub', 180, 270, lt, 1.7, 170);
      // Selling: bookings and orders arrive while she watches.
      [0, 1].forEach((i) => {
        const t0 = 3.9 + 0.9 * i, f = easeOut(prog(lt, t0, t0 + 0.4));
        p(`note${i}`, { x: 180, y: lerp(70, 112 + i * 72, f), s: 1, o: Math.min(prog(lt, t0, t0 + 0.15), 1 - prog(lt, 6.2, 6.5)) });
      });
      p('week', { x: 180, y: 300, s: back(prog(lt, 6.6, 6.95)), o: Math.min(prog(lt, 6.6, 6.7), 1 - prog(lt, 7.5, 7.8)) });
      // Change the cover photo, tap Update: live again in seconds.
      p('picker', { o: Math.min(prog(lt, 8.4, 8.5), 1 - prog(lt, 9.2, 9.4)) });
      $(root, 'picker').setAttribute('transform', `translate(180 233) scale(${back(prog(lt, 8.4, 8.7)).toFixed(4)}) translate(-180 -233)`);
      p('pb-ph0', { o: 1 - prog(lt, 9.2, 9.5) });
      p('pb-ph1', { o: prog(lt, 9.2, 9.5) });
      p('toast', { x: 180, y: 560, s: back(prog(lt, 10.3, 10.6)), o: prog(lt, 10.3, 10.4) });
    },
    hand: [[0.3, 240, 140], [1.0, 290, 29, true, 'bPublish'], [1.8, 300, 420], [8.0, 220, 200], [8.3, 180, 200, true, 'bPhoto'], [9.1, 108, 233, true, 'bPick'], [10.1, 290, 29, true, 'bUpdate'], [10.9, 300, 160]],
  };
}

// ---------------------------------------------------------------- 7 anyone can build
const PEOPLE = [
  { c: C.blueDeep, tint: C.blueSubtle, glyph: IC.office, face: C.blueTint },
  { c: C.green, tint: C.greenSubtle, glyph: GLYPH.briefcase, face: C.greenSubtle },
  { c: C.violet, tint: C.violetSubtle, glyph: GLYPH.palette, face: C.violetTint },
  { c: C.blue, tint: C.blueSubtle, glyph: IC.bread, face: C.blueTint },
];
function bAnyone() {
  const pos = [{ x: 96, y: 170 }, { x: 264, y: 170 }, { x: 96, y: 420 }, { x: 264, y: 420 }];
  const mini = (pp, i) => `
    <rect x="-70" y="-30" width="140" height="146" rx="10" fill="${C.paper}" stroke="${C.line}"/>
    <rect x="-64" y="-24" width="128" height="24" rx="6" fill="${pp.c}"/>${at(-50, -12, 0.4, pp.glyph(C.paper))}${tx(-36, -8, L(`ui.b.siteNames.${i}`), { size: 9.5, weight: 800, fill: C.paper, fit: 96 })}
    ${photo(-64, 6, 128, 44, pp.tint, pp.c, 6)}
    <g data-k="mrow${i}a">${g(`<path d="${piecePath(128, 22, 6)}" fill="${C.page}" stroke="${C.line}"/>${tx(10, 15, L(`ui.b.siteLines.${i}`), { size: 9, weight: 700, fit: 80 })}`, 'translate(-64 58)')}</g>
    <g data-k="mrow${i}b">${g(`<path d="${piecePath(128, 22, 6)}" fill="${C.page}" stroke="${C.line}"/>${bar(10, 8, 70, 6, C.line)}`, 'translate(-64 86)')}</g>
    <g data-k="mnew${i}">${g(`<path d="${piecePath(128, 22, 6)}" fill="${pp.tint}" stroke="${pp.c}"/>${at(12, 11, 0.3, GLYPH.plus(pp.c))}${bar(24, 8, 60, 6, pp.c, 0.5)}`, 'translate(-64 86)')}</g>
    <g data-k="mact${i}"><circle r="12" fill="${[C.blue, RED, C.green, C.violet][i]}"/>${g([IC.up, IC.x, GLYPH.plus, IC.up][i](C.paper), 'scale(.5)')}</g>`;
  return {
    dur: 11, title: 'bAnyone', step: 7,
    captions: [[0.2, 5.4, 'bAny1'], [5.5, 11, 'bAny2']], land: 'bAny2',
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      ${PEOPLE.map((pp, i) => `<g data-k="card${i}">
        <rect x="-80" y="-108" width="160" height="236" rx="18" fill="${pp.tint}"/>
        <g transform="translate(-50 -78)">${face(`pf${i}`, pp.face)}</g>
        ${tx(-20, -82, L(`ui.b.builders.${i}`), { size: 11.5, weight: 800, fit: 96 })}
        ${tx(-20, -66, L(`ui.b.roles.${i}`), { size: 9.5, weight: 600, fill: C.slate, fit: 96 })}
        ${mini(pp, i)}</g>`).join('')}`,
    draw(lt, root) {
      const p = P(root);
      PEOPLE.forEach((pp, i) => {
        const t0 = 0.3 + 0.6 * i;
        p(`card${i}`, { x: pos[i].x, y: pos[i].y, s: back(prog(lt, t0, t0 + 0.45)) * (1 + 0.04 * Math.sin(Math.PI * prog(lt, 6.0 + 0.3 * i, 6.5 + 0.3 * i))), o: prog(lt, t0, t0 + 0.1) });
        mood(root, `pf${i}`, lt > 6.0 + 0.3 * i ? 'big' : 'smile');
        // Each person changes a piece of their own site: move, delete, add, move.
        const a = 3.0 + 0.45 * i, f = easeInOut(prog(lt, a + 0.2, a + 0.7));
        p(`mact${i}`, { x: 54, y: 69, s: back(prog(lt, a - 0.3, a)), o: Math.min(prog(lt, a - 0.3, a - 0.2), 1 - prog(lt, a + 0.8, a + 1.0)) });
        const kind = i % 4;
        if (kind === 0 || kind === 3) { // move the bottom piece up
          p(`mrow${i}a`, { y: lerp(0, 28, f) }); p(`mrow${i}b`, { y: lerp(0, -28, f) }); p(`mnew${i}`, { o: 0 });
        } else if (kind === 1) { // delete a piece
          p(`mrow${i}a`, { x: 60 * easeIn(f), o: 1 - f }); p(`mrow${i}b`, { y: -28 * f }); p(`mnew${i}`, { o: 0 });
        } else { // add a piece
          p(`mrow${i}a`, {}); p(`mrow${i}b`, { o: 1 - f }); p(`mnew${i}`, { s: 1, o: f });
        }
      });
    },
  };
}

// ---------------------------------------------------------------- finale
function bFinale() {
  return {
    dur: 8, title: 'bFinale', step: 0,
    captions: [[0.2, 3.7, 'bEnd1'], [3.8, 8, 'bEnd2']], land: 'bEnd2',
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      <g data-k="left">
        <rect x="12" y="80" width="162" height="380" rx="20" fill="${C.ink}"/>
        ${tx(93, 116, B('others'), { size: 13, weight: 800, fill: C.paper, anchor: 'middle', fit: 140 })}
        <g transform="translate(93 210)">${g(IC.code('#94a3b8'), 'scale(2)')}</g>
        <g transform="translate(93 300)">${g(IC.lock('#94a3b8'), 'scale(1.3)')}</g>
        ${tx(93, 376, B('othersLine1'), { size: 14, weight: 700, fill: '#cbd5e1', anchor: 'middle', fit: 140 })}
        ${tx(93, 400, B('othersLine2'), { size: 16, weight: 800, fill: C.paper, anchor: 'middle', fit: 140 })}
      </g>
      <g data-k="right">
        <rect x="186" y="80" width="162" height="380" rx="20" fill="${C.blue}"/>
        <image href="${LOGO}" x="253" y="96" width="28" height="28"/>
        ${tx(267, 146, B('ours'), { size: 13, weight: 800, fill: C.paper, anchor: 'middle', fit: 140 })}
        ${['cover', 'rooms', 'gallery', 'contact'].map((id, i) => `<g data-k="fp${i}">${g(tile(id, 136, 34), 'translate(-68 -17)')}</g>`).join('')}
        ${tx(267, 400, B('oursLine'), { size: 16, weight: 800, fill: C.paper, anchor: 'middle', fit: 140 })}
      </g>
      <g data-k="logo"><circle r="56" fill="${C.paper}"/><image href="${LOGO}" x="-50" y="-50" width="100" height="100"/></g>
      <g data-k="endA">${tx(180, 0, B('end1'), { size: 24, weight: 800, anchor: 'middle', fit: 320 })}</g>
      <g data-k="endB">${tx(180, 0, B('end2'), { size: 19, weight: 700, fill: C.slate, anchor: 'middle', fit: 320 })}</g>
      <g data-k="endC">${tx(180, 0, B('end3'), { size: 24, weight: 800, fill: C.blue, anchor: 'middle', fit: 320 })}</g>
      <g data-k="endBtn"><rect x="-82" y="-26" width="164" height="52" rx="26" fill="${C.blue}"/>${tx(-10, 7, L('ui.startFree'), { size: 18, weight: 800, fill: C.paper, anchor: 'middle' })}${at(56, 0, 0.8, ICON.arrow(C.paper))}</g>`,
    draw(lt, root) {
      const p = P(root);
      const out = prog(lt, 3.6, 4.0);
      $(root, 'left').setAttribute('transform', `translate(${(-200 * (1 - easeOut(prog(lt, 0.1, 0.6))) - 40 * out).toFixed(1)} 0)`);
      $(root, 'left').setAttribute('opacity', (1 - out).toFixed(3));
      $(root, 'right').setAttribute('transform', `translate(${(200 * (1 - easeOut(prog(lt, 0.4, 0.9))) + 40 * out).toFixed(1)} 0)`);
      $(root, 'right').setAttribute('opacity', (1 - out).toFixed(3));
      [0, 1, 2, 3].forEach((i) => {
        const f = back(prog(lt, 1.1 + 0.25 * i, 1.45 + 0.25 * i));
        p(`fp${i}`, { x: 267, y: 186 + i * 44, s: f, o: prog(lt, 1.1 + 0.25 * i, 1.2 + 0.25 * i) });
      });
      p('logo', { x: 180, y: 210, s: back(prog(lt, 4.0, 4.5)), o: prog(lt, 4.0, 4.1) });
      p('endA', { y: lerp(312, 300, easeOut(prog(lt, 4.5, 5.0))), o: prog(lt, 4.5, 4.9) });
      p('endB', { y: lerp(344, 332, easeOut(prog(lt, 4.9, 5.4))), o: prog(lt, 4.9, 5.3) });
      p('endC', { y: lerp(378, 366, easeOut(prog(lt, 5.3, 5.8))), o: prog(lt, 5.3, 5.7) });
      p('endBtn', { x: 180, y: 436, s: back(prog(lt, 5.8, 6.2)), o: prog(lt, 5.8, 5.9) });
    },
  };
}

window.BUILDER_SHOTS = { bProblem, bStart, bPuzzle, bFill, bChange, bStyle, bPublish, bAnyone, bFinale, parts: { block, tile, hotelSite } };
})();
