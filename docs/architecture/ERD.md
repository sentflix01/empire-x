# Nodbusiness — Entity Relationship Diagram (ERD)

> Database conventions and useful queries live in `docs/backend/DATABASE.md`.
> This file focuses on the relationships between major entities.

---

## Core Relationships

```
users (1) ──────────────────────────────────────────────────────────────────────
  │                                                                             │
  │ 1:1  user_profiles          display_name, bio, avatar, ticker, location    │
  │                                                                             │
  │ 1:N  businesses             owner_id → businesses                          │
  │        │                                                                    │
  │        │ 1:N  products      business_id → products                         │
  │        │ 1:N  jobs          business_id → jobs                             │
  │        │ 1:N  courses       business_id → courses                          │
  │                                                                             │
  │ 1:N  showrooms              owner_id → showrooms                           │
  │        │                                                                    │
  │        │ 1:N  products      showroom_id → products                         │
  │                                                                             │
  │ 1:N  products               seller_id → products                           │
  │        │                                                                    │
  │        │ 1:N  product_variants     size, color, stock per variant          │
  │        │ 1:N  reviews             reviewer_id, rating, comment             │
  │        │ M:N  price_alerts        user_id, target_price, is_triggered      │
  │        │ M:N  cart_items          user_id, quantity                        │
  │        │ M:N  wishlists           user_id                                  │
  │                                                                             │
  │ 1:N  orders                 buyer_id / seller_id → orders                  │
  │        │                                                                    │
  │        │ 1:N  delivery_updates    status, location, timestamp              │
  │        │ 1:N  return_requests     reason, refund_amount                    │
  │        │ 1:1  commissions         3% of order total                        │
  │                                                                             │
  │ 1:N  tasks                  requester_id → tasks                           │
  │        │                                                                    │
  │        │ 1:N  task_bids           bidder_id, bid_amount, status            │
  │                                                                             │
  │ 1:N  posts                  author_id → posts                              │
  │        │                                                                    │
  │        │ 1:N  comments            author_id, content                       │
  │        │ M:N  likes               user_id, target_type='post'              │
  │        │ M:N  hashtags            via post_hashtags junction               │
  │        │ 1:N  poll_votes          user_id, option_id                       │
  │                                                                             │
  │ M:N  follows                follower_id ↔ followed_id (self-referential)   │
  │                                                                             │
  │ M:N  conversations          via participant_ids JSON array                 │
  │        │                                                                    │
  │        │ 1:N  messages            sender_id, content, type                 │
  │                                                                             │
  │ 1:1  wallets                balance, currency                              │
  │        │                                                                    │
  │        │ 1:N  wallet_transactions credit/debit/withdrawal/refund           │
  │                                                                             │
  │ 1:N  notifications          type, title, body, link, is_read               │
  │ 1:N  saves                  target_id, target_type (bookmarks)             │
  │ 1:N  stories                media_url, expires_at (24hr)                   │
  │        │                                                                    │
  │        │ M:N  story_views         viewer_id                                │
  │                                                                             │
  │ 1:N  events                 organizer_id → events                          │
  │        │                                                                    │
  │        │ M:N  event_tickets       user_id, status                          │
  │                                                                             │
  │ 1:N  jobs                   poster_id → jobs                               │
  │        │                                                                    │
  │        │ 1:N  job_applications    applicant_id, cover_letter, status       │
  │                                                                             │
  │ 1:N  courses                creator_id → courses                           │
  │        │                                                                    │
  │        │ 1:N  course_lessons      title, video_url, position               │
  │        │ M:N  course_enrollments  user_id, progress%                       │
  │                                                                             │
  │ 1:N  coupons                seller_id → coupons                            │
  │ 1:N  push_subscriptions     endpoint, p256dh, auth                         │
  │ 1:N  point_transactions     earn/spend/expire                              │
  │ 1:N  reports                target_id, target_type, reason                 │
  │ M:N  blocks                 blocker_id ↔ blocked_id                        │
  │                                                                             │
  │ 1:N  mewacho_groups         created_by → mewacho_groups                    │
  │        │                                                                    │
  │        │ M:N  mewacho_members      role (admin/moderator/member)           │
  │        │ 1:N  mewacho_contributions amount, stripe_session_id, status      │
  │        │ 1:N  mewacho_withdrawals   amount, destination, approval workflow │
  │        │ 1:N  mewacho_activity      type (contribution/message/withdrawal/ │
  │        │                            system), content, metadata JSONB       │
```

---

## Key Cardinalities

| Relationship | Type | Notes |
|---|---|---|
| user → user_profile | 1:1 | One profile per account |
| user → businesses | 1:N | One user can own multiple businesses |
| business → products | 1:N | A business can list many products |
| product → variants | 1:N | Size XL Red = one variant row |
| user → orders (as buyer) | 1:N | All purchases |
| user → orders (as seller) | 1:N | All sales |
| order → commissions | 1:1 | One commission per completed order |
| user → follows (as follower) | 1:N | Users you follow |
| user → follows (as followed) | 1:N | Your followers |
| user → conversations | M:N | `participant_ids` JSON array |
| user → wallet | 1:1 | One wallet per user, auto-created |
| user → mewacho_groups (as creator) | 1:N | Groups the user created |
| user → mewacho_members | M:N | Groups the user belongs to (via mewacho_members) |
| mewacho_group → contributions | 1:N | All contributions to a group |
| mewacho_group → withdrawals | 1:N | All withdrawal requests |
| mewacho_group → activity | 1:N | Ordered chat + event feed |

---

## Polymorphic Tables

These tables store references to different entity types:

| Table | `target_type` values | Used for |
|---|---|---|
| `likes` | `post`, `product`, `showroom` | Unified like system |
| `saves` | `post`, `product`, `showroom`, `task` | Bookmarks |
| `reports` | `user`, `post`, `product`, `comment`, `message` | Content moderation |

---

## Database Conventions

| Convention | Rule |
|---|---|
| Primary key | UUID, `gen_random_uuid()` |
| Timestamps | `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` on all tables |
| Mutable tables | Also have `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| Foreign keys | `ON DELETE CASCADE` for required child records |
| Optional FKs | `ON DELETE SET NULL` (e.g., `product_id` on orders) |
| Unique constraints | Enforce business rules (e.g., `UNIQUE(user_id, product_id)` on wishlists) |
| Denormalized counters | `like_count`, `follower_count`, `review_count` updated in-place for read performance |
| Geo columns | `latitude NUMERIC(10,7)`, `longitude NUMERIC(10,7)` — no PostGIS dependency yet |
| No soft deletes | Records are hard-deleted; `reports` table handles abuse tracking |
