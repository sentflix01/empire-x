/**
 * Generic CRUD helpers for entity routes.
 * All timestamps (created_at, updated_at) are managed automatically.
 */
const pool = require('../db/pool');

// Allowlist of permitted table names — prevents SQL injection via table arguments
const ALLOWED_TABLES = new Set([
  'users', 'user_profiles', 'posts', 'products', 'businesses', 'showrooms',
  'orders', 'tasks', 'task_bids', 'conversations', 'messages', 'notifications',
  'follows', 'likes', 'comments', 'stories', 'story_views', 'reviews', 'saves',
  'reports', 'blocks', 'wallets', 'wallet_transactions', 'events', 'event_tickets',
  'jobs', 'job_applications', 'courses', 'course_lessons', 'course_enrollments',
  'point_transactions', 'push_subscriptions', 'cart_items', 'wishlists',
  'product_variants', 'return_requests', 'delivery_updates', 'price_alerts',
  'hashtags', 'post_hashtags', 'poll_votes', 'coupons', 'commissions',
]);

function validateTable(table) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
}

/**
 * Build a WHERE clause from a filter object.
 * Returns { clause: string, values: any[] } starting at paramOffset.
 */
function buildWhere(filter = {}, paramOffset = 1) {
  const keys = Object.keys(filter).filter(k => filter[k] !== undefined && filter[k] !== null);
  if (!keys.length) return { clause: '', values: [] };

  const parts = keys.map((k, i) => {
    const col = k.replace(/[^a-z0-9_]/gi, ''); // sanitize column name
    return `${col} = $${paramOffset + i}`;
  });
  return {
    clause: 'WHERE ' + parts.join(' AND '),
    values: keys.map(k => filter[k]),
  };
}

/**
 * Parse sort string like "-created_date" → { col: 'created_at', dir: 'DESC' }
 */
function parseSort(sort = '-created_at') {
  const desc = sort.startsWith('-');
  const raw = sort.replace(/^-/, '');
  // Map legacy frontend field names to DB columns.
  const colMap = { created_date: 'created_at', updated_date: 'updated_at' };
  const col = colMap[raw] || raw.replace(/[^a-z0-9_]/gi, '');
  return { col, dir: desc ? 'DESC' : 'ASC' };
}

async function listRecords(table, { filter = {}, sort = '-created_at', limit = 50 } = {}) {
  validateTable(table);
  const { clause, values } = buildWhere(filter);
  const { col, dir } = parseSort(sort);
  const lim = Math.min(parseInt(limit, 10) || 50, 500);
  const { rows } = await pool.query(
    `SELECT * FROM ${table} ${clause} ORDER BY ${col} ${dir} LIMIT $${values.length + 1}`,
    [...values, lim]
  );
  return rows;
}

async function getRecord(table, id) {
  validateTable(table);
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createRecord(table, data) {
  validateTable(table);
  const keys = Object.keys(data).filter(k => data[k] !== undefined);
  if (!keys.length) throw new Error('No data provided');
  const cols = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map(k => data[k]);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

async function updateRecord(table, id, data) {
  validateTable(table);
  const keys = Object.keys(data).filter(k => data[k] !== undefined && k !== 'id' && k !== 'created_at');
  if (!keys.length) throw new Error('No data to update');
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map(k => data[k]);
  const { rows } = await pool.query(
    `UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  return rows[0] || null;
}

async function deleteRecord(table, id) {
  validateTable(table);
  await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord, buildWhere, parseSort, validateTable, ALLOWED_TABLES };
