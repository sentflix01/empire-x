# API Documentation — Tasks

## Status: 🔴 Not Started

---

## Why This Is Critical

No developer will build on a platform without documentation.
Great API docs are the difference between 0 integrations and 100 integrations.

Reference standard: Stripe's API docs (the best in the industry).
Key qualities: clear, copy-paste examples, every endpoint documented,
multiple language examples, interactive playground.

---

## Step 1 — OpenAPI Specification

- [ ] Create `backend/openapi.yaml` — full OpenAPI 3.0 spec covering all routes:
  ```yaml
  openapi: "3.0.0"
  info:
    title: Nodbusiness API
    version: "1.0.0"
    description: |
      The Nodbusiness API lets you build on top of Africa's leading superapp.
      Integrate your tools, automate workflows, or build entirely new products.
    contact:
      email: developers@nodbusiness.app
      url: https://nodbusiness.vercel.app/developers
  servers:
    - url: https://nodbusiness.vercel.app/api
      description: Production
    - url: http://localhost:3001/api
      description: Local development
  security:
    - BearerAuth: []
  components:
    securitySchemes:
      BearerAuth:
        type: http
        scheme: bearer
        bearerFormat: API Key (hale_live_xxx) or JWT
  paths:
    /posts:
      get:
        summary: List feed posts
        ...
  ```

- [ ] Cover all 42+ routes with:
  - Summary and description
  - Request parameters (query, path, body)
  - Response schemas (200, 400, 401, 404, 500)
  - Authentication requirements
  - Rate limiting info

---

## Step 2 — Developer Docs Site

- [ ] Create `frontend-next/app/developers/docs/` — static doc pages:
  ```
  /developers/docs
    /getting-started      — create an API key, first request
    /authentication       — JWT vs API key, OAuth
    /rate-limits          — limits per tier
    /errors               — error codes and meanings
    /webhooks             — setup, events, security
    /oauth                — OAuth 2.0 flow
    /changelog            — API version history
    /sdks                 — code libraries (future)
    /api-reference/       — auto-generated from OpenAPI spec
      /posts
      /products
      /orders
      /showrooms
      /tasks
      /messages
      /users
      /wallet
      ...
  ```

---

## Step 3 — Getting Started Guide

The most important page in the entire docs:

- [ ] `GET /developers/docs/getting-started`:
  ```markdown
  # Getting Started with Nodbusiness API

  ## 1. Create an API key
  Go to your Dashboard → Developer → API Keys → Create New Key.
  Copy the key — it's shown only once.

  ## 2. Make your first request
  ```bash
  curl https://nodbusiness.vercel.app/api/posts \
    -H "Authorization: Bearer hale_live_YOUR_KEY"
  ```

  ## 3. You're in
  You just fetched the Nodbusiness feed. Now explore what you can build.
  ```

---

## Step 4 — Code Examples (Per Endpoint)

Every endpoint shows examples in:
- [ ] cURL
- [ ] JavaScript (fetch)
- [ ] Node.js (axios)
- [ ] Python (requests)

Example format:
```
### POST /api/products

Create a new product listing.

**Request:**
\`\`\`bash
curl -X POST https://nodbusiness.vercel.app/api/products \
  -H "Authorization: Bearer hale_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Habesha Kemis",
    "price": 1500,
    "currency": "ETB",
    "category": "fashion",
    "description": "Traditional handwoven Ethiopian dress"
  }'
\`\`\`

**Response (201 Created):**
\`\`\`json
{
  "id": "prod_abc123",
  "title": "Habesha Kemis",
  "price": 1500,
  "currency": "ETB",
  "status": "active",
  "created_at": "2026-08-13T10:00:00Z"
}
\`\`\`
```

---

## Step 5 — Interactive API Playground

- [ ] Install Swagger UI at `/developers/docs/playground`
  - Uses the `openapi.yaml` spec
  - Developer can paste their API key and make live calls
  - "Try it out" button on every endpoint
  - This is what Stripe, Twilio, and Plaid all have

---

## Step 6 — Error Reference

- [ ] Document every error code:
  ```
  400 VALIDATION_ERROR     → Request data is invalid. Check the errors array.
  401 UNAUTHORIZED         → No API key provided or key is invalid.
  403 FORBIDDEN            → Your key doesn't have permission for this action.
  404 NOT_FOUND            → The resource doesn't exist.
  409 CONFLICT             → Already exists (e.g. duplicate email).
  429 RATE_LIMITED         → Too many requests. See X-RateLimit-Reset header.
  500 SERVER_ERROR         → Something went wrong on our end. Retry in a moment.
  503 SERVICE_UNAVAILABLE  → We're temporarily down for maintenance.
  ```

---

## Step 7 — SDKs (Future)

- [ ] Plan for official SDK libraries:
  - `@nodbusiness/node` — Node.js SDK
  - `nodbusiness-python` — Python SDK
  - `nodbusiness-php` — PHP SDK
  - `@nodbusiness/react` — React hooks for Nodbusiness data

---

## Step 8 — Verify

- [ ] Every route in `backend/routes/` has a corresponding entry in `openapi.yaml`
- [ ] Swagger UI loads and shows all endpoints
- [ ] "Try it out" works with a real API key
- [ ] Getting started guide can be followed by a complete beginner in < 15 minutes
- [ ] Error codes match what the API actually returns
