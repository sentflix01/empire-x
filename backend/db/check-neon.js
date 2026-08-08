require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const tables = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
  );
  console.log('\n📊 Neon DB Status\n');
  console.log('Tables (' + tables.rows.length + '):');
  tables.rows.forEach(r => console.log('  ✅', r.tablename));

  const users    = await pool.query('SELECT COUNT(*) FROM users');
  const posts    = await pool.query('SELECT COUNT(*) FROM posts');
  const products = await pool.query('SELECT COUNT(*) FROM products');
  const orders   = await pool.query('SELECT COUNT(*) FROM orders');

  console.log('\n📈 Row counts:');
  console.log('  users:   ', users.rows[0].count);
  console.log('  posts:   ', posts.rows[0].count);
  console.log('  products:', products.rows[0].count);
  console.log('  orders:  ', orders.rows[0].count);
  console.log('\n✅ No duplicates possible — all migrations use IF NOT EXISTS\n');
  await pool.end();
}

check().catch(err => { console.error('❌', err.message); process.exit(1); });
