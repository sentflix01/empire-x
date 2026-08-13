# v2.1 — Accessibility & Internationalization

> **Theme:** Inclusion
> **Goal:** Halehame is usable by everyone — people with visual impairments, motor disabilities, and those who prefer Amharic over English. WCAG 2.1 Level AA compliance and full Amharic translation.

---

## Why This Version

Ethiopia has 120+ million people. Amharic is the working language of business and government. An app that only works well in English excludes the majority of potential users. Accessibility expands the user base and is legally required in many markets.

---

## Scope

| Section | File |
|---------|------|
| WCAG 2.1 AA audit | [audit.md](./wcag-audit/audit.md) · [tasks.md](./wcag-audit/tasks.md) |
| Keyboard navigation | [audit.md](./keyboard-nav/audit.md) · [tasks.md](./keyboard-nav/tasks.md) |
| Screen reader support | [audit.md](./screen-reader/audit.md) · [tasks.md](./screen-reader/tasks.md) |
| Color contrast | [audit.md](./color-contrast/audit.md) · [tasks.md](./color-contrast/tasks.md) |
| Amharic translation | [audit.md](./amharic/audit.md) · [tasks.md](./amharic/tasks.md) |
| Language switcher | [audit.md](./language-switcher/audit.md) · [tasks.md](./language-switcher/tasks.md) |

---

## Success Criteria

**Accessibility (WCAG 2.1 AA)**
- [ ] All images have `alt` text (empty `alt=""` for decorative)
- [ ] All form inputs have associated `<label>` elements
- [ ] All interactive elements reachable and operable via keyboard only
- [ ] Focus ring visible on all focusable elements
- [ ] Focus management: modals trap focus, focus returns on close
- [ ] Color contrast: 4.5:1 for normal text, 3:1 for large text
- [ ] No information conveyed by color alone (use icon + color)
- [ ] All dynamic content changes announced to screen readers via `aria-live`
- [ ] Skip navigation link at top of each page
- [ ] Motion respects `prefers-reduced-motion`

**Internationalization**
- [ ] All UI strings extracted to `locales/en.json` and `locales/am.json`
- [ ] Language detection: browser language → user preference → default (English)
- [ ] Language switcher in settings and onboarding
- [ ] Numbers formatted correctly for locale (ETB currency)
- [ ] Date/time formatted for Ethiopian locale
- [ ] Amharic strings reviewed by native speaker before release
- [ ] RTL layout not required (Amharic is LTR)

---

## Dependencies

- Frontend: i18next (already configured), react-i18next (exists)
- Content: Amharic translation (needs native speaker review)
- Tools: axe-core for automated accessibility testing
