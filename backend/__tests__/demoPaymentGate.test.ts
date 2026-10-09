import type { NextFunction, Request, Response } from 'express';
import { requireIsolatedPaymentEnvironment } from '../middleware/demoEnvironment';

describe('Demo workspace payment gate', () => {
  function invoke(user: Request['user'], demoSession?: Request['demoSession']) {
    const req = { user, demoSession } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    requireIsolatedPaymentEnvironment(req, res, next);
    return { res, next };
  }

  it('blocks provider payment and withdrawal operations from a shared Demo identity', () => {
    const { res, next } = invoke({
      id: 'shared-demo', email: 'test@nodbusiness.app', role: 'user', is_banned: false, is_demo: true,
    });

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DEMO_PAYMENTS_UNAVAILABLE' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks provider payment and withdrawal operations from an isolated Demo workspace', () => {
    const { res, next } = invoke(
      { id: 'sandbox-user', email: 'sandbox@nodbusiness.test', role: 'user', is_banned: false, is_demo: true },
      { id: 'sandbox-session', userId: 'sandbox-user', expiresAt: new Date(Date.now() + 60_000) },
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DEMO_PAYMENTS_UNAVAILABLE' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a real account', () => {
    const { res, next } = invoke({
      id: 'real-user', email: 'user@example.test', role: 'user', is_banned: false, is_demo: false,
    });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
