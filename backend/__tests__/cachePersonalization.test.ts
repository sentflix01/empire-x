import type { Request, Response, NextFunction } from 'express';
import { cacheMiddleware } from '../middleware/cache';

jest.mock('../lib/redis', () => ({
  getRedis: () => ({ isNoOp: true }),
}));

describe('personalized response cache boundaries', () => {
  it('varies browser and proxy caches by auth and real-mode state', async () => {
    const vary = jest.fn();
    const set = jest.fn();
    const next = jest.fn();
    const req = { method: 'GET', user: { id: 'user-1' }, query: {} } as unknown as Request;
    const res = { vary, set } as unknown as Response;

    await cacheMiddleware('personalized', 60, { varyByUser: true })(req, res, next as NextFunction);

    expect(vary).toHaveBeenCalledWith('X-Real-Only');
    expect(vary).toHaveBeenCalledWith('Authorization');
    expect(vary).toHaveBeenCalledWith('Cookie');
    expect(next).toHaveBeenCalled();
  });

  it('does not add user-specific vary headers to shared public cache responses', async () => {
    const vary = jest.fn();
    const next = jest.fn();
    const req = { method: 'GET', query: {} } as unknown as Request;
    const res = { vary } as unknown as Response;

    await cacheMiddleware('public', 60)(req, res, next as NextFunction);

    expect(vary).toHaveBeenCalledTimes(1);
    expect(vary).toHaveBeenCalledWith('X-Real-Only');
    expect(next).toHaveBeenCalled();
  });
});
