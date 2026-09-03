/**
 * index.ts — Nodbusiness API server entry point
 *
 * Middleware order matters — do not reorder without understanding each layer:
 *   1. Sentry (must be first to capture all errors)
 *   2. Compression
 *   3. ETag / Vary
 *   4. Response time header
 *   5. Real-mode filter
 *   6. Request ID / HTTP logger / API version
 *   7. Env check
 *   8. Security (Helmet, header strip)
 *   9. CORS
 *   10. Rate limiting (Redis-backed in production)
 *   11. Body parsing / Cookie parser
 *   12. Static files
 *   13. Health check
 *   14. Route modules
 *   15. Sentry error handler
 *   16. Global error handler
 *   17. 404 catch-all
 */
import 'dotenv/config';

// ── Sentry core (MUST be before ANY other imports, especially express) ──────────
import { initSentryCore } from './lib/sentry';
initSentryCore();

import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import type { Redis as RedisClient } from 'ioredis';

import { initSocket } from './socket';
import logger from './lib/logger';
import { startWorkers, closeQueues } from './lib/queue';
import { attachSentryToApp, getSentryErrorHandler } from './lib/sentry';
import { errorMiddleware, installProcessHandlers } from './lib/errorCollector';
import { getRedis, cached } from './lib/redis';
import { parseFrontendUrls } from './lib/frontendUrl';
import { isConfigured as aiIsConfigured, provider as aiProvider } from './lib/ai';
import requestId from './middleware/requestId';
import httpLogger from './middleware/httpLogger';
import apiVersion from './middleware/apiVersion';
import responseTime from './middleware/responseTime';
import { realModeMiddleware } from './middleware/realMode';
import { requireAuth, requireAdmin } from './middleware/auth';
import { activeStorageProvider, isSupabaseConfigured } from './middleware/upload';
import pool from './db/pool';
import * as apiError from './lib/apiError';

// ── App setup ─────────────────────────────────────────────────────────────────

const app = express();
app.set('trust proxy', 1); // trust Railway / Render load-balancer → req.ip = real end-user IP
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ── Sentry (attach to Express app) ──────────────────────────────────────────────
attachSentryToApp(app);

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());
app.set('etag', 'strong');

// ── Response time / Vary ──────────────────────────────────────────────────────
app.use(responseTime);
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.set('Vary', 'Accept-Encoding');
  next();
});

// ── COOP relaxation for Google OAuth popup communication ───────────────────────
// Google Identity Services needs cross-origin popup communication.
// COOP: same-origin-allow-popups allows the popup to communicate with opener.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/auth/google') || req.path.startsWith('/api/auth/refresh')) {
    res.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  }
  next();
});

// ── Real-mode filter ──────────────────────────────────────────────────────────
app.use(realModeMiddleware);

// ── Request ID / HTTP access log / API version ────────────────────────────────
app.use(requestId);
app.use(httpLogger);
app.use(apiVersion);

// ── Startup environment check ─────────────────────────────────────────────────
function checkEnv(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing  = required.filter((k) => !process.env[k]);
  if (missing.length) {
    logger.error(`\n❌  Missing required env vars: ${missing.join(', ')}`);
    logger.error('   Copy backend/.env.example to backend/.env and fill in the values.\n');
    process.exit(1);
  }

  const warnings: string[] = [];
  const smtp = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS];
  if (!process.env.RESEND_API_KEY && !smtp.every(Boolean)) {
    // Only warn in dev — email being console-only is expected in production staging
    if (process.env.NODE_ENV !== 'production') {
      warnings.push('Email (RESEND_API_KEY or SMTP_HOST) — OTP emails will only print to console');
    }
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('Stripe (STRIPE_SECRET_KEY) — payments will not work');
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    if (process.env.NODE_ENV === 'production') {
      // Hard error in production: Google Sign-In will silently return 503 for
      // every login attempt without this. Fail loudly at startup instead.
      logger.error('\n❌  GOOGLE_CLIENT_ID is not set in production.');
      logger.error('   Google Sign-In will not work. Set it in your Render environment variables.');
      logger.error('   Google Cloud Console → APIs & Credentials → OAuth 2.0 Client IDs → copy the Web client ID.\n');
      process.exit(1);
    }
    warnings.push('Google OAuth (GOOGLE_CLIENT_ID) — Google sign-in disabled');
  }
  // OTP_SALT is recommended in production but not fatal — omit from prod warnings
  // to keep startup logs clean.
  const r2  = ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME','R2_PUBLIC_URL'];
  const sup = ['SUPABASE_URL','SUPABASE_STORAGE_KEY','SUPABASE_BUCKET'];
  if (r2.some((k) => !process.env[k]) && sup.some((k) => !process.env[k])) {
    const storageMsg = 'File storage — set Supabase or R2 env vars. Files currently saved to local disk and will be lost on redeploy.';
    if (process.env.NODE_ENV === 'production') {
      // Hard error in production: local disk uploads are silently lost on
      // every redeploy. Operators must configure cloud storage before launch.
      logger.error(`\n❌  ${storageMsg}`);
      logger.error('   Set R2_* (Cloudflare) or SUPABASE_URL + SUPABASE_STORAGE_KEY + SUPABASE_BUCKET.\n');
      process.exit(1);
    }
    warnings.push(storageMsg);
  }
  if (warnings.length && process.env.NODE_ENV === 'production') {
    logger.warn('\n⚠️  Production warnings:');
    warnings.forEach((w) => logger.warn(`   • ${w}`));
    logger.warn('');
  } else if (warnings.length) {
    logger.info('\n💡 Dev mode — some services not configured (normal for local dev):');
    warnings.forEach((w) => logger.info(`   • ${w}`));
    logger.info('');
  }
}
checkEnv();

