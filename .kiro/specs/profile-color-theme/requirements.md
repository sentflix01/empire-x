# Requirements Document

## Introduction

The Profile Color Theme feature introduces a consistent, profile-context-aware color system across the entire application UI. When the user is viewing their Personal profile context, all accent colors in the interface render in Blue. When the user switches to Business profile context, all accent colors shift to Gold/Amber. This provides a clear and immediate visual signal of which profile context is currently active, replacing the current state where colors are hardcoded or inconsistently applied across components.

The feature requires a shared profile-context state (via React Context or URL search params) so that all UI components — the navigation sidebar, mobile drawer, active nav link highlights, profile tab indicators, toggle pills, and header cover gradients — can react consistently to the active profile mode.

## Glossary

- **Profile_Color_System**: The feature responsible for computing and distributing the active accent color palette based on the current profile context.
- **Profile_Context**: A React context provider that stores and exposes the active profile view (`"personal"` | `"business"`) and derived color tokens to consuming components.
- **Active_View**: The current profile mode selected by the user — either `"personal"` or `"business"`.
- **Accent_Color_Blue**: The blue color palette (primary: `#2563EB`, light bg: `bg-blue-50`, text: `text-blue-700`, dark: `dark:bg-blue-900/20 dark:text-blue-300`) applied when Active_View is `"personal"`.
- **Accent_Color_Gold**: The amber/gold color palette (primary: `#D97706`, gradient: `#F59E0B→#D97706`, light bg: `bg-amber-50`, text: `text-amber-700`) applied when Active_View is `"business"`.
- **NavLink**: The navigation link component in the sidebar of `AppLayout.tsx` that highlights the active route.
- **ProfileToggle**: The `ProfileToggle.tsx` pill component that lets users switch between Personal and Business views.
- **PersonalProfile_Tabs**: The `posts`, `about`, and `activity` tab bar inside `PersonalProfile.tsx`.
- **Profile_Header_Cover**: The cover gradient at the top of the profile card in `Profile.tsx`.
- **Sidebar_Profile_Switch**: The Personal/Business toggle buttons rendered in the desktop sidebar and mobile drawer within `AppLayout.tsx`.
- **AppLayout**: The root layout component (`AppLayout.tsx`) that renders the sidebar, mobile drawer, header, and navigation.

---

## Requirements

### Requirement 1: Shared Profile Context

**User Story:** As a developer, I want a single shared profile-view state accessible to all components, so that color changes cascade consistently without each component managing its own copy.

#### Acceptance Criteria

1. THE Profile_Context SHALL expose the Active_View value (`"personal"` or `"business"`) to all consuming components in the application.
2. THE Profile_Context SHALL expose a `setActiveView` function that updates the Active_View globally.
3. WHEN the user navigates to `/profile?view=business`, THE Profile_Context SHALL set Active_View to `"business"`.
4. WHEN the user navigates to `/profile?view=personal`, THE Profile_Context SHALL set Active_View to `"personal"`.
5. WHEN no `view` URL parameter is present, THE Profile_Context SHALL default Active_View to `"personal"`.
6. THE Profile_Context SHALL persist the Active_View selection for the duration of the browser session so that navigating away from the profile page and returning preserves the last-selected view.
7. IF the Profile_Context provider is not mounted as an ancestor, THEN THE consuming component SHALL fall back to `"personal"` as the default Active_View without throwing a runtime error.

---

### Requirement 2: Profile Toggle Pill Colors

**User Story:** As a user, I want the Personal/Business toggle pills to reflect the correct accent color for the active mode, so that the pill I select is consistently blue for Personal and gold for Business.

#### Acceptance Criteria

1. WHEN Active_View is `"personal"`, THE ProfileToggle SHALL render the Personal pill with the Accent_Color_Blue gradient (`#3B82F6 → #2563EB`) as its active background.
2. WHEN Active_View is `"business"`, THE ProfileToggle SHALL render the Business pill with the Accent_Color_Gold gradient (`#F59E0B → #D97706`) as its active background.
3. THE ProfileToggle SHALL source its `view` prop from the Profile_Context Active_View, eliminating the separate `view` prop passed from Profile.tsx when used in the global layout context.
4. WHEN the user clicks the Personal pill, THE ProfileToggle SHALL call `setActiveView("personal")` on the Profile_Context and navigate to `/profile?view=personal`.
5. WHEN the user clicks the Business pill, THE ProfileToggle SHALL call `setActiveView("business")` on the Profile_Context and navigate to `/profile?view=business`.

---

### Requirement 3: Active Navigation Link Highlight

**User Story:** As a user, I want the active navigation link in the sidebar to reflect blue when I am in Personal mode and gold/amber when I am in Business mode, so that I always know which profile context I am operating in.

#### Acceptance Criteria

1. WHEN Active_View is `"personal"` and a NavLink is active, THE AppLayout SHALL apply the Accent_Color_Blue highlight (`bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300`) to that NavLink.
2. WHEN Active_View is `"business"` and a NavLink is active, THE AppLayout SHALL apply the Accent_Color_Gold highlight (`bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-700`) to that NavLink.
3. THE AppLayout SHALL read Active_View from the Profile_Context to determine the NavLink highlight color.
4. WHEN Active_View changes, THE AppLayout NavLink highlight SHALL update on the next render without requiring a page reload.

---

### Requirement 4: Sidebar Profile Switch Buttons

**User Story:** As a user, I want the Personal and Business switch buttons in the sidebar and mobile drawer to reflect the correct active color, so that the selected profile type is always visually distinct and consistent.

