# Task Creation Flow — Audit

## Current Architecture
- Route: modal or page for task creation
- Backend: `POST /api/tasks`
- Required fields: `task_type`, `title`, `offered_payment`, `currency`
- Optional: `description`, `location`, `latitude`, `longitude`, `deadline`

## Global Standard: 4-Step Wizard

Reducing friction is critical for task creation. A single long form is intimidating. A 4-step wizard feels manageable.

```
Step 1: What do you need?
  → Task type chips (Delivery, Grocery, Moving, Cleaning, Handyman, Tutoring, Other)
  → Title input: "Describe the task in one sentence"

Step 2: Details
  → Description textarea: "Add more details, requirements, or instructions"
  → Deadline: date/time picker (optional)

Step 3: Location
  → "Where should this task happen?"
  → Map with draggable pin OR address text input
  → District dropdown for quick selection

Step 4: Payment
  → "How much are you offering?"
  → ETB amount input with suggested amounts (50, 100, 200, 500, 1000)
  → "Negotiate" toggle — allows bidders to suggest different amounts
  → Review summary → Post Task
```

## Issues to Investigate
- [ ] Is task creation a wizard or single form?
- [ ] Is there a map pin picker for location?
- [ ] Are task type chips visual/icon-based?
- [ ] Does the form validate payment > 0?
- [ ] Is there a progress indicator across steps?
