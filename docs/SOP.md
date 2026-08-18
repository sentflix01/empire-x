# Halehame — Standard Operating Procedure (SOP)

> **Version:** 1.0 | **Status:** Active | **Last Updated:** August 2026
>
> This document governs every single decision, change, and addition made to the
> Halehame platform — from a one-line bug fix to a full feature version. Nothing
> ships without passing through this system.
>
> **Purpose:** Ensure every part of the platform is professional, clean, consistent,
> and of the highest quality. When in doubt, this document has the answer.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SOP | Standard Operating Procedure — step-by-step instructions for recurring tasks |
| API | Application Programming Interface — how software systems communicate |
| UI | User Interface — visual elements users interact with |
| UX | User Experience — the overall experience of using the product |
| JWT | JSON Web Token — compact signed token for user authentication |
| CI/CD | Continuous Integration / Continuous Delivery — automated test and deploy pipeline |
| SQL | Structured Query Language — language for database queries |
| CORS | Cross-Origin Resource Sharing — browser security policy controlling API access |
| CSP | Content Security Policy — HTTP header preventing cross-site scripting |
| HTTPS | HyperText Transfer Protocol Secure — encrypted web communication |
| HTTP | HyperText Transfer Protocol — standard for web communication |
| REST | Representational State Transfer — standard architecture for web APIs |
| DRY | Don't Repeat Yourself — code quality principle avoiding duplication |
| PR | Pull Request — code change submitted for review before merging |
| LCP | Largest Contentful Paint — Core Web Vital measuring page load speed |
| INP | Interaction to Next Paint — Core Web Vital measuring responsiveness |
| CLS | Cumulative Layout Shift — Core Web Vital measuring visual stability |
| TTFB | Time to First Byte — time from request to first byte of response |
| WCAG | Web Content Accessibility Guidelines — international web accessibility standard |
| GDPR | General Data Protection Regulation — EU data privacy law |
| CCPA | California Consumer Privacy Act — California data privacy law |
| PWA | Progressive Web App — web app installable on a device like a native app |
| SEO | Search Engine Optimization — improving website visibility in search results |
| OTP | One-Time Password — single-use code for authentication |
| CDN | Content Delivery Network — distributed servers that deliver content faster |
| TTL | Time to Live — duration a cache entry remains valid |
| UUID | Universally Unique Identifier — unique ID for database records |
| HMAC | Hash-based Message Authentication Code — cryptographic signature for webhooks |
| MIME | Multipurpose Internet Mail Extensions — file type specification |

---

## Table of Contents

