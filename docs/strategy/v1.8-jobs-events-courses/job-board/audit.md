# Job Board — Audit

## Current Architecture
- Backend: `GET /api/jobs`, `POST /api/jobs`, `GET /api/jobs/:id`
- Applications: `POST /api/jobs/:id/apply`, `GET /api/jobs/:id/applications`
- Schema: `jobs` table — title, description, job_type, salary_min/max, location, is_remote, status

## Job Board Layout (Global Standard — LinkedIn Pattern)

### Job List Page
| Element | Standard |
|---------|----------|
| Job card | Company logo/avatar, title, company, location, type badge, salary range, posted time |
| Filter bar | Job type, category, salary range, remote toggle |
| Sort | Newest / Salary high-low / Most applicants |
| Status badges | Open (green) / Closed (gray) |
| Quick apply | One-tap for jobs where profile is complete |

### Job Detail Page
| Element | Standard |
|---------|----------|
| Header | Title, company name + avatar, location, type, salary, posted date |
| Apply button | Prominent "Apply Now" CTA |
| Description | Full formatted text |
| Requirements | Bullet list |
| About company | Business profile card |
| Similar jobs | Row of related listings |

### Application Flow
| Element | Standard |
|---------|----------|
| Step 1 | Pre-filled: name, email, phone, resume URL (from profile) |
| Step 2 | Cover letter textarea (optional) |
| Step 3 | Review + submit |
| After apply | "Application submitted!" status shown on job card |

## Issues to Investigate
- [ ] Are job cards showing all required fields?
- [ ] Is there a filter/sort system?
- [ ] Is the application pre-filled from user profile?
- [ ] Is application status (pending/reviewed/hired) visible to applicant?
- [ ] Can employer view applicants and change their status?
