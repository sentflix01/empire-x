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
import { messageRefusal } from '../lib/socialGraph';
import { requireAuth } from '../middleware/auth';
import {
  addMember, addRefusal, cleanContent, CONVERSATION_TYPES, DELETE_FOR_EVERYONE_WINDOW_MS, displayNames, EDIT_WINDOW_MS,
  existingUserIds, getConversation, insertMessageNotifications, isSafeAttachmentUrl, MAX_GROUP_MEMBERS, memberRole,
  MESSAGE_TYPES, messagePreview, participantIds, postRefusal, refreshLastMessage, removeMember,
  type ConversationRow, type ConversationType,
} from '../lib/messaging';
import {
  emitNewMessage, emitMessageEdited, emitMessageDeleted, emitNotification, emitPresenceUpdated, removeUserFromConversationRoom,
} from '../socket';
import { sendPushToUser } from './push';
import logger from '../lib/logger';
import { getRedis } from '../lib/redis';
import * as apiError from '../lib/apiError';
import type { Redis as RedisClient } from 'ioredis';

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
async function deliver(conv: ConversationRow, ids: string[], senderId: string, fields: { content: string; type: string; reply_to_id?: string | null }) {
  const names = await displayNames([senderId]);
  const senderName = names.get(senderId) ?? null;
  const { rows: [message] } = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, sender_name, content, type, reply_to_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [conv.id, senderId, senderName, fields.content, fields.type, fields.reply_to_id ?? null],
  );
  await pool.query('UPDATE conversations SET last_message=$1, last_message_at=NOW(), updated_at=NOW() WHERE id=$2', [messagePreview(fields.type, fields.content), conv.id]);
  emitNewMessage(conv.id, message as Record<string, unknown>);

  const recipients = ids.filter((id) => id !== senderId);
  const preview = messagePreview(fields.type, fields.content).slice(0, 80);
  const where = conv.type === 'dm' ? '' : ` in ${conv.name ?? 'a group'}`;
  const title = `${senderName ?? 'Someone'}${where}`;
  const link = `/messages/${conv.id}`;
  void insertMessageNotifications(recipients, title, preview, link).then((rows) => {
    for (const n of rows) emitNotification(String(n.user_id), n);
    for (const rid of recipients) sendPushToUser(rid, title, preview, link).catch(() => undefined);
  });
  return message as Record<string, unknown>;
}

// ── Conversations ─────────────────────────────────────────────────────────────

router.get('/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, cp.role AS my_role, cp.last_read_at,
              (SELECT COUNT(*)::int FROM messages m
                WHERE m.conversation_id=c.id AND m.created_at > COALESCE(cp.last_read_at, '-infinity') AND m.sender_id <> $1) AS unread_count
         FROM conversations c
         JOIN conversation_participants cp ON cp.conversation_id=c.id AND cp.user_id=$1
        ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC
        LIMIT 100`,
      [req.user!.id],
    );
    res.json(rows);
  } catch (err) { fail(res, err, 'load your chats'); }
});

router.get('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    res.json({ ...found.conv, my_role: found.role });
  } catch (err) { fail(res, err, 'load this chat'); }
});

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
    const conv = await createConversation('dm', me, [target_user_id], {});
    res.status(201).json(conv);
  } catch (err) { fail(res, err, 'open this chat'); }
});

async function createConversation(type: ConversationType, creatorId: string, others: string[], meta: { name?: string | null; description?: string | null; avatar_url?: string | null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [conv] } = await client.query(
      `INSERT INTO conversations (type, name, description, avatar_url, admin_id, last_message, participant_ids, participant_names)
       VALUES ($1, $2, $3, $4, $5, '', '[]', '[]') RETURNING *`,
      [type, meta.name ?? null, meta.description ?? null, meta.avatar_url ?? null, type === 'dm' ? null : creatorId],
    );
    await addMember(client, conv, creatorId, type === 'dm' ? 'member' : 'admin');
    for (const uid of others) await addMember(client, conv, uid, 'member');
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
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT * FROM messages WHERE conversation_id=$1 ${before ? 'AND created_at<$3' : ''} ORDER BY created_at DESC, id DESC LIMIT $2
       ) newest ORDER BY created_at ASC, id ASC`,
      before ? [found.conv.id, limit, before] : [found.conv.id, limit],
    );
    res.json(rows);
  } catch (err) { fail(res, err, 'load messages'); }
});

router.post('/conversations/:convId/messages', requireAuth, sendLimiter, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.convId); if (!found) return;
    const me = String(req.user!.id);
    if (!found.role) { apiError.forbidden(res, 'You’re not in this conversation'); return; }
    const { content, type, reply_to_id } = req.body as Record<string, unknown>;
    const msgType = (MESSAGE_TYPES as readonly string[]).includes(type as string) ? type as string : 'text';
    const clean = cleanContent(content);
    if (!clean.ok) { apiError.validationError(res, clean.message); return; }
    if (msgType !== 'text' && !isSafeAttachmentUrl(clean.text)) { apiError.validationError(res, 'That photo or file link isn’t valid'); return; }
    const why = await postRefusal(found.conv, found.ids, me, found.role);
    if (why) { refuse(res, why); return; }
    let replyTo: string | null = null;
    if (reply_to_id !== undefined && reply_to_id !== null) {
      if (typeof reply_to_id !== 'string' || !UUID.test(reply_to_id)) { apiError.validationError(res, 'reply_to_id is not valid'); return; }
      const { rows } = await pool.query('SELECT 1 FROM messages WHERE id=$1 AND conversation_id=$2', [reply_to_id, found.conv.id]);
      if (!rows.length) { apiError.validationError(res, 'The message you’re replying to isn’t in this chat'); return; }
      replyTo = reply_to_id;
    }
    const message = await deliver(found.conv, found.ids, me, { content: clean.text, type: msgType, reply_to_id: replyTo });
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

router.put('/messages/:id', requireAuth, editMessage);
router.delete('/messages/:id', requireAuth, deleteMessage);

/** Remove your own messages from this chat, for everyone. */
router.delete('/conversations/:id/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const found = await loadForMember(req, res, req.params.id); if (!found) return;
    const { rows } = await pool.query('DELETE FROM messages WHERE conversation_id=$1 AND sender_id=$2 RETURNING id', [found.conv.id, req.user!.id]);
    await refreshLastMessage(pool, found.conv.id);
    for (const r of rows) emitMessageDeleted(found.conv.id, String(r.id));
    res.json({ success: true, deleted: rows.length });
  } catch (err) { fail(res, err, 'clear your messages'); }
});

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

// ── /api/messages/:id aliases (what the app calls). Registered last so the
//    named routes above (/presence, /inquiry, /block/…) always win.

const onlyUuid = (handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => {
  if (!UUID.test(req.params.id)) { next(); return; }
  void handler(req, res);
};
router.put('/:id', requireAuth, onlyUuid(editMessage));
router.delete('/:id', requireAuth, onlyUuid(deleteMessage));
router.post('/:id/forward', requireAuth, sendLimiter, onlyUuid(forwardMessage));

module.exports = router;
