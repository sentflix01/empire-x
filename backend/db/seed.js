/**
 * seed.js — Nodbusiness development seed data
 *
 * Seeds: 50 Ethiopian users, 150 businesses (no showrooms/products),
 *        posts, hashtags, tasks, jobs, events, courses+lessons,
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
const pool   = require('./pool');

// ── Helpers ───────────────────────────────────────────────────────────────────
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
function jitter(lat, lon, km = 0.8) {
  const d = km / 111;
  return { lat: lat + (Math.random() - 0.5) * d, lon: lon + (Math.random() - 0.5) * d };
}

const TEST_PASSWORD  = 'Test1234!';
const ADMIN_PASSWORD = 'Admin1234!';

// ── Ethiopian names ───────────────────────────────────────────────────────────
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

// ── Business templates ────────────────────────────────────────────────────────
const BIZ_TEMPLATES = [
  { category: 'restaurant',  template: 'restaurant',   names: ['Yod Abyssinia','Kategna Kitchen','Totot Kitfo','Sunbird Cafe','Habesha Grill','Tej House','Addis Bites','Timket Restaurant'] },
  { category: 'shop',        template: 'retail_store',  names: ['Bole Fashion','Shiro Meda Textiles','Addis Electronics','Style Ethiopia','Habesha Crafts','Tech Zone','Merkato Store'] },
  { category: 'service',     template: 'agency',        names: ['Sur Construction','Flintstone Engineering','Spark Electric','Saba Consulting','SIMBA Cleaning','EthioTech Solutions','Addis Logistics'] },
  { category: 'health',      template: 'clinic',        names: ['Bole Medical Center','Addis Wellness Clinic','Family Health Hub','Nodbusiness Health','Bethzatha Clinic','Tikur Anbessa Pharmacy'] },
  { category: 'realestate',  template: 'real_estate',   names: ['Addis Property Group','Bole Realty','Sunshine Real Estate','Capital Homes','Gold Key Properties'] },
  { category: 'portfolio',   template: 'portfolio',     names: ['Addis Creative Studio','EthioDesign Lab','Pixel Ethiopia','Vision Media','Habesha Films'] },
];

// ── Content data ──────────────────────────────────────────────────────────────
const POST_CONTENTS = [
  'Just launched my new showroom on Nodbusiness! Check out our latest collection 🛍️ #AddisAbaba',
  'Looking for reliable freelancers in Addis? Post your task on Nodbusiness and get bids fast! 💼',
  'Ethiopian coffee is the best in the world ☕ Proud to share our culture globally.',
  'Shout out to everyone building businesses in Ethiopia 🇪🇹 Keep going, keep growing! #EthiopianBusiness',
  'Morning view from Entoto Hill 🌄 The city never looked more beautiful. #AddisVibes',
  'Just completed a big project for a client in Bole. So proud of our team! 💪 #EthioTech',
  'Anyone else loving the new Nodbusiness features? The task board is a game changer! 🚀',
  'Fresh injera from my grandma\'s recipe ❤️ Some traditions should never change. #HabeshaLife',
  'Looking for a 2-bedroom apartment in Yeka — anyone know a good place? 🏠',
  'Big sale this weekend — up to 30% off on all leather goods! 🔥 #Merkato',
  'Our delivery team completed 50 orders this week. Thank you Nodbusiness community! 🙏',
  'The future of global e-commerce is here. Proud to be an early seller! 🌍',
  'Live music event at the city theater next Friday 🎵 Who\'s coming?',
  'New course on digital marketing for entrepreneurs — just enrolled! 📚 #Growth',
  'Found the perfect contractor through Nodbusiness Tasks. Highly recommend! 👏',
  'My showroom hit 1000 views this month! Thank you everyone who checked it out 🏪',
  'Pro tip: Use Nodbusiness\'s nearby map to find the best local shops around you 📍',
  'Anyone want to collaborate on a social media project? DM me! 🤝 #CreativeEthiopia',
  'New arrivals just dropped at my showroom. Check it out now! ✨',
  'Proud Ethiopian entrepreneur sharing my journey on Nodbusiness 🇪🇹 #StartupEthiopia',
];

const TASK_SAMPLES = [
  { type: 'delivery', title: 'Deliver package from Bole to Kirkos',            payment: [50,  150], desc: 'Small package, needs same-day delivery. About 5km.' },
  { type: 'grocery',  title: 'Buy and deliver groceries from Shoa Supermarket', payment: [80,  200], desc: 'Shopping list provided. Need someone with transport.' },
  { type: 'moving',   title: 'Help moving furniture — 2 rooms',                 payment: [300, 800], desc: 'Moving from Yeka to Bole. Need helpers and a vehicle.' },
  { type: 'cleaning', title: 'Deep clean 3-bedroom apartment in Nifas Silk',    payment: [400, 900], desc: 'Full apartment cleaning. Bring your own equipment.' },
  { type: 'handyman', title: 'Fix leaking pipe in kitchen',                     payment: [150, 400], desc: 'Small plumbing job. Should take under an hour.' },
  { type: 'tutoring', title: 'Math tutor needed for Grade 10 student',          payment: [100, 250], desc: '2 sessions per week, 1.5 hours each. Addis area.' },
  { type: 'other',    title: 'Translate document English to Amharic',           payment: [200, 500], desc: '3-page business contract — accurate translation needed.' },
  { type: 'delivery', title: 'Pick up passport from embassy and deliver safely', payment: [100, 300], desc: 'Must be reliable. Receipt required.' },
];

const JOB_SAMPLES = [
  { title: 'Frontend Developer (React/Next.js)',  type: 'full_time',  cat: 'Technology',  salMin: 15000, salMax: 35000, desc: 'Skilled React developer to join our team in Addis. 2+ years required.' },
  { title: 'Sales Representative — Bole Area',   type: 'full_time',  cat: 'Sales',       salMin: 8000,  salMax: 18000, desc: 'B2B sales for consumer goods brand. Commission bonuses.' },
  { title: 'Graphic Designer',                   type: 'freelance',  cat: 'Design',      salMin: 5000,  salMax: 15000, desc: 'Freelance designer for brand materials and social media.' },
  { title: 'Accountant (Part-Time)',              type: 'part_time',  cat: 'Finance',     salMin: 6000,  salMax: 12000, desc: 'Bookkeeping and monthly financial reports for a small business.' },
  { title: 'Delivery Driver — Own Motorbike',    type: 'contract',   cat: 'Logistics',   salMin: 7000,  salMax: 14000, desc: 'Daily delivery runs across Addis Ababa. Fuel allowance included.' },
  { title: 'Customer Service Agent',             type: 'full_time',  cat: 'Service',     salMin: 7000,  salMax: 12000, desc: 'Handle customer inquiries. Fluent Amharic + English required.' },
];

const EVENT_SAMPLES = [
  { title: 'Global Tech Summit 2026',          ticket: 200, cap: 300, desc: 'Annual gathering of tech founders, developers, and investors from around the world.' },
  { title: 'Entrepreneurs Meetup',             ticket: 0,   cap: 100, desc: 'Free monthly meetup for small business owners to share and grow together.' },
  { title: 'Live Music Evening',               ticket: 150, cap: 200, desc: 'Live cultural music performance at the city theater. Dinner included.' },
  { title: 'Digital Marketing Workshop',       ticket: 500, cap: 50,  desc: 'Full-day workshop — Instagram ads, TikTok, and growing your brand online.' },
  { title: 'Business & Commerce Festival',     ticket: 100, cap: 500, desc: '2-day outdoor festival celebrating local businesses and products from all regions.' },
];

const COURSE_SAMPLES = [
  { title: 'Start Your Business in Ethiopia', price: 500, level: 'beginner',     cat: 'Business',    desc: 'Step-by-step guide to registering and launching a business in Ethiopia.' },
  { title: 'Mobile Photography Mastery',      price: 300, level: 'beginner',     cat: 'Photography', desc: 'Take professional photos with just your smartphone. 3 hours + assignments.' },
  { title: 'Advanced Excel for Accountants',  price: 700, level: 'intermediate', cat: 'Finance',     desc: 'Pivot tables, financial modeling, and data analysis. Certificate included.' },
  { title: 'Amharic for Business Writing',    price: 400, level: 'beginner',     cat: 'Language',    desc: 'Write professional emails, reports, and proposals in formal Amharic.' },
  { title: 'Digital Marketing Fundamentals',  price: 600, level: 'beginner',     cat: 'Marketing',   desc: 'Facebook Ads, Google Ads, SEO basics, and building your online presence.' },
];

const HASHTAGS = [
  'AddisAbaba','Ethiopia','Nodbusiness','HabeshaLife','EthiopianBusiness',
  'Bole','Merkato','EthioTech','AddisVibes','AfricanEntrepreneur',
  'ShegerCity','EthioBeauty','AddisFood','EthioFashion','StartupEthiopia',
];

const COMMENTS = [
  'Great post! 🙌','This is exactly what I needed!','Amazing work, keep it up! 💪',
  'Very helpful, thanks!','Love this! 😍','Sharing this with my friends.',
  'Perfect timing!','Will definitely try this!','Quality looks great 👌',
];

const MSG_SAMPLES = [
  'Hi, is this service still available?','What are your working hours?',
  'Can you come to Bole area?','I am interested, please send more details.',
  'Thank you, I will reach out soon!','Do you offer any discounts?',
  'Great service, will recommend to friends!','When are you available?',
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  const client = await pool.connect();
  console.log('\n🌱 Nodbusiness Seed — 50 users, 150 businesses, no products\n');

  try {
    const pwHash    = await bcrypt.hash(TEST_PASSWORD, 10);
    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // ── Dev accounts (is_seed = FALSE — never touched by cleanup) ──────────
    console.log('🔑 Ensuring dev accounts...');
    const devAccounts = [
      { email: 'admin@nodbusiness.app', hash: adminHash, name: 'Admin User', role: 'admin', bal: 50000 },
      { email: 'test@nodbusiness.app',  hash: pwHash,    name: 'Test User',  role: 'user',  bal: 5000  },
    ];
    for (const acc of devAccounts) {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_verified, is_seed, provider)
         VALUES ($1,$2,$3,$4,TRUE,FALSE,'local')
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
        [acc.email, acc.hash, acc.name, acc.role]
      );
      const uid = rows[0].id;
      await client.query(
        `INSERT INTO user_profiles (user_id, display_name, bio, profile_type, is_verified, location, latitude, longitude)
         VALUES ($1,$2,$3,'personal',TRUE,'Bole, Addis Ababa',9.0050,38.7910)
         ON CONFLICT DO NOTHING`,
        [uid, acc.name, `${acc.name} — Nodbusiness dev account`]
      );
      await client.query(
        `INSERT INTO wallets (user_id, balance, currency) VALUES ($1,$2,'ETB')
         ON CONFLICT (user_id) DO UPDATE SET balance = $2`,
        [uid, acc.bal]
      );
    }
    console.log(`  ✅ admin@nodbusiness.app / ${ADMIN_PASSWORD}`);
    console.log(`  ✅ test@nodbusiness.app  / ${TEST_PASSWORD}\n`);

    // ── 1. 50 seed users ─────────────────────────────────────────────────────
    console.log('👥 Creating 50 seed users...');
    const users = [];
    for (let i = 0; i < 50; i++) {
      const [first, last] = ETHIOPIAN_NAMES[i];
      const email    = `${first.toLowerCase()}.${last.toLowerCase()}${i}@nodbusiness.test`;
      const district = pick(ADDIS_DISTRICTS);
      const coords   = jitter(CENTER.lat, CENTER.lon, 3);
      const isBiz    = i % 3 === 0; // every 3rd user has a business profile
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_verified, is_seed, provider)
         VALUES ($1,$2,$3,'user',TRUE,TRUE,'local')
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id`,
        [email, pwHash, `${first} ${last}`]
      );
      const uid = rows[0].id;
      await client.query(
        `INSERT INTO user_profiles
           (user_id, display_name, bio, profile_type, has_business_profile,
            is_verified, location, latitude, longitude, headline,
            follower_count, following_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          uid, `${first} ${last}`,
          `${first} ${last} — entrepreneur and community member in ${district}, Addis Ababa.`,
          isBiz ? 'business' : 'personal', isBiz,
          i % 5 === 0,
          `${district}, Addis Ababa`,
          coords.lat, coords.lon,
          pick(['Entrepreneur','Business Owner','Freelancer','Developer','Designer','Seller','Student', null]),
          rand(0, 800), rand(0, 400),
        ]
      );
      await client.query(
        `INSERT INTO wallets (user_id, balance, currency) VALUES ($1,$2,'ETB')
         ON CONFLICT (user_id) DO NOTHING`,
        [uid, randF(500, 25000)]
      );
      users.push({ id: uid, name: `${first} ${last}`, email, district, coords });
    }
    console.log(`  ✅ ${users.length} users\n`);

    // ── 2. 150 businesses (3 per user) — no showrooms, those are created by real users ──
    console.log('🏢 Creating 150 businesses...');
    const businesses = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      for (let b = 0; b < 3; b++) {
        const tmpl   = BIZ_TEMPLATES[(i * 3 + b) % BIZ_TEMPLATES.length];
        const bName  = `${pick(tmpl.names)} ${user.district}`.trim();
        const coords = jitter(user.coords.lat, user.coords.lon, 0.5);
        const color  = pick(['#D4AF37','#2563eb','#7c3aed','#f59e0b','#10b981','#ef4444']);
        const phone  = `+251 9${rand(10,99)} ${rand(100,999)} ${rand(1000,9999)}`;

        const { rows: bRows } = await client.query(
          `INSERT INTO businesses
             (owner_id, business_name, business_category, business_template,
              business_description, business_theme_color,
              business_contact_email, business_contact_phone,
              business_address, latitude, longitude)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [
            user.id, bName, tmpl.category, tmpl.template,
            `${bName} is a trusted ${tmpl.category} business serving ${user.district}, Addis Ababa.`,
            color, `contact@nodbusiness.et`, phone,
            `${user.district}, Addis Ababa, Ethiopia`,
            coords.lat, coords.lon,
          ]
        );
        businesses.push({ id: bRows[0].id, name: bName, category: tmpl.category, owner: user, coords });
      }
    }
    console.log(`  ✅ ${businesses.length} businesses\n`);

    // ── 3. Posts + hashtags ───────────────────────────────────────────────────
    console.log('📝 Creating posts + hashtags...');
    const postIds = [];
    for (let i = 0; i < 100; i++) {
      const user = users[i % users.length];
      const { rows } = await client.query(
        `INSERT INTO posts (author_id, author_name, content, post_type, like_count, comment_count)
         VALUES ($1,$2,$3,'text',$4,$5) RETURNING id`,
        [user.id, user.name, POST_CONTENTS[i % POST_CONTENTS.length], rand(0,200), rand(0,30)]
      );
      postIds.push({ id: rows[0].id, authorId: user.id });
    }
    const hashtagIds = {};
    for (const tag of HASHTAGS) {
      const { rows } = await client.query(
        `INSERT INTO hashtags (name, post_count) VALUES ($1,$2)
         ON CONFLICT (name) DO UPDATE SET post_count = EXCLUDED.post_count RETURNING id`,
        [`#${tag}`, rand(5, 200)]
      );
      hashtagIds[tag] = rows[0].id;
    }
    for (let i = 0; i < postIds.length; i++) {
      const tags = HASHTAGS.sort(() => 0.5 - Math.random()).slice(0, 2);
      for (const tag of tags) {
        await client.query(
          `INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [postIds[i].id, hashtagIds[tag]]
        );
      }
    }
    console.log(`  ✅ ${postIds.length} posts, ${HASHTAGS.length} hashtags\n`);

    // ── 4. Follows ────────────────────────────────────────────────────────────
    console.log('👥 Creating follows...');
    let followCount = 0;
    for (const user of users) {
      const targets = [...users].sort(() => 0.5 - Math.random()).slice(0, rand(5, 12));
      for (const t of targets) {
        if (t.id === user.id) continue;
        await client.query(
          `INSERT INTO follows (follower_id, followed_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [user.id, t.id]
        );
        followCount++;
      }
    }
    console.log(`  ✅ ${followCount} follows\n`);

    // ── 5. Likes + Comments + Stories ────────────────────────────────────────
    console.log('❤️  Creating likes, comments, stories...');
    let likeCount = 0, commentCount = 0;
    for (let i = 0; i < 30; i++) {
      const user = users[i];
      for (const post of postIds.slice(0, rand(2, 8))) {
        await client.query(
          `INSERT INTO likes (target_id, target_type, user_id) VALUES ($1,'post',$2) ON CONFLICT DO NOTHING`,
          [post.id, user.id]
        );
        likeCount++;
      }
      await client.query(
        `INSERT INTO comments (post_id, author_id, author_name, content)
         VALUES ($1,$2,$3,$4)`,
        [postIds[i % postIds.length].id, user.id, user.name, pick(COMMENTS)]
      );
      commentCount++;
    }
    for (const user of users.slice(0, 20)) {
      await client.query(
        `INSERT INTO stories (user_id, media_url, media_type, caption, expires_at)
         VALUES ($1,$2,'image',$3, NOW() + INTERVAL '20 hours')`,
        [user.id, `https://picsum.photos/seed/${user.id.slice(0,8)}/400/700`,
         pick(['New at my showroom! 🏪','Good morning Addis ☀️','Check this out!', null])]
      );
    }
    console.log(`  ✅ ${likeCount} likes, ${commentCount} comments, 20 stories\n`);

    // ── 6. Saves / Bookmarks ──────────────────────────────────────────────────
    console.log('🔖 Creating saves...');
    let saveCount = 0;
    const savedPairs = new Set();
    for (const user of users.slice(0, 25)) {
      for (const post of postIds.slice(0, rand(1, 4))) {
        const key = `${user.id}-${post.id}`;
        if (savedPairs.has(key)) continue;
        savedPairs.add(key);
        await client.query(
          `INSERT INTO saves (user_id, target_id, target_type) VALUES ($1,$2,'post') ON CONFLICT DO NOTHING`,
          [user.id, post.id]
        );
        saveCount++;
      }
    }
    console.log(`  ✅ ${saveCount} saves\n`);

    // ── 7. Tasks + bids ───────────────────────────────────────────────────────
    console.log('📋 Creating tasks...');
    const taskIds = [];
    for (let i = 0; i < 40; i++) {
      const user   = users[i % users.length];
      const sample = TASK_SAMPLES[i % TASK_SAMPLES.length];
      const coords = jitter(user.coords.lat, user.coords.lon, 1);
      const { rows } = await client.query(
        `INSERT INTO tasks
           (requester_id, task_type, title, description, location,
            offered_payment, currency, status, latitude, longitude, deadline)
         VALUES ($1,$2,$3,$4,$5,$6,'ETB',$7,$8,$9,
                 NOW() + ($10 || ' days')::INTERVAL) RETURNING id`,
        [
          user.id, sample.type, sample.title, sample.desc,
          `${user.district}, Addis Ababa`,
          randF(sample.payment[0], sample.payment[1]),
          pick(['open','open','open','in_progress']),
          coords.lat, coords.lon, rand(1, 14),
        ]
      );
      taskIds.push({ id: rows[0].id, requesterId: user.id });
    }
    for (const task of taskIds.slice(0, 20)) {
      const bidder = users[rand(0, users.length - 1)];
      if (bidder.id === task.requesterId) continue;
      await client.query(
        `INSERT INTO task_bids (task_id, bidder_id, bidder_name, bid_amount, message, status)
         VALUES ($1,$2,$3,$4,$5,'pending')`,
        [task.id, bidder.id, bidder.name, randF(50, 300),
         'I can complete this efficiently and on time. Available today.']
      );
    }
    console.log(`  ✅ ${taskIds.length} tasks with bids\n`);

    // ── 8. Jobs ───────────────────────────────────────────────────────────────
    console.log('💼 Creating jobs...');
    let jobCount = 0;
    for (let i = 0; i < JOB_SAMPLES.length * 2; i++) {
      const user   = users[i % users.length];
      const sample = JOB_SAMPLES[i % JOB_SAMPLES.length];
      const biz    = businesses.find(b => b.owner.id === user.id);
      await client.query(
        `INSERT INTO jobs
           (poster_id, business_id, title, description, job_type, category,
            salary_min, salary_max, currency, location, is_remote, status, deadline)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ETB',$9,$10,'open', NOW() + INTERVAL '30 days')`,
        [user.id, biz ? biz.id : null, sample.title, sample.desc,
         sample.type, sample.cat, sample.salMin, sample.salMax,
         `${user.district}, Addis Ababa`, i % 8 === 0]
      );
      jobCount++;
    }
    console.log(`  ✅ ${jobCount} jobs\n`);

    // ── 9. Events ─────────────────────────────────────────────────────────────
    console.log('📅 Creating events...');
    let eventCount = 0;
    for (let i = 0; i < EVENT_SAMPLES.length * 2; i++) {
      const user   = users[i % users.length];
      const sample = EVENT_SAMPLES[i % EVENT_SAMPLES.length];
      const days   = rand(3, 60);
      await client.query(
        `INSERT INTO events
           (organizer_id, title, description, location, is_online,
            start_at, end_at, ticket_price, currency, capacity, status)
         VALUES ($1,$2,$3,$4,FALSE,
                 NOW() + ($5 || ' days')::INTERVAL,
                 NOW() + ($6 || ' days')::INTERVAL,
                 $7,'ETB',$8,'published')`,
        [user.id, sample.title, sample.desc,
         `${user.district}, Addis Ababa`,
         days, days + 1, sample.ticket, sample.cap]
      );
      eventCount++;
    }
    console.log(`  ✅ ${eventCount} events\n`);

    // ── 10. Courses + lessons ─────────────────────────────────────────────────
    console.log('📚 Creating courses...');
    let courseCount = 0;
    for (let i = 0; i < COURSE_SAMPLES.length * 2; i++) {
      const user   = users[i % users.length];
      const sample = COURSE_SAMPLES[i % COURSE_SAMPLES.length];
      const biz    = businesses.find(b => b.owner.id === user.id);
      const { rows } = await client.query(
        `INSERT INTO courses
           (creator_id, business_id, title, description, price, currency,
            category, level, is_published)
         VALUES ($1,$2,$3,$4,$5,'ETB',$6,$7,TRUE) RETURNING id`,
        [user.id, biz ? biz.id : null, sample.title, sample.desc,
         sample.price, sample.cat, sample.level]
      );
      const lessonTitles = ['Introduction & Overview','Core Concepts','Practical Application'];
      for (let l = 0; l < lessonTitles.length; l++) {
        await client.query(
          `INSERT INTO course_lessons (course_id, title, description, duration, position, is_free)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [rows[0].id, lessonTitles[l],
           `Lesson ${l+1} of ${sample.title}.`, rand(600, 3600), l, l === 0]
        );
      }
      courseCount++;
    }
    console.log(`  ✅ ${courseCount} courses with lessons\n`);

    // ── 11. Conversations + Messages ──────────────────────────────────────────
    console.log('💬 Creating conversations & messages...');
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
    console.log(`  ✅ ${convCount} conversations\n`);

    // ── 12. Notifications ─────────────────────────────────────────────────────
    console.log('🔔 Creating notifications...');
    const NOTIFS = [
      { type: 'like',    title: 'New like on your post',   body: 'Someone liked your post.',       link: '/feed' },
      { type: 'comment', title: 'New comment',             body: 'Someone commented on your post.',link: '/feed' },
      { type: 'follow',  title: 'New follower',            body: 'Someone started following you.', link: '/profile' },
      { type: 'task',    title: 'New bid on your task',    body: 'Someone bid on your task.',       link: '/tasks' },
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
    console.log(`  ✅ ${notifCount} notifications\n`);

    // ── 13. Wallet transactions ───────────────────────────────────────────────
    console.log('💰 Creating wallet transactions...');
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
           pick(['Task payment received','Wallet top-up','Service payment','Referral bonus'])]
        );
        txCount++;
      }
    }
    console.log(`  ✅ ${txCount} wallet transactions\n`);

    // ── 14. Coupons ───────────────────────────────────────────────────────────
    console.log('🎟️  Creating coupons...');
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
    console.log('  ✅ 20 coupons\n');

    // ── 15. Referral codes ────────────────────────────────────────────────────
    console.log('🎁 Assigning referral codes...');
    for (const user of users) {
      const code = `HL${user.name.replace(/\s/g,'').toUpperCase().slice(0,4)}${Math.floor(Math.random()*9000+1000)}`;
      await client.query(
        `UPDATE users SET referral_code = $1 WHERE id = $2 AND referral_code IS NULL`,
        [code, user.id]
      );
    }
    console.log('  ✅ Referral codes assigned\n');

    // ── 16. Point transactions ────────────────────────────────────────────────
    console.log('⭐ Creating point transactions...');
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
    console.log(`  ✅ ${ptCount} point transactions\n`);

    // ── 17. Dismissed suggestions ─────────────────────────────────────────────
    console.log('🚫 Creating dismissed suggestions...');
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
    console.log(`  ✅ ${dismissCount} dismissed suggestions\n`);

    // ── Summary ───────────────────────────────────────────────────────────────
    const [uR, bR, poR, tR, jR, eR, cR, fR, mR] = await Promise.all([
      client.query(`SELECT COUNT(*) FROM users       WHERE is_seed = TRUE`),
      client.query(`SELECT COUNT(*) FROM businesses`),
      client.query(`SELECT COUNT(*) FROM showrooms`),
      client.query(`SELECT COUNT(*) FROM posts`),
      client.query(`SELECT COUNT(*) FROM tasks`),
      client.query(`SELECT COUNT(*) FROM jobs`),
      client.query(`SELECT COUNT(*) FROM events`),
      client.query(`SELECT COUNT(*) FROM courses`),
      client.query(`SELECT COUNT(*) FROM follows`),
      client.query(`SELECT COUNT(*) FROM messages`),
    ]);

    console.log('🎉 SEED COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`   Seed users:    ${uR.rows[0].count}`);
    console.log(`   Businesses:    ${bR.rows[0].count}`);
    console.log(`   Posts:         ${poR.rows[0].count}`);
    console.log(`   Tasks:         ${tR.rows[0].count}`);
    console.log(`   Jobs:          ${jR.rows[0].count}`);
    console.log(`   Events:        ${eR.rows[0].count}`);
    console.log(`   Courses:       ${cR.rows[0].count}`);
    console.log(`   Follows:       ${fR.rows[0].count}`);
    console.log(`   Messages:      ${mR.rows[0].count}`);
    console.log(`   Products:      0 (sellers create their own)`);
    console.log('\n👤 Dev logins:');
    console.log(`   Admin: admin@nodbusiness.app / ${ADMIN_PASSWORD}`);
    console.log(`   Test:  test@nodbusiness.app  / ${TEST_PASSWORD}`);
    console.log(`   Seed:  abebe.girma0@nodbusiness.test … (50 accounts) / ${TEST_PASSWORD}\n`);

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
