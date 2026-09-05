/**
 * routes/mewacho.js — Mewacho group money collection
 *
 * Endpoints:
 *   GET    /api/mewacho/groups                    — my groups
 *   POST   /api/mewacho/groups                    — create group
 *   GET    /api/mewacho/groups/:id                — group detail + totals
 *   GET    /api/mewacho/groups/join/:invite_code  — join via invite link
 *   POST   /api/mewacho/groups/:id/contribute     — create Stripe session
 *   POST   /api/mewacho/groups/:id/message        — post chat message
 *   POST   /api/mewacho/groups/:id/withdraw       — request withdrawal
 *   PUT    /api/mewacho/withdrawals/:wid/approve  — approve withdrawal (admin)
 *   PUT    /api/mewacho/withdrawals/:wid/reject   — reject withdrawal (admin)
 *   POST   /api/mewacho/webhook                   — Stripe webhook
 */
const router = require('express').Router();
const pool   = require('../db/pool');
const { requireAuth }      = require('../middleware/auth');
const { emitNotification } = require('../socket');
const { sendPushToUser }   = require('./push');
const { getPrimaryFrontendUrl } = require('../lib/frontendUrl');
const apiError = require('../lib/apiError');
const logger   = require('../lib/logger');

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// ── helpers ──────────────────────────────────────────────────────────────────

async function isMember(groupId, userId) {
  const { rows } = await pool.query(
    'SELECT role FROM mewacho_members WHERE group_id=$1 AND user_id=$2',
    [groupId, userId]
  );
  return rows[0] || null;
}

async function notifyMembers(groupId, excludeUserId, title, body, link) {
  const { rows } = await pool.query(
    'SELECT user_id FROM mewacho_members WHERE group_id=$1', [groupId]
  );
  for (const { user_id } of rows) {
    if (user_id === excludeUserId) continue;
    const { rows: [notif] } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link, is_read)
       VALUES ($1,'mewacho',$2,$3,$4,false) RETURNING *`,
      [user_id, title, body, link]
    );
    emitNotification(user_id, notif);
    sendPushToUser(user_id, title, body, link).catch(() => {});
  }
}

async function appendActivity(client, groupId, userId, type, content, metadata = {}) {
  const { rows } = await client.query(
    `INSERT INTO mewacho_activity (group_id, user_id, type, content, metadata)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [groupId, userId, type, content, JSON.stringify(metadata)]
  );
  return rows[0];
}

// ── GET /api/mewacho/groups — my groups ─────────────────────────────────────
router.get('/groups', requireAuth, async (req, res) => {
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
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err }, 'mewacho: list groups');
    return apiError.serverError(res, 'Failed to fetch groups');
  }
});

