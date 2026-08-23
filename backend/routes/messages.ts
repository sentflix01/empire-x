/**
 * routes/messages.ts — Conversations and real-time messaging
 *
 * Phase 2: conversation_participants junction table (migrate31).
 * Falls back to legacy participant_ids JSON column when table not yet migrated.
 * Phase 3 Task 12: bulk notification INSERT for group messages (N+1 eliminated).
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { getRecord, createRecord, updateRecord, deleteRecord } from '../utils/crud';
import { emitNewMessage, emitMessageEdited, emitMessageDeleted, emitNotification, emitPresenceUpdated } from '../socket';
import { sendPushToUser } from './push';
import logger from '../lib/logger';
import { getRedis } from '../lib/redis';
import * as apiError from '../lib/apiError';
import type { PoolClient } from 'pg';
import type { Redis as RedisClient } from 'ioredis';

const router = Router();
const memPresence: Record<string, { status: string; last_seen: string }> = {};

// ── Junction table helpers ────────────────────────────────────────────────────

async function getParticipantIds(conversationId: string): Promise<string[]> {
  try {
    const { rows } = await pool.query('SELECT user_id FROM conversation_participants WHERE conversation_id=$1', [conversationId]);
    if (rows.length) return rows.map((r: {user_id:string}) => String(r.user_id));
  } catch { /* fall through */ }
  const { rows } = await pool.query('SELECT participant_ids FROM conversations WHERE id=$1', [conversationId]);
  if (!rows.length) return [];
  try { return (JSON.parse((rows[0].participant_ids as string) || '[]') as unknown[]).map(String); } catch { return []; }
}

async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  try {
    const { rows } = await pool.query('SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2', [conversationId, userId]);
    if (rows.length) return true;
    const { rows: cnt } = await pool.query('SELECT COUNT(*) FROM conversation_participants WHERE conversation_id=$1', [conversationId]);
    if (parseInt(cnt[0].count as string) > 0) return false;
  } catch { /* fall through */ }
  const ids = await getParticipantIds(conversationId);
  return ids.includes(String(userId));
}

async function isConvAdmin(conversationId: string, userId: string): Promise<boolean> {
  try {
    const { rows } = await pool.query(`SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2 AND role='admin'`, [conversationId, userId]);
    if (rows.length) return true;
  } catch { /* fall through */ }
  const { rows } = await pool.query('SELECT admin_id FROM conversations WHERE id=$1', [conversationId]);
  return !!(rows.length && String(rows[0].admin_id) === String(userId));
}

async function addParticipant(client: PoolClient, convId: string, uid: string, role='member'): Promise<void> {
  try { await client.query(`INSERT INTO conversation_participants (conversation_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT (conversation_id,user_id) DO NOTHING`, [convId, uid, role]); } catch { /* table may not exist */ }
  const { rows } = await client.query('SELECT participant_ids FROM conversations WHERE id=$1', [convId]);
  if (rows.length) {
    try {
      const ids = JSON.parse((rows[0].participant_ids as string) || '[]') as string[];
      if (!ids.includes(uid)) { ids.push(uid); await client.query('UPDATE conversations SET participant_ids=$1, updated_at=NOW() WHERE id=$2', [JSON.stringify(ids), convId]); }
    } catch { /* non-fatal */ }
  }
}

async function removeParticipant(client: PoolClient, convId: string, uid: string): Promise<void> {
  try { await client.query('DELETE FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2', [convId, uid]); } catch { /* fall through */ }
  const { rows } = await client.query('SELECT participant_ids FROM conversations WHERE id=$1', [convId]);
  if (rows.length) {
    try {
      const ids = (JSON.parse((rows[0].participant_ids as string)||'[]') as string[]).filter(id=>id!==uid);
      await client.query('UPDATE conversations SET participant_ids=$1, updated_at=NOW() WHERE id=$2', [JSON.stringify(ids), convId]);
    } catch { /* non-fatal */ }
  }
}

// ── Conversations ─────────────────────────────────────────────────────────────

