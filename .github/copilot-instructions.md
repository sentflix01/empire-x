# Copilot Instructions for Halehame

Follow these rules for every feature addition, bug fix, refactor, or architectural change in this repository.

## 1. Start with understanding, not guessing
- Read the relevant existing code before editing it.
- Inspect the surrounding feature, route, component, or service.
- Identify the root cause before changing behavior.
- Prefer small, focused changes over large rewrites.

## 2. Follow the best-practice documentation
- Use the guides in [docs/best-practice](docs/best-practice) as the default standard.
- If a change affects architecture, performance, security, quality, observability, or release process, update the relevant guide.

## 3. Write clear, maintainable code
- Favor simple, explicit code over clever abstractions.
- Keep functions small and composable.
- Use meaningful names and consistent formatting.
- Avoid `any` unless it is truly unavoidable and documented.
- Prefer typed interfaces, shared types, and validation schemas.

## 4. Keep frontend and backend responsibilities separate
- Frontend code should primarily handle UI, routing, and client-side state.
- Backend code should handle validation, auth, persistence, and business logic.
- Move business logic into services or dedicated modules rather than keeping it inside route handlers or UI components.

## 5. Make architecture scalable by default
- Keep modules loosely coupled.
- Avoid duplicating logic across features.
- Use shared utilities and typed contracts where appropriate.
- Use caching, queues, and background jobs for expensive or slow operations.
- Design for observability and future extension.

## 6. Optimize for performance and reliability
- Avoid unnecessary re-renders and expensive loops.
- Use memoization only where it improves clarity and measurable performance.
- Keep large data lists paginated or limited.
- Do not load all search/map results eagerly when the user has not asked for them.

## 7. Make quality measurable
- Verify changes with the relevant checks before finishing.
- Run type checks and tests when available.
- If the change affects UI behavior, verify the feature manually or through tests.
- Don't claim completion without fresh evidence.

## 8. Security is mandatory
- Validate all input on the backend.
- Enforce auth and ownership checks for protected actions.
- Keep secrets out of source control.
- Avoid exposing sensitive internals in client responses.

## 9. Document important changes
- Update docs when behavior, architecture, or workflow changes.
- If a feature introduces a new pattern or major system change, add or update the related documentation in [docs](docs).

## 10. Preferred implementation workflow
1. Understand the request and inspect existing code.
2. Identify the smallest root-cause fix or feature slice.
3. Implement the change with clear structure and minimal side effects.
4. Verify the result with the relevant command or test.
5. Update documentation if the change introduces a new pattern or behavior.

## Required verification commands
- Frontend typecheck: `cd frontend-next && npx tsc --noEmit --pretty false`
- Backend checks: use the repo's relevant test or lint commands if available
- For UI changes, verify the behavior manually in the browser when possible
