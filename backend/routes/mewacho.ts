/**
 * routes/mewacho.ts — Mewacho (ምውጮ) group money collection
 *
 * Endpoints:
 *   GET    /api/mewacho/groups                   — my groups
 *   POST   /api/mewacho/groups                   — create group
 *   GET    /api/mewacho/groups/join/:invite_code — join via invite link
 *   GET    /api/mewacho/groups/:id               — group detail
 *   POST   /api/mewacho/groups/:id/contribute    — create Stripe session
 *   POST   /api/mewacho/groups/:id/message       — post chat message
 *   POST   /api/mewacho/groups/:id/withdraw      — request withdrawal
 *   PUT    /api/mewacho/withdrawals/:wid/approve — approve withdrawal (admin)
 *   PUT    /api/mewacho/withdrawals/:wid/reject  — reject withdrawal (admin)
 *   POST   /api/mewacho/webhook                  — Stripe webhook
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { emitNotification } from '../socket';
import { sendPushToUser } from './push';
import { getPrimaryFrontendUrl } from '../lib/frontendUrl';
import * as apiError from '../lib/apiError';
import logger from '../lib/logger';
import { isStripeConfigured, stripeClientFacade, withVerifiedStripeWebhook } from '../lib/stripeClient';
import { requireIsolatedPaymentEnvironment } from '../middleware/demoEnvironment';
import { requireFeatureFlag } from '../middleware/featureFlag';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe: any = stripeClientFacade();

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemberRow { role: string }
interface UserNameRow { name: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

async function isMember(groupId: string, userId: string): Promise<MemberRow | null> {
  const { rows } = await pool.query<MemberRow>(
    'SELECT role FROM mewacho_members WHERE group_id=$1 AND user_id=$2',
    [groupId, userId],
  );
  return rows[0] ?? null;
}

async function notifyMembers(
  groupId: string,
  excludeUserId: string,
  title: string,
  body: string,
  link: string,
): Promise<void> {
  const { rows } = await pool.query<{ user_id: string }>(
    'SELECT user_id FROM mewacho_members WHERE group_id=$1',
    [groupId],
  );
  for (const { user_id } of rows) {
    if (user_id === excludeUserId) continue;
    const { rows: [notif] } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link, is_read)
       VALUES ($1,'mewacho',$2,$3,$4,false) RETURNING *`,
      [user_id, title, body, link],
    );
    emitNotification(user_id, notif as Record<string, unknown>);
    sendPushToUser(user_id, title, body, link).catch(() => undefined);
  }
}

async function appendActivity(
  client: PoolClient,
  groupId: string,
  userId: string | null,
  type: string,
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const { rows } = await client.query(
    `INSERT INTO mewacho_activity (group_id, user_id, type, content, metadata)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [groupId, userId, type, content, JSON.stringify(metadata)],
  );
  return rows[0] as Record<string, unknown>;
}

async function getUserName(client: PoolClient, userId: string): Promise<string> {
  const { rows } = await client.query<UserNameRow>(
    `SELECT COALESCE(NULLIF(full_name,''), email) AS name FROM users WHERE id=$1`,
    [userId],
  );
  return rows[0]?.name ?? 'Someone';
}

// ── GET /api/mewacho/groups ───────────────────────────────────────────────────
router.get('/groups', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.*,
              mm.role AS my_role,
              COUNT(DISTINCT m.user_id)::int AS member_count,
              COALESCE(SUM(c.amount) FILTER (WHERE c.status='confirmed'), 0) AS total_collected
       FROM mewacho_groups g
       JOIN mewacho_members mm ON mm.group_id = g.id AND mm.user_id = $1
       LEFT JOIN mewacho_members m  ON m.group_id  = g.id
       LEFT JOIN mewacho_contributions c ON c.group_id = g.id
       GROUP BY g.id, mm.role
       ORDER BY g.created_at DESC`,
      [req.user!.id],
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err }, 'mewacho: list groups');
    apiError.serverError(res, 'Failed to fetch groups');
  }
});

// ── POST /api/mewacho/groups ──────────────────────────────────────────────────
router.post('/groups', requireAuth, async (req: Request, res: Response) => {
  const { name, description, purpose = 'general', target_amount, cover_photo } =
    req.body as Record<string, unknown>;
  if (!name || !String(name).trim()) {
    apiError.validationError(res, 'Group name is required'); return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [group] } = await client.query(
      `INSERT INTO mewacho_groups (name, description, purpose, target_amount, cover_photo, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [String(name).trim(), description ?? null, purpose, target_amount ?? null,
       cover_photo ?? null, req.user!.id],
    );

    await client.query(
      `INSERT INTO mewacho_members (group_id, user_id, role) VALUES ($1,$2,'admin')`,
      [group.id, req.user!.id],
    );

    await appendActivity(client, group.id as string, req.user!.id, 'system',
      'Group created', { purpose });

    await client.query('COMMIT');
    res.status(201).json(group);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'mewacho: create group');
    apiError.serverError(res, 'Failed to create group');
  } finally {
    client.release();
  }
});

// ── GET /api/mewacho/groups/join/:invite_code ─────────────────────────────────
router.get('/groups/join/:invite_code', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: [group] } = await pool.query(
      `SELECT * FROM mewacho_groups WHERE invite_code=$1 AND status='active'`,
      [req.params.invite_code],
    );
    if (!group) { apiError.notFound(res, 'Group not found or closed'); return; }

    const existing = await isMember(group.id as string, req.user!.id);
    if (existing) { res.json({ group, already_member: true }); return; }

    await pool.query(
      `INSERT INTO mewacho_members (group_id, user_id, role) VALUES ($1,$2,'member')
       ON CONFLICT DO NOTHING`,
      [group.id, req.user!.id],
    );

    const client = await pool.connect();
    try {
      const name = await getUserName(client, req.user!.id);
      await appendActivity(client, group.id as string, req.user!.id, 'system',
        `${name} joined the group`);
    } finally { client.release(); }

    res.json({ group, already_member: false });
  } catch (err) {
    logger.error({ err }, 'mewacho: join group');
    apiError.serverError(res, 'Failed to join group');
  }
});

// ── GET /api/mewacho/groups/:id ───────────────────────────────────────────────
router.get('/groups/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const member = await isMember(req.params.id, req.user!.id);
    if (!member) { apiError.notFound(res, 'Group not found'); return; }

    const [groupRes, membersRes, contribRes, activityRes, withdrawRes] = await Promise.all([
      pool.query(
        `SELECT g.*,
                COUNT(DISTINCT m.user_id)::int AS member_count,
                COALESCE(SUM(c.amount) FILTER (WHERE c.status='confirmed'),0) AS total_collected
         FROM mewacho_groups g
         LEFT JOIN mewacho_members m ON m.group_id=g.id
         LEFT JOIN mewacho_contributions c ON c.group_id=g.id
         WHERE g.id=$1 GROUP BY g.id`,
        [req.params.id],
      ),
      pool.query(
        `SELECT mm.*, COALESCE(NULLIF(u.full_name,''), u.email) AS display_name, up.avatar_url
         FROM mewacho_members mm
         JOIN users u ON u.id=mm.user_id
         LEFT JOIN LATERAL (
           SELECT avatar_url FROM user_profiles WHERE user_id=mm.user_id
           ORDER BY updated_at DESC LIMIT 1
         ) up ON TRUE
         WHERE mm.group_id=$1 ORDER BY mm.joined_at`,
        [req.params.id],
      ),
      pool.query(
        `SELECT c.*, COALESCE(NULLIF(u.full_name,''), u.email) AS display_name, up.avatar_url
         FROM mewacho_contributions c
         JOIN users u ON u.id=c.user_id
         LEFT JOIN LATERAL (
           SELECT avatar_url FROM user_profiles WHERE user_id=c.user_id
           ORDER BY updated_at DESC LIMIT 1
         ) up ON TRUE
         WHERE c.group_id=$1 AND (c.is_anonymous=false OR c.user_id=$2)
         ORDER BY c.created_at DESC`,
        [req.params.id, req.user!.id],
      ),
      pool.query(
        `SELECT a.*, COALESCE(NULLIF(u.full_name,''), u.email) AS display_name, up.avatar_url
         FROM mewacho_activity a
         LEFT JOIN users u ON u.id=a.user_id
         LEFT JOIN LATERAL (
           SELECT avatar_url FROM user_profiles WHERE user_id=a.user_id
           ORDER BY updated_at DESC LIMIT 1
         ) up ON TRUE
         WHERE a.group_id=$1 ORDER BY a.created_at ASC LIMIT 200`,
        [req.params.id],
      ),
      pool.query(
        `SELECT w.*, COALESCE(NULLIF(u.full_name,''), u.email) AS requested_by_name
         FROM mewacho_withdrawals w
         JOIN users u ON u.id=w.requested_by
         WHERE w.group_id=$1 ORDER BY w.created_at DESC`,
        [req.params.id],
      ),
    ]);

    res.json({
      group:         groupRes.rows[0],
      members:       membersRes.rows,
      contributions: contribRes.rows,
      activity:      activityRes.rows,
      withdrawals:   withdrawRes.rows,
      my_role:       member.role,
    });
  } catch (err) {
    logger.error({ err }, 'mewacho: get group');
    apiError.serverError(res, 'Failed to fetch group');
  }
});

// ── POST /api/mewacho/groups/:id/contribute ───────────────────────────────────
router.post('/groups/:id/contribute', requireAuth, requireIsolatedPaymentEnvironment, requireFeatureFlag('stripe_payments', 'Stripe payments temporarily disabled'), async (req: Request, res: Response) => {
  if (!isStripeConfigured()) { res.status(503).json({ error: 'Stripe is not configured for this environment' }); return; }

  const member = await isMember(req.params.id, req.user!.id);
  if (!member) { apiError.notFound(res, 'Group not found'); return; }

  const { rows: [group] } = await pool.query(
    'SELECT * FROM mewacho_groups WHERE id=$1', [req.params.id],
  );
  if (group?.status !== 'active') {
    apiError.validationError(res, 'Group is closed'); return;
  }

  const { amount, is_anonymous = false } = req.body as { amount?: unknown; is_anonymous?: boolean };
  const amountEtb = parseFloat(String(amount ?? 0));
  if (!amountEtb || amountEtb <= 0) {
    apiError.validationError(res, 'Valid amount required'); return;
  }

  const frontendUrl = getPrimaryFrontendUrl();
  const rate = (() => {
    const r = parseFloat(process.env.STRIPE_ETB_TO_USD_RATE ?? '0.008');
    return Number.isFinite(r) && r > 0 ? r : 0.008;
  })();
  const amountUsd = Math.round(amountEtb * rate * 100); // cents

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [contrib] } = await client.query(
      `INSERT INTO mewacho_contributions
         (group_id, user_id, amount, payment_method, status, is_anonymous)
       VALUES ($1,$2,$3,'stripe','pending',$4) RETURNING *`,
      [group.id, req.user!.id, amountEtb, is_anonymous],
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amountUsd,
          product_data: {
            name: `Contribution to "${group.name as string}"`,
            description: (group.description ?? group.purpose) as string,
          },
        },
        quantity: 1,
      }],
      metadata: {
        mewacho_group_id:   group.id as string,
        mewacho_contrib_id: contrib.id as string,
        user_id:            req.user!.id,
        amount_etb:         String(amountEtb),
      },
      success_url: `${frontendUrl}/mewacho/${group.id as string}?payment=success`,
      cancel_url:  `${frontendUrl}/mewacho/${group.id as string}?payment=cancelled`,
    });

    await client.query(
      'UPDATE mewacho_contributions SET stripe_session_id=$1 WHERE id=$2',
      [session.id, contrib.id],
    );

    await client.query('COMMIT');
    res.json({
      checkout_url:    session.url,
      session_id:      session.id,
      contribution_id: contrib.id,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'mewacho: create contribution session');
    apiError.serverError(res, 'Failed to create payment session');
  } finally {
    client.release();
  }
});

// ── POST /api/mewacho/groups/:id/message ─────────────────────────────────────
router.post('/groups/:id/message', requireAuth, async (req: Request, res: Response) => {
  const member = await isMember(req.params.id, req.user!.id);
  if (!member) { apiError.notFound(res, 'Group not found'); return; }

  const { content } = req.body as { content?: string };
  if (!content?.trim()) { apiError.validationError(res, 'Message is required'); return; }

  const client = await pool.connect();
  try {
    const activity = await appendActivity(
      client, req.params.id, req.user!.id, 'message', content.trim(),
    );
    const name = await getUserName(client, req.user!.id);
    res.status(201).json({ ...activity, display_name: name });
  } catch (err) {
    logger.error({ err }, 'mewacho: send message');
    apiError.serverError(res, 'Failed to send message');
  } finally {
    client.release();
  }
});

// ── POST /api/mewacho/groups/:id/withdraw ─────────────────────────────────────
router.post('/groups/:id/withdraw', requireAuth, requireIsolatedPaymentEnvironment, async (req: Request, res: Response) => {
  const member = await isMember(req.params.id, req.user!.id);
  if (!member || member.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can request withdrawals' }); return;
  }

  const { amount, destination_type = 'bank', destination_ref, note } =
    req.body as Record<string, unknown>;
  const amountNum = parseFloat(String(amount ?? 0));
  if (!amountNum || amountNum <= 0) {
    apiError.validationError(res, 'Valid amount required'); return;
  }
  if (!destination_ref || !String(destination_ref).trim()) {
    apiError.validationError(res, 'destination_ref is required'); return;
  }

  try {
    const { rows: [totals] } = await pool.query<{ collected: string; withdrawn: string }>(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE status='confirmed'), 0) AS collected,
         0 AS withdrawn
       FROM mewacho_contributions WHERE group_id=$1`,
      [req.params.id],
    );
    const withdrawn = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM mewacho_withdrawals
       WHERE group_id=$1 AND status='completed'`,
      [req.params.id],
    );
    const available =
      parseFloat(totals.collected) - parseFloat(withdrawn.rows[0]?.total ?? '0');
    if (amountNum > available) {
      apiError.validationError(res, `Only ${available.toFixed(2)} ETB available`); return;
    }

    const { rows: admins } = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM mewacho_members WHERE group_id=$1 AND role='admin'`,
      [req.params.id],
    );
    const requiresApproval = amountNum > 5000 || admins.length > 1;

    const { rows: [w] } = await pool.query(
      `INSERT INTO mewacho_withdrawals
         (group_id, requested_by, amount, destination_type, destination_ref,
          note, requires_approval, status, approved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.id, req.user!.id, amountNum, destination_type,
       String(destination_ref).trim(), note ?? null, requiresApproval,
       requiresApproval ? 'pending' : 'approved',
       requiresApproval ? [] : [req.user!.id]],
    );

    const { rows: [grp] } = await pool.query<{ name: string }>(
      'SELECT name FROM mewacho_groups WHERE id=$1', [req.params.id],
    );
    await notifyMembers(
      req.params.id, req.user!.id,
      '💸 Withdrawal requested',
      `A withdrawal of ${amountNum} ETB was requested from "${grp.name}"`,
      `/mewacho/${req.params.id}`,
    );

    const client = await pool.connect();
    try {
      const name = await getUserName(client, req.user!.id);
      await appendActivity(client, req.params.id, req.user!.id, 'withdrawal',
        `${name} requested a withdrawal of ${amountNum} ETB`,
        { amount: amountNum, destination_type, requires_approval: requiresApproval });
    } finally { client.release(); }

    res.status(201).json(w);
  } catch (err) {
    logger.error({ err }, 'mewacho: create withdrawal');
    apiError.serverError(res, 'Failed to create withdrawal request');
  }
});

// ── PUT /api/mewacho/withdrawals/:wid/approve ─────────────────────────────────
router.put('/withdrawals/:wid/approve', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: [w] } = await pool.query(
      'SELECT * FROM mewacho_withdrawals WHERE id=$1', [req.params.wid],
    );
    if (!w) { apiError.notFound(res, 'Withdrawal not found'); return; }

    const member = await isMember(w.group_id as string, req.user!.id);
    if (!member || member.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can approve withdrawals' }); return;
    }
    if (w.status !== 'pending') {
      apiError.validationError(res, `Withdrawal is already ${w.status as string}`); return;
    }

    const approvedBy: string[] = [...((w.approved_by as string[]) ?? [])];
    if (!approvedBy.includes(req.user!.id)) approvedBy.push(req.user!.id);

    const { rows: admins } = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM mewacho_members WHERE group_id=$1 AND role='admin'`,
      [w.group_id],
    );
    const allApproved = admins.every((a) => approvedBy.includes(a.user_id));
    const { rows: [updated] } = await pool.query(
      `UPDATE mewacho_withdrawals SET approved_by=$1, status=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [approvedBy, allApproved ? 'approved' : 'pending', w.id],
    );
    res.json(updated);
  } catch (err) {
    logger.error({ err }, 'mewacho: approve withdrawal');
    apiError.serverError(res, 'Failed to approve withdrawal');
  }
});

// ── PUT /api/mewacho/withdrawals/:wid/reject ──────────────────────────────────
router.put('/withdrawals/:wid/reject', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: [w] } = await pool.query(
      'SELECT * FROM mewacho_withdrawals WHERE id=$1', [req.params.wid],
    );
    if (!w) { apiError.notFound(res, 'Withdrawal not found'); return; }

    const member = await isMember(w.group_id as string, req.user!.id);
    if (!member || member.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can reject withdrawals' }); return;
    }

    const { rows: [updated] } = await pool.query(
      `UPDATE mewacho_withdrawals SET status='rejected', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [w.id],
    );
    res.json(updated);
  } catch (err) {
    logger.error({ err }, 'mewacho: reject withdrawal');
    apiError.serverError(res, 'Failed to reject withdrawal');
  }
});

// ── POST /api/mewacho/webhook — Stripe webhook ────────────────────────────────
// Raw body parser registered in index.ts:
//   app.use('/api/mewacho/webhook', express.raw({ type: 'application/json' }));
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    await withVerifiedStripeWebhook(
      req.body as Buffer,
      req.headers['stripe-signature'] as string | undefined,
      {
        real: process.env.STRIPE_MEWACHO_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET,
        demo: process.env.STRIPE_TEST_MEWACHO_WEBHOOK_SECRET,
      },
      async (event: any) => {
  if (event.type === 'checkout.session.completed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = event.data.object as any;
    const { mewacho_contrib_id, mewacho_group_id, user_id, amount_etb } =
      (session.metadata ?? {}) as Record<string, string>;

    if (!mewacho_contrib_id) { res.json({ received: true }); return; }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [confirmed] } = await client.query(
        `UPDATE mewacho_contributions SET status='confirmed'
         WHERE id=$1 AND status='pending' RETURNING id`,
        [mewacho_contrib_id],
      );

      // Stripe retries webhook deliveries. Only the request that atomically
      // changes pending → confirmed may append activity or send notifications.
      if (!confirmed) {
        await client.query('COMMIT');
        res.json({ received: true, duplicate: true });
        return;
      }

      const name = await getUserName(client, user_id);
      const { rows: [contrib] } = await client.query<{ is_anonymous: boolean }>(
        'SELECT is_anonymous FROM mewacho_contributions WHERE id=$1',
        [mewacho_contrib_id],
      );
      const displayName = contrib?.is_anonymous ? 'Anonymous' : name;
      const amountFormatted = parseFloat(amount_etb).toLocaleString();

      await appendActivity(
        client, mewacho_group_id, user_id, 'contribution',
        `${displayName} contributed ${amountFormatted} ETB via Stripe`,
        { amount: parseFloat(amount_etb), payment_method: 'stripe',
          is_anonymous: contrib?.is_anonymous },
      );

      await client.query('COMMIT');

      const { rows: [grp] } = await pool.query<{ name: string }>(
        'SELECT name FROM mewacho_groups WHERE id=$1', [mewacho_group_id],
      );
      await notifyMembers(
        mewacho_group_id, user_id,
        '💰 New contribution!',
        `${displayName} contributed ${amountFormatted} ETB to "${grp?.name ?? ''}"`,
        `/mewacho/${mewacho_group_id}`,
      );
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      logger.error({ err }, 'mewacho webhook: failed to confirm contribution');
      throw err;
    } finally {
      client.release();
    }
  }

  res.json({ received: true });
      },
    );
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('signature')) { res.status(400).send('Invalid Stripe signature'); return; }
    logger.error({ err: message }, 'mewacho webhook handler failed');
    res.status(500).send('Webhook processing failed');
  }
});

module.exports = router;
