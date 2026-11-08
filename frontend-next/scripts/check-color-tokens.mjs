#!/usr/bin/env node
/**
 * Colour-system guard (audit F-046). Fails when app code uses a raw Tailwind
 * palette class (bg-amber-500, text-slate-600, …), an arbitrary colour class
 * (bg-[#f59e0b]) or a hex literal instead of a colour token (bg-primary,
 * text-muted-foreground, bg-success-subtle, lib/colorTokens.ts, …).
 * The tokens and the rules for choosing one are in docs/brand/COLOR_SYSTEM.md.
 *
 *   npm run check:colors
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIRS = ['app', 'components', 'views', 'lib', 'hooks', 'store', 'api'];
const RAW = /(?<![\w-])(?:[\w-]+(?:\[[^\]]*\])?:)*(?:bg|text|border|from|to|via|ring|fill|stroke|divide|outline|placeholder|shadow|decoration|caret|accent)-(?:[trblxyse]-)?(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d{1,3})?(?![\w-])/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', '.next'].includes(e.name)) walk(p, out); }
    else if (/\.(tsx?|jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

// Arbitrary colour classes (bg-[#f59e0b]) bypass the tokens too. Allowed:
// other companies' brand colours, which must stay exact.
const ARBITRARY = /(?<![\w-])(?:[\w-]+(?:\[[^\]]*\])?:)*(?:bg|text|border|from|to|via|ring|fill|stroke|shadow|outline|decoration|caret)-\[#([0-9a-fA-F]{3,8})\]/g;
const THIRD_PARTY_HEX = new Set(['2ca5e0', '1a94d2', /* Telegram */ '25d366', /* WhatsApp */]);

// Hex colour literals belong in the token module. These files hold colours
// that are not the app's own and are exempt:
const HEX_EXEMPT = new Set([
  // Colours a business chooses for its own showroom/profile (pickers, templates).
  'lib/builderSections.ts', 'lib/showroomTaxonomy.ts', 'lib/businessTemplates.ts', 'lib/layoutTemplates.ts',
  'lib/showroomTemplateSamples.ts', 'views/ShowroomCreate.tsx', 'components/showroom/CategoryWizard.tsx',
  'components/showroom/BuilderPreview.tsx', 'views/ProfileEdit.tsx', 'views/BusinessCreate.tsx',
  // Other companies' brand colours (Google sign-in, Telegram, WhatsApp).
  'lib/googleAuth.ts', 'components/GoogleIcon.tsx', 'app/(auth)/auth/google/callback/page.tsx',
  'components/settings/TelegramSettings.tsx', 'components/showroom/WhatsAppFloat.tsx',
  // The colour system itself and colour arithmetic.
  'lib/colorTokens.ts', 'lib/contrast.ts',
  // Selectors that match the chart library's own default colours.
  'components/ui/chart.tsx',
  // Rendered without the app's CSS (error page, share image, browser theme meta).
  'app/global-error.tsx', 'app/opengraph-image.tsx', 'app/layout.tsx',
]);
// Allowed anywhere: brand blue as the default business theme colour (stored
// data) and white. The logo is white on brand blue (HEX.primary).
const HEX_ALLOWED = new Set(['2563eb', 'ffffff', 'fff']);
const HEX = /(?<![\w&])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

// Layering (audit F-046): arbitrary z-index classes and numeric inline
// zIndex bypass the scale in app/globals.css (z-modal, z-toast…; Z in
// lib/colorTokens.ts).
const Z_ARBITRARY = /(?<![\w-])(?:[\w-]+(?:\[[^\]]*\])?:)*-?z-\[[^\]]+\]/g;
const Z_INLINE = /zIndex:\s*['"]?\d+/g;

const problems = [];
for (const file of DIRS.flatMap((d) => walk(path.join(ROOT, d)))) {
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const rel = path.relative(ROOT, file);
    for (const m of line.matchAll(RAW)) problems.push(`${rel}:${i + 1}  ${m[0]}`);
    for (const m of line.matchAll(ARBITRARY)) {
      if (!THIRD_PARTY_HEX.has(m[1].toLowerCase())) problems.push(`${rel}:${i + 1}  ${m[0]}`);
    }
    for (const m of line.matchAll(Z_ARBITRARY)) problems.push(`${rel}:${i + 1}  ${m[0]} (use a layer: z-modal, z-toast…)`);
    if (rel !== 'lib/colorTokens.ts' && !/\.test\.|__tests__/.test(rel)) {
      for (const m of line.matchAll(Z_INLINE)) problems.push(`${rel}:${i + 1}  ${m[0]} (use Z from lib/colorTokens.ts)`);
    }
    if (!HEX_EXEMPT.has(rel) && !/\.test\.|__tests__/.test(rel)) {
      for (const m of line.matchAll(HEX)) {
        if (!HEX_ALLOWED.has(m[1].toLowerCase()) && !THIRD_PARTY_HEX.has(m[1].toLowerCase())) problems.push(`${rel}:${i + 1}  ${m[0]} (use lib/colorTokens.ts)`);
      }
    }
  });
}

if (problems.length) {
  console.error(`check:colors: ${problems.length} problem(s). Use a design token instead (docs/brand/COLOR_SYSTEM.md):`);
  for (const p of problems.slice(0, 50)) console.error('  ' + p);
  if (problems.length > 50) console.error(`  … and ${problems.length - 50} more`);
  process.exit(1);
}
console.log('check:colors: every colour and layer comes from a design token.');