router.get('/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let rows;
    try {
      const result = await pool.query(
        `SELECT c.*,cp.role AS my_role,cp.last_read_at,
                (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id=c.id AND m.created_at>COALESCE(cp.last_read_at,'1970-01-01') AND m.sender_id<>$1) AS unread_count
         FROM conversations c JOIN conversation_participants cp ON cp.conversation_id=c.id AND cp.user_id=$1
         ORDER BY c.updated_at DESC LIMIT 100`,
        [userId],
      );
      rows = result.rows.length > 0 ? result.rows : null;
    } catch { rows = null; }
    if (!rows) {
      const result = await pool.query(`SELECT * FROM conversations WHERE participant_ids::jsonb@>$1::jsonb ORDER BY updated_at DESC LIMIT 100`, [JSON.stringify([userId])]);
      rows = result.rows;
    }
    res.json(rows);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch conversations');
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const conv = await getRecord('conversations', req.params.id);
    if (!conv) { apiError.notFound(res, 'Conversation not found'); return; }
    if (!(await isParticipant(req.params.id, req.user!.id)) && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json(conv);
  } catch { res.status(500).json({ error: 'Failed to fetch conversation' }); }
});

router.post('/conversations/find-or-create', requireAuth, async (req: Request, res: Response) => {
  const { target_user_id } = req.body as { target_user_id?: string };
  if (!target_user_id) { apiError.validationError(res, 'target_user_id is required'); return; }
  const userId = String(req.user!.id);
  if (target_user_id === userId) { apiError.validationError(res, 'Cannot DM yourself'); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let existing: Record<string,unknown>|null = null;
    try {
      const { rows } = await client.query(`SELECT c.* FROM conversations c JOIN conversation_participants cp1 ON cp1.conversation_id=c.id AND cp1.user_id=$1 JOIN conversation_participants cp2 ON cp2.conversation_id=c.id AND cp2.user_id=$2 WHERE c.type='dm' AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id=c.id)=2 LIMIT 1`, [userId, target_user_id]);
      existing = rows[0] as Record<string,unknown>|undefined ?? null;
    } catch {
      const { rows } = await client.query(`SELECT * FROM conversations WHERE type='dm' AND participant_ids::jsonb@>$1::jsonb`, [JSON.stringify([userId])]);
      existing = (rows.find((c: Record<string,unknown>) => {
        try { const ids=JSON.parse(c.participant_ids as string).map(String); return ids.length===2&&ids.includes(userId)&&ids.includes(target_user_id); } catch { return false; }
      }) ?? null) as Record<string,unknown>|null;
    }
    if (existing) { await client.query('ROLLBACK'); res.json(existing); return; }
    const { rows: profiles } = await client.query('SELECT user_id,display_name FROM user_profiles WHERE user_id=ANY($1::uuid[])', [[userId, target_user_id]]);
    const myName = (profiles.find((p: Record<string,string>) => String(p.user_id)===userId) as Record<string,string>|undefined)?.display_name ?? 'User';
    const targetProf = profiles.find((p: Record<string,string>) => String(p.user_id)===target_user_id) as Record<string,string>|undefined;
    if (!targetProf) { await client.query('ROLLBACK'); apiError.notFound(res, 'User not found'); return; }
    const { rows:[conv] } = await client.query(`INSERT INTO conversations (type,last_message,participant_ids,participant_names) VALUES ('dm','',$1::text,$2::text) RETURNING *`, [JSON.stringify([userId,target_user_id]), JSON.stringify([myName,targetProf.display_name??'User'])]);
    await addParticipant(client, conv.id as string, userId);
    await addParticipant(client, conv.id as string, target_user_id);
    await client.query('COMMIT');
    res.status(201).json(conv);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err: (err as Error).message }, 'Failed to find or create conversation');
    res.status(500).json({ error: 'Failed to find or create conversation' });
  } finally { client.release(); }
});

