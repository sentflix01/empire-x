import type { Pool, PoolClient } from 'pg';
import type { QueryResultRow } from 'pg';

export interface InventoryLine {
  productId: string;
  quantity: number;
}

export class InventoryUnavailableError extends Error {
  constructor(productId: string) {
    super(`Insufficient or unavailable inventory for product ${productId}`);
    this.name = 'InventoryUnavailableError';
  }
}

/** Reserve every line in the caller's transaction, rolling back as a unit. */
export async function reserveOrderInventory(
  client: PoolClient,
  orderId: string,
  lines: InventoryLine[],
): Promise<void> {
  for (const line of lines) {
    const { rows } = await client.query(
      `UPDATE products
       SET stock=CASE WHEN stock IS NULL THEN NULL ELSE stock-$2 END,
           status=CASE WHEN stock=$2 THEN 'sold_out' ELSE status END,
           updated_at=NOW()
       WHERE id=$1 AND status='active' AND (stock IS NULL OR stock >= $2)
       RETURNING id`,
      [line.productId, line.quantity],
    );
    if (!rows.length) throw new InventoryUnavailableError(line.productId);
    await client.query(
      `INSERT INTO order_inventory_reservations(order_id,product_id,quantity,status)
       VALUES ($1,$2,$3,'reserved')`,
      [orderId, line.productId, line.quantity],
    );
  }
}

export async function changeReservationStateInTransaction(
  client: PoolClient,
  orderIds: string[],
  nextState: 'committed' | 'released',
): Promise<void> {
  if (!orderIds.length) return;
  const { rows } = await client.query<QueryResultRow>(
    `UPDATE order_inventory_reservations
     SET status=$2,updated_at=NOW()
     WHERE order_id=ANY($1::uuid[]) AND status='reserved'
     RETURNING product_id,quantity`,
    [orderIds, nextState],
  );
  if (nextState === 'released') {
    for (const row of rows as Array<{ product_id: string; quantity: number }>) {
      await client.query(
        `UPDATE products
         SET stock=CASE WHEN stock IS NULL THEN NULL ELSE stock+$2 END,
             status=CASE WHEN status='sold_out' AND stock=0 THEN 'active' ELSE status END,
             updated_at=NOW()
         WHERE id=$1`,
        [row.product_id, row.quantity],
      );
    }
  }
}

async function changeReservationState(pool: Pool, orderIds: string[], nextState: 'committed' | 'released'): Promise<void> {
  if (!orderIds.length) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await changeReservationStateInTransaction(client, orderIds, nextState);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export function commitOrderInventory(pool: Pool, orderIds: string[]): Promise<void> {
  return changeReservationState(pool, orderIds, 'committed');
}

export function releaseOrderInventory(pool: Pool, orderIds: string[]): Promise<void> {
  return changeReservationState(pool, orderIds, 'released');
}

/** Lock matching pending orders and move payment status plus reservation state atomically. */
export async function transitionPaymentOrders(
  pool: Pool,
  referenceColumn: 'stripe_session_id' | 'stripe_payment_intent_id' | 'chapa_tx_ref',
  reference: string,
  nextStatus: 'paid' | 'payment_failed',
  paymentIntentId?: string,
): Promise<QueryResultRow[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: pending } = await client.query<{ id: string }>(
      `SELECT id FROM orders WHERE ${referenceColumn}=$1 AND status='pending' FOR UPDATE`,
      [reference],
    );
    if (!pending.length) {
      await client.query('COMMIT');
      return [];
    }
    const ids = pending.map(row => row.id);
    const values: unknown[] = [ids];
    const paymentIntentSql = nextStatus === 'paid' && referenceColumn === 'stripe_session_id'
      ? ',stripe_payment_intent_id=COALESCE($2,stripe_payment_intent_id)'
      : '';
    if (paymentIntentSql) values.push(paymentIntentId ?? null);
    const { rows } = await client.query<QueryResultRow>(
      `UPDATE orders SET status='${nextStatus}',updated_at=NOW()${paymentIntentSql} WHERE id=ANY($1::uuid[]) AND status='pending' RETURNING *`,
      values,
    );
    await changeReservationStateInTransaction(client, rows.map(row => String(row.id)), nextStatus === 'paid' ? 'committed' : 'released');
    await client.query('COMMIT');
    return rows;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelOrderAndReleaseInventory(pool: Pool, orderId: string, currentStatus: string): Promise<QueryResultRow | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: locked } = await client.query<{ id: string }>(
      'SELECT id FROM orders WHERE id=$1 AND status=$2 FOR UPDATE',
      [orderId, currentStatus],
    );
    if (!locked.length) {
      await client.query('ROLLBACK');
      return null;
    }
    const { rows } = await client.query<QueryResultRow>(
      "UPDATE orders SET status='cancelled',updated_at=NOW() WHERE id=$1 AND status=$2 RETURNING *",
      [orderId, currentStatus],
    );
    await changeReservationStateInTransaction(client, [orderId], 'released');
    await client.query('COMMIT');
    return rows[0] ?? null;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

async function getOrderIds(pool: Pool, column: 'stripe_session_id' | 'stripe_payment_intent_id' | 'chapa_tx_ref', value: string): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM orders WHERE ${column}=$1`, [value]);
  return rows.map(row => row.id);
}

export async function commitInventoryForStripeSession(pool: Pool, sessionId: string): Promise<void> {
  await commitOrderInventory(pool, await getOrderIds(pool, 'stripe_session_id', sessionId));
}

export async function releaseInventoryForStripeSession(pool: Pool, sessionId: string): Promise<void> {
  await releaseOrderInventory(pool, await getOrderIds(pool, 'stripe_session_id', sessionId));
}

export async function releaseInventoryForStripePaymentIntent(pool: Pool, paymentIntentId: string): Promise<void> {
  await releaseOrderInventory(pool, await getOrderIds(pool, 'stripe_payment_intent_id', paymentIntentId));
}

export async function commitInventoryForChapaReference(pool: Pool, txRef: string): Promise<void> {
  await commitOrderInventory(pool, await getOrderIds(pool, 'chapa_tx_ref', txRef));
}

export async function releaseInventoryForChapaReference(pool: Pool, txRef: string): Promise<void> {
  await releaseOrderInventory(pool, await getOrderIds(pool, 'chapa_tx_ref', txRef));
}
