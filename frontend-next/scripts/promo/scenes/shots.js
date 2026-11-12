/*
 * The story, one shot per step (app screen 360 x 640 units). Used by
 * guide.html (slow, title cards, all subtitles, callouts) and landing.html
 * (faster, one subtitle per shot). All words come from copy.js.
 *
 *   intro      many apps -> one Nodbusiness phone
 *   life    1  post a photo on the Personal feed; likes, comments, chat
 *   feedScroll 2  scroll the Personal feed; zoom a photo without leaving
 *   friendBiz  2  peek at a friend, switch to their business, close
 *   bizFeed    2  the Business feed: shops near you, friends' businesses
 *   searchNear 3  search "hotel room" near me: map, nearest first
 *   compareHotels 3  peek at hotels, compare rooms and prices, book
 *   start   4  tap "Build your mini website"; pick a category; templates
 *   pathA   4  a ready-made template becomes a full site
 *   pathB   4  or start blank and add sections with +
 *   fill    5  photo, name, pasted link, opening hours, a product to sell
 *   style   6  pick a colour; the site on computer, tablet and phone
 *   publish 7  tap Publish
 *   feed    7  the site becomes a Business feed card; followers; QR scan
 *   buyers  8  a customer orders, messages and pays the seller directly
 *   finale     Personal <-> Business; everything in one app; end card
 * Needs copy.js, common.js and engine.js first.
 */
