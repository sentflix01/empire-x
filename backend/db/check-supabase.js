// backend/db/check-supabase.js
// Verifies the configured PostgreSQL connection and prints basic table/row counts.
// Exits non-zero on any failure — safe to use as a CI verify step.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ Missing DATABASE_URL. Set the DATABASE_URL GitHub secret.');
  process.exit(2);
}

(async () => {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();

    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );

    console.log('\n📊 PostgreSQL DB Status\n');
    console.log('Tables (' + tables.rows.length + '):');
    tables.rows.forEach(r => console.log('  ✅', r.tablename));

    const users    = await client.query('SELECT COUNT(*) FROM users');
    const posts    = await client.query('SELECT COUNT(*) FROM posts');
    const products = await client.query('SELECT COUNT(*) FROM products');
    const orders   = await client.query('SELECT COUNT(*) FROM orders');

    console.log('\n📈 Row counts:');
    console.log('  users:   ', users.rows[0].count);
    console.log('  posts:   ', posts.rows[0].count);
    console.log('  products:', products.rows[0].count);
    console.log('  orders:  ', orders.rows[0].count);
    console.log('\n✅ PostgreSQL connection OK\n');

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ PostgreSQL check failed:', err.message || err);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
})();
