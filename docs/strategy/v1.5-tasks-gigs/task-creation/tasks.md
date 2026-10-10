> **DEFERRED (October 2026):** This strategy file is historical planning material, not a current launch commitment. The feature routes and APIs are not active. Current scope and re-entry criteria are recorded in `docs/product/POST_LAUNCH_FEATURES.md`.

# Task Creation Flow — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Task Type Selector

- [ ] Create `frontend-next/components/tasks/TaskTypeSelector.tsx`
  - Grid of type chips with icon + label:
    - 🚗 Delivery | 🛒 Grocery | 📦 Moving | 🧹 Cleaning
    - 🔧 Handyman | 📚 Tutoring | ✏️ Translation | 💻 Tech Help | ⭐ Other
  - Selected: filled primary background
  - Single select (only one type)
  - Required — cannot proceed without selection

---

## Step 2 — Multi-Step Wizard Shell

- [ ] Create `frontend-next/components/tasks/TaskWizard.tsx`
  - State: `currentStep` (1–4), `formData` object
  - Progress bar at top: 4 segments, current step highlighted
  - Step label: "Step 1 of 4 — What do you need?"
  - Back button (hidden on step 1)
  - Next / Post Task button
  - Validate current step before advancing

---

## Step 3 — Step 1: Task Type + Title

- [ ] Task type selector (from Step 1 above)
- [ ] Title input: placeholder "e.g. Deliver a package from Bole to Kirkos"
- [ ] Character counter: `{title.length}/100`
- [ ] Validation: type required, title required (min 10 chars)

---

## Step 4 — Step 2: Details

- [ ] Description textarea: placeholder "Add any extra details, requirements, or instructions..."
- [ ] Optional label shown clearly
- [ ] Deadline: date picker + time picker (optional)
  - Quick options: Today / Tomorrow / This week / Custom
  - Show selected deadline in human format: "Due Monday, Aug 19"

---

## Step 5 — Step 3: Location

- [ ] Two input modes:
  1. **Map pin** (default): Leaflet map, user drags pin to location, lat/lon stored
  2. **Text address**: district dropdown + optional street address text
- [ ] Toggle between modes: "Use map" / "Enter address"
- [ ] "Use my current location" button → `navigator.geolocation.getCurrentPosition`
- [ ] Selected location shown as text confirmation: "Bole, Addis Ababa"
- [ ] Optional — can skip with "Task location not required"

---

## Step 6 — Step 4: Payment + Review

- [ ] ETB amount input
- [ ] Quick-select chips: ETB 50 / 100 / 200 / 500 / 1,000
- [ ] Min: ETB 10, shows error if below
- [ ] Task summary review before submit:
  - Type badge + Title
  - Description (truncated)
  - Location
  - Deadline (if set)
  - Offered payment
- [ ] "Post Task" CTA button
- [ ] On submit → `POST /api/tasks` → navigate to task detail page
- [ ] Success toast: "Task posted! Waiting for bids."

---

## Step 7 — Verify

- [ ] All 4 steps navigate correctly (forward + back)
- [ ] Cannot advance with invalid data
- [ ] Map pin sets correct lat/lon
- [ ] Task appears in task board after posting
- [ ] Task detail page accessible immediately after creation