/* eslint-disable */
(function () {
const { C, prog, lerp, easeOut, easeInOut, easeIn, back, window_, arc, ICON, confettiMarkup, confetti } = window.PROMO;
const { $, P, face, mood, photo, bar, GLYPH, L, tx } = window.ENGINE;
const LOGO = '../../../public/brand/nodbusiness-icon-v3.svg';
const g = (inner, tr = '') => `<g${tr ? ` transform="${tr}"` : ''}>${inner}</g>`;
const at = (x, y, s, inner) => g(inner, `translate(${x} ${y}) scale(${s})`);
/** Text revealed left to right, as if typed: draw() widens the clip rect `${k}-clip`. */
const typed = (k, x, y, str, o) => `<clipPath id="${k}-cp"><rect data-k="${k}-clip" x="${x - 2}" y="${y - (o.size || 14) - 4}" width="0" height="${(o.size || 14) + 10}"/></clipPath><g clip-path="url(#${k}-cp)">${tx(x, y, str, { ...o, k })}</g>`;
const textW = (root, k) => { const t = $(root, k); if (!t) return 0; if (!t.__w) t.__w = t.getComputedTextLength(); return t.__w; };

function topbar(kind = 'personal', extra = '') {
  const fill = kind === 'personal' ? C.violet : C.blue;
  return `<rect width="360" height="64" fill="${C.paper}"/><rect y="63" width="360" height="1" fill="${C.line}"/>
    <circle cx="36" cy="34" r="19" fill="${fill}"/>${kind === 'personal' ? at(36, 34, 0.5, face('tb-face', C.violetTint)) : at(36, 34, 0.55, ICON.store(C.paper))}
    ${tx(66, 41, L('ui.app'), { size: 18, weight: 800 })}${extra}`;
}
function studioBar(title, extra = '') {
  return `<rect width="360" height="56" fill="${C.paper}"/><rect y="55" width="360" height="1" fill="${C.line}"/>
    ${at(28, 28, 0.7, `<path d="M6 -9 L-4 0 L6 9" fill="none" stroke="${C.ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`)}
    ${tx(48, 34, title, { size: 17, weight: 800, fit: 180 })}${extra}`;
}

/** A complete small website (360 x 640). Themed shapes carry class "th". */
function site(theme = C.blue) {
  const items = [ICON.dress(C.violet), ICON.cup(C.blue), ICON.basket(C.green)];
  return `<rect width="360" height="640" fill="${C.paper}"/>
    <rect class="th" width="360" height="58" fill="${theme}"/>
    <circle cx="32" cy="29" r="17" fill="${C.paper}"/>${at(32, 29, 0.55, `<g class="thi">${ICON.store(theme)}</g>`)}
    ${tx(58, 36, L('ui.name'), { size: 18, weight: 800, fill: C.paper })}
    ${photo(16, 70, 328, 168, C.violetTint, C.violet, 14)}
    <rect x="16" y="168" width="328" height="70" fill="${C.ink}" opacity=".28"/>
    ${tx(32, 200, L('ui.line'), { size: 19, weight: 800, fill: C.paper, fit: 200 })}
    <rect class="th" x="244" y="190" width="90" height="30" rx="15" fill="${theme}"/>${tx(289, 210, L('ui.orderNow'), { size: 12, weight: 700, fill: C.paper, anchor: 'middle', fit: 80 })}
    ${[0, 1, 2].map((i) => `
      <rect x="${16 + i * 112}" y="252" width="104" height="104" rx="12" fill="${C.paper}" stroke="${C.line}"/>
      <rect x="${22 + i * 112}" y="258" width="92" height="54" rx="9" fill="${[C.violetSubtle, C.blueSubtle, C.greenSubtle][i]}"/>
      ${at(68 + i * 112, 285, 0.85, items[i])}
      ${tx(24 + i * 112, 330, L(`ui.items.${i}`), { size: 13, weight: 700 })}
      <text class="th" x="${24 + i * 112}" y="347" font-family="${window.ENGINE.FONT}" font-size="12" font-weight="800" fill="${theme}">${L(`ui.prices.${i}`)}</text>`).join('')}
    <rect x="16" y="370" width="328" height="48" rx="12" fill="${C.page}"/>
    ${at(40, 394, 0.6, `<g class="thi">${GLYPH.clock(theme)}</g>`)}
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${64 + i * 39}" y="382" width="32" height="24" rx="12" fill="${i < 5 ? C.green : C.line}"/>${tx(80 + i * 39, 398, L(`ui.days.${i}`), { size: 11, weight: 800, fill: i < 5 ? C.paper : C.slate, anchor: 'middle' })}`).join('')}
    ${[0, 1, 2, 3].map((i) => photo(16 + i * 84, 432, 76, 76, [C.blueTint, C.violetTint, C.greenSubtle, C.blueSubtle][i], [C.blue, C.violet, C.green, C.blueDeep][i], 10)).join('')}
    ${[0, 1, 2, 3].map((i) => `<circle class="th" cx="${40 + i * 48}" cy="548" r="17" fill="${theme}"/>${at(40 + i * 48, 548, 0.45, [GLYPH.comment(C.paper), ICON.pin(C.paper), GLYPH.play(C.paper), GLYPH.globe(C.paper)][i])}`).join('')}
    ${bar(16, 586, 328, 10, C.line)}${bar(16, 604, 200, 8, C.line, 0.7)}`;
}
function retheme(root, k, color) {
  const el = $(root, k);
  if (!el) return;
  el.querySelectorAll('.th').forEach((n) => n.setAttribute('fill', color));
  el.querySelectorAll('.thi path, .thi rect, .thi circle').forEach((n) => {
    if (n.getAttribute('fill') && n.getAttribute('fill') !== 'none' && n.getAttribute('fill') !== C.paper) n.setAttribute('fill', color);
    if (n.getAttribute('stroke') && n.getAttribute('stroke') !== 'none' && n.getAttribute('stroke') !== C.paper) n.setAttribute('stroke', color);
  });
}
/** A device showing the site, cropped to its screen. */
function device(w, h, bezel, theme = C.blue) {
  return `<rect x="${-w / 2 - bezel}" y="${-h / 2 - bezel}" width="${w + 2 * bezel}" height="${h + 2 * bezel}" rx="${bezel + 6}" fill="${C.ink}"/>
    <svg x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" viewBox="0 0 360 640" preserveAspectRatio="xMidYMin slice">${site(theme)}</svg>`;
}

// ---------------------------------------------------------------- intro
function intro() {
  const apps = [
    { x: 70, y: 160, fill: C.violet, glyph: GLYPH.camera(C.paper) },
    { x: 292, y: 140, fill: C.blue, glyph: GLYPH.comment(C.paper) },
    { x: 58, y: 400, fill: C.green, glyph: ICON.bag(C.paper) },
    { x: 300, y: 410, fill: C.blueDeep, glyph: ICON.pin(C.paper) },
    { x: 104, y: 545, fill: C.ink, glyph: GLYPH.clipboard(C.paper) },
    { x: 262, y: 565, fill: C.violet, glyph: GLYPH.globe(C.paper) },
  ];
  return {
    dur: 7, title: 'intro', step: 0,
    captions: [[0.3, 3.6, 'intro1'], [3.8, 7, 'intro2']], land: 'intro2',
    markup: `
      ${apps.map((a, i) => `<g data-k="app${i}"><rect x="-30" y="-30" width="60" height="60" rx="16" fill="${a.fill}"/>${g(a.glyph, 'scale(.85)')}${tx(0, 50, L(`ui.apps.${i}`), { size: 13, weight: 700, fill: C.slate, anchor: 'middle' })}</g>`).join('')}
      <g data-k="phone">${window.ENGINE.phoneFrame(150, 290, `
        <rect width="150" height="290" fill="${C.blueSubtle}"/>
        <image href="${LOGO}" x="35" y="70" width="80" height="80"/>
        ${tx(75, 182, L('ui.app'), { size: 17, weight: 800, fill: C.blue, anchor: 'middle', fit: 130 })}
        ${bar(45, 196, 60, 7, C.blue, 0.3)}`)}</g>
      ${at(0, 0, 1, face('me'))}
      ${confettiMarkup('cf-intro', 16)}`,
    draw(lt, root) {
      const p = P(root);
      const rise = easeInOut(prog(lt, 3.0, 4.2));
      p('me', { x: 180, y: lerp(300, 108, rise), s: lerp(1.7, 1.3, rise), o: prog(lt, 0.1, 0.5) });
      mood(root, 'me', lt < 4.2 ? (lt < 0.8 ? 'smile' : 'confused') : 'big');
      apps.forEach((a, i) => {
        const pop = back(prog(lt, 0.4 + 0.15 * i, 0.8 + 0.15 * i));
        const f = easeIn(prog(lt, 3.0 + 0.08 * i, 3.8 + 0.08 * i));
        const wob = 7 * Math.sin(2 * Math.PI * 0.7 * lt + i * 1.3) * (1 - f);
        p(`app${i}`, { x: lerp(a.x, 180, f), y: lerp(a.y, 360, f), s: pop * lerp(1, 0.25, f), r: wob, o: Math.min(prog(lt, 0.4 + 0.15 * i, 0.5 + 0.15 * i), 1 - prog(lt, 3.6 + 0.08 * i, 3.9 + 0.08 * i)) });
      });
      const ph = back(prog(lt, 2.8, 3.4));
      const glow = 1 + 0.05 * Math.sin(Math.PI * prog(lt, 3.7, 4.3));
      p('phone', { x: 180, y: 380, s: ph * glow, o: prog(lt, 2.8, 3.0) });
      confetti('cf-intro', 180, 330, lt, 4.3, 150);
    },
  };
}

// ---------------------------------------------------------------- 1 life
function life() {
  const thumbs = [0, 1, 2, 3, 4, 5].map((i) => ({ x: 24 + (i % 3) * 108, y: 436 + Math.floor(i / 3) * 94 }));
  return {
    dur: 9, title: 'life', step: 1,
    captions: [[0.2, 4.6, 'life1'], [4.8, 9, 'life2']], land: 'life1',
    markup: `
      <rect x="0" y="64" width="360" height="576" fill="${C.page}"/>
      ${[0, 1, 2, 3, 4].map((i) => `<g data-k="story${i}" transform="translate(${40 + i * 70} 104)">
        <circle r="25" fill="none" stroke="${i === 0 ? C.violet : C.blue}" stroke-width="3" ${i === 0 ? 'stroke-dasharray="5 4"' : ''}/>
        <circle r="20" fill="${[C.violetSubtle, C.blueTint, C.greenSubtle, C.violetTint, C.blueSubtle][i]}"/>
        ${i === 0 ? GLYPH.plus(C.violet) : ''}</g>`).join('')}
      <g data-k="composer">
        <rect x="16" y="148" width="328" height="64" rx="16" fill="${C.paper}" stroke="${C.line}"/>
        <circle cx="44" cy="180" r="14" fill="${C.violetTint}"/>${tx(68, 186, L('ui.whats'), { size: 15, weight: 500, fill: C.slate })}
        <circle cx="312" cy="180" r="21" fill="${C.violetSubtle}"/>${at(312, 180, 0.72, GLYPH.camera(C.violet))}
      </g>
      <g data-k="newpost">
        <rect x="16" y="148" width="328" height="304" rx="16" fill="${C.paper}" stroke="${C.line}"/>
        ${at(44, 176, 0.62, face('poster', C.violetTint))}
        ${tx(66, 174, L('ui.me'), { size: 15, weight: 800 })}${bar(66, 182, 70, 7, C.line)}
        ${photo(28, 204, 304, 178, C.violetTint, C.violet, 12)}
        <g data-k="postbtn"><rect x="236" y="396" width="96" height="40" rx="20" fill="${C.blue}"/>${tx(272, 421, L('ui.post'), { size: 16, weight: 800, fill: C.paper, anchor: 'middle' })}${at(310, 416, 0.6, ICON.arrow(C.paper))}</g>
        <g data-k="likes">${at(46, 416, 0.9, GLYPH.heart(C.violet))}${tx(64, 421, '24', { size: 14, weight: 700, fill: C.slate })}${at(110, 416, 0.8, GLYPH.comment(C.blue))}${tx(128, 421, '3', { size: 14, weight: 700, fill: C.slate })}</g>
        <g data-k="posted"><circle r="18" fill="${C.green}"/>${g(ICON.check(C.paper), 'scale(.8)')}</g>
      </g>
      <g data-k="friendpost">
        <rect x="16" y="468" width="328" height="190" rx="16" fill="${C.paper}" stroke="${C.line}"/>
        <circle cx="44" cy="496" r="14" fill="${C.blueTint}"/>${tx(66, 501, L('ui.friend'), { size: 14, weight: 800 })}
        ${photo(28, 520, 304, 120, C.blueTint, C.blue, 12)}
      </g>
      ${[0, 1, 2, 3].map((i) => `<g data-k="h${i}">${GLYPH.heart([C.violet, C.blue, C.violet, C.green][i])}</g>`).join('')}
      <g data-k="cbub">${GLYPH.comment(C.blue)}</g>
      <g data-k="sheet">
        <rect x="0" y="404" width="360" height="260" rx="24" fill="${C.paper}" stroke="${C.line}"/>
        ${bar(160, 414, 40, 6, C.line)}
        ${thumbs.map((t, i) => `<g data-k="thumb${i}">${photo(t.x, t.y, 96, 82, [C.violetTint, C.blueTint, C.greenSubtle, C.blueSubtle, C.violetSubtle, C.blueTint][i], [C.violet, C.blue, C.green, C.blueDeep, C.violet, C.blue][i], 10)}</g>`).join('')}
      </g>
      <g data-k="fly">${photo(-48, -41, 96, 82, C.violetTint, C.violet, 10)}</g>
      ${topbar('personal')}
      <g data-k="chat">
        <rect x="40" y="8" width="280" height="50" rx="25" fill="${C.paper}" stroke="${C.line}"/>
        <circle cx="66" cy="33" r="15" fill="${C.blueTint}"/>${at(66, 33, 0.45, face('friend', C.blueTint))}
        ${tx(90, 29, L('ui.friend'), { size: 12, weight: 800 })}${tx(90, 46, L('ui.chatMsg'), { size: 13, weight: 500, fill: C.slate, fit: 210 })}
      </g>`,
    draw(lt, root) {
      const p = P(root);
      p('story0', { x: 40, y: 104, s: 1 + 0.06 * Math.sin(2 * Math.PI * 1.2 * lt) });
      [1, 2, 3, 4].forEach((i) => p(`story${i}`, { x: 40 + i * 70, y: 104 }));
      const up = prog(lt, 1.6, 2.0), down = prog(lt, 3.0, 3.4);
      p('sheet', { y: 260 * (1 - easeOut(up)) + 260 * easeIn(down), o: up > 0 && down < 1 ? 1 : 0 });
      const fl = prog(lt, 2.8, 3.4);
      const fp = arc({ x: 180, y: 477 }, { x: 260, y: 360 }, { x: 180, y: 293 }, easeInOut(fl));
      p('fly', { x: fp.x, y: fp.y, s: lerp(1, 2.6, easeInOut(fl)), o: fl > 0 && fl < 1 ? 1 : 0 });
      p('composer', { o: 1 - prog(lt, 3.2, 3.4) });
      const ns = lerp(0.96, 1, easeOut(prog(lt, 3.2, 3.6)));
      p('newpost', { x: 180 * (1 - ns), y: 300 * (1 - ns), s: ns, o: prog(lt, 3.2, 3.4) });
      p('postbtn', { o: 1 - prog(lt, 4.3, 4.5) });
      p('likes', { o: prog(lt, 4.4, 4.7) });
      p('posted', { x: 284, y: 416, s: back(prog(lt, 4.3, 4.6)), o: window_(lt, 4.3, 4.4, 5.0, 5.3) });
      [0, 1, 2, 3].forEach((i) => {
        const t0 = 5.0 + 0.4 * i, f = prog(lt, t0, t0 + 1.4);
        p(`h${i}`, { x: 46 + 18 * Math.sin(3 * f + i), y: 416 - 150 * easeOut(f), s: back(prog(lt, t0, t0 + 0.3)) * lerp(1.1, 0.8, f), o: f > 0 && f < 1 ? 1 - easeIn(f) : 0 });
      });
      p('cbub', { x: 110, y: 372, s: back(prog(lt, 6.0, 6.35)), o: window_(lt, 6.0, 6.1, 7.6, 7.9) });
      p('chat', { y: lerp(-70, 0, back(prog(lt, 6.6, 7.0))), o: prog(lt, 6.6, 6.7) });
      mood(root, 'poster', lt > 5.2 ? 'big' : 'smile');
      mood(root, 'friend', 'smile');
      mood(root, 'tb-face', lt > 5.2 ? 'big' : 'smile');
    },
    hand: [[0.8, 250, 330], [1.4, 312, 180, true, 'camera'], [2.6, 180, 477, true, 'pick'], [4.2, 284, 416, true, 'post'], [4.9, 300, 540]],
  };
}

// ---------------------------------------------------------------- shared discovery pieces
const MAXI = (f) => `<path d="M-9 -3 V-9 H-3 M3 -9 H9 V-3 M9 3 V9 H3 M-3 9 H-9 V3" fill="none" stroke="${f}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const XMARK = (f) => `<path d="M-7 -7 L7 7 M7 -7 L-7 7" stroke="${f}" stroke-width="3.2" stroke-linecap="round"/>`;
const STAR = (f) => `<path d="M0 -10 L2.9 -3.6 L9.6 -3.1 L4.5 1.4 L6 8.1 L0 4.6 L-6 8.1 L-4.5 1.4 L-9.6 -3.1 L-2.9 -3.6 Z" fill="${f}"/>`;
const WIFI = (f) => `<path d="M-14 -4 Q0 -16 14 -4 M-9 2 Q0 -6 9 2 M-4 8 Q0 4 4 8" fill="none" stroke="${f}" stroke-width="3" stroke-linecap="round"/><circle cy="13" r="2.5" fill="${f}"/>`;
const PARK = (f) => `<rect x="-12" y="-12" width="24" height="24" rx="6" fill="${f}"/><text x="0" y="7" font-family="${window.ENGINE.FONT}" font-size="17" font-weight="800" fill="${C.paper}" text-anchor="middle">P</text>`;
const CAL = (f) => `<rect x="-12" y="-10" width="24" height="22" rx="4" fill="none" stroke="${f}" stroke-width="3"/><path d="M-12 -3 H12 M-6 -14 V-7 M6 -14 V-7" stroke="${f}" stroke-width="3" stroke-linecap="round"/>`;
const TABG = [
  (f) => `<path d="M-9 -6 H9 M-9 0 H9 M-9 6 H9" stroke="${f}" stroke-width="2.6" stroke-linecap="round"/>`,
  (f) => g(ICON.store(f), 'scale(.5)'),
  (f) => `<circle cx="-5" cy="-3" r="4.5" fill="${f}"/><circle cx="6" cy="-2" r="3.5" fill="${f}" opacity=".7"/><path d="M-13 9 Q-5 1 3 9 Z" fill="${f}"/>`,
  (f) => `<rect x="-9" y="-9" width="18" height="18" rx="3" fill="none" stroke="${f}" stroke-width="2.6"/><path d="M-5 -3 H5 M-5 2 H5" stroke="${f}" stroke-width="2.2"/>`,
  (f) => g(GLYPH.briefcase(f), 'scale(.55)'),
];
/** The phone's bottom bar; `tabhl` (a pill) marks the active tab and is moved in draw(). */
function bottomBar() {
  return `<rect x="0" y="582" width="360" height="58" fill="${C.paper}"/><rect x="0" y="582" width="360" height="1" fill="${C.line}"/>
    <rect data-k="tabhl" x="-30" y="588" width="60" height="46" rx="14" fill="${C.blueSubtle}"/>
    ${TABG.map((ic, i) => `<g transform="translate(${36 + i * 72} 604)">${ic(C.slate)}</g>${tx(36 + i * 72, 628, L(`ui.tabs.${i}`), { size: 10, weight: 700, fill: C.slate, anchor: 'middle' })}`).join('')}
    <g data-k="tabon3" transform="translate(252 604)">${TABG[3](C.blue)}</g><g data-k="tabon4" transform="translate(324 604)">${TABG[4](C.blue)}</g>`;
}
/** A personal post card (height 300) at y. */
function post(y, who, faceFill, sky, hill, k = '', extra = '') {
  return `<g${k ? ` data-k="${k}"` : ''}>
    <rect x="16" y="${y}" width="328" height="300" rx="16" fill="${C.paper}" stroke="${C.line}"/>
    <circle cx="44" cy="${y + 28}" r="15" fill="${faceFill}"/>${at(44, y + 28, 0.5, face(`f-${who}`, faceFill))}
    ${tx(68, y + 26, who, { size: 15, weight: 800 })}${tx(68, y + 42, L('ui.ago'), { size: 11, weight: 500, fill: C.slate })}
    ${photo(28, y + 56, 304, 190, sky, hill, 12)}
    ${at(46, y + 272, 0.8, GLYPH.heart(C.violet))}${tx(62, y + 277, '32', { size: 13, weight: 700, fill: C.slate })}${at(106, y + 272, 0.7, GLYPH.comment(C.blue))}${tx(122, y + 277, '5', { size: 13, weight: 700, fill: C.slate })}
    ${extra}
  </g>`;
}
/** A business card in the Business feed (height 236) centred at x 180. */
function bizCardMini(k, name, line, theme, items, prices, icons, chip, friend) {
  return `<g data-k="${k}">
    <rect x="-164" y="0" width="328" height="236" rx="18" fill="${C.paper}" stroke="${C.line}"/>
    <path d="M-164 54 V18 A18 18 0 0 1 -146 0 H146 A18 18 0 0 1 164 18 V54 Z" fill="${theme}"/>
    <rect x="-150" y="30" width="44" height="44" rx="11" fill="${C.paper}" stroke="${C.line}"/>${at(-128, 52, 0.55, ICON.store(theme))}
    ${friend ? `<g><rect x="60" y="12" width="92" height="26" rx="13" fill="${C.paper}"/><circle cx="74" cy="25" r="9" fill="${C.blueTint}"/>${at(74, 25, 0.3, face(`${k}-ff`, C.blueTint))}${tx(88, 30, L('ui.friendTag'), { size: 12, weight: 800, fill: C.violet })}</g>` : ''}
    ${tx(-96, 72, name, { size: 16, weight: 800, fit: 170 })}${tx(-96, 88, line, { size: 11, weight: 500, fill: C.slate, fit: 170 })}
    <rect x="-150" y="98" width="${measureW(chip) + 20}" height="20" rx="10" fill="${C.blueSubtle}"/>${tx(-140, 112, chip, { size: 10.5, weight: 800, fill: C.blue })}
    <clipPath id="${k}-cl"><rect x="-152" y="124" width="304" height="104" rx="10"/></clipPath>
    <g clip-path="url(#${k}-cl)"><g data-k="${k}-strip">
      ${[0, 1, 2, 3, 4, 5].map((i) => `<g transform="translate(${-152 + i * 104} 126)">
        <rect width="96" height="100" rx="12" fill="${C.page}" stroke="${C.line}"/>
        <rect x="6" y="6" width="84" height="44" rx="8" fill="${[C.violetSubtle, C.blueSubtle, C.greenSubtle][i % 3]}"/>${at(48, 28, 0.6, icons[i % 3])}
        ${tx(8, 66, items[i % 3], { size: 12, weight: 800 })}${tx(8, 80, prices[i % 3], { size: 10.5, weight: 800, fill: theme })}
        <rect x="8" y="84" width="80" height="12" rx="6" fill="${theme}" opacity=".85"/></g>`).join('')}
    </g></g></g>`;
}
const measureW = (s) => window.ENGINE.measure(s, 10.5, 800);
const slideStrip = (root, k, lt, t0) => {
  const n = Math.min(3, Math.max(0, (lt - t0) / 0.9)), i = Math.floor(n), f = n - i;
  const el = $(root, `${k}-strip`);
  if (el) el.setAttribute('transform', `translate(${(-104 * (i + easeInOut(Math.min(1, f / 0.55)))).toFixed(1)} 0)`);
};
const FRIEND_ICONS = [ICON.dress(C.violet), ICON.shoe(C.blueDeep), ICON.bag(C.violet)];

// ---------------------------------------------------------------- 2 feeds: scroll and zoom
function feedScroll() {
  return {
    dur: 10, title: 'feeds', step: 2,
    captions: [[0.2, 4.6, 'scroll1'], [4.7, 10, 'scroll2']],
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      <g data-k="col">
        ${[0, 1, 2, 3, 4].map((i) => `<g transform="translate(${40 + i * 70} 104)"><circle r="25" fill="none" stroke="${i === 0 ? C.violet : C.blue}" stroke-width="3"/><circle r="20" fill="${[C.violetSubtle, C.blueTint, C.greenSubtle, C.violetTint, C.blueSubtle][i]}"/></g>`).join('')}
        <rect x="16" y="140" width="328" height="32" rx="16" fill="${C.paper}" stroke="${C.line}"/>
        <rect x="16" y="140" width="64" height="32" rx="16" fill="${C.ink}"/>${tx(48, 160, L('ui.newsLabel'), { size: 11, weight: 800, fill: C.paper, anchor: 'middle', ls: 1 })}
        <clipPath id="news-cl"><rect x="84" y="140" width="252" height="32"/></clipPath>
        <g clip-path="url(#news-cl)"><g data-k="news">${tx(90, 161, L('ui.news'), { size: 12.5, weight: 700, fill: C.blue })}</g></g>
        ${post(184, L('ui.friend'), C.blueTint, C.blueTint, C.blue)}
        <g><rect x="16" y="500" width="328" height="132" rx="16" fill="${C.paper}" stroke="${C.line}"/>
          <circle cx="44" cy="528" r="15" fill="${C.greenSubtle}"/>${tx(68, 526, 'Sara', { size: 15, weight: 800 })}${tx(68, 542, L('ui.ago'), { size: 11, weight: 500, fill: C.slate })}
          <rect x="28" y="556" width="304" height="64" rx="12" fill="${C.violetSubtle}"/>${at(58, 588, 0.9, CAL(C.violet))}${tx(84, 594, L('ui.event'), { size: 14, weight: 800, fill: C.violet, fit: 240 })}</g>
        ${post(648, L('ui.friend2'), C.greenSubtle, C.greenSubtle, C.green, 'zpost')}
        ${post(964, 'Hanna', C.violetTint, C.violetTint, C.violet)}
      </g>
      ${topbar('personal')}
      ${bottomBar()}
      <g data-k="viewer">
        <rect data-k="vbg" width="360" height="640" fill="#000000"/>
        <g data-k="vphoto">${photo(-180, -112, 360, 225, C.greenSubtle, C.green, 0)}</g>
        <g data-k="vclose" transform="translate(326 36)"><circle r="16" fill="#ffffff" opacity=".18"/>${XMARK('#ffffff')}</g>
      </g>`,
    draw(lt, root) {
      const p = P(root);
      const sc = easeInOut(prog(lt, 0.9, 3.0));
      p('col', { y: -316 * sc });
      $(root, 'news').setAttribute('transform', `translate(${(-((lt * 40) % 460)).toFixed(1)} 0)`);
      p('tabhl', { x: 252, o: 1 }); p('tabon3', { o: 1 }); p('tabon4', { o: 0 });
      // Photo viewer: opens from the post's photo, zooms in, then swipes down to close.
      const open = easeInOut(prog(lt, 3.95, 4.45));
      const zoom = easeInOut(prog(lt, 5.2, 5.7));
      const drag = easeIn(prog(lt, 6.7, 7.4));
      const from = { x: 180, y: 648 - 316 + 56 + 95, s: 304 / 360 };
      p('viewer', { o: lt > 3.95 && drag < 1 ? 1 : 0 });
      p('vbg', { o: open * (1 - drag) });
      p('vphoto', { x: lerp(from.x, 180, open), y: lerp(from.y, 320, open) + 260 * drag, s: lerp(from.s, 1, open) * lerp(1, 1.9, zoom) * lerp(1, 0.75, drag) });
      p('vclose', { x: 326, y: 36, o: open * (1 - drag) });
    },
    hand: [[0.4, 260, 540], [0.9, 260, 540, false, 'scroll'], [3.0, 260, 230], [3.6, 180, 435, true, 'zoom'], [3.85, 180, 435, true], [5.2, 200, 330, true, 'zoomMore'], [6.4, 180, 260, false, 'swipeDown'], [7.4, 180, 540], [8.2, 270, 560]],
  };
}

