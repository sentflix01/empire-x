# Implementation Plan: Profile Color Theme

## Overview

Introduce a shared `ProfileViewContext` that becomes the single source of truth for the active profile view (`"personal"` | `"business"`) and derived accent color tokens. Remove per-component local state copies, wire all consuming components to the context, and animate the cover gradient transition.

---

## Tasks

- [x] 1. Create `lib/ProfileViewContext.tsx` — context, token utility, and provider
  - [x] 1.1 Implement `getAccentTokens(view)` pure utility and `ProfileViewContext`
    - Define the `ActiveView`, `AccentTokens`, and `ProfileViewContextValue` TypeScript interfaces
    - Implement `getAccentTokens("personal")` returning blue tokens (`primary: "#2563EB"`, `gradientStart: "#3B82F6"`, `gradientEnd: "#2563EB"`, `gradientCss`, `bgClass: "bg-blue-50"`, `textClass: "text-blue-700"`, `darkBgClass: "dark:bg-blue-900/20"`, `darkTextClass: "dark:text-blue-300"`, `activeNavClass`, `activeTabClass: "bg-blue-500 text-white"`)
    - Implement `getAccentTokens("business")` returning amber tokens (`primary: "#D97706"`, gradient `#F59E0B→#D97706`, `bgClass: "bg-amber-50"`, `textClass: "text-amber-700"`, `darkBgClass: "dark:bg-amber-900/20"`, `darkTextClass: "dark:text-amber-700"`, `activeNavClass`, `activeTabClass: "bg-amber-500 text-white"`)
    - Create `ProfileViewContext` with default value using `"personal"` tokens (safe fallback for unmounted provider)
    - Implement `ProfileViewProvider`: initialize `activeView` from `sessionStorage` key `"empire_profile_view"`, fall back to `"personal"`; persist to `sessionStorage` on every `setActiveView` call
    - Derive and expose `isPersonal`, `isBusiness` convenience booleans
    - Export `useProfileView()` hook via `useContext(ProfileViewContext)`
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 1.2 Write unit tests for `getAccentTokens`
    - Assert personal tokens contain the exact hex values and Tailwind classes specified in Requirements 7.2
    - Assert business tokens contain the exact hex values and Tailwind classes specified in Requirements 7.3
    - Assert the function is pure: calling it twice with the same argument returns structurally equal objects
    - _Requirements: 7.4_

- [x] 2. Mount `ProfileViewProvider` in `app/(app)/layout.tsx`
  - [x] 2.1 Wrap `AppLayout` with `ProfileViewProvider` inside `RealModeProvider`
    - Import `ProfileViewProvider` from `@/lib/ProfileViewContext`
    - Nest `<ProfileViewProvider>` between `<RealModeProvider>` and `<AppLayout>` exactly as shown in the design
    - No other changes to this file
    - _Requirements: 1.1_