#### Acceptance Criteria

1. WHEN Active_View is `"personal"`, THE Sidebar_Profile_Switch SHALL render the Personal button with a blue active background (`hsl(var(--primary))` which maps to blue) and white text.
2. WHEN Active_View is `"business"`, THE Sidebar_Profile_Switch SHALL render the Business button with Accent_Color_Gold (`#d97706`) as its active background and white text.
3. THE Sidebar_Profile_Switch in the desktop sidebar SHALL read Active_View from Profile_Context and call `setActiveView` on toggle.
4. THE Sidebar_Profile_Switch in the mobile drawer SHALL read Active_View from Profile_Context and call `setActiveView` on toggle.
5. WHEN the user taps a Sidebar_Profile_Switch button, THE AppLayout SHALL update Profile_Context Active_View and navigate to the corresponding `/profile?view=` URL.
6. WHEN Active_View changes in Profile_Context (e.g., triggered from `Profile.tsx`), THE Sidebar_Profile_Switch SHALL reflect the updated state without the user needing to interact with the sidebar.

---

### Requirement 5: Personal Profile Tab Active Indicator

**User Story:** As a user, I want the active tab indicator in the Personal Profile tab bar to be blue (not amber), so that the tab color matches the Personal profile accent color.

#### Acceptance Criteria

1. WHEN Active_View is `"personal"`, THE PersonalProfile_Tabs active tab button SHALL render with Accent_Color_Blue (`bg-blue-500 text-white`) as its active style.
2. WHEN Active_View is `"business"`, THE PersonalProfile_Tabs active tab button SHALL render with Accent_Color_Gold (`bg-amber-500 text-white`) as its active style.
3. THE PersonalProfile_Tabs SHALL read Active_View from Profile_Context to determine the active tab color.
4. THE PersonalProfile_Tabs SHALL NOT hardcode `bg-amber-500` as the active tab color regardless of the Active_View.

---

### Requirement 6: Profile Header Cover Gradient

**User Story:** As a user, I want the profile header cover gradient to change color when I switch between Personal and Business, so that the header immediately communicates which profile context is active.

#### Acceptance Criteria

1. WHEN Active_View is `"personal"`, THE Profile_Header_Cover SHALL render with the blue-to-purple empire gradient (`bg-empire-gradient`).
2. WHEN Active_View is `"business"`, THE Profile_Header_Cover SHALL render with the Accent_Color_Gold gradient (`bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600`).
3. THE Profile.tsx view SHALL NOT need to separately maintain a `view` state for cover gradient decisions once Profile_Context is in place — it SHALL read Active_View from Profile_Context.
4. WHEN the Profile_Header_Cover gradient changes due to Active_View toggle, THE transition SHALL be animated with a CSS transition of at least 200ms to avoid abrupt color switches.

---

### Requirement 7: Accent Color Token Consistency

**User Story:** As a developer, I want a single source of truth for accent color tokens, so that adding color theming to new components in the future requires minimal code changes.

#### Acceptance Criteria

1. THE Profile_Color_System SHALL define a `getAccentTokens(view: "personal" | "business")` utility function that returns a structured color token object for the given view.
2. WHEN called with `"personal"`, THE `getAccentTokens` function SHALL return tokens for: primary color (`#2563EB`), gradient start (`#3B82F6`), gradient end (`#2563EB`), light background class (`bg-blue-50`), text class (`text-blue-700`), dark background class (`dark:bg-blue-900/20`), and dark text class (`dark:text-blue-300`).
3. WHEN called with `"business"`, THE `getAccentTokens` function SHALL return tokens for: primary color (`#D97706`), gradient start (`#F59E0B`), gradient end (`#D97706`), light background class (`bg-amber-50`), text class (`text-amber-700`), dark background class (`dark:bg-amber-900/20`), and dark text class (`dark:text-amber-700`).
4. THE `getAccentTokens` function SHALL be a pure function — given the same input, THE function SHALL always return the same token object.
5. ALL components implementing color theming (NavLink, ProfileToggle, PersonalProfile_Tabs, Sidebar_Profile_Switch, Profile_Header_Cover) SHALL source their color values from `getAccentTokens` rather than hardcoding individual color strings.

---

### Requirement 8: State Synchronization Between Profile.tsx and AppLayout.tsx

**User Story:** As a user, I want the profile toggle in the profile page and the toggle in the sidebar to always stay in sync, so that switching profile mode in one place is immediately reflected everywhere.

#### Acceptance Criteria

1. WHEN the user changes Active_View via the ProfileToggle in `Profile.tsx`, THE Sidebar_Profile_Switch in `AppLayout.tsx` SHALL reflect the updated Active_View within the same render cycle.
2. WHEN the user changes Active_View via the Sidebar_Profile_Switch in `AppLayout.tsx`, THE ProfileToggle in `Profile.tsx` SHALL reflect the updated Active_View within the same render cycle.
3. WHEN the user changes Active_View via the mobile drawer Sidebar_Profile_Switch, THE Profile_Header_Cover gradient in `Profile.tsx` SHALL update on the next navigation to `/profile`.
4. THE Profile_Context SHALL be the single authoritative source of Active_View for all components — no component SHALL maintain a separate, unsynchronized local copy of the active profile mode.
5. IF the URL search param `?view=` changes (e.g., via browser back/forward navigation), THEN THE Profile_Context SHALL update Active_View to match the URL param.
