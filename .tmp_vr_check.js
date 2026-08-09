const nm = require('path').join(__dirname, 'backend/node_modules');
require(require('path').join(nm, 'dotenv')).config({ path: require('path').join(__dirname, 'backend/.env') });
const { Pool } = require(require('path').join(nm, 'pg'));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
(async () => {
  const t = await pool.query("SELECT to_regclass('public.verification_requests') AS vr");
  console.log('verification_requests exists:', t.rows[0].vr);
  const c = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' AND column_name IN ('is_verified','verification_type','verified_at','verification_note')");
  console.log('user_profiles verification cols:', c.rows.map(r => r.column_name).join(', ') || 'NONE');
  if (t.rows[0].vr) {
    const u = await pool.query("SELECT conname FROM pg_constraint WHERE conrelid='verification_requests'::regclass");
    console.log('verification_requests constraints:', u.rows.map(r => r.conname).join(', '));
  }
  await pool.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
