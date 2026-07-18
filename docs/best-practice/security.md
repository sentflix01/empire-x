# Security Best Practices

This guide outlines the key security practices to make Empire X trustworthy and resistant to common attacks.

## Goals

- Protect user data and sessions
- Prevent injection and authorization vulnerabilities
- Keep secrets out of source control
- Ensure secure defaults throughout the stack

## 1. Authentication and authorization

- Protect endpoints with auth checks
- Avoid trusting client-side state for permissions
- Validate current user ownership for every modify/delete action
- Keep JWT/session handling secure

## 2. Input validation

- Validate all request payloads on the backend
- Use schema validation for API input (Zod, Yup, or similar)
- Sanitize text fields and query input
- Reject invalid values early with clear error messages

## 3. Data protection

- Never store secrets in Git
- Use environment variables for keys and credentials
- Rotate secrets periodically
- Use HTTPS in production

## 4. Common attack defenses

- Protect against XSS by escaping user content in UI
- Enable CSP headers where possible
- Use parameterized DB queries to prevent SQL injection
- Add CSRF protections if using form submissions or cookies

## 5. API security

- Version APIs to avoid breaking changes
- Use rate limiting for search, auth, and cart endpoints
- Avoid leaking internal errors to clients
- Keep error responses consistent and safe

## 6. Verification

- Review security in design and code review
- Add security tests for auth boundaries
- Use static analysis / dependency scanning if available
- Document security assumptions and threat models
