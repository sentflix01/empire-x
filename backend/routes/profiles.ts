import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Redis as RedisClient } from 'ioredis';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord } from '../utils/crud';
import { getRedis } from '../lib/redis';

const router = Router();

const COVER_POS_RE = /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/;
const COVER_POSITION_FIELDS = ['cover_position', 'business_cover_position'] as const;
const EDITABLE_PROFILE_FIELDS = [
  'display_name', 'bio', 'avatar_url', 'cover_url', 'profile_type', 'headline', 'location', 'phone',
  'business_name', 'business_category', 'business_template', 'business_description', 'business_logo_url',
  'business_cover_url', 'business_sections', 'business_theme_color', 'business_contact_email',
  'business_contact_phone', 'business_address', 'business_hours', 'skills', 'experience', 'education',
  'ticker_text', 'ticker_type', 'cover_position', 'business_cover_position', 'social_linkedin',
  'social_twitter', 'social_instagram', 'social_facebook', 'social_youtube', 'website', 'languages',
  'business_website', 'business_founded_year', 'business_team_size', 'business_registration_number',
  'business_type', 'business_social_linkedin', 'business_social_twitter', 'business_social_facebook',
  'certifications', 'awards', 'services', 'service_areas', 'extra_json', 'business_extra_json',
  'latitude', 'longitude', 'presence_visibility', 'has_business_profile',
] as const;
const PUBLIC_PROFILE_COLUMNS = [
  'id', 'user_id', 'display_name', 'bio', 'avatar_url', 'cover_url', 'profile_type', 'headline', 'location',
  'is_verified', 'verification_type', 'follower_count', 'following_count', 'connection_count', 'has_business_profile',
  'business_name', 'business_category', 'business_template', 'business_description', 'business_logo_url',
  'business_cover_url', 'business_sections', 'business_theme_color', 'business_contact_email',
  'business_contact_phone', 'business_address', 'business_hours', 'skills', 'experience', 'education',
  'ticker_text', 'ticker_type', 'social_linkedin', 'social_twitter', 'social_instagram', 'social_facebook',
  'social_youtube', 'website', 'languages', 'business_website', 'business_founded_year', 'business_team_size',
  'business_type', 'business_social_linkedin', 'business_social_twitter', 'business_social_facebook',
  'certifications', 'awards', 'services', 'service_areas', 'cover_position', 'business_cover_position',
] as const;
const PUBLIC_PROFILE_SELECT = PUBLIC_PROFILE_COLUMNS.map((field) => `up.${field}`).join(', ');
const BUSINESS_PROFILE_FIELDS = [
  'has_business_profile', 'business_name', 'business_category', 'business_template', 'business_description',
  'business_logo_url', 'business_cover_url', 'business_sections', 'business_theme_color', 'business_contact_email',
  'business_contact_phone', 'business_address', 'business_hours', 'business_website', 'business_founded_year',
  'business_team_size', 'business_type', 'business_social_linkedin', 'business_social_twitter',
  'business_social_facebook', 'certifications', 'awards', 'services', 'service_areas', 'business_cover_position',
] as const;

