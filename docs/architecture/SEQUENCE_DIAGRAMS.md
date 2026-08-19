# Nodbusiness — Sequence Diagrams

> Authoritative reference for key request flows in the Nodbusiness platform.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| JWT | JSON Web Token |
| OTP | One-Time Password |
| DB | Database |
| WS | WebSocket |
| CDN | Content Delivery Network |
| ETB | Ethiopian Birr — reference market currency |
| COD | Cash on Delivery |
| UI | User Interface |
| AI | Artificial Intelligence |
| GPS | Global Positioning System |

---
## Payment Flow (Chapa — planned)

```
User             Frontend         Backend          Chapa           DB
 │                  │                │               │              │
 │─ click Pay ─────▶│                │               │              │
 │                  │─POST /checkout/chapa           │              │
 │                  │                │─ initiate ───▶│              │
 │                  │                │◀─ { checkout_url }           │
 │                  │◀─ { url } ─────│               │              │
 │◀─ redirect ──────│                │               │              │
 │ [user pays on Chapa page]         │               │              │
 │                  │    Chapa Webhook → POST /api/orders/chapa-webhook
 │                  │                │               │              │
 │                  │                │─ verify sig──▶│              │
 │                  │                │◀─ payment confirmed          │
 │                  │                │─ UPDATE order status=paid ──▶│
 │                  │                │─ send confirmation email     │
 │◀─ redirect success page ─────────│               │              │
```

---

## AI Product Description Generation

```
Seller           Frontend         Backend          OpenAI/Gemini
 │                  │                │               │
 │─ type title ────▶│                │               │
 │─ click Generate─▶│                │               │
 │                  │─POST /api/ai/generate          │
 │                  │                │─ prompt ─────▶│
 │                  │                │◀─ description─│
 │                  │◀─ { text } ────│               │
 │◀─ filled field ──│                │               │
```

---

## Return Request Flow

```
Buyer            Frontend         Backend          Seller           Wallet
 │                  │                │               │               │
 │─ request return─▶│                │               │               │
 │                  │─POST /api/returns              │               │
 │                  │                │─INSERT return_request ───────▶│
 │                  │                │─notify seller ───────────────▶│
 │                  │◀─ 201 ─────────│               │               │
 │                  │                │               │               │
 │                  │                │  Seller reviews               │
 │                  │                │◀─PUT /api/returns/:id {approved}
 │                  │                │─UPDATE return status=approved │
 │                  │                │─POST /api/wallet/refund ─────▶│
 │                  │                │                               │─ credit buyer
 │                  │                │─notify buyer                  │
```

---

## Nearby Map Search

```
User             Frontend         Backend          PostgreSQL
 │                  │                │               │
 │─ open Nearby ───▶│                │               │
 │                  │─GET /api/maps/nearby?lat=9&lng=38&radius=5
 │                  │                │─ SELECT products WHERE ST_Distance < radius
 │                  │                │  (using latitude/longitude indexes)
 │                  │                │◀─ [{products with distance}]
 │                  │◀─ products ────│               │
 │◀─ pins on map ───│                │               │
 │                  │                │               │
 │─ hover pin ─────▶│                │               │
 │                  │─GET /api/profiles/by-user/:id  │
 │                  │◀─ profile data─│               │
 │◀─ ProfilePeek ───│                │               │
```
