# Accessibility statement

**Owner:** Project owner · **Last reviewed:** 2026-11-07 · **Source of truth:** the in-app page

The public statement is the **Accessibility** tab of the legal page
(`/service-agreement?tab=accessibility`, `frontend-next/views/ServiceAgreement.tsx`,
`AccessibilityContent`). Edit it there; this file records how it is kept up to date.

- **Target:** WCAG 2.2 level AA (also the basis of EN 301 549 V3.2.1 / V4.1.1).
- **Status:** partially conformant.
- **Evidence:** November 2026 audit, `note/2026-11-05-international-audit/` (axe-core 4.10.3
  over 30 page states, plus keyboard, 320 px reflow, forced colours, dark mode and reduced
  motion; findings F-035, F-041 to F-044).
- **Contact:** the shared inbox in `frontend-next/lib/legalIdentity.ts` (`CONTACT_EMAIL`).

## When to update it

- After an accessibility test covers more pages, or a known limitation is fixed.
- When the contact inbox changes (it follows `CONTACT_EMAIL` automatically).
- At least once a year: re-run the scan (`note/2026-11-05-international-audit/scripts/browser/a11y-scan.cjs`)
  and change the date in section 5 of the in-app statement.