// ---------------------------------------------------------------- 2 feeds: peek at a friend
function friendBiz() {
  const prods = [0, 1, 2];
  return {
    dur: 10, title: 'feeds', step: 2,
    captions: [[0.2, 3.9, 'peek1'], [4.0, 10, 'peek2']],
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      ${post(76, L('ui.friend'), C.blueTint, C.blueTint, C.blue, '', `<g transform="translate(318 104)"><circle r="17" fill="${C.blueSubtle}"/>${MAXI(C.blue)}</g>`)}
      ${post(392, L('ui.friend2'), C.greenSubtle, C.greenSubtle, C.green)}
      ${topbar('personal')}
      ${bottomBar()}
      <rect data-k="dim" width="360" height="640" fill="${C.ink}"/>
      <g data-k="peek">
        <rect x="12" y="16" width="336" height="520" rx="22" fill="${C.paper}"/>
        <circle cx="42" cy="46" r="16" fill="${C.blueTint}"/>${at(42, 46, 0.55, face('pk-face', C.blueTint))}
        ${tx(66, 52, L('ui.friend'), { size: 16, weight: 800 })}
        <rect x="134" y="32" width="160" height="30" rx="15" fill="${C.page}" stroke="${C.line}"/>
        <rect data-k="knob" x="136" y="34" width="78" height="26" rx="13" fill="${C.violet}"/>
        ${tx(175, 52, L('ui.personal'), { size: 11.5, weight: 800, fill: C.paper, anchor: 'middle', k: 'tP' })}${tx(255, 52, L('ui.business'), { size: 11.5, weight: 800, fill: C.slate, anchor: 'middle', k: 'tB' })}
        <g transform="translate(322 46)"><circle r="14" fill="${C.page}"/>${g(XMARK(C.ink), 'scale(.8)')}</g>
        <g data-k="pkP">
          <rect x="24" y="76" width="312" height="80" rx="14" fill="${C.violetTint}"/>
          ${tx(32, 180, L('ui.followers'), { size: 13, weight: 800, fill: C.slate })}${bar(32, 192, 220, 9, C.line)}${bar(32, 208, 160, 9, C.line)}
          ${[0, 1, 2, 3, 4, 5].map((i) => photo(24 + (i % 3) * 106, 232 + Math.floor(i / 3) * 104, 100, 98, [C.blueTint, C.violetTint, C.greenSubtle][i % 3], [C.blue, C.violet, C.green][i % 3], 10)).join('')}
        </g>
        <g data-k="pkB">
          <rect x="24" y="76" width="312" height="80" rx="14" fill="${C.blue}"/>
          <rect x="36" y="120" width="56" height="56" rx="14" fill="${C.paper}" stroke="${C.line}"/>${at(64, 148, 0.7, ICON.store(C.blue))}
          ${tx(104, 172, L('ui.friendShop'), { size: 17, weight: 800 })}${tx(104, 190, L('ui.friendLine'), { size: 12, weight: 500, fill: C.slate })}
          <rect x="32" y="204" width="86" height="24" rx="12" fill="${C.greenSubtle}"/>${tx(75, 220, L('ui.openNow'), { size: 11.5, weight: 800, fill: C.green, anchor: 'middle' })}
          ${prods.map((i) => `<g><rect x="${24 + i * 106}" y="244" width="100" height="150" rx="14" fill="${C.page}" stroke="${C.line}"/>
            <rect x="${30 + i * 106}" y="250" width="88" height="70" rx="10" fill="${[C.violetSubtle, C.blueSubtle, C.violetTint][i]}"/>${at(74 + i * 106, 285, 0.85, FRIEND_ICONS[i])}
            ${tx(32 + i * 106, 342, L(`ui.friendItems.${i}`), { size: 14, weight: 800 })}${tx(32 + i * 106, 360, L(`ui.friendPrices.${i}`), { size: 12, weight: 800, fill: C.blue })}
            <rect x="${32 + i * 106}" y="368" width="84" height="20" rx="10" fill="${C.blue}"/>${tx(74 + i * 106, 382, L('ui.order'), { size: 11, weight: 800, fill: C.paper, anchor: 'middle' })}</g>`).join('')}
          ${bar(32, 414, 290, 9, C.line)}${bar(32, 430, 200, 9, C.line)}
        </g>
      </g>`,
    draw(lt, root) {
      const p = P(root);
      p('tabhl', { x: 252 }); p('tabon3', { o: 1 }); p('tabon4', { o: 0 });
      const drop = back(prog(lt, 1.4, 1.95)), lift = easeIn(prog(lt, 7.8, 8.25));
      p('peek', { y: lerp(-560, 0, drop) - 600 * lift, o: lt > 1.35 && lift < 1 ? 1 : 0 });
      p('dim', { o: 0.45 * Math.min(prog(lt, 1.35, 1.7), 1 - prog(lt, 7.8, 8.2)) });
      const biz = easeInOut(prog(lt, 4.05, 4.4));
      p('knob', { x: 78 * biz });
      $(root, 'tP').setAttribute('fill', biz > 0.5 ? C.slate : C.paper);
      $(root, 'tB').setAttribute('fill', biz > 0.5 ? C.paper : C.slate);
      $(root, 'knob').setAttribute('fill', biz > 0.5 ? C.blue : C.violet);
      p('pkP', { o: 1 - biz });
      p('pkB', { o: biz });
      mood(root, 'pk-face', 'smile');
    },
    hand: [[0.6, 250, 400], [1.2, 318, 104, true, 'peek'], [4.0, 255, 47, true, 'switchBiz'], [5.6, 260, 330], [7.6, 322, 46, true, 'close'], [8.4, 260, 520]],
  };
}

// ---------------------------------------------------------------- 2 feeds: the Business feed
function bizFeed() {
  const cards = [
    { k: 'c0', name: L('ui.friendShop'), line: L('ui.friendLine'), theme: C.violet, items: [0, 1, 2].map((i) => L(`ui.friendItems.${i}`)), prices: [0, 1, 2].map((i) => L(`ui.friendPrices.${i}`)), icons: FRIEND_ICONS, chip: L('ui.nearYou'), friend: true },
    { k: 'c1', name: L('ui.bakery'), line: L('ui.bakeryLine'), theme: C.green, items: ['Bread', 'Cake', 'Coffee'], prices: ['30 ETB', '350 ETB', '40 ETB'], icons: [ICON.basket(C.green), ICON.cup(C.violet), ICON.cup(C.blue)], chip: 'Near you · 0.6 km', friend: false },
    { k: 'c2', name: L('ui.name'), line: L('ui.line'), theme: C.blue, items: [0, 1, 2].map((i) => L(`ui.items.${i}`)), prices: [0, 1, 2].map((i) => L(`ui.prices.${i}`)), icons: [ICON.dress(C.violet), ICON.cup(C.blue), ICON.basket(C.green)], chip: 'Near you · 2.1 km', friend: false },
  ];
  return {
    dur: 8, title: 'feeds', step: 2, land: 'bizL',
    captions: [[0.2, 4.4, 'biz1'], [4.5, 8, 'biz2']],
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      <g data-k="pers">${post(80, L('ui.friend2'), C.greenSubtle, C.greenSubtle, C.green)}${post(396, 'Hanna', C.violetTint, C.violetTint, C.violet)}</g>
      <g data-k="bcol">${cards.map((c, i) => g(bizCardMini(c.k, c.name, c.line, c.theme, c.items, c.prices, c.icons, c.chip, c.friend), `translate(180 ${80 + i * 252})`)).join('')}</g>
      ${topbar('personal')}
      ${bottomBar()}
      <rect data-k="ring" x="10" y="74" width="340" height="248" rx="22" fill="none" stroke="${C.violet}" stroke-width="3"/>`,
    draw(lt, root) {
      const p = P(root);
      const sw = easeInOut(prog(lt, 1.05, 1.35));
      p('tabhl', { x: lerp(252, 324, sw) });
      p('tabon3', { o: 1 - sw }); p('tabon4', { o: sw });
      const inB = easeInOut(prog(lt, 1.2, 1.8));
      p('pers', { x: -360 * inB, o: 1 - inB });
      const sc = easeInOut(prog(lt, 5.6, 7.2));
      p('bcol', { x: 360 * (1 - inB), y: -250 * sc, o: inB });
      cards.forEach((c, i) => slideStrip(root, c.k, lt, 2.2 + 0.3 * i));
      p('ring', { o: window_(lt, 4.6, 4.8, 5.4, 5.6) });
    },
    hand: [[0.4, 260, 520], [1.0, 324, 610, true, 'bizTab'], [2.0, 280, 520], [5.6, 260, 520, false, 'scroll'], [7.2, 260, 300], [7.8, 280, 520]],
  };
}

