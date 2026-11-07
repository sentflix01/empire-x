#!/usr/bin/env node
/**
 * One-off codemod (audit F-046): replace raw Tailwind palette classes
 * (bg-amber-500, text-slate-600, …) with the colour-system tokens defined in
 * app/globals.css. See docs/brand/COLOR_SYSTEM.md for the rules it applies.
 *
 *   node scripts/codemods/color-tokens.mjs            # dry run: report only
 *   node scripts/codemods/color-tokens.mjs --write    # rewrite files
 *
 * Mapping, by meaning:
 *   blue / sky / indigo / cyan            → primary
 *   violet / purple / fuchsia / pink      → brand-secondary
 *   green / emerald / teal / lime         → success
 *   red / rose                            → destructive
 *   amber / yellow / orange               → primary (buttons, active states),
 *       warning when the line is about a warning or pending state,
 *       rating for star ratings
 *   slate / gray / zinc / neutral / stone → foreground, muted-foreground,
 *       secondary, border, or inverse (dark panels)
 * Shades: 50–200 become the light tint (-subtle), 300–700 the colour itself,
 * 800+ text the darker text-on-tint (-subtle-foreground).
 * `dark:` palette classes are dropped: the tokens switch for dark mode.
 * Gradients between palette colours become one solid colour, as on
 * Facebook and LinkedIn; gradient text becomes plain coloured text.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DIRS = ['app', 'components', 'views', 'lib', 'hooks', 'store'];
const EXTS = new Set(['.ts', '.tsx']);
const WRITE = process.argv.includes('--write');

const HUES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const PROPS = 'bg|text|border|from|to|via|ring|fill|stroke|divide|outline|placeholder|shadow|decoration|caret|accent';
// Optional variant chain, property, optional side (border-l-), hue, shade, optional /opacity.
const CLASS_RE = new RegExp(`(?<![\\w-])((?:[\\w-]+(?:\\[[^\\]]*\\])?:)*)(${PROPS})-((?:[trblxy]|[se])-)?(${HUES})-(\\d{2,3})(\\/\\d{1,3})?(?![\\w-])`, 'g');

const FAMILY = {
  blue: 'primary', sky: 'primary', indigo: 'primary', cyan: 'primary',
  violet: 'brand-secondary', purple: 'brand-secondary', fuchsia: 'brand-secondary', pink: 'brand-secondary',
  green: 'success', emerald: 'success', teal: 'success', lime: 'success',
  red: 'destructive', rose: 'destructive',
  amber: 'amberish', yellow: 'amberish', orange: 'amberish',
  slate: 'neutral', gray: 'neutral', zinc: 'neutral', neutral: 'neutral', stone: 'neutral',
};
const WARN_RE = /pending|warn|expir|trial|caution|alert|attention|overdue|low[ _-]?stock|unverified|paused|awaiting|grace|suspend|limit/i;
const RATING_RE = /\bstar|rating/i;

function familyFor(hue, line) {
  const f = FAMILY[hue];
  if (f !== 'amberish') return f;
  if (RATING_RE.test(line)) return 'rating';
  if (WARN_RE.test(line)) return 'warning';
  return 'primary';
}

const isHoverish = (variants) => /(^|:)(hover|active|group-hover|focus|focus-visible|data-\[state=open\]|data-\[state=active\]|aria-selected):$/.test(variants);

/** Token class for one raw palette class, or '' to drop it. */
function mapClass(variants, prop, side, hue, shadeStr, opacity, line) {
  if (/(^|:)dark:/.test(variants)) return '';
  const shade = Number(shadeStr);
  const op = opacity ?? '';
  const sideP = side ?? '';
  let fam = familyFor(hue, line);

  if (fam === 'neutral') {
    switch (prop) {
      case 'text':
        if (shade >= 700) return `${variants}text-foreground${op}`;
        if (shade >= 400) return `${variants}text-muted-foreground${op}`;
        return `${variants}text-inverse-foreground/70`;
      case 'bg':
        if (shade <= 100) return `${variants}bg-secondary${op}`;
        if (shade <= 200) return `${variants}bg-muted${op}`;
        if (shade <= 400) return `${variants}bg-muted-foreground/30`;
        if (shade <= 700) return `${variants}bg-muted-foreground${op}`;
        return `${variants}bg-inverse${op}`;
      case 'border': case 'divide': case 'outline':
        return shade >= 600 ? `${variants}${prop}-${sideP}foreground/20` : `${variants}${prop}-${sideP}border${op}`;
      case 'ring': return `${variants}ring-border${op}`;
      case 'from': case 'via': case 'to':
        return shade >= 700 ? `${variants}${prop}-inverse${op}` : `${variants}${prop}-secondary${op}`;
      case 'shadow': return `${variants}shadow-foreground/10`;
      case 'placeholder': return `${variants}placeholder-muted-foreground`;
      default: return `${variants}${prop}-muted-foreground${op}`;
    }
  }

  if (fam === 'rating') {
    if (prop === 'bg') return shade <= 200 ? `${variants}bg-warning-subtle${op}` : `${variants}bg-rating${op}`;
    return `${variants}${prop}-${sideP}rating${op}`;
  }

  switch (prop) {
    case 'bg':
      if (shade <= 200) return `${variants}bg-${fam}-subtle${op}`;
      if (isHoverish(variants) && !op) return `${variants}bg-${fam}/90`;
      return `${variants}bg-${fam}${op}`;
    case 'text':
      if (shade <= 300) return `${variants}text-white/80`;
      if (shade >= 800) return `${variants}text-${fam}-subtle-foreground${op}`;
      return `${variants}text-${fam}${op}`;
    case 'border': case 'divide': case 'outline':
      return shade <= 300 ? `${variants}${prop}-${sideP}${fam}/30` : `${variants}${prop}-${sideP}${fam}${op}`;
    case 'ring':
      return shade <= 300 ? `${variants}ring-${fam}/30` : `${variants}ring-${fam}${op}`;
    case 'shadow':
      return `${variants}shadow-${fam}${op || '/20'}`;
    case 'from': case 'via': case 'to':
      return `${variants}${prop}-${fam}${shade <= 200 ? '-subtle' : ''}${op}`;
    default:
      return `${variants}${prop}-${fam}${op}`;
  }
}

