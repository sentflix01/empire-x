require('dotenv').config();
const pool = require('./db/pool');

(async () => {
  try {
    const r = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' ORDER BY ordinal_position"
    );
    console.log('user_profiles columns:', r.rows.map(x => x.column_name).join(', '));
    
    // Test a profile update with the fields the frontend sends
    const testResult = await pool.query(
      "SELECT id, user_id FROM user_profiles LIMIT 1"
    );
    if (testResult.rows.length) {
      console.log('Sample profile id:', testResult.rows[0].id);
    } else {
      console.log('No profiles found');
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
