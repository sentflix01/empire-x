---
name: audit-finding
description: Standard for recording a QA, security, accessibility, privacy, performance or documentation finding in this repository — severity model, standard references, CVSS v4.0, evidence rules and the JSON file format. Use whenever you record, rate, or review an audit finding, or write an audit report section.
---

# Recording an audit finding

Applies to every finding under `note/<date>-*-audit/findings/`. The current
audit is `note/2026-11-05-international-audit/`. Read its `README.md` for scope
and rules of engagement before recording anything.

## Rules

1. **Evidence or UNVERIFIED.** A finding is `CONFIRMED` only with a reproduction
   step, request/response, tool output, screenshot or `file:line`. Otherwise it is
   `UNVERIFIED` with `unverified_reason`. Never record a pass by default.
2. **One finding, one file:** `findings/F-NNN.json`, next free number, file name equals `id`.
3. **Redact.** Never copy secrets, tokens, passwords, real personal data or
   production records into a finding or evidence file. Record the location only.
4. **Cite a standard** for every finding (see table below).
5. **Kind.** Set `kind`: `vulnerability` (exploitable; CVSS v4.0 required for security), `hardening` (missing defence-in-depth control; no CVSS), `defect`, `documentation` or `positive`.
6. **Positive findings** (things done well that must not regress) use
   `status: "POSITIVE"` and `severity: "Info"`.
7. **Validate** after every change:
   `node note/2026-11-05-international-audit/scripts/validate-findings.mjs`.
8. When a finding exposes a conflict between authoritative sources, record it and
   ask the owner — do not decide product, security or data questions yourself
   (`AGENTS.md`, `project-brain/README.md`).

## Severity

| Severity | Use when | Release impact |
|---|---|---|
| Critical | Data breach possible, legal violation with real exposure, money errors, a core journey fully broken, users locked out | Blocks launch |
| High | Significant security weakness, WCAG A/AA failure on a core journey, major integrity or privacy issue, serious performance failure | Fix before launch or signed risk acceptance |
| Medium | Degraded experience, non-core a11y failures, missing hardening, ops documentation gaps | Next release cycle |
| Low | Polish, minor inconsistency, best-practice suggestion | Backlog |
| Info | Observation or positive finding | — |

Rate by realistic impact in this product, not by the category name.

## Standard references (use exact identifiers)

| Area | Reference format |
|---|---|
| Security | `OWASP A01:2025` … `A10:2025`; `ASVS 5.0 V<chapter>.<section>.<req>`; `OWASP API3:2023`; `OWASP LLM01:2025` |
| Accessibility | `WCAG 2.2 SC 2.4.11`; `EN 301 549 V4.1.1 9.2.4.11` |
| Privacy / legal | `GDPR Art. 17`; `Ethiopia Proclamation 1321/2024 Art. N`; `ePrivacy Art. 5(3)` — always flag legal items for counsel |
| Quality | `ISO/IEC 25010:2023 <characteristic>`; `ISO 9241-110 <principle>`; `Nielsen heuristic N` |
| Performance | `Core Web Vitals LCP/INP/CLS` with measured value and conditions |

## CVSS v4.0

Required for confirmed `P5-security` findings of kind `vulnerability` above Info. Record the full
vector (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`) and the
base score from the FIRST calculator. State assumptions in `impact`.

## File template

```json
{
  "id": "F-001",
  "title": "Short statement of the defect",
  "phase": "P12-docs",
  "severity": "Low",
  "status": "CONFIRMED",
  "standards": ["ISO/IEC 25010:2023 maintainability"],
  "location": ["docs/operations/TECHNICAL_DEBT.md:84"],
  "steps": [],
  "expected": "What should be true",
  "actual": "What is true, with the observed values",
  "evidence": ["backend/tsconfig.json:1"],
  "impact": "Who is affected and how",
  "fix": "Concrete change, with file and code/config where possible",
  "effort": "S",
  "found_on": "2026-11-05",
  "environment": "repository",
  "regression_test": "Optional: the automated check that should guard this"
}
```

`environment` is `repository` (found by reading code/config), `local` (found on
the local stack) or `production-passive` (found by a read-only production check).