// ── POST /api/mewacho/groups — create ───────────────────────────────────────
router.post('/groups', requireAuth, async (req, res) => {
  const { name, description, purpose = 'general', target_amount, cover_photo } = req.body;
  if (!name?.trim()) return apiError.validationError(res, 'Group name is required');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [group] } = await client.query(
      `INSERT INTO mewacho_groups (name, description, purpose, target_amount, cover_photo, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name.trim(), description || null, purpose, target_amount || null, cover_photo || null, req.user.id]
    );

    await client.query(
      `INSERT INTO mewacho_members (group_id, user_id, role) VALUES ($1,$2,'admin')`,
      [group.id, req.user.id]
    );

    await appendActivity(client, group.id, req.user.id, 'system',
      'Group created', { purpose });

    await client.query('COMMIT');
    res.status(201).json(group);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'mewacho: create group');
    return apiError.serverError(res, 'Failed to create group');
  } finally {
    client.release();
  }
});

// ── GET /api/mewacho/groups/join/:invite_code ────────────────────────────────
router.get('/groups/join/:invite_code', requireAuth, async (req, res) => {
  try {
    const { rows: [group] } = await pool.query(
      'SELECT * FROM mewacho_groups WHERE invite_code=$1 AND status=$2',
      [req.params.invite_code, 'active']
    );
    if (!group) return apiError.notFound(res, 'Group not found or closed');

    const existing = await isMember(group.id, req.user.id);
    if (existing) return res.json({ group, already_member: true });

    await pool.query(
      `INSERT INTO mewacho_members (group_id, user_id, role) VALUES ($1,$2,'member')
       ON CONFLICT DO NOTHING`,
      [group.id, req.user.id]
    );

    const client = await pool.connect();
    try {
      const { rows: [u] } = await client.query(
        `SELECT COALESCE(NULLIF(full_name,''), email) AS name FROM users WHERE id=$1`,
        [req.user.id]
      );
      await appendActivity(client, group.id, req.user.id, 'system',
        `${u.name} joined the group`);
    } finally { client.release(); }

    res.json({ group, already_member: false });
  } catch (err) {
    logger.error({ err }, 'mewacho: join group');
    return apiError.serverError(res, 'Failed to join group');
  }
});

// ── GET /api/mewacho/groups/:id ──────────────────────────────────────────────
router.get('/groups/:id', requireAuth, async (req, res) => {
  try {
    const member = await isMember(req.params.id, req.user.id);
    if (!member) return apiError.notFound(res, 'Group not found');

    const [groupRes, membersRes, contribRes, activityRes, withdrawRes] = await Promise.all([
      pool.query(`
        SELECT g.*,
               COUNT(DISTINCT m.user_id)::int AS member_count,
               COALESCE(SUM(c.amount) FILTER (WHERE c.status='confirmed'),0) AS total_collected
        FROM mewacho_groups g
        LEFT JOIN mewacho_members m ON m.group_id=g.id
        LEFT JOIN mewacho_contributions c ON c.group_id=g.id
        WHERE g.id=$1 GROUP BY g.id`, [req.params.id]),
      pool.query(`
        SELECT mm.*, COALESCE(NULLIF(u.full_name,''), u.email) AS display_name,
               up.avatar_url
        FROM mewacho_members mm
        JOIN users u ON u.id=mm.user_id
        LEFT JOIN LATERAL (
          SELECT avatar_url FROM user_profiles WHERE user_id=mm.user_id
          ORDER BY updated_at DESC LIMIT 1
        ) up ON TRUE
        WHERE mm.group_id=$1 ORDER BY mm.joined_at`, [req.params.id]),
      pool.query(`
        SELECT c.*, COALESCE(NULLIF(u.full_name,''), u.email) AS display_name,
               up.avatar_url
        FROM mewacho_contributions c
        JOIN users u ON u.id=c.user_id
        LEFT JOIN LATERAL (
          SELECT avatar_url FROM user_profiles WHERE user_id=c.user_id
          ORDER BY updated_at DESC LIMIT 1
        ) up ON TRUE
        WHERE c.group_id=$1 AND (c.is_anonymous=false OR c.user_id=$2)
        ORDER BY c.created_at DESC`, [req.params.id, req.user.id]),
      pool.query(`
        SELECT a.*, COALESCE(NULLIF(u.full_name,''), u.email) AS display_name,
               up.avatar_url
        FROM mewacho_activity a
        LEFT JOIN users u ON u.id=a.user_id
        LEFT JOIN LATERAL (
          SELECT avatar_url FROM user_profiles WHERE user_id=a.user_id
          ORDER BY updated_at DESC LIMIT 1
        ) up ON TRUE
        WHERE a.group_id=$1 ORDER BY a.created_at ASC LIMIT 200`, [req.params.id]),
      pool.query(`
        SELECT w.*, COALESCE(NULLIF(u.full_name,''), u.email) AS requested_by_name
        FROM mewacho_withdrawals w
        JOIN users u ON u.id=w.requested_by
        WHERE w.group_id=$1 ORDER BY w.created_at DESC`, [req.params.id]),
    ]);

    res.json({
      group: groupRes.rows[0],
      members: membersRes.rows,
      contributions: contribRes.rows,
      activity: activityRes.rows,
      withdrawals: withdrawRes.rows,
      my_role: member.role,
    });
  } catch (err) {
    logger.error({ err }, 'mewacho: get group');
    return apiError.serverError(res, 'Failed to fetch group');
  }
});

// ── POST /api/mewacho/groups/:id/contribute — create Stripe session ──────────
router.post('/groups/:id/contribute', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

  const member = await isMember(req.params.id, req.user.id);
  if (!member) return apiError.notFound(res, 'Group not found');

  const { rows: [group] } = await pool.query(
    'SELECT * FROM mewacho_groups WHERE id=$1', [req.params.id]
  );
  if (group.status !== 'active') return apiError.validationError(res, 'Group is closed');

  const { amount, is_anonymous = false } = req.body;
  const amountEtb = parseFloat(amount);
  if (!amountEtb || amountEtb <= 0) return apiError.validationError(res, 'Valid amount required');

  const frontendUrl = getPrimaryFrontendUrl();
  const rate = parseFloat(process.env.STRIPE_ETB_TO_USD_RATE || '0.008');
  const amountUsd = Math.round(amountEtb * rate * 100); // cents

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [contrib] } = await client.query(
      `INSERT INTO mewacho_contributions
         (group_id, user_id, amount, payment_method, status, is_anonymous)
       VALUES ($1,$2,$3,'stripe','pending',$4) RETURNING *`,
      [group.id, req.user.id, amountEtb, is_anonymous]
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amountUsd,
          product_data: {
            name: `Contribution to "${group.name}"`,
            description: group.description || group.purpose,
          },
        },
        quantity: 1,
      }],
      metadata: {
        mewacho_group_id:   group.id,
        mewacho_contrib_id: contrib.id,
        user_id:            req.user.id,
        amount_etb:         String(amountEtb),
      },
      success_url: `${frontendUrl}/mewacho/${group.id}?payment=success`,
      cancel_url:  `${frontendUrl}/mewacho/${group.id}?payment=cancelled`,
    });

    await client.query(
      'UPDATE mewacho_contributions SET stripe_session_id=$1 WHERE id=$2',
      [session.id, contrib.id]
    );

    await client.query('COMMIT');
    res.json({ checkout_url: session.url, session_id: session.id, contribution_id: contrib.id });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'mewacho: create contribution session');
    return apiError.serverError(res, 'Failed to create payment session');
  } finally {
    client.release();
  }
});

// ── POST /api/mewacho/groups/:id/message ────────────────────────────────────
router.post('/groups/:id/message', requireAuth, async (req, res) => {
  const member = await isMember(req.params.id, req.user.id);
  if (!member) return apiError.notFound(res, 'Group not found');

  const { content } = req.body;
  if (!content?.trim()) return apiError.validationError(res, 'Message is required');

  const client = await pool.connect();
  try {
    const activity = await appendActivity(client, req.params.id, req.user.id, 'message', content.trim());
    const { rows: [u] } = await client.query(
      'SELECT COALESCE(NULLIF(full_name,\'\'), email) AS name FROM users WHERE id=$1',
      [req.user.id]
    );
    res.status(201).json({ ...activity, display_name: u.name });
  } finally {
    client.release();
  }
});

// ── POST /api/mewacho/groups/:id/withdraw ────────────────────────────────────
router.post('/groups/:id/withdraw', requireAuth, async (req, res) => {
  const member = await isMember(req.params.id, req.user.id);
  if (!member || member.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can request withdrawals' });
  }

  const { amount, destination_type = 'bank', destination_ref, note } = req.body;
  const amountNum = parseFloat(amount);
  if (!amountNum || amountNum <= 0) return apiError.validationError(res, 'Valid amount required');
  if (!destination_ref?.trim()) return apiError.validationError(res, 'destination_ref is required');

  try {
    const { rows: [totals] } = await pool.query(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE status='confirmed'),0) AS collected,
              COALESCE(SUM(amount) FILTER (WHERE status='completed'),0) AS withdrawn
       FROM (
         SELECT amount,'confirmed' AS status FROM mewacho_contributions WHERE group_id=$1 AND status='confirmed'
         UNION ALL
         SELECT amount,'completed' FROM mewacho_withdrawals WHERE group_id=$1 AND status='completed'
       ) t`,
      [req.params.id]
    );
    const available = parseFloat(totals.collected) - parseFloat(totals.withdrawn);
    if (amountNum > available) {
      return apiError.validationError(res, `Only ${available.toFixed(2)} ETB available`);
    }

    // Require approval if amount > 5000 ETB or there are multiple admins
    const { rows: admins } = await pool.query(
      `SELECT user_id FROM mewacho_members WHERE group_id=$1 AND role='admin'`,
      [req.params.id]
    );
    const requiresApproval = amountNum > 5000 || admins.length > 1;

    const { rows: [w] } = await pool.query(
      `INSERT INTO mewacho_withdrawals
         (group_id, requested_by, amount, destination_type, destination_ref, note, requires_approval,
          status, approved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.id, req.user.id, amountNum, destination_type,
       destination_ref.trim(), note || null, requiresApproval,
       requiresApproval ? 'pending' : 'approved',
       requiresApproval ? [] : [req.user.id]]
    );

    const { rows: [group] } = await pool.query('SELECT name FROM mewacho_groups WHERE id=$1', [req.params.id]);
    await notifyMembers(
      req.params.id, req.user.id,
      '💸 Withdrawal requested',
      `A withdrawal of ${amountNum} ETB was requested from "${group.name}"`,
      `/mewacho/${req.params.id}`
    );

    const client = await pool.connect();
    try {
      const { rows: [u] } = await client.query(
        'SELECT COALESCE(NULLIF(full_name,\'\'), email) AS name FROM users WHERE id=$1',
        [req.user.id]
      );
      await appendActivity(client, req.params.id, req.user.id, 'withdrawal',
        `${u.name} requested a withdrawal of ${amountNum} ETB`,
        { amount: amountNum, destination_type, requires_approval: requiresApproval });
    } finally { client.release(); }

    res.status(201).json(w);
  } catch (err) {
    logger.error({ err }, 'mewacho: create withdrawal');
    return apiError.serverError(res, 'Failed to create withdrawal request');
  }
});

// ── PUT /api/mewacho/withdrawals/:wid/approve ────────────────────────────────
router.put('/withdrawals/:wid/approve', requireAuth, async (req, res) => {
  try {
    const { rows: [w] } = await pool.query(
      'SELECT * FROM mewacho_withdrawals WHERE id=$1', [req.params.wid]
    );
    if (!w) return apiError.notFound(res, 'Withdrawal not found');

    const member = await isMember(w.group_id, req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can approve withdrawals' });
    }
    if (w.status !== 'pending') {
      return apiError.validationError(res, `Withdrawal is already ${w.status}`);
    }

    const approvedBy = [...(w.approved_by || [])];
    if (!approvedBy.includes(req.user.id)) approvedBy.push(req.user.id);

    const { rows: admins } = await pool.query(
      `SELECT user_id FROM mewacho_members WHERE group_id=$1 AND role='admin'`, [w.group_id]
    );
    const allApproved = admins.every(a => approvedBy.includes(a.user_id));
    const newStatus = allApproved ? 'approved' : 'pending';

    const { rows: [updated] } = await pool.query(
      `UPDATE mewacho_withdrawals SET approved_by=$1, status=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [approvedBy, newStatus, w.id]
    );

    res.json(updated);
  } catch (err) {
    logger.error({ err }, 'mewacho: approve withdrawal');
    return apiError.serverError(res, 'Failed to approve withdrawal');
  }
});

