# Nodbusiness — API Design Guidelines

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| HTTP | Hypertext Transfer Protocol |
| ID | Identifier |
| JSON | JavaScript Object Notation |
| JWT | JSON Web Token |
| PII | Personally Identifiable Information |
| REST | Representational State Transfer |
| SDK | Software Development Kit |
| SSL | Secure Sockets Layer |
| TLS | Transport Layer Security |
| UUID | Universally Unique Identifier |

---

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Consistency** | Same patterns everywhere — naming, errors, pagination, versioning |
| **Simplicity** | Minimal surface area, intuitive defaults, progressive disclosure |
| **Developer Experience** | Self-describing, great docs, great SDKs, sandbox environment |
| **Performance** | Efficient payloads, caching headers, conditional requests |
| **Security** | Auth on everything, least privilege, audit logging |
| **Evolution** | Versioned, backward compatible, clear deprecation policy |
| **Observability** | Request IDs, structured logs, metrics, tracing |

---

## 2. REST Conventions

### 2.1 Resource Naming

| Pattern | Example | Description |
|---------|---------|-------------|
| **Collections** | `GET /api/v1/products` | Plural, kebab-case |
| **Single Resource** | `GET /api/v1/products/{id}` | UUID in path |
| **Sub-resources** | `GET /api/v1/orders/{id}/items` | Nested under parent |
| **Actions (non-CRUD)** | `POST /api/v1/orders/{id}/cancel` | Verb in path, not HTTP method |
| **Search/Filter** | `GET /api/v1/products?q=shoes&category=footwear` | Query params |

### 2.2 HTTP Methods

| Method | Use Case | Idempotent |
|--------|----------|------------|
| **GET** | Retrieve resource(s) | Yes |
| **POST** | Create resource, complex actions | No |
| **PUT** | Full replace (rare) | Yes |
| **PATCH** | Partial update | No |
| **DELETE** | Remove resource | Yes |
| **HEAD** | Metadata only | Yes |
| **OPTIONS** | Discover capabilities | Yes |

### 2.3 Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| **200** | OK | Successful GET, PUT, PATCH |
| **201** | Created | Successful POST (returns resource) |
| **202** | Accepted | Async operation started |
| **204** | No Content | Successful DELETE, no body |
| **400** | Bad Request | Invalid input, validation failed |
| **401** | Unauthorized | Missing/invalid auth |
| **403** | Forbidden | Auth valid, insufficient permissions |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource conflict (duplicate, state) |
| **422** | Unprocessable Entity | Valid syntax, semantic error |
| **429** | Too Many Requests | Rate limited |
| **500** | Internal Server Error | Unexpected server error |
| **503** | Service Unavailable | Temporary overload/maintenance |

---

## 3. Request/Response Format

### 3.1 Envelope Standard

**Success Response:**
```json
{
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "version": "1.0",
    "timestamp": "2026-08-24T14:32:00Z"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "code": "INVALID_FORMAT", "message": "Invalid email format" }
    ],
    "request_id": "uuid"
  },
  "meta": {
    "version": "1.0",
    "timestamp": "2026-08-24T14:32:00Z"
  }
}
```

**List Response (Paginated):**
```json
{
  "data": [ { ... }, { ... } ],
  "pagination": {
    "cursor": "next_cursor_token",
    "has_more": true,
    "limit": 20,
    "total": 150
  },
  "meta": { ... }
}
```

### 3.2 Field Conventions

| Convention | Rule | Example |
|------------|------|---------|
| **Case** | snake_case for all fields | `created_at`, `user_id` |
| **IDs** | UUID v4 strings | `"id": "550e8400-e29b-41d4-a716-446655440000"` |
| **Timestamps** | ISO 8601 UTC | `"created_at": "2026-08-24T14:32:00Z"` |
| **Currency** | Integer minor units (cents) | `"amount": 2999` for $29.99 |
| **Decimals** | String (avoid float precision) | `"price": "29.99"` |
| **Booleans** | true/false (not 0/1) | `"is_active": true` |
| **Enums** | UPPER_SNAKE_CASE | `"status": "PENDING_PAYMENT"` |
| **Nulls** | Explicit null (not omitted) | `"deleted_at": null` |

---

## 4. Pagination

### 4.1 Cursor-Based (Preferred)

```http
GET /api/v1/products?limit=20&cursor=eyJpZCI6IjEyMyJ9
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6IjEyNCJ9",
    "has_more": true,
    "limit": 20
  }
}
```

### 4.2 Offset-Based (Legacy/Simple)

