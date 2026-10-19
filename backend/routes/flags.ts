import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { isEnabled, getAllFlags, setFlag } from '../lib/featureFlags';

const router = Router();

// A single non-sensitive availability check lets public pages decide whether
// to render the optional onboarding guide without exposing the flag registry.
router.get('/page-guided-tours', optionalAuth, async (req: Request, res: Response) => {
  try {
    res.json({ name: 'page_guided_tours', enabled_for_user: await isEnabled('page_guided_tours', req.user?.id ?? null) });
  } catch { res.status(500).json({ error: 'Failed to fetch flag' }); }
});

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const all = await getAllFlags();
    const result: Record<string, unknown> = {};
    for (const [name, flag] of Object.entries(all)) {
      result[name] = {
        ...flag,
        enabled_for_user: await isEnabled(name, req.user!.id),
      };
    }
    res.json(result);
  } catch { res.status(500).json({ error: 'Failed to fetch flags' }); }
});

router.get('/:name', requireAuth, async (req: Request, res: Response) => {
  try {
    const enabled = await isEnabled(req.params.name, req.user!.id);
    res.json({ name: req.params.name, enabled_for_user: enabled });
  } catch { res.status(500).json({ error: 'Failed to fetch flag' }); }
});

router.put('/:name', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { enabled, rollout } = req.body as { enabled?: boolean; rollout?: number };
  if (typeof enabled !== 'boolean') { res.status(400).json({ error: 'enabled (boolean) is required' }); return; }
  try {
    const ok = await setFlag(req.params.name, enabled, rollout ?? null);
    if (!ok) { res.status(503).json({ error: 'Redis not configured — flags can only be updated via env vars' }); return; }
    res.json({ success: true, name: req.params.name, enabled, rollout });
  } catch { res.status(500).json({ error: 'Failed to update flag' }); }
});

module.exports = router;
