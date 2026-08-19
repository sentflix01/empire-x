# Nodbusiness — Engineering Standards

> Rules every developer follows. Consistency reduces friction, bugs, and arguments.
> Update this document via ADR when standards change — don't edit silently.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| ADR | Architecture Decision Record |
| PR | Pull Request |
| CI/CD | Continuous Integration / Continuous Delivery |
| API | Application Programming Interface |
| JWT | JSON Web Token |
| SQL | Structured Query Language |
| XSS | Cross-Site Scripting |
| CORS | Cross-Origin Resource Sharing |
| HTTPS | HyperText Transfer Protocol Secure |
| TLS | Transport Layer Security |
| MFA | Multi-Factor Authentication |
| UUID | Universally Unique Identifier |
| MIME | Multipurpose Internet Mail Extensions |
| DRY | Don't Repeat Yourself — avoid duplicating code/logic |

---

## Git Workflow

### Branching Strategy

```
main                    ← production-ready code, auto-deploys
  └── develop           ← integration branch (optional, for larger teams)
       ├── feat/nearby-map
       ├── feat/chapa-payments
       ├── fix/wallet-null-check
       └── chore/update-dependencies
```

| Branch prefix | Use for |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Maintenance (deps, CI, docs) |
| `refactor/` | Code improvements without behavior change |
| `hotfix/` | Emergency fix directly branched from main |

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Types:** `feat` · `fix` · `chore` · `refactor` · `docs` · `test` · `perf` · `ci`

**Examples:**
```
feat(wallet): add debit and refund routes
fix(profiles): remove duplicate PUT /me/upsert handler
chore(deps): update next.js to 15.2.1
docs(adr): add ADR-012 for ALLOWED_TABLES
refactor(crud): add validateTable guard to all CRUD functions
perf(feed): rewrite feed query to sort by feed_rank using CTE
```

### Pull Request Checklist

Before opening a PR:
- [ ] Branch is up-to-date with main
- [ ] `npm test` passes (backend)
- [ ] `npm run build` passes (frontend-next)
- [ ] `npm run lint` passes (frontend-next)
- [ ] No secrets or credentials in the diff
- [ ] Feature has a feature flag if gradual rollout is needed
- [ ] ADR added if this is a significant architectural change
- [ ] API docs updated if new endpoints were added

PR title follows conventional commits format.
PR description explains: what changed, why, how to test.

### Code Review Guidelines

