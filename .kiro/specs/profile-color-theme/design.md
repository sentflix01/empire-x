# Technical Design Document

## Feature: Profile Color Theme

---

## Overview

This design implements a globally consistent, profile-context-aware color system. When the active view is `"personal"`, every accent color in the UI renders in Blue. When the active view is `"business"`, every accent color shifts to Gold/Amber. A shared React context (`ProfileViewContext`) is the single authoritative source of the active view, replacing the current disconnected per-component local state.

---

## Architecture

### Design Pattern: Shared React Context + Color Token Utility

The solution follows the same pattern already used in this codebase by `RealModeContext` and `AuthContext`:

1. A new context file `lib/ProfileViewContext.tsx` stores the `activeView` and exposes a `setActiveView` setter plus a derived `accentTokens` object.
2. The context provider is mounted in `app/(app)/layout.tsx`, wrapping `AppLayout` — exactly where `RealModeProvider` already sits.
3. All consuming components (`AppLayout`, `Profile.tsx`, `PersonalProfile.tsx`) read from this context instead of maintaining their own `view`/`profileView` local state.
4. A pure utility function `getAccentTokens(view)` defined inside the context file provides all color values. Components never hardcode color strings.

No new third-party libraries are needed. No backend changes are required.

---

## Component & File Changes

### 1. New File — `lib/ProfileViewContext.tsx`

**Responsibility:** Provide global active view state and derived accent tokens.

**Interface:**

```ts
type ActiveView = "personal" | "business";

interface AccentTokens {
  primary: string;          // CSS hex — used in style={{ color/backgroundColor }}
  gradientStart: string;    // CSS hex
  gradientEnd: string;      // CSS hex
  gradientCss: string;      // Full linear-gradient() string for style={}
  bgClass: string;          // Tailwind class e.g. "bg-blue-50"
  textClass: string;        // Tailwind class e.g. "text-blue-700"
  darkBgClass: string;      // Tailwind class e.g. "dark:bg-blue-900/20"
  darkTextClass: string;    // Tailwind class e.g. "dark:text-blue-300"
  activeNavClass: string;   // Full composed Tailwind string for active NavLink
  activeTabClass: string;   // Full composed Tailwind string for active tab button
}

interface ProfileViewContextValue {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  accentTokens: AccentTokens;
  isPersonal: boolean;
  isBusiness: boolean;
}
```

**`getAccentTokens` — pure utility (defined in same file):**

```ts
function getAccentTokens(view: ActiveView): AccentTokens {
  if (view === "personal") {
    return {
      primary: "#2563EB",
      gradientStart: "#3B82F6",
      gradientEnd: "#2563EB",
      gradientCss: "linear-gradient(135deg, #3B82F6, #2563EB)",
      bgClass: "bg-blue-50",
      textClass: "text-blue-700",
      darkBgClass: "dark:bg-blue-900/20",
      darkTextClass: "dark:text-blue-300",
      activeNavClass: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
      activeTabClass: "bg-blue-500 text-white",
    };
  }
  return {
    primary: "#D97706",
    gradientStart: "#F59E0B",
    gradientEnd: "#D97706",
    gradientCss: "linear-gradient(135deg, #F59E0B, #D97706)",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    darkBgClass: "dark:bg-amber-900/20",
    darkTextClass: "dark:text-amber-700",
    activeNavClass: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-700",
    activeTabClass: "bg-amber-500 text-white",
  };
}
```

**Provider behaviour:**
- Initialises from `sessionStorage` key `"empire_profile_view"` so the selection persists across navigations within the same browser tab.
- Falls back to `"personal"` if nothing is stored.
- On `setActiveView`, persists to `sessionStorage` immediately.
- Exposes convenience booleans `isPersonal` and `isBusiness` to simplify conditional rendering.

**Fallback (context not mounted):** The context default value uses `"personal"` tokens so consuming components never throw if the provider is absent.

---

### 2. Modified File — `app/(app)/layout.tsx`

Mount `ProfileViewProvider` inside the existing `RealModeProvider`:

```tsx
export default function AuthenticatedLayout({ children }) {
  return (
    <RealModeProvider>
      <ProfileViewProvider>
        <AppLayout>{children}</AppLayout>
      </ProfileViewProvider>
    </RealModeProvider>
  );
}
```

No other changes to this file.

---

### 3. Modified File — `components/layout/AppLayout.tsx`

**Remove:** `const [profileView, setProfileView] = useState<'personal' | 'business'>('personal');`

**Add:** `const { activeView, setActiveView, accentTokens, isPersonal } = useProfileView();`

**`NavLink` component — active highlight driven by `accentTokens`:**

Before:
```tsx
isActive(path)
  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
```

After:
```tsx
isActive(path)
  ? accentTokens.activeNavClass
```

**Desktop sidebar profile switch buttons:**

Before:
```tsx
backgroundColor: profileView === 'personal' ? 'hsl(var(--primary))' : ...
```

