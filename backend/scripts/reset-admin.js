/**
 * reset-admin.js — One-time admin credential reset script
 *
 * Usage (run from backend/ directory):
 *   node scripts/reset-admin.js
 *
 * What it does:
 *   1. Finds the first admin user in the database
 *   2. Resets their password to the value in ADMIN_NEW_PASSWORD env var
 *      (defaults to a strong generated password if not set)
 *   3. Prints the admin email + new password to stdout
 *   4. DELETE THIS FILE after running — do not leave in production
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('../db/pool');

async function resetAdmin() {
  try {
    // Find admin user
    const { rows } = await pool.query(
      "SELECT id, email FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1"
    );

    if (!rows.length) {
      // No admin found — create one
      console.log('No admin user found. Creating one...');
      const newPassword = process.env.ADMIN_NEW_PASSWORD || 'Halehame@Admin2026!';
      const hash = await bcrypt.hash(newPassword, 12);

      const { rows: created } = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_verified)
         VALUES ($1, $2, $3, 'admin', TRUE) RETURNING id, email`,
        ['admin@halehame.app', hash, 'Admin User']
      );

      console.log('\n✅ Admin user CREATED:');
      console.log('   Email   :', created[0].email);
      console.log('   Password:', newPassword);
      console.log('\n⚠️  DELETE this script after use!\n');
      process.exit(0);
    }

    const admin = rows[0];
    const newPassword = process.env.ADMIN_NEW_PASSWORD || 'Halehame@Admin2026!';
    const hash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      'UPDATE users SET password_hash = $1, is_verified = TRUE WHERE id = $2',
      [hash, admin.id]
    );

    console.log('\n✅ Admin password RESET:');
    console.log('   Email   :', admin.email);
    console.log('   Password:', newPassword);
    console.log('\n⚠️  DELETE this script after use!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetAdmin();