**For the reviewer:**
- Review within 24 hours
- Focus on correctness, security, and maintainability — not style (that's what linters are for)
- Ask questions, don't make demands: "What do you think about X?" not "You must do X"
- Approve if it works and is safe, even if you'd have done it differently

**For the author:**
- Keep PRs small — one concern per PR
- Add context in the description, don't make the reviewer guess
- Respond to every comment before merging

---

## Naming Conventions

### Backend (Node.js)

| Thing | Convention | Example |
|---|---|---|
| Files | camelCase | `featureFlags.js`, `crud.js` |
| Route files | plural nouns | `products.js`, `orders.js` |
| Functions | camelCase | `getOrCreateWallet()` |
| Constants | UPPER_SNAKE | `LOW_STOCK_THRESHOLD`, `ALLOWED_TABLES` |
| SQL columns | snake_case | `seller_id`, `created_at` |
| API routes | kebab-case | `/api/price-alerts`, `/api/read-all` |

### Frontend (Next.js / TypeScript)

| Thing | Convention | Example |
|---|---|---|
| Component files | PascalCase | `ProductCard.tsx` |
| Hook files | camelCase, `use-` prefix | `use-debounce.ts` |
| Context files | PascalCase + Context | `AuthContext.tsx` |
| Utility files | camelCase | `generateInvoice.ts` |
| CSS classes | Tailwind only | No custom CSS |
| Client env vars | `NEXT_PUBLIC_` prefix | `NEXT_PUBLIC_API_BASE_URL` |
| Types/interfaces | PascalCase | `interface ProductCard { ... }` |

---

## API Standards

Every endpoint must have:

1. **Authentication** — `requireAuth` or explicit public justification
2. **Input validation** — check required fields, validate types and lengths
3. **Error handling** — try/catch, return consistent `{ error: "message" }` format
4. **Ownership check** — mutations verify the user owns the resource (or is admin)
5. **HTTP status codes** — 200 (ok), 201 (created), 400 (bad request), 401 (unauth), 403 (forbidden), 404 (not found), 500 (server error)

```js
// ✅ Good endpoint pattern
router.put('/:id', requireAuth, async (req, res) => {
  try {
    // 1. Validate input
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    // 2. Check resource exists
    const existing = await getRecord('products', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    // 3. Check ownership
    if (existing.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 4. Perform operation
    const updated = await updateRecord('products', req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });

    // 5. Return result
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});
```

---

## Database Standards

| Rule | Enforcement |
|---|---|
| UUID primary keys | All tables — `gen_random_uuid()` |
| Timestamps on all tables | `created_at` always; `updated_at` on mutable tables |
| Parameterized queries | Never string-concatenate SQL with user input |
| ALLOWED_TABLES validation | `crud.js` — validated before every query |
| Migrations are idempotent | Always use `IF NOT EXISTS` |
| No hardcoded IDs in migrations | Use SELECT to find related records |
| Backwards-compatible migrations | Add columns, don't drop them mid-flight |

---

## Frontend Standards

| Rule | Why |
|---|---|
| Server Components by default | Less JS shipped to browser |
| `'use client'` only when needed | Avoid unnecessary client bundles |
| `useAuth()` not `auth.me()` directly | Single source of truth |
| TanStack Query for server data | Caching, refetch, loading states |
| `sonner` toast for feedback | Consistent UX |
| `next/image` for all images | Auto-optimization |
| `NEXT_PUBLIC_` for client env vars | Next.js requirement |
| TypeScript on all new files | Type safety |

---

## Security Standards

| Rule | Applied where |
|---|---|
| Input validation on every endpoint | All routes |
| Parameterized SQL | All DB queries |
| Ownership check before mutation | All PUT/DELETE routes |
| `requireAuth` on all protected routes | All non-public routes |
| `requireAdmin` on admin operations | Admin routes + wallet debit |
| No secrets in code | Environment variables only |
| No `console.log` of request bodies | Logging standards |
| File uploads: MIME + size validation | Upload middleware |

---

## Testing Standards

| Test type | When | Tool |
|---|---|---|
| Unit tests | Pure functions, utilities | Jest (or Node's built-in test runner) |
| API integration tests | Every endpoint | `backend/test/e2e.test.js` |
| E2E tests | Critical user flows | Playwright (planned — TD-003) |

**Minimum coverage requirement:** Every new API endpoint should have at least one happy-path and one error-path test.

**Running tests:**
```bash
cd backend && npm test
cd frontend-next && npm run lint && npx tsc --noEmit
```

---

## Logging Standards

Use Pino (structured JSON logs) on the backend. Never use `console.log` in production code.

```js
// ✅ Use Pino
const logger = require('./lib/logger');
logger.info({ userId: req.user.id, orderId: order.id }, 'Order created');
logger.error({ err: err.message, route: '/api/products' }, 'Failed to create product');

// ❌ Avoid
console.log('Order created:', order);
```

**Never log:**
- Passwords or password hashes
- JWT tokens
- Full request bodies containing credentials
- Database connection strings
- API keys or secrets

---

## Feature Flag Standard

Every new feature that's not a bug fix should be behind a feature flag:

1. Add the flag to `DEFAULT_FLAGS` in `backend/lib/featureFlags.js`
2. Check the flag in the route or component
3. Default to `false` (disabled) for new features
4. Enable gradually: 1% → 10% → 50% → 100%
5. Remove the flag check once the feature is fully rolled out

```js
// Backend
const { isEnabled } = require('../lib/featureFlags');
if (await isEnabled('chapa_payments', req.user.id)) {
  // chapa payment logic
}
```

```tsx
// Frontend (via API)
const { data: flags } = useQuery({
  queryKey: ['flags'],
  queryFn: () => client.get('/api/flags').then(r => r.data),
})
if (flags?.chapa_payments?.enabled_for_user) {
  // show Chapa button
}
```
