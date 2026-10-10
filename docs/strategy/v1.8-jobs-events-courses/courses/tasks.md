> **DEFERRED (October 2026):** This strategy file is historical planning material, not a current launch commitment. The feature routes and APIs are not active. Current scope and re-entry criteria are recorded in `docs/product/POST_LAUNCH_FEATURES.md`.

# Courses — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Course Card Component

- [ ] Create `frontend-next/components/courses/CourseCard.tsx`
  - Cover image: 16:9 ratio, lazy loaded
  - Title: 2 lines max, `line-clamp-2`
  - Instructor: small avatar + name
  - Level badge: Beginner / Intermediate / Advanced (color-coded)
  - Price: bold "ETB 500" or "Free"
  - Lesson count: "12 lessons"
  - Duration: total minutes (sum of lesson durations)
  - Progress bar (shown when enrolled): "60% complete"

---

## Step 2 — Course Detail Page

- [ ] Hero section: cover image + title + instructor + level badge + enroll button
- [ ] Sticky sidebar on desktop: price + "Enroll Now" button + lesson count + duration
- [ ] Sticky bottom bar on mobile: price + "Enroll Now" button
- [ ] Curriculum section:
  - Accordion per lesson: title + duration + lock/free icon
  - Free lessons: click to preview
  - Locked lessons: click shows "Enroll to access"
  - Expandable: lesson description shown on expand
- [ ] Instructor section: avatar + name + bio + "View profile" link
- [ ] Enrollment CTA:
  - Free course → "Enroll for Free" → `POST /api/courses/:id/enroll`
  - Paid course → "Enroll for ETB 500" → payment flow → enrollment
- [ ] `generateMetadata` for SEO

---

## Step 3 — Lesson Player

- [ ] Create `frontend-next/components/courses/LessonPlayer.tsx`
  - If `video_url` is YouTube: embed `<iframe>` with aspect-ratio 16/9
  - If `video_url` is direct: use `<video>` element with controls
  - Fullscreen button
  - Falls back to text content if no video

- [ ] Lesson layout:
  - Left/top: video player
  - Right/bottom sidebar: lesson list with completion checkmarks
  - Bottom: Previous ← | Lesson 3 of 12 | → Next buttons
  - Top: overall progress bar "45% complete"

- [ ] Mark as complete:
  - "Mark Lesson Complete" button
  - On click → `PUT /api/courses/:id/progress { lesson_id, completed: true }`
  - Progress % recalculated: `completed_lessons / total_lessons * 100`
  - Next lesson unlocks automatically

---

## Step 4 — Progress Tracking

- [ ] Add `lesson_completions` tracking (or use JSON in enrollments):
  - Option A: store `completed_lesson_ids: UUID[]` in `course_enrollments`
  - Option B: separate `lesson_completions` table (cleaner)
- [ ] Overall progress = `completed / total * 100` stored in `course_enrollments.progress`
- [ ] Progress visible on course card, course detail, and enrolled courses list

---

## Step 5 — My Courses Page

- [ ] Route: `/courses/my` or within `/account`
- [ ] Two tabs: "Enrolled" and "Teaching" (if user is an instructor)
- [ ] Enrolled courses: course card + progress bar + "Continue" button
- [ ] Teaching courses: course card + enrollment count + "Edit" button

---

## Step 6 — Course Creation (Instructor)

- [ ] "Create Course" button on courses page (for any verified user)
- [ ] Form: title, description, cover image upload, price, category, level
- [ ] After creating course → redirect to lesson management page
- [ ] Lesson management: add/edit/delete/reorder lessons
- [ ] Each lesson: title, description, video URL or file upload, duration, free toggle
- [ ] "Publish" button when ready

---

## Step 7 — Verify

- [ ] Free course: enroll in one click, access all lessons
- [ ] Paid course: payment required before lesson access
- [ ] Progress bar updates after marking lessons complete
- [ ] "Continue" button takes user to last incomplete lesson
- [ ] Lesson player works on mobile (video responsive)
- [ ] Curriculum accordion opens/closes correctly
