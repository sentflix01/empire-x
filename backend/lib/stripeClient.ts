import { getCurrentDatabaseEnvironment, runWithDatabaseEnvironment } from '../db/pool';

const clients = new Map<string, any>();

/** Select keys only from the verified database environment context. */
export function getStripeClient(environment: 'real' | 'demo' = getCurrentDatabaseEnvironment()): any | null {
  const key = environment === 'demo' ? process.env.STRIPE_TEST_SECRET_KEY : process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!clients.has(key)) clients.set(key, require('stripe')(key));
  return clients.get(key);
}

export function isStripeConfigured(): boolean {
  const key = getCurrentDatabaseEnvironment() === 'demo'
    ? process.env.STRIPE_TEST_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY;
  return Boolean(key);
}

/** Dynamic facade keeps existing call sites while selecting per request. */
export function stripeClientFacade(): any {
  return new Proxy({}, {
    get(_target, property) {
      const client = getStripeClient();
      if (!client) return undefined;
      return Reflect.get(client, property, client);
    },
  });
}

/** Verify a webhook with an environment-specific secret and run its handler
 * inside the matching database context. Webhooks do not carry browser cookies. */
export async function withVerifiedStripeWebhook<T>(
  rawBody: Buffer,
  signature: string | undefined,
  secrets: { real?: string; demo?: string },
  handler: (event: any, environment: 'real' | 'demo') => Promise<T>,
): Promise<T> {
  if (!signature) throw new Error('Missing Stripe signature');
  const candidates: Array<{ environment: 'real' | 'demo'; secret?: string }> = [
    { environment: 'demo', secret: secrets.demo },
    { environment: 'real', secret: secrets.real },
  ];
  let verified: { event: any; environment: 'real' | 'demo' } | undefined;
  for (const candidate of candidates) {
    if (!candidate.secret) continue;
    const client = getStripeClient(candidate.environment);
    if (!client) continue;
    try {
      verified = {
        event: client.webhooks.constructEvent(rawBody, signature, candidate.secret),
        environment: candidate.environment,
      };
      break;
    } catch { /* try the other configured environment secret */ }
  }
  if (!verified) throw new Error('Invalid Stripe webhook signature');
  return runWithDatabaseEnvironment({ environment: verified.environment }, () =>
    handler(verified!.event, verified!.environment),
  );
}
