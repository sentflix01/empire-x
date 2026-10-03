require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

const schema = `
-- ?? Migration 7: Ticker opt-in defaults ?????????????????????????????????????
-- Add ticker_type column if it doesn't exist (was missing from the original schema)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ticker_type TEXT DEFAULT 'none';

-- Change ticker_type default from 'auto' to 'none' so new profiles start with ticker off
ALTER TABLE user_profiles ALTER COLUMN ticker_type SET DEFAULT 'none';

-- Backfill: existing profiles that have no ticker_text should be set to 'none'
-- (they may have been created with default 'auto' but have no message to show)
UPDATE user_profiles
SET ticker_type = 'none'
WHERE (ticker_text IS NULL OR TRIM(ticker_text) = '')
  AND ticker_type = 'auto';

-- Backfill: profiles that do have ticker_text should be kept or upgraded to 'auto' if type is null
UPDATE user_profiles
SET ticker_type = 'auto'
WHERE ticker_text IS NOT NULL
  AND TRIM(ticker_text) != ''
  AND (ticker_type IS NULL OR ticker_type = 'none');
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 7 (ticker opt-in defaults)...');
    await client.query(schema);
    console.log('? Migration 7 complete.');
  } catch (err) {
    console.error('? Migration 7 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
