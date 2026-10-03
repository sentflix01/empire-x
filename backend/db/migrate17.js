/**
 * migrate17.js ? Add missing user_profile columns for full ProfileEdit support
 *
 * The ProfileEdit view sends: social_linkedin, social_twitter, social_instagram,
 * social_facebook, social_youtube, website, phone, languages, certifications,
 * awards, services, service_areas, business_website, business_founded_year,
 * business_team_size, business_registration_number, business_type,
 * business_social_linkedin, business_social_twitter, business_social_facebook,
 * extra_json, business_extra_json
 *
 * Run: node db/migrate17.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

const schema = `
-- Personal social links
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS social_linkedin    TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS social_twitter     TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS social_instagram   TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS social_facebook    TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS social_youtube     TEXT;

-- Personal contact
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS website            TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS languages          TEXT;  -- JSON array

-- Business professional extras
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_website             TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_founded_year        TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_team_size           TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_registration_number TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_type                TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_social_linkedin     TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_social_twitter      TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_social_facebook     TEXT;

-- Business lists (stored as JSON)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS certifications TEXT;   -- JSON array
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS awards         TEXT;   -- JSON array
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS services       TEXT;   -- JSON array
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS service_areas  TEXT;   -- JSON array

-- Generic overflow JSON buckets
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS extra_json           JSONB DEFAULT '{}';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_extra_json  JSONB DEFAULT '{}';
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 17 ? add missing profile columns...');
    await client.query(schema);
    console.log('? Migration 17 complete ? all profile columns added.');
  } catch (err) {
    console.error('? Migration 17 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