function emailServiceStatus(): string {
  if (process.env.RESEND_API_KEY) return 'resend';
  const smtp = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS];
  if (smtp.every(Boolean)) return 'smtp';
  if (smtp.some(Boolean)) return 'misconfigured';
  return 'console';
}

// ── Security headers ──────────────────────────────────────────────────────────
app.disable('x-powered-by');

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard:     { action: 'deny' },
  hsts:           process.env.NODE_ENV === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  noSniff:        true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc:             ["'none'"],
      scriptSrc:              ["'none'"],
      styleSrc:               ["'none'"],
      imgSrc:                 ["'none'"],
      connectSrc:             ["'self'"],
      fontSrc:                ["'none'"],
      objectSrc:              ["'none'"],
      mediaSrc:               ["'none'"],
      frameSrc:               ["'none'"],
      frameAncestors:         ["'none'"],
      formAction:             ["'self'"],
      baseUri:                ["'none'"],
      upgradeInsecureRequests: [],
    },
  } : false,
}));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.removeHeader('Server');
  res.removeHeader('X-AspNet-Version');
  res.removeHeader('X-AspNetMvc-Version');
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = parseFrontendUrls();
// Always include the production Vercel domain as a fallback
const PROD_FRONTEND = 'https://nodbusiness.vercel.app';
if (!allowedOrigins.includes(PROD_FRONTEND)) allowedOrigins.push(PROD_FRONTEND);
if (process.env.NODE_ENV !== 'production') {
  if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');
}

