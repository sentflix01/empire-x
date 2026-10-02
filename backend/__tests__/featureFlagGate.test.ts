import type { NextFunction, Request, Response } from 'express';
import { isEnabled } from '../lib/featureFlags';
import { requireFeatureFlag } from '../middleware/featureFlag';

jest.mock('../lib/featureFlags', () => ({ isEnabled: jest.fn() }));

describe('payment feature flag middleware', () => {
  const enabledMock = jest.mocked(isEnabled);

  function invoke(userId = 'user-1') {
    const req = { user: { id: userId } } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    return { req, res, next, run: requireFeatureFlag('stripe_payments', 'Stripe payments are disabled')(req, res, next) };
  }

  beforeEach(() => enabledMock.mockReset());

  it('passes the user id to the flag and continues when enabled', async () => {
    enabledMock.mockResolvedValue(true);
    const { res, next, run } = invoke('buyer-7');
    await run;

    expect(enabledMock).toHaveBeenCalledWith('stripe_payments', 'buyer-7');
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns a service-unavailable response when disabled', async () => {
    enabledMock.mockResolvedValue(false);
    const { res, next, run } = invoke();
    await run;

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Stripe payments are disabled', code: 'FEATURE_DISABLED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('fails closed when flag resolution throws', async () => {
    enabledMock.mockRejectedValue(new Error('flag store unavailable'));
    const { res, next, run } = invoke();
    await run;

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Stripe payments are disabled', code: 'FEATURE_FLAG_UNAVAILABLE' });
    expect(next).not.toHaveBeenCalled();
  });
});