// ---------------------------------------------------------------- 3 find: search near me
const HOTEL_PINS = [{ x: 214, y: 186 }, { x: 128, y: 236 }, { x: 262, y: 262 }];
function hotelRows(y0) {
  return [0, 1, 2].map((i) => `<g data-k="row${i}" transform="translate(0 ${y0 + i * 88})">
    <rect x="16" y="0" width="328" height="80" rx="14" fill="${C.paper}" stroke="${C.line}"/>
    ${photo(24, 8, 64, 64, [C.blueTint, C.violetTint, C.greenSubtle][i], [C.blue, C.violet, C.green][i], 10)}
    <circle cx="30" cy="14" r="11" fill="${C.blue}"/>${tx(30, 18.5, String(i + 1), { size: 12, weight: 800, fill: C.paper, anchor: 'middle' })}
    ${tx(100, 26, L(`ui.hotels.${i}`), { size: 15, weight: 800 })}
    ${at(106, 44, 0.75, STAR(C.violet))}${tx(116, 49, `${L(`ui.ratings.${i}`)} · ${L(`ui.reviews.${i}`)}`, { size: 11.5, weight: 700, fill: C.slate })}
    ${tx(100, 68, L(`ui.fromPrices.${i}`), { size: 12, weight: 800, fill: C.blue })}
    <rect x="270" y="10" width="64" height="22" rx="11" fill="${C.blueSubtle}"/>${at(282, 21, 0.38, ICON.pin(C.blue))}${tx(310, 26, L(`ui.dists.${i}`), { size: 11, weight: 800, fill: C.blue, anchor: 'middle' })}
  </g>`).join('');
}
function searchMap() {
  return `<rect x="16" y="104" width="328" height="196" rx="16" fill="#eaf0f7"/>
    <clipPath id="map-cl"><rect x="16" y="104" width="328" height="196" rx="16"/></clipPath>
    <g clip-path="url(#map-cl)"><g fill="none" stroke="${C.paper}" stroke-linecap="round">
      <path d="M0 170 Q120 200 200 160 T380 150" stroke-width="12"/><path d="M150 100 Q170 220 130 320" stroke-width="10"/><path d="M0 260 Q180 230 380 290" stroke-width="8"/></g>
      <rect x="240" y="200" width="70" height="50" rx="10" fill="${C.greenSubtle}"/></g>
    <circle data-k="radius" cx="180" cy="212" r="84" fill="${C.blue}" fill-opacity=".06" stroke="${C.blue}" stroke-width="2" stroke-dasharray="6 6"/>
    <g data-k="you"><circle cx="180" cy="212" r="9" fill="${C.violet}" stroke="${C.paper}" stroke-width="3"/>${tx(180, 236, L('ui.you'), { size: 11, weight: 800, fill: C.violet, anchor: 'middle' })}</g>
    ${HOTEL_PINS.map((h, i) => `<g data-k="pin${i}"><g transform="scale(.7)">${ICON.pin(C.blue)}</g>${tx(0, -1, String(i + 1), { size: 10, weight: 800, fill: C.blue, anchor: 'middle' })}</g>`).join('')}`;
}
function searchBar(typedText) {
  return `<rect width="360" height="64" fill="${C.paper}"/><rect y="63" width="360" height="1" fill="${C.line}"/>
    <rect x="16" y="12" width="328" height="40" rx="20" fill="${C.page}" stroke="${C.line}"/>
    ${at(38, 32, 0.45, `<circle r="12" fill="none" stroke="${C.slate}" stroke-width="4"/><path d="M8 8 L16 16" stroke="${C.slate}" stroke-width="4" stroke-linecap="round"/>`)}
    ${typedText}`;
}
function searchNear() {
  return {
    dur: 12, title: 'find', step: 3, land: 'nearL',
    captions: [[0.2, 4.4, 'near1'], [4.5, 12, 'near2']],
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      ${searchBar(`${tx(56, 38, L('ui.searchPh'), { size: 13.5, weight: 500, fill: C.slate, k: 'ph', fit: 270 })}${typed('q', 56, 38, L('ui.query'), { size: 15, weight: 800 })}`)}
      <g data-k="chips">
        <g data-k="chipNear"><rect data-k="chipNearBg" x="16" y="70" width="104" height="28" rx="14" fill="${C.paper}" stroke="${C.line}"/>${at(32, 84, 0.4, ICON.pin(C.violet))}${tx(76, 89, L('ui.nearMe'), { size: 12.5, weight: 800, fill: C.ink, anchor: 'middle', k: 'chipNearT' })}</g>
        ${[0, 1, 2].map((i) => `<rect data-k="rad${i}" x="${130 + i * 70}" y="70" width="62" height="28" rx="14" fill="${C.paper}" stroke="${C.line}"/>${tx(161 + i * 70, 89, L(`ui.radius.${i}`), { size: 12.5, weight: 800, fill: C.slate, anchor: 'middle', k: `radt${i}` })}`).join('')}
      </g>
      <g data-k="map">${searchMap()}</g>
      <g data-k="resHead">${tx(18, 324, L('ui.results'), { size: 13, weight: 800, fill: C.slate, fit: 320 })}</g>
      ${hotelRows(336)}
      <g data-k="arrow"><path d="M332 340 V590" stroke="${C.violet}" stroke-width="3" stroke-dasharray="5 6"/><path d="M325 582 L332 594 L339 582 Z" fill="${C.violet}"/></g>`,
    draw(lt, root) {
      const p = P(root);
      const tq = prog(lt, 1.2, 2.2);
      p('ph', { o: lt < 1.15 ? 1 : 0 });
      $(root, 'q-clip').setAttribute('width', (textW(root, 'q') * tq + 4).toFixed(1));
      const near = lt > 2.85, rad = lt > 3.45;
      $(root, 'chipNearBg').setAttribute('fill', near ? C.violet : C.paper);
      $(root, 'chipNearBg').setAttribute('stroke', near ? C.violet : C.line);
      $(root, 'chipNearT').setAttribute('fill', near ? C.paper : C.ink);
      [0, 1, 2].forEach((i) => {
        const on = rad && i === 1;
        $(root, `rad${i}`).setAttribute('fill', on ? C.blue : C.paper);
        $(root, `rad${i}`).setAttribute('stroke', on ? C.blue : C.line);
        $(root, `radt${i}`).setAttribute('fill', on ? C.paper : C.slate);
      });
      p('map', { o: prog(lt, 2.9, 3.3) });
      const r = $(root, 'radius');
      r.setAttribute('r', (84 * easeOut(prog(lt, 3.45, 3.9))).toFixed(1));
      HOTEL_PINS.forEach((h, i) => {
        const q = prog(lt, 4.0 + 0.25 * i, 4.4 + 0.25 * i);
        p(`pin${i}`, { x: h.x, y: lerp(h.y - 40, h.y, back(q)), o: q });
      });
      p('resHead', { o: prog(lt, 4.8, 5.1) });
      [0, 1, 2].forEach((i) => p(`row${i}`, { x: 40 * (1 - easeOut(prog(lt, 5.0 + 0.3 * i, 5.5 + 0.3 * i))), y: 336 + i * 88, o: prog(lt, 5.0 + 0.3 * i, 5.3 + 0.3 * i) }));
      $(root, 'row0').setAttribute('transform', `translate(${(40 * (1 - easeOut(prog(lt, 5.0, 5.5)))).toFixed(1)} 336)`);
      $(root, 'row1').setAttribute('transform', `translate(${(40 * (1 - easeOut(prog(lt, 5.3, 5.8)))).toFixed(1)} 424)`);
      $(root, 'row2').setAttribute('transform', `translate(${(40 * (1 - easeOut(prog(lt, 5.6, 6.1)))).toFixed(1)} 512)`);
      p('arrow', { o: window_(lt, 6.6, 6.9, 10.5, 11.0) });
    },
    hand: [[0.4, 250, 520], [0.8, 180, 32, true, 'search'], [2.8, 68, 84, true, 'nearMe'], [3.4, 230, 84, true], [4.2, 260, 560]],
  };
}

// ---------------------------------------------------------------- 3 find: compare hotels and book
function hotelPanel(i) {
  const amen = [WIFI, (f) => g(ICON.cup(f), 'scale(.6)'), PARK];
  return `<g transform="translate(${i * 360} 0)">
    <rect x="12" y="52" width="336" height="540" rx="22" fill="${C.paper}"/>
    <clipPath id="gal${i}-cl"><rect x="24" y="64" width="312" height="150" rx="14"/></clipPath>
    <g clip-path="url(#gal${i}-cl)"><g data-k="gal${i}">${[0, 1, 2].map((j) => photo(24 + j * 312, 64, 312, 150, [C.blueTint, C.violetTint, C.greenSubtle][(i + j) % 3], [C.blue, C.violet, C.green][(i + j) % 3], 0)).join('')}</g></g>
    ${[0, 1, 2].map((j) => `<circle data-k="dot${i}${j}" cx="${164 + j * 16}" cy="204" r="4" fill="${C.paper}" opacity=".6"/>`).join('')}
    ${tx(28, 242, L(`ui.hotels.${i}`), { size: 19, weight: 800 })}
    ${at(34, 260, 0.85, STAR(C.violet))}${tx(46, 265, `${L(`ui.ratings.${i}`)} · ${L(`ui.reviews.${i}`)}`, { size: 12.5, weight: 700, fill: C.slate })}
    <rect x="252" y="226" width="80" height="24" rx="12" fill="${C.blueSubtle}"/>${tx(292, 242, L(`ui.dists.${i}`), { size: 12, weight: 800, fill: C.blue, anchor: 'middle' })}
    ${[0, 1, 2].map((j) => `<g transform="translate(${28 + j * 104} 280)"><rect width="96" height="30" rx="15" fill="${C.page}" stroke="${C.line}"/>${at(18, 15, 0.6, amen[j](C.blue))}${tx(34, 20, L(`ui.amenities.${j}`), { size: 11, weight: 800, fill: C.ink, fit: 58 })}</g>`).join('')}
    ${[0, 1].map((j) => `<g transform="translate(24 ${324 + j * 70})"><rect width="312" height="62" rx="14" fill="${C.page}" stroke="${C.line}"/>
      ${photo(8, 8, 46, 46, C.blueSubtle, C.blueDeep, 8)}
      ${tx(64, 26, L(`ui.rooms.${j}`), { size: 14, weight: 800 })}${tx(64, 46, `${L(`ui.roomPrices.${i}.${j}`)} ${L('ui.perNight')}`, { size: 12, weight: 800, fill: C.blue })}
      <rect data-k="bk${i}${j}" x="236" y="16" width="66" height="30" rx="15" fill="${C.blue}"/>${tx(269, 36, L('ui.book'), { size: 13, weight: 800, fill: C.paper, anchor: 'middle' })}</g>`).join('')}
    <rect x="24" y="470" width="312" height="52" rx="14" fill="${C.violetSubtle}"/>${at(44, 496, 0.8, STAR(C.violet))}${tx(60, 501, L('ui.review'), { size: 12.5, weight: 600, fill: C.violet, fit: 266 })}
    ${bar(24, 540, 220, 9, C.line)}${bar(24, 556, 150, 9, C.line)}
  </g>`;
}
function compareHotels() {
  return {
    dur: 14, title: 'find', step: 3, land: 'cmpL',
    captions: [[0.2, 3.0, 'cmp1'], [3.1, 6.4, 'cmp2'], [6.5, 9.9, 'cmp3'], [10.0, 14, 'cmp4']],
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      ${searchBar(tx(56, 38, L('ui.query'), { size: 15, weight: 800 }))}
      <g data-k="map0">${searchMap()}</g>
      ${tx(18, 324, L('ui.results'), { size: 13, weight: 800, fill: C.slate, fit: 320 })}
      ${hotelRows(336)}
      <rect data-k="dim" width="360" height="640" fill="${C.ink}"/>
      <clipPath id="hp-cl"><rect x="0" y="0" width="360" height="640"/></clipPath>
      <g data-k="hp"><g data-k="track">${hotelPanel(0)}${hotelPanel(1)}</g>
        <g transform="translate(326 72)"><circle r="14" fill="${C.ink}" opacity=".55"/>${g(XMARK(C.paper), 'scale(.75)')}</g></g>
      <g data-k="sheet">
        <rect x="0" y="380" width="360" height="272" rx="24" fill="${C.paper}" stroke="${C.line}"/>${bar(160, 390, 40, 6, C.line)}
        ${tx(24, 428, L('ui.bookTitle'), { size: 16, weight: 800, fit: 312 })}
        <rect x="24" y="444" width="312" height="44" rx="14" fill="${C.page}" stroke="${C.line}"/>${at(46, 466, 0.75, CAL(C.blue))}${tx(66, 471, L('ui.dates'), { size: 14, weight: 700, fit: 260 })}
        ${tx(24, 516, L('ui.total'), { size: 15, weight: 800, fill: C.blue })}
        <g data-k="sendBtn"><rect x="24" y="530" width="312" height="46" rx="23" fill="${C.blue}"/>${tx(180, 559, L('ui.sendRequest'), { size: 16, weight: 800, fill: C.paper, anchor: 'middle' })}</g>
        <g data-k="sentBtn"><rect x="24" y="530" width="312" height="46" rx="23" fill="${C.green}"/>${tx(170, 559, L('ui.sent'), { size: 16, weight: 800, fill: C.paper, anchor: 'middle' })}${at(240, 553, 0.6, ICON.check(C.paper))}</g>
      </g>
      <g data-k="msg">
        <rect x="16" y="10" width="328" height="64" rx="20" fill="${C.paper}" stroke="${C.line}"/>
        <circle cx="46" cy="42" r="18" fill="${C.blue}"/>${at(46, 42, 0.5, ICON.store(C.paper))}
        ${tx(74, 34, L('ui.hotels.1'), { size: 13, weight: 800 })}${tx(74, 54, L('ui.reply'), { size: 13, weight: 500, fill: C.slate, fit: 256 })}
      </g>
      ${at(0, 0, 1, face('guest'))}`,
    draw(lt, root) {
      const p = P(root);
      const up = easeOut(prog(lt, 1.0, 1.5));
      p('dim', { o: 0.5 * prog(lt, 1.0, 1.3) });
      p('hp', { y: 600 * (1 - up), o: prog(lt, 1.0, 1.1) });
      // Photos slide in the first hotel; then a swipe brings the second.
      const n = Math.min(2, Math.max(0, (lt - 2.0) / 0.7)), gi = Math.floor(n), gf = n - gi;
      $(root, 'gal0').setAttribute('transform', `translate(${(-312 * (gi + easeInOut(Math.min(1, gf / 0.5)))).toFixed(1)} 0)`);
      [0, 1, 2].forEach((j) => $(root, `dot0${j}`).setAttribute('opacity', Math.round(Math.min(2, n)) === j ? 1 : 0.5));
      [0, 1, 2].forEach((j) => $(root, `dot1${j}`).setAttribute('opacity', j === 0 ? 1 : 0.5));
      const sw = easeInOut(prog(lt, 4.9, 5.6));
      p('track', { x: -360 * sw });
      $(root, 'bk11').setAttribute('fill', lt > 6.95 ? C.green : C.blue);
      const sh = back(prog(lt, 7.1, 7.6));
      p('sheet', { y: 300 * (1 - sh), o: prog(lt, 7.1, 7.2) });
      p('sendBtn', { o: lt < 8.75 ? 1 : 0 });
      p('sentBtn', { o: lt >= 8.75 ? 1 : 0 });
      p('msg', { y: lerp(-90, 0, back(prog(lt, 10.2, 10.6))), o: prog(lt, 10.2, 10.3) });
      p('guest', { x: 180, y: 290, s: 1.6 * back(prog(lt, 10.8, 11.2)), o: prog(lt, 10.8, 10.9) });
      mood(root, 'guest', 'big');
    },
    hand: [[0.4, 260, 560], [0.8, 180, 376, true, 'hotel'], [2.4, 270, 160], [4.7, 300, 300, false, 'swipe'], [5.6, 70, 300], [6.9, 293, 434, true, 'book'], [8.6, 180, 553, true, 'send'], [9.4, 270, 620]],
  };
}

