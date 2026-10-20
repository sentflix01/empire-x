/**
 * routes/messages.ts — Conversations and real-time messaging
 *
 * Rules live in lib/messaging.ts (members, who can post, content limits,
 * notifications) and lib/socialGraph.ts ("who can message me", blocks).
 * Message actions are served at /api/messages/:id (what the app calls) and at
 * the older /api/messages/messages/:id.
 */
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import pool from '../db/pool';
import { follows, messageRefusal } from '../lib/socialGraph';
import { requireAuth } from '../middleware/auth';
import {
  addMember, addRefusal, cleanContent, CONVERSATION_TYPES, DELETE_FOR_EVERYONE_WINDOW_MS, displayNames, EDIT_WINDOW_MS,
  existingUserIds, getConversation, insertMessageNotifications, isSafeAttachmentUrl, MAX_GROUP_MEMBERS, memberRole,
  MESSAGE_TYPES, messagePreview, MUTE_DURATIONS, participantIds, postRefusal, refreshLastMessage, removeMember,
  unreadCountSql, visibleToSql, type ConversationRow, type ConversationType,
} from '../lib/messaging';
import {
  emitNewMessage, emitMessageEdited, emitMessageDeleted, emitNotification, emitPresenceUpdated, emitToUser,
  removeUserFromConversationRoom, emitReactionAdded, emitReactionRemoved, emitMessagePinned, emitMessageUnpinned,
} from '../socket';
import { sendPushToUser } from './push';
import logger from '../lib/logger';
import { getRedis } from '../lib/redis';
import * as apiError from '../lib/apiError';
import type { Redis as RedisClient } from 'ioredis';
import { classify, decide } from '../lib/clef';

const router = Router();
const memPresence = new Map<string, { status: string; last_seen: string }>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const perUser = (max: number, message: string) => rateLimit({
  windowMs: 60 * 1000, limit: max, standardHeaders: true, legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  keyGenerator: (req: Request) => `user:${req.user?.id ?? 'anon'}`,
  message: { error: 'rate_limited', message },
});
const sendLimiter = perUser(30, 'You’re sending messages too quickly. Wait a moment.');
const startLimiter = perUser(20, 'You’re starting chats too quickly. Wait a moment.');

const isAdmin = (req: Request) => req.user!.role === 'admin';
const refuse = (res: Response, message: string) => res.status(403).json({ error: 'messages_not_allowed', code: 'MESSAGES_NOT_ALLOWED', message });
const fail = (res: Response, err: unknown, what: string) => {
  // Clef blocked the content — surface a clear 400 to the sender
  if ((err as Error & { clefBlocked?: boolean }).clefBlocked) {
    res.status(400).json({ error: 'content_blocked', message: 'Your message could not be sent. Please review our content guidelines.' });
    return;
  }
  logger.error({ err: (err as Error).message }, `${what} failed`);
  apiError.serverError(res, `Could not ${what}. Please try again.`);
};

/** The conversation when the caller is a member (or a site admin): otherwise answers 404/403 and returns null. */
async function loadForMember(req: Request, res: Response, id: string): Promise<{ conv: ConversationRow; ids: string[]; role: 'admin' | 'member' | null } | null> {
  if (!UUID.test(id)) { apiError.notFound(res, 'Conversation not found'); return null; }
  const conv = await getConversation(id);
  if (!conv) { apiError.notFound(res, 'Conversation not found'); return null; }
  const role = await memberRole(conv, req.user!.id);
  if (!role && !isAdmin(req)) { apiError.forbidden(res, 'You’re not in this conversation'); return null; }
  return { conv, ids: await participantIds(conv), role };
}

/** Save a message, update the chat list, tell the room, notify the other members. */
async function deliver(conv: ConversationRow, ids: string[], senderId: string, fields: { content: string; type: string; reply_to_id?: string | null; metadata?: Record<string, unknown> | null }) {
  // ── Clef-Flash content classification (text messages only, fail-open) ──────
  // Runs before the DB write. null result = Clef unavailable → proceed normally.
  if (fields.type === 'text' && fields.content) {
    try {
      const clefResult = await classify(fields.content);
      const decision   = decide(clefResult);
      if (decision === 'block') {
        logger.warn(
          { senderId, convId: conv.id, spam: clefResult?.spam, policy: clefResult?.policy },
          'Clef blocked message — spam or policy violation',
        );
        // Throw so the calling route handler can surface a 400 to the sender.
        const err = new Error('Message blocked by content policy') as Error & { clefBlocked: true };
        err.clefBlocked = true;
        throw err;
      }
      if (decision === 'flag') {
        // Flag for admin review in the background; message still delivers.
        pool.query(
          `INSERT INTO reports (reporter_id, target_type, reason, details)
           VALUES ($1, 'message', 'auto_flagged', $2)
           ON CONFLICT DO NOTHING`,
          [
            senderId,
            JSON.stringify({ convId: conv.id, spam: clefResult?.spam, policy: clefResult?.policy, confidence: clefResult?.policyConfidence }),
          ],
        ).catch((e: unknown) => logger.warn({ err: (e as Error).message }, 'Clef flag: failed to insert message report'));
      }
    } catch (clefErr) {
      // Re-throw intentional blocks; swallow unexpected classifier errors (fail-open).
      if ((clefErr as Error & { clefBlocked?: boolean }).clefBlocked) throw clefErr;
      logger.warn({ err: (clefErr as Error).message }, 'Clef message classification error — proceeding');
    }
  }

  const names = await displayNames([senderId]);
  const senderName = names.get(senderId) ?? null;
  const { rows: [message] } = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, sender_name, content, type, reply_to_id, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [conv.id, senderId, senderName, fields.content, fields.type, fields.reply_to_id ?? null, fields.metadata ?? null],
  );
  const preview = messagePreview(fields.type, fields.content);
  await pool.query('UPDATE conversations SET last_message=$1, last_message_at=NOW(), updated_at=NOW() WHERE id=$2', [preview, conv.id]);
  // Sending is reading: the sender has seen everything up to here, and replying accepts a request.
  await pool.query(
    `UPDATE conversation_participants SET last_read_at=NOW(), last_delivered_at=NOW(), accepted_at=COALESCE(accepted_at, NOW())
      WHERE conversation_id=$1 AND user_id=$2`,
    [conv.id, senderId],
  );
  emitNewMessage(conv.id, message as Record<string, unknown>);

  const { rows: state } = await pool.query(
    `SELECT user_id, (muted_until IS NOT NULL AND muted_until > NOW()) AS muted, (accepted_at IS NULL) AS request
       FROM conversation_participants WHERE conversation_id=$1 AND user_id <> $2`,
    [conv.id, senderId],
  );
  const summary = { conversation_id: conv.id, last_message: preview, last_message_at: message.created_at, last_message_sender_id: senderId, last_message_id: message.id };
  for (const id of ids) emitToUser(id, 'conversation_updated', summary);
  for (const s of state) emitToUser(String(s.user_id), 'unread_changed', { conversation_id: conv.id });

  const short = preview.slice(0, 80);
  const link = `/messages/${conv.id}`;
  const where = conv.type === 'dm' ? '' : ` in ${conv.name ?? 'a group'}`;
  const notify = async (recipients: string[], title: string) => {
    const rows = await insertMessageNotifications(recipients, title, short, link);
    for (const n of rows) emitNotification(String(n.user_id), n);
    for (const rid of recipients) sendPushToUser(rid, title, short, link).catch(() => undefined);
  };
  // Muted chats stay quiet; a request says so.
  const awake = state.filter((s) => !s.muted);
  void notify(awake.filter((s) => !s.request).map((s) => String(s.user_id)), `${senderName ?? 'Someone'}${where}`);
  void notify(awake.filter((s) => s.request).map((s) => String(s.user_id)), `Message request from ${senderName ?? 'someone'}`);
  return message as Record<string, unknown>;
}