router.post('/conversations', requireAuth, async (req: Request, res: Response) => {
  const { participant_ids, type, name, description, avatar_url } = req.body as Record<string,unknown>;
  if (!participant_ids) { apiError.validationError(res, 'participant_ids is required'); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let ids: string[];
    try { ids = Array.isArray(participant_ids) ? (participant_ids as unknown[]).map(String) : JSON.parse(participant_ids as string).map(String); }
    catch { await client.query('ROLLBACK'); apiError.validationError(res, 'participant_ids must be a JSON array'); return; }
    const creatorId = String(req.user!.id);
    if (!ids.includes(creatorId)) ids.unshift(creatorId);
    const { rows:[conv] } = await client.query(
      `INSERT INTO conversations (type,name,description,avatar_url,admin_id,last_message,participant_ids,participant_names) VALUES ($1,$2,$3,$4,$5,'',  $6::text,$7::text) RETURNING *`,
      [type??'group', name??null, description??null, avatar_url??null, creatorId, JSON.stringify(ids), JSON.stringify(ids.map(()=>'User'))],
    );
    for (const uid of ids) await addParticipant(client, conv.id as string, uid, uid===creatorId?'admin':'member');
    await client.query('COMMIT');
    res.status(201).json(conv);
  } catch (err) { await client.query('ROLLBACK'); logger.error({err},'Create group error'); res.status(500).json({ error: 'Failed to create conversation' }); }
  finally { client.release(); }
});

router.put('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const conv = await getRecord('conversations', req.params.id);
    if (!conv) { apiError.notFound(res, 'Conversation not found'); return; }
    if (!(await isConvAdmin(req.params.id, req.user!.id)) && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json(await updateRecord('conversations', req.params.id, req.body as Record<string,unknown>));
  } catch { res.status(500).json({ error: 'Failed to update conversation' }); }
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get('/conversations/:convId/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!(await isParticipant(req.params.convId, req.user!.id)) && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const limit = Math.min(parseInt((req.query.limit as string)||'100',10), 500);
    const before = req.query.before ? new Date(req.query.before as string) : null;
    const { rows } = await pool.query(
      `SELECT * FROM messages WHERE conversation_id=$1 ${before?'AND created_at<$3':''} ORDER BY created_at ASC LIMIT $2`,
      before ? [req.params.convId, limit, before] : [req.params.convId, limit],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch messages' }); }
});

router.post('/conversations/:convId/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const convId = req.params.convId;
    const userId = String(req.user!.id);
    if (!(await isParticipant(convId, userId)) && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden — not a participant' }); return; }
    const { content, type, reply_to_id } = req.body as Record<string,unknown>;
    const cleanContent = typeof content === 'string' ? content.trim() : '';
    if (!cleanContent) { apiError.validationError(res, 'content is required'); return; }
    if (cleanContent.length > 4000) { apiError.validationError(res, 'Message must be 4,000 characters or fewer'); return; }
    const msgType = ['text','image','file'].includes(type as string) ? type as string : 'text';
    const conv = await getRecord('conversations', convId);
    if (!conv) { apiError.notFound(res, 'Conversation not found'); return; }
    if ((conv as Record<string,unknown>).type === 'dm') {
      const allIds = await getParticipantIds(convId);
      const otherId = allIds.find(id=>id!==userId);
      if (otherId) {
        const { rows: blocks } = await pool.query(`SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1) LIMIT 1`, [userId, otherId]);
        if (blocks.length) { res.status(403).json({ error: 'You cannot send messages in this conversation' }); return; }
      }
    }
    const { rows: profiles } = await pool.query('SELECT display_name FROM user_profiles WHERE user_id=$1', [userId]);
    const senderName = (profiles[0] as Record<string,string>|undefined)?.display_name ?? null;
    const { rows:[message] } = await pool.query(
      `INSERT INTO messages (conversation_id,sender_id,sender_name,content,type,reply_to_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [convId, userId, senderName, cleanContent, msgType, reply_to_id ?? null],
    );
    const preview = msgType==='image'?'📷 Photo':msgType==='file'?'📎 File':cleanContent.slice(0,200);
    await pool.query('UPDATE conversations SET last_message=$1,last_message_at=NOW(),updated_at=NOW() WHERE id=$2', [preview, convId]);
    emitNewMessage(convId, message as Record<string,unknown>);

    // Bulk notification INSERT (N+1 fix)
    const allIds = await getParticipantIds(convId);
    const recipients = allIds.filter(id=>id!==userId);
    if (recipients.length > 0) {
      const previewText = msgType==='image'?'📷 Photo':msgType==='file'?'📎 File':cleanContent.slice(0,80);
      const convName = (conv as Record<string,unknown>).name ?? senderName ?? 'New message';
      const notifTitle = `${senderName??'Someone'}: ${previewText}`;
      const notifBody  = previewText;
      const notifLink  = `/messages/${convId}`;
      const placeholders = recipients.map((_,i)=>`($${i*5+1},'message',$${i*5+2},$${i*5+3},$${i*5+4},$${i*5+5},false)`).join(',');
      const params = recipients.flatMap(rid=>[rid,notifTitle,notifBody,notifLink,'message']);
      pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ${placeholders} RETURNING *`, params)
        .then(({rows:notifs}) => {
          for (const n of notifs) { emitNotification(n.user_id as string, n as Record<string,unknown>); }
          for (const rid of recipients) sendPushToUser(rid, notifTitle, notifBody, notifLink).catch(()=>undefined);
        }).catch(()=>undefined);
    }
    res.status(201).json(message);
  } catch (err) {
    logger.error({ err: (err as Error).message, stack: (err as Error).stack }, 'Failed to send message');
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.put('/messages/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM messages WHERE id=$1', [req.params.id]);
    if (!rows.length) { apiError.notFound(res, 'Message not found'); return; }
    if (rows[0].sender_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    const content = (req.body as Record<string,unknown>).content;
    if (!content || !(content as string).trim()) { apiError.validationError(res, 'content is required'); return; }
    const { rows:[updated] } = await pool.query('UPDATE messages SET content=$1,edited=TRUE,updated_at=NOW() WHERE id=$2 RETURNING *', [content, req.params.id]);
    emitMessageEdited(updated.conversation_id as string, updated as Record<string,unknown>);
    res.json(updated);
  } catch { res.status(500).json({ error: 'Failed to edit message' }); }
});

