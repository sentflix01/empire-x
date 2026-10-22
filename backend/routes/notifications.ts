import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { createRecord, updateRecord, deleteRecord } from '../utils/crud';
import { emitNotification } from '../socket';
import { sendPushToUser } from './push';

const router = Router();

// GET — keyset cursor pagination (cursor = ISO timestamp, defaults to now)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { is_read, limit = '20', sort, cursor } = req.query as Record<string, string>;
    const lim      = Math.min(parseInt(limit, 10) || 20, 200);
    const cursorTs = cursor ? new Date(cursor) : new Date();
    if (isNaN(cursorTs.getTime())) { res.status(400).json({ error: 'Invalid cursor value' }); return; }

    const conditions = [`user_id = $1`, `created_at < $2`];
    const values: unknown[]    = [req.user!.id, cursorTs];

    if (is_read !== undefined) {
      values.push(is_read === 'true' || (is_read as unknown) === true);
      conditions.push(`is_read = $${values.length}`);
    }

    const orderClause = sort === 'unread_first' ? 'is_read ASC, created_at DESC' : 'created_at DESC';
    values.push(lim);

    const { rows } = await pool.query(
      `SELECT id, user_id, type, title, body, link, is_read, created_at, actor_name, actor_avatar
       FROM notifications WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderClause} LIMIT $${values.length}`,
      values,
    );

    // Group consecutive like/comment/follow notifications from same link
    const grouped: Record<string, unknown>[] = [];
    const seen = new Map<string, number>();

    for (const notif of rows) {
      const n = notif as Record<string, unknown>;
      if (['like', 'comment', 'follow'].includes(n.type as string) && n.link) {
        const key = `${n.type}:${n.link}`;
        if (seen.has(key)) {
          const idx = seen.get(key)!;
          grouped[idx].group_count = ((grouped[idx].group_count as number) || 1) + 1;
          if (!n.is_read) grouped[idx].is_read = false;
        } else {
          seen.set(key, grouped.length);
          grouped.push({ ...n, group_count: 1 });
        }
      } else {
        grouped.push(n);
      }
    }

    const result = grouped.map((n) => {
      if ((n.group_count as number || 1) > 1) {
        const action = n.type === 'like' ? 'liked' : n.type === 'comment' ? 'commented on' : 'followed';
        return { ...n, title: `${n.group_count} people ${action} your post` };
      }
      return n;
    });

    res.json({
      notifications: result,
      next_cursor: rows.length === lim ? rows[rows.length - 1].created_at : null,
    });
  } catch { res.status(500).json({ error: 'Failed to fetch notifications' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { user_id, type, title, body, link } = req.body as Record<string, string>;
  if (!user_id || !type || !title) { res.status(400).json({ error: 'user_id, type, and title are required' }); return; }
  if (user_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Users may only create notifications for themselves' }); return;
  }
  if (typeof title !== 'string' || title.length > 200 || (body !== undefined && typeof body !== 'string') ||
      (typeof body === 'string' && body.length > 2000) || (link !== undefined && typeof link !== 'string') ||
      (typeof link === 'string' && link.length > 1000)) {
    res.status(422).json({ error: 'Invalid notification content' }); return;
  }
  try {
    const notif = await createRecord('notifications', { user_id, type, title, body: body || '', link: link || '', is_read: false });
    emitNotification(user_id, notif as Record<string, unknown>);
    sendPushToUser(user_id, title, body || '', link || '/notifications').catch(() => undefined);
    res.status(201).json(notif);
  } catch { res.status(500).json({ error: 'Failed to create notification' }); }
});

router.put('/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE, updated_at=NOW() WHERE user_id=$1 AND is_read=FALSE', [req.user!.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to mark all as read' }); }
});

router.post('/mark-read', requireAuth, async (req: Request, res: Response) => {
  const { type } = req.body as { type?: string };
  const typeMap: Record<string, string[]> = {
    message: ['message'],
    task:    ['task', 'task_assigned', 'task_completed'],
    follow:  ['follow', 'friend_request', 'connection'],
  };
  const types = typeMap[type ?? ''] ?? (type ? [type] : []);
  if (!types.length) { res.status(400).json({ error: 'Invalid type' }); return; }
  try {
    await pool.query(`UPDATE notifications SET is_read=TRUE, updated_at=NOW() WHERE user_id=$1 AND type=ANY($2::text[]) AND is_read=FALSE`, [req.user!.id, types]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to mark notifications as read' }); }
});

router.put('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT user_id FROM notifications WHERE id=$1', [req.params.id]);
    if (!rows.length) { res.status(404).json({ error: 'Notification not found' }); return; }
    if (rows[0].user_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    const updated = await updateRecord('notifications', req.params.id, { is_read: true });
    if (!updated) { res.status(404).json({ error: 'Notification not found' }); return; }
    res.json(updated);
  } catch { res.status(500).json({ error: 'Failed to mark notification as read' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT user_id FROM notifications WHERE id=$1', [req.params.id]);
    if (!rows.length) { res.status(404).json({ error: 'Notification not found' }); return; }
    if (rows[0].user_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('notifications', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete notification' }); }
});

module.exports = router;