const BOXES: Record<string, string> = {
  // New messages bring an archived chat back, unless it's muted.
  chats: `cp.accepted_at IS NOT NULL AND (cp.archived_at IS NULL OR (last.created_at > cp.archived_at AND NOT (cp.muted_until IS NOT NULL AND cp.muted_until > NOW())))`,
  requests: 'cp.accepted_at IS NULL',
  archived: `cp.accepted_at IS NOT NULL AND cp.archived_at IS NOT NULL AND (last.created_at IS NULL OR last.created_at <= cp.archived_at OR (cp.muted_until IS NOT NULL AND cp.muted_until > NOW()))`,
};
// Older app versions ask without a box: everything that isn't archived (requests included).
BOXES.all = `(${BOXES.chats}) OR (${BOXES.requests})`;

/** One person's view of their chats: last visible message, unread, the other person, ticks. */
async function listConversations(me: string, box: string, onlyId?: string) {
  const { rows } = await pool.query(
    `SELECT c.id, c.type, c.name, c.description, c.avatar_url, c.admin_id, c.created_at, c.updated_at, c.participant_ids, c.participant_names,
            cp.role AS my_role, cp.last_read_at, cp.accepted_at, cp.muted_until, cp.archived_at,
            (cp.accepted_at IS NULL) AS is_request,
            (cp.muted_until IS NOT NULL AND cp.muted_until > NOW()) AS muted,
            last.id AS last_message_id, last.sender_id AS last_message_sender_id, last.type AS last_message_type,
            last.content AS last_message_content, COALESCE(last.created_at, c.created_at) AS last_message_at,
            ${unreadCountSql('$1')} AS unread_count,
            other.user_id AS other_user_id, other.display_name AS other_name, other.avatar_url AS other_avatar,
            other.last_delivered_at AS other_last_delivered_at,
            CASE WHEN COALESCE(mine.read_receipts, TRUE) AND COALESCE(other.read_receipts, TRUE) THEN other.last_read_at END AS other_last_read_at
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
       LEFT JOIN user_profiles mine ON mine.user_id = $1
       LEFT JOIN LATERAL (
         SELECT m.id, m.sender_id, m.type, m.content, m.created_at FROM messages m
          WHERE m.conversation_id = c.id AND ${visibleToSql('$1')}
          ORDER BY m.created_at DESC LIMIT 1
       ) last ON TRUE
       LEFT JOIN LATERAL (
         SELECT op.user_id, op.last_read_at, op.last_delivered_at, up.display_name, up.avatar_url, up.read_receipts
           FROM conversation_participants op LEFT JOIN user_profiles up ON up.user_id = op.user_id
          WHERE c.type = 'dm' AND op.conversation_id = c.id AND op.user_id <> $1 LIMIT 1
       ) other ON TRUE
      WHERE (cp.hidden_before IS NULL OR last.id IS NOT NULL)
        AND (${BOXES[box] ?? BOXES.all})
        ${onlyId ? 'AND c.id = $2' : ''}
      ORDER BY COALESCE(last.created_at, c.created_at) DESC
      LIMIT 100`,
    onlyId ? [me, onlyId] : [me],
  );
  return rows.map((r) => {
    const { last_message_content, ...rest } = r as Record<string, unknown>;
    return { ...rest, last_message: r.last_message_id ? messagePreview(String(r.last_message_type), String(last_message_content)) : '' };
  });
}

// ── Conversations ─────────────────────────────────────────────────────────────

/** `?box=chats|requests|archived` (no box: chats and requests, for older app versions). */
router.get('/conversations', requireAuth, async (req: Request, res: Response) => {
  const box = typeof req.query.box === 'string' ? req.query.box : 'all';
  if (!BOXES[box]) { apiError.validationError(res, 'box must be chats, requests or archived'); return; }
  try {
    res.set('Cache-Control', 'private, no-store');
    res.json(await listConversations(String(req.user!.id), box));
  } catch (err) { fail(res, err, 'load your chats'); }
});

