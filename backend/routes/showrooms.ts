import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import { cacheMiddleware } from '../middleware/cache';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../utils/crud';
import { runDoctor } from '../lib/showroomDoctor';
import { recordEvent } from '../lib/telemetry';

const router = Router();

router.get('/', optionalAuth, cacheMiddleware('showrooms:list', 30), async (req: Request, res: Response) => {
  try {
    const { owner_id, status, category, sort = '-created_at', limit = '50' } = req.query as Record<string, string>;
    const filter: Record<string, string> = {};
    if (owner_id) filter.owner_id = owner_id;
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    res.json(await listRecords('showrooms', { filter, sort, limit }));
  } catch { res.status(500).json({ error: 'Failed to fetch showrooms' }); }
});

router.get('/slug/:slug', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM showrooms WHERE slug=$1', [req.params.slug]);
    if (!rows.length) { res.status(404).json({ error: 'Showroom not found' }); return; }
    await pool.query('UPDATE showrooms SET view_count=view_count+1 WHERE id=$1', [rows[0].id]);
    res.json({ ...rows[0], view_count: rows[0].view_count + 1 });
  } catch { res.status(500).json({ error: 'Failed to fetch showroom' }); }
});


// ── Re-check an external source (Doctor fix action) ─────────────────────────
router.post('/:id/recheck/:sectionKey', requireAuth, async (req: Request, res: Response) => {
  try {
    const showroom = await getRecord<Record<string, unknown>>('showrooms', req.params.id);
    if (!showroom) { res.status(404).json({ error: 'Showroom not found' }); return; }
    if (showroom.owner_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const { getRedis } = await import('../lib/redis');
    const { fetchSection, buildCacheKey } = await import('../services/proxyGateway');
    const redis = getRedis();
    const key = buildCacheKey(req.params.id, req.params.sectionKey);
    // Drop fresh + stale copies so the next fetch is truly live.
    await redis.del(key, `stale:${key}`).catch(() => undefined);
    const result = await fetchSection(pool, redis, {
      showroomId: req.params.id, sectionKey: req.params.sectionKey, ip: req.ip ?? '0.0.0.0',
    });
    const ok = Array.isArray(result);
    res.json({ ok, result: ok ? { count: (result as unknown[]).length } : result });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'source recheck failed');
    res.status(500).json({ error: 'Re-check failed' });
  }
});

// ── Showroom Doctor (owner or admin) — sector-aware diagnosis ────────────────
router.get('/:id/doctor', requireAuth, async (req: Request, res: Response) => {
  try {
    const showroom = await getRecord<Record<string, unknown>>('showrooms', req.params.id);
    if (!showroom) { res.status(404).json({ error: 'Showroom not found' }); return; }
    if (showroom.owner_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const result = await runDoctor(pool, req.params.id);
    if (!result) { res.status(404).json({ error: 'Showroom not found' }); return; }
    // Score history — every run is recorded so owners see trends over time.
    recordEvent('showroom_doctor_score', {
      showroomId: req.params.id, score: result.report.score, sector: result.report.sector,
    });
    // Phase 2: optional LLM narrative over the deterministic findings.
    // The FACTS come from the rule engine — the model only explains and
    // prioritizes them, so the audit stays hallucination-free.
    if (req.query.narrate === '1') {
      try {
        const { chat, isConfigured } = await import('../lib/ai');
        if (isConfigured()) {
          const { findings, score, grades, sector } = result.report;
          const system = 'You are a Showroom Growth Advisor for a social-commerce platform. ' +
            'You receive a deterministic audit (score, grades, findings) for a tenant showroom and write a concise, encouraging, actionable report. ' +
            'Rules: never invent problems not listed in the findings; prioritize by severity; group into (1) one-paragraph summary, ' +
            '(2) prioritized fix list referencing the finding messages, (3) a 30-day plan with 3-5 bullet steps. Keep under 220 words. Plain text.';
          const user = 'Sector: ' + sector +
            '\nScore: ' + score + '/100 (completeness ' + grades.completeness + ', health ' + grades.health + ', freshness ' + grades.freshness + ')' +
            '\nShowroom title: ' + String(result.showroom.title ?? '') +
            '\nFindings:\n' + findings.map(f => '- [' + f.severity + '] ' + f.message).join('\n');
          const narrative = await chat(
            [{ role: 'system', content: system }, { role: 'user', content: user }],
            { maxTokens: 600 },
          ).catch(() => null);
          if (narrative) (result.report as unknown as Record<string, unknown>).narrative = narrative;
        }
      } catch { /* narrative is best-effort — findings are the source of truth */ }
      const history = await pool.query(
        `SELECT payload->>'score' AS score, created_at FROM telemetry_events
         WHERE type='showroom_doctor_score' AND payload->>'showroomId'=$1
         ORDER BY created_at DESC LIMIT 12`, [req.params.id]);
      (result.report as unknown as Record<string, unknown>).history = history.rows;
      res.json(result.report);
    } else {
      const history = await pool.query(
        `SELECT payload->>'score' AS score, created_at FROM telemetry_events
         WHERE type='showroom_doctor_score' AND payload->>'showroomId'=$1
         ORDER BY created_at DESC LIMIT 12`, [req.params.id]);
      (result.report as unknown as Record<string, unknown>).history = history.rows;
      res.json(result.report);
    }
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'showroom doctor failed');
    res.status(500).json({ error: 'Doctor analysis failed' });
  }
});

// ── Sitemap data (public) — returns all published showrooms for SEO ──────────
router.get('/sitemap-data', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT slug, id, updated_at FROM showrooms WHERE status='published' ORDER BY updated_at DESC LIMIT 5000`
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch sitemap data' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const showroom = await getRecord('showrooms', req.params.id);
    if (!showroom) { res.status(404).json({ error: 'Showroom not found' }); return; }
    res.json(showroom);
  } catch { res.status(500).json({ error: 'Failed to fetch showroom' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, category } = req.body as Record<string, string>;
    if (!title || !category) { res.status(400).json({ error: 'title and category are required' }); return; }
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = (req.body as Record<string, string>).slug ?? `${base}-${Date.now()}`;
    const { rows: existing } = await pool.query('SELECT id FROM showrooms WHERE slug=$1', [slug]);
    const finalSlug = existing.length ? `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : slug;
    const showroom = await createRecord('showrooms', { ...(req.body as Record<string, unknown>), slug: finalSlug, owner_id: req.user!.id });
    res.status(201).json(showroom);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create showroom error');
    res.status(500).json({ error: 'Failed to create showroom: ' + (err as Error).message });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ owner_id: string }>('showrooms', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Showroom not found' }); return; }
    if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json(await updateRecord('showrooms', req.params.id, req.body as Record<string, unknown>));
  } catch { res.status(500).json({ error: 'Failed to update showroom' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ owner_id: string }>('showrooms', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Showroom not found' }); return; }
    if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('showrooms', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete showroom' }); }
});

module.exports = router;
