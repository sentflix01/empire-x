const router = require('express').Router();
const logger = require('../lib/logger');
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');
const { emitNotification } = require('../socket');
const { sendPushToUser } = require('./push');
const { cacheMiddleware } = require('../middleware/cache');

const LOW_STOCK_THRESHOLD = 5;

// Postgres NUMERIC columns (average_rating) are serialized as strings by pg.
// Coerce rating fields to JS numbers so frontends can safely call .toFixed() etc.
function normalizeProduct(p) {
  if (!p) return p;
  const out = { ...p };
  if (out.average_rating != null) out.average_rating = Number(out.average_rating) || 0;
  if (out.review_count != null) out.review_count = Number(out.review_count) || 0;
  if (out.rating_count != null) out.rating_count = Number(out.rating_count) || 0;
  return out;
}

async function checkLowStockAlert(prevStock, newStock, product, sellerId) {
  if (prevStock > LOW_STOCK_THRESHOLD && newStock <= LOW_STOCK_THRESHOLD && newStock >= 0) {
    try {
      const { rows: [notif] } = await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, link, is_read)
         VALUES ($1, 'order', $2, $3, $4, false) RETURNING *`,
        [sellerId, `⚠️ Low stock: ${product.title}`, `Only ${newStock} unit${newStock !== 1 ? 's' : ''} left.`, `/products/edit?id=${product.id}`]
      );
      emitNotification(sellerId, notif);
      sendPushToUser(sellerId, `⚠️ Low stock: ${product.title}`, `Only ${newStock} unit${newStock !== 1 ? 's' : ''} left.`, `/products/edit?id=${product.id}`).catch(() => {});
    } catch (alertErr) { logger.error({ err: alertErr.message }, 'Low-stock alert error'); }
  }
}

// List
router.get('/', optionalAuth, cacheMiddleware('products:list', 90), async (req, res) => {
  try {
    const { seller_id, business_id, showroom_id, status, sort = '-created_at', limit = 50 } = req.query;

    // Real-only mode: only products from real (non-seed) users
    if (req.realOnly) {
      const lim = Math.min(parseInt(limit) || 50, 200);
      const conditions = ['u.is_seed = FALSE'];
      const values = [];
      if (seller_id) { values.push(seller_id); conditions.push(`p.seller_id = $${values.length}`); }
      if (status) { values.push(status); conditions.push(`p.status = $${values.length}`); }
      values.push(lim);
      const { rows } = await pool.query(
        `SELECT p.* FROM products p JOIN users u ON u.id = p.seller_id WHERE ${conditions.join(' AND ')} ORDER BY p.created_at DESC LIMIT $${values.length}`,
        values
      );
      return res.json(rows.map(normalizeProduct));
    }

    const filter = {};
    if (seller_id) filter.seller_id = seller_id;
    if (business_id) filter.business_id = business_id;
    if (showroom_id) filter.showroom_id = showroom_id;
    if (status) filter.status = status;
    res.json((await listRecords('products', { filter, sort, limit })).map(normalizeProduct));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const product = await getRecord('products', req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(normalizeProduct(product));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, price } = req.body;
    if (!title || price == null) return res.status(400).json({ error: 'title and price are required' });
    const product = await createRecord('products', { ...req.body, seller_id: req.user.id });
    res.status(201).json(normalizeProduct(product));
  } catch (err) {
    logger.error({ err: err?.message || err }, 'Error');
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('products', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    if (existing.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await updateRecord('products', req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });

    // Low-stock alert: check if stock just dropped to threshold
    if (req.body.stock != null) {
      const prevStock = parseInt(existing.stock ?? 0, 10);
      const newStock  = parseInt(req.body.stock, 10);
      await checkLowStockAlert(prevStock, newStock, existing, existing.seller_id);
    }

    // Fire price alerts if price dropped
    if (req.body.price != null && parseFloat(req.body.price) < parseFloat(existing.price)) {
      const newPrice = parseFloat(req.body.price);
      try {
        const { rows: alerts } = await pool.query(
          `SELECT * FROM price_alerts
           WHERE product_id = $1 AND is_triggered = FALSE AND target_price >= $2`,
          [req.params.id, newPrice]
        );
        for (const alert of alerts) {
          // Mark as triggered
          await pool.query(
            'UPDATE price_alerts SET is_triggered = TRUE WHERE id = $1',
            [alert.id]
          );
          // Create in-app notification
          const { rows: [notif] } = await pool.query(
            `INSERT INTO notifications (user_id, type, title, body, link, is_read)
             VALUES ($1, 'order', $2, $3, $4, false) RETURNING *`,
            [
              alert.user_id,
              `🏷️ Price drop! ${existing.title}`,
              `Price dropped to ${newPrice.toLocaleString()} ${existing.currency || 'ETB'} — your target was ${alert.target_price.toLocaleString()}`,
              `/products/${req.params.id}`,
            ]
          );
          emitNotification(alert.user_id, notif);
          sendPushToUser(
            alert.user_id,
            `🏷️ Price drop! ${existing.title}`,
            `Now ${newPrice.toLocaleString()} ${existing.currency || 'ETB'}`,
            `/products/${req.params.id}`
          ).catch(() => {});
        }
      } catch (alertErr) {
        logger.error({ err: alertErr.message }, 'Price alert error');
      }
    }

    res.json(normalizeProduct(updated));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('products', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    if (existing.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await deleteRecord('products', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
