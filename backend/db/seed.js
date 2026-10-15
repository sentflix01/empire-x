/**
 * seed.js ? Nodbusiness development seed data
 *
 * Seeds: 50 local synthetic business owners, 150 business profiles, wallets,
 *        conversations/messages, notifications, wallet transactions, coupons,
 *        points, dismissed suggestions, and referral codes.
 *
 * This is the account/business-profile step. Public sites live in `showrooms`
 * and are seeded separately by `seed-showrooms.js`; products/orders are not
 * created by this script.
 *
 * Run from backend after migrations with ALLOW_DEV_SEED=1 and a unique
 * TEST_ACCOUNT_PASSWORD of at least 16 characters.
 * Existing synthetic accounts must be removed with the guarded cleanup script first.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const pool   = require('./poolJsShim.cjs');
const { assertSafeLocalDatabase } = require('./operationSafety');

// ?? Helpers ???????????????????????????????????????????????????????????????????
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
function jitter(lat, lon, km = 0.8) {
  const d = km / 111;
  return { lat: lat + (Math.random() - 0.5) * d, lon: lon + (Math.random() - 0.5) * d };
}

const TEST_PASSWORD  = process.env.TEST_ACCOUNT_PASSWORD;

function validateSeedEnvironment(env = process.env) {
  assertSafeLocalDatabase({
    databaseUrl: env.DATABASE_URL,
    connectionString: env.DATABASE_URL,
    nodeEnv: env.NODE_ENV,
    acknowledgement: env.ALLOW_DEV_SEED,
    acknowledgementName: 'ALLOW_DEV_SEED',
  });
  for (const [label, password] of [['TEST_ACCOUNT_PASSWORD', env.TEST_ACCOUNT_PASSWORD]]) {
    if (typeof password !== 'string' || password.length < 16 || password.length > 128) {
      throw new Error(`Set ${label} to a unique password between 16 and 128 characters`);
    }
  }
}

// ?? Ethiopian names ???????????????????????????????????????????????????????????
const ETHIOPIAN_NAMES = [
  ['Abebe','Girma'],    ['Tigist','Haile'],     ['Dawit','Bekele'],   ['Mekdes','Tadesse'],
  ['Yonas','Alemu'],    ['Hiwot','Mekonnen'],   ['Selam','Assefa'],   ['Biruk','Getachew'],
  ['Rahel','Wolde'],    ['Kaleb','Desta'],       ['Eyerusalem','Tesfaye'],['Natnael','Hailu'],
  ['Meron','Kebede'],   ['Fitsum','Negash'],    ['Bethlehem','Girma'],['Solomon','Bekele'],
  ['Lidya','Abebe'],    ['Mikias','Hailu'],     ['Selamawit','Alemu'],['Henok','Tadesse'],
  ['Aziz','Mohammed'],  ['Kalkidan','Tesfaye'], ['Yordanos','Getahun'],['Robel','Wondimu'],
  ['Tinsae','Legesse'], ['Abrham','Mulugeta'],  ['Hana','Tadesse'],   ['Bezawit','Assefa'],
  ['Yisak','Berhe'],    ['Lemlem','Gebre'],     ['Kibrom','Haileselassie'],['Meklit','Wudu'],
  ['Fikadu','Demeke'],  ['Tigist','Gebre'],     ['Naol','Gadissa'],   ['Liya','Bekele'],
  ['Binyam','Haile'],   ['Sosina','Tesfaye'],   ['Elias','Girma'],    ['Winta','Gebre'],
  ['Seid','Mohammed'],  ['Helina','Bekele'],    ['Natan','Girma'],    ['Adanech','Abebe'],
  ['Kirubel','Alemu'],  ['Yemi','Tadesse'],     ['Fasika','Bekele'],  ['Haben','Haile'],
  ['Ermias','Gebre'],   ['Tsegay','Berhe'],
];
const BUSINESSES_PER_USER = 3;

const ADDIS_DISTRICTS = [
  'Bole','Kirkos','Yeka','Arada','Lideta','Nifas Silk-Lafto',
  'Kolfe Keranio','Gullele','Akaki Kaliti','Lemi Kura',
];

const CENTER = { lat: 9.0192, lon: 38.7525 }; // Addis Ababa center

// ?? Business templates ????????????????????????????????????????????????????????
// These category/template IDs are the values in frontend-next/lib/businessTemplates.ts.
// Keep this local fixture contract in sync with the business creation form.
const BIZ_TEMPLATES = [
  { category: 'restaurant', template: 'restaurant_menu', cta: 'View Menu', sectionTypes: ['hero', 'menu', 'gallery', 'hours', 'contact'], names: ['Yod Abyssinia', 'Kategna Kitchen', 'Totot Kitfo', 'Sunbird Cafe', 'Habesha Grill', 'Tej House'] },
  { category: 'shop', template: 'shop_grid', cta: 'Browse Products', sectionTypes: ['hero', 'featured_products', 'products', 'about', 'features', 'contact'], names: ['Bole Fashion', 'Shiro Meda Textiles', 'Addis Electronics', 'Style Ethiopia', 'Habesha Crafts', 'Tech Zone'] },
  { category: 'service', template: 'service_agency', cta: 'Get a Quote', sectionTypes: ['hero', 'services', 'process', 'testimonials', 'team', 'contact'], names: ['Sur Construction', 'Flintstone Engineering', 'Spark Electric', 'Saba Consulting', 'SIMBA Cleaning', 'EthioTech Solutions'] },
  { category: 'health', template: 'health_clinic', cta: 'Book Appointment', sectionTypes: ['hero', 'services', 'team', 'hours', 'contact'], names: ['Bole Medical Center', 'Addis Wellness Clinic', 'Family Health Hub', 'Bethzatha Clinic', 'Tikur Anbessa Pharmacy'] },
  { category: 'realestate', template: 'realestate_listings', cta: 'View Properties', sectionTypes: ['hero', 'products', 'about', 'testimonials', 'contact'], names: ['Addis Property Group', 'Bole Realty', 'Sunshine Real Estate', 'Capital Homes', 'Gold Key Properties'] },
  { category: 'portfolio', template: 'portfolio_gallery', cta: 'View Portfolio', sectionTypes: ['hero', 'gallery', 'about', 'services', 'contact'], names: ['Addis Creative Studio', 'EthioDesign Lab', 'Pixel Ethiopia', 'Vision Media', 'Habesha Films'] },
];

function getBusinessTemplate(ownerIndex, businessIndex) {
  return BIZ_TEMPLATES[(ownerIndex + businessIndex) % BIZ_TEMPLATES.length];
}

function buildBusinessSections(business, template) {
  return template.sectionTypes.map((type) => {
    const section = { type, title: type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), visible: true };
    if (type === 'hero') return { ...section, title: business.business_name, subtitle: business.business_description, cta: template.cta };
    if (type === 'about') return { ...section, content: business.business_description };
    if (type === 'contact') {
      return { ...section, title: 'Contact Us', email: business.business_contact_email, phone: business.business_contact_phone, location: business.business_address };
    }
    return section;
  });
}

const MSG_SAMPLES = [
  'Hi, is this service still available?','What are your working hours?',
  'Can you come to Bole area?','I am interested, please send more details.',
  'Thank you, I will reach out soon!','Do you offer any discounts?',
  'Great service, will recommend to friends!','When are you available?',
];

// ?? Main ??????????????????????????????????????????????????????????????????????
async function seed() {
  validateSeedEnvironment();
  const client = await pool.connect();
  console.log('\nNodbusiness local seed: 50 synthetic owners, 150 business profiles\n');

  try {
    await client.query('BEGIN');
    const existingSeeds = await client.query(
      `SELECT COUNT(*)::int AS count FROM users
       WHERE is_seed = TRUE AND email LIKE '%@nodbusiness.test'`
    );
    if (existingSeeds.rows[0].count > 0) {
      throw new Error('Synthetic seed accounts already exist. Use the guarded local seed cleanup command before reseeding.');
    }

    const reservedEmailCollision = await client.query(
      `SELECT email FROM users WHERE email = ANY($1::text[]) AND is_seed = FALSE LIMIT 1`,
      [ETHIOPIAN_NAMES.map(([first, last], i) => `${first.toLowerCase()}.${last.toLowerCase()}${i}@nodbusiness.test`)]
    );
    if (reservedEmailCollision.rows.length) {
      throw new Error(`Reserved synthetic email already belongs to a non-seed account: ${reservedEmailCollision.rows[0].email}`);
    }

    const pwHash = await bcrypt.hash(TEST_PASSWORD, 10);

    console.log('Creating 50 synthetic business-owner accounts...');
    const users = [];
    for (let i = 0; i < ETHIOPIAN_NAMES.length; i++) {
      const [first, last] = ETHIOPIAN_NAMES[i];
      const fullName = `${first} ${last}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@nodbusiness.test`;
      const district = ADDIS_DISTRICTS[i % ADDIS_DISTRICTS.length];
      const coords = jitter(CENTER.lat, CENTER.lon, 3);
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_verified, is_seed, is_demo, provider)
         VALUES ($1,$2,$3,'user',TRUE,TRUE,FALSE,'local') RETURNING id`,
        [email, pwHash, fullName]
      );
      const user = { id: rows[0].id, name: fullName, email, district, coords };
      users.push(user);
      await client.query(
        `INSERT INTO user_profiles
           (user_id, display_name, bio, profile_type, has_business_profile,
            is_verified, location, latitude, longitude, headline)
         VALUES ($1,$2,$3,'business',TRUE,$4,$5,$6,$7,'Business owner')`,
        [user.id, fullName, `${fullName} runs a sample local business in ${district}, Addis Ababa.`, i % 5 === 0, `${district}, Addis Ababa`, coords.lat, coords.lon]
      );
      await client.query(
        `INSERT INTO wallets (user_id, balance, currency) VALUES ($1,$2,'ETB')
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, randF(500, 25000)]
      );
    }
    console.log(`  ${users.length} synthetic users created.`);

    console.log('Creating 150 business profiles from current category/template contracts...');
    const businesses = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      let primaryBusiness = null;
      for (let b = 0; b < BUSINESSES_PER_USER; b++) {
        // Rotate the primary business category across all owners while giving
        // each owner three distinct category/template examples.
        const template = getBusinessTemplate(i, b);
        const baseName = template.names[(i + b) % template.names.length];
        const businessName = `${baseName} ${user.district} ${b + 1}`;
        const business = {
          business_name: businessName,
          business_category: template.category,
          business_template: template.template,
          business_description: `${businessName} is a sample ${template.category} business serving customers in ${user.district}, Addis Ababa.`,
          business_theme_color: pick(['#D4AF37', '#2563eb', '#7c3aed', '#f59e0b', '#10b981', '#ef4444']),
          business_contact_email: user.email,
          business_contact_phone: `+251 9${rand(10, 99)} ${rand(100, 999)} ${rand(1000, 9999)}`,
          business_address: `${user.district}, Addis Ababa, Ethiopia`,
        };
        const sections = JSON.stringify(buildBusinessSections(business, template));
        const coords = jitter(user.coords.lat, user.coords.lon, 0.5);
        const { rows: businessRows } = await client.query(
          `INSERT INTO businesses
             (owner_id, business_name, business_category, business_template,
              business_description, business_sections, business_theme_color,
              business_contact_email, business_contact_phone, business_address,
              latitude, longitude)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [user.id, business.business_name, business.business_category, business.business_template,
            business.business_description, sections, business.business_theme_color,
            business.business_contact_email, business.business_contact_phone, business.business_address,
            coords.lat, coords.lon]
        );
        const record = { id: businessRows[0].id, owner: user, ...business, business_sections: sections };
        businesses.push(record);
        if (!primaryBusiness) primaryBusiness = record;
      }

      // BusinessCreate and ProfileEdit store business fields in both records.
      await client.query(
        `UPDATE user_profiles SET
           business_name=$1, business_category=$2, business_template=$3,
           business_description=$4, business_sections=$5, business_theme_color=$6,
           business_contact_email=$7, business_contact_phone=$8, business_address=$9,
           updated_at=NOW()
         WHERE user_id=$10`,
        [primaryBusiness.business_name, primaryBusiness.business_category, primaryBusiness.business_template,
          primaryBusiness.business_description, primaryBusiness.business_sections, primaryBusiness.business_theme_color,
          primaryBusiness.business_contact_email, primaryBusiness.business_contact_phone, primaryBusiness.business_address,
          user.id]
      );
    }
    console.log(`  ${businesses.length} business profiles created.`);

    console.log('?? Creating conversations & messages...');
    let convCount = 0;
    for (let i = 0; i < 25; i++) {
      const userA = users[i % users.length];
      const userB = users[(i + 7) % users.length];
      if (userA.id === userB.id) continue;
      const { rows } = await client.query(
        `INSERT INTO conversations
           (participant_ids, participant_names, type, last_message, last_message_at)
         VALUES ($1,$2,'dm',$3, NOW() - ($4 || ' hours')::INTERVAL) RETURNING id`,
        [
          JSON.stringify([userA.id, userB.id]),
          JSON.stringify([userA.name, userB.name]),
          pick(MSG_SAMPLES), rand(0, 72),
        ]
      );
      const cid = rows[0].id;
      for (const speaker of [userA, userB, userA]) {
        await client.query(
          `INSERT INTO messages (conversation_id, sender_id, sender_name, content, type)
           VALUES ($1,$2,$3,$4,'text')`,
          [cid, speaker.id, speaker.name, pick(MSG_SAMPLES)]
        );
      }
      convCount++;
    }
    console.log(`  ? ${convCount} conversations\n`);

    // ?? 12. Notifications ?????????????????????????????????????????????????????
    console.log('?? Creating notifications...');
    const NOTIFS = [
      { type: 'like',    title: 'New like on your post',   body: 'Someone liked your post.',       link: '/feed' },
      { type: 'comment', title: 'New comment',             body: 'Someone commented on your post.',link: '/feed' },
      { type: 'follow',  title: 'New follower',            body: 'Someone started following you.', link: '/profile' },
      { type: 'message', title: 'New message',             body: 'You have a new message.',         link: '/messages' },
    ];
    let notifCount = 0;
    for (const user of users.slice(0, 40)) {
      for (let n = 0; n < rand(2, 5); n++) {
        const notif = pick(NOTIFS);
        await client.query(
          `INSERT INTO notifications (user_id, type, title, body, link, is_read)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [user.id, notif.type, notif.title, notif.body, notif.link, n > 1]
        );
        notifCount++;
      }
    }
    console.log(`  ? ${notifCount} notifications\n`);

    // ?? 13. Wallet transactions ???????????????????????????????????????????????
    console.log('?? Creating wallet transactions...');
    let txCount = 0;
    for (const user of users.slice(0, 30)) {
      const { rows: wRows } = await client.query(
        `SELECT id FROM wallets WHERE user_id = $1`, [user.id]
      );
      if (!wRows.length) continue;
      const wid = wRows[0].id;
      for (let t = 0; t < 2; t++) {
        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, type, amount, description)
           VALUES ($1,$2,$3,$4)`,
          [wid, pick(['credit','credit','debit']), randF(100, 2000),
           pick(['Order payment received','Wallet top-up','Service payment','Referral bonus'])]
        );
        txCount++;
      }
    }
    console.log(`  ? ${txCount} wallet transactions\n`);

    // ?? 14. Coupons ???????????????????????????????????????????????????????????
    console.log('???  Creating coupons...');
    const COUPON_CODES = ['ADDIS10','BOLE20','NODBUSINESS15','HABESHA25','NEWUSER30'];
    for (let i = 0; i < 20; i++) {
      const seller = users[i % users.length];
      await client.query(
        `INSERT INTO coupons
           (seller_id, code, discount_type, discount_value, min_order,
            usage_limit, is_active, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE, NOW() + INTERVAL '60 days')
         ON CONFLICT DO NOTHING`,
        [seller.id, `${COUPON_CODES[i % COUPON_CODES.length]}${i}`,
         i % 2 === 0 ? 'percentage' : 'fixed',
         i % 2 === 0 ? rand(5, 30) : rand(20, 100),
         rand(100, 500), rand(10, 100)]
      );
    }
    console.log('  ? 20 coupons\n');

    // ?? 15. Referral codes ????????????????????????????????????????????????????
    console.log('?? Assigning referral codes...');
    for (const user of users) {
      const code = `HL${user.name.replace(/\s/g,'').toUpperCase().slice(0,4)}${Math.floor(Math.random()*9000+1000)}`;
      await client.query(
        `UPDATE users SET referral_code = $1 WHERE id = $2 AND referral_code IS NULL`,
        [code, user.id]
      );
    }
    console.log('  ? Referral codes assigned\n');

    // ?? 16. Point transactions ????????????????????????????????????????????????
    console.log('? Creating point transactions...');
    let ptCount = 0;
    for (const user of users.slice(0, 20)) {
      const pts = rand(20, 200);
      await client.query(
        `INSERT INTO point_transactions (user_id, points, type, reason)
         VALUES ($1,$2,'earn',$3)`,
        [user.id, pts, pick(['Referral signup bonus','Profile completed','First post published'])]
      );
      await client.query(
        `UPDATE user_profiles SET points = points + $1 WHERE user_id = $2`,
        [pts, user.id]
      );
      ptCount++;
    }
    console.log(`  ? ${ptCount} point transactions\n`);

    // ?? 17. Dismissed suggestions ?????????????????????????????????????????????
    console.log('?? Creating dismissed suggestions...');
    let dismissCount = 0;
    const dismissPairs = new Set();
    for (const user of users.slice(0, 15)) {
      for (const target of [...users].sort(() => 0.5 - Math.random()).slice(0, rand(1, 3))) {
        if (target.id === user.id) continue;
        const key = `${user.id}-${target.id}`;
        if (dismissPairs.has(key)) continue;
        dismissPairs.add(key);
        await client.query(
          `INSERT INTO dismissed_suggestions (requester_id, target_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [user.id, target.id]
        );
        dismissCount++;
      }
    }
    console.log(`  ? ${dismissCount} dismissed suggestions\n`);

    console.log('?? SEED COMPLETE!\n');
    console.log('?? Records created by this run:');
    console.log(`   Synthetic users:       ${users.length}`);
    console.log(`   Business profiles:     ${businesses.length}`);
    console.log(`   Conversations:         ${convCount}`);
    console.log(`   Messages:              ${convCount * 3}`);
    console.log(`   Notifications:         ${notifCount}`);
    console.log(`   Wallet transactions:   ${txCount}`);
    console.log(`   Coupons attempted:     20`);
    console.log(`   Point transactions:    ${ptCount}`);
    console.log(`   Dismissed suggestions: ${dismissCount}`);
    console.log('   Public showrooms:      0 (created separately by seed-showrooms.js)');
    console.log('   Products and orders:   0');
    await client.query('COMMIT');
    console.log('\nSeed-user passwords use TEST_ACCOUNT_PASSWORD. Synthetic accounts are local development data.\n');

  } catch (err) {
    console.error('\n? Seed failed:', err.message);
    console.error(err.stack);
    await client.query('ROLLBACK').catch(() => undefined);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed().catch((error) => {
    console.error(`Seed refused or failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { seed, validateSeedEnvironment, buildBusinessSections, getBusinessTemplate, BIZ_TEMPLATES, ETHIOPIAN_NAMES, BUSINESSES_PER_USER };