router.delete('/messages/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM messages WHERE id=$1', [req.params.id]);
    if (!rows.length) { apiError.notFound(res, 'Message not found'); return; }
    if (rows[0].sender_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('messages', req.params.id);
    emitMessageDeleted(rows[0].conversation_id as string, req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete message' }); }
});

router.delete('/conversations/:id/history', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!(await isParticipant(req.params.id, req.user!.id))) { res.status(403).json({ error: 'Forbidden' }); return; }
    await pool.query('DELETE FROM messages WHERE conversation_id=$1 AND sender_id=$2', [req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to clear history' }); }
});

router.post('/conversations/:id/leave', requireAuth, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!(await isParticipant(req.params.id, req.user!.id))) { await client.query('ROLLBACK'); res.status(400).json({ error: 'Not a participant' }); return; }
    await removeParticipant(client, req.params.id, String(req.user!.id));
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to leave conversation' }); }
  finally { client.release(); }
});

router.post('/conversations/:id/members', requireAuth, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!(await isConvAdmin(req.params.id, req.user!.id)) && req.user!.role !== 'admin') { await client.query('ROLLBACK'); res.status(403).json({ error: 'Only group admin can add members' }); return; }
    const { user_id } = req.body as { user_id?: string };
    if (!user_id) { await client.query('ROLLBACK'); apiError.validationError(res, 'user_id is required'); return; }
    if (await isParticipant(req.params.id, user_id)) { await client.query('ROLLBACK'); res.status(409).json({ error: 'Already a member' }); return; }
    await addParticipant(client, req.params.id, user_id);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to add member' }); }
  finally { client.release(); }
});

router.delete('/conversations/:id/members/:userId', requireAuth, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!(await isConvAdmin(req.params.id, req.user!.id)) && req.user!.role !== 'admin') { await client.query('ROLLBACK'); res.status(403).json({ error: 'Only group admin can remove members' }); return; }
    if (!(await isParticipant(req.params.id, req.params.userId))) { await client.query('ROLLBACK'); apiError.notFound(res, 'Member not found'); return; }
    await removeParticipant(client, req.params.id, req.params.userId);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to remove member' }); }
  finally { client.release(); }
});

router.delete('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const conv = await getRecord('conversations', req.params.id);
    if (!conv) { apiError.notFound(res, 'Conversation not found'); return; }
    if (!(await isConvAdmin(req.params.id, req.user!.id)) && req.user!.role !== 'admin') { res.status(403).json({ error: 'Only group admin can delete' }); return; }
    await pool.query('DELETE FROM messages WHERE conversation_id=$1', [req.params.id]);
    await deleteRecord('conversations', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete conversation' }); }
});