/** Badge numbers: chats with unread messages (not muted or archived), and waiting requests. */
router.get('/unread-count', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: [counts] } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE x.unread > 0 AND x.accepted AND NOT x.muted AND NOT x.archived)::int AS chats,
              COALESCE(SUM(x.unread) FILTER (WHERE x.accepted AND NOT x.muted AND NOT x.archived), 0)::int AS messages,
              COUNT(*) FILTER (WHERE x.unread > 0 AND NOT x.accepted)::int AS requests
         FROM (
           SELECT ${unreadCountSql('$1')} AS unread, cp.accepted_at IS NOT NULL AS accepted,
                  (cp.muted_until IS NOT NULL AND cp.muted_until > NOW()) AS muted,
                  (cp.archived_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM messages lm WHERE lm.conversation_id = c.id AND lm.created_at > cp.archived_at)) AS archived
             FROM conversations c JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
         ) x`,
      [req.user!.id],
    );
    res.set('Cache-Control', 'private, no-store');
    res.json(counts);
  } catch (err) { fail(res, err, 'count unread messages'); }
});

/** The chat plus everyone in it, with "delivered" and (when both people allow it) "seen". */
router.get('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    const me = String(req.user!.id);
    const { rows: members } = await pool.query(
      `SELECT cp.user_id, cp.role, cp.last_delivered_at, cp.joined_at, up.display_name, up.avatar_url,
              CASE WHEN cp.user_id = $2 OR (COALESCE(up.read_receipts, TRUE) AND COALESCE(mine.read_receipts, TRUE)) THEN cp.last_read_at END AS last_read_at
         FROM conversation_participants cp
         LEFT JOIN user_profiles up ON up.user_id = cp.user_id
         LEFT JOIN user_profiles mine ON mine.user_id = $2
        WHERE cp.conversation_id = $1
        ORDER BY cp.joined_at`,
      [found.conv.id, me],
    );
    const [mine] = found.role ? await listConversations(me, 'all', found.conv.id).then((l) => l.length ? l : listConversations(me, 'archived', found.conv.id)) : [];
    res.set('Cache-Control', 'private, no-store');
    res.json({ ...found.conv, ...(mine ?? {}), my_role: found.role, members });
  } catch (err) { fail(res, err, 'load this chat'); }
});

/** I opened the chat: everything up to now is read (and delivered). */
router.post('/conversations/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    if (!found.role) { apiError.forbidden(res, 'You’re not in this conversation'); return; }
    const me = String(req.user!.id);
    const { rows: [row] } = await pool.query(
      `UPDATE conversation_participants
          SET last_read_at = GREATEST(COALESCE(last_read_at, '-infinity'), NOW()),
              last_delivered_at = GREATEST(COALESCE(last_delivered_at, '-infinity'), NOW())
        WHERE conversation_id = $1 AND user_id = $2
        RETURNING last_read_at, last_delivered_at`,
      [found.conv.id, me],
    );
    await pool.query(
      "UPDATE notifications SET is_read = TRUE, updated_at = NOW() WHERE user_id = $1 AND link = $2 AND is_read = FALSE AND type IN ('message', 'inquiry')",
      [me, `/messages/${found.conv.id}`],
    );
    // "Seen" reaches only people who share read receipts with me (both switched on).
    const { rows: receipts } = await pool.query(
      `SELECT cp.user_id FROM conversation_participants cp
         LEFT JOIN user_profiles up ON up.user_id = cp.user_id
        WHERE cp.conversation_id = $1 AND cp.user_id <> $2 AND COALESCE(up.read_receipts, TRUE)
          AND COALESCE((SELECT read_receipts FROM user_profiles WHERE user_id = $2), TRUE)`,
      [found.conv.id, me],
    );
    for (const r of receipts) emitToUser(String(r.user_id), 'conversation_read', { conversation_id: found.conv.id, user_id: me, last_read_at: row.last_read_at });
    for (const id of found.ids.filter((i) => i !== me)) emitToUser(id, 'conversation_delivered', { conversation_id: found.conv.id, user_id: me, last_delivered_at: row.last_delivered_at });
    emitToUser(me, 'unread_changed', { conversation_id: found.conv.id });
    res.json(row);
  } catch (err) { fail(res, err, 'mark the chat as read'); }
});

/** My app received new messages (✓✓ for the sender). Body: { conversation_ids?: [...] } — omitted: all my chats. */
router.post('/delivered', requireAuth, async (req: Request, res: Response) => {
  const raw = (req.body as { conversation_ids?: unknown }).conversation_ids;
  const ids = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string' && UUID.test(v)).slice(0, 100) : null;
  try {
    const me = String(req.user!.id);
    const { rows } = await pool.query(
      `UPDATE conversation_participants cp SET last_delivered_at = NOW()
        WHERE cp.user_id = $1 ${ids ? 'AND cp.conversation_id = ANY($2::uuid[])' : ''}
          AND EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = cp.conversation_id AND m.sender_id <> $1
                       AND m.created_at > COALESCE(cp.last_delivered_at, '-infinity'))
        RETURNING cp.conversation_id, cp.last_delivered_at`,
      ids ? [me, ids] : [me],
    );
    for (const r of rows) {
      const { rows: others } = await pool.query('SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id <> $2', [r.conversation_id, me]);
      for (const o of others) emitToUser(String(o.user_id), 'conversation_delivered', { conversation_id: r.conversation_id, user_id: me, last_delivered_at: r.last_delivered_at });
    }
    res.json({ updated: rows.length });
  } catch (err) { fail(res, err, 'update delivery'); }
});

/** Body: { duration: '8h' | '1w' | 'always' | 'off' }. Muted chats send no notifications and don't count in the badge. */
router.put('/conversations/:id/mute', requireAuth, async (req: Request, res: Response) => {
  const duration = String((req.body as { duration?: unknown }).duration ?? '');
  if (!(duration in MUTE_DURATIONS)) { apiError.validationError(res, 'duration must be 8h, 1w, always or off'); return; }
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    if (!found.role) { apiError.forbidden(res, 'You’re not in this conversation'); return; }
    const until = MUTE_DURATIONS[duration];
    const { rows: [row] } = await pool.query(
      `UPDATE conversation_participants SET muted_until = ${until ?? 'NULL'} WHERE conversation_id = $1 AND user_id = $2 RETURNING muted_until`,
      [found.conv.id, req.user!.id],
    );
    emitToUser(String(req.user!.id), 'unread_changed', { conversation_id: found.conv.id });
    res.json({ muted: Boolean(row.muted_until), muted_until: row.muted_until });
  } catch (err) { fail(res, err, 'mute the chat'); }
});

/** Body: { archived: boolean }. A new message brings the chat back unless it's muted. */
router.put('/conversations/:id/archive', requireAuth, async (req: Request, res: Response) => {
  const archived = (req.body as { archived?: unknown }).archived;
  if (typeof archived !== 'boolean') { apiError.validationError(res, 'archived must be true or false'); return; }
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    if (!found.role) { apiError.forbidden(res, 'You’re not in this conversation'); return; }
    await pool.query(`UPDATE conversation_participants SET archived_at = ${archived ? 'NOW()' : 'NULL'} WHERE conversation_id = $1 AND user_id = $2`, [found.conv.id, req.user!.id]);
    emitToUser(String(req.user!.id), 'unread_changed', { conversation_id: found.conv.id });
    res.json({ archived });
  } catch (err) { fail(res, err, 'archive the chat'); }
});

/** Accept a message request: it moves to Chats. */
router.post('/conversations/:id/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    if (!found.role) { apiError.forbidden(res, 'You’re not in this conversation'); return; }
    await pool.query('UPDATE conversation_participants SET accepted_at = COALESCE(accepted_at, NOW()) WHERE conversation_id = $1 AND user_id = $2', [found.conv.id, req.user!.id]);
    emitToUser(String(req.user!.id), 'unread_changed', { conversation_id: found.conv.id });
    res.json({ accepted: true });
  } catch (err) { fail(res, err, 'accept the request'); }
});

/** Delete the chat for me: older messages disappear for me only; a new message brings it back. Also declines a request. */
async function deleteChatForMe(req: Request, res: Response) {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    if (!found.role) { apiError.forbidden(res, 'You’re not in this conversation'); return; }
    await pool.query(
      'UPDATE conversation_participants SET hidden_before = NOW(), last_read_at = NOW(), archived_at = NULL WHERE conversation_id = $1 AND user_id = $2',
      [found.conv.id, req.user!.id],
    );
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND link = $2 AND is_read = FALSE", [req.user!.id, `/messages/${found.conv.id}`]);
    emitToUser(String(req.user!.id), 'unread_changed', { conversation_id: found.conv.id });
    res.json({ success: true });
  } catch (err) { fail(res, err, 'delete the chat'); }
}
router.delete('/conversations/:id/for-me', requireAuth, deleteChatForMe);

/** Open the one-to-one chat with someone, creating it the first time. */
router.post('/conversations/find-or-create', requireAuth, startLimiter, async (req: Request, res: Response) => {
  const { target_user_id } = req.body as { target_user_id?: unknown };
  if (typeof target_user_id !== 'string' || !UUID.test(target_user_id)) { apiError.validationError(res, 'target_user_id is required'); return; }
  const me = String(req.user!.id);
  if (target_user_id === me) { apiError.validationError(res, 'You can’t message yourself'); return; }
  try {
    const { rows: [existing] } = await pool.query(
      `SELECT c.* FROM conversations c
         JOIN conversation_participants a ON a.conversation_id=c.id AND a.user_id=$1
         JOIN conversation_participants b ON b.conversation_id=c.id AND b.user_id=$2
        WHERE c.type='dm' AND (SELECT COUNT(*) FROM conversation_participants x WHERE x.conversation_id=c.id)=2
        LIMIT 1`,
      [me, target_user_id],
    );
    if (existing) { res.json(existing); return; }
    if (!(await existingUserIds([target_user_id])).has(target_user_id)) { apiError.notFound(res, 'User not found'); return; }
    const refusal = await messageRefusal(me, target_user_id);
    if (refusal) { refuse(res, refusal); return; }
    // From someone they don't follow, the chat waits in their Requests.
    const accepted = await follows(target_user_id, me);
    const conv = await createConversation('dm', me, [target_user_id], {}, accepted ? undefined : new Set([target_user_id]));
    res.status(201).json(conv);
  } catch (err) { fail(res, err, 'open this chat'); }
});

async function createConversation(
  type: ConversationType, creatorId: string, others: string[],
  meta: { name?: string | null; description?: string | null; avatar_url?: string | null },
  requestFor: Set<string> = new Set(),
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [conv] } = await client.query(
      `INSERT INTO conversations (type, name, description, avatar_url, admin_id, last_message, participant_ids, participant_names)
       VALUES ($1, $2, $3, $4, $5, '', '[]', '[]') RETURNING *`,
      [type, meta.name ?? null, meta.description ?? null, meta.avatar_url ?? null, type === 'dm' ? null : creatorId],
    );
    await addMember(client, conv, creatorId, { role: type === 'dm' ? 'member' : 'admin' });
    for (const uid of others) await addMember(client, conv, uid, { accepted: !requestFor.has(uid) });
    await client.query('COMMIT');
    return (await getConversation(conv.id as string)) as ConversationRow;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* connection gone */ }
    throw err;
  } finally { client.release(); }
}

const textField = (v: unknown, max: number): { ok: true; value: string | null } | { ok: false } => {
  if (v === undefined || v === null || v === '') return { ok: true, value: null };
  if (typeof v !== 'string' || v.length > max) return { ok: false };
  return { ok: true, value: v.trim() || null };
};

/** Create a group or channel. One-to-one chats only come from find-or-create. */
router.post('/conversations', requireAuth, startLimiter, async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const type = (body.type ?? 'group') as string;
  if (type === 'dm' || !(CONVERSATION_TYPES as readonly string[]).includes(type)) { apiError.validationError(res, 'type must be group or channel'); return; }
  let raw: unknown = body.participant_ids ?? [];
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string' || !UUID.test(v))) { apiError.validationError(res, 'participant_ids must be a list of user ids'); return; }
  const me = String(req.user!.id);
  const others = [...new Set((raw as string[]).filter((id) => id !== me))];
  if (others.length + 1 > MAX_GROUP_MEMBERS) { apiError.validationError(res, `Groups can have up to ${MAX_GROUP_MEMBERS} members`); return; }
  const name = textField(body.name, 100); const description = textField(body.description, 500); const avatar = textField(body.avatar_url, 1000);
  if (!name.ok || !description.ok || !avatar.ok) { apiError.validationError(res, 'name, description and avatar_url must be short text'); return; }
  if (!name.value) { apiError.validationError(res, 'Give the group a name'); return; }
  try {
    const known = await existingUserIds(others);
    const missing = others.filter((id) => !known.has(id));
    if (missing.length) { apiError.validationError(res, 'Some people could not be found'); return; }
    for (const id of others) {
      const why = await addRefusal(me, id);
      if (why) { refuse(res, `${(await displayNames([id])).get(id) ?? 'Someone'} can’t be added: ${why}`); return; }
    }
    const conv = await createConversation(type as ConversationType, me, others, { name: name.value, description: description.value, avatar_url: avatar.value });
    res.status(201).json(conv);
  } catch (err) { fail(res, err, 'create the group'); }
});

router.put('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    if (found.conv.type === 'dm') { apiError.validationError(res, 'One-to-one chats have no name to change'); return; }
    if (found.role !== 'admin' && !isAdmin(req)) { apiError.forbidden(res, 'Only group admins can change this'); return; }
    const body = req.body as Record<string, unknown>;
    const limits: Record<string, number> = { name: 100, description: 500, avatar_url: 1000 };
    const updates: Record<string, string | null> = {};
    for (const [field, max] of Object.entries(limits)) {
      if (body[field] === undefined) continue;
      const v = textField(body[field], max);
      if (!v.ok) { apiError.validationError(res, `${field} must be ${max} characters or fewer`); return; }
      updates[field] = v.value;
    }
    if (!Object.keys(updates).length) { apiError.validationError(res, 'Nothing to change'); return; }
    if ('name' in updates && !updates.name) { apiError.validationError(res, 'Give the group a name'); return; }
    const sets = Object.keys(updates).map((f, i) => `${f}=$${i + 1}`).join(', ');
    const { rows: [conv] } = await pool.query(`UPDATE conversations SET ${sets}, updated_at=NOW() WHERE id=$${Object.keys(updates).length + 1} RETURNING *`, [...Object.values(updates), found.conv.id]);
    res.json(conv);
  } catch (err) { fail(res, err, 'update the group'); }
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get('/conversations/:convId/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.convId); if (!found) return;
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '100', 10) || 100, 1), 500);
    const before = req.query.before ? new Date(req.query.before as string) : null;
    if (before && Number.isNaN(before.getTime())) { apiError.validationError(res, 'before must be a valid date'); return; }
    // The newest `limit` messages (older than the cursor when paging back), returned oldest-first.
    // Hidden for me: before "delete chat for me", or a single message deleted for me.
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT m.* FROM messages m
           LEFT JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = $3
          WHERE m.conversation_id=$1 AND ${visibleToSql('$3')} ${before ? 'AND m.created_at<$4' : ''}
          ORDER BY m.created_at DESC, m.id DESC LIMIT $2
       ) newest ORDER BY created_at ASC, id ASC`,
      before ? [found.conv.id, limit, req.user!.id, before] : [found.conv.id, limit, req.user!.id],
    );
    res.json(rows);
  } catch (err) { fail(res, err, 'load messages'); }
});

