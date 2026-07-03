require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

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

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

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
initSocket(server, process.env.FRONTEND_URL || 'http://localhost:5173');
server.listen(PORT, () => {
  console.log(`\n👑 Empire X backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   WebSocket: enabled for real-time chat\n`);
  startStoriesCleanup();
});
