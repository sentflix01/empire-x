/**
 * flags.js — Feature flag API
 *
 * GET  /api/flags          — get all flags (public, filtered by user)
 * GET  /api/flags/:name    — check a single flag for the current user
 * PUT  /api/flags/:name    — admin: update a flag in Redis
 */
const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { isEnabled, getAllFlags, setFlag } = require('../lib/featureFlags');

// GET /api/flags — returns all flags with effective values for the current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const all = await getAllFlags();
    // For each flag, compute if it's enabled for this specific user
    const result = {};
    for (const [name, flag] of Object.entries(all)) {
      result[name] = {
        ...flag,
        enabled_for_user: await isEnabled(name, req.user.id),
      };
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

// GET /api/flags/:name — check one flag for the current user
router.get('/:name', requireAuth, async (req, res) => {
  try {
    const enabled = await isEnabled(req.params.name, req.user.id);
    res.json({ flag: req.params.name, enabled });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check flag' });
  }
});

// PUT /api/flags/:name — admin only: update flag in Redis
router.put('/:name', requireAuth, requireAdmin, async (req, res) => {
  const { enabled, rollout } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) is required' });
  }
  try {
    const ok = await setFlag(req.params.name, enabled, rollout);
    if (!ok) {
      return res.status(503).json({ error: 'Redis not configured — flag change is temporary (env var only)' });
    }
    res.json({ flag: req.params.name, enabled, rollout });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update flag' });
  }
});

module.exports = router;
