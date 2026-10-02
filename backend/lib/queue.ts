/**
 * lib/queue.ts — Background job queue using BullMQ + Redis
 *
 * Queues:  emails · notifications · ai · commission · webhookDelivery · usageRecalc
 *
 * If Redis is not configured every job runs synchronously as an inline
 * fallback — the app works fully without Redis in development.
 *
 * Usage:
 *   import { queueEmail, queueNotification, queueAiJob, queueWebhookDelivery, queueUsageRecalc } from './lib/queue';
 *   await queueEmail('otp', { to: 'user@example.com', otp: '123456' });
 */
import logger from './logger';
import { isRedisBypassed } from './redis';

const REDIS_URL = process.env.REDIS_URL;
// Producers and workers are separate roles so web instances can enqueue without
// each starting pollers. Both default off for a single-instance demo.
const QUEUE_PRODUCERS_ENABLED = process.env.ENABLE_QUEUE_PRODUCERS === 'true';
const QUEUE_WORKERS_ENABLED = process.env.ENABLE_QUEUE_WORKERS === 'true';

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmailJobType = 'otp' | 'reset' | 'order';

export interface EmailJobData {
  type: EmailJobType;
  to: string;
  otp?: string;
  token?: string;
  order?: Record<string, unknown>;
}

export interface NotificationJobData {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  type?: string;
}

export interface AiJobData {
  prompt: string;
  opts?: Record<string, unknown>;
  callbackUrl?: string;
}

/** Data for webhook delivery job */
export interface WebhookDeliveryJobData {
  webhookId: string;
  businessId: string;
  event: string;
  payload: Record<string, unknown>;
  attemptNumber: number;
}

/** Data for usage recalculation job */
export interface UsageRecalcJobData {
  businessId: string;
  triggerEvent: 'subscription_activated' | 'subscription_cancelled' | 'tier_changed';
}

// ── Queue instances (lazy init) ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let emailQueue: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let notifQueue: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let aiQueue:    any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webhookDeliveryQueue: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let usageRecalcQueue: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let emailWorker: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let notifWorker: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webhookDeliveryWorker: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let usageRecalcWorker: any = null;

// ── Synchronous fallback handlers ─────────────────────────────────────────────

const syncHandlers = {
  emails: async (job: { data: EmailJobData }): Promise<void> => {
    const { sendOtpEmail, sendPasswordResetEmail, sendOrderConfirmation } =
      require('../utils/mailer') as typeof import('../utils/mailer');
    const { type, to, otp, token, order } = job.data;
    if (type === 'otp'   && otp)   await sendOtpEmail(to, otp);
    if (type === 'reset' && token) await sendPasswordResetEmail(to, token);
    if (type === 'order' && order) await sendOrderConfirmation(to, order as unknown as Parameters<typeof sendOrderConfirmation>[1]);
  },
};

