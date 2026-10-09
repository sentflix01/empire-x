/**
 * utils/crud.ts — Generic CRUD helpers with full TypeScript types
 *
 * Phase 4 Task 14:
 *   - Renamed from crud.js → crud.ts
 *   - All function signatures typed using lib/types.ts contracts
 *   - Return types explicit so callers get autocomplete on every field
 *   - Runtime behaviour is identical to the previous .js version
 *   - Backward compatible: existing require('../utils/crud') callers
 *     continue to work unchanged because tsconfig has allowJs + commonjs
 */
import pool from '../db/pool';
import type { FilterObject, WhereResult, SortResult, ListOptions } from '../lib/types';

type ReadScope = { realOnly?: boolean };
const REAL_MODE_OWNER_COLUMNS: Record<string, string> = {
  businesses: 'owner_id',
  posts: 'author_id', products: 'seller_id', showrooms: 'owner_id',
};

function realModeClause(table: string, enabled: boolean): string {
  const ownerColumn = REAL_MODE_OWNER_COLUMNS[table];
  return enabled && ownerColumn
    ? ` AND ${table}.${ownerColumn} IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)`
    : '';
}

function unexpiredShowroomClause(table: string): string {
  return table === 'showrooms' ? ' AND (showrooms.expires_at IS NULL OR showrooms.expires_at > NOW())' : '';
}

// ── Table allowlist ───────────────────────────────────────────────────────────
// Prevents SQL injection via dynamic table name arguments.
// Every table used by crud helpers must be listed here.
export const ALLOWED_TABLES = new Set<string>([
  'users', 'user_profiles', 'posts', 'products', 'businesses', 'showrooms',
  'orders', 'conversations', 'messages', 'notifications',
  'follows', 'likes', 'comments', 'stories', 'story_views', 'reviews', 'saves',
  'reports', 'blocks', 'wallets', 'wallet_transactions',
  'point_transactions', 'push_subscriptions', 'cart_items', 'wishlists',
  'product_variants', 'return_requests', 'delivery_updates', 'price_alerts',
  'hashtags', 'post_hashtags', 'poll_votes', 'coupons', 'commissions',
  'conversation_participants', 'schema_migrations', 'devops_items', 'error_events',
  'app_settings', 'webhook_events', 'dismissed_suggestions',
]);

export function validateTable(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
}

/**
 * Sanitize a column name coming from dynamic data keys.
 *
 * Data keys frequently originate from req.body (mass-assignment surface).
 * Stripping everything outside [a-z0-9_] guarantees the identifier can never
 * break out of the SQL statement, regardless of what a client sends.
 * Callers that need per-route field allowlists should still apply them —
 * this is defense in depth, not an authorization check.
 */
export function sanitizeColumn(col: string): string {
  return col.replace(/[^a-z0-9_]/gi, '');
}

/** Strip record identity, creation time, and ownership fields from user edits. */
export function withoutProtectedFields(
  data: Record<string, unknown>,
  ownerColumn: 'owner_id' | 'organizer_id' | 'creator_id' | 'poster_id' | 'author_id' | 'requester_id' | 'bidder_id' | 'user_id',
): Record<string, unknown> {
  const out = { ...data };
  for (const key of ['id', 'created_at', 'updated_at', ownerColumn]) delete out[key];
  return out;
}

// ── WHERE clause builder ──────────────────────────────────────────────────────

/**
 * Build a parameterized WHERE clause from a plain filter object.
 * Column names are sanitized (only a-z 0-9 _ allowed) to prevent injection.
 *
 * @param filter      Key/value pairs — undefined/null values are skipped
 * @param paramOffset Starting $N index (default 1)
 */
export function buildWhere(filter: FilterObject = {}, paramOffset = 1): WhereResult {
  const keys = Object.keys(filter).filter(
    k => filter[k] !== undefined && filter[k] !== null
  );
  if (!keys.length) return { clause: '', values: [] };

  const parts = keys.map((k, i) => {
    const col = k.replace(/[^a-z0-9_]/gi, ''); // sanitize column name
    return `${col} = $${paramOffset + i}`;
  });

  return {
    clause: 'WHERE ' + parts.join(' AND '),
    values: keys.map(k => filter[k] as unknown),
  };
}