// ---------------------------------------------------------------- 4 start
const CATS = [
  { glyph: ICON.store, c: C.blue }, { glyph: GLYPH.cross, c: C.violet }, { glyph: ICON.cup, c: C.green },
  { glyph: GLYPH.helmet, c: C.blue }, { glyph: GLYPH.truck, c: C.violet }, { glyph: GLYPH.cap, c: C.blue },
  { glyph: GLYPH.briefcase, c: C.blueDeep }, { glyph: GLYPH.leaf, c: C.green }, { glyph: GLYPH.bed, c: C.violet },
  { glyph: GLYPH.scissors, c: C.violet },
];
const TPL = [0, 1, 2, 3, 4, 5].map((i) => ({ x: i % 2 ? 264 : 96, y: 214 + Math.floor(i / 2) * 150 }));
function templatesMarkup() {
  return `<rect width="360" height="640" fill="${C.page}"/>${studioBar(L('ui.pickTemplate'))}
    <rect x="16" y="72" width="328" height="40" rx="20" fill="${C.paper}" stroke="${C.line}"/>
    ${at(40, 92, 0.45, `<circle r="12" fill="none" stroke="${C.slate}" stroke-width="4"/><path d="M8 8 L16 16" stroke="${C.slate}" stroke-width="4" stroke-linecap="round"/>`)}
    ${tx(58, 97, L('ui.search'), { size: 14, weight: 500, fill: C.slate })}
    ${TPL.map((t, i) => i === 0 ? `<g data-k="tpl0" transform="translate(${t.x} ${t.y})">
        <rect x="-76" y="-66" width="152" height="132" rx="16" fill="${C.paper}" stroke="${C.blue}" stroke-width="2.5" stroke-dasharray="8 6"/>
        <circle cy="-12" r="26" fill="${C.blueSubtle}"/>${g(GLYPH.plus(C.blue), 'translate(0 -12)')}
        ${tx(0, 40, L('ui.scratch'), { size: 13, weight: 800, fill: C.blue, anchor: 'middle', fit: 136 })}</g>`
      : `<g data-k="tpl${i}" transform="translate(${t.x} ${t.y})">
        <rect x="-76" y="-66" width="152" height="132" rx="16" fill="${C.paper}" stroke="${C.line}"/>
        <rect x="-66" y="-56" width="132" height="24" rx="8" fill="${[C.blue, C.violet, C.green, C.blueDeep, C.violet][i - 1]}"/>
        ${photo(-66, -26, 132, 52, [C.violetTint, C.blueTint, C.greenSubtle, C.blueSubtle, C.violetSubtle][i - 1], [C.violet, C.blue, C.green, C.blueDeep, C.violet][i - 1], 8)}
        ${tx(-66, 46, L(`ui.templates.${i - 1}`), { size: 14, weight: 800, fit: 132 })}</g>`).join('')}`;
}
function start() {
  return {
    dur: 7, title: 'start', step: 4,
    captions: [[0.2, 2.4, 'start1'], [2.5, 4.0, 'start2'], [4.1, 7, 'start3']], land: 'start1',
    markup: `
      <g data-k="scrA">
        <rect width="360" height="640" fill="${C.page}"/>
        <g data-k="banner">
          <rect x="16" y="82" width="328" height="144" rx="20" fill="${C.blue}"/>
          ${at(44, 104, 0.35, GLYPH.sparkle(C.paper))}${tx(56, 108, L('ui.studio'), { size: 10, weight: 800, fill: C.paper, ls: 1.2, opacity: 0.9 })}
          ${tx(36, 140, L('ui.build1'), { size: 21, weight: 800, fill: C.paper })}${tx(36, 165, L('ui.build2'), { size: 21, weight: 800, fill: C.paper })}
          <rect x="36" y="180" width="112" height="32" rx="16" fill="${C.paper}"/>${tx(92, 201, L('ui.getStarted'), { size: 13, weight: 800, fill: C.blue, anchor: 'middle', fit: 100 })}
          <g transform="translate(282 154) rotate(10)"><rect x="-26" y="-48" width="52" height="96" rx="10" fill="${C.ink}"/><rect x="-21" y="-42" width="42" height="84" rx="7" fill="${C.paper}"/><rect x="-17" y="-38" width="34" height="12" rx="4" fill="${C.violet}"/>${photo(-17, -22, 34, 26, C.blueTint, C.blue, 4)}${bar(-17, 10, 26, 5, C.line)}${bar(-17, 20, 18, 5, C.line)}</g>
          ${at(320, 98, 0.5, GLYPH.sparkle(C.paper))}
        </g>
        ${[0, 1].map((i) => `<rect x="16" y="${244 + i * 200}" width="328" height="184" rx="16" fill="${C.paper}" stroke="${C.line}"/><circle cx="44" cy="${272 + i * 200}" r="14" fill="${C.blueTint}"/>${tx(66, 277 + i * 200, ['Sara', L('ui.friend')][i], { size: 14, weight: 800 })}${photo(28, 296 + i * 200, 304, 118, [C.greenSubtle, C.blueTint][i], [C.green, C.blue][i], 10)}`).join('')}
        ${topbar('personal')}
      </g>
      <g data-k="scrB">
        <rect width="360" height="640" fill="${C.page}"/>${studioBar(L('ui.kind'))}
        ${[0, 1, 2].map((i) => `<circle cx="${150 + i * 30}" cy="76" r="5" fill="${i === 0 ? C.blue : C.line}"/>`).join('')}
        ${CATS.map((c, i) => `<g data-k="cat${i}">
          <rect x="-78" y="-38" width="156" height="76" rx="16" fill="${C.paper}" stroke="${C.line}"/>
          <circle cx="-44" cy="0" r="24" fill="${c.c}" opacity=".12"/>${at(-44, 0, 0.75, c.glyph(c.c))}
          ${tx(-12, 5, L(`ui.cats.${i}`), { size: 14, weight: 800, fit: 84 })}</g>`).join('')}
        <rect data-k="foodring" x="12" y="186" width="168" height="84" rx="20" fill="none" stroke="${C.blue}" stroke-width="3"/>
      </g>
      <g data-k="scrC">${templatesMarkup()}
        ${[0, 1, 2].map((i) => `<circle cx="${150 + i * 30}" cy="128" r="5" fill="${i < 2 ? C.blue : C.line}"/>`).join('')}
      </g>`,
    draw(lt, root) {
      const p = P(root);
      p('scrA', { o: 1 - prog(lt, 1.7, 2.0) });
      const inB = easeInOut(prog(lt, 1.6, 2.1));
      p('scrB', { x: lerp(360, 0, inB), o: Math.min(prog(lt, 1.6, 1.7), 1 - prog(lt, 3.6, 3.9)) });
      CATS.forEach((c, i) => {
        const pop = back(prog(lt, 1.9 + 0.06 * i, 2.3 + 0.06 * i));
        const hit = i === 2 ? 1 + 0.08 * Math.sin(Math.PI * prog(lt, 2.85, 3.15)) : 1;
        p(`cat${i}`, { x: i % 2 ? 266 : 96, y: 132 + Math.floor(i / 2) * 92, s: pop * hit, o: prog(lt, 1.9 + 0.06 * i, 2.0 + 0.06 * i) });
      });
      p('foodring', { o: window_(lt, 2.9, 3.0, 3.6, 3.9) });
      const inC = easeInOut(prog(lt, 3.5, 4.0));
      p('scrC', { x: lerp(360, 0, inC), o: prog(lt, 3.5, 3.6) });
      TPL.forEach((t, i) => p(`tpl${i}`, { x: t.x, y: t.y, s: back(prog(lt, 3.8 + 0.1 * i, 4.2 + 0.1 * i)) }));
    },
    hand: [[0.6, 250, 400], [1.2, 92, 196, true, 'banner'], [2.9, 96, 224, true, 'category'], [5.0, 264, 214], [6.2, 96, 214]],
  };
}

// ---------------------------------------------------------------- 2 path A
function pathA() {
  return {
    dur: 5, title: 'start', step: 4,
    captions: [[0.2, 5, 'pathA1']], land: 'pathA1',
    markup: `${templatesMarkup()}
      <g data-k="site">${site(C.violet)}</g>
      <g data-k="ok"><circle r="22" fill="${C.green}"/>${ICON.check(C.paper)}</g>`,
    draw(lt, root) {
      const p = P(root);
      TPL.forEach((t, i) => p(`tpl${i}`, { x: t.x, y: t.y, s: i === 1 ? 1 + 0.06 * Math.sin(Math.PI * prog(lt, 0.5, 0.8)) : 1 }));
      const f = easeInOut(prog(lt, 0.9, 1.7));
      const s0 = 152 / 360;
      p('site', { x: lerp(264 - s0 * 180, 0, f), y: lerp(214 - s0 * 320, 0, f), s: lerp(s0, 1, f), o: prog(lt, 0.9, 1.1) });
      p('ok', { x: 316, y: 100, s: back(prog(lt, 2.0, 2.4)), o: prog(lt, 2.0, 2.1) });
    },
    hand: [[0.2, 200, 430], [0.65, 264, 214, true, 'template'], [1.6, 300, 520]],
  };
}