After:
```tsx
backgroundColor: isPersonal ? accentTokens.primary : 'hsl(var(--secondary))'
// Business button:
backgroundColor: !isPersonal ? accentTokens.primary : 'hsl(var(--secondary))'
```

Each button calls `setActiveView('personal')` or `setActiveView('business')` respectively, then navigates to `/profile?view=personal` or `/profile?view=business`.

**Mobile drawer profile switch buttons:** Same pattern — replaces `profileView` local state with context.

**Collapsed sidebar toggle icon:** Uses `accentTokens.primary` for the icon `color` style instead of the current hardcoded `'hsl(var(--primary))'` / `'#d97706'`.

**Mobile bottom nav active state:** Currently uses `text-amber-600` hardcoded for active items. These are route-level active indicators (not profile-context indicators) so they are **not changed** — only profile-context colors are themed.

---

### 4. Modified File — `views/Profile.tsx`

**Remove:** `const [view, setView] = useState("personal");`

**Add:** `const { activeView: view, setActiveView, accentTokens } = useProfileView();`

The local `view` variable is aliased from `activeView` for minimal diff — all existing uses of `view` continue to work.

**`handleFlip` function** — instead of `setView(v => ...)`, calls `setActiveView(view === "personal" ? "business" : "personal")`.

**Cover gradient transition** — add `transition-all duration-300` to the cover `<div>` so the gradient switch animates:

```tsx
<div
  className={`h-28 relative transition-all duration-300 ${
    view === "business"
      ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600"
      : "bg-empire-gradient"
  }`}
>
```

**Profile toggle buttons on cover** — already have correct colors; no functional change needed. They now call `setActiveView` instead of the removed local setter.

**`useEffect` for `viewParam` sync** — updated to call `setActiveView(viewParam)` so URL changes update the shared context.

---

### 5. Modified File — `components/profile/PersonalProfile.tsx`

**Add:** `const { accentTokens } = useProfileView();`

**Tab active class** — change from:
```tsx
tab === t ? "bg-amber-500 text-white"
```
To:
```tsx
tab === t ? accentTokens.activeTabClass
```

This single change makes the active tab blue on personal and amber on business.

No other changes to `PersonalProfile.tsx`.

---

### 6. No Changes to `components/profile/ProfileToggle.tsx`

`ProfileToggle` already renders the correct blue/gold gradient for each pill based on the `view` prop it receives. The prop is passed from `Profile.tsx` which now reads from context — so the toggle is correct without modification.

If `ProfileToggle` is ever used standalone in `AppLayout`, it would need to read from context directly, but currently it is only rendered inside `Profile.tsx`.

---

### 7. No Changes to `components/profile/BusinessProfile.tsx`

`BusinessProfile` uses `biz.business_theme_color` (a per-business color, not a profile-context color) for its internal styling. This is intentional and should not be overridden by the profile context accent system.

---

## Data Flow Diagram

```
sessionStorage "empire_profile_view"
        │
        ▼
ProfileViewProvider (lib/ProfileViewContext.tsx)
        │
        ├──── activeView ──────────────────────────────────────────────┐
        │                                                              │
        ▼                                                              ▼
AppLayout.tsx                                               Profile.tsx  (views/)
  • NavLink activeNavClass                                    • Cover gradient class
  • Sidebar switch buttons                                    • handleFlip → setActiveView
  • Mobile drawer switch buttons                             │
  • Collapsed toggle icon color                              ▼
                                                   PersonalProfile.tsx
                                                     • activeTabClass on tabs
```

---

## State Synchronization

Because all components read from the same `ProfileViewContext`, there is no sync problem:

- User clicks Business in the sidebar → `setActiveView("business")` called → context updates → all consumers re-render in the same React commit.
- User clicks Personal toggle on the profile cover → same call path.
- URL `?view=` param → `Profile.tsx` `useEffect` calls `setActiveView` when URL param changes (browser back/forward).
- `sessionStorage` ensures the selection survives navigation to other pages and back.

---

## File Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `lib/ProfileViewContext.tsx` | **New** | Context + `getAccentTokens` utility |
| `app/(app)/layout.tsx` | **Modify** | Mount `ProfileViewProvider` |
| `components/layout/AppLayout.tsx` | **Modify** | Replace local `profileView` state with context; apply `accentTokens` to NavLink and switch buttons |
| `views/Profile.tsx` | **Modify** | Replace local `view` state with context; animate cover gradient |
| `components/profile/PersonalProfile.tsx` | **Modify** | Replace hardcoded `bg-amber-500` tab class with `accentTokens.activeTabClass` |
| `components/profile/ProfileToggle.tsx` | **No change** | Already correct; receives `view` prop from Profile.tsx |
| `components/profile/BusinessProfile.tsx` | **No change** | Uses per-business theme color, not profile context accent |

---

## Non-Goals

- Changing the mobile bottom nav active color (those are route-level, not profile-context indicators).
- Changing the `bg-empire-gradient` app branding in the header/logo area.
- Theming any pages outside the profile context (feed, marketplace, etc.) — the context only signals which profile the user considers active.
