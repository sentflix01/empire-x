import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../utils/crud';
import { emitNotification } from '../socket';
import { sendPushToUser } from './push';

const router = Router();

interface TaskRow extends Record<string, unknown> {
  id: string;
  requester_id: string;
  task_type: string;
  offered_payment: number;
  currency: string;
  title: string;
}

async function notifyMatchedAgents(task: TaskRow): Promise<void> {
  try {
    const { rows: agents } = await pool.query<{ agent_id: string; display_name: string }>(
      `SELECT DISTINCT t.agent_id, up.display_name, COUNT(t.id) AS completed_count
       FROM tasks t JOIN user_profiles up ON up.user_id=t.agent_id
       WHERE t.task_type=$1 AND t.status='done' AND t.agent_id IS NOT NULL AND t.agent_id!=$2
       GROUP BY t.agent_id, up.display_name ORDER BY completed_count DESC LIMIT 5`,
      [task.task_type, task.requester_id],
    );
    if (!agents.length) return;
    const { rows: rRows } = await pool.query<{ display_name: string }>(
      'SELECT display_name FROM user_profiles WHERE user_id=$1', [task.requester_id],
    );
    const requesterName = rRows[0]?.display_name ?? 'Someone';
    const paymentStr = `${Number(task.offered_payment).toLocaleString()} ${task.currency ?? 'ETB'}`;
    const notifTitle = `New ${task.task_type} task: ${task.title}`;
    const notifBody  = `${requesterName} posted a task matching your skills. Payment: ${paymentStr}`;
    for (const agent of agents) {
      try {
        const { rows: [notif] } = await pool.query(
          `INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'task_update',$2,$3,'/tasks',false) RETURNING *`,
          [agent.agent_id, notifTitle, notifBody],
        );
        emitNotification(agent.agent_id, notif as Record<string, unknown>);
        sendPushToUser(agent.agent_id, notifTitle, notifBody, '/tasks').catch(() => undefined);
      } catch { /* one failure must not stop others */ }
    }
    logger.info({ taskId: task.id, notified: agents.length }, 'Smart task matching: agents notified');
  } catch (err) {
    logger.error({ err: (err as Error).message, taskId: task.id }, 'Smart task matching failed');
  }
}

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { requester_id, agent_id, status, sort = '-created_at', limit = '50' } = req.query as Record<string, string>;
    const filter: Record<string, string> = {};
    if (requester_id) filter.requester_id = requester_id;
    if (agent_id)     filter.agent_id     = agent_id;
    if (status)       filter.status       = status;
    res.json(await listRecords('tasks', { filter, sort, limit, realOnly: req.realOnly }));
  } catch { res.status(500).json({ error: 'Failed to fetch tasks' }); }
});

