# Postmortem Template

> **Copy this file for every SEV-1 and SEV-2 incident.**
> Store completed postmortems in `operations/postmortems/YYYY-MM-DD-<slug>.md`.
> Deadline: 72 hours after mitigation. Blameless by policy — we analyze systems, not people.
> Process rules live in `operations/SEVERITY_LEVELS.md`.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SEV | Severity level (see `SEVERITY_LEVELS.md`) |
| IC | Incident Commander |
| MTTR | Mean Time To Repair/Restore |
| SLO | Service Level Objective |

---

```
# [YYYY-MM-DD] <One-line incident title>

**Severity:** SEV-_  ·  **Duration:** _h _m (detection → mitigation)  ·  **Author:** @handle
**Status:** Draft | Final          **IC:** @handle          **Scribe:** @handle

## 1. Summary
2–4 sentences a non-engineer can understand: what users experienced, what caused it,
how it was resolved.

## 2. Impact
- Users affected: <count or %>
- Duration of user impact:
- Money/data impact (if any): orders stuck, balances wrong, data lost — with numbers
- SLO/error-budget impact: which SLO burned, how much (see infrastructure/SLO.md)

## 3. Timeline (all times UTC)
| Time | Event |
|------|-------|
| HH:MM | Change/event that started the failure |
| HH:MM | First alert fired / first user report |
| HH:MM | On-call acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Service fully restored |

## 4. Root cause
Technical explanation with the exact commit/config/query involved. Link the PR.

## 5. What went well
Keep honest positives; they define what to protect.

## 6. What went poorly
Detection gaps, confusing dashboards, slow escalations, missing runbooks.

## 7. Action items
| # | Action | Type (prevent/detect/mitigate/process) | Owner | Due | Tracker |
|---|--------|------------------------------------------|-------|-----|---------|
| 1 | Add alert on X within Y min | detect | @a | date | TECHNICAL_DEBT.md # |
| 2 | ... | | | | |

Every action item must land in `operations/TECHNICAL_DEBT.md` with an owner.
Action items without owners are deleted at review.

## 8. Lessons appended to runbooks?
- [ ] RUNBOOKS.md updated with diagnosis steps for this class of failure
- [ ] Alerting adjusted (MONITORING.md threshold table)
- [ ] Test added that would have caught this

/label ~incident ~postmortem
```