// ── Factory helpers ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createQueue(name: string): any {
  if (!REDIS_URL || !QUEUE_PRODUCERS_ENABLED) return null;
  try {
    const { Queue } = require('bullmq') as typeof import('bullmq');
    return new Queue(name, {
      connection: { url: REDIS_URL },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        // Keep fewer completed/failed records in Redis — each stored record is
        // a Redis hash that also triggers housekeeping commands on add/complete.
        removeOnComplete: 20,
        removeOnFail: 10,
      },
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, `Failed to create queue ${name}`);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createWorker(name: string, processor: (job: any) => Promise<void>): any {
  if (!REDIS_URL || !QUEUE_WORKERS_ENABLED) return null;
  try {
    const { Worker } = require('bullmq') as typeof import('bullmq');
    const worker = new Worker(name, processor, {
      connection: { url: REDIS_URL },
      concurrency: 1,
      // How often workers check for stalled jobs. Default 30s generates a
      // steady stream of Redis commands even when queues are empty.
      // 5 minutes is safe: jobs only stall when a worker crashes mid-job,
      // and a 5-minute detection window is fine for background tasks.
      stalledInterval: 300_000,
      maxStalledCount: 1,
      // How long an idle worker waits between polling for new jobs (ms).
      // Default is 5s, meaning ~12 Redis polls/minute per worker just for
      // "is there anything to do?". 30s cuts that to 2 polls/minute.
      drainDelay: 30,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worker.on('completed', (job: any) => logger.debug({ jobId: job.id, queue: name }, 'Job completed'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worker.on('failed', (job: any, err: Error) => logger.error({ jobId: job?.id, queue: name, err: err.message }, 'Job failed'));
    return worker;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, `Failed to create worker ${name}`);
    return null;
  }
}

// ── Queue accessors ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEmailQueue(): any { return emailQueue ??= createQueue('emails'); }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNotifQueue(): any { return notifQueue ??= createQueue('notifications'); }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAiQueue(): any    { return aiQueue    ??= createQueue('ai'); }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getWebhookDeliveryQueue(): any { return webhookDeliveryQueue ??= createQueue('webhookDelivery'); }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUsageRecalcQueue(): any { return usageRecalcQueue ??= createQueue('usageRecalc'); }

// ── Email ─────────────────────────────────────────────────────────────────────

export async function queueEmail(type: EmailJobType, data: Omit<EmailJobData, 'type'>): Promise<void> {
  const q = isRedisBypassed() ? null : getEmailQueue();
  const payload: EmailJobData = { type, ...data };
  if (q) {
    try {
      await q.add(type, payload);
      logger.debug({ type }, 'Email queued');
      return;
    } catch (err) {
      logger.warn({ err: (err as Error).message, type }, 'Queue unavailable — sending email synchronously');
    }
  }
  await syncHandlers.emails({ data: payload }).catch((e: Error) =>
    logger.error({ err: e.message }, 'Sync email failed')
  );
}

// ── Notification ──────────────────────────────────────────────────────────────

export async function queueNotification(data: NotificationJobData): Promise<void> {
  const q = isRedisBypassed() ? null : getNotifQueue();

  const send = async (): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pool = require('../db/pool') as import('pg').Pool;
    const { emitNotification } = require('../socket') as typeof import('../socket');
    const { sendPushToUser } = require('../routes/push') as { sendPushToUser: (uid: string, title: string, body: string, link: string) => Promise<void> };
    const { userId, title, body = '', link = '/notifications', type = 'info' } = data;

    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, title, body, link],
    );
    const notif = rows[0] as Record<string, unknown>;
    emitNotification(userId, notif);
    sendPushToUser(userId, title, body, link).catch(() => undefined);
  };

  if (q) {
    try {
      await q.add('send', data);
      logger.debug({ userId: data.userId }, 'Notification queued');
      return;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Notif queue unavailable — sending synchronously');
    }
  }
  await send().catch((e: Error) => logger.error({ err: e.message }, 'Sync notification failed'));
}

// ── AI ────────────────────────────────────────────────────────────────────────

export async function queueAiJob(data: AiJobData): Promise<string | null> {
  const q = isRedisBypassed() ? null : getAiQueue();
  if (q) {
    try {
      await q.add('generate', data);
      logger.debug({ promptLength: data.prompt?.length }, 'AI job queued');
      return null;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'AI queue unavailable — running synchronously');
    }
  }
  try {
    const ai = require('./ai') as typeof import('./ai');
    return await ai.complete(data.prompt, (data.opts ?? {}) as Parameters<typeof ai.complete>[1]);
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'Sync AI job failed');
    return null;
  }
}

// ── Webhook Delivery ──────────────────────────────────────────────────────────

/**
 * Queue a webhook delivery job with automatic retry and HMAC signing.
 * @param webhookId - The webhook ID from business_webhooks table
 * @param businessId - The business ID for context
 * @param event - The event type (e.g., 'order.created', 'payment.completed')
 * @param payload - The webhook payload to deliver
 */
