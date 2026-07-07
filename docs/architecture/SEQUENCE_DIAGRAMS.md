# Empire X — Sequence Diagrams

> This file is the authoritative reference for key request flows.
> This file contains additional flows.

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
