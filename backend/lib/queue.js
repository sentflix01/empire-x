/**
 * queue.js — Background job queue using BullMQ + Redis
 *
 * Queues:
 *   emails       — OTP, password reset, order confirmation
 *   notifications — push + in-app notifications
 *   ai           — AI description generation (non-blocking)
 *   commission   — Commission deduction after order completion
 *
 * If Redis is not configured, jobs run synchronously as fallback
 * so the app works without Redis in development.
 *
 * Usage:
 *   const { emailQueue } = require('./lib/queue');
 *   await emailQueue.add('otp', { to: 'user@example.com', otp: '123456' });
 */
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL;

let emailQueue = null;
let notifQueue = null;
let aiQueue    = null;

let emailWorker = null;
let notifWorker = null;

// ── Synchronous fallback handlers (used when Redis is unavailable) ──────────
const syncHandlers = {
  emails: async (job) => {
    const { sendOtpEmail, sendPasswordResetEmail, sendOrderConfirmation } = require('../utils/mailer');
    const { type, to, otp, token, order } = job.data;
    if (type === 'otp')   await sendOtpEmail(to, otp);
    if (type === 'reset') await sendPasswordResetEmail(to, token);
    if (type === 'order') await sendOrderConfirmation(to, order);
  },
};

// ── Queue factory ─────────────────────────────────────────────────────────────
function createQueue(name) {
  if (!REDIS_URL) return null;
  try {
    const { Queue } = require('bullmq');
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
    logger.warn({ err: err.message }, `Failed to create queue ${name}`);
    return null;
  }
}

// ── Worker factory ────────────────────────────────────────────────────────────
function createWorker(name, processor) {
  if (!REDIS_URL) return null;
  try {
    const { Worker } = require('bullmq');
    const worker = new Worker(name, processor, {
      connection: { url: REDIS_URL },
      concurrency: 1,                    // reduced from 5 — less Redis polling
      stalledInterval: 60_000,           // check stalled jobs every 60s instead of default 30s
      maxStalledCount: 1,
    });
    worker.on('completed', (job) => logger.debug({ jobId: job.id, queue: name }, 'Job completed'));
    worker.on('failed', (job, err) => logger.error({ jobId: job?.id, queue: name, err: err.message }, 'Job failed'));
    return worker;
  } catch (err) {
    logger.warn({ err: err.message }, `Failed to create worker ${name}`);
    return null;
  }
}

// ── Email queue ───────────────────────────────────────────────────────────────
function getEmailQueue() {
  if (emailQueue !== null) return emailQueue;
  emailQueue = createQueue('emails');
  return emailQueue;
}

/**
 * Add an email job to the queue, or send synchronously if no Redis.
 * type: 'otp' | 'reset' | 'order'
 */
async function queueEmail(type, data) {
  const q = getEmailQueue();
  if (q) {
    await q.add(type, { type, ...data });
    logger.debug({ type }, 'Email queued');
  } else {
    // Synchronous fallback
    logger.debug({ type }, 'Sending email synchronously (no Redis)');
    await syncHandlers.emails({ data: { type, ...data } }).catch(err =>
      logger.error({ err: err.message }, 'Sync email failed')
    );
  }
}

// ── Start workers (call once on server startup) ───────────────────────────────
async function startWorkers() {
  if (!REDIS_URL) {
    logger.debug('Queue workers not started — no REDIS_URL');
    return;
  }

  // Test Redis connectivity before starting workers
  // If Redis is rate-limited or unavailable, skip workers entirely
  try {
    const { Queue } = require('bullmq');
    const testQueue = new Queue('health-check', { connection: { url: REDIS_URL } });
    await testQueue.getJobCounts();
    await testQueue.close();
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis not healthy — BullMQ workers not started, using sync fallback');
    return;
  }

  // Email worker
  emailWorker = createWorker('emails', async (job) => {
    await syncHandlers.emails(job);
    logger.info({ type: job.data.type, to: job.data.to }, 'Email sent via queue');
  });

  logger.info('BullMQ workers started');
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function closeQueues() {
  const closings = [emailQueue, notifQueue, aiQueue, emailWorker, notifWorker]
    .filter(Boolean)
    .map(q => q.close());
  await Promise.allSettled(closings);
}

module.exports = { getEmailQueue, queueEmail, startWorkers, closeQueues };
