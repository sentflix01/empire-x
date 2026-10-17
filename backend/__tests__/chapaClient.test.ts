/** When ETB billing turns on, and how Chapa webhooks are authenticated. */
import crypto from 'crypto';
import { isChapaConfigured, isChapaSandbox, isValidWebhookSignature } from '../lib/chapaClient';

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });

describe('isChapaConfigured', () => {
  it('needs both the secret key and the webhook secret for real use', () => {
    process.env.CHAPA_SECRET_KEY = 'CHASECK_TEST-abc';
    delete process.env.CHAPA_WEBHOOK_SECRET;
    expect(isChapaConfigured()).toBe(false);
    process.env.CHAPA_WEBHOOK_SECRET = 'hash';
    expect(isChapaConfigured()).toBe(true);
  });

  it('allows the sandbox everywhere except production', () => {
    process.env.CHAPA_SECRET_KEY = 'SANDBOX';
    process.env.NODE_ENV = 'test';
    expect(isChapaSandbox()).toBe(true);
    expect(isChapaConfigured()).toBe(true);
    process.env.NODE_ENV = 'production';
    expect(isChapaSandbox()).toBe(false);
    expect(isChapaConfigured()).toBe(false);
  });
});

describe('isValidWebhookSignature', () => {
  const body = '{"tx_ref":"nbsub-1","status":"success"}';
  const sig = (secret: string) => crypto.createHmac('sha256', secret).update(body).digest('hex');

  it('accepts the HMAC of the raw body in either header', () => {
    process.env.CHAPA_WEBHOOK_SECRET = 'hash';
    expect(isValidWebhookSignature(body, { 'x-chapa-signature': sig('hash') })).toBe(true);
    expect(isValidWebhookSignature(Buffer.from(body), { 'chapa-signature': sig('hash') })).toBe(true);
  });

  it('rejects other secrets, other bodies and missing configuration', () => {
    process.env.CHAPA_WEBHOOK_SECRET = 'hash';
    expect(isValidWebhookSignature(body, { 'x-chapa-signature': sig('other') })).toBe(false);
    expect(isValidWebhookSignature(`${body} `, { 'x-chapa-signature': sig('hash') })).toBe(false);
    expect(isValidWebhookSignature(body, {})).toBe(false);
    delete process.env.CHAPA_WEBHOOK_SECRET;
    expect(isValidWebhookSignature(body, { 'x-chapa-signature': sig('hash') })).toBe(false);
  });
});

describe('isChapaTestMode', () => {
  it('is on for test keys and the sandbox, off for live keys', async () => {
    const { isChapaTestMode } = await import('../lib/chapaClient');
    process.env.CHAPA_SECRET_KEY = 'CHASECK_TEST-abc';
    expect(isChapaTestMode()).toBe(true);
    process.env.CHAPA_SECRET_KEY = 'SANDBOX';
    expect(isChapaTestMode()).toBe(true);
    process.env.CHAPA_SECRET_KEY = 'CHASECK-live';
    expect(isChapaTestMode()).toBe(false);
    delete process.env.CHAPA_SECRET_KEY;
    expect(isChapaTestMode()).toBe(false);
  });
});
