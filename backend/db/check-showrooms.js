require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');
async function run() {
  const { rows } = await pool.query(
    `SELECT s.id, s.owner_id, s.title, s.slug, s.status, s.created_at, u.email
     FROM showrooms s
     LEFT JOIN users u ON u.id = s.owner_id
     ORDER BY s.created_at DESC`
  );
  console.log(`\nShowrooms in DB: ${rows.length}`);
  if (rows.length) {
    rows.forEach(r => console.log(`  [${r.status}] "${r.title}" ? owner: ${r.email} ? created: ${r.created_at}`));
  } else {
    console.log('  (none ? table is empty)');
  }
  await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