```http
GET /api/v1/products?page=2&limit=20
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

**Rule:** Default to cursor-based for all new endpoints. Offset only for simple admin lists.

---

## 5. Filtering, Sorting, Searching

### 5.1 Filtering

```http
GET /api/v1/products?category=electronics&price_min=1000&price_max=5000&status=active
```

| Pattern | Example | Description |
|---------|---------|-------------|
| **Exact** | `status=active` | Exact match |
| **Range** | `price_min=100&price_max=500` | Min/max |
| **In** | `category=electronics,clothing` | Comma-separated |
| **Prefix** | `name:prefix:shoe` | Starts with |
| **Boolean** | `featured=true` | true/false |

### 5.2 Sorting

```http
GET /api/v1/products?sort=-created_at,price
```

| Format | Meaning |
|--------|---------|
| `field` | Ascending |
| `-field` | Descending |
| `field1,-field2` | Multi-field |

### 5.3 Full-Text Search

```http
GET /api/v1/products?q=running+shoes&search_fields=name,description,tags
```

---

## 6. Versioning

### 6.1 URL Versioning (Required)

```http
GET /api/v1/products
GET /api/v2/products
```

### 6.2 Version Lifecycle

| Stage | Duration | Support |
|-------|----------|---------|
| **Current** | Active development | Full |
| **Deprecated** | 12 months notice | Security fixes only |
| **Sunset** | 6 months after deprecation | None |
| **Removed** | After sunset | 410 Gone |

### 6.3 Version Headers

```http
Accept: application/vnd.nodbusiness.v1+json
API-Version: 1
```

---

## 7. Authentication & Authorization

### 7.1 Authentication Methods

| Method | Use Case | Header |
|--------|----------|--------|
| **JWT (Access Token)** | User/API client auth | `Authorization: Bearer <jwt>` |
| **API Key** | Server-to-server, webhooks | `X-API-Key: <key>` |
| **HttpOnly Cookie** | Browser sessions | `Cookie: refresh_token=...` |

### 7.2 Authorization (RBAC)

| Header | Purpose |
|--------|---------|
| `X-User-Role` | `super_admin`, `admin`, `business_owner`, `team_member`, `customer` |
| `X-User-ID` | Current user UUID |
| `X-Business-ID` | Current business context (if applicable) |

---

## 8. Rate Limiting

### 8.1 Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1692883200
Retry-After: 60
```

### 8.2 Limits by Tier

| Tier | Requests/Minute | Burst |
|------|-----------------|-------|
| **Free** | 30 | 10 |
| **Starter** | 60 | 20 |
| **Pro** | 120 | 50 |
| **Business** | 300 | 100 |
| **Enterprise** | 1000 | 500 |
| **Webhooks** | 1000 | 200 |

---

## 9. Webhooks

### 9.1 Registration

```http
POST /api/v1/webhooks
{
  "url": "https://myapp.com/webhooks/nodbusiness",
  "events": ["order.created", "order.updated", "payment.completed"],
  "secret": "whsec_abc123"
}
```

### 9.2 Delivery

```http
POST https://myapp.com/webhooks/nodbusiness
Content-Type: application/json
X-Nodbusiness-Signature: sha256=abc123...
X-Nodbusiness-Timestamp: 1692883200
X-Nodbusiness-Event: order.created

{
  "id": "evt_abc123",
  "type": "order.created",
  "created_at": "2026-08-24T14:32:00Z",
  "data": { "order_id": "ord_123", ... }
}
```

### 9.3 Retry Policy

| Attempt | Delay | Max Retries |
|---------|-------|-------------|
| 1 | Immediate | - |
| 2 | 5 seconds | - |
| 3 | 30 seconds | - |
| 4 | 2 minutes | - |
| 5 | 10 minutes | 5 total |

**Signature Verification:**
```javascript
const expected = crypto.createHmac('sha256', secret)
  .update(`${timestamp}.${payload}`)
  .digest('hex');
```

---

## 10. File Uploads

### 10.1 Direct Upload (Presigned URL)

```http
POST /api/v1/uploads/presign
{
  "filename": "product.jpg",
  "content_type": "image/jpeg",
  "max_size": 5242880
}
```

**Response:**
```json
{
  "upload_url": "https://r2.nodbusiness.app/...",
  "fields": { "key": "...", "policy": "...", "signature": "..." },
  "expires_at": "2026-08-24T15:32:00Z",
  "public_url": "https://cdn.nodbusiness.app/..."
}
```

### 10.2 Constraints