router.post('/conversations/:convId/messages', requireAuth, sendLimiter, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.convId); if (!found) return;
    const me = String(req.user!.id);
    if (!found.role) { apiError.forbidden(res, 'You’re not in this conversation'); return; }
    const { content, type, reply_to_id, metadata: rawMetadata } = req.body as Record<string, unknown>;
    const msgType = (MESSAGE_TYPES as readonly string[]).includes(type as string) ? type as string : 'text';

    let msgContent: string;
    let msgMetadata: Record<string, unknown> | null = null;

    if (msgType === 'product') {
      // product messages carry their payload in metadata; content is empty
      if (
        typeof rawMetadata !== 'object' || rawMetadata === null ||
        typeof (rawMetadata as Record<string, unknown>).product_id !== 'string' ||
        !UUID.test((rawMetadata as Record<string, unknown>).product_id as string)
      ) {
        apiError.validationError(res, 'metadata.product_id must be a valid UUID for product messages'); return;
      }
      msgContent = '';
      msgMetadata = rawMetadata as Record<string, unknown>;
    } else if (msgType === 'order_update') {
      // order_update messages carry their payload in metadata; content is empty
      if (
        typeof rawMetadata !== 'object' || rawMetadata === null ||
        typeof (rawMetadata as Record<string, unknown>).order_id !== 'string' ||
        typeof (rawMetadata as Record<string, unknown>).status !== 'string'
      ) {
        apiError.validationError(res, 'metadata.order_id and metadata.status are required for order_update messages'); return;
      }
      msgContent = '';
      msgMetadata = rawMetadata as Record<string, unknown>;
    } else {
      // text / image / file — validate through cleanContent
      const clean = cleanContent(content);
      if (!clean.ok) { apiError.validationError(res, clean.message); return; }
      if (msgType !== 'text' && !isSafeAttachmentUrl(clean.text)) { apiError.validationError(res, 'That photo or file link isn\u2019t valid'); return; }
      msgContent = clean.text;
    }

    const why = await postRefusal(found.conv, found.ids, me, found.role);
    if (why) { refuse(res, why); return; }
    let replyTo: string | null = null;
    if (reply_to_id !== undefined && reply_to_id !== null) {
      if (typeof reply_to_id !== 'string' || !UUID.test(reply_to_id)) { apiError.validationError(res, 'reply_to_id is not valid'); return; }
      const { rows } = await pool.query('SELECT 1 FROM messages WHERE id=$1 AND conversation_id=$2', [reply_to_id, found.conv.id]);
      if (!rows.length) { apiError.validationError(res, 'The message you\u2019re replying to isn\u2019t in this chat'); return; }
      replyTo = reply_to_id;
    }
    const message = await deliver(found.conv, found.ids, me, { content: msgContent, type: msgType, reply_to_id: replyTo, metadata: msgMetadata });
    res.status(201).json(message);
  } catch (err) { fail(res, err, 'send the message'); }
});

async function editMessage(req: Request, res: Response) {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    const { rows: [msg] } = await pool.query('SELECT * FROM messages WHERE id=$1', [req.params.id]);
    if (!msg) { apiError.notFound(res, 'Message not found'); return; }
    const me = String(req.user!.id);
    if (String(msg.sender_id) !== me) { apiError.forbidden(res, 'You can only edit your own messages'); return; }
    if (msg.type !== 'text') { apiError.validationError(res, 'Only text messages can be edited'); return; }
    if (Date.now() - new Date(msg.created_at).getTime() > EDIT_WINDOW_MS) { apiError.validationError(res, 'Messages can be edited for 15 minutes after sending'); return; }
    const clean = cleanContent((req.body as Record<string, unknown>).content);
    if (!clean.ok) { apiError.validationError(res, clean.message); return; }
    const conv = await getConversation(String(msg.conversation_id));
    if (!conv) { apiError.notFound(res, 'Message not found'); return; }
    const ids = await participantIds(conv);
    const role = await memberRole(conv, me);
    if (!role) { apiError.forbidden(res, 'You’re no longer in this conversation'); return; }
    const why = await postRefusal(conv, ids, me, role);
    if (why) { refuse(res, why); return; }
    const { rows: [updated] } = await pool.query('UPDATE messages SET content=$1, edited=TRUE, updated_at=NOW() WHERE id=$2 RETURNING *', [clean.text, msg.id]);
    const { rows: [latest] } = await pool.query('SELECT id FROM messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 1', [conv.id]);
    if (latest && String(latest.id) === String(msg.id)) await refreshLastMessage(pool, conv.id);
    emitMessageEdited(conv.id, updated as Record<string, unknown>);
    res.json(updated);
  } catch (err) { fail(res, err, 'edit the message'); }
}

