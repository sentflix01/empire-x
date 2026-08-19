# Halehame — Feature Flags & Rollout Strategy

> How Halehame controls the gradual release of features without deploying new code.
> Feature flags allow shipping to production safely, running A/B tests, and instantly disabling broken features.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| A/B | A/B Testing — comparing two variants to measure which performs better |
| API | Application Programming Interface |
| DB | Database |
| CI/CD | Continuous Integration / Continuous Delivery |
| UUID | Universally Unique Identifier |
| MAU | Monthly Active Users |
| PII | Personally Identifiable Information |

---

## 1. What Are Feature Flags

Feature flags (also called feature toggles) let you deploy code to production but control who sees it and when. Instead of:

```
Deploy → Everyone sees it → Panic if it breaks
```

You do:

```
Deploy (flag OFF) → Test internally → Enable for beta users → Gradual rollout → 100%
```

---

## 2. Flag Types on Halehame

| Type | Description | Example |
|------|------------|---------|
| **Release flag** | Turn a feature on/off globally | `enable_wallet_v2` |
| **User flag** | Enable for specific user IDs | `beta_showroom_builder` |
| **Role flag** | Enable for user roles | `admin_devops_panel` |
| **Percentage flag** | Gradually roll out to % of users | `new_feed_algorithm: 25%` |
| **Kill switch** | Instantly disable a broken feature | `disable_ai_search` |

---

## 3. Implementation

### Database Table
The `feature_flags` table in PostgreSQL stores all flag state:

```sql
CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  rollout_pct INTEGER DEFAULT 100 CHECK (rollout_pct BETWEEN 0 AND 100),
  allowed_roles TEXT[] DEFAULT NULL,
  allowed_user_ids UUID[] DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Backend Check
```javascript
const { isFlagEnabled } = require('../lib/featureFlags');

// In a route:
if (!await isFlagEnabled('wallet_v2', req.user)) {
  return res.status(404).json({ error: 'Feature not available' });
}
```

### Frontend Check
```typescript
import { useFeatureFlag } from '@/lib/featureFlags';

function WalletV2() {
  const enabled = useFeatureFlag('wallet_v2');
  if (!enabled) return null;
  return <WalletV2Dashboard />;
}
```

---

## 4. Current Flags Registry

| Flag Name | Status | Description | Owner |
|-----------|--------|-------------|-------|
| `enable_wallet` | ON | Wallet and payment features | CEO |
| `enable_ai_search` | ON | AI-powered search suggestions | Engineering |
| `enable_showroom_templates` | ON | Template gallery for showrooms | Product |
| `enable_developer_api` | OFF | Public API access (Phase 2) | Engineering |
| `enable_telegram_bot` | OFF | Telegram bot integration | Engineering |
| `enable_courses` | ON | Courses and learning features | Product |
| `enable_jobs` | ON | Job board features | Product |
| `enable_escrow` | OFF | Payment escrow (requires NBE license) | CEO |
| `enable_external_api` | ON | Showroom external API integration | Engineering |
| `maintenance_mode` | OFF | Redirect all users to maintenance page | CEO |

---

## 5. Rollout Process

### Safe Release Checklist
```
1. [ ] Feature built and deployed with flag OFF
2. [ ] Internal team tests with flag ON (team user IDs in allowed_user_ids)
3. [ ] Enable for 5% of users (rollout_pct = 5)
4. [ ] Monitor error rates, performance, support tickets for 24h
5. [ ] Increase to 25% → monitor
6. [ ] Increase to 50% → monitor
7. [ ] Increase to 100% → monitor
8. [ ] Remove the flag check from code after 1 sprint of stable 100%
```

### Kill Switch
If a feature causes problems at any rollout stage:
```
Admin panel → Feature Flags → Set enabled = false
→ Feature instantly disabled for ALL users
→ No deployment needed
```

---

## 6. Admin Panel Integration

Feature flags are managed via the Admin Panel → Feature Flags tab:
- Toggle on/off per flag
- Set rollout percentage
- Add/remove specific user IDs
- View change history

Changes take effect immediately — no cache invalidation needed (flags are fetched per-request in dev mode, cached for 30s in production).

---

*Owner: CEO (flag decisions), Engineering (implementation)*
*Review: Quarterly audit to remove stale flags*