| Constraint | Value |
|------------|-------|
| **Max Size** | 10MB (images), 50MB (documents) |
| **Allowed Types** | JPEG, PNG, WebP, PDF, CSV |
| **Blocked** | SVG, EXE, any executable |
| **Validation** | Magic bytes + extension + MIME |
| **Processing** | Auto-resize (Cloudflare Images), AVIF/WebP delivery |

---

## 11. Idempotency

### 11.1 Idempotency Keys

```http
POST /api/v1/orders
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{ ... }
```

### 11.2 Behavior

| Scenario | Behavior |
|----------|----------|
| **First request** | Process normally, store result with key |
| **Duplicate key (same params)** | Return cached result (200/201) |
| **Duplicate key (different params)** | 409 Conflict |
| **Key expiry** | 24 hours (configurable) |

---

## 12. Error Codes Reference

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `VALIDATION_ERROR` | 400 | Input validation failed | Fix input per `details` |
| `UNAUTHORIZED` | 401 | Missing/invalid token | Re-authenticate |
| `FORBIDDEN` | 403 | Insufficient permissions | Check role/ownership |
| `NOT_FOUND` | 404 | Resource doesn't exist | Verify ID |
| `CONFLICT` | 409 | Resource conflict | Handle per `details` |
| `IDEMPOTENCY_CONFLICT` | 409 | Same key, different params | Use new key |
| `RATE_LIMITED` | 429 | Too many requests | Wait `Retry-After` |
| `INTERNAL_ERROR` | 500 | Unexpected server error | Retry, contact support |
| `SERVICE_UNAVAILABLE` | 503 | Temporary overload | Retry with backoff |
| `FEATURE_DISABLED` | 503 | Feature flag OFF | Contact support |

---

## 13. SDK Patterns

### 12.1 TypeScript SDK

```typescript
import { NodbusinessClient } from '@nodbusiness/sdk';

const client = new NodbusinessClient({
  apiKey: 'sk_live_...',
  baseUrl: 'https://api.nodbusiness.app/v1'
});

// Typed, paginated, auto-retry
const products = await client.products.list({
  category: 'electronics',
  limit: 20
});

// Auto-retries with idempotency
const order = await client.orders.create({
  productId: 'prod_123',
  quantity: 2
}, { idempotencyKey: 'my-key' });
```

### 12.2 Error Handling

```typescript
try {
  await client.orders.create({ ... });
} catch (error) {
  if (error instanceof NodbusinessError) {
    switch (error.code) {
      case 'RATE_LIMITED':
        await delay(error.retryAfter * 1000);
        return retry();
      case 'VALIDATION_ERROR':
        showFormErrors(error.details);
        break;
    }
  }
  throw error;
}
```

---

## 13. OpenAPI / Documentation

### 13.1 Spec Location

- **Source:** `docs/api/openapi.yaml` (single source of truth)
- **Generated:** `https://api.nodbusiness.app/docs` (Scalar/Redoc)
- **SDK Generation:** `openapi-typescript-codegen` → `@nodbusiness/sdk`

### 13.2 Required Annotations

Every endpoint must have:
- `summary` (one line)
- `description` (markdown, examples)
- `operationId` (unique, camelCase)
- `security` (auth requirements)
- `parameters` (all query/path params)
- `requestBody` (schema + examples)
- `responses` (2xx, 4xx, 5xx with schemas)
- `tags` (categorization)

---

## 14. Testing Contracts

### 13.1 Contract Tests

```typescript
// Pact-style contract test
test('GET /api/v1/products returns paginated list', async () => {
  const response = await client.get('/api/v1/products?limit=10');
  
  expect(response.status).toBe(200);
  expect(response.body).toMatchSchema(ProductListSchema);
  expect(response.body.pagination).toHaveProperty('cursor');
  expect(response.body.pagination).toHaveProperty('has_more');
});
```

### 13.2 Schema Validation

- **Request:** Zod schema validation in middleware
- **Response:** Auto-generated from OpenAPI → TypeScript types
- **CI:** `npm run test:contract` on every PR

---

## 14. API Governance

| Process | Frequency | Owner |
|---------|-----------|-------|
| **Design Review** | New endpoints | API Guild (weekly) |
| **Breaking Change Review** | Before merge | API Guild + Tech Lead |
| **Deprecation Review** | Quarterly | API Guild + Product |
| **Schema Registry** | Every deploy | CI (breaking change detection) |
| **Docs Sync** | Every deploy | Automated (Scalar/Redoc) |

---

*These guidelines are mandatory for all API development. Deviations require API Guild approval.*

---

*Confidential. For Nodbusiness Technologies internal use only.*