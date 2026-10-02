import {
  reserveOrderInventory,
  changeReservationStateInTransaction,
  InventoryUnavailableError,
} from '../services/orderInventory';
import type { PoolClient } from 'pg';
import type { Pool } from 'pg';
import { transitionPaymentOrders } from '../services/orderInventory';

describe('order inventory reservations', () => {
  it('deducts each requested quantity and records a reservation in the same transaction', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'product-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    await reserveOrderInventory({ query } as unknown as PoolClient, 'order-1', [
      { productId: 'product-1', quantity: 2 },
    ]);

    expect(query.mock.calls[0][0]).toContain("status='active'");
    expect(query.mock.calls[0][1]).toEqual(['product-1', 2]);
    expect(query.mock.calls[1][0]).toContain('INSERT INTO order_inventory_reservations');
    expect(query.mock.calls[1][1]).toEqual(['order-1', 'product-1', 2]);
  });

  it('does not write a reservation when conditional stock deduction loses a race', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    await expect(reserveOrderInventory(
      { query } as unknown as PoolClient,
      'order-1',
      [{ productId: 'product-1', quantity: 2 }],
    )).rejects.toBeInstanceOf(InventoryUnavailableError);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('restores released stock once and leaves committed inventory unchanged', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ product_id: 'product-1', quantity: 2 }] })
      .mockResolvedValue({ rows: [] });
    const client = { query } as unknown as PoolClient;

    await changeReservationStateInTransaction(client, ['order-1'], 'released');
    await changeReservationStateInTransaction(client, ['order-1'], 'committed');

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[1][0]).toContain('stock+$2');
    expect(query.mock.calls[1][1]).toEqual(['product-1', 2]);
  });

  it('commits through a state transition that only selects still-reserved rows', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    await changeReservationStateInTransaction({ query } as unknown as PoolClient, ['order-1'], 'committed');
    expect(query.mock.calls[0][0]).toContain("status='reserved'");
    expect(query.mock.calls[0][1]).toEqual([['order-1'], 'committed']);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('updates a payment and its reservation under one locked transaction', async () => {
    const calls: Array<{ sql: string; values?: unknown[] }> = [];
    const clientQuery = jest.fn(async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      if (sql.startsWith('SELECT id FROM orders')) return { rows: [{ id: 'order-1' }] };
      if (sql.startsWith('UPDATE orders')) return { rows: [{ id: 'order-1', status: 'paid' }] };
      return { rows: [] };
    });
    const release = jest.fn();
    const pool = { connect: jest.fn().mockResolvedValue({ query: clientQuery, release }) } as unknown as Pool;

    const updated = await transitionPaymentOrders(pool, 'stripe_session_id', 'cs-1', 'paid', 'pi-1');

    expect(updated).toEqual([{ id: 'order-1', status: 'paid' }]);
    expect(calls[1].sql).toContain("status='pending' FOR UPDATE");
    expect(calls[2].sql).toContain("status='paid'");
    expect(calls[2].values).toEqual([['order-1'], 'pi-1']);
    expect(calls[3].sql).toContain("status='reserved'");
    expect(calls.at(-1)?.sql).toBe('COMMIT');
    expect(release).toHaveBeenCalled();
  });
});