/** Delete for everyone: your own message within 24 hours (site admins: any). */
async function deleteMessage(req: Request, res: Response) {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    const { rows: [msg] } = await pool.query('SELECT * FROM messages WHERE id=$1', [req.params.id]);
    if (!msg) { apiError.notFound(res, 'Message not found'); return; }
    const mine = String(msg.sender_id) === String(req.user!.id);
    if (!mine && !isAdmin(req)) { apiError.forbidden(res, 'You can only delete your own messages'); return; }
    if (mine && !isAdmin(req) && Date.now() - new Date(msg.created_at).getTime() > DELETE_FOR_EVERYONE_WINDOW_MS) {
      apiError.validationError(res, 'Messages can be deleted for everyone within 24 hours of sending'); return;
    }
    await pool.query('DELETE FROM messages WHERE id=$1', [msg.id]);
    await refreshLastMessage(pool, String(msg.conversation_id));
    emitMessageDeleted(String(msg.conversation_id), String(msg.id));
    res.json({ success: true });
  } catch (err) { fail(res, err, 'delete the message'); }
}

/** Delete for me: any message in a chat I'm in disappears for me only. */
async function deleteMessageForMe(req: Request, res: Response) {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    const { rows: [msg] } = await pool.query('SELECT id, conversation_id FROM messages WHERE id=$1', [req.params.id]);
    const conv = msg ? await getConversation(String(msg.conversation_id)) : null;
    if (!msg || !conv || !(await memberRole(conv, String(req.user!.id)))) { apiError.notFound(res, 'Message not found'); return; }
    await pool.query('INSERT INTO message_hidden (user_id, message_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user!.id, msg.id]);
    emitToUser(String(req.user!.id), 'message_hidden', { conversation_id: conv.id, id: msg.id });
    emitToUser(String(req.user!.id), 'unread_changed', { conversation_id: conv.id });
    res.json({ success: true });
  } catch (err) { fail(res, err, 'delete the message'); }
}

router.put('/messages/:id', requireAuth, editMessage);
router.delete('/messages/:id', requireAuth, deleteMessage);
router.delete('/messages/:id/for-me', requireAuth, deleteMessageForMe);

/** "Clear history": the same as deleting the chat for me (the other person keeps theirs). */
router.delete('/conversations/:id/history', requireAuth, deleteChatForMe);

router.post('/conversations/:id/leave', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    if (!found.role) { apiError.forbidden(res, 'You’re not in this conversation'); return; }
    if (found.conv.type === 'dm') { apiError.validationError(res, 'You can’t leave a one-to-one chat'); return; }
    const me = String(req.user!.id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await removeMember(client, found.conv, me);
      // The last admin leaving hands the group to the longest-standing member.
      const { rows: admins } = await client.query("SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND role='admin'", [found.conv.id]);
      if (!admins.length) {
        const { rows: [next] } = await client.query(
          `UPDATE conversation_participants SET role='admin'
            WHERE conversation_id=$1 AND user_id=(SELECT user_id FROM conversation_participants WHERE conversation_id=$1 ORDER BY joined_at LIMIT 1)
            RETURNING user_id`,
          [found.conv.id],
        );
        await client.query('UPDATE conversations SET admin_id=$1 WHERE id=$2', [next?.user_id ?? null, found.conv.id]);
      }
      await client.query('COMMIT');
    } catch (err) { try { await client.query('ROLLBACK'); } catch { /* gone */ } throw err; } finally { client.release(); }
    removeUserFromConversationRoom(me, found.conv.id);
    res.json({ success: true });
  } catch (err) { fail(res, err, 'leave the group'); }
});

router.post('/conversations/:id/members', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    if (found.conv.type === 'dm') { apiError.validationError(res, 'Start a group to chat with more people'); return; }
    if (found.role !== 'admin' && !isAdmin(req)) { apiError.forbidden(res, 'Only group admins can add people'); return; }
    const { user_id } = req.body as { user_id?: unknown };
    if (typeof user_id !== 'string' || !UUID.test(user_id)) { apiError.validationError(res, 'user_id is required'); return; }
    if (found.ids.includes(user_id)) { res.status(409).json({ error: 'already_member', message: 'Already in this group' }); return; }
    if (found.ids.length >= MAX_GROUP_MEMBERS) { apiError.validationError(res, `Groups can have up to ${MAX_GROUP_MEMBERS} members`); return; }
    if (!(await existingUserIds([user_id])).has(user_id)) { apiError.notFound(res, 'User not found'); return; }
    const why = await addRefusal(String(req.user!.id), user_id);
    if (why) { refuse(res, why); return; }
    await addMember(pool, found.conv, user_id);
    res.json({ success: true });
  } catch (err) { fail(res, err, 'add this person'); }
});

router.delete('/conversations/:id/members/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    if (found.role !== 'admin' && !isAdmin(req)) { apiError.forbidden(res, 'Only group admins can remove people'); return; }
    if (!found.ids.includes(req.params.userId)) { apiError.notFound(res, 'Member not found'); return; }
    await removeMember(pool, found.conv, req.params.userId);
    removeUserFromConversationRoom(req.params.userId, found.conv.id);
    res.json({ success: true });
  } catch (err) { fail(res, err, 'remove this person'); }
});

router.delete('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    if (found.conv.type === 'dm' && !isAdmin(req)) { apiError.validationError(res, 'One-to-one chats can’t be deleted for both people'); return; }
    if (found.role !== 'admin' && !isAdmin(req)) { apiError.forbidden(res, 'Only group admins can delete the group'); return; }
    await pool.query('DELETE FROM conversations WHERE id=$1', [found.conv.id]);
    for (const id of found.ids) removeUserFromConversationRoom(id, found.conv.id);
    res.json({ success: true });
  } catch (err) { fail(res, err, 'delete the group'); }
});

// ── Presence ──────────────────────────────────────────────────────────────────

router.put('/presence', requireAuth, async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };
  if (!['online', 'offline', 'away'].includes(status ?? '')) { apiError.validationError(res, 'status must be online, offline, or away'); return; }
  try {
    const presence = { status: status!, last_seen: new Date().toISOString() };
    memPresence.set(req.user!.id, presence);
    if (memPresence.size > 50_000) memPresence.delete(memPresence.keys().next().value as string);
    const redis = getRedis();
    if (!redis.isNoOp) (redis as RedisClient).set(`presence:${req.user!.id}`, JSON.stringify(presence), 'EX', 15 * 60).catch(() => undefined);
    if (status === 'online' || status === 'offline') pool.query('UPDATE users SET last_seen=NOW() WHERE id=$1', [req.user!.id]).catch(() => undefined);
    // presence_visibility='nobody' (Settings › Privacy) keeps the status private.
    const { rows: vis } = await pool.query('SELECT presence_visibility FROM user_profiles WHERE user_id=$1', [req.user!.id]);
    if (vis[0]?.presence_visibility !== 'nobody') await emitPresenceUpdated(req.user!.id, presence as Parameters<typeof emitPresenceUpdated>[1]);
    res.json({ success: true, ...presence });
  } catch (err) { fail(res, err, 'update your status'); }
});

router.get('/presence/:userId', requireAuth, async (req: Request, res: Response) => {
  const hidden = { user_id: req.params.userId, status: 'offline', last_seen: null, hidden: true };
  try {
    if (!UUID.test(req.params.userId)) { res.json(hidden); return; }
    if (String(req.user!.id) !== req.params.userId) {
      const { rows: bl } = await pool.query(
        'SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1) LIMIT 1',
        [req.params.userId, req.user!.id],
      );
      if (bl.length) { res.json(hidden); return; }
      const { rows: vis } = await pool.query('SELECT presence_visibility FROM user_profiles WHERE user_id=$1', [req.params.userId]);
      if (vis[0]?.presence_visibility === 'nobody') { res.json(hidden); return; }
    }
    let status = 'offline'; let last_seen: string | null = null;
    const redis = getRedis();
    if (!redis.isNoOp) {
      try { const c = await (redis as RedisClient).get(`presence:${req.params.userId}`); if (c) { const p = JSON.parse(c); status = p.status || 'offline'; last_seen = p.last_seen || null; } } catch { /* use memory / database */ }
    }
    const mem = memPresence.get(req.params.userId);
    if (mem && (!last_seen || mem.last_seen > last_seen)) { last_seen = mem.last_seen; status = mem.status; }
    if (last_seen && Date.now() - new Date(last_seen).getTime() >= 15 * 60 * 1000) status = 'offline';
    if (!last_seen) { const { rows } = await pool.query('SELECT last_seen FROM users WHERE id=$1', [req.params.userId]); if (rows[0]?.last_seen) last_seen = rows[0].last_seen; }
    res.json({ user_id: req.params.userId, status, last_seen, hidden: false });
  } catch (err) { fail(res, err, 'load their status'); }
});

