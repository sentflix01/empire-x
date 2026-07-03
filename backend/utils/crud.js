/**
 * Generic CRUD helpers for entity routes.
 * All timestamps (created_at, updated_at) are managed automatically.
 */
const pool = require('../db/pool');

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
  // Map Base44-style field names to DB columns
  const colMap = { created_date: 'created_at', updated_date: 'updated_at' };
  const col = colMap[raw] || raw.replace(/[^a-z0-9_]/gi, '');
  return { col, dir: desc ? 'DESC' : 'ASC' };
}

async function listRecords(table, { filter = {}, sort = '-created_at', limit = 50 } = {}) {
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
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createRecord(table, data) {
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
  await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord, buildWhere, parseSort };
