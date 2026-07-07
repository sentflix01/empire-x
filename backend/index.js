require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initSocket } = require('./socket');
const logger = require('./lib/logger');
const { startWorkers, closeQueues } = require('./lib/queue');
const { initSentry, getSentryErrorHandler } = require('./lib/sentry');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ── Sentry (must be first) ────────────────────────────────────────────────────
initSentry(app);

// ── Startup environment check ─────────────────────────────────────────────────
function checkEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`\n❌  Missing required env vars: ${missing.join(', ')}`);
    console.error('   Copy backend/.env.example to backend/.env and fill in the values.\n');
    process.exit(1);
  }

  const warnings = [];
  if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST) {
    warnings.push('Email (RESEND_API_KEY or SMTP_HOST) — OTP emails will only print to console');
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('Stripe (STRIPE_SECRET_KEY) — payments will not work');
  }
  const r2 = ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME'];
  if (r2.some(k => !process.env[k])) {
    warnings.push('Cloudflare R2 — file uploads go to local disk (not suitable for production)');
  }
  if (warnings.length && process.env.NODE_ENV === 'production') {
    console.warn('\n⚠️  Production warnings:');
    warnings.forEach(w => console.warn(`   • ${w}`));
    console.warn('');
  } else if (warnings.length) {
    console.log('\n💡 Dev mode — some services not configured (normal for local dev):');
    warnings.forEach(w => console.log(`   • ${w}`));
    console.log('');
  }
}
checkEnv();

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
}));

// Remove any header that could expose internal info
app.use((_req, res, next) => {
  res.removeHeader('Server');
  res.removeHeader('X-AspNet-Version');
  res.removeHeader('X-AspNetMvc-Version');
  next();
});

const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
// In dev, always include the local Next.js frontend origin.
if (process.env.NODE_ENV !== 'production') {
  if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');
}
const corsOptions = {
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
};
app.use(cors(corsOptions));

// Rate limiting — relax auth limits in development so testing doesn't get blocked
const isDev = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: isDev ? 50000 : 500 });
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 20,          // effectively unlimited in dev
  message: { error: 'Too many requests, try again later' },
  skip: (req) => process.env.NODE_ENV !== 'production',  // re-read at request time
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
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    services: {
      database: 'connected',
      redis: redisStatus,
      ai: require('./lib/ai').isConfigured() ? require('./lib/ai').provider : 'not configured',
      email: process.env.RESEND_API_KEY ? 'resend' : process.env.SMTP_HOST ? 'smtp' : 'console',
      storage: require('./middleware/upload').isR2Configured() ? 'r2' : 'local',
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

// ── Sentry error handler (must be before global error handler) ───────────────
const sentryErrorHandler = getSentryErrorHandler();
if (sentryErrorHandler) app.use(sentryErrorHandler);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const { startStoriesCleanup } = require('./db/cleanupStories');
initSocket(server, allowedOrigins);
server.listen(PORT, () => {
  logger.info(`👑 Empire X backend running on http://localhost:${PORT}`);
  logger.info(`   Health: http://localhost:${PORT}/health`);
  logger.info('   WebSocket: enabled for real-time chat');
  startStoriesCleanup();
  startWorkers(); // BullMQ background job workers
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
  logger.error({ err: err.message }, 'Uncaught exception');
  process.exit(1);
});