// ---------------------------------------------------------------- 2 path B
const BLOCKS = [
  { cy: 116, body: (w) => `<rect x="${-w / 2}" y="-36" width="${w}" height="72" rx="10" fill="${C.blue}"/>${photo(-w / 2 + 8, -28, 110, 56, C.blueTint, C.blueDeep, 8)}${tx(-20, -4, L('ui.name'), { size: 15, weight: 800, fill: C.paper })}${bar(-20, 8, 80, 8, C.paper, 0.7)}` },
  { cy: 198, body: (w) => `<rect x="${-w / 2}" y="-40" width="${w}" height="80" rx="10" fill="${C.paper}" stroke="${C.line}"/>${[0, 1, 2].map((i) => `<rect x="${-w / 2 + 10 + i * 96}" y="-30" width="84" height="60" rx="8" fill="${[C.violetSubtle, C.blueSubtle, C.greenSubtle][i]}"/>${at(-w / 2 + 52 + i * 96, -8, 0.6, [ICON.dress(C.violet), ICON.cup(C.blue), ICON.basket(C.green)][i])}${tx(-w / 2 + 18 + i * 96, 22, L(`ui.items.${i}`), { size: 11, weight: 700 })}`).join('')}` },
  { cy: 274, body: (w) => `<rect x="${-w / 2}" y="-30" width="${w}" height="60" rx="10" fill="${C.paper}" stroke="${C.line}"/>${[0, 1, 2, 3].map((i) => photo(-w / 2 + 8 + i * 72, -22, 64, 44, [C.blueTint, C.violetTint, C.greenSubtle, C.blueSubtle][i], [C.blue, C.violet, C.green, C.blueDeep][i], 6)).join('')}` },
  { cy: 334, body: (w) => `<rect x="${-w / 2}" y="-24" width="${w}" height="48" rx="10" fill="${C.page}" stroke="${C.line}"/>${at(-w / 2 + 26, 0, 0.6, GLYPH.clock(C.blue))}${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${-w / 2 + 52 + i * 34}" y="-10" width="28" height="20" rx="10" fill="${i < 5 ? C.green : C.line}"/>${tx(-w / 2 + 66 + i * 34, 4, L(`ui.days.${i}`), { size: 10, weight: 800, fill: i < 5 ? C.paper : C.slate, anchor: 'middle' })}`).join('')}` },
];
const ROWS = [GLYPH.gallery(C.blue), ICON.cup(C.violet), GLYPH.camera(C.green), GLYPH.clock(C.blue), GLYPH.comment(C.violet)];
function pathB() {
  return {
    dur: 6, title: 'start', step: 4,
    captions: [[0.2, 6, 'pathB1']], land: 'pathB1',
    markup: `<rect width="360" height="640" fill="${C.page}"/>${studioBar(L('ui.addSections'))}
      <rect data-k="canvas" x="24" y="72" width="312" height="292" rx="14" fill="${C.paper}" stroke="${C.slate}" stroke-width="2" stroke-dasharray="8 6"/>
      ${BLOCKS.map((b, i) => `<g data-k="blk${i}">${b.body(296)}</g>`).join('')}
      <rect x="0" y="378" width="360" height="270" rx="24" fill="${C.paper}" stroke="${C.line}"/>${bar(160, 388, 40, 6, C.line)}
      ${ROWS.map((r, i) => `<g>
        <circle cx="40" cy="${414 + i * 48}" r="18" fill="${C.page}"/>${at(40, 414 + i * 48, 0.6, r)}
        ${tx(70, 420 + i * 48, L(`ui.sections.${i}`), { size: 15, weight: 700 })}
        <g data-k="plus${i}" transform="translate(320 ${414 + i * 48})"><circle r="17" fill="${C.blue}"/>${GLYPH.plus(C.paper)}</g></g>`).join('')}
      <g data-k="ok"><circle r="20" fill="${C.green}"/>${g(ICON.check(C.paper), 'scale(.9)')}</g>`,
    draw(lt, root) {
      const p = P(root);
      BLOCKS.forEach((b, i) => {
        const t0 = 0.8 + 1.1 * i, f = easeInOut(prog(lt, t0, t0 + 0.6));
        p(`blk${i}`, { x: lerp(320, 180, f), y: lerp(414 + i * 48, b.cy, f), s: lerp(0.15, 1, f), o: prog(lt, t0, t0 + 0.1) });
        p(`plus${i}`, { x: 320, y: 414 + i * 48, s: 1 - 0.2 * Math.sin(Math.PI * prog(lt, t0 - 0.1, t0 + 0.15)) });
      });
      $(root, 'canvas').setAttribute('stroke-dasharray', lt > 5.0 ? 'none' : '8 6');
      p('ok', { x: 316, y: 88, s: back(prog(lt, 5.0, 5.35)), o: prog(lt, 5.0, 5.1) });
    },
    hand: [[0.3, 220, 600], [0.8, 320, 414, true, 'plus'], [1.9, 320, 462, true], [3.0, 320, 510, true], [4.1, 320, 558, true], [5.0, 260, 610]],
  };
}

// ---------------------------------------------------------------- 3 fill
function fill() {
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => 76 + i * 36);
  const tapsH = [12.4, 12.8, 13.2, 13.6, 14.0];
  return {
    dur: 19.5, title: 'fill', step: 5,
    captions: [[0.2, 4.9, 'fill1'], [5.0, 8.3, 'fill2'], [8.4, 11.9, 'fill3'], [12.0, 15.2, 'fill4'], [15.3, 19.5, 'fill5']], land: 'fillL',
    markup: `<rect width="360" height="640" fill="${C.page}"/>${studioBar(L('ui.edit'))}
      <rect x="16" y="64" width="328" height="190" rx="14" fill="${C.paper}" stroke="${C.line}"/>
      <rect x="24" y="72" width="312" height="22" rx="8" fill="${C.blue}"/>
      <rect x="24" y="102" width="150" height="92" rx="10" fill="${C.page}" stroke="${C.line}" stroke-dasharray="6 5"/>
      <g data-k="pv-photo">${photo(24, 102, 150, 92, C.violetTint, C.violet, 10)}</g>
      <rect data-k="pv-hl" x="20" y="98" width="158" height="100" rx="13" fill="none" stroke="${C.blue}" stroke-width="3"/>
      ${typed('pv-name', 184, 118, L('ui.name'), { size: 13, weight: 800 })}
      ${typed('pv-line', 184, 136, L('ui.line'), { size: 10, weight: 600, fill: C.slate, fit: 148 })}
      ${[0, 1, 2, 3].map((i) => `<g data-k="pv-soc${i}"><circle r="11" fill="${C.blue}"/>${g([GLYPH.play(C.paper), GLYPH.camera(C.paper), GLYPH.comment(C.paper), GLYPH.globe(C.paper)][i], 'scale(.38)')}</g>`).join('')}
      ${at(194, 184, 0.42, GLYPH.clock(C.blue))}
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle data-k="pv-day${i}" cx="${214 + i * 17}" cy="184" r="5" fill="${C.line}"/>`).join('')}
      ${[0, 1, 2].map((i) => `<g data-k="pv-item${i}"><rect x="${24 + i * 58}" y="204" width="50" height="42" rx="7" fill="${[C.violetSubtle, C.blueSubtle, C.greenSubtle][i]}"/>${at(49 + i * 58, 222, 0.42, [ICON.dress(C.violet), ICON.cup(C.blue), ICON.basket(C.green)][i])}<rect x="${30 + i * 58}" y="236" width="26" height="6" rx="3" fill="${C.blue}" opacity=".7"/></g>`).join('')}

      <rect x="16" y="264" width="328" height="370" rx="16" fill="${C.paper}" stroke="${C.line}"/>
      <g data-k="f-empty"><rect x="32" y="280" width="296" height="70" rx="12" fill="${C.violetSubtle}" stroke="${C.violet}" stroke-width="2" stroke-dasharray="7 5"/>${at(126, 315, 0.75, GLYPH.camera(C.violet))}${tx(150, 321, L('ui.addPhoto'), { size: 17, weight: 800, fill: C.violet })}</g>
      <g data-k="f-full">${photo(32, 280, 296, 70, C.violetTint, C.violet, 12)}</g>
      ${[364, 406, 448, 490].map((y) => `<rect x="32" y="${y}" width="296" height="34" rx="10" fill="${C.page}" stroke="${C.line}"/>`).join('')}
      ${tx(46, 386, L('ui.namePh'), { size: 14, weight: 500, fill: C.slate, k: 'ph-name' })}
      ${typed('f-name', 46, 386, L('ui.name'), { size: 15, weight: 800 })}
      ${tx(46, 428, L('ui.linePh'), { size: 14, weight: 500, fill: C.slate, k: 'ph-line' })}
      ${typed('f-line', 46, 428, L('ui.line'), { size: 14, weight: 600 })}
      <rect data-k="caret" x="0" y="372" width="2.5" height="18" fill="${C.blue}"/>
      ${at(52, 465, 0.5, ICON.link(C.blue))}
      ${tx(70, 470, L('ui.linkPh'), { size: 14, weight: 500, fill: C.slate, k: 'ph-link' })}
      ${typed('f-link', 70, 470, L('ui.link'), { size: 13.5, weight: 700, fill: C.blue, fit: 250 })}
      ${at(52, 507, 0.5, `<g data-k="clock">${GLYPH.clock(C.blue)}</g>`)}
      ${days.map((x, i) => `<rect data-k="day${i}" x="${x}" y="496" width="30" height="22" rx="11" fill="${C.paper}" stroke="${C.line}"/>${tx(x + 15, 511, L(`ui.days.${i}`), { size: 11, weight: 800, fill: C.slate, anchor: 'middle', k: `dayt${i}` })}`).join('')}
      <rect x="32" y="532" width="296" height="40" rx="10" fill="${C.page}" stroke="${C.line}"/>
      <rect x="38" y="537" width="30" height="30" rx="7" fill="${C.violetSubtle}"/>${at(53, 552, 0.4, ICON.dress(C.violet))}${tx(78, 557, L('ui.items.0'), { size: 14, weight: 700 })}
      <rect x="252" y="542" width="66" height="20" rx="10" fill="${C.blueTint}"/>${tx(285, 556, L('ui.prices.0'), { size: 11, weight: 800, fill: C.blueDeep, anchor: 'middle' })}
      <g data-k="add"><rect x="32" y="580" width="296" height="40" rx="10" fill="${C.blueSubtle}" stroke="${C.blue}" stroke-width="2" stroke-dasharray="7 5"/>${at(146, 600, 0.75, GLYPH.plus(C.blue))}${tx(162, 606, L('ui.addItem'), { size: 15, weight: 800, fill: C.blue })}</g>
      <g data-k="item1"><rect x="32" y="580" width="296" height="40" rx="10" fill="${C.page}" stroke="${C.line}"/><rect x="38" y="585" width="30" height="30" rx="7" fill="${C.blueSubtle}"/>${tx(78, 605, L('ui.items.1'), { size: 14, weight: 700 })}
        <g data-k="price"><rect x="180" y="590" width="62" height="20" rx="10" fill="${C.blueTint}"/>${tx(211, 604, L('ui.prices.1'), { size: 11, weight: 800, fill: C.blueDeep, anchor: 'middle' })}</g>
        ${tx(282, 605, L('ui.sell'), { size: 12, weight: 800, fill: C.slate, anchor: 'end' })}
        <g data-k="sell"><circle cx="305" cy="600" r="14" fill="${C.line}"/>${at(305, 600, 0.45, ICON.bag(C.paper))}</g>
        <circle data-k="sell-on" cx="305" cy="600" r="14" fill="${C.green}"/><g data-k="sell-on-bag">${at(305, 600, 0.45, ICON.bag(C.paper))}</g></g>
      <g data-k="i1photo">${at(0, 0, 0.42, ICON.cup(C.blue))}</g>
      <g data-k="picker">
        <rect x="56" y="356" width="248" height="74" rx="16" fill="${C.paper}" stroke="${C.line}"/>
        ${[0, 1, 2].map((i) => photo(68 + i * 80, 366, 64, 54, [C.blueTint, C.violetTint, C.greenSubtle][i], [C.blue, C.violet, C.green][i], 8)).join('')}
      </g>
      <g data-k="pfly">${photo(-32, -27, 64, 54, C.violetTint, C.violet, 8)}</g>
      <g data-k="paste"><rect x="-46" y="-18" width="92" height="36" rx="18" fill="${C.ink}"/>${at(-24, 0, 0.5, GLYPH.clipboard(C.paper))}${tx(6, 5, L('ui.paste'), { size: 14, weight: 800, fill: C.paper })}</g>`,
    cam: [[0, 1, 180, 320], [0.6, 1, 180, 320], [1.2, 1.55, 180, 320], [3.9, 1.55, 180, 320], [4.5, 1, 180, 320], [5.1, 1, 180, 320], [5.6, 1.5, 180, 400], [7.7, 1.5, 180, 400], [8.3, 1.5, 180, 465], [10.1, 1.5, 180, 465], [10.7, 1, 180, 320], [11.5, 1, 180, 320], [12.0, 1.5, 180, 507], [14.6, 1.5, 180, 507], [15.3, 1.5, 180, 580], [18.3, 1.5, 180, 580], [19.0, 1, 180, 320]],
    draw(lt, root) {
      const p = P(root);
      // Photo: tap the field, pick from the gallery, it flies in.
      const pk = back(prog(lt, 1.8, 2.15));
      p('picker', { x: 180 * (1 - pk), y: 393 * (1 - pk), s: pk, o: Math.min(prog(lt, 1.8, 1.9), 1 - prog(lt, 2.9, 3.1)) });
      const fl = easeInOut(prog(lt, 2.9, 3.4));
      p('pfly', { x: 180, y: lerp(393, 315, fl), s: lerp(1, 2.6, fl), o: fl > 0 && fl < 1 ? 1 : 0 });
      p('f-empty', { o: 1 - prog(lt, 3.3, 3.5) });
      p('f-full', { o: prog(lt, 3.3, 3.5) });
      p('pv-photo', { o: prog(lt, 3.5, 3.8) });
      p('pv-hl', { o: window_(lt, 4.4, 4.6, 5.0, 5.3) });
      // Words: typed in, shown in the preview at the same time.
      const nm = prog(lt, 6.1, 6.9), ln = prog(lt, 7.3, 8.1);
      const wName = textW(root, 'f-name'), wLine = textW(root, 'f-line');
      $(root, 'f-name-clip').setAttribute('width', (wName * nm + 4).toFixed(1));
      $(root, 'f-line-clip').setAttribute('width', (wLine * ln + 4).toFixed(1));
      $(root, 'pv-name-clip').setAttribute('width', (textW(root, 'pv-name') * nm + 4).toFixed(1));
      $(root, 'pv-line-clip').setAttribute('width', (textW(root, 'pv-line') * ln + 4).toFixed(1));
      p('ph-name', { o: lt < 6.0 ? 1 : 0 });
      p('ph-line', { o: lt < 7.2 ? 1 : 0 });
      const typingName = lt > 5.9 && lt < 7.1, typingLine = lt > 7.1 && lt < 8.3;
      const caretX = typingName ? 47 + wName * nm : 47 + wLine * ln;
      p('caret', { x: caretX, y: typingName ? 0 : 42, o: (typingName || typingLine) && Math.floor(lt * 3) % 2 === 0 ? 1 : 0 });
      // Link: tap the field, tap Paste.
      p('paste', { x: 250, y: 428, s: back(prog(lt, 8.8, 9.1)), o: Math.min(prog(lt, 8.8, 8.9), 1 - prog(lt, 9.45, 9.6)) });
      p('ph-link', { o: lt < 9.5 ? 1 : 0 });
      $(root, 'f-link-clip').setAttribute('width', (textW(root, 'f-link') * prog(lt, 9.5, 9.9) + 4).toFixed(1));
      [0, 1, 2, 3].forEach((i) => p(`pv-soc${i}`, { x: 196 + i * 28, y: 158, s: back(prog(lt, 10.7 + 0.12 * i, 11.0 + 0.12 * i)), o: prog(lt, 10.7 + 0.12 * i, 10.8 + 0.12 * i) }));
      // Hours: tap five weekdays; the clock turns.
      for (let i = 0; i < 7; i++) {
        const on = i < 5 && lt >= tapsH[i] + 0.05;
        $(root, `day${i}`).setAttribute('fill', on ? C.green : C.paper);
        $(root, `day${i}`).setAttribute('stroke', on ? C.green : C.line);
        $(root, `dayt${i}`).setAttribute('fill', on ? C.paper : C.slate);
        $(root, `pv-day${i}`).setAttribute('fill', on ? C.green : C.line);
      }
      const clk = $(root, 'clock');
      const turn = 360 * prog(lt, 12.2, 14.4);
      clk.querySelector('.hand-m').setAttribute('transform', `rotate(${turn * 4})`);
      clk.querySelector('.hand-h').setAttribute('transform', `rotate(${turn / 3})`);
      // Products: add an item with a photo and a price, mark it for sale.
      p('add', { o: 1 - prog(lt, 15.9, 16.1) });
      p('item1', { o: prog(lt, 15.9, 16.1) });
      const ip = easeInOut(prog(lt, 16.2, 16.7));
      p('i1photo', { x: lerp(180, 53, ip), y: lerp(470, 600, ip), s: lerp(2, 1, ip), o: prog(lt, 16.2, 16.3) });
      const pr = back(prog(lt, 16.9, 17.2));
      p('price', { x: 211 * (1 - pr), y: 600 * (1 - pr), s: pr, o: prog(lt, 16.9, 17.0) });
      p('sell-on', { o: prog(lt, 17.65, 17.75) });
      p('sell-on-bag', { o: prog(lt, 17.65, 17.75) });
      p('pv-item2', { o: prog(lt, 17.8, 18.1) });
    },
    hand: [[1.0, 240, 360], [1.6, 180, 315, true, 'addPhoto'], [2.7, 180, 393, true, 'pick'], [3.6, 240, 380], [5.9, 180, 381, true, 'type'], [7.1, 180, 423, true], [8.6, 180, 465, true], [9.3, 250, 428, true, 'paste'], [10.2, 270, 490],
      [12.4, 91, 507, true, 'days'], [12.8, 127, 507, true], [13.2, 163, 507, true], [13.6, 199, 507, true], [14.0, 235, 507, true], [15.8, 180, 600, true, 'addItem'], [17.6, 305, 600, true, 'sell'], [18.4, 270, 630]],
  };
}

