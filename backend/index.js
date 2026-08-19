require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const { initSocket } = require('./socket');
const logger = require('./lib/logger');
const { startWorkers, closeQueues } = require('./lib/queue');
const { initSentry, getSentryErrorHandler } = require('./lib/sentry');
const { errorMiddleware, installProcessHandlers } = require('./lib/errorCollector');
const requestId = require('./middleware/requestId');
const httpLogger = require('./middleware/httpLogger');
const apiVersion = require('./middleware/apiVersion');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const pool = require('./db/pool');
const apiError = require('./lib/apiError');

const app = express();
app.set('trust proxy', 1); // TD-015: trust Railway/Render load-balancer so req.ip = real end-user IP
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ── Sentry (must be first) ────────────────────────────────────────────────────
initSentry(app);

// ── Gzip compression — reduces response size by 60-80% ───────────────────────
app.use(compression());

// ── ETag support for conditional requests ────────────────────────────────────
// Enables 304 Not Modified responses when content hasn't changed
app.set('etag', 'strong');

// ── Response time header for monitoring ──────────────────────────────────────
app.use(require('./middleware/responseTime'));
app.use((_req, res, next) => {
  // Vary header for CDN caching correctness
  res.set('Vary', 'Accept-Encoding');
  next();
});

// ── Real-mode filter header — set req.realOnly when X-Real-Only: 1 ───────────
const { realModeMiddleware } = require('./middleware/realMode');
app.use(realModeMiddleware);

// ── Request ID, HTTP access log, API version header ──────────────────────────
app.use(requestId);
app.use(httpLogger);
app.use(apiVersion);

// ── Startup environment check ─────────────────────────────────────────────────
function checkEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    logger.error(`\n❌  Missing required env vars: ${missing.join(', ')}`);
    logger.error('   Copy backend/.env.example to backend/.env and fill in the values.\n');
    process.exit(1);
  }

  const warnings = [];
  const smtpSettings = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS];
  if (!process.env.RESEND_API_KEY && !smtpSettings.some(Boolean)) {
    warnings.push('Email (RESEND_API_KEY or SMTP_HOST) — OTP emails will only print to console');
  } else if (!process.env.RESEND_API_KEY && !smtpSettings.every(Boolean)) {
    warnings.push('Email SMTP is incomplete — set SMTP_HOST, SMTP_USER, and SMTP_PASS before OTP emails can be delivered');
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('Stripe (STRIPE_SECRET_KEY) — payments will not work');
  }
  const r2 = ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME','R2_PUBLIC_URL'];
  const supabaseStorage = ['SUPABASE_URL','SUPABASE_STORAGE_KEY','SUPABASE_BUCKET'];
  if (r2.some(k => !process.env[k]) && supabaseStorage.some(k => !process.env[k])) {
    warnings.push('File storage — set Supabase Storage vars (SUPABASE_URL, SUPABASE_STORAGE_KEY, SUPABASE_BUCKET) or Cloudflare R2 vars. Files currently saved to local disk and will be lost on redeploy.');
  }
  if (warnings.length && process.env.NODE_ENV === 'production') {
    logger.warn('\n⚠️  Production warnings:');
    warnings.forEach(w => logger.warn(`   • ${w}`));
    logger.warn('');
  } else if (warnings.length) {
    logger.info('\n💡 Dev mode — some services not configured (normal for local dev):');
    warnings.forEach(w => logger.info(`   • ${w}`));
    logger.info('');
  }
}
checkEnv();

function emailServiceStatus() {
  if (process.env.RESEND_API_KEY) return 'resend';
  const smtpSettings = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS];
  if (smtpSettings.every(Boolean)) return 'smtp';
  if (smtpSettings.some(Boolean)) return 'misconfigured';
  return 'console';
}

// ── Security ─────────────────────────────────────────────────────────────────
// Hide Express fingerprint — never expose what framework/version we use
app.disable('x-powered-by');

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  // Strict HTTPS in production
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
  // Block MIME type sniffing
  noSniff: true,
  // XSS protection header
  xssFilter: true,
  // Hide referrer on cross-origin requests
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // TD-013: Content Security Policy
  // Backend API only serves JSON — no scripts, no frames, no inline styles needed.
  // Frontend CSP is handled by Next.js headers config separately.
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc:     ["'none'"],
      scriptSrc:      ["'none'"],
      styleSrc:       ["'none'"],
      imgSrc:         ["'none'"],
      connectSrc:     ["'self'"],
      fontSrc:        ["'none'"],
      objectSrc:      ["'none'"],
      mediaSrc:       ["'none'"],
      frameSrc:       ["'none'"],
      frameAncestors: ["'none'"],
      formAction:     ["'self'"],
      baseUri:        ["'none'"],
      upgradeInsecureRequests: [],
    },
  } : false,
}));