// ── Sort parser ───────────────────────────────────────────────────────────────

/**
 * Parse a sort string like "-created_at" → { col: 'created_at', dir: 'DESC' }
 * A leading '-' means descending. Maps legacy frontend field names to DB columns.
 */
export function parseSort(sort = '-created_at'): SortResult {
  const desc = sort.startsWith('-');
  const raw  = sort.replace(/^-/, '');
  const colMap: Record<string, string> = {
    created_date: 'created_at',
    updated_date: 'updated_at',
  };
  const col = colMap[raw] || raw.replace(/[^a-z0-9_]/gi, '');
  return { col, dir: desc ? 'DESC' : 'ASC' };
}

// ── CRUD operations ───────────────────────────────────────────────────────────

/**
 * List records from a table with optional filter, sort, and limit.
 * Max limit is capped at 500 to prevent accidental full-table dumps.
 */
export async function listRecords<T extends Record<string, unknown>>(
  table: string,
  options: ListOptions & ReadScope = {}
): Promise<T[]> {
  const { filter = {}, sort = '-created_at', limit = 50, realOnly = false } = options;
  validateTable(table);
  const { clause, values } = buildWhere(filter);
  const { col, dir } = parseSort(sort as string);
  const lim = Math.min(parseInt(String(limit), 10) || 50, 500);
  const { rows } = await pool.query(
    `SELECT * FROM ${table} ${clause}${clause ? '' : 'WHERE TRUE'}${realModeClause(table, realOnly)}${unexpiredShowroomClause(table)} ORDER BY ${col} ${dir} LIMIT $${values.length + 1}`,
    [...values, lim]
  );
  return rows as T[];
}

/**
 * Fetch a single record by primary key (UUID).
 * Returns null when the record does not exist.
 */
export async function getRecord<T extends Record<string, unknown>>(
  table: string,
  id: string,
  options: ReadScope = {},
): Promise<T | null> {
  validateTable(table);
  const { rows } = await pool.query(
    `SELECT * FROM ${table} WHERE id = $1${realModeClause(table, !!options.realOnly)}${unexpiredShowroomClause(table)}`,
    [id]
  );
  return (rows[0] as T) ?? null;
}

/**
 * Insert a new record and return the created row.
 * Undefined values in data are skipped so optional columns get their DB default.
 */
export async function createRecord<T extends Record<string, unknown>>(
  table: string,
  data: Record<string, unknown>
): Promise<T> {
  validateTable(table);
  const keys = Object.keys(data).filter(k => data[k] !== undefined);
  if (!keys.length) throw new Error('No data provided');
  const cols         = keys.map(sanitizeColumn).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values       = keys.map(k => data[k]);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0] as T;
}

/**
 * Update a record by ID and return the updated row.
 * Returns null when the record does not exist.
 * The id and created_at fields are excluded from the SET clause automatically.
 * updated_at is set to NOW() automatically.
 */
export async function updateRecord<T extends Record<string, unknown>>(
  table: string,
  id: string,
  data: Record<string, unknown>
): Promise<T | null> {
  validateTable(table);
  const keys = Object.keys(data).filter(
    k => data[k] !== undefined && k !== 'id' && k !== 'created_at'
  );
  if (!keys.length) throw new Error('No data to update');
  const sets   = keys.map((k, i) => `${sanitizeColumn(k)} = $${i + 1}`).join(', ');
  const values = keys.map(k => data[k]);
  const { rows } = await pool.query(
    `UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  return (rows[0] as T) ?? null;
}

/**
 * Delete a record by ID.
 * No error is thrown when the record does not exist (idempotent).
 */
export async function deleteRecord(table: string, id: string): Promise<void> {
  validateTable(table);
  await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

// ── CommonJS export for backward compatibility ────────────────────────────────
// All existing require('../utils/crud') callers continue to work unchanged.
module.exports = {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  buildWhere,
  parseSort,
  validateTable,
  sanitizeColumn,
  withoutProtectedFields,
  ALLOWED_TABLES,
};