// ---------------------------------------------------------------- 4 style
const THEMES = [C.blue, C.violet, C.green, C.ink];
function style() {
  return {
    dur: 8, title: 'style', step: 6,
    captions: [[0.2, 3.9, 'style1'], [4.0, 8, 'style2']], land: 'style2',
    markup: `<rect width="360" height="640" fill="${C.page}"/>${studioBar(L('ui.makeYours'))}
      <g data-k="edit">
        <g transform="translate(50 64) scale(.72)"><g data-k="siteS">${site(C.blue)}</g></g>
        <rect x="50" y="64" width="259" height="461" fill="none" stroke="${C.line}"/>
        <rect x="16" y="540" width="328" height="60" rx="30" fill="${C.paper}" stroke="${C.line}"/>
        ${at(40, 570, 0.55, GLYPH.palette(C.slate))}${tx(58, 575, L('ui.colour'), { size: 13, weight: 800, fill: C.slate })}
        ${THEMES.map((c, i) => `<circle cx="${132 + i * 56}" cy="570" r="18" fill="${c}"/>`).join('')}
        <circle data-k="swring" cx="0" cy="570" r="24" fill="none" stroke="${C.ink}" stroke-width="3"/>
      </g>
      <g data-k="devs">
        <g data-k="dMon">${device(300, 168, 9)}<rect x="-30" y="93" width="60" height="10" rx="5" fill="${C.ink}"/>${tx(0, 130, L('ui.screens.0'), { size: 15, weight: 800, anchor: 'middle' })}</g>
        <g data-k="dTab">${device(150, 200, 10)}${tx(0, 132, L('ui.screens.1'), { size: 15, weight: 800, anchor: 'middle' })}</g>
        <g data-k="dPho">${device(84, 170, 7)}${tx(0, 112, L('ui.screens.2'), { size: 15, weight: 800, anchor: 'middle' })}</g>
        <rect x="70" y="580" width="220" height="48" rx="24" fill="${C.paper}" stroke="${C.line}"/>
        ${[GLYPH.monitor, GLYPH.tablet, GLYPH.phoneG].map((gl, i) => `<g transform="translate(${110 + i * 70} 604)"><circle r="20" fill="${C.blueSubtle}" data-k="tgbg${i}"/>${g(gl(C.blue), 'scale(.7)')}</g>`).join('')}
      </g>`,
    draw(lt, root) {
      const p = P(root);
      const taps = [1.0, 2.0, 3.0];
      let ti = 0;
      taps.forEach((tk, i) => { if (lt >= tk + 0.05) ti = [1, 2, 0][i]; });
      retheme(root, 'siteS', THEMES[ti]);
      p('swring', { x: 132 + ti * 56 });
      p('edit', { o: 1 - prog(lt, 3.9, 4.2) });
      p('devs', { o: prog(lt, 4.0, 4.3) });
      const tg = [4.8, 5.8, 6.8];
      const pick = lt < tg[0] ? -1 : lt < tg[1] ? 0 : lt < tg[2] ? 1 : 2;
      ['dMon', 'dTab', 'dPho'].forEach((k, i) => {
        const pos = [{ x: 180, y: 178 }, { x: 110, y: 420 }, { x: 266, y: 410 }][i];
        const pop = back(prog(lt, 4.1 + 0.15 * i, 4.5 + 0.15 * i));
        const big = pick === i ? 1.06 : 1;
        p(k, { x: pos.x, y: pos.y, s: pop * big, o: pick === -1 || pick === i ? 1 : 0.45 });
        $(root, `tgbg${i}`).setAttribute('fill', pick === i ? C.blueTint : C.blueSubtle);
      });
    },
    hand: [[0.5, 220, 620], [1.0, 188, 570, true, 'colour'], [2.0, 244, 570, true], [3.0, 132, 570, true], [4.8, 110, 604, true, 'screens'], [5.8, 180, 604, true], [6.8, 250, 604, true], [7.4, 280, 630]],
  };
}

// ---------------------------------------------------------------- 5 publish
function publish() {
  return {
    dur: 5, title: 'publish', step: 7,
    captions: [[0.3, 5, 'pub1']], land: 'pub1',
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      <g transform="translate(27 70) scale(.85)">${site(C.blue)}</g>
      ${studioBar(L('ui.edit'), `<g data-k="pub"><rect data-k="pubbg" x="236" y="11" width="112" height="36" rx="18" fill="${C.blue}"/>${at(258, 29, 0.6, ICON.check(C.paper))}${tx(300, 35, L('ui.publish'), { size: 15, weight: 800, fill: C.paper, anchor: 'middle', fit: 72 })}</g>`)}
      <rect data-k="dim" width="360" height="640" fill="${C.ink}"/>
      <g data-k="rings"><circle data-k="r1" cx="180" cy="270" r="50" fill="none" stroke="${C.paper}" stroke-width="3"/><circle data-k="r2" cx="180" cy="270" r="50" fill="none" stroke="${C.paper}" stroke-width="3"/></g>
      <g data-k="globe"><circle r="54" fill="${C.blue}"/>${g(GLYPH.globe(C.paper), 'scale(2)')}<g transform="translate(40 -40)"><circle r="20" fill="${C.green}"/>${g(ICON.check(C.paper), 'scale(.8)')}</g></g>
      <g data-k="live"><rect x="-52" y="-20" width="104" height="40" rx="20" fill="${C.green}"/>${tx(0, 8, L('ui.live'), { size: 22, weight: 800, fill: C.paper, anchor: 'middle' })}</g>
      ${confettiMarkup('cf-pub', 22)}
      ${at(0, 0, 1, face('me'))}`,
    cam: [[0, 1, 180, 320], [0.4, 1, 180, 320], [0.9, 1.6, 300, 29], [1.7, 1.6, 300, 29], [2.1, 1, 180, 320]],
    draw(lt, root) {
      const p = P(root);
      $(root, 'pubbg').setAttribute('fill', lt > 1.3 ? C.green : C.blue);
      p('dim', { o: 0.5 * prog(lt, 2.0, 2.3) });
      p('globe', { x: 180, y: 270, s: back(prog(lt, 2.2, 2.7)), o: prog(lt, 2.2, 2.3) });
      ['r1', 'r2'].forEach((k, i) => {
        const f = lt > 2.5 ? ((lt - 2.5) / 1.2 + i * 0.5) % 1 : 0;
        const el = $(root, k);
        el.setAttribute('r', (54 + 60 * f).toFixed(1));
        el.setAttribute('opacity', lt > 2.5 ? (0.6 * (1 - f)).toFixed(3) : 0);
      });
      p('live', { x: 180, y: 360, s: back(prog(lt, 2.6, 2.95)), o: prog(lt, 2.6, 2.7) });
      confetti('cf-pub', 180, 270, lt, 2.4, 170);
      p('me', { x: 180, y: 460, s: 1.5 * back(prog(lt, 2.9, 3.3)), o: prog(lt, 2.9, 3.0) });
      mood(root, 'me', 'big');
    },
    hand: [[0.5, 240, 140], [1.2, 300, 29, true, 'publish'], [1.9, 300, 160]],
  };
}

// ---------------------------------------------------------------- 5 feed
function bizCard(theme = C.blue) {
  return `<rect x="-164" y="-150" width="328" height="300" rx="18" fill="${C.paper}" stroke="${C.line}"/>
    <path d="M-164 -80 V-132 A18 18 0 0 1 -146 -150 H146 A18 18 0 0 1 164 -132 V-80 Z" fill="${theme}"/>
    <rect x="-150" y="-104" width="48" height="48" rx="12" fill="${C.paper}" stroke="${C.line}"/>${at(-126, -80, 0.6, ICON.store(theme))}
    <g data-k="qr" transform="translate(-74 -80) scale(.8)">${GLYPH.qr(C.ink)}</g>
    ${tx(-74, -55, L('ui.scanMe'), { size: 9, weight: 800, fill: C.slate, anchor: 'middle' })}
    <rect x="20" y="-72" width="78" height="28" rx="14" fill="${C.paper}" stroke="${C.line}" stroke-width="2"/>${tx(59, -53, L('ui.message'), { size: 12, weight: 800, fill: C.blue, anchor: 'middle', fit: 66 })}
    <rect x="104" y="-72" width="52" height="28" rx="14" fill="${theme}"/>${tx(130, -53, L('ui.visit'), { size: 12, weight: 800, fill: C.paper, anchor: 'middle', fit: 44 })}
    ${tx(-150, -24, L('ui.name'), { size: 17, weight: 800 })}${tx(-150, -7, L('ui.line'), { size: 12, weight: 500, fill: C.slate })}
    <clipPath id="strip-clip"><rect x="-152" y="2" width="304" height="140" rx="10"/></clipPath>
    <g clip-path="url(#strip-clip)"><g data-k="strip">
      ${[0, 1, 2, 3, 4, 5].map((i) => `<g transform="translate(${-152 + i * 104} 6)">
        <rect width="96" height="134" rx="12" fill="${C.page}" stroke="${C.line}"/>
        <rect x="6" y="6" width="84" height="58" rx="9" fill="${[C.violetSubtle, C.blueSubtle, C.greenSubtle][i % 3]}"/>
        ${at(48, 35, 0.72, [ICON.dress(C.violet), ICON.cup(C.blue), ICON.basket(C.green)][i % 3])}
        ${tx(8, 82, L(`ui.items.${i % 3}`), { size: 13, weight: 800 })}${tx(8, 97, L(`ui.prices.${i % 3}`), { size: 11, weight: 800, fill: theme })}
        <rect x="8" y="104" width="80" height="24" rx="12" fill="${theme}"/>${tx(48, 120, L('ui.order'), { size: 12, weight: 800, fill: C.paper, anchor: 'middle' })}</g>`).join('')}
    </g></g>`;
}
function feed() {
  return {
    dur: 7, title: 'publish', step: 7,
    captions: [[0.2, 4.0, 'feed1'], [4.1, 7, 'feed2']], land: 'feed1',
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      <g data-k="o0"><rect x="16" y="-120" width="328" height="170" rx="18" fill="${C.paper}" stroke="${C.line}"/><rect x="16" y="-120" width="328" height="70" rx="18" fill="${C.greenSubtle}"/></g>
      <g data-k="o1"><rect x="16" y="474" width="328" height="200" rx="18" fill="${C.paper}" stroke="${C.line}"/><path d="M16 544 V492 A18 18 0 0 1 34 474 H326 A18 18 0 0 1 344 492 V544 Z" fill="${C.violetTint}"/>${tx(32, 570, 'Sara Bakery', { size: 16, weight: 800 })}</g>
      <g data-k="card">${bizCard(C.blue)}</g>
      <g data-k="site0">${site(C.blue)}</g>
      ${topbar('business', `<g data-k="bell">${ICON.bell(C.blue)}</g><g data-k="badge"><circle r="10" fill="${C.violet}"/>${tx(0, 4, '3', { size: 11, weight: 800, fill: C.paper, anchor: 'middle' })}</g>${[0, 1, 2].map((i) => `<g data-k="fol${i}"><circle r="12" fill="${[C.violetTint, C.blueTint, C.greenSubtle][i]}" stroke="${C.paper}" stroke-width="2"/>${g(GLYPH.heart(C.violet), 'scale(.4) translate(0 2)')}</g>`).join('')}`)}
      <g data-k="scanner">${window.ENGINE.phoneFrame(110, 200, `<rect width="110" height="200" fill="${C.ink}"/><rect x="20" y="50" width="70" height="70" rx="6" fill="none" stroke="${C.paper}" stroke-width="2" stroke-dasharray="10 6"/>
        <g data-k="scansite"><svg width="110" height="200" viewBox="0 0 360 640" preserveAspectRatio="xMidYMin slice">${site(C.blue)}</svg></g>`)}</g>
      <rect data-k="beam" x="-36" y="-2" width="72" height="4" rx="2" fill="${C.green}"/>
      <g data-k="scanok"><circle r="18" fill="${C.green}"/>${g(ICON.check(C.paper), 'scale(.8)')}</g>`,
    draw(lt, root) {
      const p = P(root);
      const sh = easeInOut(prog(lt, 0.3, 1.1));
      const s = lerp(1, 0.3, sh);
      p('site0', { x: lerp(0, 180 - s * 180, sh), y: lerp(0, 300 - s * 320, sh), s, o: 1 - prog(lt, 0.9, 1.15) });
      p('card', { x: 180, y: 300, s: back(prog(lt, 0.9, 1.4)), o: prog(lt, 0.9, 1.0) });
      p('o0', { y: lerp(-60, 0, easeOut(prog(lt, 1.2, 1.8))) + 72, o: prog(lt, 1.2, 1.4) });
      p('o1', { y: lerp(80, 0, easeOut(prog(lt, 1.2, 1.8))), o: prog(lt, 1.2, 1.4) });
      const n = Math.min(3, Math.max(0, (lt - 2.0) / 0.8));
      const step_ = Math.floor(n), frac = n - step_;
      $(root, 'strip').setAttribute('transform', `translate(${(-104 * (step_ + easeInOut(Math.min(1, frac / 0.55)))).toFixed(1)} 0)`);
      const ring = 1 - prog(lt, 3.0, 3.8);
      p('bell', { x: 322, y: 34, s: 0.6, r: lt > 3.0 ? 20 * Math.sin(2 * Math.PI * 5 * (lt - 3.0)) * ring : 0 });
      p('badge', { x: 334, y: 22, s: back(prog(lt, 3.2, 3.5)), o: prog(lt, 3.2, 3.3) });
      [0, 1, 2].forEach((i) => p(`fol${i}`, { x: 270 - i * 26, y: 34, s: back(prog(lt, 3.3 + 0.15 * i, 3.6 + 0.15 * i)), o: Math.min(prog(lt, 3.3 + 0.15 * i, 3.4 + 0.15 * i), 1 - prog(lt, 5.6, 6.0)) }));
      const sc = easeOut(prog(lt, 4.2, 4.8));
      p('scanner', { x: lerp(420, 270, sc), y: lerp(560, 470, sc), r: lerp(14, -6, sc), o: prog(lt, 4.2, 4.3) });
      const bm = prog(lt, 4.9, 5.7);
      p('beam', { x: 106, y: 220 + 40 * Math.abs(Math.sin(Math.PI * 2 * bm)), o: bm > 0 && bm < 1 ? 1 : 0 });
      p('scansite', { o: prog(lt, 5.7, 5.9) });
      p('scanok', { x: 300, y: 380, s: back(prog(lt, 5.9, 6.2)), o: prog(lt, 5.9, 6.0) });
    },
  };
}

