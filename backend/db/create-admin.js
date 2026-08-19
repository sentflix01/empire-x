require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function createAdmin() {
  const hash = await bcrypt.hash('Admin1234!', 10);

  // Create simple admin account
  await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role, is_verified, provider)
    VALUES ('admin@nodbusiness.app', $1, 'Admin User', 'admin', TRUE, 'local')
    ON CONFLICT (email) DO UPDATE
      SET password_hash = $1, role = 'admin', is_verified = TRUE
  `, [hash]);

  // Create a test user too
  const hash2 = await bcrypt.hash('Test1234!', 10);
  await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role, is_verified, provider)
    VALUES ('test@nodbusiness.app', $1, 'Test User', 'user', TRUE, 'local')
    ON CONFLICT (email) DO UPDATE
      SET password_hash = $1, is_verified = TRUE
  `, [hash2]);

  // Create profile for admin
  const adminUser = await pool.query(`SELECT id FROM users WHERE email = 'admin@nodbusiness.app'`);
  if (adminUser.rows.length) {
    const adminId = adminUser.rows[0].id;
    const existing = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [adminId]);
    if (!existing.rows.length) {
      await pool.query(
        `INSERT INTO user_profiles (user_id, display_name, bio, profile_type, has_business_profile)
         VALUES ($1, 'Admin User', 'Platform administrator', 'personal', FALSE)`,
        [adminId]
      );
    }
  }

  // Create profile for test user
  const testUser = await pool.query(`SELECT id FROM users WHERE email = 'test@nodbusiness.app'`);
  if (testUser.rows.length) {
    const testId = testUser.rows[0].id;
    const existing = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [testId]);
    if (!existing.rows.length) {
      await pool.query(
        `INSERT INTO user_profiles (user_id, display_name, bio, profile_type) VALUES ($1, 'Test User', 'Test account', 'personal')`,
        [testId]
      );
    }
  }

  console.log('\n✅ Accounts ready:');
  console.log('   Admin:  admin@nodbusiness.app  /  Admin1234!');
  console.log('   Test:   test@nodbusiness.app   /  Test1234!\n');
  await pool.end();
}

createAdmin().catch(err => { console.error(err); process.exit(1); });