router.put('/presence/settings', requireAuth, async (req: Request, res: Response) => {
  const { visibility } = req.body as { visibility?: string };
  if (!['everyone', 'nobody'].includes(visibility ?? '')) { apiError.validationError(res, 'visibility must be everyone or nobody'); return; }
  try { await pool.query('UPDATE user_profiles SET presence_visibility=$1, updated_at=NOW() WHERE user_id=$2', [visibility, req.user!.id]); res.json({ visibility }); }
  catch (err) { fail(res, err, 'save your setting'); }
});

// ── Block (same behaviour as /api/social/block) ──────────────────────────────

async function block(req: Request, res: Response) {
  const other = req.params.targetId;
  const me = String(req.user!.id);
  if (!UUID.test(other)) { apiError.notFound(res, 'User not found'); return; }
  if (other === me) { apiError.validationError(res, 'You can’t block yourself'); return; }
  const client = await pool.connect();
  try {
    if (!(await existingUserIds([other], client)).has(other)) { apiError.notFound(res, 'User not found'); return; }
    await client.query('BEGIN');
    await client.query('INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [me, other]);
    // Blocking ends follows both ways, like /api/social/block.
    const { rows: ended } = await client.query(
      'DELETE FROM follows WHERE (follower_id=$1 AND followed_id=$2) OR (follower_id=$2 AND followed_id=$1) RETURNING follower_id, followed_id',
      [me, other],
    );
    for (const f of ended as Array<{ follower_id: string; followed_id: string }>) {
      await client.query('UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = $1', [f.follower_id]);
      await client.query('UPDATE user_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = $1', [f.followed_id]);
    }
    await client.query('COMMIT');
    res.json({ success: true, blocked: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* gone */ }
    fail(res, err, 'block this person');
  } finally { client.release(); }
}

router.post('/block/:targetId', requireAuth, block);
router.delete('/block/:targetId', requireAuth, async (req: Request, res: Response) => {
  try { await pool.query('DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2', [req.user!.id, req.params.targetId]); res.json({ success: true, blocked: false }); }
  catch (err) { fail(res, err, 'unblock this person'); }
});
/** `blocked`: I blocked them. `blocked_me`: they blocked me (the chat then can't be used). */
router.get('/block/:targetId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!UUID.test(req.params.targetId)) { res.json({ blocked: false, blocked_me: false }); return; }
    const { rows } = await pool.query(
      'SELECT blocker_id FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)',
      [req.user!.id, req.params.targetId],
    );
    const by = rows.map((r: { blocker_id: string }) => String(r.blocker_id));
    res.json({ blocked: by.includes(String(req.user!.id)), blocked_me: by.includes(req.params.targetId) });
  } catch (err) { fail(res, err, 'check this person'); }
});

// ── Forward ───────────────────────────────────────────────────────────────────

async function forwardMessage(req: Request, res: Response) {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    const me = String(req.user!.id);
    const { rows: [src] } = await pool.query('SELECT * FROM messages WHERE id=$1', [req.params.id]);
    // Only someone who can already read the source conversation may copy from it.
    // Answer 404 like a missing message so outsiders cannot probe message IDs.
    const srcConv = src ? await getConversation(String(src.conversation_id)) : null;
    if (!src || !srcConv || (!(await memberRole(srcConv, me)) && !isAdmin(req))) { apiError.notFound(res, 'Message not found'); return; }
    const { target_conversation_id } = req.body as { target_conversation_id?: unknown };
    if (typeof target_conversation_id !== 'string') { apiError.validationError(res, 'target_conversation_id is required'); return; }
    const target = await loadForMember(req, res, target_conversation_id); if (!target) return;
    if (!target.role) { apiError.forbidden(res, 'You’re not in that conversation'); return; }
    const why = await postRefusal(target.conv, target.ids, me, target.role);
    if (why) { refuse(res, why); return; }
    const message = await deliver(target.conv, target.ids, me, { content: String(src.content), type: String(src.type || 'text') });
    res.status(201).json(message);
  } catch (err) { fail(res, err, 'forward the message'); }
}
router.post('/messages/:id/forward', requireAuth, sendLimiter, forwardMessage);

// ── Inquiry ("Get a quote" on a showroom) ────────────────────────────────────

router.post('/inquiry', requireAuth, startLimiter, async (req: Request, res: Response) => {
  const { receiver_id, subject, body } = req.body as Record<string, unknown>;
  const me = String(req.user!.id);
  if (typeof receiver_id !== 'string' || !UUID.test(receiver_id)) { apiError.validationError(res, 'receiver_id is required'); return; }
  if (receiver_id === me) { apiError.validationError(res, 'You can’t send a request to yourself'); return; }
  const subj = typeof subject === 'string' ? subject.trim().slice(0, 120) : '';
  const clean = cleanContent(subj && typeof body === 'string' ? `📋 ${subj}\n\n${body.trim()}` : body);
  if (!clean.ok) { apiError.validationError(res, clean.message); return; }
  try {
    if (!(await existingUserIds([receiver_id])).has(receiver_id)) { apiError.notFound(res, 'Business owner not found'); return; }
    const { rows: [existing] } = await pool.query(
      `SELECT c.* FROM conversations c
         JOIN conversation_participants a ON a.conversation_id=c.id AND a.user_id=$1
         JOIN conversation_participants b ON b.conversation_id=c.id AND b.user_id=$2
        WHERE c.type='dm' AND (SELECT COUNT(*) FROM conversation_participants x WHERE x.conversation_id=c.id)=2
        LIMIT 1`,
      [me, receiver_id],
    );
    let conv = existing as ConversationRow | undefined;
    if (!conv) {
      const refusal = await messageRefusal(me, receiver_id);
      if (refusal) { refuse(res, refusal); return; }
      conv = await createConversation('dm', me, [receiver_id], {});
    }
    const ids = await participantIds(conv);
    const why = await postRefusal(conv, ids, me, 'member');
    if (why) { refuse(res, why); return; }
    const msg = await deliver(conv, ids, me, { content: clean.text, type: 'text' });
    res.status(201).json({ success: true, conversation_id: conv.id, message_id: msg.id });
  } catch (err) { fail(res, err, 'send your request'); }
});

// ── Message Reactions ─────────────────────────────────────────────────────────

const reactLimiter = perUser(60, "You're reacting too quickly. Wait a moment.");

/** SQL helper: recompute the JSONB reactions cache for a message from message_reactions rows. */
const reactionsCacheSql = `
  SELECT COALESCE(
    (
      SELECT jsonb_object_agg(emoji, jsonb_build_object('count', cnt, 'users', users))
        FROM (
          SELECT emoji,
                 COUNT(*)::int              AS cnt,
                 jsonb_agg(user_id::text)   AS users
            FROM message_reactions
           WHERE message_id = $1
           GROUP BY emoji
        ) agg
    ),
    '{}'::jsonb
  ) AS reactions
`;

/** POST /api/messages/messages/:id/reactions — add a reaction */
router.post('/messages/:id/reactions', requireAuth, reactLimiter, async (req: Request, res: Response) => {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    const { emoji } = req.body as { emoji?: unknown };
    if (typeof emoji !== 'string' || emoji.trim().length === 0 || emoji.length > 20) {
      apiError.validationError(res, 'emoji must be a non-empty string of at most 20 characters'); return;
    }
    const { rows: [msg] } = await pool.query<{ id: string; conversation_id: string }>('SELECT id, conversation_id FROM messages WHERE id=$1', [req.params.id]);
    if (!msg) { apiError.notFound(res, 'Message not found'); return; }
    const found = await loadForMember(req, res, String(msg.conversation_id)); if (!found) return;
    await pool.query(
      'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [msg.id, req.user!.id, emoji],
    );
    const { rows: [cache] } = await pool.query<{ reactions: Record<string, unknown> }>(reactionsCacheSql, [msg.id]);
    await pool.query('UPDATE messages SET reactions=$1 WHERE id=$2', [cache.reactions, msg.id]);
    emitReactionAdded(String(msg.conversation_id), {
      message_id: String(msg.id),
      user_id: String(req.user!.id),
      emoji,
      reactions: cache.reactions,
    });
    res.status(201).json({ reactions: cache.reactions });
  } catch (err) { fail(res, err, 'add reaction'); }
});

