# Nodbusiness Messaging System — Professional Audit & Specification

**Status:** Engineering Review Document  
**Compiled:** 2026-10  
**Scope:** Full audit of the Nodbusiness messaging system against 2025 industry standards, with implementation roadmap and architecture recommendations.  
**Stack:** Next.js / React / TypeScript (frontend); Node.js / Express / Socket.IO / PostgreSQL (backend); primary market: Ethiopia (mobile-first, variable connectivity); use case: social-commerce (Instagram + WhatsApp + Shopify hybrid).

**Source files reviewed:**
- `backend/routes/messages.ts` — REST API
- `backend/socket.ts` — Socket.IO server
- `backend/lib/messaging.ts` — Business logic
- `project-brain/messaging_research_raw.md` — Industry research (2025)

---

## 1. Executive Summary

The Nodbusiness messaging system has a solid, production-grade foundation: full REST API for conversations and messages, Socket.IO with optional Redis adapter for real-time delivery, JWT authentication, Clef content moderation, presence, read receipts, typing indicators, mute, archive, message requests, and push notifications. The core DM/Group/Channel model with 256-member groups is complete and well-architected.

However, five critical gaps block real business use of the platform as a commerce messaging tool. There are **no message reactions** (a table-stakes feature since 2022 on every major platform), **no full-text message search** (merchants cannot find past orders or customer conversations), **no voice messages** (the dominant format for mobile users in the Ethiopian market), **no product card or order update message types** (the core commerce differentiation that justifies building a proprietary messaging system over using WhatsApp Business), and **no @mention notifications** for group business chats (required for any multi-staff merchant operation). Additionally, pin message and save message are frontend localStorage stubs — they are not persisted to the backend and will disappear on device change, making them functionally unreliable. The translation button is a UI stub with no backend implementation.

The recommended investment order is: (1) unblock commerce use by adding search, reactions, and product card messages; (2) reach competitive parity with WhatsApp by adding voice messages, @mentions, and disappearing messages; (3) build genuine commerce differentiation through analytics dashboards, chatbot/agent handoff, and broadcast campaigns; (4) revisit scale infrastructure (ClickHouse, Typesense, E2EE opt-in) when growth signals require it.

---

## 2. Current Capability Matrix

| Feature | Status | Gap Score | Priority |
|---|---|---|---|
| **1. Message Reactions** | ❌ Missing | MISSING | P1 |
| **2. Voice Messages** | ❌ Missing | MISSING | P1 |
| **3. Message Search** | ❌ Missing | MISSING | P0 |
| **4. Disappearing Messages** | ❌ Missing | MISSING | P2 |
| **5. Message Threads / Reply** | ⚠️ Partial | PARTIAL | P1 |
| **6. Encryption** | ⚠️ Partial | PARTIAL | P2 |
| **7. Multimedia in Chat** | ⚠️ Partial | PARTIAL | P1 |
| **8. @Mention Notifications** | ❌ Missing | MISSING | P1 |
| **9. Status Indicators** | ✅ Implemented | GOOD | P2 |
| **10. Business Messaging Patterns** | ⚠️ Partial | PARTIAL | P0 |
| **11. Pagination & Offline** | ⚠️ Partial | PARTIAL | P0 |
| **12. Spam & Moderation** | ⚠️ Partial | PARTIAL | P1 |
| **13. Accessibility** | ⚠️ Partial | PARTIAL | P1 |
| **14. Analytics** | ❌ Missing | MISSING | P1 |

**Gap Score key:** EXCELLENT (matches or exceeds industry leaders) / GOOD (meets 2025 baseline) / PARTIAL (core present, key features missing) / MISSING (not implemented)

---

## 3. Detailed Gap Analysis

### 3.1 Message Reactions

**What we have:** Nothing. No `message_reactions` table, no reaction endpoints, no reaction Socket.IO events, no reaction UI in `ChatRoom.tsx` or `Messages.tsx`.

**Industry benchmark:** WhatsApp adopted 6 curated reactions in 2022, expanded to full emoji picker in 2023 (source: engineering.fb.com). Telegram allows any emoji including animated premium reactions. Slack supports any Unicode emoji plus custom workspace emoji with per-reaction counts and a "who reacted" popover. The 2025 norm is a fixed short list of 6–8 for tap, plus a `+` button opening a full emoji picker. Reaction counts are displayed inline; tapping counts opens a "who reacted" sheet. (Sources: messaging_research_raw.md §1; api.slack.com/messaging/reactions; signal.org/blog)

**Specific gaps identified:**
1. No `message_reactions` table in the schema.
2. No `POST /api/messages/:id/reactions` or `DELETE /api/messages/:id/reactions/:emoji` endpoints.
3. No `reaction_added` / `reaction_removed` Socket.IO events.
4. No denormalized reactions JSONB cache on the `messages` table (required for performant rendering).
5. No reaction UI component (emoji bar, count badges, who-reacted sheet).
6. No notification to the message author when their message is reacted to.

**Recommended implementation approach:**

Schema additions:
```sql
CREATE TABLE message_reactions (
  id          BIGSERIAL PRIMARY KEY,
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)  -- Slack-style: multiple emoji per user per message
);
CREATE INDEX ON message_reactions (message_id);
CREATE INDEX ON message_reactions (user_id);

-- Add denormalized cache to messages table:
ALTER TABLE messages ADD COLUMN reactions JSONB DEFAULT '{}';
-- Example value: {"❤️": 3, "👍": 1}
```

New REST endpoints (add to `backend/routes/messages.ts`):
```
POST   /api/messages/:id/reactions   { emoji: string }   → 201 { reactions: JSONB }
DELETE /api/messages/:id/reactions/:emoji                 → 204
GET    /api/messages/:id/reactions   ?page&limit          → [{ emoji, count, users: [...] }]
```

Socket.IO events (add to `backend/socket.ts` emitters):
```typescript
// New emitter functions:
export function emitReactionAdded(conversationId: string, payload: {
  messageId: string; userId: string; emoji: string; reactions: Record<string, number>;
}): void {
  ioInstance?.to(`conv:${conversationId}`).emit('reaction_added', payload);
}
export function emitReactionRemoved(conversationId: string, payload: {
  messageId: string; userId: string; emoji: string; reactions: Record<string, number>;
}): void {
  ioInstance?.to(`conv:${conversationId}`).emit('reaction_removed', payload);
}
```

Frontend components needed:
- `MessageReactionBar` — renders up to 8 curated emoji + a `+` button
- `ReactionBubble` — shows emoji + count inline on each message bubble
- `WhoReactedSheet` — bottom sheet listing per-emoji reactors

**Estimated complexity:** M (1–3 days for backend + basic UI; L if full emoji picker and who-reacted sheet are included)

---

### 3.2 Voice Messages

**What we have:** Nothing. `MESSAGE_TYPES` in `lib/messaging.ts` is `['text', 'image', 'file']`. No voice recording UI, no waveform component, no audio playback in the chat.

**Industry benchmark:** Voice messages are standard in WhatsApp, Telegram, iMessage, WeChat, Instagram DMs, and Signal. WhatsApp encodes to Opus in Ogg container (~6 kbps for speech), shows a static waveform of ~100 amplitude samples, displays duration, and supports 1×/1.5×/2× playback speed (source: messaging_research_raw.md §2). WhatsApp is the dominant messaging app in Ethiopia; voice notes are used heavily due to low literacy rates relative to high smartphone penetration. This is not a nice-to-have — it is a baseline expectation for the Ethiopian market. (Source: messaging_research_raw.md §2; RFC 6716 Opus codec)

**Specific gaps identified:**
1. `MESSAGE_TYPES` enum does not include `'voice'`.
2. No `duration_ms` or `waveform` columns on the `messages` table.
3. No `MediaRecorder`-based voice recording component.
4. No waveform visualization component.
5. No playback speed control.
6. No server-side Opus normalization pipeline.
7. No transcription (async, via Whisper or AWS Transcribe).

**Recommended implementation approach:**

Schema additions to `messages` table:
```sql
ALTER TABLE messages ADD COLUMN duration_ms INT;
ALTER TABLE messages ADD COLUMN waveform SMALLINT[];
ALTER TABLE messages ADD COLUMN transcription TEXT;
```

Add `'voice'` to the `MESSAGE_TYPES` constant in `lib/messaging.ts`:
```typescript
export const MESSAGE_TYPES = ['text', 'image', 'file', 'voice'] as const;
```

Update `messagePreview` in `lib/messaging.ts`:
```typescript
export function messagePreview(type: string, content: string): string {
  if (type === 'image') return '📷 Photo';
  if (type === 'file') return '📎 File';
  if (type === 'voice') return '🎤 Voice message';
  return content.replace(/\s+/g, ' ').trim().slice(0, 200);
}
```

Send endpoint already accepts `type` from the request body; add validation for `voice` type with `media_url`, `duration_ms`, and `waveform` fields in the route handler.

