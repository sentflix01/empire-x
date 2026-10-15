# Project Glossary

Use these terms consistently in issues, code, tests, and documentation.

| Term | Meaning in this project |
|---|---|
| Nodbusiness | Product name used in the application and documentation. |
| Empire X / `empire-x` | Repository or organization/project label; not a separate application. |
| Merchant / business | A seller using the platform to present and manage their business. Use the domain-specific term already present in the feature being changed. |
| Frontend | The Next.js App Router application in `frontend-next/`. |
| Backend / API | The Express server in `backend/`, including request validation, authorization, business rules, and persistence. |
| App Router | Next.js routing model used by the frontend; route files live under `frontend-next/app/`. |
| Server Component | A React component rendered on the server by default in the App Router unless marked otherwise. |
| Client Component | A component that opts into browser-side React behavior with the `'use client'` directive. |
| API contract | The agreed request, response, and error shape shared by frontend and backend. Update both implementation and API documentation when it changes. |
| ADR | Architecture Decision Record: a durable record of context, alternatives, decision, and consequences. |
| Feature flag | A server-side or client-visible switch used to control feature availability or rollout; use the existing flag system and document new flags. |
| Migration | A versioned database change under `backend/db/`; follow the established ordering, tracking, and safety conventions. |
| Demo mode | A product/testing mode with intentionally different data access or capabilities. Preserve its isolation from real user and business data. |
| Ownership check | Backend authorization that ensures an authenticated user may access or mutate the specific resource in the request. |
| SSRF | Server-Side Request Forgery: abuse of server-side URL fetching to reach unintended internal or protected network resources. |
| CI/CD | Automated build, test, and delivery/deployment workflows in `.github/workflows/` and hosting configuration. |
| Secret | Credential, token, key, password, connection string, or other value granting access. Keep it out of source control and docs; use environment configuration. |
| Definition of Done | Completion criteria for a change: behavior, validation, tests, security, documentation, and checks appropriate to its scope. |