/**
 * Gradients between palette colours become one solid colour (first stop's
 * family). Image overlays (to-transparent, from-black/60…) are left alone.
 */
function collapseGradients(line) {
  if (!/bg-gradient-to-\w+/.test(line)) return line;
  const stops = [...line.matchAll(new RegExp(`(?<![\\w-])((?:[\\w-]+:)*)(from|via|to)-([a-z]+)(?:-(\\d{2,3}))?(\\/\\d{1,3})?(?![\\w-])`, 'g'))];
  if (!stops.length) return line;
  // Only palette stops (and white tints of a palette gradient) qualify.
  if (stops.some((m) => !FAMILY[m[3]] && !['primary', 'accent'].includes(m[3]))) return line;
  const first = stops.find((m) => !m[1].includes('dark:') && !/(hover|group-hover):/.test(m[1]) && m[2] === 'from');
  if (!first) return line;
  const hue = first[3];
  const shade = Number(first[4] ?? 500);
  let fam = FAMILY[hue] ? familyFor(hue, line) : 'primary';
  if (hue === 'accent') fam = 'brand-secondary';
  let solid;
  if (fam === 'neutral') solid = shade >= 700 ? 'bg-inverse' : 'bg-secondary';
  else if (fam === 'rating') solid = 'bg-rating';
  else solid = shade <= 200 ? `bg-${fam}-subtle` : `bg-${fam}`;
  const hasHover = stops.some((m) => /(^|:)(hover|group-hover):$/.test(m[1]));

  let out = line;
  for (const m of stops) out = out.replace(m[0], GONE);
  out = out.replace(/(?<![\w-])((?:[\w-]+:)*)bg-gradient-to-\w+/, (_, v) => (v.includes('dark:') || /hover:/.test(v) ? GONE : solid + (hasHover ? ` hover:${solid}/90` : '')));
  // Gradient text: clip-text on a solid colour → plain coloured text.
  if (/\bbg-clip-text\b/.test(out) && /\btext-transparent\b/.test(out)) {
    out = out.replace(new RegExp(`\\b${solid.replace('/', '\\/')}\\b`), solid.replace(/^bg-/, 'text-').replace(/-subtle$/, ''))
      .replace(/\s*\bbg-clip-text\b/, '').replace(/\s*\btext-transparent\b/, '');
  }
  return out;
}

/** Removes the markers of deleted classes together with one adjacent space. */
const GONE = '\u0000';
const tidy = (line) => line.replace(/ \u0000|\u0000 ?/g, '');

const report = { files: 0, replaced: 0, dropped: 0, gradients: 0, byTarget: {} };
const review = [];

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', '.next'].includes(e.name)) walk(p, out); }
    else if (EXTS.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

const files = DIRS.flatMap((d) => (fs.existsSync(path.join(ROOT, d)) ? walk(path.join(ROOT, d), []) : []));
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  let changed = false;
  const outLines = lines.map((line, i) => {
    if (!CLASS_RE.test(line)) { CLASS_RE.lastIndex = 0; return line; }
    CLASS_RE.lastIndex = 0;
    let l = line;
    const collapsed = collapseGradients(l);
    if (collapsed !== l) { report.gradients += 1; l = collapsed; }
    l = l.replace(CLASS_RE, (m, variants, prop, side, hue, shade, opacity) => {
      const to = mapClass(variants, prop, side, hue, shade, opacity, line);
      if (to === '') { report.dropped += 1; return GONE; }
      report.replaced += 1;
      const key = to.replace(/^([\w-]+(\[[^\]]*\])?:)+/, '');
      report.byTarget[key] = (report.byTarget[key] ?? 0) + 1;
      if (/text-white\/80|inverse-foreground\/70/.test(to)) review.push(`${path.relative(ROOT, file)}:${i + 1}  ${m} → ${to}`);
      return to;
    });
    l = tidy(l);
    if (l !== line) changed = true;
    return l;
  });
  if (changed) {
    report.files += 1;
    if (WRITE) fs.writeFileSync(file, outLines.join('\n'));
  }
}

console.log(JSON.stringify({ ...report, byTarget: Object.fromEntries(Object.entries(report.byTarget).sort((a, b) => b[1] - a[1]).slice(0, 40)) }, null, 2));
console.log(`\nLight text shades mapped to white/inverse (${review.length}) — check each on its background:`);
for (const r of review) console.log('  ' + r);