New Socket.IO event for async transcription completion:
```typescript
// Emit when transcription job finishes:
export function emitMessageUpdated(conversationId: string, patch: {
  id: string; transcription?: string;
}): void {
  ioInstance?.to(`conv:${conversationId}`).emit('message_updated', patch);
}
```

Frontend components needed:
- `VoiceRecorder` — hold-to-record button using `MediaRecorder` API, samples waveform via Web Audio API every 50ms
- `VoiceMessageBubble` — waveform bar chart, duration, play/pause, 1×/1.5×/2× speed selector, optional transcript

**Estimated complexity:** L (1–2 weeks — browser MediaRecorder + waveform UI + server pipeline)

---

### 3.3 Message Search

**What we have:** Nothing. No search endpoint. No `search_vector` column on `messages`. The frontend has no search UI.

**Industry benchmark:** WhatsApp supports in-conversation full-text search; Telegram has cross-chat search with sender/date/type filters; Slack is the gold standard with faceted cross-workspace search and highlighted snippets. PostgreSQL's built-in FTS (`tsvector` / `tsquery`) is production-grade for up to ~50M messages with zero new infrastructure. For Nodbusiness at current scale, this is the correct starting point. Critical addition: `pg_trgm` extension for fuzzy matching and Amharic romanization support, since the primary market uses Ethiopic script. (Sources: messaging_research_raw.md §3; postgresql.org/docs/current/textsearch.html; typesense.org/docs)

