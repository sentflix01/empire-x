# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `main` (production deploys) | ✅ |
| Older tags / local snapshots | ❌ — upgrade |

Nodbusiness deploys continuously from `main`; security fixes ship to production as soon as
they pass review.

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

1. Email **security@nodbusiness.app** (or use GitHub's *Report a vulnerability* on this repo).
2. Include: affected endpoint/component, reproduction steps, impact hypothesis, and any PoC.
3. You will receive an acknowledgment within **48 hours** and a status update at least every
   5 business days until resolution.

### Safe harbor

We consider good-faith research helpful and will not pursue legal action for responsible
disclosure that respects user privacy, avoids service degradation, and uses only test accounts.

### What we ask you NOT to do

- No denial-of-service or resource-exhaustion testing against production.
- No access to, modification of, or exfiltration of real user data.
- No social engineering of staff or users.
- No spam/phishing tests against our support channels.

## Severity classification

Aligned with `docs/operations/SEVERITY_LEVELS.md`:

| Severity | Examples | Target response |
|----------|----------|-----------------|
| Critical | Auth bypass, payment manipulation, mass data exposure | Immediate — hotfix |
| High | IDOR on money endpoints, privilege escalation | 7 days |
| Medium | Stored XSS with unusual preconditions, SSRF partials | 30 days |
| Low | Header hygiene, information disclosure w/o impact | 90 days |

## Security architecture pointers

- Threat model & current mitigations: `docs/architecture/THREAT_MODEL.md`
- Backend controls: `docs/backend/SECURITY.md`
- Operational hardening: `docs/infrastructure/SECURITY_HARDENING.md`

## Disclosure timeline

After a fix ships we publish a summary in the release notes (redacted details) and credit
reporters who wish to be named.
