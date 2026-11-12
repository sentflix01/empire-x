/*
 * The story, one shot per step (app screen 360 x 640 units). Used by
 * guide.html (slow, title cards, all subtitles, callouts) and landing.html
 * (faster, one subtitle per shot). All words come from copy.js.
 *
 *   intro      many apps -> one Nodbusiness phone
 *   life    1  post a photo on the Personal feed; likes, comments, chat
 *   start   2  tap "Build your mini website"; pick a category; templates
 *   pathA   2  a ready-made template becomes a full site
 *   pathB   2  or start blank and add sections with +
 *   fill    3  photo, name, pasted link, opening hours, a product to sell
 *   style   4  pick a colour; the site on computer, tablet and phone
 *   publish 5  tap Publish
 *   feed    5  the site becomes a Business feed card; followers; QR scan
 *   buyers  6  a customer orders, messages and pays the seller directly
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

// ---------------------------------------------------------------- 2 start
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
    dur: 7, title: 'start', step: 2,
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
    dur: 5, title: 'start', step: 2,
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
    dur: 6, title: 'start', step: 2,
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
    dur: 19.5, title: 'fill', step: 3,
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
    dur: 8, title: 'style', step: 4,
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
    dur: 5, title: 'publish', step: 5,
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
    dur: 7, title: 'publish', step: 5,
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
    dur: 10, title: 'buyers', step: 6,
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

window.SHOTS = { intro, life, start, pathA, pathB, fill, style, publish, feed, buyers, finale, parts: { site, retheme } };
})();
