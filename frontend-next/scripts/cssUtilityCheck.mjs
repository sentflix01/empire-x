/**
 * Finds Tailwind utilities that the source uses but the built CSS does not
 * contain. Tailwind v4 silently drops a class whose theme token is not defined
 * (for example `bg-card` when `--color-card` is missing from `@theme`), which
 * is how the site lost its card, button and dialog styling for three months.
 *
 * Tailwind generates CSS for every valid candidate it finds anywhere in the
 * source, so a candidate that is in the source but not in the CSS is either a
 * missing token / plugin, a typo, or a non-class string (see ALLOWED).
 */

/** Utilities whose value comes from the theme or a plugin, so they break when a token is missing. */
const PREFIXES = [
  // colours
  'bg', 'text', 'border', 'border-[trblxyse]', 'ring', 'ring-offset', 'outline', 'fill', 'stroke',
  'from', 'via', 'to', 'divide', 'placeholder', 'caret', 'accent', 'decoration', 'shadow',
  // radius, fonts, animations
  'rounded', 'rounded-[trblse]{1,2}', 'font', 'animate',
  // tailwindcss-animate plugin
  'fade-(?:in|out)', 'zoom-(?:in|out)', 'spin-(?:in|out)', 'slide-in-from', 'slide-out-to',
];

const CANDIDATE = new RegExp(
  // optional variants (hover:, md:, data-[state=open]:, …), optional ! / - modifiers
  String.raw`(?<![\w\-/:.\[])(?:(?:[a-z0-9@-]+|[a-z-]*\[[^\]\s'"\x60]+\]):)*!?-?` +
  String.raw`((?:${PREFIXES.join('|')})(?:-[a-z0-9.]+)+(?:\/[0-9.]+)?)(?![\w\-\[(])`,
  'g',
);

/**
 * Strings that look like utilities but are not classes: CSS property names in
 * inline styles, i18n keys, element ids. Add an entry only with a reason.
 */
export const ALLOWED = new Set([
  'border-radius', 'border-color', 'border-width', 'border-style', 'border-box', 'border-bottom',
  'border-top', 'border-left', 'border-right', 'background-color', 'text-decoration', 'text-align',
  'text-transform', 'text-overflow', 'text-shadow', 'font-family', 'font-weight', 'font-size',
  'font-style', 'outline-offset', 'outline-color', 'outline-style', 'outline-width', 'box-shadow',
  'ring-offset-color', 'ring-offset-width', 'animate-presence',
  // Class inside the HTML that the Showroom builder exports (styled by that file's own CSS).
  'bg-light',
  // Prose in a code comment ("text-only stories").
  'text-only',
]);

/** Returns the utility part (no variants or modifiers) of every candidate in the source text. */
export function extractCandidates(source) {
  const found = new Set();
  for (const match of source.matchAll(CANDIDATE)) found.add(match[1]);
  return found;
}

/** Escapes a utility name the way it appears in a CSS selector (`bg-primary/90` → `bg-primary\/90`). */
export function cssEscape(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}

/** True when the built CSS has a selector for the utility, with or without variants. */
export function cssHasUtility(css, name) {
  const escaped = cssEscape(name);
  const pattern = new RegExp(String.raw`(?:\.|\\:)${escaped.replace(/[\\.]/g, (c) => `\\${c}`)}(?![\w-]|\\\/)`);
  return pattern.test(css);
}

/**
 * @param {Map<string, string>} sources file path → contents
 * @param {string} css all built CSS concatenated
 * @returns {{ name: string, files: string[] }[]} utilities missing from the CSS
 */
export function findMissingUtilities(sources, css, allowed = ALLOWED) {
  const usedIn = new Map();
  for (const [file, text] of sources) {
    for (const name of extractCandidates(text)) {
      if (allowed.has(name)) continue;
      if (!usedIn.has(name)) usedIn.set(name, []);
      usedIn.get(name).push(file);
    }
  }
  return [...usedIn]
    .filter(([name]) => !cssHasUtility(css, name))
    .map(([name, files]) => ({ name, files }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
