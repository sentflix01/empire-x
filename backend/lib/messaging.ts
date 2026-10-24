/**
 * The rules for conversations and messages, in one place so every route and
 * the socket agree:
 *   - Members come from conversation_participants (migrate31). The legacy
 *     participant_ids JSON column is still written for older clients and is
 *     read only when a conversation has no participant rows at all.
 *   - Starting a chat or adding someone follows their "who can message me"
 *     and blocks (lib/socialGraph). One-to-one chats also stop when either
 *     person blocks the other.
 *   - Messages are 1–4,000 characters; edits within 15 minutes, delete for
 *     everyone within 24 hours.
 */
import type { PoolClient } from 'pg';
import pool from '../db/pool';
import logger from './logger';
import { isBlockedEitherWay, messageRefusal } from './socialGraph';

export const MAX_MESSAGE_LENGTH = 4000;
export const EDIT_WINDOW_MS = 15 * 60 * 1000;
export const DELETE_FOR_EVERYONE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_GROUP_MEMBERS = 256;
export const CONVERSATION_TYPES = ['dm', 'group', 'channel'] as const;
/** Message types a person may send through the normal send route. */
export const MESSAGE_TYPES = ['text', 'image', 'file'] as const;
/**
 * Card types only the server creates, from real records: 'product' (POST
 * /share-product builds it from the product), 'order_update' and 'context'
 * (the item a chat was started from). Accepting them from the send route let
 * a sender invent a product price or an order status.
 */
export const SERVER_MESSAGE_TYPES = ['product', 'order_update', 'context'] as const;
export type ConversationType = typeof CONVERSATION_TYPES[number];

type Queryable = Pick<PoolClient, 'query'>;

export interface ConversationRow {
  id: string;
  type: ConversationType;
  name: string | null;
  admin_id: string | null;
  participant_ids: string;
  [key: string]: unknown;
}

export async function getConversation(id: string, db: Queryable = pool): Promise<ConversationRow | null> {
  const { rows } = await db.query('SELECT * FROM conversations WHERE id=$1', [id]);
  return (rows[0] as ConversationRow | undefined) ?? null;
}

/** Member ids: participant rows, or the legacy JSON column for a conversation that has none. */
export async function participantIds(conv: Pick<ConversationRow, 'id' | 'participant_ids'>, db: Queryable = pool): Promise<string[]> {
  const { rows } = await db.query('SELECT user_id FROM conversation_participants WHERE conversation_id=$1', [conv.id]);
  if (rows.length) return rows.map((r: { user_id: string }) => String(r.user_id));
  try { return (JSON.parse(conv.participant_ids || '[]') as unknown[]).map(String); } catch { return []; }
}

export async function memberRole(conv: Pick<ConversationRow, 'id' | 'participant_ids' | 'admin_id'>, userId: string, db: Queryable = pool): Promise<'admin' | 'member' | null> {
  const { rows } = await db.query('SELECT role FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2', [conv.id, userId]);
  if (rows[0]) return rows[0].role === 'admin' ? 'admin' : 'member';
  const ids = await participantIds(conv, db);
  if (!ids.includes(String(userId))) return null;
  return String(conv.admin_id) === String(userId) ? 'admin' : 'member';
}

/** For a one-to-one chat: the other person. */
export function otherMember(ids: string[], me: string): string | null {
  return ids.find((id) => id !== String(me)) ?? null;
}

/** Why `userId` can't post in this conversation right now, or null when they can. */
export async function postRefusal(conv: ConversationRow, ids: string[], userId: string, role: 'admin' | 'member' | null): Promise<string | null> {
  if (conv.type === 'dm') {
    const other = otherMember(ids, userId);
    if (other && await isBlockedEitherWay(userId, other)) return 'You can’t send messages in this chat.';
  }
  if (conv.type === 'channel' && role !== 'admin') return 'Only channel admins can post here.';
  return null;
}

/** Why `adder` can't put `target` in a group, or null when they can. */
export async function addRefusal(adder: string, target: string): Promise<string | null> {
  if (adder === target) return null;
  return messageRefusal(adder, target);
}

export async function existingUserIds(ids: string[], db: Queryable = pool): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { rows } = await db.query('SELECT id FROM users WHERE id = ANY($1::uuid[]) AND NOT is_banned', [ids]);
  return new Set(rows.map((r: { id: string }) => String(r.id)));
}

export async function displayNames(ids: string[], db: Queryable = pool): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { rows } = await db.query('SELECT user_id, display_name FROM user_profiles WHERE user_id = ANY($1::uuid[])', [ids]);
  return new Map(rows.map((r: { user_id: string; display_name: string | null }) => [String(r.user_id), r.display_name || 'User']));
}

