import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord, withoutProtectedFields } from '../utils/crud';

const router = Router();

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { status = 'published', sort = '-start_at', limit = '50' } = req.query as Record<string, string>;
    res.json(await listRecords('events', { filter: status ? { status } : {}, sort, limit, realOnly: req.realOnly }));
  } catch { res.status(500).json({ error: 'Failed to fetch events' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const event = await getRecord('events', req.params.id, { realOnly: req.realOnly });
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
    res.json(event);
  } catch { res.status(500).json({ error: 'Failed to fetch event' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, start_at } = req.body as Record<string, string>;
    if (!title || !start_at) { res.status(400).json({ error: 'title and start_at are required' }); return; }
    const fields = withoutProtectedFields(req.body as Record<string, unknown>, 'organizer_id');
    res.status(201).json(await createRecord('events', { ...fields, organizer_id: req.user!.id }));
  } catch { res.status(500).json({ error: 'Failed to create event' }); }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ organizer_id: string }>('events', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Event not found' }); return; }
    if (existing.organizer_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const updates = withoutProtectedFields(req.body as Record<string, unknown>, 'organizer_id');
    if (!Object.keys(updates).length) { res.status(400).json({ error: 'No updatable event fields provided' }); return; }
    res.json(await updateRecord('events', req.params.id, updates));
  } catch { res.status(500).json({ error: 'Failed to update event' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ organizer_id: string }>('events', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Event not found' }); return; }
    if (existing.organizer_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('events', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete event' }); }
});

router.post('/:id/book', requireAuth, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: eventRows } = await client.query(
      `SELECT id,status,capacity FROM events WHERE id=$1 ${req.realOnly ? 'AND organizer_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)' : ''} FOR UPDATE`,
      [req.params.id],
    );
    const event = eventRows[0] as { id: string; status: string; capacity: number | null } | undefined;
    if (!event) { await client.query('ROLLBACK'); res.status(404).json({ error: 'Event not found' }); return; }
    if (event.status !== 'published') { await client.query('ROLLBACK'); res.status(400).json({ error: 'Event is not available for booking' }); return; }
    if (event.capacity !== null && event.capacity !== undefined) {
      const realAttendeeFilter = req.realOnly
        ? 'AND user_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)'
        : '';
      const { rows } = await client.query(
        `SELECT COUNT(*) FROM event_tickets WHERE event_id=$1 AND status='active' ${realAttendeeFilter}`,
        [event.id],
      );
      if (parseInt(rows[0].count, 10) >= event.capacity) {
        await client.query('ROLLBACK'); res.status(400).json({ error: 'Event is fully booked' }); return;
      }
    }
    const { rows } = await client.query(
      `INSERT INTO event_tickets (event_id, user_id) VALUES ($1,$2) ON CONFLICT (event_id, user_id) DO NOTHING RETURNING *`,
      [event.id, req.user!.id],
    );
    if (!rows.length) { await client.query('ROLLBACK'); res.status(409).json({ error: 'Already booked' }); return; }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch {
    await client.query('ROLLBACK').catch(() => undefined);
    res.status(500).json({ error: 'Failed to book ticket' });
  } finally {
    client.release();
  }
});

router.get('/:id/attendees', optionalAuth, async (req: Request, res: Response) => {
  try {
    const realFilter = req.realOnly ? 'AND et.user_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)' : '';
    const { rows } = await pool.query(
      `SELECT et.*, up.display_name, up.avatar_url FROM event_tickets et LEFT JOIN user_profiles up ON up.user_id=et.user_id WHERE et.event_id=$1 AND et.status='active' ${realFilter} ORDER BY et.created_at DESC`,
      [req.params.id],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch attendees' }); }
});

module.exports = router;