- [x] 3. Refactor `components/layout/AppLayout.tsx` to consume context
  - [x] 3.1 Replace local `profileView` state with `useProfileView()` context
    - Remove `const [profileView, setProfileView] = useState<'personal' | 'business'>('personal')`
    - Add `const { activeView, setActiveView, accentTokens, isPersonal } = useProfileView()` (import `useProfileView` from `@/lib/ProfileViewContext`)
    - Replace all occurrences of `profileView` with `activeView` and `setProfileView` with `setActiveView` throughout the file
    - _Requirements: 4.3, 4.4, 8.4_

  - [x] 3.2 Apply `accentTokens.activeNavClass` to the `NavLink` active highlight
    - In the `NavLink` component, replace the hardcoded string `"bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"` with `accentTokens.activeNavClass`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.3 Apply `accentTokens.primary` to desktop sidebar profile switch buttons
    - Personal button `backgroundColor`: use `isPersonal ? accentTokens.primary : 'hsl(var(--secondary))'`
    - Business button `backgroundColor`: use `!isPersonal ? accentTokens.primary : 'hsl(var(--secondary))'`
    - Button `onClick` handlers: call `setActiveView('personal')` / `setActiveView('business')` then navigate
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 3.4 Apply `accentTokens.primary` to collapsed sidebar toggle icon and mobile drawer switch buttons
    - Collapsed sidebar toggle icon: replace hardcoded `'hsl(var(--primary))'` / `'#d97706'` with `accentTokens.primary`
    - Mobile drawer Personal button `backgroundColor`: `isPersonal ? accentTokens.primary : 'hsl(var(--secondary))'`
    - Mobile drawer Business button `backgroundColor`: `!isPersonal ? accentTokens.primary : 'hsl(var(--secondary))'`
    - Mobile drawer button `onClick` handlers: call `setActiveView` then navigate then close drawer
    - _Requirements: 4.2, 4.4, 4.5, 4.6_

  - [ ]* 3.5 Write unit tests for `AppLayout` profile switch button rendering
    - Mock `useProfileView` to return `activeView: "personal"` and assert Personal button gets blue background, Business button gets secondary background
    - Mock `useProfileView` to return `activeView: "business"` and assert Business button gets `accentTokens.primary` (#D97706) background
    - _Requirements: 4.1, 4.2_

- [x] 4. Checkpoint — verify sidebar color theming compiles and renders correctly
  - Ensure all TypeScript errors are resolved in `ProfileViewContext.tsx`, `layout.tsx`, and `AppLayout.tsx`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Refactor `views/Profile.tsx` to consume context
  - [x] 5.1 Replace local `view` state with context alias and wire `handleFlip` to `setActiveView`
    - Remove `const [view, setView] = useState("personal")`
    - Add `const { activeView: view, setActiveView, accentTokens } = useProfileView()`
    - Rewrite `handleFlip` to call `setActiveView(view === "personal" ? "business" : "personal")` instead of the previous `setView` call
    - Update the `useEffect` that watches `viewParam` to call `setActiveView(viewParam)` so URL changes sync to context
    - _Requirements: 1.3, 1.4, 6.3, 8.1, 8.2, 8.5_

  - [x] 5.2 Add animated cover gradient transition
    - Add `transition-all duration-300` to the cover `<div>` className alongside the existing conditional gradient class
    - _Requirements: 6.1, 6.2, 6.4_

  - [ ]* 5.3 Write unit tests for `Profile.tsx` view sync
    - Render `Profile` inside a `ProfileViewProvider`; simulate clicking the Business toggle pill and assert `setActiveView("business")` is called
    - Set `?view=business` URL param and assert context `activeView` is updated to `"business"`
    - _Requirements: 1.3, 1.4, 8.5_

- [x] 6. Refactor `components/profile/PersonalProfile.tsx` to consume context
  - [x] 6.1 Replace hardcoded active tab class with `accentTokens.activeTabClass`
    - Import `useProfileView` from `@/lib/ProfileViewContext`
    - Add `const { accentTokens } = useProfileView()` inside the component
    - In the tab bar `{["posts", "about", "activity"].map(...)}` template literal, replace the hardcoded `"bg-amber-500 text-white"` with `accentTokens.activeTabClass`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.2 Write unit tests for `PersonalProfile` tab active class
    - Render with context `activeView: "personal"` and assert active tab receives `bg-blue-500 text-white`
    - Render with context `activeView: "business"` and assert active tab receives `bg-amber-500 text-white`
    - Assert the string `"bg-amber-500"` does NOT appear hardcoded in the active-tab branch
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 7. Final checkpoint — end-to-end integration verification
  - Ensure TypeScript compiles without errors across all five modified files
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- The design uses TypeScript/React; all code must be `.tsx` files following the existing codebase conventions
- `sessionStorage` (not `localStorage`) is used so the view selection resets between browser sessions — matching `RealModeContext` which uses `localStorage` for a persistent toggle
- `ProfileToggle.tsx` and `BusinessProfile.tsx` are explicitly out of scope — do not modify them
- The mobile bottom nav active color (`text-amber-600`) is intentionally not changed — it is a route-level indicator, not a profile-context indicator
- Each task references the specific requirement sub-clauses it satisfies for full traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "5.1"] },
    { "id": 4, "tasks": ["3.5", "5.2", "6.1"] },
    { "id": 5, "tasks": ["5.3", "6.2"] }
  ]
}
```
