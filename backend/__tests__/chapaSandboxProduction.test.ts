import express from 'express';
import request from 'supertest';
import pool from '../db/pool';

const mockPool = pool as unknown as { query: jest.Mock };
const previousNodeEnv = process.env.NODE_ENV;
const previousChapaSecret = process.env.CHAPA_SECRET_KEY;
let app: express.Express;

beforeAll(() => {
  process.env.NODE_ENV = 'production';
  process.env.CHAPA_SECRET_KEY = 'SANDBOX';
  app = express();
  // Load after setting the environment because orders.ts reads its Chapa key at startup.
  app.use('/api/orders', require('../routes/orders'));
  app.use('/api/wallet', require('../routes/wallet'));
});

afterAll(() => {
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
  if (previousChapaSecret === undefined) delete process.env.CHAPA_SECRET_KEY;
  else process.env.CHAPA_SECRET_KEY = previousChapaSecret;
});

describe('Chapa sandbox production guards', () => {
  beforeEach(() => mockPool.query.mockClear());

  it('does not mark a Chapa order paid using the sandbox verifier in production', async () => {
    const response = await request(app).get('/api/orders/chapa/verify/guessed-tx-ref');
    expect(response.status).toBe(404);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('does not credit a wallet using the sandbox verifier in production', async () => {
    const response = await request(app).get('/api/wallet/topup/chapa/verify/guessed-tx-ref');
    expect(response.status).toBe(404);
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});