// Remove any header that could expose internal info
app.use((_req, res, next) => {
  res.removeHeader('Server');
  res.removeHeader('X-AspNet-Version');
  res.removeHeader('X-AspNetMvc-Version');
  next();
});

const { parseFrontendUrls } = require('./lib/frontendUrl');

const allowedOrigins = parseFrontendUrls();
// In dev, always include the local Next.js frontend origin.
if (process.env.NODE_ENV !== 'production') {
  if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');
}

const wildcardOrigins = allowedOrigins
  .filter(origin => origin.includes('*'))
  .map(pattern => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  });
const exactOrigins = allowedOrigins.filter(origin => !origin.includes('*'));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser tools or same-origin requests without an Origin header.
    if (!origin) return callback(null, true);
    if (exactOrigins.includes(origin)) return callback(null, true);
    if (wildcardOrigins.some(rx => rx.test(origin))) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Rate limiting — disabled entirely in development, enforced in production only
const isDev = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  skip: () => isDev,  // completely skip in development
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, try again later' },
  skip: () => isDev,  // completely skip in development
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Body Parsing ─────────────────────────────────────────────────────────────
// Stripe webhooks need raw body
app.use('/api/orders/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parser — needed for HttpOnly refresh token (TD-001)
app.use(cookieParser());

// ── Static file serving (uploaded images) ────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const { getRedis } = require('./lib/redis');
  const redis = getRedis();
  let redisStatus = 'not configured';
  if (!redis.isNoOp) {
    try {
      await redis.get('health-check');
      redisStatus = 'connected';
    } catch {
      redisStatus = 'error';
    }
  }
  let databaseStatus = 'disconnected';
  try {
    const pool = require('./db/pool');
    await pool.query('SELECT 1');
    databaseStatus = 'connected';
  } catch {
    databaseStatus = 'error';
  }
  const ok = databaseStatus === 'connected';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    services: {
      database: databaseStatus,
      redis: redisStatus,
      ai: require('./lib/ai').isConfigured() ? require('./lib/ai').provider : 'not configured',
      email: emailServiceStatus(),
      storage: require('./middleware/upload').activeStorageProvider(),
    },
  });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/businesses', require('./routes/businesses'));
