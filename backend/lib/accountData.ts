/**
 * lib/accountData.ts — "Download my data" and "Delete my account".
 *
 * Owner decision (2026-10-15): deleting an account anonymizes it instead of
 * removing the users row. Personal content is deleted; orders, payments,
 * commissions and the wallet ledger stay for accounting and disputes with the
 * person's identity removed. See docs/decisions/account-deletion-decisions.md.
 */
import type { PoolClient } from 'pg';
import pool from '../db/pool';

type Queryable = Pick<PoolClient, 'query'>;

/** Tables whose rows are the user's own content: [table, owner column]. */
const EXPORT_TABLES: Array<[string, string]> = [
  ['user_profiles', 'user_id'],
  ['posts', 'author_id'],
  ['comments', 'author_id'],
  ['likes', 'user_id'],
  ['stories', 'user_id'],
  ['follows', 'follower_id'],
  ['saves', 'user_id'],
  ['wishlists', 'user_id'],
  ['price_alerts', 'user_id'],
  ['cart_items', 'user_id'],
  ['reviews', 'reviewer_id'],
  ['messages', 'sender_id'],
  ['notifications', 'user_id'],
  ['poll_votes', 'user_id'],
  ['point_transactions', 'user_id'],
  ['verification_requests', 'user_id'],
  ['businesses', 'owner_id'],
  ['showrooms', 'owner_id'],
  ['products', 'seller_id'],
  ['coupons', 'seller_id'],
  ['profile_partnerships', 'profile_owner_id'],
  ['return_requests', 'buyer_id'],
];

/** Content removed on deletion: [table, owner column]. Order matters only for readability. */
const DELETE_TABLES: Array<[string, string]> = [
  ['posts', 'author_id'],
  ['comments', 'author_id'],
  ['likes', 'user_id'],
  ['stories', 'user_id'],
  ['story_comments', 'author_id'],
  ['story_reactions', 'user_id'],
  ['story_views', 'viewer_id'],
  ['follows', 'follower_id'],
  ['follows', 'followed_id'],
  ['blocks', 'blocker_id'],
  ['blocks', 'blocked_id'],
  ['saves', 'user_id'],
  ['wishlists', 'user_id'],
  ['price_alerts', 'user_id'],
  ['cart_items', 'user_id'],
  ['push_subscriptions', 'user_id'],
  ['notifications', 'user_id'],
  ['poll_votes', 'user_id'],
  ['dismissed_suggestions', 'requester_id'],
  ['dismissed_suggestions', 'target_id'],
  ['verification_requests', 'user_id'],
  ['point_transactions', 'user_id'],
  ['live_locations', 'user_id'],
  ['messages', 'sender_id'],
  ['conversation_participants', 'user_id'],
  ['user_profiles', 'user_id'],
];

/** Orders in these states are finished; anything else blocks deletion. */
const SETTLED_ORDER_STATUSES = ['completed', 'cancelled', 'refunded', 'payment_failed'];

const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

async function tableExists(db: Queryable, table: string): Promise<boolean> {
  const { rows } = await db.query('SELECT to_regclass($1) IS NOT NULL AS ok', [`public.${table}`]);
  return Boolean(rows[0]?.ok);
}

function assertIdentifier(name: string): void {
  if (!SAFE_IDENTIFIER.test(name)) throw new Error(`Unsafe identifier: ${name}`);
}

