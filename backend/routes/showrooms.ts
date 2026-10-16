import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import { cacheMiddleware } from '../middleware/cache';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord, withoutProtectedFields } from '../utils/crud';
import { runDoctor } from '../lib/showroomDoctor';
import { recordEvent } from '../lib/telemetry';
import { canPublishBusinessSite, getBusinessSubscriptionAccess, getRequiredBusinessTier, isBusinessOwnerBlocked } from '../lib/businessSubscriptionPolicy';
import { announceShowroomPublished, type PublishedShowroom } from '../lib/showroomAnnouncement';
import { businessViewGate, notPrivateBusinessSql, rejectViewGate } from '../lib/siteVisibility';

const router = Router();

router.get('/', optionalAuth, cacheMiddleware('showrooms:list', 30, { varyByAuth: true }), async (req: Request, res: Response) => {
  try {
    const { owner_id, category, sort = '-created_at', limit = '50' } = req.query as Record<string, string>;
    const requestedStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
    const status = requestedStatus ?? (owner_id === req.user?.id ? undefined : 'published');
    if (owner_id && owner_id === req.user?.id && await isBusinessOwnerBlocked(owner_id)) {
      res.status(423).json({ error: 'business_profile_blocked', message: 'This business profile is blocked until its subscription is renewed.' });
      return;
    }
    if (status && status !== 'published' && owner_id !== req.user?.id && req.user?.role !== 'admin') {
      res.status(404).json({ error: 'Showroom not found' });
      return;
    }
    const filter: Record<string, string> = {};
    if (owner_id) filter.owner_id = owner_id;
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    res.json(await listRecords('showrooms', {
      filter, sort, limit, realOnly: req.realOnly,
      paidBusinessGrace: status === 'published' && owner_id !== req.user?.id,
      publicOnly: !req.user,
    }));
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Failed to fetch showrooms');
    res.status(500).json({ error: 'Failed to fetch showrooms' });
  }
});