// ── PUT /api/mewacho/withdrawals/:wid/reject ─────────────────────────────────
router.put('/withdrawals/:wid/reject', requireAuth, async (req, res) => {
  try {
    const { rows: [w] } = await pool.query(
      'SELECT * FROM mewacho_withdrawals WHERE id=$1', [req.params.wid]
    );
    if (!w) return apiError.notFound(res, 'Withdrawal not found');

    const member = await isMember(w.group_id, req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can reject withdrawals' });
    }

    const { rows: [updated] } = await pool.query(
      `UPDATE mewacho_withdrawals SET status='rejected', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [w.id]
    );
    res.json(updated);
  } catch (err) {
    return apiError.serverError(res, 'Failed to reject withdrawal');
  }
});

// ── POST /api/mewacho/webhook — Stripe webhook ──────────────────────────────
// Register raw body parser in index.js before this route:
//   app.use('/api/mewacho/webhook', express.raw({ type: 'application/json' }));
router.post('/webhook', async (req, res) => {
  if (!stripe) return res.status(503).send('Stripe not configured');

  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_MEWACHO_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    logger.warn({ err: err.message }, 'mewacho webhook: invalid signature');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { mewacho_contrib_id, mewacho_group_id, user_id, amount_etb } = session.metadata || {};

    if (!mewacho_contrib_id) {
      return res.json({ received: true }); // not a Mewacho payment
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE mewacho_contributions SET status='confirmed' WHERE id=$1 AND status='pending'`,
        [mewacho_contrib_id]
      );

      const { rows: [u] } = await client.query(
        'SELECT COALESCE(NULLIF(full_name,\'\'), email) AS name FROM users WHERE id=$1',
        [user_id]
      );
      const { rows: [contrib] } = await client.query(
        'SELECT is_anonymous FROM mewacho_contributions WHERE id=$1', [mewacho_contrib_id]
      );
      const displayName = contrib?.is_anonymous ? 'Anonymous' : u?.name || 'Someone';

      await appendActivity(client, mewacho_group_id, user_id, 'contribution',
        `${displayName} contributed ${parseFloat(amount_etb).toLocaleString()} ETB via Stripe`,
        { amount: parseFloat(amount_etb), payment_method: 'stripe', is_anonymous: contrib?.is_anonymous });

      await client.query('COMMIT');

      const { rows: [group] } = await pool.query(
        'SELECT name FROM mewacho_groups WHERE id=$1', [mewacho_group_id]
      );
      await notifyMembers(
        mewacho_group_id, user_id,
        '💰 New contribution!',
        `${displayName} contributed ${parseFloat(amount_etb).toLocaleString()} ETB to "${group?.name}"`,
        `/mewacho/${mewacho_group_id}`
      );
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err }, 'mewacho webhook: failed to confirm contribution');
    } finally {
      client.release();
    }
  }

  res.json({ received: true });
});

module.exports = router;
