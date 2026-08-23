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
    res.json(await listRecords('tasks', { filter, sort, limit }));
  } catch { res.status(500).json({ error: 'Failed to fetch tasks' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const task = await getRecord('tasks', req.params.id);
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    res.json(task);
  } catch { res.status(500).json({ error: 'Failed to fetch task' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, task_type, offered_payment } = req.body as Record<string, unknown>;
    if (!title || !task_type || offered_payment == null) {
      res.status(400).json({ error: 'title, task_type, and offered_payment are required' }); return;
    }
    const task = await createRecord<TaskRow>('tasks', { ...(req.body as Record<string, unknown>), requester_id: req.user!.id });
    res.status(201).json(task);
    notifyMatchedAgents(task).catch(() => undefined);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create task error');
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/bids/:bidId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM task_bids WHERE id=$1', [req.params.bidId]);
    if (!rows.length) { res.status(404).json({ error: 'Bid not found' }); return; }
    const task = await getRecord<{ requester_id: string }>('tasks', rows[0].task_id as string);
    if (rows[0].bidder_id !== req.user!.id && task?.requester_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    res.json(await updateRecord('task_bids', req.params.bidId, req.body as Record<string, unknown>));
  } catch { res.status(500).json({ error: 'Failed to update bid' }); }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ requester_id: string }>('tasks', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Task not found' }); return; }
    if (existing.requester_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json(await updateRecord('tasks', req.params.id, req.body as Record<string, unknown>));
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
    const { rows } = await pool.query('SELECT * FROM task_bids WHERE task_id=$1 ORDER BY created_at DESC', [req.params.taskId]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch bids' }); }
});

router.post('/:taskId/bids', requireAuth, async (req: Request, res: Response) => {
  try {
    const { bid_amount, message } = req.body as Record<string, unknown>;
    if (bid_amount == null) { res.status(400).json({ error: 'bid_amount is required' }); return; }
    const task = await getRecord<{ requester_id: string }>('tasks', req.params.taskId);
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    if (task.requester_id === req.user!.id) { res.status(400).json({ error: 'Cannot bid on your own task' }); return; }
    const { rows: profiles } = await pool.query<{ display_name: string }>('SELECT display_name FROM user_profiles WHERE user_id=$1', [req.user!.id]);
    const { rows } = await pool.query(
      `INSERT INTO task_bids (task_id,bidder_id,bidder_name,bid_amount,message) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.taskId, req.user!.id, profiles[0]?.display_name ?? null, bid_amount, message ?? null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create bid error');
    res.status(500).json({ error: 'Failed to create bid' });
  }
});

module.exports = router;