// ── Presence ──────────────────────────────────────────────────────────────────

router.put('/presence', requireAuth, async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };
  if (!['online','offline','away'].includes(status??'')) { apiError.validationError(res,'status must be online, offline, or away'); return; }
  const now = new Date().toISOString();
  const presence = { status: status!, last_seen: now };
  memPresence[req.user!.id] = presence;
  const redis = getRedis();
  if (!redis.isNoOp) (redis as RedisClient).set(`presence:${req.user!.id}`, JSON.stringify(presence), 'EX', 15*60).catch(()=>undefined);
  if (status==='online'||status==='offline') pool.query('UPDATE users SET updated_at=NOW(),last_seen=NOW() WHERE id=$1', [req.user!.id]).catch(()=>undefined);
  emitPresenceUpdated(req.user!.id, presence as Parameters<typeof emitPresenceUpdated>[1]);
  res.json({ success: true, ...presence });
});

router.get('/presence/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (String(req.user!.id) !== req.params.userId) {
      const { rows: bl } = await pool.query('SELECT 1 FROM blocks WHERE blocker_id=$1 AND blocked_id=$2 LIMIT 1', [req.params.userId, req.user!.id]);
      if (bl.length) { res.json({ user_id: req.params.userId, status:'offline', last_seen:null, hidden:true }); return; }
    }
    const redis = getRedis();
    let status='offline', last_seen: string|null=null;
    if (!redis.isNoOp) { try { const c=await (redis as RedisClient).get(`presence:${req.params.userId}`); if(c) { const p=JSON.parse(c); status=p.status||'offline'; last_seen=p.last_seen||null; } } catch { /* fall through */ } }
    if (memPresence[req.params.userId]) { const m=memPresence[req.params.userId]; last_seen=m.last_seen; status=Date.now()-new Date(m.last_seen).getTime()<15*60*1000?m.status:'offline'; }
    if (!last_seen) { try { const { rows }=await pool.query('SELECT last_seen FROM users WHERE id=$1',[req.params.userId]); if(rows[0]?.last_seen) last_seen=rows[0].last_seen; } catch { /* column may not exist */ } }
    res.json({ user_id: req.params.userId, status, last_seen, hidden:false });
  } catch { res.status(500).json({ error: 'Failed to get presence' }); }
});

router.put('/presence/settings', requireAuth, async (req: Request, res: Response) => {
  const { visibility } = req.body as { visibility?: string };
  if (!['everyone','nobody'].includes(visibility??'')) { apiError.validationError(res,'visibility must be everyone or nobody'); return; }
  try { await pool.query('UPDATE user_profiles SET presence_visibility=$1,updated_at=NOW() WHERE user_id=$2', [visibility, req.user!.id]); res.json({ visibility }); }
  catch { res.status(500).json({ error: 'Failed to update presence settings' }); }
});

// ── Block ─────────────────────────────────────────────────────────────────────

