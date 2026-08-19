# Quality Best Practices

> Testing, code quality, and developer workflow improvements required for a professional product.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| E2E | End-to-End testing |
| TDD | Test-Driven Development |
| CI/CD | Continuous Integration / Continuous Delivery |
| PR | Pull Request |
| API | Application Programming Interface |
| UI | User Interface |
| QA | Quality Assurance |
| SLA | Service Level Agreement |
| LGTM | Looks Good To Me — PR approval phrase |

---

## Goals

- Ensure code correctness and stability
- Make changes safe and reviewable
- Reduce bugs through automation
- Maintain high standards over time

## 1. Type safety

- Run `npx tsc --noEmit --pretty false` regularly
- Avoid `any` unless absolutely necessary
- Use explicit interfaces for API entities and component props
- Add TypeScript types for third-party wrappers and shared models

## 2. Testing

### Unit tests
- Cover all domain logic in hooks, helpers, and store slices
- Test cart logic, search filtering, and map state transitions

### Integration tests
- Test API endpoints and data contracts
- Verify that backend routes return expected results for valid and invalid input

### End-to-end tests
- Cover login, search, cart, checkout, and profile views
- Use Playwright / Cypress / Vitest e2e depending on repo setup

## 3. CI/CD

- Add a GitHub Actions workflow or CI pipeline
- Include steps for:
  - install dependencies
  - lint
  - typecheck
  - run tests
  - build production bundle
- Fail fast on regressions

## 4. Code review standards

- Use PR templates if available
- Require at least one reviewer
- Ensure changes are small and focused
- Verify behavior using screenshots or video for UI changes

## 5. Documentation

- Add docs for major architecture and API changes
- Update README and best-practice docs when patterns change
- Keep docs close to code — use `docs/` for architecture and process guidance

## 6. Verification

- Ensure CI passes on every PR
- Add coverage reports for critical modules
- Keep a healthy ratio of tests to code changes
- Track technical debt and follow up on flaky tests
