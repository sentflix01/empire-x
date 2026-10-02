import express from 'express';
import request from 'supertest';
import pool from '../db/pool';
import returnsRouter from '../routes/returns';

jest.mock('../middleware/auth', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { user?: { id: string; role: string } }).user = {
      id: req.header('x-user-id') ?? 'buyer-1',
      role: req.header('x-user-role') ?? 'user',
    };
    next();
  },
}));
jest.mock('../socket', () => ({ emitNotification: jest.fn() }));
jest.mock('../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

const mockPool = pool as unknown as {
  query: jest.Mock;
  connect: jest.Mock;
};
const app = express();
app.use(express.json());
app.use('/api/returns', returnsRouter);

describe('return request API contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.query.mockResolvedValue({ rows: [] });
  });

  it('lists seller requests for the authenticated seller and includes the order amount', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'return-1', total_price: 45, currency: 'ETB' }] });
    const response = await request(app).get('/api/returns?role=seller').set('x-user-id', 'seller-1');
    expect(response.status).toBe(200);
    expect(mockPool.query.mock.calls[0][0]).toContain('WHERE o.seller_id=$1');
    expect(mockPool.query.mock.calls[0][1]).toEqual(['seller-1']);
  });

  it('creates a request using the migration columns and derives seller and refund cap from the order', async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'order-1', buyer_id: 'buyer-1', seller_id: 'seller-1', status: 'paid', total_price: '45', product_title: 'Item' }] })
      .mockResolvedValueOnce({ rows: [] }) // no pending request
      .mockResolvedValueOnce({ rows: [{ id: 'return-1', order_id: 'order-1', seller_id: 'seller-1', details: 'broken' }] })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    mockPool.connect.mockResolvedValueOnce(client);

    const response = await request(app).post('/api/returns').send({
      order_id: 'order-1', reason: 'Damaged', details: 'broken', refund_amount: 99999,
    });
    expect(response.status).toBe(201);
    const insert = client.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO return_requests'));
    expect(insert[0]).toContain('(order_id,buyer_id,seller_id,reason,details,refund_amount)');
    expect(insert[1]).toEqual(['order-1', 'buyer-1', 'seller-1', 'Damaged', 'broken', '45']);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rejects an agreed refund above the paid order amount without resolving the request', async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{
        id: 'return-1', order_id: 'order-1', status: 'pending', order_seller_id: 'seller-1',
        order_buyer_id: 'buyer-1', total_price: '45', currency: 'ETB', product_title: 'Item', refund_amount: '45',
      }] })
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK
    mockPool.connect.mockResolvedValueOnce(client);

    const response = await request(app).put('/api/returns/return-1').set('x-user-id', 'seller-1').send({
      status: 'approved', refund_amount: 46,
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/order total/);
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("SET status='approved'"))).toBe(false);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
