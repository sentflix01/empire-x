/**
 * seed.js ? Nodbusiness development seed data
 *
 * Seeds: 50 Ethiopian users, 150 businesses (no showrooms/products),
 *        posts, hashtags,
 *        follows, likes, comments, stories, conversations, messages,
 *        notifications, wallet transactions, coupons, point transactions,
 *        saves, dismissed_suggestions, referral codes.
 *
 * NOT seeded: products, showrooms, orders (created by real users through the app).
 *
 * Run: node db/seed.js
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
const ADMIN_PASSWORD = process.env.ADMIN_NEW_PASSWORD;

function validateSeedEnvironment(env = process.env) {
  assertSafeLocalDatabase({
    databaseUrl: env.DATABASE_URL,
    connectionString: env.DATABASE_URL,
    nodeEnv: env.NODE_ENV,
    acknowledgement: env.ALLOW_DEV_SEED,
    acknowledgementName: 'ALLOW_DEV_SEED',
  });
  for (const [label, password] of [['ADMIN_NEW_PASSWORD', env.ADMIN_NEW_PASSWORD], ['TEST_ACCOUNT_PASSWORD', env.TEST_ACCOUNT_PASSWORD]]) {
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

const ADDIS_DISTRICTS = [
  'Bole','Kirkos','Yeka','Arada','Lideta','Nifas Silk-Lafto',
  'Kolfe Keranio','Gullele','Akaki Kaliti','Lemi Kura',
];

const CENTER = { lat: 9.0192, lon: 38.7525 }; // Addis Ababa center

// ?? Business templates ????????????????????????????????????????????????????????
const BIZ_TEMPLATES = [
  { category: 'restaurant',  template: 'restaurant',   names: ['Yod Abyssinia','Kategna Kitchen','Totot Kitfo','Sunbird Cafe','Habesha Grill','Tej House','Addis Bites','Timket Restaurant'] },
  { category: 'shop',        template: 'retail_store',  names: ['Bole Fashion','Shiro Meda Textiles','Addis Electronics','Style Ethiopia','Habesha Crafts','Tech Zone','Merkato Store'] },
  { category: 'service',     template: 'agency',        names: ['Sur Construction','Flintstone Engineering','Spark Electric','Saba Consulting','SIMBA Cleaning','EthioTech Solutions','Addis Logistics'] },
  { category: 'health',      template: 'clinic',        names: ['Bole Medical Center','Addis Wellness Clinic','Family Health Hub','Nodbusiness Health','Bethzatha Clinic','Tikur Anbessa Pharmacy'] },
  { category: 'realestate',  template: 'real_estate',   names: ['Addis Property Group','Bole Realty','Sunshine Real Estate','Capital Homes','Gold Key Properties'] },
  { category: 'portfolio',   template: 'portfolio',     names: ['Addis Creative Studio','EthioDesign Lab','Pixel Ethiopia','Vision Media','Habesha Films'] },
];

// ?? Content data ??????????????????????????????????????????????????????????????
const POST_CONTENTS = [
  'Just launched my new showroom on Nodbusiness! Check out our latest collection ??? #AddisAbaba',
  'Ethiopian coffee is the best in the world ? Proud to share our culture globally.',
  'Shout out to everyone building businesses in Ethiopia ???? Keep going, keep growing! #EthiopianBusiness',
  'Morning view from Entoto Hill ?? The city never looked more beautiful. #AddisVibes',
  'Just completed a big project for a client in Bole. So proud of our team! ?? #EthioTech',
  'Fresh injera from my grandma\'s recipe ?? Some traditions should never change. #HabeshaLife',
  'Looking for a 2-bedroom apartment in Yeka ? anyone know a good place? ??',
  'Big sale this weekend ? up to 30% off on all leather goods! ?? #Merkato',
  'Our delivery team completed 50 orders this week. Thank you Nodbusiness community! ??',
  'The future of global e-commerce is here. Proud to be an early seller! ??',
  'My showroom hit 1000 views this month! Thank you everyone who checked it out ??',
  'Pro tip: Use Nodbusiness\'s nearby map to find the best local shops around you ??',
  'Anyone want to collaborate on a social media project? DM me! ?? #CreativeEthiopia',
  'New arrivals just dropped at my showroom. Check it out now! ?',
  'Proud Ethiopian entrepreneur sharing my journey on Nodbusiness ???? #StartupEthiopia',
];

const HASHTAGS = [
  'AddisAbaba','Ethiopia','Nodbusiness','HabeshaLife','EthiopianBusiness',
  'Bole','Merkato','EthioTech','AddisVibes','AfricanEntrepreneur',
  'ShegerCity','EthioBeauty','AddisFood','EthioFashion','StartupEthiopia',
];

const COMMENTS = [
  'Great post! ??','This is exactly what I needed!','Amazing work, keep it up! ??',
  'Very helpful, thanks!','Love this! ??','Sharing this with my friends.',
  'Perfect timing!','Will definitely try this!','Quality looks great ??',
];

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
  console.log('\n?? Nodbusiness Seed ? 50 users, 150 businesses, no products\n');

  try {
    await client.query('BEGIN');
    const pwHash    = await bcrypt.hash(TEST_PASSWORD, 10);
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

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
      for (const target of users.sort(() => 0.5 - Math.random()).slice(0, rand(1, 3))) {
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

    // ?? Summary ???????????????????????????????????????????????????????????????
    const [uR, bR, shR, poR, fR, mR] = await Promise.all([
      client.query(`SELECT COUNT(*) FROM users       WHERE is_seed = TRUE`),
      client.query(`SELECT COUNT(*) FROM businesses`),
      client.query(`SELECT COUNT(*) FROM showrooms`),
      client.query(`SELECT COUNT(*) FROM posts`),
      client.query(`SELECT COUNT(*) FROM follows`),
      client.query(`SELECT COUNT(*) FROM messages`),
    ]);

    console.log('?? SEED COMPLETE!\n');
    console.log('?? Summary:');
    console.log(`   Seed users:    ${uR.rows[0].count}`);
    console.log(`   Businesses:    ${bR.rows[0].count}`);
    console.log(`   Showrooms:     ${shR.rows[0].count}`);
    console.log(`   Posts:         ${poR.rows[0].count}`);
    console.log(`   Follows:       ${fR.rows[0].count}`);
    console.log(`   Messages:      ${mR.rows[0].count}`);
    console.log(`   Products:      0 (sellers create their own)`);
    await client.query('COMMIT');
    console.log('\n?? Local dev accounts: admin@nodbusiness.app and test@nodbusiness.app (passwords supplied securely through environment variables).');
    console.log('   Seed-user passwords use TEST_ACCOUNT_PASSWORD.\n');

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

module.exports = { seed, validateSeedEnvironment };
