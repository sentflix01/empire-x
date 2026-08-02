# Implementation Plan

## Overview

This plan follows the exploratory bugfix workflow for the LinkedIn profile edit crash fix. The six un-suffixed icon references (`Twitter`, `Instagram`, `Facebook`, `Youtube` in the Personal tab; `Twitter`, `Facebook` in the Business tab) in `ProfileEdit.tsx` cause a `ReferenceError` crash. Tasks are ordered: explore the bug with a failing test → lock down preservation baseline → apply the fix → validate both test suites pass.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Undefined Icon References Crash ProfileEdit
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the `ReferenceError` crash
  - **Scoped PBT Approach**: The bug is deterministic (same six identifiers always undefined), so scope the property to the concrete failing render cases to ensure reproducibility
  - Create test file `frontend-next/views/__tests__/ProfileEdit.bugCondition.test.tsx`
  - Mock all external dependencies used by `ProfileEdit` (`@/api/auth`, `@/api/entities`, `next/navigation`, `@/lib/push`, `sonner`, `@/components/profile/VerificationRequest`, `@/components/feed/TickerBar`, `@/components/ui/ImageUpload`, `@/components/profile/TemplateCard`, `@/lib/businessTemplates`)
  - Use `fast-check` to generate arbitrary render contexts (varying `tab` — `'personal' | 'business'`) and assert the component mounts without throwing a `ReferenceError`
  - Test 1 — Personal tab render: mount `ProfileEdit` with the personal tab active (default); assert no error is thrown and the Social Links section is present in the DOM
  - Test 2 — Business tab render: mount `ProfileEdit`, click the Business tab; assert no error is thrown and the business social-links section is present in the DOM
  - Test 3 — Icon reference validity: assert that the `icon` property in each entry of both social-link arrays resolves to a non-`undefined`, callable React component (not `undefined`, not `null`)
  - Test 4 — Property: `fc.property(fc.constantFrom('personal', 'business'), tab => { /* render with that tab, assert no ReferenceError */ })`
  - Run test suite on **UNFIXED** code: `cd frontend-next && npx vitest --run views/__tests__/ProfileEdit.bugCondition.test.tsx`
  - **EXPECTED OUTCOME**: Tests FAIL with `ReferenceError: Twitter is not defined` (or `Instagram`, `Facebook`, `Youtube`, or `Linkedin` depending on evaluation order) — this is correct and proves the bug exists
  - Document the exact counterexample (e.g., `"tab='personal' → ReferenceError: Twitter is not defined"`)
  - Mark task complete when test is written, run, and the failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - All Non-Social-Icon Render Paths Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run the UNFIXED code with non-buggy inputs and observe actual output before writing assertions
  - **Non-buggy inputs** are render paths that do NOT evaluate the six un-suffixed icon identifiers (e.g., sections like Basic Information, Contact & Location, Skills, Experience, Education, push-notification toggle, save buttons)
  - Create test file `frontend-next/views/__tests__/ProfileEdit.preservation.test.tsx`
  - Mock all external dependencies (same mocks as task 1)
  - Observe on UNFIXED code: Basic Information section renders with name/headline/bio inputs → record that 3 specific inputs are present
  - Observe on UNFIXED code: Contact & Location section renders with location/phone/website inputs → record that 3 inputs are present
  - Observe on UNFIXED code: Save button is disabled when `display_name` is empty, enabled when non-empty → record this guard
  - Observe on UNFIXED code: Business tab sections (Business Information, Contact Information, Brand Color) render when tab is manually forced without triggering the social array (render partial tree) → record DOM structure
  - Write property-based test using `fast-check`: generate random `personal` state objects (arbitrary strings for `display_name`, `bio`, `headline`, `location`, `phone`, `website`); for each, assert that the Basic Information and Contact & Location sections render the correct number of inputs with the correct values
  - Write property-based test using `fast-check`: generate random `display_name` values (empty string vs non-empty string) and assert the Save Profile button `disabled` attribute matches `display_name === ''`
  - Write unit test: assert TagListEditor, EntryListEditor, CertListEditor sub-components render and respond to add/remove interactions correctly
  - Write unit test: assert `Section` component toggles open/closed on header click
  - Run tests on **UNFIXED** code: `cd frontend-next && npx vitest --run views/__tests__/ProfileEdit.preservation.test.tsx`
  - **EXPECTED OUTCOME**: Tests PASS on unfixed code (these paths do not touch the buggy icon references) — this confirms baseline behavior to preserve
  - Mark task complete when tests are written, run, and confirmed passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix undefined icon references in ProfileEdit.tsx

  - [x] 3.1 Rename the four un-suffixed icon references in the Personal tab Social Links array
    - File: `frontend-next/views/ProfileEdit.tsx`
    - Location: Personal tab — Social Links `Section`, inline array literal (approximately lines 455–462)
    - Change `icon: Twitter` → `icon: TwitterIcon`
    - Change `icon: Instagram` → `icon: InstagramIcon`
    - Change `icon: Facebook` → `icon: FacebookIcon`
    - Change `icon: Youtube` → `icon: YoutubeIcon`
    - Do NOT touch the `icon: LinkedinIcon` entry — it is already correct
    - _Bug_Condition: isBugCondition(renderContext) — any render that evaluates `Twitter`, `Instagram`, `Facebook`, or `Youtube` as JavaScript identifiers in ProfileEdit (these are undeclared, causing ReferenceError)_
    - _Expected_Behavior: each icon property in the social-links array resolves to a declared, non-`undefined` React component (`TwitterIcon = AtSign`, `InstagramIcon = Share2`, `FacebookIcon = Rss`, `YoutubeIcon = ExternalLink`) and the page renders to completion without error_
    - _Preservation: all code paths not involving the six corrected icon references must produce output identical to the original; specifically `LinkedinIcon` in both arrays must not be touched_
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 3.2 Rename the two un-suffixed icon references in the Business tab Social & Online Presence array
    - File: `frontend-next/views/ProfileEdit.tsx`
    - Location: Business tab — Social & Online Presence `Section`, inline array literal (approximately lines 695–699)
    - Change `icon: Twitter` → `icon: TwitterIcon`
    - Change `icon: Facebook` → `icon: FacebookIcon`
    - Do NOT touch the `icon: LinkedinIcon` entry — it is already correct
    - _Bug_Condition: same as 3.1 — `Twitter` and `Facebook` are undeclared identifiers_
    - _Expected_Behavior: business social-links section renders all three rows (`LinkedinIcon`, `TwitterIcon`, `FacebookIcon`) without error_
    - _Preservation: all other business-tab sections (Business Information, Contact, Services, Certifications, Awards, Brand Color, save button) must remain byte-for-byte identical_
    - _Requirements: 2.3, 2.4_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Undefined Icon References Resolved
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (no ReferenceError, social-links sections present in DOM, all icon references non-undefined)
    - Run: `cd frontend-next && npx vitest --run views/__tests__/ProfileEdit.bugCondition.test.tsx`
    - **EXPECTED OUTCOME**: All tests PASS — confirms the bug is fixed
    - If any test still fails, double-check that all six references have been renamed (re-read the table in the design doc) before making further changes
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - All Non-Social-Icon Render Paths Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run: `cd frontend-next && npx vitest --run views/__tests__/ProfileEdit.preservation.test.tsx`
    - **EXPECTED OUTCOME**: All tests PASS — confirms no regressions introduced by the rename
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite for the affected files: `cd frontend-next && npx vitest --run views/__tests__/`
  - All tests from task 1 (bug condition) and task 2 (preservation) must be green
  - Confirm no TypeScript compiler errors: `cd frontend-next && npx tsc --noEmit`
  - Ask the user if any questions arise or if additional test coverage is desired

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3.1", "3.2"] },
    { "wave": 4, "tasks": ["3.3", "3.4"] },
    { "wave": 5, "tasks": ["4"] }
  ]
}
```

## Notes

- The test framework is **Vitest** + **fast-check** (PBT) + **@testing-library/react** (already installed in `frontend-next/package.json`).
- Run all test commands from the `frontend-next/` directory.
- The fix is purely a rename — no logic, state, or API changes. If a test fails after the fix, re-verify all six icon references have been updated (see the table in `design.md`).
- `LinkedinIcon` is already correct in both arrays and must NOT be changed.