// Bids are private to their author and the requester of the related task.
// This endpoint also backs the task calendar's bid summaries.
router.get('/bids', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsedLimit = Number.parseInt(String(req.query.limit ?? '200'), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 200;
    const realFilter = req.realOnly
      ? `AND t.requester_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)
         AND tb.bidder_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)`
      : '';
    const { rows } = await pool.query(
      `SELECT tb.* FROM task_bids tb JOIN tasks t ON t.id=tb.task_id
       WHERE (tb.bidder_id=$1 OR t.requester_id=$1) ${realFilter}
       ORDER BY tb.created_at DESC LIMIT $2`,
      [req.user!.id, limit],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch bids' }); }
});

router.get('/bids/:bidId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM task_bids WHERE id=$1', [req.params.bidId]);
    if (!rows.length) { res.status(404).json({ error: 'Bid not found' }); return; }
    const bid = rows[0] as Record<string, unknown>;
    const task = await getRecord<{ requester_id: string }>('tasks', String(bid.task_id), { realOnly: req.realOnly });
    if (!task) { res.status(404).json({ error: 'Bid not found' }); return; }
    if (bid.bidder_id !== req.user!.id && task.requester_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    res.json(bid);
  } catch { res.status(500).json({ error: 'Failed to fetch bid' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const task = await getRecord('tasks', req.params.id, { realOnly: req.realOnly });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    res.json(task);
  } catch { res.status(500).json({ error: 'Failed to fetch task' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const { title, task_type, offered_payment } = body;
    if (typeof title !== 'string' || !title.trim() || typeof task_type !== 'string' || !task_type.trim() || offered_payment == null) {
      res.status(400).json({ error: 'title, task_type, and offered_payment are required' }); return;
    }
    const amount = Number(offered_payment);
    if (!Number.isFinite(amount) || amount <= 0) { res.status(422).json({ error: 'offered_payment must be a positive number' }); return; }
    const fields = ['task_type', 'title', 'description', 'location', 'currency', 'deadline'];
    const data = Object.fromEntries(fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
    data.title = title.trim();
    data.task_type = task_type.trim();
    data.offered_payment = amount;
    const task = await createRecord<TaskRow>('tasks', { ...data, requester_id: req.user!.id });
    res.status(201).json(task);
    notifyMatchedAgents(task).catch(() => undefined);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create task error');
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/bids/:bidId', requireAuth, async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const client = await pool.connect();
  try {
    const { rows: lookup } = await client.query('SELECT task_id FROM task_bids WHERE id=$1', [req.params.bidId]);
    if (!lookup.length) { res.status(404).json({ error: 'Bid not found' }); return; }
    await client.query('BEGIN');
    const taskId = String(lookup[0].task_id);
    const { rows: taskRows } = await client.query('SELECT id, requester_id, status FROM tasks WHERE id=$1 FOR UPDATE', [taskId]);
    if (!taskRows.length) { await client.query('ROLLBACK'); res.status(404).json({ error: 'Task not found' }); return; }
    const task = taskRows[0] as Record<string, unknown>;
    const { rows } = await client.query('SELECT * FROM task_bids WHERE id=$1 AND task_id=$2 FOR UPDATE', [req.params.bidId, taskId]);
    if (!rows.length) { await client.query('ROLLBACK'); res.status(404).json({ error: 'Bid not found' }); return; }
    const bid = rows[0] as Record<string, unknown>;
    const isBidder = bid.bidder_id === req.user!.id;
    const isTaskOwner = task.requester_id === req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    if (!isBidder && !isTaskOwner && !isAdmin) {
      await client.query('ROLLBACK'); res.status(403).json({ error: 'Forbidden' }); return;
    }
    if (bid.status !== 'pending') {
      await client.query('ROLLBACK'); res.status(409).json({ error: 'Only pending bids can be edited' }); return;
    }

    if (body.status !== undefined) {
      if ((!isTaskOwner && !isAdmin) || !['accepted', 'rejected'].includes(String(body.status))) {
        await client.query('ROLLBACK'); res.status(403).json({ error: 'Only the task requester can accept or reject a pending bid' }); return;
      }
      if (body.status === 'accepted' && !['open', 'in_progress'].includes(String(task.status))) {
        await client.query('ROLLBACK'); res.status(409).json({ error: 'This task can no longer accept a bid' }); return;
      }
      const { rows: updatedRows } = await client.query(
        'UPDATE task_bids SET status=$1, updated_at=NOW() WHERE id=$2 AND status=\'pending\' RETURNING *',
        [body.status, req.params.bidId],
      );
      if (!updatedRows.length) { await client.query('ROLLBACK'); res.status(409).json({ error: 'Bid was already processed' }); return; }
      if (body.status === 'accepted') {
        await client.query(
          "UPDATE tasks SET agent_id=$1, status='in_progress', updated_at=NOW() WHERE id=$2",
          [bid.bidder_id, bid.task_id],
        );
        await client.query(
          "UPDATE task_bids SET status='rejected', updated_at=NOW() WHERE task_id=$1 AND id<>$2 AND status='pending'",
          [bid.task_id, req.params.bidId],
        );
      }
      await client.query('COMMIT');
      if (body.status === 'accepted') {
        try {
          const { rows: [notification] } = await pool.query(
            `INSERT INTO notifications (user_id,type,title,body,link,is_read)
             VALUES ($1,'task_update',$2,$3,'/tasks',false) RETURNING *`,
            [bid.bidder_id, 'Your bid was accepted', `Your bid for task ${String(task.id)} was accepted.`],
          );
          if (notification) {
            emitNotification(String(bid.bidder_id), notification as Record<string, unknown>);
            sendPushToUser(String(bid.bidder_id), String(notification.title), String(notification.body), '/tasks').catch(() => undefined);
          }
        } catch { /* bid acceptance must not depend on notification delivery */ }
      }
      res.json(updatedRows[0]);
      return;
    }

    if (!isBidder) { await client.query('ROLLBACK'); res.status(403).json({ error: 'Only the bidder can edit bid details' }); return; }
    const updates = Object.fromEntries(['bid_amount', 'message']
      .filter((field) => body[field] !== undefined)
      .map((field) => [field, body[field]]));
    if (!Object.keys(updates).length) { await client.query('ROLLBACK'); res.status(400).json({ error: 'No updatable bid fields provided' }); return; }
    if (updates.bid_amount !== undefined && (!Number.isFinite(Number(updates.bid_amount)) || Number(updates.bid_amount) <= 0)) {
      await client.query('ROLLBACK'); res.status(422).json({ error: 'bid_amount must be a positive number' }); return;
    }
    if (updates.message !== undefined && updates.message !== null && (typeof updates.message !== 'string' || updates.message.length > 4000)) {
      await client.query('ROLLBACK'); res.status(422).json({ error: 'message must be a string of at most 4,000 characters' }); return;
    }
    const fields = Object.keys(updates);
    const values = [...fields.map((field) => updates[field]), req.params.bidId];
    const assignments = fields.map((field, index) => `${field}=$${index + 1}`);
    const { rows: updatedRows } = await client.query(
      `UPDATE task_bids SET ${assignments.join(', ')}, updated_at=NOW() WHERE id=$${values.length} AND status='pending' RETURNING *`,
      values,
    );
    if (!updatedRows.length) { await client.query('ROLLBACK'); res.status(409).json({ error: 'Bid was already processed' }); return; }
    await client.query('COMMIT');
    res.json(updatedRows[0]);
  } catch {
    await client.query('ROLLBACK').catch(() => undefined);
    res.status(500).json({ error: 'Failed to update bid' });
  } finally {
    client.release();
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ requester_id: string; status: string }>('tasks', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Task not found' }); return; }
    if (existing.requester_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const body = req.body as Record<string, unknown>;
    const fields = ['task_type', 'title', 'description', 'location', 'offered_payment', 'currency', 'deadline', 'status', 'agent_id'];
    const updates = Object.fromEntries(fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
    if (!Object.keys(updates).length) { res.status(400).json({ error: 'No updatable task fields provided' }); return; }
    if (updates.title !== undefined && (typeof updates.title !== 'string' || !updates.title.trim())) {
      res.status(422).json({ error: 'title must be a non-empty string' }); return;
    }
    if (updates.offered_payment !== undefined && (!Number.isFinite(Number(updates.offered_payment)) || Number(updates.offered_payment) <= 0)) {
      res.status(422).json({ error: 'offered_payment must be a positive number' }); return;
    }
    if (updates.status !== undefined && !['open', 'in_progress', 'done', 'cancelled'].includes(String(updates.status))) {
      res.status(422).json({ error: 'Invalid task status' }); return;
    }
    if (updates.agent_id !== undefined && updates.agent_id !== null) {
      if (Object.keys(updates).some((field) => !['agent_id', 'status'].includes(field))) {
        res.status(400).json({ error: 'Assigning an agent cannot be combined with unrelated task edits' }); return;
      }
      if (updates.status !== undefined && updates.status !== 'in_progress') {
        res.status(422).json({ error: 'Assigning an agent sets the task status to in_progress' }); return;
      }
      const { rows: bids } = await pool.query(
        "SELECT 1 FROM task_bids WHERE task_id=$1 AND bidder_id=$2 AND status='pending' LIMIT 1",
        [req.params.id, updates.agent_id],
      );
      if (!bids.length || existing.status !== 'open') {
        res.status(422).json({ error: 'agent_id must identify a bidder on an open task' }); return;
      }
      const { rows } = await pool.query(
        `UPDATE tasks t SET agent_id=$1, status='in_progress', updated_at=NOW()
         WHERE t.id=$2 AND t.status='open'
           AND EXISTS (SELECT 1 FROM task_bids b WHERE b.task_id=t.id AND b.bidder_id=$1 AND b.status='pending')
         RETURNING t.*`,
        [updates.agent_id, req.params.id],
      );
      if (!rows.length) { res.status(409).json({ error: 'This task or bid was already processed' }); return; }
      res.json(rows[0]);
      return;
    }
    res.json(await updateRecord('tasks', req.params.id, updates));
  } catch { res.status(500).json({ error: 'Failed to update task' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ requester_id: string }>('tasks', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Task not found' }); return; }
    if (existing.requester_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('tasks', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete task' }); }
});

router.get('/:taskId/bids', optionalAuth, async (req: Request, res: Response) => {
  try {
    const task = await getRecord<{ requester_id: string }>('tasks', req.params.taskId, { realOnly: req.realOnly });
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    if (task.requester_id !== req.user?.id && req.user?.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const realFilter = req.realOnly ? 'AND tb.bidder_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)' : '';
    const { rows } = await pool.query(`SELECT tb.* FROM task_bids tb WHERE tb.task_id=$1 ${realFilter} ORDER BY tb.created_at DESC`, [req.params.taskId]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch bids' }); }
});

router.post('/:taskId/bids', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bid_amount, message } = req.body as Record<string, unknown>;
    if (bid_amount == null) { res.status(400).json({ error: 'bid_amount is required' }); return; }
    const amount = Number(bid_amount);
    if (!Number.isFinite(amount) || amount <= 0) { res.status(422).json({ error: 'bid_amount must be a positive number' }); return; }
    if (message !== undefined && message !== null && (typeof message !== 'string' || message.length > 4000)) {
      res.status(422).json({ error: 'message must be a string of at most 4,000 characters' }); return;
    }
    const task = await getRecord<{ requester_id: string; title?: string }>('tasks', req.params.taskId);
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    if (task.requester_id === req.user!.id) { res.status(400).json({ error: 'Cannot bid on your own task' }); return; }
    const { rows: profiles } = await pool.query<{ display_name: string }>('SELECT display_name FROM user_profiles WHERE user_id=$1', [req.user!.id]);
    const { rows } = await pool.query(
      `INSERT INTO task_bids (task_id,bidder_id,bidder_name,bid_amount,message) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.taskId, req.user!.id, profiles[0]?.display_name ?? null, amount, message ?? null],
    );
    res.status(201).json(rows[0]);
    try {
      const { rows: [notification] } = await pool.query(
        `INSERT INTO notifications (user_id,type,title,body,link,is_read)
         VALUES ($1,'task_update',$2,$3,'/tasks',false) RETURNING *`,
        [task.requester_id, `New bid on ${String(task.title || 'your task')}`, `${profiles[0]?.display_name ?? 'Someone'} submitted a bid.`],
      );
      if (notification) {
        emitNotification(String(task.requester_id), notification as Record<string, unknown>);
        sendPushToUser(String(task.requester_id), String(notification.title), String(notification.body), '/tasks').catch(() => undefined);
      }
    } catch { /* bid creation must not depend on notification delivery */ }
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create bid error');
    res.status(500).json({ error: 'Failed to create bid' });
  }
});

module.exports = router;