**Specific gaps identified:**
1. No `search_vector TSVECTOR` column on `messages`.
2. No GIN index on `search_vector`.
3. No trigger to keep `search_vector` updated on insert/update.
4. No `GET /api/search/messages` endpoint.
5. No cross-conversation search (scoped to the authenticated user's conversations).
6. No Amharic / `simple` dictionary configuration.
7. No "jump to message" feature in the chat (bidirectional cursor load around a target message ID).

**Recommended implementation approach:**

Migration (add to the migrations folder as the next sequential migration):
```sql
-- Enable pg_trgm for fuzzy / transliterated Amharic matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE messages ADD COLUMN search_vector TSVECTOR;

-- Populate for existing messages (run in batches for large tables)
UPDATE messages
  SET search_vector = to_tsvector('simple', COALESCE(content, ''));

-- GIN index
CREATE INDEX messages_fts_idx ON messages USING GIN (search_vector);
-- Also add trigram index for Amharic romanization:
CREATE INDEX messages_trgm_idx ON messages USING GIN (content gin_trgm_ops);

-- Trigger
CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_search_vector_trig
BEFORE INSERT OR UPDATE OF content ON messages
FOR EACH ROW EXECUTE FUNCTION messages_search_vector_update();
```

New REST endpoint (add to `backend/routes/messages.ts`):
```
GET /api/search/messages?q=<query>&conversationId=<id>&scope=conversation|all&page=1&limit=20
```

Response shape:
```typescript
{
  messages: Array<{
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    snippet: string;       // HTML with <mark> highlights
    created_at: string;
    conversation_name?: string;
  }>;
  total: number;
  nextPage: number | null;
}
```

Security: always join with `conversation_participants` to ensure the requesting user has access to every message returned. Never return messages from conversations the user is not a member of.

**Estimated complexity:** M (1–3 days — migration + endpoint + basic frontend search bar)

---

### 3.4 Disappearing Messages

**What we have:** Nothing. No `expires_at` column on messages. No `disappear_timer_seconds` on conversations. No cleanup job.

**Industry benchmark:** Signal pioneered this in 2016. WhatsApp added 7-day (2020), 24-hour and 90-day (2021). Telegram offers 24h/7d/1 month Auto-Delete. The 2025 baseline is: at minimum 24h, 7d, and off. For a commerce platform, disappearing messages must be disabled for system/order messages to preserve audit trails. (Sources: messaging_research_raw.md §4; signal.org/docs/specifications/disappearing_messages; faq.whatsapp.com/general/chats/about-disappearing-messages)

**Specific gaps identified:**
1. No `expires_at TIMESTAMPTZ` column on `messages`.
2. No `disappear_timer_seconds INT` column on `conversations`.
3. No BullMQ scheduled cleanup job for expired messages.
4. No `PATCH /api/conversations/:id` support for setting the disappear timer.
5. No Socket.IO event informing clients when messages are auto-deleted.
6. No guard to prevent disappearing mode on `system` and `order_update` message types.

**Recommended implementation approach:**
```sql
ALTER TABLE messages ADD COLUMN expires_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN disappear_timer_seconds INT; -- NULL = off
CREATE INDEX ON messages (expires_at) WHERE expires_at IS NOT NULL;
```

BullMQ repeatable job (`backend/jobs/expireMessages.ts`):
```typescript
// Runs every 60 seconds
const expired = await pool.query(
  `DELETE FROM messages WHERE expires_at < NOW()
   AND type NOT IN ('system', 'order_update')
   RETURNING id, conversation_id`
);
// Group by conversation_id, call emitMessageDeleted for each
```

PATCH endpoint: extend `PUT /api/conversations/:id` to accept `disappear_timer_seconds: number | null`.

**Estimated complexity:** M (1–3 days)

---

### 3.5 Message Threads / Reply

**What we have:** `reply_to_id` column exists on `messages`. The frontend has reply UI. However, the `reply_to_id` is stored but the API does not return a joined preview of the replied-to message — the frontend must do a second fetch or the message list response omits the quoted context. There is no per-reply notification to the quoted message's author.

**Industry benchmark:** WhatsApp and Telegram both include the full replied-to message snippet inline in the API response, so no second fetch is needed. Slack adds full thread panels (P3 for Nodbusiness). The quote-reply model (inline preview, not a separate thread panel) is the correct choice for a mobile-first commerce platform. (Sources: messaging_research_raw.md §5; faq.whatsapp.com)

**Specific gaps identified:**
1. The `GET /api/conversations/:convId/messages` query does not JOIN `messages r ON r.id = m.reply_to_id` to return a `reply_to` preview object.
2. No notification is created for the author of the quoted message.
3. No `reply_to` object included in the `new_message` Socket.IO event.

**Recommended implementation approach:**

Modify the message list query in `backend/routes/messages.ts` to include the reply preview:
```sql
SELECT
  m.*,
  json_build_object(
    'id', r.id,
    'content', r.content,
    'type', r.type,
    'sender_id', r.sender_id,
    'sender_name', r.sender_name
  ) AS reply_to
FROM messages m
LEFT JOIN messages r ON r.id = m.reply_to_id
WHERE m.conversation_id = $1 AND ...
```

In `deliver()` in `backend/routes/messages.ts`, after inserting the message, check if `reply_to_id` is set and notify the original message's author (unless they are the sender):
```typescript
if (fields.reply_to_id) {
  const { rows: [orig] } = await pool.query(
    'SELECT sender_id FROM messages WHERE id = $1', [fields.reply_to_id]
  );
  if (orig && orig.sender_id !== senderId) {
    // insertMessageNotifications for the quoted message author
  }
}
```

Include `reply_to` snippet in the `emitNewMessage` payload so receivers render context immediately.

**Estimated complexity:** S (< 1 day — query join + notification logic)

---

### 3.6 Encryption

**What we have:** TLS in transit (standard). No server-side encryption at rest for message content. No E2EE. The `content` column in `messages` is plaintext in PostgreSQL.

**Industry benchmark:** WhatsApp personal uses Signal Protocol (E2EE). WhatsApp Business API does NOT E2E encrypt between business backend and WhatsApp servers — businesses accept this trade-off. Telegram regular chats are server-side encrypted (not E2E). For a commerce platform, E2EE conflicts with: server-side search, content moderation (Clef), CRM integrations, analytics, and lawful access requirements. The correct 2025 baseline for Nodbusiness is server-side AES-256-GCM encryption at rest with a KMS-managed key. (Sources: messaging_research_raw.md §6; NIST SP 800-38D; developers.facebook.com/docs/whatsapp/security)

**Specific gaps identified:**
1. Message `content` is stored as plaintext — a database breach exposes all message history.
2. No KMS integration (AWS KMS / HashiCorp Vault) for key management.
3. No `encryption_key_id` on the `messages` table for key rotation support.
4. No privacy policy disclosure about server-accessible message storage.

**Recommended implementation approach:**

This is an infrastructure change that requires careful staging. Implement application-layer AES-256-GCM encryption (Node.js `crypto` module) before storing `content`, decrypting on read. Store the key ID (not the key) alongside each message for rotation support:

```sql
ALTER TABLE messages
  ADD COLUMN encryption_key_id UUID,
  ADD COLUMN content_iv BYTEA;  -- 12-byte GCM IV, stored per message
```

Application layer (in `deliver()` before the INSERT):
```typescript
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', currentKey, iv);
const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();
// Store encrypted + authTag concatenated as content, iv separate
```

**Note:** Do NOT implement Signal Protocol E2EE. It would break search (§3.3), Clef moderation, analytics (§3.14), and any future chatbot features. Record this trade-off in `project-brain/DECISIONS.md`.

**Estimated complexity:** L (1–2 weeks — KMS setup, migration, key rotation strategy)

---

### 3.7 Multimedia in Chat

**What we have:** Image upload via `uploadFile` lib, file messages (`type: 'image' | 'file'`), image viewer in frontend. No video support. No multi-image album. No link preview (URL unfurling). No thumbnail generation pipeline. No LQIP (low quality image placeholder) blur-up loading.

**Industry benchmark:** WhatsApp and Telegram send up to 10 images as a single album rendered as a grid. Video is universal (WhatsApp auto-plays short clips muted). Link preview (Open Graph unfurling) is present in WhatsApp, Telegram, Slack, iMessage — it is a baseline feature, not a premium one. Server-side thumbnail generation prevents clients from downloading full-resolution images just to render chat list previews. (Sources: messaging_research_raw.md §7; ogp.me; sharp.pixelplumbing.com)

**Specific gaps identified:**
1. No `message_media` table — single image attachment is stored as `content` (URL), not as a proper media record.
2. No multi-image album support (`type: 'album'`).
3. No video message type or thumbnail generation.
4. No link preview service (`POST /api/link-preview`).
5. No presigned URL upload flow — images are uploaded via `uploadFile` lib (unclear if it bypasses the Node.js process; if not, large uploads will block the event loop).
6. No LQIP loading in the chat view.
7. No media gallery (view all media shared in a conversation).

**Recommended implementation approach:**

Schema:
```sql
CREATE TABLE message_media (
  id            BIGSERIAL PRIMARY KEY,
  message_id    UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('image','video','audio','document','link_preview')),
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type     TEXT,
  file_size     BIGINT,
  width         INT,
  height        INT,
  duration_ms   INT,
  filename      TEXT,
  og_title      TEXT,
  og_description TEXT,
  og_site       TEXT,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON message_media (message_id);
```

New endpoints:
```
POST /api/media/presign    { filename, mimeType, size }  → { uploadUrl, fileKey }
POST /api/link-preview     { url }                       → { title, description, image, siteName }
GET  /api/conversations/:id/media                        → paginated list of all media in the conversation
```

Add `'video'` and `'album'` to `MESSAGE_TYPES` in `lib/messaging.ts`. Update `messagePreview` accordingly.

**Estimated complexity:** L (1–2 weeks for full pipeline; S for link preview alone)

---

### 3.8 @Mention Notifications

**What we have:** Nothing. No `message_mentions` table. No mention parsing in `deliver()`. No autocomplete API for group member lookup by query. No mention notification type. Group messages with `@username` text are delivered as plain text with no differentiation.

**Industry benchmark:** Mentions are universal in group chats: Slack, Discord, Telegram, WhatsApp (groups only), Instagram. The 2025 behavior: `@` trigger opens a member picker with fuzzy autocomplete; selected mentions are stored as structured references (not just display text); the mentioned user receives a notification even if the conversation is muted; the mention is highlighted in the rendered message. (Sources: messaging_research_raw.md §8; api.slack.com/reference/block-kit/composition-objects#text; tiptap.dev)

**Specific gaps identified:**
1. No `message_mentions` table.
2. No mention extraction in `deliver()` (parse `@username`, resolve to user IDs, insert into `message_mentions`).
3. No `mentions: string[]` (user ID array) in the `new_message` Socket.IO event payload.
4. No `GET /api/conversations/:id/members?q=<query>` autocomplete endpoint.
5. No `mention` notification type — mentioned users receive generic message notifications.
6. Muted conversations do not bypass for mention notifications (should mirror Slack/WhatsApp behavior).

**Recommended implementation approach:**

Schema:
```sql
CREATE TABLE message_mentions (
  id          BIGSERIAL PRIMARY KEY,
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (message_id, user_id)
);
CREATE INDEX ON message_mentions (user_id);
```

In `deliver()` in `backend/routes/messages.ts`, after inserting the message:
```typescript
// Parse @username patterns, resolve to user IDs
const usernamePattern = /@(\w+)/g;
const mentionedUsernames = [...fields.content.matchAll(usernamePattern)].map(m => m[1]);
if (mentionedUsernames.length) {
  const { rows: mentioned } = await pool.query(
    `SELECT user_id, username FROM user_profiles
     WHERE username = ANY($1::text[]) AND user_id = ANY($2::uuid[])`,
    [mentionedUsernames, ids]  // scope to conversation members
  );
  if (mentioned.length) {
    const vals = mentioned.map((_: unknown, i: number) => `($${i*2+1}, $${i*2+2})`).join(',');
    await pool.query(
      `INSERT INTO message_mentions (message_id, user_id) VALUES ${vals} ON CONFLICT DO NOTHING`,
      mentioned.flatMap((m: { user_id: string }) => [message.id, m.user_id])
    );
    // Notify mentioned users even if muted
    await notify(mentioned.map((m: { user_id: string }) => m.user_id), `${senderName} mentioned you`);
  }
}
```

Include `mentions: string[]` in the `emitNewMessage` payload.

New autocomplete endpoint:
```
GET /api/conversations/:id/members?q=alice&limit=10
→ [{ userId, displayName, username, avatarUrl }]
```

**Estimated complexity:** M (1–3 days)

---

### 3.9 Status Indicators

**What we have:** Presence (online/offline/away) with follower-scoped fan-out in `socket.ts` (excellent architecture). `last_delivered_at` and `last_read_at` in the `conversation_participants` table. `MessageTicks` component for dual-tick UI. Privacy: `read_receipts` opt-in per user. The follower-scoped fan-out approach in `emitPresenceUpdated` correctly avoids the N×M broadcast problem.

**Industry benchmark:** Online/offline dot and "last seen" with privacy toggle is the 2025 baseline. WhatsApp-style ephemeral stories are in scope for the social layer (not the messaging module). Slack-style custom status with emoji + expiry is differentiating for a business platform. (Sources: messaging_research_raw.md §9; redis.io/docs; socket.io/docs/v4/rooms)

**Specific gaps identified:**
1. `memPresence` in `routes/messages.ts` is an in-memory `Map` — does not survive process restart or multi-instance deployment.
2. No `heartbeat` mechanism — online presence relies on socket connection only; users in background tabs appear offline.
3. No "last seen X minutes ago" display in the frontend (only online/offline dot).
4. No Slack-style custom status (`status_text`, `status_emoji`, `status_expires_at` on `user_profiles`).

**Recommended implementation approach:**

Move `memPresence` to Redis:
```typescript
// In PUT /presence route: set key with TTL
await redis.set(`presence:${userId}`, JSON.stringify({ status, last_seen: new Date() }), 'EX', 300);
```

Add heartbeat endpoint:
```
POST /api/users/heartbeat   → 200  (resets presence TTL)
```

Columns for custom status (optional, P3):
```sql
ALTER TABLE user_profiles
  ADD COLUMN status_text TEXT,
  ADD COLUMN status_emoji TEXT,
  ADD COLUMN status_expires_at TIMESTAMPTZ;
```

**Estimated complexity:** S (< 1 day for Redis persistence; M for custom status)

---

### 3.10 Business Messaging Patterns

**What we have:** Basic DM/Group/Channel conversations. System message capability is not present as a first-class type. No product card message type. No order update messages. No quick reply buttons. No chatbot/agent handoff. No broadcast/template campaigns. No SLA tracking.

**Industry benchmark:** WhatsApp Business API (Meta Cloud API) is the gold standard — it enables product catalog sharing, structured order update templates, quick-reply buttons, and chatbot/agent handoff. Intercom adds CSAT collection, SLA dashboards, and multi-agent inboxes. The key insight: because Nodbusiness has its own messaging system (not using WhatsApp Business API), it can implement all these patterns natively and more deeply integrated with product/order data. (Sources: messaging_research_raw.md §10; developers.facebook.com/docs/whatsapp; intercom.com/help)

**Specific gaps identified:**
1. No `product_card`, `order_update`, `quick_reply_prompt`, or `system` message types.
2. No `message_product_cards` table linking messages to product catalog.
3. No `quick_replies JSONB` column on `messages` for interactive buttons.
4. No `conversation_assignments` table for agent handoff.
5. No `first_business_response_at` on `conversations` for SLA tracking.
6. No broadcast/template campaign system.
7. No CSAT (Customer Satisfaction Score) collection at conversation end.

**Recommended implementation approach:**

Schema additions:
```sql
-- Product card message type
CREATE TABLE message_product_cards (
  id              BIGSERIAL PRIMARY KEY,
  message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  snapshot_name   TEXT NOT NULL,
  snapshot_price  NUMERIC(12,2),
  snapshot_image  TEXT,
  snapshot_url    TEXT
);

-- Quick reply buttons
ALTER TABLE messages ADD COLUMN quick_replies JSONB;
-- Example: [{"label":"Confirm","action":"confirm_order","payload":"order_id=abc"}]

-- Agent handoff
CREATE TABLE conversation_assignments (
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  agent_id        UUID REFERENCES users(id),  -- NULL = bot
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, assigned_at)
);

-- SLA tracking
ALTER TABLE conversations ADD COLUMN first_business_response_at TIMESTAMPTZ;
```

Add to `MESSAGE_TYPES` in `lib/messaging.ts`:
```typescript
export const MESSAGE_TYPES = ['text', 'image', 'file', 'voice', 'product_card', 'order_update', 'system', 'quick_reply_prompt'] as const;
```

New endpoint for sending product cards:
```
POST /api/conversations/:convId/messages
Body: { type: 'product_card', product_id: 'uuid' }
→ Server fetches product snapshot, creates message + message_product_cards row
```

**Estimated complexity:** L (1–2 weeks for product cards + order updates; XL for full chatbot/agent handoff)

---

### 3.11 Pagination and Offline

**What we have:** Cursor-based pagination via `before` timestamp parameter — correct approach. Frontend infinite scroll loading 200 messages. Optimistic send with temporary ID in `ChatRoom.tsx`. No `client_generated_id` deduplication. No IndexedDB offline queue. No Service Worker. No bidirectional "jump to message" load around a search result.

**Industry benchmark:** Cursor pagination is universal and correctly implemented. The critical gap is deduplication: without a `client_id` constraint, retrying a send on reconnect after a mobile network drop will create duplicate messages. IndexedDB offline queue is standard in WhatsApp Web and Telegram Web for PWA-like reliability. (Sources: messaging_research_raw.md §11; Slack Engineering blog on cursor pagination; tanstack.com React Query docs)

**Specific gaps identified:**
1. No `client_id UUID` column on `messages` with a unique index — duplicate messages possible on retry.
2. No IndexedDB pending-message queue on the frontend.
3. No "jump to message" bidirectional load for search results (load 25 before + 25 after a target ID).
4. The `before` cursor uses `created_at` timestamp — this can have tie-breaking issues with messages inserted at the same millisecond. Should also include message `id` as a secondary sort key (already done in the query: `ORDER BY created_at DESC, id DESC` — this is correct).

**Recommended implementation approach:**

Migration:
```sql
ALTER TABLE messages ADD COLUMN client_id UUID;
CREATE UNIQUE INDEX ON messages (conversation_id, client_id)
  WHERE client_id IS NOT NULL;
```

In the send route (`POST /api/conversations/:convId/messages`):
```typescript
const { content, type, reply_to_id, client_id } = req.body;
// On insert, include client_id:
// INSERT INTO messages (..., client_id) VALUES (..., $n)
// ON CONFLICT (conversation_id, client_id) WHERE client_id IS NOT NULL
// DO UPDATE SET id = EXCLUDED.id  -- return the existing row
```

Bidirectional load endpoint:
```
GET /api/conversations/:convId/messages/around/:messageId?limit=50
→ returns 25 before + 25 after the target message
```

**Estimated complexity:** S (< 1 day for deduplication; M for jump-to-message)

---

### 3.12 Spam and Moderation

**What we have:** Clef content classification (spam/policy, block or flag-for-review) on text messages. Rate limiting: 30 messages/minute send, 20 new conversations/minute (both via `express-rate-limit`). Block enforcement on DM send and typing. Report functionality exists in the `reports` table (from the Clef auto-flag code). No trust score. No report velocity auto-suspend. No appeal flow.

**Industry benchmark:** WhatsApp uses velocity checks (same message to >X new contacts/hour), account age trust scoring, and phone number reputation. Slack has admin-configurable keyword blocking and compliance exports. At scale, the signals that matter most are: new account + new conversation + link in first message (high-risk combo), and report velocity (5+ reports of same account in 24h → auto-suspend pending review). (Sources: messaging_research_raw.md §12; stripe.com/radar; blog.cloudflare.com)

**Specific gaps identified:**
1. Rate limiting uses `express-rate-limit` (in-memory store) — does not persist across restarts or multiple Node.js instances. Should use Redis store for production.
2. No `user_trust_scores` table.
3. No `spam_reports` table (only a generic `reports` table used by Clef auto-flag).
4. No report velocity check (auto-suspend if 5+ users report same account in 24h).
5. No appeal flow for suspended users.
6. No admin moderation queue UI.

**Recommended implementation approach:**

```sql
CREATE TABLE user_trust_scores (
  user_id         UUID PRIMARY KEY REFERENCES users(id),
  score           FLOAT DEFAULT 1.0,       -- 0.0 = high risk, 1.0 = trusted
  flagged_at      TIMESTAMPTZ,
  auto_suspended  BOOLEAN DEFAULT false,
  reviewed_at     TIMESTAMPTZ,
  reviewer_id     UUID REFERENCES users(id)
);
```

Fix rate limiting to use Redis store:
```typescript
import { RedisStore } from 'rate-limit-redis';
const perUser = (max: number, message: string) => rateLimit({
  windowMs: 60 * 1000,
  limit: max,
  store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }),
  // ... rest unchanged
});
```

Report velocity check (add to the report endpoint):
```typescript
const { rows: [{ count }] } = await pool.query(
  `SELECT COUNT(*) FROM reports WHERE target_user_id = $1
   AND created_at > NOW() - INTERVAL '24 hours'`,
  [reportedUserId]
);
if (parseInt(count) >= 5) {
  await pool.query(`UPDATE users SET is_banned = true WHERE id = $1`, [reportedUserId]);
  // emitToUser: force_disconnect
}
```

**Estimated complexity:** M (1–3 days for Redis rate limit + velocity check; L for full trust score system)

---

### 3.13 Accessibility

**What we have:** Standard HTML elements. The chat UI is built with React. No documented ARIA roles, live regions, or keyboard navigation for the message list. `MessageTicks` component is visual-only with no accessible label.

**Industry benchmark:** WCAG 2.2 (October 2023) is the current standard. Key requirements for chat interfaces: `role="log"` with `aria-live="polite"` on the message list (announces new messages without interrupting); `role="article"` per message with `aria-label` including sender name, timestamp, and content; keyboard navigation for message context menus (Shift+F10); focus trap in emoji pickers; minimum 4.5:1 contrast ratio on message bubble text. (Sources: messaging_research_raw.md §13; w3.org/TR/WCAG22/; w3.org/WAI/ARIA/apg/patterns/feed/)

**Specific gaps identified:**
1. No `role="log"` / `aria-live="polite"` on the message list container.
2. No `role="article"` with `aria-label` on individual message components.
3. No keyboard navigation for the message context menu (currently long-press only on mobile).
4. `MessageTicks` component has no `aria-label` describing delivery state.
5. No `@media (prefers-reduced-motion: reduce)` rules for typing indicator animation.
6. No focus trap in emoji picker (when implemented).
7. Timestamp text likely fails WCAG 2.2 contrast requirements (small, gray text on white).
8. No skip link to jump directly to the message compose input.

**Recommended implementation approach:**

In the message list component (`Messages.tsx`):
```jsx
<div
  role="log"
  aria-label="Conversation messages"
  aria-live="polite"
  aria-relevant="additions"
>
  {messages.map(msg => (
    <div
      key={msg.id}
      role="article"
      aria-label={`${msg.senderName}, ${formatTime(msg.createdAt)}: ${msg.content}`}
      tabIndex={0}
      onKeyDown={handleMessageKeyDown}  {/* Shift+F10 → context menu */}
    >
      {/* message bubble content */}
    </div>
  ))}
</div>
```

`MessageTicks` accessible label:
```jsx
<span aria-label={ticks === 2 && isRead ? 'Read' : ticks === 2 ? 'Delivered' : 'Sent'}>
  <MessageTicks ... />
</span>
```

Compose input:
```jsx
<label htmlFor="message-input" className="sr-only">Type a message</label>
<textarea
  id="message-input"
  aria-label="Type a message"
  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
/>
```

CSS reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  .typing-indicator, .message-enter, .reaction-pop {
    animation: none;
    transition: none;
  }
}
```

**Estimated complexity:** M (1–3 days — mostly additive ARIA attributes and CSS; no structural changes)

---

### 3.14 Analytics for Messaging

**What we have:** Nothing. No `conversation_metrics` table. No `message_analytics_events` table. No analytics endpoints. No merchant dashboard. No FRT (First Response Time) tracking.

**Industry benchmark:** WhatsApp Business Suite exposes: message open rate, response rate, FRT, resolution time, and template performance (source: business.facebook.com/help). Intercom adds: CSAT, bot deflection rate, conversation reopens, agent performance (source: intercom.com/help). For Nodbusiness specifically, the primary business value metric is Message-to-Order Conversion Rate — the % of chat sessions that result in an order within 24h. This is a metric no off-the-shelf platform provides in a native integrated way. (Sources: messaging_research_raw.md §14; getstream.io/blog; clickhouse.com/docs)

**Specific gaps identified:**
1. No `conversation_metrics` table (FRT, total messages, resulted_in_order, CSAT).
2. No `message_analytics_events` event stream table.
3. No `daily_conversation_stats` aggregation table.
4. No `GET /api/analytics/conversations` endpoint for merchants.
5. No FRT alert system (notify merchant if response time exceeds SLA).
6. No Message-to-Order conversion tracking (linking order creation events to conversation IDs).
7. No CSAT collection flow (post-conversation satisfaction rating).

**Recommended implementation approach:**

Schema:
```sql
CREATE TABLE conversation_metrics (
  conversation_id     UUID PRIMARY KEY REFERENCES conversations(id),
  first_message_at    TIMESTAMPTZ,
  first_reply_at      TIMESTAMPTZ,
  first_response_ms   BIGINT,
  total_messages      INT DEFAULT 0,
  last_activity_at    TIMESTAMPTZ,
  resulted_in_order   BOOLEAN DEFAULT false,
  order_id            UUID,
  csat_score          SMALLINT   -- 1–5, NULL if not collected
);

CREATE TABLE message_analytics_events (
  id              BIGSERIAL PRIMARY KEY,
  event_type      TEXT NOT NULL,  -- 'sent'|'delivered'|'read'|'reacted'|'link_clicked'
  message_id      UUID,
  conversation_id UUID,
  user_id         UUID,
  occurred_at     TIMESTAMPTZ DEFAULT NOW(),
  metadata        JSONB
);
CREATE INDEX ON message_analytics_events (event_type, occurred_at);
CREATE INDEX ON message_analytics_events (conversation_id);
```

New REST endpoint:
```
GET /api/analytics/conversations?startDate=Y&endDate=Z
→ {
    totalConversations: number;
    avgFirstResponseMin: number;
    messageToOrderRate: number;
    readRate: number;
    topProductsShared: Array<{ productId, name, count }>;
    hourlyVolume: number[];
  }
```

FRT instrumentation: in `deliver()`, when the first non-customer reply is inserted, update `conversation_metrics.first_reply_at`.

**Estimated complexity:** M (1–3 days for schema + basic FRT tracking; L for full merchant dashboard UI)

---

## 4. Implementation Roadmap

### Phase 1 — P0: Unblock Commerce Use (< 4 weeks)

These are the features that currently prevent Nodbusiness messaging from being used as a real commerce tool. Merchants cannot find past conversations, cannot share products, and are receiving duplicate messages when mobile connections drop.

**1. Message Search (§3.3)** — *Priority: P0*
A merchant with 50 active customer conversations cannot find a customer who asked about a specific product last week. This is day-one friction that makes the inbox unusable as a CRM. Implementation: PostgreSQL FTS migration + `GET /api/search/messages` endpoint + basic search bar in the frontend. Effort: 2–3 days.

**2. Product Card Message Type (§3.10)** — *Priority: P0*
The entire commerce value proposition depends on merchants sharing products in chat. Without a structured `product_card` type, merchants copy-paste URLs or describe products verbally — this is worse than WhatsApp Business. Implementation: `message_product_cards` table + `product_card` message type + frontend `ProductCardBubble` component. Effort: 3–5 days.

**3. Order Update Messages (§3.10)** — *Priority: P0*
Order confirmations and shipping updates sent via messaging are the primary engagement driver that makes customers open the app daily. Without `order_update` system messages, the commerce loop is broken. Implementation: `order_update` and `system` message types + trigger from the order fulfillment flow. Effort: 2 days.

**4. Client-ID Deduplication for Optimistic Send (§3.11)** — *Priority: P0*
On the mobile-first Ethiopian market with variable connectivity, users frequently lose connection mid-send. Without `client_id` deduplication, retrying sends creates duplicate messages — a trust-destroying UX bug. Implementation: `ALTER TABLE messages ADD COLUMN client_id UUID` + unique index + ON CONFLICT handling in the send route. Effort: < 1 day.

**5. Reply Preview in Message Response (§3.5)** — *Priority: P0*
The `reply_to_id` is stored but the message list query returns no preview of the quoted message. The frontend has to do a second fetch or show a broken reply context. Fix the messages query to JOIN the replied-to message and include the preview in the response. Effort: < 1 day.

**Phase 1 total estimate: 8–11 days**

---

### Phase 2 — P1: Competitive Parity (1–3 months)

These features put Nodbusiness on par with WhatsApp and Instagram messaging. Without them, users who try the platform will immediately notice it feels less capable than the apps they already use.

**1. Message Reactions** — Users expect to react to messages. The absence of reactions makes group chats feel static. Effort: M (3 days for 8 curated reactions + full emoji picker + who-reacted sheet).

**2. Voice Messages** — The Ethiopian mobile market uses voice messages extensively. WhatsApp voice notes are more common than text in many conversations. This is the highest-priority missing feature for market fit. Effort: L (1–2 weeks — browser MediaRecorder + waveform + Opus pipeline).

**3. @Mention Notifications** — Multi-staff merchant groups (e.g., owner + 3 sales staff) become noisy without mentions. Staff cannot be tagged. Any business group chat with >3 members needs @mention. Effort: M (2–3 days).

**4. Link Preview (Open Graph)** — When a merchant pastes a product URL or a customer shares a news link, the blank URL is unfriendly. Link previews are baseline behavior since 2016. Effort: M (2 days — server-side OG fetch + Redis cache + `LinkPreviewCard` component).

**5. Multi-Image Album Send** — Merchants selling physical goods (clothing, furniture, food) need to send multiple product photos at once. Single-image send is a limitation WhatsApp removed in 2017. Effort: M (3 days — `message_media` table + album UI grid component).

**6. Analytics: FRT + Merchant Dashboard (basic)** — Merchants need to know if their team is responding to customers. First Response Time and total conversation volume are the minimum viable dashboard. Effort: M (3 days for schema + basic dashboard page).

**7. Accessibility: WCAG 2.2 AA baseline** — `role="log"` + `aria-live` + keyboard navigation + contrast fixes. Required for market compliance in many regions and correct baseline engineering. Effort: M (2–3 days).

**8. Rate Limiting: Redis Store** — The in-memory `express-rate-limit` store is incorrect in a multi-instance deployment. Replace with Redis store. Effort: S (< 1 day).

---

### Phase 3 — P2: Commerce Differentiation (3–6 months)

These features are things WhatsApp Business and Instagram do not offer in the same integrated way. They represent the genuine competitive advantage of building a proprietary messaging system.

**1. Message-to-Order Conversion Funnel Analytics** — Track which conversations resulted in an order placed within 24h. Surface this to merchants as a "conversion rate" KPI. No off-the-shelf messaging platform has this natively integrated with the order system. Link `conversation_metrics.resulted_in_order` to the orders table when an order is placed by a user who had an active conversation with the merchant in the prior 24h.

**2. Chatbot / Agent Handoff** — Build a lightweight bot framework that can answer FAQs (product price, availability, shipping time) automatically, and hand off to a human agent when confidence is low. The `conversation_assignments` table and `first_business_response_at` SLA tracking are the foundation. This requires the Nodbusiness product catalog to be queryable by the bot.

**3. CSAT Collection** — After a conversation is marked resolved, send a 1–5 star rating prompt as a system message. Store in `conversation_metrics.csat_score`. Aggregate CSAT per merchant per day. WhatsApp Business API does not have native CSAT; merchants pay for Intercom or Zendesk to get this.

**4. Broadcast / Campaign Messages** — Allow merchants to send a product announcement or promotion to opted-in customers. Requires opt-in tracking (a `broadcast_subscriptions` table), a campaign creation UI, delivery rate tracking, and the same Clef moderation applied to broadcast content. This is the Nodbusiness equivalent of WhatsApp Broadcast Lists — but with native conversion analytics.

**5. Disappearing Messages (§3.4)** — Privacy-oriented users and merchants discussing sensitive pricing/negotiations expect ephemeral messaging. Implement 24h/7d/off timers with BullMQ cleanup job. Disable for `order_update` and `system` message types.

**6. Server-Side Encryption at Rest (§3.6)** — AES-256-GCM application-layer encryption for `content` column, with KMS-managed keys and `encryption_key_id` for rotation support. Required for enterprise merchant trust and regulatory compliance.

---

### Phase 4 — P3: Future Scale (6+ months)

Revisit these when growth signals require them:

**1. Typesense / Elasticsearch for Search** — Migrate from PostgreSQL FTS when message search latency exceeds 200ms under load. Signal: search P95 latency > 200ms in Datadog/New Relic. Plan migration at ~50M messages.

**2. ClickHouse for Analytics** — Replace `message_analytics_events` PostgreSQL table with ClickHouse when daily event volume exceeds 1M events/day. ClickHouse provides sub-second aggregation on billions of rows that PostgreSQL cannot match.

**3. E2EE Opt-In (Signal Protocol)** — Revisit in 18–24 months for a "Secret Conversation" opt-in mode. At this point, use `@signalapp/libsignal-client` npm package. Key constraint: must remain optional and incompatible with search, moderation, and bot features — those features must be disabled for E2EE conversations.

**4. Video Messages** — Add `'video'` message type with FFmpeg server-side transcode pipeline (H.264/MP4, 720p, 2Mbps), thumbnail extraction, and in-chat video player. Signal: when image messages exceed 30% of total message volume.

**5. Socket.IO Redis Adapter (Production)** — `ENABLE_SOCKET_REDIS_ADAPTER=true` is already coded. Enable when deploying more than one backend instance. Signal: when a single Node.js process consistently uses >80% CPU or when first horizontal scaling event.

**6. Message Thread Panels (Slack-style)** — Full thread panel with separate read state per thread, thread participants, and thread reply count badge. Only warranted for Nodbusiness Teams/Enterprise tier, when group sizes routinely exceed 50 members and conversation volume per channel exceeds 100 messages/day.

---

## 5. Architecture Recommendations

### Schema Additions

The following SQL DDL additions are required, organized by phase. All are additive to the existing schema — no table drops or destructive renames.

**Phase 1 (critical):**
```sql
-- Deduplication for optimistic send
ALTER TABLE messages ADD COLUMN client_id UUID;
CREATE UNIQUE INDEX ON messages (conversation_id, client_id)
  WHERE client_id IS NOT NULL;

-- Product card messages (commerce core)
ALTER TABLE messages ADD COLUMN quick_replies JSONB;

CREATE TABLE message_product_cards (
  id              BIGSERIAL PRIMARY KEY,
  message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL,  -- references products table
  snapshot_name   TEXT NOT NULL,
  snapshot_price  NUMERIC(12,2),
  snapshot_image  TEXT,
  snapshot_url    TEXT
);

-- Extend message types (update constant in lib/messaging.ts)
-- MESSAGE_TYPES: add 'voice', 'product_card', 'order_update', 'system', 'quick_reply_prompt'
```

**Phase 2 (parity):**
```sql
-- Reactions
CREATE TABLE message_reactions (
  id          BIGSERIAL PRIMARY KEY,
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX ON message_reactions (message_id);
ALTER TABLE messages ADD COLUMN reactions JSONB DEFAULT '{}';

-- Mentions
CREATE TABLE message_mentions (
  id          BIGSERIAL PRIMARY KEY,
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (message_id, user_id)
);
CREATE INDEX ON message_mentions (user_id);

-- Voice messages
ALTER TABLE messages ADD COLUMN duration_ms INT;
ALTER TABLE messages ADD COLUMN waveform SMALLINT[];
ALTER TABLE messages ADD COLUMN transcription TEXT;

-- Media (for albums, video, link previews)
CREATE TABLE message_media (
  id             BIGSERIAL PRIMARY KEY,
  message_id     UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('image','video','audio','document','link_preview')),
  url            TEXT NOT NULL,
  thumbnail_url  TEXT,
  mime_type      TEXT,
  file_size      BIGINT,
  width          INT,
  height         INT,
  duration_ms    INT,
  filename       TEXT,
  og_title       TEXT,
  og_description TEXT,
  og_site        TEXT,
  sort_order     INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON message_media (message_id);

-- Full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
ALTER TABLE messages ADD COLUMN search_vector TSVECTOR;
CREATE INDEX messages_fts_idx ON messages USING GIN (search_vector);
CREATE INDEX messages_trgm_idx ON messages USING GIN (content gin_trgm_ops);

-- Analytics
CREATE TABLE conversation_metrics (
  conversation_id     UUID PRIMARY KEY REFERENCES conversations(id),
  first_message_at    TIMESTAMPTZ,
  first_reply_at      TIMESTAMPTZ,
  first_response_ms   BIGINT,
  total_messages      INT DEFAULT 0,
  last_activity_at    TIMESTAMPTZ,
  resulted_in_order   BOOLEAN DEFAULT false,
  order_id            UUID,
  csat_score          SMALLINT
);

CREATE TABLE message_analytics_events (
  id              BIGSERIAL PRIMARY KEY,
  event_type      TEXT NOT NULL,
  message_id      UUID,
  conversation_id UUID,
  user_id         UUID,
  occurred_at     TIMESTAMPTZ DEFAULT NOW(),
  metadata        JSONB
);
CREATE INDEX ON message_analytics_events (event_type, occurred_at);
CREATE INDEX ON message_analytics_events (conversation_id);
```

**Phase 3:**
```sql
-- Disappearing messages
ALTER TABLE messages ADD COLUMN expires_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN disappear_timer_seconds INT;
CREATE INDEX ON messages (expires_at) WHERE expires_at IS NOT NULL;

-- Agent handoff
CREATE TABLE conversation_assignments (
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  agent_id        UUID REFERENCES users(id),
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, assigned_at)
);
ALTER TABLE conversations ADD COLUMN first_business_response_at TIMESTAMPTZ;

-- Encryption at rest
ALTER TABLE messages
  ADD COLUMN encryption_key_id UUID,
  ADD COLUMN content_iv BYTEA;

-- Trust scoring
CREATE TABLE user_trust_scores (
  user_id         UUID PRIMARY KEY REFERENCES users(id),
  score           FLOAT DEFAULT 1.0,
  flagged_at      TIMESTAMPTZ,
  auto_suspended  BOOLEAN DEFAULT false,
  reviewed_at     TIMESTAMPTZ,
  reviewer_id     UUID REFERENCES users(id)
);
```

---

### Socket.IO Event Changes

**New events to add** (all emitted to `conv:<conversationId>` room unless noted):

| Event Name | Direction | Payload | Trigger |
|---|---|---|---|
| `reaction_added` | Server → client | `{ messageId, userId, emoji, reactions: JSONB }` | User adds reaction |
| `reaction_removed` | Server → client | `{ messageId, userId, emoji, reactions: JSONB }` | User removes reaction |
| `message_updated` | Server → client | `{ id, transcription?, reactions? }` | Async update (transcription ready, etc.) |
| `mention_notification` | Server → `user:<userId>` | `{ conversationId, messageId, senderName }` | User is @mentioned |

**Existing events to modify:**

- `new_message` — add `reply_to: { id, content, type, sender_name } | null`, `mentions: string[]`, and `reactions: {}` to the payload. Currently emitted from `emitNewMessage()` in `socket.ts`; update the shape passed from `deliver()` in `routes/messages.ts`.
- `typing_updated` — no change needed.
- `conversation_updated` — no change needed.

**New client → server events:**

| Event Name | Payload | Purpose |
|---|---|---|
| (none new required for Phase 1–2) | | Reactions and mentions use REST + Socket.IO fan-out |

---

### New REST Endpoints

**Phase 1:**
```
POST /api/conversations/:convId/messages
  (existing, update to handle client_id, product_card type)

GET  /api/search/messages
  ?q=<query>&conversationId=<id>&scope=conversation|all&page=1&limit=20
  → { messages: [...], total: number, nextPage: number | null }

GET  /api/conversations/:convId/messages/around/:messageId
  ?limit=50
  → { before: Message[], target: Message, after: Message[] }
```

**Phase 2:**
```
POST   /api/messages/:id/reactions   { emoji: string }        → 201
DELETE /api/messages/:id/reactions/:emoji                      → 204
GET    /api/messages/:id/reactions   ?page&limit               → [{ emoji, count, users }]

POST   /api/media/presign            { filename, mimeType, size } → { uploadUrl, fileKey }
POST   /api/link-preview             { url }                   → { title, description, image, siteName }
GET    /api/conversations/:id/media  ?page&limit&type          → [MessageMedia]

GET    /api/conversations/:id/members?q=<query>&limit=10
  → [{ userId, displayName, username, avatarUrl }]

GET    /api/analytics/conversations
  ?startDate&endDate
  → { totalConversations, avgFirstResponseMin, messageToOrderRate, readRate, ... }

POST   /api/users/heartbeat                                    → 200
```

**Phase 3:**
```
PATCH  /api/conversations/:id/disappear-timer
  { disappearTimerSeconds: 86400 | 604800 | null }             → 200

POST   /api/conversations/:id/assign  { agentId: string|null } → 200
POST   /api/conversations/:id/csat    { score: 1|2|3|4|5 }    → 201

POST   /api/broadcasts               { productId, message, recipientFilter } → 201
GET    /api/broadcasts/:id/stats                               → { delivered, read, replied, converted }
```

---

### Infrastructure

**Required for Phase 1–2 (no new services):**
- Enable Redis store for `express-rate-limit` (Redis is already in the stack via `lib/redis.ts`)
- Move `memPresence` Map from `routes/messages.ts` to Redis — single-line change using existing Redis client

**Required for Phase 2:**
- **Sharp** (Node.js image processing) — already a common dependency; add if not present for thumbnail generation
- **Link preview worker** — a small BullMQ job that fetches OG tags server-side. No new external service; uses existing BullMQ infrastructure if present

**Required for Phase 3:**
- **FFmpeg** (server process or Lambda) — for video thumbnail extraction and Opus audio normalization for voice messages
- **ASR worker** (optional) — AWS Transcribe or self-hosted Whisper for voice transcription
- **KMS** — AWS KMS or HashiCorp Vault for encryption key management (Phase 3 encryption at rest)

**Future scale (Phase 4):**
- **Typesense** — self-hosted, single-node for search when PostgreSQL FTS latency degrades
- **ClickHouse** — columnar analytics database when daily events exceed 1M/day
- Enable `ENABLE_SOCKET_REDIS_ADAPTER=true` when deploying multiple backend instances

**Constraint:** All recommendations are additive to the existing `backend/routes/messages.ts`, `backend/socket.ts`, and `backend/lib/messaging.ts` architecture. No table drops. No rewrites of the conversation or message send flow. The `deliver()` function in `routes/messages.ts` is extended in-place; all new features are additive branches within it or new route handlers.

---

## 6. Frontend UX Recommendations

### Component Additions

**Phase 1:**
- `ProductCardBubble` — renders a message of type `product_card` with image, name, price, and "View Product" CTA. Props: `{ productId, snapshotName, snapshotPrice, snapshotImage, snapshotUrl }`. Tapping navigates to the product page.
- `OrderUpdateBubble` — renders `order_update` system messages with a status icon (pending/confirmed/shipped/delivered), order number, and a "Track Order" link. Styled differently from user messages (centered, gray).
- `ReplyPreview` — the quoted-message context bar above the composer when replying. Shows original sender name + truncated content (max 2 lines). Already has a UI stub; needs the joined `reply_to` data from the API.

**Phase 2:**
- `MessageReactionBar` — appears on long-press/hover on a message. Shows 8 curated emoji (❤️ 👍 😂 😮 😢 🙏 🎉 🔥) + a `+` button. Tapping an emoji calls `POST /api/messages/:id/reactions`.
- `ReactionBubble` — displayed below a message bubble when `reactions` JSONB is non-empty. Each emoji + count is a tappable button; tapping the count opens `WhoReactedSheet`.
- `WhoReactedSheet` — bottom sheet (mobile) or popover (desktop). Shows tabs per emoji; each tab lists user avatars + names.
- `VoiceRecorder` — mic button in the compose bar. Hold to record (mobile), click to toggle (desktop). Renders recording waveform in real-time. Props: `{ onSend: (blob, waveform, durationMs) => void }`.
- `VoiceMessageBubble` — renders a voice message with waveform visualization (array of `<span>` bars), duration, play/pause button, and a `1×/1.5×/2×` speed toggle. Optionally shows `transcription` text below waveform.
- `LinkPreviewCard` — rendered when a URL is detected in a text message. Shows OG image (thumbnail), title, description, and domain. Auto-fetches via `POST /api/link-preview` with debounce while typing.
- `MentionAutocomplete` — dropdown list appearing when `@` is typed in the compose input. Fetches from `GET /api/conversations/:id/members?q=<query>`. Keyboard navigable (arrow keys + Enter). Inserts `@username` into the message and stores `userId` in the pending mentions array.
- `MessageSearchBar` — slide-in search panel within a conversation. Input calls `GET /api/search/messages` with `conversationId`. Results show snippets with `<mark>` highlights. Clicking a result loads the message via the `around/:messageId` endpoint and scrolls to it.

**Phase 3:**
- `AnalyticsDashboard` (merchant-facing page) — FRT chart, message volume by hour, top products shared, conversion funnel (conversations → orders). Uses `GET /api/analytics/conversations`.
- `AgentInbox` — list of conversations currently assigned to the current user (agent). Shows SLA timer, customer name, last message. Used by merchants with staff accounts.
- `CSATPrompt` — inline system message rendered after a conversation is marked resolved. 1–5 star rating + optional comment. Submits to `POST /api/conversations/:id/csat`.

---

### Interaction Patterns

**Swipe to reply (mobile):** Swiping right on a message bubble should open the reply composer with the quoted context. This is the WhatsApp/Telegram interaction pattern. Implement with a `PanGestureHandler` (Framer Motion or React Native Gesture Handler on mobile web) — swipe >30% of bubble width triggers reply.

**Long-press context menu:** Already exists. Extend with: React / Reply / Forward / Copy / Pin / Save / Delete / Report. Replace localStorage-based pin and save with API calls (§3.1, §3.2 of roadmap) when those backends are built.

**Emoji picker:** Position above the cursor on desktop (CSS `position: absolute`); render as a bottom sheet on mobile. Use a lightweight library (e.g., `emoji-mart` — actively maintained, supports custom emoji, accessible). Apply focus trap while open; return focus to compose input on close.

**Waveform recording UI:** The mic icon in the compose bar should transform into a "swipe left to cancel / release to send" UI on long-press (WhatsApp pattern). A red dot + elapsed timer + waveform bar visualization replaces the compose bar during recording. No separate screen navigation required.

**Search jump-to-message:** When a search result is tapped, navigate to the conversation and load the `around/:messageId` endpoint. The target message should be highlighted (yellow background) for 2 seconds, then faded. Use `scrollIntoView({ behavior: 'smooth' })` after the message list re-renders.

---

### Accessibility Improvements

**Message list (WCAG 2.2 AA):**
- Add `role="log"` + `aria-live="polite"` + `aria-relevant="additions"` to the message list container in `Messages.tsx`.
- Add `role="article"` + `aria-label` to each message `<div>`. The label must include: sender name, time, and content (or media description).
- Ensure `tabIndex={0}` on each message for keyboard focus navigation.
- Add `onKeyDown` handler: `Shift+F10` or `ContextMenu` key opens the message action menu.

**Compose input:**
- Add visible `<label>` (screen-reader only via `sr-only` class) pointing to the textarea.
- `aria-describedby` pointing to a character count hint.
- `Enter` sends, `Shift+Enter` inserts a line break — document this in the UI as a tooltip.

**`MessageTicks` component:**
- Wrap in `<span aria-label="...">` where the label is "Sent", "Delivered", or "Read" depending on tick state.

**Emoji reactions:**
- Each `ReactionBubble` item: `aria-label="[emoji] reaction, [count] people"`.
- The `+` button: `aria-label="Add reaction"`.

**Focus management:**
- When opening the reply bar, move focus to the compose textarea and announce "Replying to [sender]: [content]" via `aria-live="assertive"` (one-time).
- When closing a modal/sheet (emoji picker, who-reacted, image viewer), return focus to the element that triggered it.

**Color contrast:**
- Timestamp text must pass 4.5:1 against its background (WCAG 2.2 AA). Current gray timestamps likely fail. Darken to #6B6B6B minimum on white backgrounds.
- Read receipt ticks must be differentiated by more than color (use distinct shapes for sent/delivered/read).

**Reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .typing-indicator-dot,
  .message-enter-animation,
  .reaction-pop,
  .waveform-bar {
    animation: none;
    transition: none;
  }
}
```

---

### Performance

**Virtualized message list:** For conversations with >500 messages, a non-virtualized list causes janky scroll and high memory usage. Use `react-virtual` (TanStack Virtual) or `react-window` to virtualize the message list. Only render messages within ~2 screens of the current scroll position.

**Image lazy loading:** Use `loading="lazy"` on all `<img>` elements in chat. Add LQIP (low-quality image placeholder) using a blurred thumbnail URL from `message_media.thumbnail_url`. This is critical for conversations with many images on slow Ethiopian mobile connections.

**Waveform rendering:** Render voice message waveform as an SVG path or canvas — not 100 individual `<span>` elements. SVG is more performant for a list with many voice messages.

**Link preview debounce:** Debounce `POST /api/link-preview` calls by 500ms after the last URL character is typed. Cancel the in-flight request when the URL changes. Cache results client-side in a `Map<url, preview>` for the session.

**Conversation list re-renders:** The `conversation_updated` Socket.IO event currently triggers on every message send. Ensure the conversation list component uses `React.memo` and compares only the changed fields (`last_message`, `unread_count`, `last_message_at`) to prevent re-rendering every row when one conversation updates.

---

## 7. What NOT to Build

### 1. Signal Protocol End-to-End Encryption
**Why it seems attractive:** E2EE is a strong privacy marketing message. Signal and WhatsApp personal are widely trusted.
**Why it is wrong for Nodbusiness:** E2EE makes server-side search (§3.3) impossible, breaks Clef content moderation (already implemented), prevents chatbot/agent handoff (§3.10), disables analytics (§3.14), and makes order history backup dependent on client-side key management. Every commerce feature in the roadmap requires the server to read message content. Record the trade-off in `project-brain/DECISIONS.md` and revisit a narrow opt-in "Secret Conversation" mode in 18+ months.

### 2. Slack-Style Thread Panels
**Why it seems attractive:** Slack threads are beloved by developers. Enterprise messaging looks more serious with visible thread counts.
**Why it is wrong for Nodbusiness:** Nodbusiness is a commerce chat app, not a team collaboration tool. The WhatsApp/Instagram mental model — inline quote reply — is what the target market knows. Thread panels add navigation complexity (main channel vs. thread sidebar) that confuses mobile users. The existing `reply_to_id` with a joined preview (§3.5) is the correct implementation. Build Slack-style threads only if a "Teams" or "Enterprise" tier with large internal group sizes is explicitly launched.

### 3. Elasticsearch / OpenSearch
**Why it seems attractive:** Elasticsearch is industry standard for full-text search. It handles billions of documents.
**Why it is wrong for Nodbusiness:** At current scale, PostgreSQL FTS with a GIN index handles millions of messages with <50ms latency. Elasticsearch adds: a new service to operate, a data sync pipeline, Elasticsearch-specific query DSL, and ~8GB RAM minimum for a production cluster. The operational cost is not justified until search latency degrades under load. Start with Postgres FTS, migrate to Typesense (lighter, self-hosted) when scale demands it.

### 4. ClickHouse for Analytics (Now)
**Why it seems attractive:** ClickHouse is used by Discord, Cloudflare, and ByteDance. It is impressively fast on large datasets.
**Why it is wrong for Nodbusiness:** PostgreSQL handles up to ~1M analytics events/day with time-series indexes without breaking a sweat. ClickHouse requires a separate database cluster, a sync pipeline (Kafka or BullMQ), and a team who knows ClickHouse SQL. The operational overhead is only justified when daily event volume exceeds 1M events/day.

### 5. Telegram-Style Animated Premium Reactions
**Why it seems attractive:** Telegram's animated sticker reactions look premium and drive subscription upgrades.
**Why it is wrong for Nodbusiness:** Animated reactions require a custom animation runtime (Lottie or Rive), a premium asset CDN, and significant mobile performance work. The Ethiopian market prioritizes data efficiency over animation polish. The animation rendering cost on low-end Android devices (which dominate the market) will degrade the chat experience. A curated set of 8 static emoji reactions is the right level of investment.

### 6. Video Calls / Audio Calls (In-App)
**Why it seems attractive:** WhatsApp has calls; users expect it.
**Why it is wrong for Nodbusiness:** WebRTC calls require: TURN/STUN infrastructure, NAT traversal, a media relay server, and significant frontend complexity. More importantly, Ethiopian users make calls on the cellular network or WhatsApp — they will not switch to a new calling app for business chats. The ROI is extremely low. Voice messages (§3.2) address the voice communication need at a fraction of the cost.

### 7. Full Custom Emoji / Sticker Set Upload
**Why it seems attractive:** Telegram's sticker ecosystem is a major engagement driver. Custom stickers for brands are appealing.
**Why it is wrong for Nodbusiness:** A sticker upload pipeline requires content moderation for every user-uploaded sticker (CSAM, trademark violations, offensive content), a CDN for sticker packs, licensing agreements, and discovery/search UI. This is a significant product surface area that distracts from commerce features. Standard Unicode emoji reactions cover the use case adequately.

### 8. Read Receipts Off by Default
**Why it seems attractive:** Privacy-focused platforms (Signal) default read receipts to off.
**Why it is wrong for Nodbusiness:** The existing implementation correctly defaults read receipts to opt-in (both parties must have `read_receipts = true`). Changing this to off-by-default would break the primary commerce feedback loop — merchants need to know if customers have read their product card messages and order updates. The merchant SLA tracking depends on read receipts. Keep the current opt-in default; the per-user `read_receipts` column already handles the privacy use case.

---

## 8. Key Metrics to Track

### Phase 1 Metrics (prove P0 features work)

| Metric | Target | Measurement |
|---|---|---|
| **Duplicate message rate** | < 0.01% of sends | `COUNT(*) FROM messages WHERE client_id IS NOT NULL GROUP BY conversation_id, client_id HAVING COUNT(*) > 1` |
| **Search adoption rate** | > 20% of active merchants use search weekly | `message_analytics_events WHERE event_type = 'search_performed'` |
| **Product card send rate** | > 50% of merchant-initiated conversations include a product card within 7 days of launch | `COUNT(message_product_cards) / COUNT(conversations WHERE initiator_is_merchant)` |
| **Order update message delivery rate** | > 99% of order updates reach the customer (not bounced) | `delivered_count / sent_count` for `type = 'order_update'` |
| **Reply context render success** | 0 broken reply previews in the conversation feed | Frontend error tracking (Sentry) for missing `reply_to` renders |

### Phase 2 Metrics (competitive parity)

| Metric | Target | Measurement |
|---|---|---|
| **Reaction engagement rate** | > 15% of messages receive at least one reaction within 24h | `COUNT(DISTINCT message_id FROM message_reactions) / COUNT(messages WHERE created_at > 30 days ago)` |
| **Voice message adoption** | > 10% of messages sent are voice type (benchmark: ~35% on WhatsApp in Africa) | `COUNT(*) WHERE type = 'voice' / COUNT(*) FROM messages` |
| **@mention notification open rate** | > 70% of mention notifications are opened within 5 minutes | `opened_mention_notifs / sent_mention_notifs` |
| **First Response Time (FRT) — median** | < 10 minutes for merchants during business hours | `conversation_metrics.first_response_ms` percentile aggregation |
| **Search result click-through rate** | > 40% of searches result in a message being tapped | `search_result_clicked / search_performed events` |
| **Accessibility compliance** | 0 WCAG 2.2 AA critical failures in automated audit | `axe-core` CI integration; 0 violations of `wcag2a` and `wcag2aa` rule sets |

### Phase 3 Metrics (commerce differentiation)

| Metric | Target | Measurement |
|---|---|---|
| **Message-to-Order Conversion Rate** | > 15% (industry context: average e-commerce chat conversion is 5–10%) | `conversation_metrics.resulted_in_order = true / total conversations with customers` |
| **Cart Abandonment Recovery Rate** | > 20% of cart-abandonment chats result in completed order | Tag conversations triggered by cart abandonment event; track `resulted_in_order` |
| **Product Card CTR** | > 30% of product cards sent are tapped (navigates to product page) | `message_analytics_events WHERE event_type = 'product_card_tapped' / product cards sent` |
| **Bot Deflection Rate** | > 40% of customer FAQs resolved without agent intervention | `conversations_closed_by_bot / total_conversations` |
| **CSAT Score — median** | ≥ 4.0 / 5.0 | `AVG(conversation_metrics.csat_score)` |
| **Broadcast Campaign Conversion** | > 5% of broadcast recipients place an order within 48h | `orders WHERE user_id IN (broadcast recipients) AND created_at < broadcast_sent_at + 48h` |

### Instrumentation Recommendations

**Events to log** (add to `message_analytics_events` in `deliver()` and route handlers):

```typescript
// In deliver():
await pool.query(`INSERT INTO message_analytics_events (event_type, message_id, conversation_id, user_id, occurred_at) VALUES ($1,$2,$3,$4,NOW())`,
  ['sent', message.id, conv.id, senderId]);

// In POST /conversations/:id/read:
await pool.query(`INSERT INTO message_analytics_events (...) VALUES ('read', null, $1, $2, NOW())`,
  [convId, me]);

// In reaction endpoint:
// event_type: 'reacted', metadata: { emoji }

// In search endpoint:
// event_type: 'search_performed', metadata: { query_length, scope, results_count }
// event_type: 'search_result_clicked', metadata: { messageId, rank }
```

**Dashboards to build:**

1. **Merchant Inbox Health Dashboard** (per merchant, accessible from settings):
   - FRT over time (line chart, last 30 days)
   - Messages sent vs. received per day (bar chart)
   - Top 5 products shared in chat (table)
   - Open conversations older than 24h (action list)

2. **Platform Moderation Dashboard** (admin only):
   - New reports in last 24h / 7d (count)
   - Auto-suspended accounts (pending review queue)
   - Clef block rate over time (% of messages blocked)
   - Top reported users (table with report velocity)

3. **Commerce Conversion Dashboard** (admin + merchant tier):
   - Message-to-Order funnel (funnel chart: conversations started → product card sent → order placed)
   - Conversion rate by merchant category
   - Broadcast campaign performance (delivered / read / replied / ordered)

**Alerting triggers (PagerDuty / email):**
- Merchant FRT exceeds 30 minutes for 3+ consecutive conversations → email alert to merchant
- Message delivery failure rate exceeds 1% in any 5-minute window → platform alert
- Clef block rate exceeds 5% of messages in any hour → trust & safety alert
- Report velocity: 5+ reports against same user in 24h → auto-suspend + admin alert

---

*Document compiled from source code review and industry research. Sources: `project-brain/messaging_research_raw.md` (2026-10), which cites: WhatsApp Engineering (engineering.fb.com), Telegram Blog (telegram.org/blog), Slack API docs (api.slack.com), Signal Blog (signal.org/blog), PostgreSQL documentation (postgresql.org/docs), WCAG 2.2 (w3.org/TR/WCAG22/), Stream Chat Engineering (getstream.io/blog), Intercom documentation (intercom.com/help), and WhatsApp Business API docs (developers.facebook.com/docs/whatsapp).*

*Architecture decisions derived from this document should be recorded in `project-brain/DECISIONS.md`. Temporary investigation notes should go in `note/`.*
