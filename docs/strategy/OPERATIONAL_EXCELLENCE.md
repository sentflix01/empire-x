# Nodbusiness — Operational Excellence (Runbook)

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| CPU | Central Processing Unit |
| DB | Database |
| DNS | Domain Name System |
| DR | Disaster Recovery |
| ETA | Estimated Time of Arrival |
| HTTP | Hypertext Transfer Protocol |
| IOPS | Input/Output Operations Per Second |
| MTTR | Mean Time To Recovery |
| P95/P99 | 95th/99th Percentile |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| SLA | Service Level Agreement |
| SLO | Service Level Objective |
| TTL | Time To Live |

---

## 1. Service Level Objectives (SLOs)

| Service | Metric | Target | Measurement |
|---------|--------|--------|-------------|
| **API** | Availability | 99.9% | UptimeRobot / health endpoint |
| **API** | P99 Latency | <200ms | Prometheus histogram |
| **API** | Error Rate | <0.1% | 5xx / total requests |
| **WebSocket** | Delivery Rate | >99.9% | Acknowledged / sent |
| **Database** | P95 Query Latency | <50ms | pg_stat_statements |
| **Database** | Connection Pool Usage | <70% | PgBouncer stats |
| **Redis** | Hit Rate | >90% | INFO stats |
| **CDN** | Cache Hit Rate | >95% | Cloudflare analytics |
| **Email** | Delivery Rate | >99% | SendGrid / Firebase |
| **Push** | Delivery Rate | >98% | Firebase Console |
| **Backup** | Success Rate | 100% daily | `backup_status` in app_settings |
| **Restore Test** | Success Rate | 100% weekly | `scripts/verify-backup.js` |

---

## 2. Incident Response

### 2.1 Severity Definitions

| SEV | Definition | Examples | Response Time | Escalation |
|-----|------------|----------|---------------|------------|
| **SEV-1** | Critical business impact | Data breach, payment fraud, total API outage, payment processing down | 15 min | Founder + SRE Lead + Legal |
| **SEV-2** | Major feature degradation | Auth down, payments failing, checkout broken, DB primary failover | 1 hour | SRE Lead + Backend Lead |
| **SEV-3** | Minor feature issue | Single endpoint slow, non-critical feature broken, cosmetic bug | 4 hours | On-call engineer |
| **SEV-4** | Low impact | Cosmetic, docs, non-prod | Next sprint | Team |

### 2.2 Incident Flow

```
1. DETECT (Alert / User Report / Manual Discovery)
    • PagerDuty / Grafana Alert / User Report / Manual
    
2. TRIAGE (Slack #incidents)
    • Assign SEV level
    • Assign Incident Commander (IC)
    • Assign Scribe (timeline)
    • Post initial status: "Investigating SEV-X: <description>"
    
3. MITIGATE (Stop the bleeding)
    • Feature flag OFF (risky feature)
    • Scale up (HPA / manual)
    • Rollback (previous deploy)
    • Circuit breaker / rate limit
    • Traffic shift (DNS / load balancer)
    
4. RESOLVE (Root cause + fix)
    • Identify root cause
    • Develop fix / workaround
    • Deploy fix (hotfix or rollback)
    • Verify resolution
    
5. COMMUNICATE
    • Internal: #incidents + thread
    • Customers: In-app banner + status page
    • Partners: Email / Slack Connect (if affected)
    • Regulators: Legal team (if SEV-1 data breach)
    
6. POSTMORTEM (Blameless, within 48h)
    • Timeline (detection → resolution)
    • Root cause (5 Whys)
    • Impact (users, revenue, trust)
    • Action items (owner, due date, ticket)
    • Share: #postmortems + Notion + stakeholders
```

### 2.3 Communication Templates

