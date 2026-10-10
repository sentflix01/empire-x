> **DEFERRED (October 2026):** This strategy file is historical planning material, not a current launch commitment. The feature routes and APIs are not active. Current scope and re-entry criteria are recorded in `docs/product/POST_LAUNCH_FEATURES.md`.

# v1.8 — Jobs, Events & Courses

> **Theme:** Community Value
> **Goal:** Nodbusiness is where Ethiopian professionals find work, attend events, and grow their skills. These three sections turn the app from a social platform into a career and community platform.

---

## Scope

| Section | File |
|---------|------|
| Job board | [audit.md](./job-board/audit.md) · [tasks.md](./job-board/tasks.md) |
| Job detail & application | [audit.md](./job-application/audit.md) · [tasks.md](./job-application/tasks.md) |
| Events listing & detail | [audit.md](./events/audit.md) · [tasks.md](./events/tasks.md) |
| Event creation | [audit.md](./event-creation/audit.md) · [tasks.md](./event-creation/tasks.md) |
| Course listing & detail | [audit.md](./courses/audit.md) · [tasks.md](./courses/tasks.md) |
| Course creation & lessons | [audit.md](./course-creation/audit.md) · [tasks.md](./course-creation/tasks.md) |
| Enrollment & progress | [audit.md](./enrollment-progress/audit.md) · [tasks.md](./enrollment-progress/tasks.md) |

---

## Success Criteria

**Jobs**
- [ ] Job cards: title, company, location, type, salary range, days posted
- [ ] Filter: job type, category, salary range, remote/onsite
- [ ] One-tap apply with pre-filled profile data
- [ ] Application status tracking: pending → reviewed → shortlisted → hired/rejected
- [ ] Employer dashboard: view applicants, change status, message applicants

**Events**
- [ ] Event cards: cover image, title, date, location, ticket price, spots left
- [ ] Free events: instant RSVP with one tap
- [ ] Paid events: ticket purchase via wallet or Stripe
- [ ] Event detail: full description, location map, attendee count, share button
- [ ] Calendar view of upcoming events
- [ ] My tickets page: QR code for each ticket

**Courses**
- [ ] Course cards: cover, title, instructor, price, level badge, lesson count
- [ ] Free preview of first lesson before purchase
- [ ] Purchase via wallet or Stripe
- [ ] Progress bar per enrolled course
- [ ] Lesson player: video or text content, mark as complete
- [ ] Certificate on completion (PDF download)

---

## Dependencies

- Backend: jobs, job_applications, events, event_tickets, courses, course_lessons, course_enrollments (all exist)
- Frontend: lesson player, ticket QR, progress tracking UI