router.get('/slug/:slug', optionalAuth, async (req: Request, res: Response) => {
  try {
    const realFilter = req.realOnly ? `AND owner_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)
      AND EXISTS (SELECT 1 FROM business_subscriptions paid_sub
        WHERE paid_sub.business_id=showrooms.business_id AND paid_sub.tier <> 'freemium'
          AND paid_sub.current_period_end > NOW() - INTERVAL '24 hours')` : '';
    const { rows } = await pool.query(`SELECT * FROM showrooms WHERE slug=$1 AND status='published' ${realFilter} AND (expires_at IS NULL OR expires_at > NOW())`, [req.params.slug]);
    if (!rows.length) { res.status(404).json({ error: 'Showroom not found' }); return; }
    const access = rows[0].business_id ? await getBusinessSubscriptionAccess(String(rows[0].business_id)) : null;
    const isOwner = rows[0].owner_id === req.user?.id;
    if (!isOwner && rejectViewGate(res, businessViewGate(access, req), 'Showroom not found')) return;
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
router.get('/sitemap-data', async (req: Request, res: Response) => {
  try {
    const realFilter = req.realOnly ? `AND owner_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)
      AND EXISTS (SELECT 1 FROM business_subscriptions paid_sub
        WHERE paid_sub.business_id=showrooms.business_id AND paid_sub.tier <> 'freemium'
          AND paid_sub.current_period_end > NOW() - INTERVAL '24 hours')` : '';
    const { rows } = await pool.query(
      `SELECT slug, id, updated_at FROM showrooms WHERE status='published' AND (expires_at IS NULL OR expires_at > NOW()) ${realFilter}
         AND ${notPrivateBusinessSql('showrooms.business_id')} ORDER BY updated_at DESC LIMIT 5000`
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch sitemap data' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const showroom = await getRecord<Record<string, unknown>>('showrooms', req.params.id, { realOnly: req.realOnly });
    if (!showroom) { res.status(404).json({ error: 'Showroom not found' }); return; }
    const access = showroom.business_id ? await getBusinessSubscriptionAccess(String(showroom.business_id)) : null;
    const isOwner = showroom.owner_id === req.user?.id;
    if (showroom.status === 'published' && !isOwner && rejectViewGate(res, businessViewGate(access, req), 'Showroom not found')) return;
    if (showroom.status !== 'published' && showroom.owner_id !== req.user?.id) { res.status(404).json({ error: 'Showroom not found' }); return; }
    if (showroom.expires_at && new Date(String(showroom.expires_at)).getTime() <= Date.now()) { res.status(404).json({ error: 'Showroom not found' }); return; }
    res.json(showroom);
  } catch { res.status(500).json({ error: 'Failed to fetch showroom' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, category } = req.body as Record<string, string>;
    if (!title || !category) { res.status(400).json({ error: 'title and category are required' }); return; }
    if (!req.user!.is_demo && await isBusinessOwnerBlocked(req.user!.id)) {
      res.status(423).json({ error: 'business_creation_blocked', message: 'You can create a new business profile after the restriction period ends.' });
      return;
    }
    const requestedStatus = typeof req.body.status === 'string' ? req.body.status : 'draft';
    if (!['draft', 'published', 'archived'].includes(requestedStatus)) { res.status(400).json({ error: 'Invalid showroom status' }); return; }
    const requestedBusinessId = typeof req.body.business_id === 'string' ? req.body.business_id : undefined;
    let businessId = requestedBusinessId;
    let businessSelectionRequired = false;
    if (!req.user!.is_demo && !businessId) {
      const { rows } = await pool.query<{ id: string }>('SELECT id FROM businesses WHERE owner_id=$1 ORDER BY created_at ASC LIMIT 2', [req.user!.id]);
      if (rows.length === 1) businessId = rows[0].id;
      else if (rows.length > 1 && requestedStatus === 'published') businessSelectionRequired = true;
    }
    if (businessId) {
      const owned = await pool.query('SELECT id FROM businesses WHERE id=$1 AND owner_id=$2', [businessId, req.user!.id]);
      if (!owned.rowCount && req.user!.role !== 'admin') { res.status(403).json({ error: 'You can only link a website to your own Business profile.' }); return; }
    }
    const businessProfileRequired = requestedStatus === 'published' && !req.user!.is_demo && !businessId && !businessSelectionRequired;
    const requestedSections = (req.body as Record<string, unknown>).sections;
    const requiredTier = getRequiredBusinessTier(requestedSections);
    if (requestedStatus === 'published' && !req.user!.is_demo && !requiredTier) {
      res.status(400).json({ error: 'invalid_showroom_sections', message: 'Website sections must be a valid JSON array before publishing.' });
      return;
    }
    const subscriptionRequired = requestedStatus === 'published' && !req.user!.is_demo && !!businessId
      && !await canPublishBusinessSite(businessId, req.user!.id, requestedSections);
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = (req.body as Record<string, string>).slug ?? `${base}-${Date.now()}`;
    const { rows: existing } = await pool.query('SELECT id FROM showrooms WHERE slug=$1', [slug]);
    const finalSlug = existing.length ? `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : slug;
    const fields = withoutProtectedFields(req.body as Record<string, unknown>, 'owner_id');
    delete fields.expires_at;
    fields.business_id = businessId ?? null;
    const saveAsDraft = businessProfileRequired || businessSelectionRequired || subscriptionRequired;
    fields.status = saveAsDraft ? 'draft' : requestedStatus;
    if (req.user!.is_demo && fields.status === 'published') {
      fields.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (!req.user!.is_demo && fields.status === 'draft') {
      fields.expires_at = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    }
    const showroom = await createRecord('showrooms', { ...fields, slug: finalSlug, owner_id: req.user!.id });
    if (businessProfileRequired) {
      res.status(409).json({ error: 'business_profile_required', draftId: showroom.id, message: 'Your draft is saved. Create a Business profile, then link it before publishing.' });
      return;
    }
    if (businessSelectionRequired) {
      res.status(409).json({ error: 'business_selection_required', draftId: showroom.id, message: 'Your draft is saved. Choose which Business profile this website belongs to.' });
      return;
    }
    if (subscriptionRequired) {
      res.status(402).json({ error: 'subscription_required', businessId, draftId: showroom.id, requiredTier, message: `Your selected sections require the ${requiredTier === 'pro' ? 'Pro' : requiredTier === 'premium' ? 'Premium' : 'Normal'} plan to publish.` });
      return;
    }
    if (showroom.status === 'published') void announceShowroomPublished(showroom as unknown as PublishedShowroom);
    res.status(201).json(showroom);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create showroom error');
    res.status(500).json({ error: 'Failed to create showroom: ' + (err as Error).message });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: currentRows } = await pool.query<{ owner_id: string; status: string; expires_at: Date | null; business_id: string | null; sections: unknown }>('SELECT owner_id, status, expires_at, business_id, sections FROM showrooms WHERE id=$1', [req.params.id]);
    const existing = currentRows[0];
    if (!existing) { res.status(404).json({ error: 'Showroom not found' }); return; }
    if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    if (existing.status === 'draft' && existing.expires_at && new Date(existing.expires_at).getTime() <= Date.now()) {
      res.status(410).json({ error: 'draft_expired', message: 'This website draft expired after three days. Start a new draft to continue.' });
      return;
    }
    const updates = withoutProtectedFields(req.body as Record<string, unknown>, 'owner_id');
    delete updates.expires_at;
    const currentAccess = existing.business_id ? await getBusinessSubscriptionAccess(existing.business_id) : null;
    let businessId = typeof updates.business_id === 'string' ? updates.business_id : existing.business_id ?? undefined;
    if (!businessId && !req.user!.is_demo) {
      const { rows } = await pool.query<{ id: string }>('SELECT id FROM businesses WHERE owner_id=$1 ORDER BY created_at ASC LIMIT 2', [req.user!.id]);
      if (rows.length === 1) businessId = rows[0].id;
      else if (rows.length > 1 && updates.status === 'published') { res.status(409).json({ error: 'business_selection_required', draftId: req.params.id, message: 'Choose which Business profile this website belongs to.' }); return; }
    }
    if (businessId) {
      const owned = await pool.query('SELECT id FROM businesses WHERE id=$1 AND owner_id=$2', [businessId, req.user!.id]);
      if (!owned.rowCount && req.user!.role !== 'admin') { res.status(403).json({ error: 'You can only link a website to your own Business profile.' }); return; }
    }
    updates.business_id = businessId ?? null;
    if (updates.status !== undefined && !['draft', 'published', 'archived'].includes(String(updates.status))) { res.status(400).json({ error: 'Invalid showroom status' }); return; }
    // Re-check entitlements whenever the result is a published site with new
    // sections, not only when status:'published' is sent: otherwise a live
    // site could be edited to add sections above its plan.
    const publishesSections = updates.status === 'published'
      || (updates.status === undefined && existing.status === 'published' && updates.sections !== undefined);
    if (publishesSections && !req.user!.is_demo) {
      if (!businessId) { res.status(409).json({ error: 'business_profile_required', draftId: req.params.id, message: 'Create a Business profile before publishing this website.' }); return; }
      const requestedSections = updates.sections ?? existing.sections;
      const requiredTier = getRequiredBusinessTier(requestedSections);
      if (!requiredTier) { res.status(400).json({ error: 'invalid_showroom_sections', message: 'Website sections must be a valid JSON array before publishing.' }); return; }
      if (!await canPublishBusinessSite(businessId, req.user!.id, requestedSections)) {
        if (existing.status === 'draft') {
          updates.status = 'draft';
          updates.expires_at = existing.expires_at ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
          await updateRecord('showrooms', req.params.id, updates);
        }
        res.status(402).json({ error: 'subscription_required', businessId, draftId: req.params.id, requiredTier, message: `Your selected sections require the ${requiredTier === 'pro' ? 'Pro' : requiredTier === 'premium' ? 'Premium' : 'Normal'} plan to publish.` });
        return;
      }
      updates.expires_at = null;
    } else if (!req.user!.is_demo && updates.status === 'draft' && existing.status !== 'draft') {
      updates.expires_at = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    }
    if (req.user!.is_demo && updates.status === 'published') {
      updates.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    if (!Object.keys(updates).length) { res.status(400).json({ error: 'No updatable showroom fields provided' }); return; }
    const updated = await updateRecord('showrooms', req.params.id, updates);
    // First transition to published puts the site in followers' feeds.
    if (updated && existing.status !== 'published' && (updated as Record<string, unknown>).status === 'published') {
      void announceShowroomPublished(updated as unknown as PublishedShowroom);
    }
    res.json(updated);
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
