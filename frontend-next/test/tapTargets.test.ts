/**
 * Touch targets without deformed controls (owner, 14 Nov 2026). A global
 * `button { min-height: 44px }` stretched every small control on phones and
 * tablets (switches into blobs, round buttons into ovals). Hit areas are
 * enlarged invisibly with .tap-target instead. Real-browser check:
 * note/2026-11-14-showroom-audit/controls-scan.mjs.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const css = read('app/globals.css');

describe('touch targets', () => {
  it('no stylesheet rule forces a minimum height on every button', () => {
    // Any selector list containing a bare `button` with min-height.
    const blanket = /(^|[,{}\s])button\s*(,[^{]*)?\{[^}]*min-height/m;
    expect(css).not.toMatch(blanket);
  });

  it('.tap-target adds an invisible hit area of at least 44 px without changing the box', () => {
    expect(css).toMatch(/\.tap-target::after\s*\{[^}]*width:\s*max\(100%,\s*44px\)[^}]*height:\s*max\(100%,\s*44px\)/);
    expect(css).not.toMatch(/\.tap-target\s*\{[^}]*(min-height|min-width|padding)/);
  });

  it('the shared small controls use it', () => {
    expect(read('components/ui/switch.tsx')).toContain('tap-target');
    expect(read('components/ui/checkbox.tsx')).toContain('tap-target');
    expect(read('components/ui/radio-group.tsx')).toContain('tap-target');
    expect(read('components/ui/button.tsx')).toMatch(/sm: "tap-target/);
    expect(read('components/ui/button.tsx')).toMatch(/icon: "tap-target/);
  });

  it('floating launchers step aside while a modal dialog is open (they covered dialog buttons on phones)', () => {
    expect(css).toMatch(/body:has\(\[aria-modal="true"\]\)\s*\[data-floating-launcher\]\s*\{\s*display:\s*none/);
    expect(read('components/AiAssistant.tsx').match(/data-floating-launcher/g)).toHaveLength(2);
  });

  it('toast text colours meet AA in the light theme', () => {
    expect(css).toMatch(/html \[data-sonner-toaster\]\[data-sonner-theme="light"\]\s*\{[^}]*--error-text:\s*hsl\(360, 100%, 38%\)/);
  });

  it('the Slider gives its name to the thumb (role="slider"), not the root', () => {
    expect(read('components/ui/slider.tsx')).toMatch(/<SliderPrimitive\.Thumb\s+aria-label=\{ariaLabel\}/);
  });

  it('primary buttons darken on hover instead of fading (white text stays AA)', () => {
    expect(css).toMatch(/--primary-hover:\s*224 76% 48%/);
    expect(read('components/ui/button.tsx')).toContain('hover:bg-primary-hover');
  });
});
