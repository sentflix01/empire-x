require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  try {
    const cols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'conversations' ORDER BY ordinal_position"
    );
    console.log('conversations columns:', cols.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}
main();