async function redactUnpaidBusinessProfile<T extends Record<string, unknown>>(profile: T, isOwner: boolean): Promise<T> {
  if (profile.has_business_profile !== true) return profile;
  const { rows } = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM businesses b JOIN business_subscriptions bs ON bs.business_id=b.id
       WHERE b.owner_id=$1 AND bs.tier <> 'freemium'
         AND bs.current_period_end > NOW() - INTERVAL '24 hours'
     ) AS visible, EXISTS (
       SELECT 1 FROM businesses b JOIN business_subscriptions bs ON bs.business_id=b.id
       WHERE b.owner_id=$1 AND bs.current_period_end <= NOW() - INTERVAL '3 days'
     ) AS owner_blocked`,
    [profile.user_id],
  );
  if (isOwner ? !rows[0]?.owner_blocked : rows[0]?.visible) return profile;
  const sanitized: Record<string, unknown> = { ...profile };
  for (const field of BUSINESS_PROFILE_FIELDS) sanitized[field] = field === 'has_business_profile' ? false : null;
  return sanitized as T;
}

function editableProfileFields(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(EDITABLE_PROFILE_FIELDS
    .filter((field) => body[field] !== undefined)
    .map((field) => [field, body[field]]));
}

function profileValidationError(body: Record<string, unknown>): string | null {
  if (body.profile_type !== undefined && !['personal', 'business'].includes(String(body.profile_type))) {
    return 'profile_type must be personal or business';
  }
  if (body.ticker_type !== undefined && !['none', 'contact', 'promo', 'news', 'location', 'custom', 'auto'].includes(String(body.ticker_type))) {
    return 'Invalid ticker_type';
  }
  if (body.presence_visibility !== undefined && !['everyone', 'nobody'].includes(String(body.presence_visibility))) {
    return 'presence_visibility must be everyone or nobody';
  }
  for (const [field, max] of [['latitude', 90], ['longitude', 180]] as const) {
    if (body[field] === undefined || body[field] === null || body[field] === '') continue;
    const coordinate = Number(body[field]);
    if (!Number.isFinite(coordinate) || Math.abs(coordinate) > max) return `${field} is outside its valid range`;
    body[field] = coordinate;
  }
  if (body.display_name !== undefined && (typeof body.display_name !== 'string' || !body.display_name.trim())) {
    return 'display_name must be a non-empty string';
  }
  if (typeof body.display_name === 'string') body.display_name = body.display_name.trim();
  return null;
}

function sanitizeCoverPositions(body: Record<string, unknown>): Record<string, unknown> {
  for (const k of COVER_POSITION_FIELDS) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v === null || v === '') continue;
    if (typeof v !== 'string' || !COVER_POS_RE.test(v)) delete body[k];
  }
  return body;
}

async function syncUserName(userId: string, displayName: unknown): Promise<void> {
  if (typeof displayName !== 'string' || !displayName.trim()) return;
  await pool.query('UPDATE users SET full_name = $1 WHERE id = $2', [displayName.trim(), userId]);
}

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [req.user!.id]);
    if (!rows.length) { res.status(404).json({ error: 'Profile not found' }); return; }
    res.json(await redactUnpaidBusinessProfile(rows[0], true));
  } catch { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

router.get('/by-user/:userId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const realFilter = req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : '';
    const profileSelect = req.user?.id === req.params.userId ? 'up.*' : PUBLIC_PROFILE_SELECT;
    const { rows } = await pool.query(
      `SELECT ${profileSelect}, u.is_seed FROM user_profiles up JOIN users u ON u.id = up.user_id WHERE up.user_id = $1 ${realFilter}`,
      [req.params.userId],
    );
    if (!rows.length) { res.status(404).json({ error: 'Profile not found' }); return; }
    res.json(await redactUnpaidBusinessProfile(rows[0], req.user?.id === req.params.userId));
  } catch { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

router.get('/me/follows', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT followed_id FROM follows WHERE follower_id = $1', [req.user!.id]);
    res.json(rows.map((r: { followed_id: string }) => r.followed_id));
  } catch { res.status(500).json({ error: 'Failed to fetch follows' }); }
});

router.get('/follows', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT followed_id FROM follows WHERE follower_id = $1', [req.user!.id]);
    res.json(rows.map((r: { followed_id: string }) => r.followed_id));
  } catch { res.status(500).json({ error: 'Failed to fetch follows' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const realFilter = req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : '';
    const { rows: ownerRows } = await pool.query(
      `SELECT up.user_id FROM user_profiles up JOIN users u ON u.id=up.user_id WHERE up.id=$1 ${realFilter}`,
      [req.params.id],
    );
    if (!ownerRows.length) { res.status(404).json({ error: 'Profile not found' }); return; }
    const profileSelect = req.user?.id === ownerRows[0].user_id ? 'up.*' : PUBLIC_PROFILE_SELECT;
    const { rows } = await pool.query(
      `SELECT ${profileSelect}, u.is_seed FROM user_profiles up JOIN users u ON u.id = up.user_id WHERE up.id = $1 ${realFilter}`,
      [req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Profile not found' }); return; }
    res.json(await redactUnpaidBusinessProfile(rows[0], req.user?.id === ownerRows[0].user_id));
  } catch { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const redis = getRedis();
  const { user_id, profile_type, sort = '-created_at', limit = 50 } = req.query as Record<string, string>;
  const includePrivateFields = !!req.user?.id && user_id === req.user.id;
  const cacheKey = `cache:profiles:list:v2:${new URLSearchParams({ ...req.query as Record<string, string>, realOnly: req.realOnly ? '1' : '0' }).toString()}`;
  if (!redis.isNoOp && !includePrivateFields) {
    try {
      const cached = await (redis as RedisClient).get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Array<Record<string, unknown>>;
        const safe = await Promise.all(parsed.map(profile => redactUnpaidBusinessProfile(profile, profile.user_id === req.user?.id)));
        res.set('X-Cache', 'HIT'); res.json(safe); return;
      }
    } catch { /* fall through */ }
  }
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (user_id)      { values.push(user_id);      conditions.push(`up.user_id = $${values.length}`); }
    if (profile_type) { values.push(profile_type); conditions.push(`up.profile_type = $${values.length}`); }
    if (req.realOnly) conditions.push('u.is_seed = FALSE AND u.is_demo = FALSE');
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const lim = Math.min(parseInt(String(limit), 10) || 50, 500);
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
    // Explicit allowlist — never interpolate unsanitized user input as a column name
    const SORT_ALLOWLIST = new Set(['created_at', 'updated_at', 'follower_count', 'following_count', 'display_name']);
    const rawCol = sort.replace(/^-/, '');
    const sortCol = SORT_ALLOWLIST.has(rawCol) ? rawCol : 'created_at';
    values.push(lim);
    const profileSelect = includePrivateFields ? 'up.*' : PUBLIC_PROFILE_SELECT;
    const { rows } = await pool.query(
      `SELECT ${profileSelect}, u.is_seed FROM user_profiles up JOIN users u ON u.id = up.user_id
       ${whereClause} ORDER BY up.${sortCol} ${sortDir} LIMIT $${values.length}`,
      values,
    );
    const safeRows = await Promise.all(rows.map(profile => redactUnpaidBusinessProfile(profile, profile.user_id === req.user?.id)));
    if (!redis.isNoOp && !includePrivateFields) (redis as RedisClient).setex(cacheKey, 60, JSON.stringify(safeRows)).catch(() => undefined);
    res.set('X-Cache', 'MISS');
    res.json(safeRows);
  } catch { res.status(500).json({ error: 'Failed to fetch profiles' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [req.user!.id]);
    if (existing.rows.length) { res.status(409).json({ error: 'Profile already exists. Use PUT to update.' }); return; }
    const safeBody = editableProfileFields(req.body as Record<string, unknown>);
    const validationError = profileValidationError(safeBody);
    if (validationError) { res.status(422).json({ error: validationError }); return; }
    if (!safeBody.display_name) { res.status(400).json({ error: 'display_name is required' }); return; }
    const profile = await createRecord('user_profiles', { ...safeBody, user_id: req.user!.id });
    await syncUserName(req.user!.id, (req.body as Record<string, unknown>).display_name);
    res.status(201).json(profile);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create profile error');
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

router.put('/me/upsert', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: existing } = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [req.user!.id]);
    const body = sanitizeCoverPositions(editableProfileFields(req.body as Record<string, unknown>));
    const validationError = profileValidationError(body);
    if (validationError) { res.status(422).json({ error: validationError }); return; }
    let profile;
    if (existing.length) {
      profile = await updateRecord('user_profiles', existing[0].id as string, { ...body, user_id: req.user!.id });
    } else {
      profile = await createRecord('user_profiles', { ...body, user_id: req.user!.id });
    }
    await syncUserName(req.user!.id, body.display_name);
    res.json(profile);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Upsert profile error');
    res.status(500).json({ error: 'Failed to upsert profile' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<Record<string, unknown>>('user_profiles', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Profile not found' }); return; }
    if (existing.user_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const body = sanitizeCoverPositions(editableProfileFields(req.body as Record<string, unknown>));
    const validationError = profileValidationError(body);
    if (validationError) { res.status(422).json({ error: validationError }); return; }
    if (!Object.keys(body).length) { res.status(400).json({ error: 'No updatable profile fields provided' }); return; }
    const updated = await updateRecord('user_profiles', req.params.id, body);
    if (!updated) { res.status(404).json({ error: 'Profile not found' }); return; }
    await syncUserName(existing.user_id as string, (req.body as Record<string, unknown>).display_name);
    res.json(updated);
  } catch { res.status(500).json({ error: 'Failed to update profile' }); }
});

router.patch('/me/ticker', requireAuth, async (req: Request, res: Response) => {
  const { ticker_text, ticker_type } = req.body as { ticker_text?: string; ticker_type?: string };
  const VALID_TYPES = ['none', 'contact', 'promo', 'news', 'location', 'custom', 'auto'];
  if (ticker_type !== undefined && !VALID_TYPES.includes(ticker_type)) {
    res.status(400).json({ error: `ticker_type must be one of: ${VALID_TYPES.join(', ')}` }); return;
  }
  try {
    const { rows: existing } = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [req.user!.id]);
    if (!existing.length) { res.status(404).json({ error: 'Profile not found. Create your profile first.' }); return; }
    const fields: string[] = [];
    const values: unknown[] = [];
    if (ticker_type !== undefined) { values.push(ticker_type); fields.push(`ticker_type = $${values.length}`); }
    if (ticker_text !== undefined) { values.push(ticker_text === '' ? null : ticker_text); fields.push(`ticker_text = $${values.length}`); }
    if (!fields.length) { res.status(400).json({ error: 'Provide ticker_text and/or ticker_type' }); return; }
    values.push(existing[0].id);
    const { rows } = await pool.query(
      `UPDATE user_profiles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING id, ticker_text, ticker_type`,
      values,
    );
    res.json(rows[0]);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Ticker update error');
    res.status(500).json({ error: 'Failed to update ticker' });
  }
});

router.post('/follow/:targetUserId', requireAuth, async (req: Request, res: Response) => {
  const { targetUserId } = req.params;
  if (targetUserId === req.user!.id) { res.status(400).json({ error: 'Cannot follow yourself' }); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND followed_id = $2',
      [req.user!.id, targetUserId],
    );
    if (existing.length) {
      await client.query('DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2', [req.user!.id, targetUserId]);
      await Promise.all([
        client.query('UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = $1', [req.user!.id]),
        client.query('UPDATE user_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = $1', [targetUserId]),
      ]);
      await client.query('COMMIT');
      res.json({ following: false }); return;
    }
    await client.query('INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2)', [req.user!.id, targetUserId]);
    await Promise.all([
      client.query('UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = $1', [req.user!.id]),
      client.query('UPDATE user_profiles SET follower_count = follower_count + 1 WHERE user_id = $1', [targetUserId]),
    ]);
    await client.query('COMMIT');
    res.json({ following: true });
  } catch (err) {
    // A dead connection makes ROLLBACK itself throw — swallow it so the
    // original failure still reaches the client as a 500.
    try { await client.query('ROLLBACK'); } catch { /* connection already gone */ }
    res.status(500).json({ error: 'Failed to toggle follow' });
  } finally {
    client.release();
  }
});

module.exports = router;
