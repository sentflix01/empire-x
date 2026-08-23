# Service Level Objectives & Error Budgets

> Defines what "healthy" means for Nodbusiness, how we measure it, and what happens when we
> miss. Alert thresholds live in `operations/MONITORING.md`; severity response lives in
> `operations/SEVERITY_LEVELS.md`.
> **Status:** targets defined 2026-08-23; measurement wiring is Phase-2 work — see §5.
> Last updated: 2026-08-23

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SLI | Service Level Indicator — the measured quantity |
| SLO | Service Level Objective — the target for an SLI over a window |
| SLA | Service Level Agreement — external promise (stricter than SLOs) |
| GMV | Gross Merchandise Value |

---

## 1. Primary SLIs

| # | SLI | How measured |
|---|-----|--------------|
| S1 | API availability | Fraction of requests to `/api/*` returning non-5xx, excluding client-caused 4xx |
| S2 | Latency | Fraction of `GET /api/*` requests served in <500 ms (p95 <500 ms is the CEO dashboard bar; the SLI tracks the fraction) |
| S3 | Payment success | Fraction of initiated Stripe/Chapa checkouts that reach `paid` within 30 min, excluding user abandonment |
| S4 | Chat delivery | Fraction of Socket.IO messages persisted <1 s and emitted to recipient rooms |
| S5 | Data durability | Neon PITR window intact + verified backup restores per `operations/BACKUPS.md` |

## 2. Objectives (rolling 28 days)

| SLI | SLO | Error budget (allowed bad fraction) |
|-----|-----|-------------------------------------|
| S1 availability | 99.9% | 43 min of downtime/month |
| S2 latency (<500 ms) | 99% | ~7 h of slow requests/month |
| S3 payment success | 99.5% | ~0.5% of checkout attempts |
| S4 chat delivery | 99.9% | 43 min equivalent/month |
| S5 durability | 100% restore success | Zero budget — every failure is an incident |

External SLAs (support plans, seller agreement promises) must be set **looser** than these
internal SLOs.

## 3. Error-budget policy

When a 28-day error budget is exhausted (>100% burned):

1. Feature rollouts for that subsystem freeze (flags stay at current %).
2. The team works down reliability debt from `operations/TECHNICAL_DEBT.md` until the budget
   recovers below 50%.
3. SEV-1/SEV-2 incidents automatically consume budget via their downtime contribution.
4. Exceptions require the CEO's explicit sign-off recorded in the incident channel.

## 4. Burn-rate alerts (target configuration)

| Window | Condition | Severity |
|--------|-----------|----------|
| 1 h | >14× budget burn rate | SEV-2 page |
| 6 h | >6× burn rate | SEV-2 ticket + Telegram ping |
| 24 h | >3× burn rate | SEV-3 ticket |
| 7 d | Budget >50% consumed | Weekly review item |

## 5. Measurement wiring (to implement)

Current state: Sentry captures errors; Pino logs are visible only in Railway's console;
there is no metric store. To make these SLOs real:

1. **Log drain:** Railway log drain → Loki/Grafana Cloud free tier or Datadog (Phase 4 plan).
2. **Synthetic checks:** UptimeRobot (or Better Stack) on `/health` every 60 s from 3 regions.
3. **Payment success counter:** emit a structured log line (`event=payment_result`) from
   `orders.ts` webhook + Chapa verify; compute S3 from the log store.
4. **Latency:** pino-http timing already logged per request (`x-response-time` middleware);
   aggregate percentiles in the log store.
5. **Budget dashboard:** one Grafana board per SLI with burn-rate panels wired to §4 alerts.

## 6. Review cadence

- **Weekly:** error-budget consumption vs plan in the metrics review (`product/NORTH_STAR.md`).
- **Quarterly:** revisit SLO targets against real traffic; adjust with an ADR if materially wrong.
