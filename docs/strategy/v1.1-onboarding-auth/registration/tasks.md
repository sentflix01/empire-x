# Registration Flow — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Password Strength Meter

- [ ] Create `frontend-next/components/ui/PasswordStrength.tsx`
  - Props: `password: string`
  - Shows: 4-segment bar (weak / fair / good / strong)
  - Colors: red → orange → yellow → green
  - Label below bar: "Weak" / "Fair" / "Good" / "Strong"
  - Logic: length ≥ 8, has uppercase, has number, has special char
- [ ] Add to Register page password field

---

## Step 2 — Register Page Polish

- [ ] Audit `frontend-next/app/(auth)/register/page.tsx`
- [ ] Ensure Google OAuth button is first / most prominent
- [ ] Add "or continue with email" divider between OAuth and email form
- [ ] Full name field present and required
- [ ] Email field: validate format on blur, show inline error
- [ ] Password: show/hide toggle + `PasswordStrength` component
- [ ] Account type selector (Personal / Business) inline in form
- [ ] Terms of service checkbox with links to `/service-agreement` and `/privacy`
- [ ] Submit button: disabled until form valid, shows spinner when submitting
- [ ] All error messages use `getErrorMessage()` utility — no raw API errors shown

---

## Step 3 — OTP Verification UX

- [ ] Audit `frontend-next/app/(auth)/otp/page.tsx` (or equivalent)
- [ ] OTP input: 6 individual digit boxes (not a single text input)
- [ ] Auto-advance focus to next box on digit entry
- [ ] Auto-submit when 6th digit entered
- [ ] Backspace moves focus to previous box
- [ ] Paste support: paste "123456" fills all 6 boxes
- [ ] Resend OTP button — disabled for 60 seconds after send, shows countdown
- [ ] "Check your email at [email]" shown with option to change email
- [ ] Loading state while verifying

---

## Step 4 — Progressive Onboarding Wizard

- [ ] Create `/onboarding` page with 3-step wizard
- [ ] Step 1 — Your Name & Photo
  - Display name input (pre-filled from registration)
  - Avatar upload (optional — can skip)
  - "Continue" button
- [ ] Step 2 — Your Interests
  - Grid of interest chips: Technology, Fashion, Food, Business, Sports, Music, Art, Education, Health, Real Estate
  - Select 3+ to enable Continue
  - Used to personalize feed and suggestions
- [ ] Step 3 — Your Location
  - City/district dropdown (Addis districts + other Ethiopian cities)
  - Optional — can skip
  - Used for nearby content
- [ ] Progress indicator at top: Step 1 / 2 / 3
- [ ] "Skip" link on steps 2 and 3
- [ ] After step 3 → redirect to `/feed` with welcome toast

---

## Step 5 — Google OAuth Polish

- [ ] Test Google OAuth end-to-end: click → Google → callback → app
- [ ] If new Google user → go to onboarding wizard
- [ ] If existing Google user → go to `/feed`
- [ ] Google user profile photo pre-fills avatar
- [ ] Google user name pre-fills display name

---

## Step 6 — Test

- [ ] Full registration → OTP → onboarding → feed in < 3 minutes
- [ ] Registration with existing email shows correct error
- [ ] Wrong OTP shows error without clearing inputs
- [ ] Correct OTP auto-submits and transitions smoothly
- [ ] Google OAuth works on Chrome, Safari, Firefox