/**
 * Add someone to a chat. `accepted: false` puts it in their Requests (a first
 * message from someone they don't follow) until they accept or reply.
 */
export async function addMember(
  db: Queryable, conv: Pick<ConversationRow, 'id'>, userId: string,
  { role = 'member', accepted = true }: { role?: 'admin' | 'member'; accepted?: boolean } = {},
): Promise<void> {
  await db.query(
    `INSERT INTO conversation_participants (conversation_id, user_id, role, accepted_at) VALUES ($1, $2, $3, ${accepted ? 'NOW()' : 'NULL'})
     ON CONFLICT (conversation_id, user_id) DO NOTHING`,
    [conv.id, userId, role],
  );
  await syncLegacyColumns(db, conv.id);
}

/** SQL for one member's unread messages in conversation `c` (participant row `cp`, user `$me`). */
export function unreadCountSql(me: string): string {
  return `(SELECT COUNT(*)::int FROM messages m
            WHERE m.conversation_id = c.id AND m.sender_id <> ${me}
              AND m.created_at > GREATEST(COALESCE(cp.last_read_at, '-infinity'), COALESCE(cp.hidden_before, '-infinity'))
              AND NOT EXISTS (SELECT 1 FROM message_hidden h WHERE h.user_id = ${me} AND h.message_id = m.id))`;
}

/** SQL: message `m` is visible to `$me` (not before "delete chat for me", not deleted for me). */
export function visibleToSql(me: string, cpAlias = 'cp', mAlias = 'm'): string {
  return `${mAlias}.created_at > COALESCE(${cpAlias}.hidden_before, '-infinity')
          AND NOT EXISTS (SELECT 1 FROM message_hidden h WHERE h.user_id = ${me} AND h.message_id = ${mAlias}.id)`;
}

export const MUTE_DURATIONS: Record<string, string | null> = { '8h': "NOW() + INTERVAL '8 hours'", '1w': "NOW() + INTERVAL '7 days'", always: "'infinity'", off: null };

export async function removeMember(db: Queryable, conv: Pick<ConversationRow, 'id'>, userId: string): Promise<void> {
  await db.query('DELETE FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2', [conv.id, userId]);
  await syncLegacyColumns(db, conv.id);
}

/** Keep the legacy JSON columns in step with the participant rows (older app versions read them). */
async function syncLegacyColumns(db: Queryable, convId: string): Promise<void> {
  await db.query(
    `UPDATE conversations c SET
       participant_ids = COALESCE((SELECT json_agg(cp.user_id::text ORDER BY cp.joined_at)::text FROM conversation_participants cp WHERE cp.conversation_id = c.id), '[]'),
       participant_names = COALESCE((SELECT json_agg(COALESCE(up.display_name, 'User') ORDER BY cp.joined_at)::text
                                       FROM conversation_participants cp LEFT JOIN user_profiles up ON up.user_id = cp.user_id
                                      WHERE cp.conversation_id = c.id), '[]'),
       updated_at = NOW()
     WHERE c.id = $1`,
    [convId],
  );
}

// ── Business chats ────────────────────────────────────────────────────────────

export interface BusinessRow { id: string; owner_id: string; business_name: string; business_logo_url: string | null }

export async function getBusiness(id: string, db: Queryable = pool): Promise<BusinessRow | null> {
  const { rows } = await db.query('SELECT id, owner_id, business_name, business_logo_url FROM businesses WHERE id=$1', [id]);
  return (rows[0] as BusinessRow | undefined) ?? null;
}

export type ContextKind = 'product' | 'order' | 'showroom' | 'quote';
export interface ContextCard { kind: ContextKind; id?: string; title: string; image?: string | null; url?: string; status?: string; note?: string }

const firstImage = (raw: unknown): string | null => {
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list) && typeof list[0] === 'string' ? list[0] : null;
  } catch { return typeof raw === 'string' && raw.startsWith('http') ? raw : null; }
};

/**
 * What a business chat is about, checked against the business: its own
 * product or showroom, or an order between this customer and this business.
 * A snapshot (title, photo, link), never a price, so the card can't go stale.
 * Returns null when it doesn't belong to this chat.
 */
