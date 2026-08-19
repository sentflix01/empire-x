# Architecture Best Practices

> Architectural guidelines to make the Halehame codebase more scalable, maintainable, and professional.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| DB | Database |
| ORM | Object-Relational Mapping |
| SPA | Single Page Application |
| SSR | Server-Side Rendering |
| DRY | Don't Repeat Yourself |
| SOLID | Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion |
| CI/CD | Continuous Integration / Continuous Delivery |
| ADR | Architecture Decision Record |

---

## Goals

- Separate concerns cleanly between frontend, backend, and shared types
- Use stable, scalable state management patterns
- Keep server-side code stateless where possible
- Design for observability, reliability, and easy future extension

## 1. Define clear module boundaries

### Frontend
- `app/` and `components/` should contain only UI and routing logic
- Move reusable business logic into `lib/` or dedicated hooks
- Keep data fetching in React Query or server components, not in arbitrary components

### Backend
- Keep route handlers thin
- Move business logic into service modules
- Keep database access in repository/data-access modules
- Use clear request/response types for each endpoint

### Shared types
- Add a shared `types/` or `schemas/` folder for entity definitions used by both frontend and backend
- Prefer explicit interfaces and avoid `any`
- Use schema validation (Zod or similar) for API payloads

## 2. Upgrade state management

### Frontend
- Use React Query / TanStack Query for remote data and caching
- Use Zustand only for local UI state or small cross-cutting state (cart, auth status)
- Avoid large selectors that recreate objects every render
- Use `shallow` or primitive selectors to minimize re-renders
- Keep client components small and fast

### Backend
- Keep request handling synchronous and idempotent
- Avoid global mutable state in API handlers
- Use middleware for auth / validation / rate limiting

## 3. Improve API architecture

- Document each endpoint in `docs/backend/API.md`
- Add an API versioning strategy (e.g. `v1`, `v2`)
- Use consistent error response format
- Use typed request/response models
- Prefer server-side rendering or React Server Components for initial page loads where appropriate

## 4. System design upgrades

### Scalability
- Separate static asset delivery from dynamic API servers
- Add a caching layer for expensive queries (Redis / in-memory / CDN)
- Use queues for long-running tasks
- Keep session/token handling separate from request handlers

### Reliability
- Use health checks on all services
- Add retry/backoff for external calls
- Keep database migrations backward-compatible
- Use feature flags for risky rollouts

## 5. Implementation checklist

- [ ] Add `docs/best-practice/README.md`
- [ ] Add shared types for Product, User, Cart, Business, Search
- [ ] Refactor `HomeMapTab` and search components to use explicit search state
- [ ] Refactor `CartContext` into stable Zustand selectors with memoized values
- [ ] Add `docs/backend/API.md` entries for search and cart endpoints
- [ ] Add backend service layer modules under `backend/services/`
- [ ] Add frontend architecture docs under `docs/frontend/` if missing

## 6. Verify success

- Code is easier to navigate and reason about
- `npx tsc --noEmit` passes in both frontend and backend
- Critical flows are covered by tests
- App behavior is stable after refresh and login