export async function queueWebhookDelivery(
  webhookId: string,
  businessId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const q = isRedisBypassed() ? null : getWebhookDeliveryQueue();
  const jobData: WebhookDeliveryJobData = {
    webhookId,
    businessId,
    event,
    payload,
    attemptNumber: 1,
  };
  if (q) {
    try {
      await q.add('deliver', jobData, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 }, // 5s, 10s, 20s, 40s, 80s
        removeOnComplete: 100,
        removeOnFail: 50,
      });
      logger.debug({ webhookId, event }, 'Webhook delivery queued');
      return;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Webhook delivery queue unavailable');
    }
  }
  // Sync fallback - attempt delivery immediately
  await deliverWebhook(webhookId, businessId, event, payload, 1).catch((e) =>
    logger.error({ err: e.message }, 'Sync webhook delivery failed'),
  );
}

/**
 * Deliver a webhook with HMAC-SHA256 signature.
 * Called by the worker or sync fallback.
 */
async function deliverWebhook(
  webhookId: string,
  businessId: string,
  event: string,
  payload: Record<string, unknown>,
  attemptNumber: number,
): Promise<void> {
  const pool = require('../db/pool') as import('pg').Pool;
  const { signWebhookPayload } = require('../routes/businessWebhooks') as typeof import('../routes/businessWebhooks');

  // Fetch webhook details
  const { rows } = await pool.query(
    'SELECT url, secret, events, is_enabled FROM business_webhooks WHERE id = $1 AND business_id = $2',
    [webhookId, businessId],
  );
  if (!rows.length) {
    logger.warn({ webhookId, businessId }, 'Webhook not found for delivery');
    return;
  }
  const webhook = rows[0] as { url: string; secret: string; events: string[]; is_enabled: boolean };
  if (!webhook.is_enabled || !webhook.events.includes(event)) {
    logger.debug({ webhookId, event }, 'Webhook disabled or event not subscribed');
    return;
  }

  const payloadStr = JSON.stringify(payload);
  const signature = require('crypto').createHmac('sha256', webhook.secret).update(payloadStr).digest('hex');

  try {
    // Revalidate at delivery time: persisted URLs may predate URL validation,
    // and DNS can change between webhook creation and this outbound request.
    const { validateUrl } = require('../services/ssrfValidator') as typeof import('../services/ssrfValidator');
    const urlCheck = await validateUrl(webhook.url);
    if (!urlCheck.ok) {
      logger.warn({ webhookId, reason: urlCheck.error }, 'Webhook delivery blocked by URL safety policy');
      return;
    }
    const signal = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }).timeout?.(10_000);
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nodbusiness-Signature': signature,
        'X-Nodbusiness-Event': event,
        'X-Nodbusiness-Delivery': webhookId,
        'User-Agent': 'Nodbusiness-Webhook/1.0',
      },
      body: payloadStr,
      redirect: 'error',
      ...(signal ? { signal } : {}),
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
    }
    logger.info({ webhookId, event, attempt: attemptNumber }, 'Webhook delivered successfully');
  } catch (err) {
    logger.warn({ err: (err as Error).message, webhookId, attempt: attemptNumber }, 'Webhook delivery failed');
    throw err; // Re-throw to trigger BullMQ retry
  }
}

/**
 * Queue a usage recalculation job after subscription changes.
 * Triggers recalculation of product counts, storage usage, etc.
 */
export async function queueUsageRecalc(
  businessId: string,
  triggerEvent: 'subscription_activated' | 'subscription_cancelled' | 'tier_changed',
): Promise<void> {
  const q = isRedisBypassed() ? null : getUsageRecalcQueue();
  const jobData: UsageRecalcJobData = { businessId, triggerEvent };
  if (q) {
    try {
      await q.add('recalc', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      });
      logger.debug({ businessId, triggerEvent }, 'Usage recalc queued');
      return;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Usage recalc queue unavailable');
    }
  }
  // Sync fallback
  await recalcUsage(businessId).catch((e) =>
    logger.error({ err: e.message }, 'Sync usage recalc failed'),
  );
}

