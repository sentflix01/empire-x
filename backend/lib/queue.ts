/**
 * lib/queue.ts — Background job queue using BullMQ + Redis
 *
 * Queues:  emails · notifications · ai · commission
 *
 * If Redis is not configured every job runs synchronously as an inline
 * fallback — the app works fully without Redis in development.
 *
 * Usage:
 *   import { queueEmail, queueNotification, queueAiJob } from './lib/queue';
 *   await queueEmail('otp', { to: 'user@example.com', otp: '123456' });
 */
import logger from './logger';

const REDIS_URL = process.env.REDIS_URL;

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

// ── Queue instances (lazy init) ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let emailQueue: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let notifQueue: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let aiQueue:    any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let emailWorker: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let notifWorker: any = null;

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
  if (!REDIS_URL) return null;
  try {
    const { Queue } = require('bullmq') as typeof import('bullmq');
    return new Queue(name, {
      connection: { url: REDIS_URL },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, `Failed to create queue ${name}`);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createWorker(name: string, processor: (job: any) => Promise<void>): any {
  if (!REDIS_URL) return null;
  try {
    const { Worker } = require('bullmq') as typeof import('bullmq');
    const worker = new Worker(name, processor, {
      connection: { url: REDIS_URL },
      concurrency: 1,
      stalledInterval: 60_000,
      maxStalledCount: 1,
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

// ── Email ─────────────────────────────────────────────────────────────────────

export async function queueEmail(type: EmailJobType, data: Omit<EmailJobData, 'type'>): Promise<void> {
  const q = getEmailQueue();
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
  const q = getNotifQueue();

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
  const q = getAiQueue();
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

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export async function startWorkers(): Promise<void> {
  if (!REDIS_URL) {
    logger.debug('Queue workers not started — no REDIS_URL');
    return;
  }
  try {
    const { Queue } = require('bullmq') as typeof import('bullmq');
    const testQ = new Queue('health-check', { connection: { url: REDIS_URL } });
    await testQ.getJobCounts();
    await testQ.close();
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

  logger.info('BullMQ workers started (emails, notifications)');
}

export async function closeQueues(): Promise<void> {
  const closers = [emailQueue, notifQueue, aiQueue, emailWorker, notifWorker]
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((q: any) => q.close().catch(() => undefined));
  await Promise.all(closers);
}

module.exports = { queueEmail, queueNotification, queueAiJob, startWorkers, closeQueues };