// ---------------------------------------------------------------- 6 buyers
function buyers() {
  const B = { x: 95, y: 330 }, S = { x: 265, y: 330 }, w = 120, h = 240;
  const toShot = (ph, x, y) => ({ x: ph.x - w / 2 + x, y: ph.y - h / 2 + y });
  const order = toShot(B, 60, 179);
  const okBtn = toShot(S, 60, 200);
  return {
    dur: 10, title: 'buyers', step: 8,
    captions: [[0.2, 4.5, 'buy1'], [4.6, 7.4, 'buy2'], [7.5, 10, 'buy3']], land: 'buy2',
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      <g data-k="bph">${window.ENGINE.phoneFrame(w, h, `
        <circle cx="60" cy="26" r="16" fill="${C.blueTint}"/>${at(60, 26, 0.55, face('buyer', C.blueTint))}
        <rect x="10" y="50" width="100" height="80" rx="12" fill="${C.violetSubtle}"/>${at(60, 90, 1.1, ICON.dress(C.violet))}
        ${tx(12, 146, L('ui.items.0'), { size: 13, weight: 800 })}${tx(108, 146, L('ui.prices.0'), { size: 11, weight: 800, fill: C.blue, anchor: 'end' })}
        <g data-k="b-order"><rect x="12" y="164" width="96" height="30" rx="15" fill="${C.blue}"/>${tx(60, 184, L('ui.order'), { size: 13, weight: 800, fill: C.paper, anchor: 'middle' })}</g>
        <g data-k="b-done"><rect x="12" y="164" width="96" height="30" rx="15" fill="${C.green}"/>${tx(54, 184, L('ui.ordered'), { size: 12, weight: 800, fill: C.paper, anchor: 'middle', fit: 64 })}${at(96, 179, 0.4, ICON.check(C.paper, 6))}</g>
        <g data-k="b-coins">${[0, 1, 2].map((i) => at(36 + i * 24, 216, 0.55, ICON.coin())).join('')}</g>`)}</g>
      <g data-k="sph">${window.ENGINE.phoneFrame(w, h, `
        <circle cx="60" cy="26" r="16" fill="${C.violetTint}"/>${at(60, 26, 0.55, face('seller', C.violetTint))}
        ${at(96, 26, 0.4, ICON.store(C.violet))}
        <g data-k="s-msg"><rect x="8" y="52" width="104" height="38" rx="10" fill="${C.blueSubtle}"/><circle cx="24" cy="71" r="10" fill="${C.blueTint}"/>${tx(39, 68, L('ui.newMsg'), { size: 10.5, weight: 800, fill: C.blue, fit: 68 })}${bar(39, 75, 50, 6, C.line)}</g>
        <g data-k="s-order"><rect x="8" y="98" width="104" height="72" rx="10" fill="${C.page}" stroke="${C.line}"/><rect x="16" y="106" width="36" height="36" rx="8" fill="${C.violetSubtle}"/>${at(34, 124, 0.45, ICON.dress(C.violet))}
          ${tx(58, 118, L('ui.items.0'), { size: 11.5, weight: 800 })}${tx(58, 132, L('ui.prices.0'), { size: 10, weight: 800, fill: C.blue })}
          <g data-k="s-paid"><rect x="58" y="146" width="44" height="18" rx="9" fill="${C.green}"/>${tx(80, 159, L('ui.paid'), { size: 10, weight: 800, fill: C.paper, anchor: 'middle' })}</g></g>
        <g data-k="s-ok"><rect x="12" y="186" width="96" height="30" rx="15" fill="${C.green}"/>${tx(60, 206, L('ui.confirm'), { size: 13, weight: 800, fill: C.paper, anchor: 'middle', fit: 84 })}</g>
        <g data-k="s-done"><rect x="12" y="186" width="96" height="30" rx="15" fill="${C.greenSubtle}" stroke="${C.green}" stroke-width="2"/>${tx(52, 206, L('ui.done'), { size: 13, weight: 800, fill: C.green, anchor: 'middle' })}${at(86, 201, 0.4, ICON.check(C.green, 6))}</g>`)}</g>
      <path data-k="route" d="M${B.x + 40} 470 Q180 560 ${S.x - 40} 470" fill="none" stroke="${C.green}" stroke-width="3" stroke-dasharray="6 7"/>
      <g data-k="msgfly">${GLYPH.comment(C.blue)}</g>
      ${[0, 1, 2].map((i) => `<g data-k="coin${i}">${ICON.coin()}</g>`).join('')}
      ${confettiMarkup('cf-buy', 16)}`,
    draw(lt, root) {
      const p = P(root);
      p('bph', { x: lerp(60, B.x, easeOut(prog(lt, 0, 0.5))), y: B.y, o: prog(lt, 0, 0.3) });
      p('sph', { x: lerp(300, S.x, easeOut(prog(lt, 0.2, 0.7))), y: S.y, o: prog(lt, 0.2, 0.5) });
      p('b-order', { o: 1 - prog(lt, 1.3, 1.45) });
      p('b-done', { o: prog(lt, 1.3, 1.45) });
      const mf = prog(lt, 2.8, 3.6);
      const mp = arc({ x: B.x + 30, y: 250 }, { x: 180, y: 150 }, { x: S.x - 30, y: 250 }, easeInOut(mf));
      p('msgfly', { x: mp.x, y: mp.y, s: 1.1, o: mf > 0 && mf < 1 ? 1 : 0 });
      p('s-msg', { x: lerp(100, 0, easeOut(prog(lt, 3.6, 4.0))), o: prog(lt, 3.6, 3.7) });
      p('s-order', { o: prog(lt, 1.6, 1.9) });
      p('route', { o: window_(lt, 5.2, 5.5, 8.6, 9.0) });
      p('b-coins', { o: 1 - prog(lt, 5.5, 5.8) });
      [0, 1, 2].forEach((i) => {
        const t0 = 5.6 + 0.35 * i, f = prog(lt, t0, t0 + 1.0);
        const q = arc({ x: B.x - 24 + 24 * i, y: 436 }, { x: 180, y: 600 }, { x: S.x - 16 + 14 * i, y: 386 }, easeInOut(f));
        p(`coin${i}`, { x: q.x, y: q.y, s: lerp(1, 0.6, f), o: f > 0 && f < 1 ? 1 : 0 });
      });
      p('s-paid', { s: 1, o: prog(lt, 6.6, 6.9) });
      p('s-ok', { o: Math.min(prog(lt, 6.9, 7.1), 1 - prog(lt, 7.75, 7.9)) });
      p('s-done', { o: prog(lt, 7.75, 7.95) });
      confetti('cf-buy', S.x, 300, lt, 7.9, 120);
      mood(root, 'buyer', lt > 1.4 ? 'big' : 'smile');
      mood(root, 'seller', lt < 3.8 ? 'smile' : lt < 7.8 ? 'surprised' : 'big');
    },
    hand: [[0.6, 110, 470], [1.2, order.x, order.y, true, 'order'], [2.2, 150, 520], [7.5, okBtn.x, okBtn.y, true, 'confirm'], [8.3, 300, 560]],
  };
}

// ---------------------------------------------------------------- finale
function finale() {
  const orbit = [GLYPH.heart(C.paper), GLYPH.globe(C.paper), GLYPH.comment(C.paper), ICON.pin(C.paper), ICON.bag(C.paper), GLYPH.sparkle(C.paper)];
  const fills = [C.violet, C.blue, C.blue, C.blueDeep, C.green, C.violet];
  const toggle = (left) => `<rect x="-84" y="-17" width="168" height="34" rx="17" fill="${C.page}" stroke="${C.line}"/>
    <rect x="${left ? -82 : 2}" y="-15" width="80" height="30" rx="15" fill="${left ? C.violet : C.blue}"/>
    ${tx(-42, 5, L('ui.personal'), { size: 12, weight: 800, fill: left ? C.paper : C.slate, anchor: 'middle', fit: 72 })}
    ${tx(42, 5, L('ui.business'), { size: 12, weight: 800, fill: left ? C.slate : C.paper, anchor: 'middle', fit: 72 })}`;
  return {
    dur: 10, title: 'finale', step: 0,
    captions: [[0.2, 4.3, 'end1'], [4.4, 10, 'end2']], land: 'end2',
    markup: `<rect width="360" height="640" fill="${C.page}"/>
      <g data-k="card">
        <g data-k="front">
          <rect x="-140" y="-200" width="280" height="400" rx="22" fill="${C.paper}" stroke="${C.line}"/>
          <path d="M-140 -110 V-178 A22 22 0 0 1 -118 -200 H118 A22 22 0 0 1 140 -178 V-110 Z" fill="${C.violet}"/>
          <circle cx="0" cy="-110" r="38" fill="${C.paper}"/>${at(0, -110, 1.4, face('pf', C.violetTint))}
          ${tx(0, -52, L('ui.me'), { size: 19, weight: 800, anchor: 'middle' })}
          ${g(toggle(true), 'translate(0 -19)')}
          ${[0, 1, 2, 3, 4, 5].map((i) => photo(-124 + (i % 3) * 84, 10 + Math.floor(i / 3) * 88, 80, 80, [C.violetTint, C.blueTint, C.greenSubtle, C.blueSubtle, C.violetSubtle, C.blueTint][i], [C.violet, C.blue, C.green, C.blueDeep, C.violet, C.blue][i], 10)).join('')}
        </g>
        <g data-k="backside">
          <rect x="-140" y="-200" width="280" height="400" rx="22" fill="${C.paper}" stroke="${C.line}"/>
          <path d="M-140 -110 V-178 A22 22 0 0 1 -118 -200 H118 A22 22 0 0 1 140 -178 V-110 Z" fill="${C.blue}"/>
          <rect x="-36" y="-146" width="72" height="72" rx="18" fill="${C.paper}" stroke="${C.line}"/>${at(0, -110, 1.2, ICON.store(C.blue))}
          ${tx(0, -52, L('ui.name'), { size: 19, weight: 800, anchor: 'middle' })}
          ${g(toggle(false), 'translate(0 -19)')}
          <svg x="-124" y="8" width="248" height="176" viewBox="0 0 360 255" preserveAspectRatio="xMidYMin slice">${site(C.blue)}</svg>
        </g>
      </g>
      <g data-k="logo"><circle r="62" fill="${C.paper}"/><image href="${LOGO}" x="-56" y="-56" width="112" height="112"/></g>
      ${orbit.map((o, i) => `<g data-k="orb${i}"><circle r="26" fill="${fills[i]}"/>${g(o, 'scale(.7)')}</g>`).join('')}
      <g data-k="endName">${tx(180, 0, L('ui.app'), { size: 34, weight: 800, anchor: 'middle' })}</g>
      <g data-k="endTag">${tx(180, 0, L('ui.tagline1'), { size: 17, weight: 500, fill: C.slate, anchor: 'middle' })}${tx(180, 22, L('ui.tagline2'), { size: 17, weight: 500, fill: C.slate, anchor: 'middle' })}</g>
      <g data-k="endBtn"><rect x="-82" y="-26" width="164" height="52" rx="26" fill="${C.blue}"/>${tx(-10, 7, L('ui.startFree'), { size: 18, weight: 800, fill: C.paper, anchor: 'middle' })}${at(56, 0, 0.8, ICON.arrow(C.paper))}</g>`,
    draw(lt, root) {
      const p = P(root);
      const f1 = prog(lt, 1.4, 2.2), f2 = prog(lt, 3.2, 4.0);
      const sx = Math.abs(Math.cos(Math.PI * (f1 < 1 ? f1 : f2)));
      const showBack = f1 >= 0.5 && f2 < 0.5;
      const shrink = easeInOut(prog(lt, 4.4, 5.2));
      const card = $(root, 'card');
      card.setAttribute('transform', `translate(180 ${lerp(300, 320, shrink)}) scale(${(sx * lerp(1, 0.3, shrink)).toFixed(4)} ${lerp(1, 0.3, shrink).toFixed(4)})`);
      card.setAttribute('opacity', (1 - prog(lt, 4.8, 5.2)).toFixed(3));
      p('front', { o: showBack ? 0 : 1 });
      p('backside', { o: showBack ? 1 : 0 });
      mood(root, 'pf', 'big');
      // Logo with the app's parts circling it, then the end card.
      const up = easeInOut(prog(lt, 7.0, 7.6));
      p('logo', { x: 180, y: lerp(320, 210, up), s: back(prog(lt, 4.9, 5.5)) * lerp(1, 0.9, up), o: prog(lt, 4.9, 5.0) });
      const settle = 1 - easeOut(prog(lt, 5.2, 6.6));
      const gather = easeIn(prog(lt, 6.6, 7.1));
      orbit.forEach((o, i) => {
        const a = (i / orbit.length) * Math.PI * 2 - Math.PI / 2 + 2.2 * settle;
        const r = 124 * back(prog(lt, 5.1 + 0.12 * i, 5.6 + 0.12 * i)) * (1 - gather);
        p(`orb${i}`, { x: 180 + Math.cos(a) * r, y: 320 + Math.sin(a) * r, s: back(prog(lt, 5.1 + 0.12 * i, 5.5 + 0.12 * i)) * (1 - 0.6 * gather), o: Math.min(prog(lt, 5.1 + 0.12 * i, 5.2 + 0.12 * i), 1 - prog(lt, 6.9, 7.1)) });
      });
      p('endName', { y: lerp(330, 318, easeOut(prog(lt, 7.4, 7.9))), o: prog(lt, 7.4, 7.8) });
      p('endTag', { y: lerp(364, 352, easeOut(prog(lt, 7.7, 8.2))), o: prog(lt, 7.7, 8.1) });
      p('endBtn', { x: 180, y: 430, s: back(prog(lt, 8.1, 8.5)), o: prog(lt, 8.1, 8.2) });
    },
    hand: [[0.6, 230, 520], [1.2, 222, 281, true, 'switch'], [3.2, 138, 281, true], [3.9, 200, 560]],
  };
}

window.SHOTS = { intro, life, feedScroll, friendBiz, bizFeed, searchNear, compareHotels, start, pathA, pathB, fill, style, publish, feed, buyers, finale, parts: { site, retheme } };
})();
