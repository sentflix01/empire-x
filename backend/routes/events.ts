import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../utils/crud';

const router = Router();

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { status = 'published', sort = '-start_at', limit = '50' } = req.query as Record<string, string>;
    res.json(await listRecords('events', { filter: status ? { status } : {}, sort, limit }));
  } catch { res.status(500).json({ error: 'Failed to fetch events' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const event = await getRecord('events', req.params.id);
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
    res.json(event);
  } catch { res.status(500).json({ error: 'Failed to fetch event' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, start_at } = req.body as Record<string, string>;
    if (!title || !start_at) { res.status(400).json({ error: 'title and start_at are required' }); return; }
    res.status(201).json(await createRecord('events', { ...(req.body as Record<string, unknown>), organizer_id: req.user!.id }));
  } catch { res.status(500).json({ error: 'Failed to create event' }); }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ organizer_id: string }>('events', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Event not found' }); return; }
    if (existing.organizer_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json(await updateRecord('events', req.params.id, req.body as Record<string, unknown>));
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
  try {
    const event = await getRecord<{ id: string; status: string; capacity: number | null }>('events', req.params.id);
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
    if (event.status !== 'published') { res.status(400).json({ error: 'Event is not available for booking' }); return; }
    if (event.capacity) {
      const { rows } = await pool.query("SELECT COUNT(*) FROM event_tickets WHERE event_id=$1 AND status='active'", [event.id]);
      if (parseInt(rows[0].count) >= event.capacity) { res.status(400).json({ error: 'Event is fully booked' }); return; }
    }
    const { rows } = await pool.query(
      `INSERT INTO event_tickets (event_id, user_id) VALUES ($1,$2) ON CONFLICT (event_id, user_id) DO NOTHING RETURNING *`,
      [event.id, req.user!.id],
    );
    if (!rows.length) { res.status(409).json({ error: 'Already booked' }); return; }
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to book ticket' }); }
});

router.get('/:id/attendees', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT et.*, up.display_name, up.avatar_url FROM event_tickets et LEFT JOIN user_profiles up ON up.user_id=et.user_id WHERE et.event_id=$1 AND et.status='active' ORDER BY et.created_at DESC`,
      [req.params.id],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch attendees' }); }
});

module.exports = router;
