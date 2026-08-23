/**
 * fix-dev-accounts.js
 * Upserts the two dev accounts with the correct nodbusiness.app emails.
 * Run once: node db/fix-dev-accounts.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  const adminHash = await bcrypt.hash('Admin1234!', 12);
  const testHash  = await bcrypt.hash('Test1234!',  12);

  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, is_verified, provider)
     VALUES ($1, $2, 'Admin User', 'admin', TRUE, 'local')
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           is_verified   = TRUE,
           role          = 'admin'`,
    ['admin@nodbusiness.app', adminHash]
  );
  console.log('admin@nodbusiness.app upserted');

  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, is_verified, provider)
     VALUES ($1, $2, 'Test User', 'user', TRUE, 'local')
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           is_verified   = TRUE`,
    ['test@nodbusiness.app', testHash]
  );
  console.log('test@nodbusiness.app upserted');

  const r = await pool.query(
    "SELECT email, role, is_verified FROM users WHERE email LIKE '%nodbusiness.app' ORDER BY role"
  );
  console.log('\nAccounts in DB:');
  console.table(r.rows);
  await pool.end();
}

fix().catch(e => { console.error('Error:', e.message); pool.end(); });