router.post('/block/:targetId', requireAuth, async (req: Request, res: Response) => {
  if (req.params.targetId===req.user!.id) { apiError.validationError(res,'Cannot block yourself'); return; }
  try { await pool.query('INSERT INTO blocks (blocker_id,blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user!.id, req.params.targetId]); res.json({ success:true, blocked:true }); }
  catch { res.status(500).json({ error:'Failed to block user' }); }
});

router.delete('/block/:targetId', requireAuth, async (req: Request, res: Response) => {
  try { await pool.query('DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2', [req.user!.id, req.params.targetId]); res.json({ success:true, blocked:false }); }
  catch { res.status(500).json({ error:'Failed to unblock user' }); }
});

router.get('/block/:targetId', requireAuth, async (req: Request, res: Response) => {
  try { const { rows }=await pool.query('SELECT id FROM blocks WHERE blocker_id=$1 AND blocked_id=$2', [req.user!.id, req.params.targetId]); res.json({ blocked:rows.length>0 }); }
  catch { res.status(500).json({ error:'Failed to check block status' }); }
});

// ── Forward ───────────────────────────────────────────────────────────────────

router.post('/messages/:id/forward', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows:[src] } = await pool.query('SELECT * FROM messages WHERE id=$1', [req.params.id]);
    if (!src) { apiError.notFound(res,'Message not found'); return; }
    const { target_conversation_id } = req.body as { target_conversation_id?: string };
    if (!target_conversation_id) { apiError.validationError(res,'target_conversation_id is required'); return; }
    if (!(await isParticipant(target_conversation_id, req.user!.id)) && req.user!.role !== 'admin') { res.status(403).json({ error:'Forbidden' }); return; }
    const { rows:[prof] } = await pool.query('SELECT display_name FROM user_profiles WHERE user_id=$1', [req.user!.id]);
    const senderName = (prof as Record<string,string>|undefined)?.display_name ?? null;
    const { rows:[msg] } = await pool.query(`INSERT INTO messages (conversation_id,sender_id,sender_name,content,type) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [target_conversation_id, req.user!.id, senderName, src.content, src.type||'text']);
    const preview = (src.type as string)==='image'?'📷 Photo':(src.content as string).slice(0,200);
    await pool.query('UPDATE conversations SET last_message=$1,last_message_at=NOW(),updated_at=NOW() WHERE id=$2', [preview, target_conversation_id]);
    emitNewMessage(target_conversation_id, msg as Record<string,unknown>);
    res.status(201).json(msg);
  } catch (err) { logger.error({ err: (err as Error).message },'Forward error'); res.status(500).json({ error:'Failed to forward message' }); }
});

// ── Inquiry ───────────────────────────────────────────────────────────────────

router.post('/inquiry', requireAuth, async (req: Request, res: Response) => {
  const { receiver_id, subject, body } = req.body as Record<string,string>;
  if (!receiver_id) { apiError.validationError(res,'receiver_id is required'); return; }
  if (!body?.trim()) { apiError.validationError(res,'body is required'); return; }
  if (String(receiver_id)===String(req.user!.id)) { apiError.validationError(res,'Cannot send inquiry to yourself'); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let conv: Record<string,unknown>|null = null;
    try {
      const { rows } = await client.query(`SELECT c.* FROM conversations c JOIN conversation_participants cp1 ON cp1.conversation_id=c.id AND cp1.user_id=$1 JOIN conversation_participants cp2 ON cp2.conversation_id=c.id AND cp2.user_id=$2 WHERE c.type='dm' AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id=c.id)=2 LIMIT 1`, [req.user!.id, receiver_id]);
      conv = (rows[0] as Record<string,unknown>|undefined) ?? null;
    } catch { /* fall through */ }
    if (!conv) {
      const { rows:[created] } = await client.query(`INSERT INTO conversations (type,last_message,participant_ids,participant_names) VALUES ('dm','',$1::text,'[]'::text) RETURNING *`, [JSON.stringify([String(req.user!.id), String(receiver_id)])]);
      conv = created as Record<string,unknown>;
      await addParticipant(client, conv.id as string, String(req.user!.id));
      await addParticipant(client, conv.id as string, String(receiver_id));
    }
    const text = subject ? `📋 ${subject}\n\n${body}` : body;
    const { rows:[msg] } = await client.query(`INSERT INTO messages (conversation_id,sender_id,content,created_at) VALUES ($1,$2,$3,NOW()) RETURNING *`, [conv.id, req.user!.id, text]);
    await client.query('UPDATE conversations SET updated_at=NOW() WHERE id=$1', [conv.id]);
    await client.query('COMMIT');
    pool.query(`INSERT INTO notifications (user_id,type,title,body,link,created_at) VALUES ($1,'inquiry',$2,$3,$4,NOW())`, [receiver_id, subject||'New Inquiry', `${req.user!.email||'Someone'} sent you an inquiry.`, `/messages/${conv.id}`]).then(({rows:[notif]}) => { if(notif) emitNotification(String(receiver_id), notif as Record<string,unknown>); }).catch(()=>undefined);
    emitNewMessage(String(receiver_id), { ...msg as Record<string,unknown>, conversation_id: conv.id });
    res.status(201).json({ success:true, conversation_id:conv.id, message_id:(msg as Record<string,unknown>).id });
  } catch (err) { await client.query('ROLLBACK'); logger.error({err:(err as Error).message},'Inquiry error'); res.status(500).json({ error:'Failed to send inquiry' }); }
  finally { client.release(); }
});

module.exports = router;