/**
 * Recalculate business usage metrics (product count, storage, etc.)
 * Called after subscription changes.
 */
async function recalcUsage(businessId: string): Promise<void> {
  const pool = require('../db/pool') as import('pg').Pool;
  await pool.query(
    `UPDATE business_subscriptions SET
       product_count = (SELECT COUNT(*) FROM products WHERE business_id = $1 AND status != 'draft'),
       storage_used_bytes = (SELECT COALESCE(SUM(octet_length(images::text) + octet_length(description) + 100), 0)
                             FROM products WHERE business_id = $1)
     WHERE business_id = $1`,
    [businessId],
  );
  logger.debug({ businessId }, 'Usage recalculated');
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export async function startWorkers(): Promise<void> {
  if (!QUEUE_WORKERS_ENABLED) {
    logger.info('Queue workers disabled — this process will not poll Redis');
    return;
  }

  if (!REDIS_URL) {
    logger.debug('Queue workers not started — no REDIS_URL');
    return;
  }

  try {
    // Verify Redis is reachable with a single PING — avoids creating a
    // bull:health-checkmeta key that wastes Redis commands on every startup.
    const { Redis: IORedis } = require('ioredis') as typeof import('ioredis');
    const testClient = new IORedis(REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
    await testClient.connect();
    await testClient.ping();
    await testClient.quit();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Redis not healthy — BullMQ workers not started, using sync fallback');
    return;
  }

  // Email worker
  emailWorker = createWorker('emails', async (job: { data: EmailJobData }) => {
    await syncHandlers.emails(job);
    logger.info({ type: job.data.type, to: job.data.to }, 'Email sent via queue');
  });

  // Notification worker
  notifWorker = createWorker('notifications', async (job: { data: NotificationJobData }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pool = require('../db/pool') as import('pg').Pool;
    const { emitNotification } = require('../socket') as typeof import('../socket');
    const { sendPushToUser } = require('../routes/push') as { sendPushToUser: (uid: string, title: string, body: string, link: string) => Promise<void> };
    const { userId, title, body = '', link = '/notifications', type = 'info' } = job.data;
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, title, body, link],
    );
    const notif = rows[0] as Record<string, unknown>;
    emitNotification(userId, notif);
    sendPushToUser(userId, title, body, link).catch(() => undefined);
    logger.debug({ userId, title }, 'Notification sent via queue');
  });

  // Webhook Delivery worker
  webhookDeliveryWorker = createWorker('webhookDelivery', async (job: { data: WebhookDeliveryJobData }) => {
    await deliverWebhook(
      job.data.webhookId,
      job.data.businessId,
      job.data.event,
      job.data.payload,
      job.data.attemptNumber,
    );
    logger.info({ webhookId: job.data.webhookId, event: job.data.event, attempt: job.data.attemptNumber }, 'Webhook delivered via queue');
  });

  // Usage Recalc worker
  usageRecalcWorker = createWorker('usageRecalc', async (job: { data: UsageRecalcJobData }) => {
    await recalcUsage(job.data.businessId);
    logger.info({ businessId: job.data.businessId, trigger: job.data.triggerEvent }, 'Usage recalculated via queue');
  });

  logger.info('BullMQ workers started (emails, notifications, webhookDelivery, usageRecalc)');
}

export async function closeQueues(): Promise<void> {
  const closers = [emailQueue, notifQueue, aiQueue, webhookDeliveryQueue, usageRecalcQueue, emailWorker, notifWorker, webhookDeliveryWorker, usageRecalcWorker]
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((q: any) => q.close().catch(() => undefined));
  await Promise.all(closers);
}

module.exports = {
  queueEmail,
  queueNotification,
  queueAiJob,
  queueWebhookDelivery,
  queueUsageRecalc,
  startWorkers,
  closeQueues,
};
