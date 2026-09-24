# Incident Severity Levels — Canonical Reference

> **Single source of truth for incident severity, response SLAs, escalation, and communication.**
> `RUNBOOKS.md`, `INCIDENT_RESPONSE.md`, `ON_CALL.md`, and `MONITORING.md` must reference this
> document — never redefine severity locally.
> Last updated: 2026-08-23

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SLA | Service Level Agreement |
| SLO | Service Level Objective |
| RTO | Recovery Time Objective — max acceptable time to restore service |
| RPO | Recovery Point Objective — max acceptable data loss window |
| T&S | Trust and Safety |
| IC | Incident Commander |

---

## Severity Matrix

Severity is chosen by **user impact**, not by which system failed. When two severities seem to
apply, take the higher one.

| Sev | Definition | Examples | Response start | Update cadence | Who is paged |
|-----|------------|----------|----------------|----------------|--------------|
| **SEV-1** | Platform down or data/money at risk | API fully unreachable; payments double-charging; wallet balances wrong; confirmed data breach; auth bypass | **Immediate (24/7)** | Every 30 min | On-call + CEO + IC assigned |
| **SEV-2** | Core feature degraded, workaround exists | Checkout failing on one provider only; feed errors for >10% of users; login failures for some users; DB failover in progress | **< 15 min (24/7)** | Every hour | On-call |
| **SEV-3** | Minor feature impaired or limited blast radius | Single non-critical endpoint 5xx; images slow; notifications delayed; Redis down (fail-open paths active) | **< 4 business hours** | Twice daily | Ticket → next working block |
| **SEV-4** | Cosmetic / no user impact | Broken internal dashboard tile; log noise; docs drift | **Next sprint** | N/A | Backlog |

### Explicit classifications (frequent judgment calls)

| Event | Severity | Notes |
|-------|----------|-------|
| Redis unavailable | **SEV-3** | Auth revocation checks and rate limiting fail open; platform stays up. Watch for abuse spikes. |
| Supabase primary degraded (auto-failover) | **SEV-2** during event, SEV-4 after | Verify zero data loss post-event (RPO check) before downgrading. |
| Stripe webhook deliveries failing | **SEV-2** | Orders stuck `pending`; Stripe retries for up to 3 days — fix before retries exhaust. |
| Security vulnerability reported | **SEV-2 minimum** | SEV-1 if actively exploited or if it exposes money/data. See root `SECURITY.md`. |
| CSAM / imminent-harm report | **T&S Critical — 15 min SLA** | Governed by `trust-safety/CONTENT_MODERATION_OPS.md`, not this matrix. |

---

## Roles

| Role | Responsibility |
|------|----------------|
| **Incident Commander (IC)** | Runs the response. Defaults to the on-call engineer; CEO assumes IC for SEV-1 until delegate named. |
| **Communications lead** | Customer/status messaging (`support/CRISIS_COMMUNICATION.md`). For SEV-2+, separate from IC. |
| **Scribe** | Timeline in the incident channel/document; required for SEV-1/2. |

---

## Escalation chain

```
On-call engineer ──(15 min no progress, SEV-1/2)──▶ CEO
                    (data breach suspected) ──────▶ CEO + legal review of notification duties
                    (payment provider issue) ─────▶ Stripe / Chapa support + status page check first
```

- Escalation contact lives in `operations/ON_CALL.md` §Rotation.
- A SEV-1 that outlives 60 minutes auto-escalates to "all hands" until mitigated.

## Communication channels

- **Internal:** team Telegram group `Nodbusiness Incidents` (single channel; thread per incident).
- **Status page:** `status.nodbusiness.app` (canonical host — update all references to any other host).
- **Users:** in-app banner + social posts for SEV-1/2 affecting >5% of users. Templates: `support/CRISIS_COMMUNICATION.md`.

---

## Postmortems

- Required for every **SEV-1** and **SEV-2**.
- Deadline: **72 hours** after mitigation, using `operations/POSTMORTEM_TEMPLATE.md`.
- Blameless by policy: postmortems name systems and decisions, never people.
- Action items are tracked in `operations/TECHNICAL_DEBT.md` with an owner and a date; an
  unowned action item is treated as not existing.

---

## Change log

| Date | Change |
|------|--------|
| 2026-08-23 | Created as the single canonical matrix, replacing the four divergent copies in RUNBOOKS/INCIDENT_RESPONSE/ON_CALL/MONITORING_STACK. |