const wildcardOrigins = allowedOrigins
  .filter((o) => o.includes('*'))
  .map((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')}$`));
const exactOrigins = allowedOrigins.filter((o) => !o.includes('*'));

app.use(cors({
  origin: (origin: string | undefined, cb: (e: Error | null, ok?: boolean) => void) => {
    if (!origin) return cb(null, true);
    if (exactOrigins.includes(origin)) return cb(null, true);
    if (wildcardOrigins.some((rx) => rx.test(origin))) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
}));

// ── Rate limiting (Redis-backed in production) ────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

function buildRateLimitStore(): unknown {
  if (isDev) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RedisStore } = require('rate-limit-redis') as { RedisStore: new (opts: object) => object };
    const redisClient = getRedis();
    if (redisClient.isNoOp) return undefined;
    return new RedisStore({
      sendCommand: (...args: unknown[]) => (redisClient as RedisClient).call(...(args as [string, ...string[]])),
      prefix: 'rl:',
    }) as unknown;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'rate-limit-redis unavailable — using in-memory store');
    return undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rlOpts = (max: number) => ({ windowMs: 15 * 60 * 1000, max, skip: () => isDev, store: buildRateLimitStore() as any, message: { error: 'Too many requests, try again later' }, standardHeaders: true, legacyHeaders: false });

app.use('/api/', rateLimit(rlOpts(500)));
app.use('/api/auth/login',            rateLimit(rlOpts(20)));
app.use('/api/auth/register',         rateLimit(rlOpts(20)));
app.use('/api/auth/google',           rateLimit(rlOpts(20)));
app.use('/api/auth/verify-otp',       rateLimit(rlOpts(10)));
app.use('/api/auth/resend-otp',       rateLimit(rlOpts(5)));
app.use('/api/auth/forgot-password',  rateLimit(rlOpts(5)));
app.use('/api/auth/reset-password',   rateLimit(rlOpts(10)));
app.use('/api/auth/change-password',  rateLimit(rlOpts(10)));
app.use('/api/auth/refresh',          rateLimit(rlOpts(60)));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use('/api/orders/webhook',        express.raw({ type: 'application/json' }));
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR ?? 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  const redis = getRedis();
  let redisStatus = 'not configured';
  if (!redis.isNoOp) {
    try { await (redis as RedisClient).get('health-check'); redisStatus = 'connected'; }
    catch { redisStatus = 'error'; }
  }
  let databaseStatus = 'disconnected';
  try { await pool.query('SELECT 1'); databaseStatus = 'connected'; } catch { databaseStatus = 'error'; }

  const ok = databaseStatus === 'connected';
  const pkg = require('../package.json') as { version: string };
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: pkg.version,
    services: {
      database: databaseStatus,
      redis:    redisStatus,
      ai:       aiIsConfigured() ? aiProvider : 'not configured',
      email:    emailServiceStatus(),
      storage:  activeStorageProvider(),
    },
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/profiles',     require('./routes/profiles'));
app.use('/api/posts',        require('./routes/posts'));
app.use('/api/products',     require('./routes/products'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/tasks',        require('./routes/tasks'));
app.use('/api/messages',     require('./routes/messages'));
app.use('/api/notifications',require('./routes/notifications'));
app.use('/api/businesses',   require('./routes/businesses'));
app.use('/api/showrooms',    require('./routes/showrooms'));
app.use('/api/upload',       require('./routes/upload'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/search',       require('./routes/search'));
app.use('/api/stories',      require('./routes/stories'));
app.use('/api/reviews',      require('./routes/reviews'));
app.use('/api/saves',        require('./routes/saves'));
app.use('/api/moderation',   require('./routes/moderation'));
app.use('/api/events',       require('./routes/events'));
app.use('/api/jobs',         require('./routes/jobs'));
app.use('/api/courses',      require('./routes/courses'));
app.use('/api/wallet',       require('./routes/wallet'));
app.use('/api/push',         require('./routes/push'));
app.use('/api/trending',     require('./routes/trending'));
app.use('/api/suggestions',  require('./routes/suggestions'));
app.use('/api/friends',      require('./routes/friends'));
app.use('/api/verification', require('./routes/verification'));
app.use('/api/ai',           require('./routes/ai'));
app.use('/api/referral',     require('./routes/referral'));
app.use('/api/hashtags',     require('./routes/hashtags'));
app.use('/api/polls',        require('./routes/polls'));
app.use('/api/coupons',      require('./routes/coupons'));
app.use('/api/commission',   require('./routes/commission'));
app.use('/api/maps',         require('./routes/maps'));
app.use('/api/telegram',     require('./routes/telegram'));
app.use('/api/cart',         require('./routes/cart'));
app.use('/api/wishlists',    require('./routes/wishlists'));
app.use('/api/price-alerts', require('./routes/wishlists')); // price-alert sub-routes live in wishlists
app.use('/api/variants',     require('./routes/variants'));
app.use('/api/returns',      require('./routes/returns'));
app.use('/api/delivery',     require('./routes/delivery'));
app.use('/api/flags',        require('./routes/flags'));
app.use('/api/showrooms/:showroomId/external-sources', require('./routes/externalSources'));
app.use('/api/proxy',        require('./routes/proxy'));
app.use('/api/devops',       require('./routes/devops'));
app.use('/api/docs',         require('./routes/docs'));

// ── Subscription tiers & business features ───────────────────────────────────
app.use('/api/subscriptions',      require('./routes/subscriptions'));
app.use('/api/locations',          require('./routes/locations'));
app.use('/api/business-webhooks',  require('./routes/businessWebhooks'));
app.use('/api/business-api-keys',  require('./routes/businessApiKeys'));

// ── Metrics (admin only) ──────────────────────────────────────────────────────
app.get('/metrics', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    db: {
      totalCount:   pool.totalCount,
      idleCount:    pool.idleCount,
      waitingCount: pool.waitingCount,
    },
  });
});

// ── Error handlers ────────────────────────────────────────────────────────────
const sentryHandler = getSentryErrorHandler();
if (sentryHandler) app.use(sentryHandler);

app.use(errorMiddleware);
installProcessHandlers();

// ── 404 catch-all (must be last route) ───────────────────────────────────────
app.all('*', (_req: Request, res: Response) => {
  apiError.notFound(res, 'Route not found');
});

// ── Start server ──────────────────────────────────────────────────────────────
import { startStoriesCleanup } from './db/cleanupStories';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { startBackupSchedule } = require('./scripts/backup-database') as { startBackupSchedule: () => void };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { startDigestSchedule } = require('./scripts/showroom-digests') as { startDigestSchedule: () => void };

initSocket(server, allowedOrigins);

server.listen(PORT, () => {
  logger.info(`👑 Nodbusiness backend running on http://localhost:${PORT}`);
  logger.info(`   Health: http://localhost:${PORT}/health`);
  logger.info('   WebSocket: enabled for real-time chat');
  startStoriesCleanup();
  startWorkers();
  startBackupSchedule();
  startDigestSchedule();

  // ── Auto-create Supabase Storage bucket ──────────────────────────────────
  setTimeout(async () => {
    try {
      if (!isSupabaseConfigured()) return;
      const raw        = process.env.SUPABASE_URL ?? '';
      const match      = raw.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
      const projectUrl = match ? match[0] : raw.replace(/\/$/, '');
      const key        = process.env.SUPABASE_STORAGE_KEY;
      const bucket     = process.env.SUPABASE_BUCKET;
      const H: Record<string, string> = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

      const check = await fetch(`${projectUrl}/storage/v1/bucket/${bucket}`, { headers: H });
      if (check.ok) { logger.info(`☁️  Supabase Storage bucket "${bucket}" ready`); return; }

      const create = await fetch(`${projectUrl}/storage/v1/bucket`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ id: bucket, name: bucket, public: true }),
      });
      if (create.ok || create.status === 409) {
        logger.info(`☁️  Supabase Storage bucket "${bucket}" created (public)`);
      } else {
        logger.warn(`⚠️  Could not create Supabase bucket: ${create.status} ${await create.text()}`);
      }
    } catch (e) {
      logger.warn(`⚠️  Supabase bucket init skipped: ${(e as Error).message}`);
    }
  }, 2_000);

  // ── Production startup: cache warm + keep-alive ping ─────────────────────
  if (process.env.NODE_ENV === 'production') {
    setTimeout(async () => {
      try {
        await cached('trending:global', 300, async () => {
          const [posts, products, showrooms, tasks, users] = await Promise.all([
            pool.query(`SELECT DISTINCT p.id,p.author_id,p.author_name,p.content,p.image_url,p.post_type,p.like_count,p.comment_count,p.created_at FROM posts p WHERE p.created_at > NOW()-INTERVAL '48 hours' ORDER BY p.like_count DESC LIMIT 10`),
            pool.query(`SELECT DISTINCT id,seller_id,title,price,currency,images,category,view_count FROM products WHERE status='active' ORDER BY view_count DESC LIMIT 8`),
            pool.query(`SELECT DISTINCT id,owner_id,title,category,cover_image,logo_url,view_count FROM showrooms WHERE status='published' ORDER BY view_count DESC LIMIT 6`),
            pool.query(`SELECT id,requester_id,title,task_type,offered_payment,currency,location FROM tasks WHERE status='open' ORDER BY created_at DESC LIMIT 8`),
            pool.query(`SELECT user_id,display_name,avatar_url,headline,follower_count FROM user_profiles ORDER BY follower_count DESC LIMIT 8`),
          ]);
          return { trending_posts: posts.rows, top_products: products.rows, featured_showrooms: showrooms.rows, open_tasks: tasks.rows, suggested_users: users.rows };
        });
        logger.info('Startup cache warm complete');
      } catch { logger.warn('Startup cache warm failed'); }
    }, 3_000);

    setInterval(async () => {
      try { await pool.query('SELECT 1'); logger.debug('Keep-alive ping OK'); }
      catch (err) { logger.warn({ err: (err as Error).message }, 'Keep-alive ping failed'); }
    }, 4 * 60 * 1_000);
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down gracefully...');
  server.close(async () => {
    try {
      await closeQueues();
      const redis = getRedis();
      if (!redis.isNoOp) await (redis as RedisClient).quit();
      await pool.end();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'Error during shutdown');
      process.exit(1);
    }
  });
  setTimeout(() => { logger.warn('Forced shutdown after timeout'); process.exit(1); }, 10_000);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));
// NOTE: uncaughtException / unhandledRejection handlers are installed by
// installProcessHandlers() (lib/errorCollector) — do not add duplicates here.