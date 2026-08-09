require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const tables = ['showrooms', 'user_profiles', 'posts', 'products', 'tasks'];
  for (const table of tables) {
    const { rows } = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      [table]
    );
    console.log(`\n${table} columns:`, rows.map(r => r.column_name).join(', '));
  }
  await pool.end();
}
check().catch(console.error);