export async function contextCard(
  kind: unknown, id: unknown, business: BusinessRow, customerId: string, extra: { note?: string } = {},
): Promise<ContextCard | null> {
  if (kind === 'quote') return { kind: 'quote', title: (extra.note ?? 'Quote request').slice(0, 120) };
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (kind === 'product') {
    const { rows: [p] } = await pool.query('SELECT id, title, images, business_id, seller_id FROM products WHERE id=$1', [id]);
    if (!p || !(String(p.business_id) === business.id || (!p.business_id && String(p.seller_id) === business.owner_id))) return null;
    return { kind, id: p.id, title: p.title, image: firstImage(p.images), url: `/products/${p.id}` };
  }
  if (kind === 'showroom') {
    const { rows: [s] } = await pool.query("SELECT id, title, slug, cover_image, logo_url, business_id FROM showrooms WHERE id=$1 AND status='published'", [id]);
    if (!s || String(s.business_id) !== business.id) return null;
    return { kind, id: s.id, title: s.title, image: s.cover_image || s.logo_url || null, url: s.slug ? `/showroom/${s.slug}` : undefined };
  }
  if (kind === 'order') {
    const { rows: [o] } = await pool.query('SELECT id, buyer_id, seller_id, business_id, product_title, product_id, status FROM orders WHERE id=$1', [id]);
    const sameBusiness = o && (String(o.business_id) === business.id || (!o.business_id && String(o.seller_id) === business.owner_id));
    if (!o || !sameBusiness || String(o.buyer_id) !== customerId) return null;
    let image: string | null = null;
    if (o.product_id) { const { rows: [p] } = await pool.query('SELECT images FROM products WHERE id=$1', [o.product_id]); image = firstImage(p?.images); }
    return { kind, id: o.id, title: o.product_title, image, url: `/orders?order=${o.id}`, status: o.status };
  }
  return null;
}

const CONTEXT_ICON: Record<string, string> = { product: '🛍️', order: '📦', showroom: '🏪', quote: '📋' };

/** The one-line summary shown in the chat list. */
export function messagePreview(type: string, content: string): string {
  if (type === 'image') return '📷 Photo';
  if (type === 'file') return '📎 File';
  if (type === 'product') return '🛍️ Product';
  if (type === 'order_update') return '📦 Order update';
  if (type === 'context') {
    try {
      const card = JSON.parse(content) as ContextCard;
      const label = card.kind === 'order' ? `Order: ${card.title}` : card.kind === 'quote' ? `Quote request: ${card.title}` : card.title;
      return `${CONTEXT_ICON[card.kind] ?? '📌'} ${label}`.slice(0, 200);
    } catch { return '📌 Shared item'; }
  }
  return content.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/** Recompute the chat list summary after a message disappears. */
export async function refreshLastMessage(db: Queryable, convId: string): Promise<void> {
  const { rows: [last] } = await db.query(
    'SELECT type, content, created_at FROM messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 1',
    [convId],
  );
  await db.query(
    'UPDATE conversations SET last_message=$1, last_message_at=$2, updated_at=NOW() WHERE id=$3',
    [last ? messagePreview(last.type, last.content) : '', last?.created_at ?? null, convId],
  );
}

/**
 * Content check shared by send, edit, inquiry and forward.
 * NOTE: cleanContent is NOT called for 'product' and 'order_update' message types —
 * those carry their payload in metadata and set content to ''.
 * Returns the cleaned text or an error.
 */
export function cleanContent(raw: unknown): { ok: true; text: string } | { ok: false; message: string } {
  if (typeof raw !== 'string') return { ok: false, message: 'Write a message first.' };
  const text = raw.trim();
  if (!text) return { ok: false, message: 'Write a message first.' };
  if (text.length > MAX_MESSAGE_LENGTH) return { ok: false, message: 'Messages can be up to 4,000 characters.' };
  return { ok: true, text };
}

/** Photos and files must be our own uploads (https), never scripts or other schemes. */
export function isSafeAttachmentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch { return false; }
}

/**
 * In-app notifications for a new message, one row per recipient. Returns the
 * inserted rows; failures are logged (a lost notification must be visible in
 * the logs) but never fail the send.
 */
export async function insertMessageNotifications(
  recipients: string[], title: string, body: string, link: string, type: 'message' | 'inquiry' = 'message',
): Promise<Array<Record<string, unknown>>> {
  if (!recipients.length) return [];
  const values = recipients.map((_, i) => `($${i * 4 + 1}, '${type}', $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, FALSE)`).join(',');
  const params = recipients.flatMap((rid) => [rid, title.slice(0, 200), body.slice(0, 500), link]);
  try {
    const { rows } = await pool.query(`INSERT INTO notifications (user_id, type, title, body, link, is_read) VALUES ${values} RETURNING *`, params);
    return rows as Array<Record<string, unknown>>;
  } catch (err) {
    logger.error({ err: (err as Error).message, recipients: recipients.length }, 'message notification insert failed');
    return [];
  }
}
