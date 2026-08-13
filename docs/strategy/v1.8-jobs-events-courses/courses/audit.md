# Courses — Audit

## Current Architecture
- Backend: `GET /api/courses`, `POST /api/courses`, `GET /api/courses/:id`
- Lessons: `GET /api/courses/:id/lessons`
- Enrollment: `POST /api/courses/:id/enroll`
- Progress: tracked in `course_enrollments.progress` (0–100%)
- Schema: `creator_id`, `title`, `description`, `price`, `level`, `is_published`
- Lessons: `title`, `description`, `video_url`, `duration`, `position`, `is_free`

## Course Detail Page Requirements (Global Standard — Udemy Pattern)

| Section | Elements |
|---------|----------|
| Hero | Cover image, title, instructor, rating, enrollment count, last updated |
| What you'll learn | Bullet list (if stored) |
| Curriculum | Lesson list with: title, duration, lock/free icon, expand for description |
| Instructor | Avatar, name, bio, other courses |
| Reviews | Average rating, distribution bars, individual reviews |
| Enroll CTA | Price (or "Free"), "Enroll Now" button, sticky on scroll |
| Free preview | First lesson playable without enrollment |

## Lesson Player Requirements
| Element | Standard |
|---------|----------|
| Video player | Responsive 16:9, custom controls, fullscreen |
| Progress save | Auto-save position every 10s |
| Mark complete | Button at end of lesson |
| Navigation | Previous / Next lesson buttons |
| Sidebar | Lesson list with completion checkmarks |
| Progress bar | Overall course % shown at top |

## Issues to Investigate
- [ ] Is there a lesson player component?
- [ ] Is progress tracked per lesson or overall only?
- [ ] Is the first lesson free preview working?
- [ ] Can instructor create/edit lessons from the UI?
- [ ] Is enrollment tied to payment (paid courses)?