export async function exportAccountData(userId: string): Promise<Record<string, unknown>> {
  const { rows: users } = await pool.query(
    `SELECT id, email, full_name, role, provider, is_verified, created_at, updated_at,
            referral_code, referred_by, telegram_notifications, last_seen, onboarding_mode
       FROM users WHERE id = $1`,
    [userId],
  );
  const data: Record<string, unknown> = { exported_at: new Date().toISOString(), account: users[0] ?? null };
  for (const [table, column] of EXPORT_TABLES) {
    assertIdentifier(table); assertIdentifier(column);
    if (!(await tableExists(pool, table))) continue;
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE ${column} = $1 LIMIT 10000`, [userId]);
    data[table] = rows;
  }
  const { rows: orders } = await pool.query(
    'SELECT * FROM orders WHERE buyer_id = $1 OR seller_id = $1 ORDER BY created_at DESC LIMIT 10000',
    [userId],
  );
  data.orders = orders;
  const { rows: wallet } = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  data.wallet = wallet[0] ?? null;
  data.wallet_transactions = wallet[0]
    ? (await pool.query('SELECT * FROM wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 10000', [wallet[0].id])).rows
    : [];
  return data;
}

export type DeletionBlock = { code: 'WALLET_BALANCE' | 'OPEN_ORDERS'; message: string };

/** Returns why the account cannot be deleted yet, or null when it can. */
export async function deletionBlocker(userId: string, db: Queryable = pool): Promise<DeletionBlock | null> {
  const { rows: wallet } = await db.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
  if (wallet[0] && parseFloat(wallet[0].balance as string) > 0) {
    return { code: 'WALLET_BALANCE', message: 'Withdraw your wallet balance before deleting your account.' };
  }
  const { rows: open } = await db.query(
    `SELECT COUNT(*)::int AS n FROM orders
      WHERE (buyer_id = $1 OR seller_id = $1) AND status <> ALL($2::text[])`,
    [userId, SETTLED_ORDER_STATUSES],
  );
  if ((open[0]?.n ?? 0) > 0) {
    return { code: 'OPEN_ORDERS', message: 'Finish or cancel your open orders before deleting your account.' };
  }
  return null;
}

/**
 * Anonymizes the account inside the caller's transaction. Keeps the users row
 * (orders, wallets and commissions reference it) but removes every identifier.
 */
export async function anonymizeAccount(db: Queryable, userId: string): Promise<void> {
  // Product ratings are recomputed for anything this user reviewed.
  const { rows: reviewed } = await db.query('SELECT DISTINCT product_id FROM reviews WHERE reviewer_id = $1', [userId]);
  await db.query('DELETE FROM reviews WHERE reviewer_id = $1', [userId]);
  for (const { product_id } of reviewed) {
    await db.query(
      `UPDATE products SET average_rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = $1), 0),
              review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1) WHERE id = $1`,
      [product_id],
    );
  }

  for (const [table, column] of DELETE_TABLES) {
    assertIdentifier(table); assertIdentifier(column);
    if (!(await tableExists(db, table))) continue;
    await db.query(`DELETE FROM ${table} WHERE ${column} = $1`, [userId]);
  }

  // Seller presence is unlisted, not deleted: past orders point at these rows.
  await db.query(`UPDATE products SET status = 'draft' WHERE seller_id = $1`, [userId]);
  await db.query(`UPDATE showrooms SET status = 'archived' WHERE owner_id = $1`, [userId]);
  await db.query('UPDATE coupons SET is_active = FALSE WHERE seller_id = $1', [userId]);
  await db.query(
    `UPDATE businesses SET business_contact_email = NULL, business_contact_phone = NULL, business_address = NULL
      WHERE owner_id = $1`,
    [userId],
  );
  await db.query(
    `UPDATE profile_partnerships SET status = 'terminated'
      WHERE (profile_owner_id = $1 OR business_owner_id = $1) AND status IN ('pending','active')`,
    [userId],
  );

  // Orders stay for accounting; the buyer's contact details do not.
  await db.query(
    `UPDATE orders SET buyer_name = NULL, buyer_phone = NULL, buyer_email = NULL, delivery_address = NULL, notes = NULL
      WHERE buyer_id = $1`,
    [userId],
  );

  await db.query(
    `UPDATE users SET
        email = 'deleted-' || id || '@deleted.invalid',
        password_hash = NULL, full_name = NULL, provider_id = NULL,
        otp_code = NULL, otp_expires = NULL, reset_token = NULL, reset_expires = NULL,
        referral_code = NULL, telegram_chat_id = NULL, telegram_notifications = FALSE,
        is_banned = TRUE, ban_reason = 'account_deleted', banned_at = NOW(),
        deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1`,
    [userId],
  );
}