/** DELETE /api/messages/messages/:id/reactions — remove a reaction */
router.delete('/messages/:id/reactions', requireAuth, reactLimiter, async (req: Request, res: Response) => {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    const { emoji } = req.body as { emoji?: unknown };
    if (typeof emoji !== 'string' || emoji.trim().length === 0) {
      apiError.validationError(res, 'emoji is required'); return;
    }
    const { rows: [msg] } = await pool.query<{ id: string; conversation_id: string }>('SELECT id, conversation_id FROM messages WHERE id=$1', [req.params.id]);
    if (!msg) { apiError.notFound(res, 'Message not found'); return; }
    const found = await loadForMember(req, res, String(msg.conversation_id)); if (!found) return;
    await pool.query(
      'DELETE FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
      [msg.id, req.user!.id, emoji],
    );
    const { rows: [cache] } = await pool.query<{ reactions: Record<string, unknown> }>(reactionsCacheSql, [msg.id]);
    await pool.query('UPDATE messages SET reactions=$1 WHERE id=$2', [cache.reactions, msg.id]);
    emitReactionRemoved(String(msg.conversation_id), {
      message_id: String(msg.id),
      user_id: String(req.user!.id),
      emoji,
      reactions: cache.reactions,
    });
    res.json({ reactions: cache.reactions });
  } catch (err) { fail(res, err, 'remove reaction'); }
});

/** GET /api/messages/messages/:id/reactions — list reactions grouped by emoji */
router.get('/messages/:id/reactions', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    const { rows: [msg] } = await pool.query<{ id: string; conversation_id: string }>('SELECT id, conversation_id FROM messages WHERE id=$1', [req.params.id]);
    if (!msg) { apiError.notFound(res, 'Message not found'); return; }
    const found = await loadForMember(req, res, String(msg.conversation_id)); if (!found) return;
    const { rows } = await pool.query(
      `SELECT mr.emoji, mr.user_id::text, up.display_name, up.avatar_url
         FROM message_reactions mr
         LEFT JOIN user_profiles up ON up.user_id = mr.user_id
        WHERE mr.message_id = $1
        ORDER BY mr.emoji, mr.created_at`,
      [msg.id],
    );
    // Group by emoji
    const grouped: Record<string, { count: number; users: Array<{ user_id: string; display_name: string | null; avatar_url: string | null }> }> = {};
    for (const row of rows as Array<{ emoji: string; user_id: string; display_name: string | null; avatar_url: string | null }>) {
      if (!grouped[row.emoji]) grouped[row.emoji] = { count: 0, users: [] };
      grouped[row.emoji].count += 1;
      grouped[row.emoji].users.push({ user_id: row.user_id, display_name: row.display_name, avatar_url: row.avatar_url });
    }
    res.json(grouped);
  } catch (err) { fail(res, err, 'load reactions'); }
});

// ── Message Search ────────────────────────────────────────────────────────────

const searchLimiter = perUser(30, "You're searching too quickly. Wait a moment.");

/** GET /api/messages/search?q=…&conversationId=…&limit=…&page=… */
router.get('/search', requireAuth, searchLimiter, async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q || q.length > 200) { apiError.validationError(res, 'q must be 1-200 characters'); return; }

    const rawConvId = typeof req.query.conversationId === 'string' ? req.query.conversationId : undefined;
    if (rawConvId !== undefined && !UUID.test(rawConvId)) {
      apiError.validationError(res, 'conversationId must be a valid UUID'); return;
    }

    const rawLimit = parseInt((req.query.limit as string) || '20', 10);
    const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 20 : rawLimit, 1), 50);

    const rawPage = parseInt((req.query.page as string) || '1', 10);
    const page = Math.max(Number.isNaN(rawPage) ? 1 : rawPage, 1);
    const offset = (page - 1) * limit;

    const userId = String(req.user!.id);

    // If a specific conversation is requested, verify membership first
    if (rawConvId) {
      const found = await loadForMember(req, res, rawConvId);
      if (!found) return;
    }

    // Build a safe tsquery for prefix matching; fall back to ILIKE on invalid input
    let useFullText = true;
    let tsquery = '';
    try {
      // Sanitise: remove characters that break tsquery syntax, then build prefix query
      const sanitised = q.replace(/[&|!():*]/g, ' ').trim().split(/\s+/).filter(Boolean).join(' & ');
      tsquery = sanitised ? `${sanitised}:*` : '';
      if (!tsquery) useFullText = false;
    } catch {
      useFullText = false;
    }

    const params: unknown[] = [userId];
    let convFilter = '';
    if (rawConvId) {
      params.push(rawConvId);
      convFilter = `AND m.conversation_id = $${params.length}`;
    }

    let rows: Record<string, unknown>[] = [];
    let totalCount = 0;

    if (useFullText) {
      // Attempt full-text search; catch parse errors and retry with ILIKE
      try {
        params.push(tsquery);
        const tsParam = `$${params.length}`;
        params.push(`%${q}%`);
        const ilikeParam = `$${params.length}`;
        params.push(limit);
        const limitParam = `$${params.length}`;
        params.push(offset);
        const offsetParam = `$${params.length}`;

        const { rows: r } = await pool.query<Record<string, unknown>>(
          `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.type, m.created_at,
                  c.name AS conversation_name
             FROM messages m
             JOIN conversation_participants cp
               ON cp.conversation_id = m.conversation_id AND cp.user_id = $1
             LEFT JOIN conversations c ON c.id = m.conversation_id
            WHERE (
                    m.search_vector @@ to_tsquery('simple', ${tsParam})
                    OR m.content ILIKE ${ilikeParam}
                  )
              ${convFilter}
            ORDER BY m.created_at DESC
            LIMIT ${limitParam} OFFSET ${offsetParam}`,
          params,
        );

        // Count query (reuse same filter params minus limit/offset)
        const countParams = params.slice(0, params.length - 2);
        const { rows: cnt } = await pool.query<{ total: string }>(
          `SELECT COUNT(*)::int AS total
             FROM messages m
             JOIN conversation_participants cp
               ON cp.conversation_id = m.conversation_id AND cp.user_id = $1
            WHERE (
                    m.search_vector @@ to_tsquery('simple', ${tsParam})
                    OR m.content ILIKE ${ilikeParam}
                  )
              ${convFilter}`,
          countParams,
        );
        rows = r;
        totalCount = Number(cnt[0]?.total ?? 0);
      } catch {
        // tsquery was invalid; fall through to ILIKE-only
        useFullText = false;
        rows = [];
        totalCount = 0;
      }
    }

    if (!useFullText) {
      // Pure ILIKE fallback
      const ilikeParams: unknown[] = [userId, `%${q}%`];
      if (rawConvId) ilikeParams.push(rawConvId);
      const convFilterIlike = rawConvId ? `AND m.conversation_id = $${ilikeParams.length}` : '';
      ilikeParams.push(limit);
      const limitParam = `$${ilikeParams.length}`;
      ilikeParams.push(offset);
      const offsetParam = `$${ilikeParams.length}`;

      const { rows: r } = await pool.query<Record<string, unknown>>(
        `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.type, m.created_at,
                c.name AS conversation_name
           FROM messages m
           JOIN conversation_participants cp
             ON cp.conversation_id = m.conversation_id AND cp.user_id = $1
           LEFT JOIN conversations c ON c.id = m.conversation_id
          WHERE m.content ILIKE $2
            ${convFilterIlike}
          ORDER BY m.created_at DESC
          LIMIT ${limitParam} OFFSET ${offsetParam}`,
        ilikeParams,
      );

      const countIlikeParams = ilikeParams.slice(0, ilikeParams.length - 2);
      const { rows: cnt } = await pool.query<{ total: string }>(
        `SELECT COUNT(*)::int AS total
           FROM messages m
           JOIN conversation_participants cp
             ON cp.conversation_id = m.conversation_id AND cp.user_id = $1
          WHERE m.content ILIKE $2
            ${convFilterIlike}`,
        countIlikeParams,
      );
      rows = r;
      totalCount = Number(cnt[0]?.total ?? 0);
    }

    const nextPage = offset + limit < totalCount ? page + 1 : null;
    res.set('Cache-Control', 'private, no-store');
    res.json({ messages: rows, total: totalCount, nextPage });
  } catch (err) { fail(res, err, 'search messages'); }
});

