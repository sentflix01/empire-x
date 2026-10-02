jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
  webhooks: {
    constructEvent: (_body: Buffer, signature: string, secret: string) => {
      if (signature !== 'valid-signature') throw new Error('bad signature');
      if (secret === 'whsec_demo') return { id: 'evt_demo', mode: 'demo' };
      if (secret === 'whsec_real') return { id: 'evt_real', mode: 'real' };
      throw new Error('unknown secret');
    },
  },
})));
import { getCurrentDatabaseEnvironment, closeAllPools } from '../db/pool';
import { withVerifiedStripeWebhook } from '../lib/stripeClient';

describe('Stripe webhook database environment routing', () => {
  const keys = ['STRIPE_SECRET_KEY', 'STRIPE_TEST_SECRET_KEY'] as const;
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_unit_test';
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_unit_test';
  });

  afterAll(async () => {
    await closeAllPools();
    for (const key of keys) {
      const value = original[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test('demo signature runs the handler in the demo database context', async () => {
    const handler = jest.fn(async (_event, environment) => ({
      selected: environment,
      database: getCurrentDatabaseEnvironment(),
    }));

    const result = await withVerifiedStripeWebhook(
      Buffer.from('{}'),
      'valid-signature',
      { real: 'whsec_real', demo: 'whsec_demo' },
      handler,
    );

    expect(result).toEqual({ selected: 'demo', database: 'demo' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('missing or invalid signatures are rejected before the handler runs', async () => {
    const handler = jest.fn();

    await expect(withVerifiedStripeWebhook(Buffer.from('{}'), undefined, { demo: 'whsec_demo' }, handler))
      .rejects.toThrow('Missing Stripe signature');
    await expect(withVerifiedStripeWebhook(Buffer.from('{}'), 'bad', { demo: 'whsec_demo' }, handler))
      .rejects.toThrow('Invalid Stripe webhook signature');
    expect(handler).not.toHaveBeenCalled();
  });
});
