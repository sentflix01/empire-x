# Job Board — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Job Card Component

- [ ] Create `frontend-next/components/jobs/JobCard.tsx`
  - Company avatar (from business logo or user avatar): 48px
  - Job title: `text-base font-semibold`, 1 line truncated
  - Company name: `text-sm text-muted-foreground`
  - Location: pin icon + district / "Remote" badge
  - Job type badge: Full-time / Part-time / Contract / Freelance / Internship
  - Salary range: "ETB 15,000 – 35,000" or "Negotiable" if null
  - Posted: relative time "2 days ago"
  - "Applied" badge: shown when user has applied (green outline badge)

---

## Step 2 — Filter & Sort System

- [ ] Job type chips: All / Full-time / Part-time / Contract / Freelance / Internship
- [ ] Remote toggle: "Remote only" switch
- [ ] Salary range: min/max ETB inputs
- [ ] Category dropdown: Technology, Sales, Design, Finance, Logistics, Service, etc.
- [ ] Sort dropdown: Newest / Salary: High to Low / Most Recent
- [ ] Active filter chips above results (dismissible)
- [ ] Backend: ensure `GET /api/jobs` supports all these filter params

---

## Step 3 — Job Detail Page

- [ ] `generateMetadata` for SEO (title, description, OG)
- [ ] Header card: company logo, title, company name, location, type, salary, date
- [ ] "Apply Now" button — large, primary, sticky on mobile (fixed bottom bar)
- [ ] "Save job" bookmark icon
- [ ] Description: rendered as formatted text (support basic markdown or newlines)
- [ ] Requirements: if stored as separate field, render as bullet list
- [ ] About the company: business card (name, category, description, "View Showroom" link)
- [ ] Application count: "47 applicants" (adds urgency)
- [ ] Deadline: "Applications close Aug 30, 2026" with days remaining
- [ ] Similar jobs: `GET /api/jobs?category=xxx&limit=4&exclude=currentId`

---

## Step 4 — Application Flow

- [ ] "Apply Now" opens bottom sheet / modal
- [ ] Step 1 — Your Info (pre-filled from profile):
  - Full name (editable)
  - Email (editable)
  - Phone (editable)
  - LinkedIn / Portfolio URL (optional)
- [ ] Step 2 — Cover Letter:
  - Textarea: "Why are you a great fit for this role?"
  - Optional — "Skip" button
  - Character limit: 1000 chars with counter
- [ ] Step 3 — Review:
  - Summary of info entered
  - "Submit Application" CTA
- [ ] Submit → `POST /api/jobs/:id/apply { cover_letter }`
- [ ] Success: modal closes, job card shows "Applied ✓" badge
- [ ] Prevent duplicate applications (button disabled after apply)

---

## Step 5 — Applicant Status Tracking

- [ ] User can see their application status on job card: Pending / Reviewed / Shortlisted / Rejected / Hired
- [ ] My Applications page: `GET /api/jobs/my-applications`
  - List of applied jobs with current status badge
  - Color-coded: pending=gray, reviewed=blue, shortlisted=yellow, hired=green, rejected=red

---

## Step 6 — Employer View

- [ ] Job poster sees applicant count on their job listings
- [ ] "View Applicants" on their job detail → list of applicants
- [ ] Per applicant: avatar, name, applied date, cover letter, "Change status" dropdown
- [ ] Status change → `PUT /api/jobs/:jobId/applications/:appId { status }`
- [ ] Status change sends notification to applicant

---

## Step 7 — Verify

- [ ] Job card shows all fields at 375px without overflow
- [ ] Filters update results correctly
- [ ] Apply flow pre-fills from profile
- [ ] Application status visible to applicant
- [ ] Employer can manage applicant status
- [ ] "Applied" badge shows on already-applied jobs