1. [The Golden Rules](#1-the-golden-rules)
2. [Before You Write Any Code](#2-before-you-write-any-code)
3. [Code Quality Standards](#3-code-quality-standards)
4. [Frontend Standards](#4-frontend-standards)
5. [Backend Standards](#5-backend-standards)
6. [Database Standards](#6-database-standards)
7. [UI/UX Standards](#7-uiux-standards)
8. [Security Standards](#8-security-standards)
9. [Testing Standards](#9-testing-standards)
10. [Git & Version Control](#10-git--version-control)
11. [Feature Development Workflow](#11-feature-development-workflow)
12. [Bug Fix Workflow](#12-bug-fix-workflow)
13. [Documentation Standards](#13-documentation-standards)
14. [Deployment Standards](#14-deployment-standards)
15. [Performance Standards](#15-performance-standards)
16. [Review Checklist](#16-review-checklist)

---

## 1. The Golden Rules

These seven rules override everything else. No exceptions.

```
1. NEVER ship broken code.         Every change must pass TypeScript check + build before commit.
2. NEVER hardcode secrets.         All keys, passwords, tokens live in .env only.
3. NEVER use 'any' in TypeScript.  Every type must be explicit.
4. NEVER leave console.log.        Use the structured logger (backend) or remove before commit.
5. NEVER duplicate code.           Extract reusable logic. DRY always.
6. NEVER skip error handling.      Every async function has try/catch. No silent failures.
7. NEVER merge to main directly.   All changes go through a branch + self-review.
```

---

## 2. Before You Write Any Code

Every change starts with understanding. Skip this step and you'll waste time.

### 2.1 Read First
Before touching any file:
- [ ] Read the relevant strategy doc: `docs/strategy/vX.X-*/README.md`
- [ ] Read the audit: `docs/strategy/vX.X-*/[section]/audit.md`
- [ ] Read the tasks: `docs/strategy/vX.X-*/[section]/tasks.md`
- [ ] Check `docs/strategy/STANDARDS.md` for the relevant section
- [ ] Check if this area has an implementation plan: `implementation plan/*/`

### 2.2 Ask These Questions
1. **What is the exact problem being solved?** Write it in one sentence.
2. **Who is affected?** (buyer, seller, admin, developer, all users)
3. **Does a solution already exist?** Check existing components before building new ones.
4. **What is the minimal change needed?** Do not over-engineer.
5. **Will this break anything?** Check what calls the code you're changing.

### 2.3 Plan Before Coding
For anything larger than a 10-line fix:
- Write the approach in a comment at the top of the file or in a scratch note
- Identify which files will be touched
- Identify which tests need to be written or updated
- Only then open your editor

---

## 3. Code Quality Standards

### 3.1 TypeScript (Frontend)
```typescript
// ✅ CORRECT
interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followerCount: number;
}

// ❌ WRONG — never use any
const user: any = {};
const profile: Record<string, any> = {};

// ✅ CORRECT — explicit return types on all functions
async function fetchProfile(userId: string): Promise<UserProfile> {
  const { data } = await client.get(`/api/profiles/${userId}`);
  return data;
}

// ✅ CORRECT — exhaustive error handling
async function saveProfile(data: Partial<UserProfile>): Promise<void> {
  try {
    await client.put('/api/profiles/me', data);
    toast.success('Profile saved');
  } catch (error) {
    const message = getErrorMessage((error as any)?.status);
    toast.error(message);
  }
}
```

### 3.2 JavaScript (Backend)
```javascript
// ✅ CORRECT — always destructure and validate
router.post('/api/products', requireAuth, async (req, res) => {
  const { title, price, category } = req.body;

  // Validate first
  if (!title?.trim())  return res.status(400).json({ error: 'title is required' });
  if (!price || price <= 0) return res.status(400).json({ error: 'price must be > 0' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO products (seller_id, title, price, category) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, title.trim(), price, category]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to create product');
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// ❌ WRONG — no validation, no error handling, raw SQL string
router.post('/api/products', async (req, res) => {
  const result = await pool.query(`INSERT INTO products VALUES ('${req.body.title}')`);
  res.json(result);
});
```

### 3.3 Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| React components | PascalCase | `ProductCard`, `ChatRoom` |
| Functions | camelCase | `fetchProfile`, `handleSubmit` |
| Variables | camelCase | `userId`, `isLoading` |
| Constants | UPPER_SNAKE | `MAX_FILE_SIZE`, `API_BASE_URL` |
| CSS classes | Tailwind only | `text-sm font-semibold` |
| DB tables | snake_case | `user_profiles`, `order_items` |
| DB columns | snake_case | `created_at`, `seller_id` |
| Files (components) | PascalCase | `ProductCard.tsx` |
| Files (utils/hooks) | camelCase | `useAuth.ts`, `formatDate.ts` |
| Routes (API) | kebab-case | `/api/user-profiles`, `/api/order-items` |
| ENV variables | UPPER_SNAKE | `DATABASE_URL`, `JWT_SECRET` |

### 3.4 File Organization
```
// Every component file follows this order:
// 1. 'use client' directive (if needed)
// 2. Imports (React first, then external libs, then internal)
// 3. Types/interfaces
// 4. Constants
// 5. Helper functions
// 6. Main component
// 7. Export

// Max 300 lines per file. Split if larger.
// Single responsibility: one file = one purpose.
```

### 3.5 Comments
```typescript
// ✅ CORRECT — explain WHY, not WHAT
// Optimistic update: update UI immediately so the user doesn't wait
// for the server response. We roll back if the API call fails.
setLiked(true);
setLikeCount(prev => prev + 1);

// ❌ WRONG — explains what the code already says
// Set liked to true
setLiked(true);
// Increment like count
setLikeCount(prev => prev + 1);
```

---

## 4. Frontend Standards

### 4.1 Component Structure
Every React component must have:
- [ ] TypeScript props interface (no implicit any)
- [ ] Loading state (skeleton, not spinner, for data-fetching components)
- [ ] Empty state (for lists and collections)
- [ ] Error state (inline message + retry button for API calls)
- [ ] Dark mode support (use CSS variables, not hardcoded colors)
- [ ] Mobile responsive (test at 375px)

```tsx
// ✅ Template for any data-fetching component
interface ProductCardProps {
  productId: string;
  onAddToCart?: (id: string) => void;
}

export default function ProductCard({ productId, onAddToCart }: ProductCardProps) {
  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
  });

  // 1. Loading
  if (isLoading) return <SkeletonCard />;

  // 2. Error
  if (isError) return (
    <ErrorMessage title="Couldn't load product" onRetry={refetch} />
  );

  // 3. Empty (if applicable)
  if (!product) return null;

  // 4. Content
  return <div>...</div>;
}
```

### 4.2 State Management Rules
```
Local state (useState):     Component-specific UI state (open/closed, form values)
Server state (TanStack):    All API data — NEVER useEffect + useState for fetches
Global state (Zustand):     Auth, cart, notifications, bookmarks — cross-component
Form state (React Hook Form): All forms — never manage form state manually
```

### 4.3 Optimistic Updates
For any mutation that changes something the user can see:
```typescript
// ✅ Always use optimistic updates for likes, follows, cart, saves
const { mutate: toggleLike } = useMutation({
  mutationFn: (postId: string) => client.post(`/api/posts/${postId}/like`),
  onMutate: async (postId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['post', postId] });
    // Snapshot previous value
    const prev = queryClient.getQueryData(['post', postId]);
    // Optimistically update
    queryClient.setQueryData(['post', postId], (old: any) => ({
      ...old, isLiked: !old.isLiked, likeCount: old.likeCount + (old.isLiked ? -1 : 1),
    }));
    return { prev };
  },
  onError: (_err, postId, context) => {
    // Roll back on error
    queryClient.setQueryData(['post', postId], context?.prev);
    toast.error('Failed to update like');
  },
});
```

### 4.4 Forms
```typescript
// ✅ Every form must:
// 1. Use React Hook Form + Zod validation
// 2. Show field-level errors on blur
// 3. Disable submit while loading
// 4. Show toast on success and error
// 5. Use 16px minimum font-size on inputs (prevents iOS zoom)

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
  resolver: zodResolver(schema),
});
```

### 4.5 Styling Rules
```
✅ Use Tailwind utility classes only
✅ Use CSS variables for colors: text-foreground, bg-card, border-border
✅ Use design tokens: rounded-xl (cards), rounded-full (pills/avatars)
✅ Dark mode: every component works in both light and dark
❌ Never hardcode hex colors inline: style={{ color: '#2563eb' }}
❌ Never use arbitrary Tailwind values unless truly necessary: w-[437px]
❌ Never write custom CSS classes (use Tailwind)

Spacing scale: gap-1(4px) gap-2(8px) gap-3(12px) gap-4(16px) gap-6(24px) gap-8(32px)
Border radius: rounded-sm(2px) rounded-md(6px) rounded-lg(8px) rounded-xl(12px) rounded-2xl(16px)
```

---

## 5. Backend Standards

### 5.1 Route Structure
Every route file follows this pattern:
```javascript
const router = require('express').Router();
const pool   = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const logger = require('../lib/logger');
const apiError = require('../lib/apiError');

// ── List ─────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    // ... query
    res.json(rows);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to list items');
    return apiError.serverError(res, 'Failed to fetch items');
  }
});

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { title, description } = req.body;
  if (!title?.trim()) return apiError.validationError(res, 'title is required');
  try {
    // ... insert
    res.status(201).json(row);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to create item');
    return apiError.serverError(res, 'Failed to create item');
  }
});

module.exports = router;
```

### 5.2 Input Validation Rules
```javascript
// Validate ALL input before using it
// 1. Check required fields exist
// 2. Check types are correct
// 3. Trim strings to prevent whitespace-only values
// 4. Use parameterized queries — NEVER string concatenation

// ✅ CORRECT
const title = String(req.body.title ?? '').trim();
if (!title) return res.status(400).json({ error: 'title is required' });

// ✅ CORRECT — parameterized query
pool.query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ WRONG — SQL injection risk
pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

### 5.3 Ownership Checks
Every mutating route (PUT, DELETE) must verify ownership:
```javascript
// ✅ Always check ownership before mutation
const existing = await pool.query('SELECT owner_id FROM products WHERE id = $1', [id]);
if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });
if (existing.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### 5.4 Logging Rules
```javascript
// Use structured logging — NEVER console.log in production code
logger.info({ userId: req.user.id, action: 'created_product' }, 'Product created');
logger.error({ err: err.message, stack: err.stack }, 'Failed to process payment');
logger.warn({ flag: 'chapa_payments' }, 'Feature flag disabled');
logger.debug({ query: sql, params }, 'DB query executed'); // dev only
```

### 5.5 Response Format
```javascript
// Success responses
res.status(200).json(data);                    // GET list or single
res.status(201).json(createdResource);         // POST create
res.json({ success: true });                   // DELETE

// Error responses — always use apiError helpers
apiError.validationError(res, 'email is required');   // 400
apiError.unauthorized(res);                            // 401
apiError.forbidden(res, 'Not your resource');          // 403
apiError.notFound(res, 'Product not found');           // 404
apiError.serverError(res, 'Failed to create order');   // 500
```

---

## 6. Database Standards

### 6.1 Migration Rules
```javascript
// Every migration must:
// 1. Have a clear comment at the top explaining what it does and why
// 2. Use IF NOT EXISTS / IF EXISTS (idempotent — safe to run twice)
// 3. Never delete data (use soft deletes or archive columns)
// 4. Never rename columns (add new + deprecate old)
// 5. Always add an index for foreign keys and frequently queried columns

// ✅ CORRECT
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
```

### 6.2 Query Rules
```javascript
// Use $1, $2 parameterized placeholders — never string interpolation
// Always LIMIT results (default 50, max 500)
// Always order results (otherwise pagination is unstable)
// Use COALESCE for nullable aggregates

// ✅ CORRECT
const { rows } = await pool.query(
  `SELECT id, title, price FROM products
   WHERE seller_id = $1 AND status = 'active'
   ORDER BY created_at DESC
   LIMIT $2 OFFSET $3`,
  [sellerId, limit, offset]
);
```

### 6.3 Schema Standards
```sql
-- Every table must have:
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()   -- never integer IDs
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()           -- for mutable tables

-- Foreign keys must CASCADE on delete:
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE

-- Text fields: use TEXT (not VARCHAR with arbitrary limits)
-- Numeric: use NUMERIC(12,2) for money, INTEGER for counts
-- Boolean: NOT NULL with DEFAULT
```

---

## 7. UI/UX Standards

### 7.1 Every Page Must Have
```
✅ Skeleton loader while data loads (not a spinner)
✅ Empty state with icon + message + CTA when list is empty
✅ Error state with message + retry button when API fails
✅ Offline banner when network is unavailable
✅ Mobile layout tested at 375px (iPhone SE)
✅ All tap targets ≥ 44×44px
✅ No horizontal scroll at any screen size
✅ Works in dark mode
```

### 7.2 Empty State Template
```
Every empty state must have:
1. An icon (from Lucide, 48px)
2. A clear title: "No products yet"
3. A helpful description: "List your first product to start selling"
4. A CTA button: "List a Product" → /products/new
```

### 7.3 Loading State Template
```
Loading states use skeleton components, not spinners:
- SkeletonCard     → for product/showroom/course cards
- SkeletonPostCard → for feed posts
- SkeletonListItem → for messages, notifications, orders
- SkeletonProfile  → for profile headers
Show 3–8 skeleton items matching the real content shape.
```

### 7.4 Interaction Feedback
```
Every user action must provide feedback:
- Click button: loading spinner while pending
- Success: toast.success('Product listed!')
- Error: toast.error(humanMessage) — NOT the raw API error
- Dangerous actions: require confirmation dialog
```

### 7.5 Copy/Text Standards
```
✅ Friendly, direct, global language
✅ Verbs in CTAs: "List a Product", "Send Message", "Post Task"
✅ Human error messages: "Couldn't load feed" not "Error 503"
✅ Relative times: "2 hours ago" not "2026-08-14T10:00:00Z"
❌ Never show raw error messages or stack traces to users
❌ Never use lorem ipsum in any shipped component
❌ Never use "click here" as link text (accessibility)
```

---

## 8. Security Standards

### 8.1 Authentication
```
✅ All mutating routes require requireAuth middleware
✅ Admin routes additionally require requireAdmin middleware
✅ Ownership checks on every PUT/DELETE (is this the owner?)
✅ JWT tokens expire in 15 minutes (access) + 7 days (refresh)
✅ Refresh tokens stored as HttpOnly cookies (not localStorage)
✅ Rate limiting: 500/15min general, 20/15min auth endpoints
```

### 8.2 Input Security
```
✅ Parameterized SQL queries (no string interpolation)
✅ File uploads: validate MIME type + size limit (10MB)
✅ Trim and sanitize all text input server-side
✅ CORS allowlist (no wildcard * in production)
✅ Helmet.js: CSP, HSTS, X-Frame-Options, noSniff
❌ Never trust client-provided prices, user IDs, or roles
❌ Never store passwords in plaintext (bcrypt only)
❌ Never log sensitive data (passwords, tokens, card numbers)
```

### 8.3 Environment Variables
```
✅ All secrets in .env (never in code)
✅ .env is gitignored (NEVER commit .env)
✅ .env.example documents all required vars without real values
✅ Backend validates required vars on startup (DATABASE_URL, JWT_SECRET)
❌ Never log environment variable values
❌ Never expose STRIPE_SECRET_KEY or JWT_SECRET to frontend
```

---

## 9. Testing Standards

### 9.1 Backend Tests
Every new backend route must have at minimum:
```javascript
// 1. Happy path test (correct input → correct output)
it('creates a product successfully', async () => {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Test Product', price: 100, currency: 'USD' });
  expect(res.status).toBe(201);
  expect(res.body.title).toBe('Test Product');
});

// 2. Auth test (no token → 401)
it('requires authentication', async () => {
  const res = await request(app).post('/api/products').send({});
  expect(res.status).toBe(401);
});

// 3. Validation test (missing required field → 400)
it('rejects missing title', async () => {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ price: 100 });
  expect(res.status).toBe(400);
});
```

### 9.2 Frontend Tests
```typescript
// Component tests verify behavior, not implementation:
// ✅ Does it render without crashing?
// ✅ Does it show loading state?
// ✅ Does it show data when loaded?
// ✅ Does it show error state on failure?
// ✅ Do interactive elements work (click, type, submit)?
```

### 9.3 Before Every Commit
```bash
# Run these checks — commit only if all pass:
cd frontend-next && npx tsc --noEmit    # 0 TypeScript errors
cd frontend-next && npm run lint        # 0 ESLint errors
cd backend && npm test                  # all tests pass
cd frontend-next && npm run build       # successful build
```

---

## 10. Git & Version Control

### 10.1 Branch Naming
```
feature/[description]     → new feature:    feature/product-search-filters
fix/[description]         → bug fix:        fix/cart-quantity-update
docs/[description]        → docs only:      docs/update-api-reference
refactor/[description]    → refactoring:    refactor/product-card-component
chore/[description]       → tooling/config: chore/update-dependencies
```

### 10.2 Commit Message Format
```
type: short description (max 72 chars)

[optional body — what changed and why, not how]

[optional footer — breaking changes, issue refs]

Types: feat, fix, docs, style, refactor, test, chore, perf

Examples:
feat: add price drop alerts for wishlisted products
fix: prevent double-submission on checkout form
perf: lazy-load Leaflet map on nearby page only
docs: add API reference for /api/products endpoints
```

### 10.3 Pull Request Rules
```
✅ Branch from main, merge to main
✅ PR title follows commit message format
✅ PR description explains WHAT changed and WHY
✅ All CI checks pass (TypeScript, lint, tests, build)
✅ Self-review: read your own diff before requesting review
✅ No PR larger than 400 lines (split if needed)
❌ Never force-push to main
❌ Never merge a PR with failing CI
❌ Never commit directly to main
```

### 10.4 What Not To Commit
```
❌ .env files (secrets)
❌ node_modules/
❌ .next/ build output
❌ *.log files
❌ console.log statements
❌ Commented-out code blocks
❌ TODO comments (create a DevOps item instead)
❌ Hardcoded test credentials
```

---

## 11. Feature Development Workflow

Follow this exact sequence for every new feature:

```
Step 1: READ
  → docs/strategy/vX.X-[feature]/README.md
  → docs/strategy/vX.X-[feature]/[section]/audit.md
  → docs/strategy/vX.X-[feature]/[section]/tasks.md
  → docs/strategy/STANDARDS.md

Step 2: PLAN
  → Identify all files to create/modify
  → Identify API endpoints needed
  → Identify DB changes needed (new migration?)
  → Estimate effort (small: <2h, medium: 2-8h, large: >8h)

Step 3: BRANCH
  → git checkout -b feature/[name]

Step 4: BACKEND FIRST
  → Write migration if schema changes needed
  → Write route with validation, auth, ownership checks
  → Write at least 3 tests (happy path, auth, validation)
  → Test manually with curl or Postman

Step 5: FRONTEND
  → Build component with TypeScript types
  → Add loading skeleton
  → Add empty state
  → Add error state
  → Connect to API with TanStack Query
  → Add optimistic updates for mutations
  → Test at 375px mobile width
  → Test in dark mode

Step 6: VERIFY
  → npx tsc --noEmit (0 errors)
  → npm run lint (0 errors)
  → npm test (all pass)
  → npm run build (succeeds)
  → Manual test: happy path, error path, mobile

Step 7: COMMIT + PUSH
  → git add [specific files]
  → git commit -m "feat: [description]"
  → git push -u origin feature/[name]

Step 8: UPDATE STRATEGY
  → Mark completed tasks in docs/strategy/[section]/tasks.md
  → Update version status in DevOps board if version complete
```

---

## 12. Bug Fix Workflow

```
Step 1: REPRODUCE
  → Can you reproduce the bug reliably? If not, get more info.
  → Write down exact steps to reproduce.

Step 2: UNDERSTAND
  → Find the root cause before writing any code.
  → Read the affected code completely.
  → Check git log for when it was introduced.

Step 3: MINIMAL FIX
  → Fix only the bug. Do not refactor surrounding code at the same time.
  → The smallest correct change is the best fix.

Step 4: VERIFY
  → The bug no longer reproduces.
  → No regressions (other things still work).
  → Edge cases are handled.

Step 5: TEST
  → Write a test that would have caught this bug.
  → Run the full test suite.

Step 6: COMMIT
  → git commit -m "fix: [what was broken and how it's fixed]"
  → Add the bug to DevOps board as "done" if it was tracked there.
```

---

## 13. Documentation Standards

### 13.1 Strategy Docs (docs/strategy/)
```
Every feature section has two files:
  audit.md   → current state vs. target state (what needs to change)
  tasks.md   → step-by-step implementation checklist

Task format:
  - [ ] Uncompleted task
  - [x] Completed task
  Never delete completed tasks — they form a history of what was built.
```

### 13.2 Code Comments
```
When to comment:
  ✅ Complex business logic ("commission is collected after 48h hold period")
  ✅ Non-obvious optimizations ("cache key includes user ID for personalization")
  ✅ Important constraints ("Stripe requires raw body for webhook verification")
  ✅ Security decisions ("JWT stored in memory only, not localStorage — XSS prevention")

When NOT to comment:
  ❌ Obvious code ("// return true")
  ❌ Commented-out code (delete it)
  ❌ TODO/FIXME (create a DevOps item)
```

### 13.3 API Documentation
Every new route added to `backend/routes/` must be documented in `docs/backend/API.md`:
```markdown
### POST /api/products

Create a new product listing.

**Auth:** Required  
**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | yes | Product name |
| price | number | yes | Price in platform currency |

**Response:** `201 Created` → Product object
**Errors:** `400` missing fields · `401` unauthenticated
```

---

## 14. Deployment Standards

### 14.1 Before Deploying
```
✅ All tests pass (npm test)
✅ TypeScript errors: 0 (npx tsc --noEmit)
✅ Lint errors: 0 (npm run lint)
✅ Build succeeds (npm run build)
✅ New environment variables are set in Railway/Vercel
✅ New migrations have been run (node db/migrate-all.js)
✅ No .env files in the commit
```

### 14.2 Deployment Process
```
1. Push to main branch
2. GitHub Actions runs CI (lint, typecheck, tests, build)
3. On success: Railway auto-deploys backend, Vercel auto-deploys frontend
4. Verify health: GET https://api.halehame.app/health → { status: "ok" }
5. Smoke test: log in, create a post, check feed
6. Monitor Sentry for 30 minutes after deployment
```

### 14.3 Rollback
```
If something breaks after deployment:
1. Revert the commit: git revert [commit-hash]
2. Push the revert commit to main
3. Railway/Vercel auto-deploys the revert
4. Investigate the issue before re-deploying
```

---

## 15. Performance Standards

### 15.1 Core Web Vitals Targets
```
LCP (Largest Contentful Paint):  < 2.5s  (measured on mobile, slow 4G)
INP (Interaction to Next Paint):  < 200ms
CLS (Cumulative Layout Shift):    < 0.1
TTFB (Time to First Byte):        < 800ms
```

### 15.2 Frontend Performance Rules
```
✅ All images use Next.js <Image> component
✅ Above-fold images have priority prop
✅ Images have explicit width + height (prevents CLS)
✅ Heavy libraries (Leaflet, Recharts) dynamically imported
✅ Every list item component wrapped in React.memo
✅ Infinite scroll uses useInfiniteQuery (cursor-based)
✅ No page bundle > 200KB gzipped
❌ Never import entire library: import _ from 'lodash'
✅ Always use: import { debounce } from 'lodash/debounce'
```

### 15.3 Backend Performance Rules
```
✅ All frequently-queried columns have indexes
✅ API responses include Cache-Control headers where appropriate
✅ Heavy computations offloaded to BullMQ queue
✅ DB queries use LIMIT (never fetch unlimited rows)
✅ Connection pooling: pg pool (already configured)
✅ Redis caching for trending/global data (5-minute TTL)
```

---

## 16. Review Checklist

Before every commit, run through this list:

### Code Quality
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] No `console.log` statements
- [ ] No `any` types
- [ ] No commented-out code blocks
- [ ] No hardcoded credentials or secrets

### Frontend
- [ ] Component has loading state (skeleton)
- [ ] Component has empty state (with CTA)
- [ ] Component has error state (with retry)
- [ ] Works at 375px screen width
- [ ] Works in dark mode
- [ ] All tap targets ≥ 44×44px
- [ ] Form uses React Hook Form + Zod
- [ ] Mutations use optimistic updates

### Backend
- [ ] All inputs validated and sanitized
- [ ] Auth middleware applied to protected routes
- [ ] Ownership checks on mutations
- [ ] Parameterized SQL queries only
- [ ] Errors caught and logged
- [ ] Proper HTTP status codes used

### Security
- [ ] No secrets in code
- [ ] User input sanitized
- [ ] Rate limiting in place for sensitive endpoints

### Tests
- [ ] Happy path test written
- [ ] Auth test written (if new route)
- [ ] Validation test written (if new route)
- [ ] All existing tests still pass

### Documentation
- [ ] Task marked complete in tasks.md
- [ ] New API endpoint documented in API.md (if applicable)
- [ ] Migration documented (if schema changed)

### Git
- [ ] Branch named correctly
- [ ] Commit message follows format
- [ ] Only relevant files staged (not `git add .` blindly)
- [ ] No build artifacts or .env committed

---

## Enforcement

This SOP is enforced through:

1. **CI/CD Pipeline** — TypeScript, lint, tests, and build checks run on every push. Nothing merges with failures.

2. **DevOps Board** — Every bug and feature is tracked. If it's not in the board, it doesn't get done.

3. **Strategy Docs** — Every feature follows the audit → tasks flow in `docs/strategy/`.

4. **Admin Panel** — Feature flags control what ships to users. No half-finished feature reaches production.

5. **Self-Accountability** — The Review Checklist in Section 16 is run before every commit. No exceptions.

---

*This SOP is a living document. When you discover a better way to do something, update this file and commit the change. The goal is not bureaucracy — it is quality.*

*"The only way to go fast is to go well." — Robert C. Martin*