app.use('/api/showrooms', require('./routes/showrooms'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/search', require('./routes/search'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/saves', require('./routes/saves'));
app.use('/api/moderation', require('./routes/moderation'));
app.use('/api/events', require('./routes/events'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/push', require('./routes/push'));
app.use('/api/trending', require('./routes/trending'));
app.use('/api/suggestions', require('./routes/suggestions'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/verification', require('./routes/verification'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/referral', require('./routes/referral'));
// ── Additional feature routes ─────────────────────────────────────────────────
app.use('/api/hashtags', require('./routes/hashtags'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/commission', require('./routes/commission'));
app.use('/api/maps', require('./routes/maps'));
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlists', require('./routes/wishlists'));
app.use('/api/price-alerts', require('./routes/wishlists')); // price alert sub-routes live in wishlists
app.use('/api/variants', require('./routes/variants'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/flags', require('./routes/flags'));
app.use('/api/showrooms/:showroomId/external-sources', require('./routes/externalSources'));
app.use('/api/proxy', require('./routes/proxy'));
app.use('/api/devops', require('./routes/devops'));
app.use('/api/docs',   require('./routes/docs'));

// ── Metrics endpoint (admin only) ─────────────────────────────────────────────
app.get('/metrics', requireAuth, requireAdmin, (_req, res) => {
  res.json({
    db: {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    },
  });
});

// ── Sentry error handler (must be before global error handler) ───────────────
const sentryErrorHandler = getSentryErrorHandler();
if (sentryErrorHandler) app.use(sentryErrorHandler);

// ── Global error handler — captures to error_events + responds ───────────────
// errorMiddleware stores every error in DB so the DevOps panel shows a live feed
app.use(errorMiddleware);

// ── Install process-level handlers (uncaughtException, unhandledRejection) ───
installProcessHandlers();

// ── 404 catch-all (must be last) ──────────────────────────────────────────────
app.all('*', (_req, res) => apiError.notFound(res, 'Route not found'));

// ── Start ─────────────────────────────────────────────────────────────────────
const { startStoriesCleanup } = require('./db/cleanupStories');
initSocket(server, allowedOrigins);
server.listen(PORT, () => {
  logger.info(`👑 Nodbusiness backend running on http://localhost:${PORT}`);
  logger.info(`   Health: http://localhost:${PORT}/health`);
  logger.info('   WebSocket: enabled for real-time chat');
  startStoriesCleanup();
  startWorkers(); // BullMQ background job workers

  // ── Auto-create Supabase Storage bucket if configured ──────────────────────
  setTimeout(async () => {
    try {
      const { isSupabaseConfigured } = require('./middleware/upload');
      if (!isSupabaseConfigured()) return;

      const raw = process.env.SUPABASE_URL || '';
      const match = raw.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
      const projectUrl = match ? match[0] : raw.replace(/\/$/, '');
      const key    = process.env.SUPABASE_STORAGE_KEY;
      const bucket = process.env.SUPABASE_BUCKET;
      const H = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

      const check = await fetch(`${projectUrl}/storage/v1/bucket/${bucket}`, { headers: H });
      if (check.ok) {
        logger.info(`☁️  Supabase Storage bucket "${bucket}" ready`);
        return;
      }
      // Bucket missing — create it as public
      const create = await fetch(`${projectUrl}/storage/v1/bucket`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ id: bucket, name: bucket, public: true }),
      });
      if (create.ok || create.status === 409) {
        logger.info(`☁️  Supabase Storage bucket "${bucket}" created (public)`);
      } else {
        const err = await create.text();
        logger.warn(`⚠️  Could not create Supabase bucket: ${create.status} ${err}`);
      }
    } catch (e) {
      logger.warn(`⚠️  Supabase bucket init skipped: ${e.message}`);
    }
  }, 2000); // 2s after startup so network is ready

  // ── Keep-alive: warm up DB connection pool every 4 minutes ──────────────
  // Prevents Railway free-tier cold starts and Neon connection drops.
  if (process.env.NODE_ENV === 'production') {
    // Initial cache warm on startup
    setTimeout(async () => {
      try {
        await require('./lib/redis').cached('trending:global', 300, async () => {
          const [posts, products, showrooms, tasks, users] = await Promise.all([
            pool.query(`SELECT p.id, p.author_id, p.author_name, p.content, p.image_url, p.post_type, p.like_count, p.comment_count, p.created_at FROM posts p WHERE p.created_at > NOW() - INTERVAL '48 hours' ORDER BY p.like_count DESC LIMIT 10`),
            pool.query(`SELECT id, seller_id, title, price, currency, images, category, view_count FROM products WHERE status = 'active' ORDER BY view_count DESC LIMIT 8`),
            pool.query(`SELECT id, owner_id, title, category, cover_image, logo_url, view_count FROM showrooms WHERE status = 'published' ORDER BY view_count DESC LIMIT 6`),
            pool.query(`SELECT id, requester_id, title, task_type, offered_payment, currency, location FROM tasks WHERE status = 'open' ORDER BY created_at DESC LIMIT 8`),
            pool.query(`SELECT user_id, display_name, avatar_url, headline, follower_count FROM user_profiles ORDER BY follower_count DESC LIMIT 8`),
          ]);
          return { trending_posts: posts.rows, top_products: products.rows, featured_showrooms: showrooms.rows, open_tasks: tasks.rows, suggested_users: users.rows };
        });
        logger.info('Startup cache warm complete');
      } catch (e) { logger.warn('Startup cache warm failed'); }
    }, 3000); // 3s after startup

    setInterval(async () => {
      try {
        await pool.query('SELECT 1');
        logger.debug('Keep-alive ping OK');
      } catch (err) {
        logger.warn({ err: err.message }, 'Keep-alive ping failed');
      }
    }, 4 * 60 * 1000); // every 4 minutes
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down gracefully...');
  server.close(async () => {
    try {
      await closeQueues();
      const { getRedis } = require('./lib/redis');
      const redis = getRedis();
      if (!redis.isNoOp) await redis.quit();
      const pool = require('./db/pool');
      await pool.end();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err: err.message }, 'Error during shutdown');
      process.exit(1);
    }
  });
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled errors so the process doesn't silently crash
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: String(reason) }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  // ERR_HTTP_HEADERS_SENT means a response was sent twice — log but don't kill the process
  if (err.code === 'ERR_HTTP_HEADERS_SENT' || err.message?.includes('Cannot set headers after they are sent')) {
    logger.warn({ err: err.message }, 'Double response detected — request already responded to');
    return;
  }
  logger.error({ err: err.message }, 'Uncaught exception');
  process.exit(1);
});