**Internal (Slack #incidents):**
```
SEV-1: Payment processing down
Incident Commander: @sre-lead
Scribe: @backend-dev
Started: 2026-08-24 14:32 UTC
Impact: All Chapa/Stripe payments failing
Status: Investigating
Next update: 14:45 UTC
```

**Customer (In-app banner + Status Page):**
```
We're experiencing issues with payments. Our team is investigating.
Some transactions may fail. We'll update here every 15 minutes.
Status page: status.nodbusiness.app
```

---

## 3. On-Call Rotation

### 3.1 Schedule

| Week | Primary | Secondary | Escalation |
|------|---------|-----------|------------|
| 1 | Backend Dev 1 | Backend Dev 2 | SRE Lead |
| 2 | Backend Dev 2 | Frontend Dev 1 | SRE Lead |
| 3 | Frontend Dev 1 | Backend Dev 1 | SRE Lead |
| 4 | SRE Lead | Backend Dev 2 | Founder |

### 3.2 On-Call Expectations

| Requirement | Detail |
|-------------|--------|
| **Availability** | 10 min response (SEV-1), 30 min (SEV-2) |
| **Tools** | Laptop, phone, PagerDuty, Slack, VPN |
| **Handoff** | 30 min overlap, update #oncall-handoff |
| **Compensation** | $500/week + $100/incident (SEV-1/2) |

### 3.3 Escalation Path

```
SEV-1: On-call (15 min) → SRE Lead (30 min) → Founder (1 hour) → Legal (if data breach)
SEV-2: On-call (1 hour) → SRE Lead (2 hours) → Backend Lead (4 hours)
SEV-3: On-call (4 hours) → Team lead (next business day)
```

---

## 4. Deployment Procedures

### 4.1 Pre-Deploy Checklist

```
PRE-DEPLOY GATE
☐ All PRs: CI green (tsc, eslint, jest, vitest, playwright)
☐ No new HIGH/CRITICAL CVEs (Dependabot + Trivy)
☐ DB migrations reviewed (backward compatible?)
☐ Feature flags for risky changes = OFF by default
☐ Rollback plan documented (migration down + deploy prev)
☐ Staging deployed + smoke tested
☐ Stakeholders notified (if user-facing change)
☐ On-call aware of deploy window
```

### 4.2 Deploy Process

```
1. Merge to main → CI runs (blocking)
2. CI green → workflow_run triggers deploy
3. Render deploy hook (BE) + Vercel CLI deploy (FE)
4. Health check runs (5 min timeout)
   • GET /health → 200
   • DB connectivity
   • Redis connectivity
   • Critical endpoint smoke test
5. Health check passes → Deploy complete
6. Health check fails → Auto-rollback + Telegram alert
7. Post-deploy: Monitor #deployments for 30 min
```

### 4.3 Rollback Procedures

| Scenario | Action | Time |
|----------|--------|------|
| Auto-rollback (health check fail) | Render rollback (BE) / Vercel rollback (FE) | <2 min |
| Manual rollback (bug detected) | `git revert` + push OR Render "Rollback" button | <5 min |
| DB migration issue | `migrate-down` + deploy previous | <15 min |
| Full rollback (catastrophic) | DNS failover to previous + DB restore | <30 min |

---

## 5. Database Operations

### 5.1 Routine Maintenance

| Task | Frequency | Command | Owner |
|------|-----------|---------|-------|
| Vacuum/Analyze | Daily (auto) | `pg_cron: vacuumdb -z` | Supabase auto |
| Index Review | Weekly | `pg_stat_user_indexes` | Backend Lead |
| Slow Query Review | Weekly | `pg_stat_statements` | Backend Lead |
| Connection Pool | Daily | PgBouncer stats | SRE |
| Replication Lag | Continuous | `<1s` alert | Supabase auto |
| Backup Verify | Weekly | `scripts/verify-backup.js` | SRE |

### 5.2 Migration Safety

| Rule | Enforcement |
|------|-------------|
| Backward Compatible | Add columns nullable, no DROP COLUMN in same deploy |
| No Locking | `CONCURRENTLY` for indexes, `pg_sleep` for large ALTER |
| Rollback Tested | `migrate-down` tested in staging |
| Zero-Downtime | Dual-write pattern for schema changes |
| Feature Flag | New columns behind flag until backfill complete |

### 5.3 Emergency Procedures

| Scenario | Action |
|----------|--------|
| Connection Exhaustion | Increase PgBouncer pool, kill idle, scale read replicas |
| Runaway Query | `pg_cancel_backend(pid)` → analyze → add index |
| Disk Full | `pg_repack`, drop unused indexes, increase storage |
| Corruption | Supabase PITR (point-in-time recovery) to pre-corruption |
| Replica Lag > 30s | Pause writes, investigate, scale replica |

---

## 6. Monitoring & Alerting

### 6.1 Critical Alerts (PagerDuty)

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| API Down | Health endpoint 5xx > 5/min | SEV-1 | `runbooks/api-down.md` |
| High Error Rate | 5xx > 1% for 5min | SEV-1 | `runbooks/high-errors.md` |
| High Latency | P99 > 500ms for 10min | SEV-2 | `runbooks/high-latency.md` |
| DB Connections > 80% | PgBouncer pool > 80% | SEV-2 | `runbooks/db-connections.md` |
| Redis Memory > 85% | Upstash memory > 85% | SEV-2 | `runbooks/redis-memory.md` |
| Socket Disconnects > 10% | >10% clients disconnect/min | SEV-2 | `runbooks/socket-issues.md` |
| Webhook Queue > 1000 | BullMQ waiting > 1000 | SEV-2 | `runbooks/webhook-backlog.md` |
| Backup Failed | `backup_status != success` | SEV-2 | `runbooks/backup-failed.md` |
| SSL Cert < 30 Days | Cert expiry < 30 days | SEV-3 | `runbooks/ssl-expiry.md` |

### 6.2 Dashboards (Grafana)

| Dashboard | Key Panels | Refresh |
|-----------|------------|---------|
| System Overview | API health, latency, errors, throughput | 10s |
| Database | Connections, query latency, cache hit, replication | 30s |
| Redis | Memory, hit rate, ops/sec, evictions | 30s |
| WebSocket | Connections, messages/sec, errors, rooms | 10s |
| Business | MAU, orders, GMV, conversions, revenue | 5m |
| Payments | Success rate, volume, by gateway, errors | 1m |
| DevOps | Error feed, scorecard, telemetry, copilot | 30s |

---

## 7. Security Operations

### 7.1 Daily Security Checks

| Check | Tool | Frequency |
|-------|------|-----------|
| Dependency Scan | Dependabot + Trivy | Daily (CI) |
| Secrets Scan | TruffleHog | Daily (CI) |
| WAF Logs Review | Cloudflare | Daily |
| Failed Auth Review | Auth logs | Daily |
| Rate Limit Hits | Redis / Grafana | Daily |
| Audit Log Review | `audit_logs` table | Daily |

### 7.2 Incident-Specific Security

| Scenario | Immediate Action |
|----------|------------------|
| Credential Leak | Rotate key → re-encrypt vault → audit access logs |
| SQL Injection Attempt | Block IP → WAF rule → review query logs |
| Brute Force | Increase rate limit → CAPTCHA → alert |
| XSS Attempt | CSP report → fix → deploy |
| SSRF Attempt | Gateway blocks → audit log → alert |

### 7.3 Compliance Checks

| Standard | Check | Frequency |
|----------|-------|-----------|
| PCI DSS | Stripe/Chapa handle card data; we store only tokens | Quarterly |
| GDPR | Data export, deletion, consent logs | Quarterly |
| SOC2 | Access controls, audit logs, encryption | Annual (Phase 2) |
| PCI SAQ-A | Stripe/Chapa only; no card data on our systems | Annual |

---

## 8. Backup & Disaster Recovery

### 8.1 Backup Strategy

| Data | Frequency | Retention | Location | Verification |
|------|-----------|-----------|----------|--------------|
| PostgreSQL | Daily (2 AM UTC) | 30 days | Cloudflare R2 | Weekly restore test |
| Redis | N/A (ephemeral) | N/A | N/A | N/A |
| Object Store (R2) | Versioning enabled | Infinite | R2 (multi-region) | N/A |
| Code | Git (GitHub) | Infinite | GitHub + mirrors | N/A |
| Config/Secrets | 1Password / Render + Vercel env | Infinite | Encrypted | Quarterly audit |

### 8.2 Recovery Procedures

| Scenario | RPO | RTO | Procedure |
|----------|-----|-----|-----------|
| Single Table Corruption | <1 hour | <30 min | `pg_restore -t table` from latest backup |
| Full DB Loss | <24 hours | <4 hours | `pg_restore` from R2 → verify → cutover |
| Region Outage | <5 min | <15 min | DNS failover → Render secondary region |
| Ransomware | 24 hours | <4 hours | Isolate → restore from clean backup → rotate all secrets |
| Accidental DROP | 0 (PITR) | <30 min | Supabase PITR to pre-DROP timestamp |

### 8.3 DR Testing Schedule

| Test | Frequency | Success Criteria |
|------|-----------|------------------|
| Full Restore | Weekly | Restore completes <4h, data integrity verified |
| Failover | Monthly | DNS switch <5m, app healthy <15m |
| PITR | Quarterly | Restore to arbitrary timestamp ±1min |
| Full Region Failover | Semi-annual | Cutover <30m, zero data loss |

---

## 9. Capacity Management

### 9.1 Scaling Triggers

| Resource | Scale Up Trigger | Scale Down Trigger |
|----------|------------------|-------------------|
| API Workers | CPU > 70% 5min | CPU < 30% 30min |
| DB (Supabase) | CPU > 70% or storage > 80% | CPU < 30% 24h |
| Redis | Memory > 80% | Memory < 50% 24h |
| Socket Workers | Connections/worker > 5000 | Connections/worker < 2000 |
| CDN | Auto (Cloudflare) | Auto |

### 9.2 Cost Monitoring

| Metric | Target | Alert |
|--------|--------|-------|
| Infra Cost / MAU | <$0.50 (Phase 1) | >$1.00 |
| Infra Cost / Order | <$0.10 | >$0.25 |
| Monthly Burn | <Budget + 20% | >Budget + 50% |

---

## 10. Change Management

### 10.1 Feature Flag Lifecycle

| Stage | Duration | Action |
|-------|----------|--------|
| Development | Dev only | Flag = OFF in prod |
| Staging | 1 week | Flag = ON in staging |
| Canary | 1 week | Flag = ON for 5% users |
| Gradual Rollout | 2 weeks | 25% → 50% → 100% |
| Cleanup | 1 month after 100% | Remove flag code |

### 10.2 Deprecation Policy

| Phase | Timeline | Communication |
|-------|----------|---------------|
| Announce | T-12 months | Email, dashboard banner, docs |
| Deprecate | T-6 months | Warning in API responses, logs |
| Disable | T | Feature flag OFF, 410 Gone |
| Remove | T+1 month | Code removal |

---

## 11. Key Contacts

| Role | Name | Slack | Phone | PagerDuty |
|------|------|-------|-------|-----------|
| Founder/CEO | [Name] | @founder | +251-XXX-XXXX | Primary |
| SRE Lead | [Name] | @sre-lead | +251-XXX-XXXX | Secondary |
| Backend Lead | [Name] | @backend-lead | +251-XXX-XXXX | Tertiary |
| Frontend Lead | [Name] | @frontend-lead | +251-XXX-XXXX | Tertiary |
| Legal | [Name] | @legal | +251-XXX-XXXX | SEV-1 only |
| Supabase Support | - | - | - | Pro tier |
| Render Support | - | dashboard.render.com/support | - | Paid plans |
| Vercel Support | - | vercel.com/help | - | Paid plans |
| Cloudflare Support | - | - | - | Enterprise tier |
| Upstash Support | - | - | - | Pro tier |

---

## 12. Runbook Index

| Runbook | Location | Last Updated |
|---------|----------|--------------|
| API Down | `runbooks/api-down.md` | 2026-08-24 |
| High Error Rate | `runbooks/high-errors.md` | 2026-08-24 |
| High Latency | `runbooks/high-latency.md` | 2026-08-24 |
| DB Connections | `runbooks/db-connections.md` | 2026-08-24 |
| Redis Memory | `runbooks/redis-memory.md` | 2026-08-24 |
| Socket Issues | `runbooks/socket-issues.md` | 2026-08-24 |
| Webhook Backlog | `runbooks/webhook-backlog.md` | 2026-08-24 |
| Backup Failed | `runbooks/backup-failed.md` | 2026-08-24 |
| SSL Expiry | `runbooks/ssl-expiry.md` | 2026-08-24 |
| Credential Leak | `runbooks/credential-leak.md` | 2026-08-24 |
| SQL Injection | `runbooks/sql-injection.md` | 2026-08-24 |
| Brute Force | `runbooks/brute-force.md` | 2026-08-24 |
| DB Migration Failure | `runbooks/migration-failure.md` | 2026-08-24 |
| Region Failover | `runbooks/region-failover.md` | 2026-08-24 |
| Ransomware | `runbooks/ransomware.md` | 2026-08-24 |

---

*This runbook is the operational bible. Review monthly. Update after every incident. Every engineer must know the SEV-1 flow by heart.*

---

*Confidential. For Nodbusiness Technologies internal use only.*