// ── Pin & Save ────────────────────────────────────────────────────────────────

const pinLimiter = perUser(30, "You're pinning too quickly. Wait a moment.");
const saveLimiter = perUser(60, "You're saving too quickly. Wait a moment.");

/** POST /api/messages/messages/:id/pin — pin a message in its conversation */
router.post('/messages/:id/pin', requireAuth, pinLimiter, async (req: Request, res: Response) => {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    const { rows: [msg] } = await pool.query<{ id: string; conversation_id: string }>(
      'SELECT id, conversation_id FROM messages WHERE id=$1',
      [req.params.id],
    );
    if (!msg) { apiError.notFound(res, 'Message not found'); return; }
    const found = await loadForMember(req, res, String(msg.conversation_id)); if (!found) return;
    const pinnedAt = new Date().toISOString();
    await pool.query(
      `INSERT INTO pinned_messages (conversation_id, message_id, pinned_by, pinned_at)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [msg.conversation_id, msg.id, req.user!.id, pinnedAt],
    );
    emitMessagePinned(String(msg.conversation_id), {
      message_id: String(msg.id),
      pinned_by: String(req.user!.id),
      pinned_at: pinnedAt,
      conversation_id: String(msg.conversation_id),
    });
    res.status(201).json({ success: true });
  } catch (err) { fail(res, err, 'pin the message'); }
});

/** DELETE /api/messages/messages/:id/pin — unpin a message */
router.delete('/messages/:id/pin', requireAuth, pinLimiter, async (req: Request, res: Response) => {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    const { rows: [msg] } = await pool.query<{ id: string; conversation_id: string }>(
      'SELECT id, conversation_id FROM messages WHERE id=$1',
      [req.params.id],
    );
    if (!msg) { apiError.notFound(res, 'Message not found'); return; }
    const found = await loadForMember(req, res, String(msg.conversation_id)); if (!found) return;
    await pool.query(
      'DELETE FROM pinned_messages WHERE message_id=$1 AND conversation_id=$2',
      [msg.id, msg.conversation_id],
    );
    emitMessageUnpinned(String(msg.conversation_id), {
      message_id: String(msg.id),
      conversation_id: String(msg.conversation_id),
    });
    res.json({ success: true });
  } catch (err) { fail(res, err, 'unpin the message'); }
});

/** GET /api/messages/conversations/:convId/pins — list pinned messages for a conversation */
router.get('/conversations/:convId/pins', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.convId); if (!found) return;
    const { rows } = await pool.query(
      `SELECT pm.id, pm.conversation_id, pm.message_id, pm.pinned_by, pm.pinned_at,
              m.content, m.type, m.sender_id, m.created_at AS message_created_at,
              up.display_name AS pinned_by_name
         FROM pinned_messages pm
         JOIN messages m ON m.id = pm.message_id
         LEFT JOIN user_profiles up ON up.user_id = pm.pinned_by
        WHERE pm.conversation_id = $1
        ORDER BY pm.pinned_at DESC
        LIMIT 50`,
      [found.conv.id],
    );
    res.set('Cache-Control', 'private, no-store');
    res.json(rows);
  } catch (err) { fail(res, err, 'load pinned messages'); }
});

/** POST /api/messages/saved/:id — save a message */
router.post('/saved/:id', requireAuth, saveLimiter, async (req: Request, res: Response) => {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    const { rows: [msg] } = await pool.query<{ id: string }>(
      'SELECT id FROM messages WHERE id=$1',
      [req.params.id],
    );
    if (!msg) { apiError.notFound(res, 'Message not found'); return; }
    await pool.query(
      'INSERT INTO saved_messages (user_id, message_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user!.id, msg.id],
    );
    res.status(201).json({ success: true });
  } catch (err) { fail(res, err, 'save the message'); }
});

/** DELETE /api/messages/saved/:id — unsave a message */
router.delete('/saved/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!UUID.test(req.params.id)) { apiError.notFound(res, 'Message not found'); return; }
    await pool.query(
      'DELETE FROM saved_messages WHERE user_id=$1 AND message_id=$2',
      [req.user!.id, req.params.id],
    );
    res.json({ success: true });
  } catch (err) { fail(res, err, 'unsave the message'); }
});

/** GET /api/messages/saved — list saved messages for the caller */
router.get('/saved', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT sm.id, sm.user_id, sm.message_id, sm.saved_at,
              m.content, m.type, m.sender_id, m.conversation_id, m.created_at AS message_created_at
         FROM saved_messages sm
         JOIN messages m ON m.id = sm.message_id
        WHERE sm.user_id = $1
        ORDER BY sm.saved_at DESC
        LIMIT 100`,
      [req.user!.id],
    );
    res.set('Cache-Control', 'private, no-store');
    res.json(rows);
  } catch (err) { fail(res, err, 'load saved messages'); }
});


// ── Share Product ─────────────────────────────────────────────────────────────

/** POST /api/messages/share-product — send a product card message to a conversation */
router.post('/share-product', requireAuth, sendLimiter, async (req: Request, res: Response) => {
  try {
    const { conversation_id, product_id } = req.body as Record<string, unknown>;
    if (typeof conversation_id !== 'string' || !UUID.test(conversation_id)) {
      apiError.validationError(res, 'conversation_id must be a valid UUID'); return;
    }
    if (typeof product_id !== 'string' || !UUID.test(product_id)) {
      apiError.validationError(res, 'product_id must be a valid UUID'); return;
    }

    const found = await loadForMember(req, res, conversation_id); if (!found) return;
    if (!found.role) { apiError.forbidden(res, 'You\u2019re not in this conversation'); return; }

    const why = await postRefusal(found.conv, found.ids, String(req.user!.id), found.role);
    if (why) { refuse(res, why); return; }

    const { rows: [product] } = await pool.query<{ id: string; title: string; price: number; images: unknown }>(
      'SELECT id, title, price, images FROM products WHERE id=$1',
      [product_id],
    );
    if (!product) { apiError.notFound(res, 'Product not found'); return; }

    // Resolve the first image URL from the images column (stored as JSON array or plain string)
    let firstImage: string | null = null;
    try {
      const imgs = typeof product.images === 'string'
        ? (JSON.parse(product.images) as unknown[])
        : (Array.isArray(product.images) ? product.images : []);
      firstImage = typeof imgs[0] === 'string' ? imgs[0] : null;
    } catch { /* ignore malformed images */ }

    const metadata: Record<string, unknown> = {
      product_id: product.id,
      name: product.title,
      price: product.price,
      image: firstImage,
    };

    const message = await deliver(found.conv, found.ids, String(req.user!.id), {
      content: '',
      type: 'product',
      metadata,
    });
    res.status(201).json(message);
  } catch (err) { fail(res, err, 'share the product'); }
});
// ── /api/messages/:id aliases (what the app calls). Registered last so the
//    named routes above (/presence, /inquiry, /block/…) always win.

const onlyUuid = (handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => {
  if (!UUID.test(req.params.id)) { next(); return; }
  void handler(req, res);
};
router.put('/:id', requireAuth, onlyUuid(editMessage));
router.delete('/:id', requireAuth, onlyUuid(deleteMessage));
router.delete('/:id/for-me', requireAuth, onlyUuid(deleteMessageForMe));
router.post('/:id/forward', requireAuth, sendLimiter, onlyUuid(forwardMessage));

module.exports = router;
