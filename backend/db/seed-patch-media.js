/**
 * seed-patch-media.js — Patch existing seed data with media, richer posts,
 *                        business logos, and business-specific activity posts.
 *
 * Fixes 4 issues found after initial seed:
 *
 * Issue 1 — All user profiles missing avatar_url and cover_url
 *   → UPDATE user_profiles SET avatar_url, cover_url for every seed user
 *
 * Issue 2 — Personal feed has only text posts, no images/promotions
 *   → Add 50 image posts and 30 promotional posts with image_url + post_type
 *
 * Issue 3 — Business feed shows businesses with no posts
 *   → Add 1 product post per business (post_type='product'), 1 promo post,
 *      and update businesses with logo_url + cover image
 *
 * Issue 4 — Businesses and showrooms missing logo/cover pictures
 *   → UPDATE businesses SET business_logo_url, business_cover_url
 *   → user_profiles.has_business_profile already set by seed-showrooms.js
 *
 * Run: node db/seed-patch-media.js
 * Safe to re-run (uses ON CONFLICT DO NOTHING where possible).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Image content for posts ───────────────────────────────────────────────────
const IMAGE_POST_CONTENTS = [
  'Just launched our new product line! Come check it out at the showroom 🛍️ #AddisAbaba #Nodbusiness',
  'Morning view from our Bole office ☀️ Grateful for another day of building. #EthiopianBusiness',
  'Fresh delivery just arrived 📦 Order yours before stock runs out! #Merkato #Ethiopia',
  'Our team after completing a major project this week 💪 Proud of what we built! #EthioTech',
  'New arrivals in the shop! All locally made 🇪🇹 #HabeshaFashion #AddisStyle',
  'Client testimonial: "Best service in Addis Ababa!" Thank you for your trust 🙏',
  'Behind the scenes at our workshop — craftsmanship at its finest ✨ #MadeInEthiopia',
  'Special Friday offer: 20% off everything in the marketplace this weekend only! 🔥',
  'Excited to announce our new location in Yeka! Grand opening next week 🎉 #NewLocation',
  'Traditional Ethiopian coffee ceremony at our showroom ☕ You are all invited!',
  'Nodbusiness marketplace is the place to be for Ethiopian products 🛒 Visit us today!',
  'Handmade leather bags — every piece is unique and crafted with love 🎨 #EthioLeather',
  'Our restaurant now delivers! Order on Nodbusiness and get it in 30 minutes 🍽️',
  'The team is growing! We are hiring in Addis Ababa. Check our job listing 💼',
  'Look at this incredible view from our Entoto branch 🌄 #AddisViews #Ethiopia',
  'Product spotlight: Our best-selling item this month with 200+ orders! 📈',
  'Celebrating 1 year on Nodbusiness! Thank you to all our customers ❤️ #1Year',
  'New fabric collection just arrived from Dorze weavers 🧵 #TraditionalEthiopian',
  'Saturday market is live! 50+ products added this weekend 🏪 #WeekendMarket',
  'Gena is coming — special holiday bundle available now 🎁 #EthiopianChristmas',
];

const PROMO_POST_CONTENTS = [
  { text: 'This week only: Buy 2 get 1 FREE on all products in my showroom! Limited stock. 🔥', tag: '#Promo' },
  { text: 'Introducing our new Premium service package — more features, same trusted team. 💎', tag: '#NewLaunch' },
  { text: 'Announcing: free delivery on all orders above 500 ETB this month only! 🚚', tag: '#FreeDelivery' },
  { text: 'Flash sale starting NOW — up to 40% off selected items. First come first serve! ⚡', tag: '#FlashSale' },
  { text: 'We just added online payment through Nodbusiness Wallet. Pay faster, shop easier. 💳', tag: '#PayWithWallet' },
  { text: 'Referral bonus: Share our showroom link and earn 200 ETB credit for every new customer! 🎁', tag: '#ReferralProgram' },
  { text: 'Premium membership just got better — now includes priority support and analytics. 📊', tag: '#PremiumBusiness' },
  { text: 'Limited edition: Only 20 units of our signature product remaining. Order now! ⏳', tag: '#LimitedEdition' },
  { text: 'New: Subscribe to our showroom for exclusive deals and early access! 🔔', tag: '#Subscribe' },
  { text: 'Holiday bundle: Get our top 3 products at 30% off — perfect gift package! 🎄', tag: '#HolidayOffer' },
];

// ── Business-specific post templates ─────────────────────────────────────────
const BUSINESS_POST_TEMPLATES = {
  restaurant: [
    'Today\'s special: Injera with 5 wots + tej — only 180 ETB. Come dine with us! 🍽️',
    'Our menu now includes vegan Ethiopian options. Perfect for fasting season! 🌿',
    'We cater for weddings, birthdays, and corporate events. Get a quote today! 📞',
  ],
  shop: [
    'New stock alert: Ethiopian traditional dress collection now available online 👗',
    'All leather products 25% off this week only. Authentic Merkato quality! 🎒',
    'Custom orders accepted — get your traditional outfit made to measure! 📐',
  ],
  service: [
    'Our team completed 15 projects this month. Excellence is our standard! ⚙️',
    'New service: Digital marketing for small businesses starting at 2,000 ETB/month 📱',
    'Free consultation available this week. Book your slot now! 📅',
  ],
  health: [
    'Reminder: Annual health checkup packages available — prevention is key! 🏥',
    'New doctor joining our team next week: specialist in internal medicine. 👨‍⚕️',
    'Blood donation drive this Saturday at our clinic. Save a life! ❤️',
  ],
  realestate: [
    'New listing: 3-bedroom villa in CMC — fully furnished. Available now! 🏡',
    'Rent vs buy in Addis: Our experts will help you make the right decision. 📊',
    'We handle all paperwork — lease agreements, title deed transfers, and more! 📋',
  ],
  portfolio: [
    'New portfolio piece: Brand identity for a tech startup in Bole. Swipe to see! 🎨',
    'Accepting new photography clients for October. DM to book your session! 📸',
    'Before & after: See the transformation of our latest web design project! 💻',
  ],
};

async function seed() {
  const client = await pool.connect();
  console.log('\n🖼️  Nodbusiness Media Patch Seed\n');
  console.log('Fixes: avatar/cover images, image posts, business logos, business posts\n');

  try {
    // ── Load existing seed users ──────────────────────────────────────────────
    const { rows: users } = await client.query(
      `SELECT u.id, u.full_name, up.id as profile_id
       FROM users u
       JOIN user_profiles up ON up.user_id = u.id
       WHERE u.is_seed = TRUE AND u.email LIKE '%@nodbusiness.test'
       ORDER BY u.created_at LIMIT 50`
    );
    if (!users.length) {
      console.error('❌ No seed users found. Run node db/seed.js first.');
      process.exit(1);
    }
    console.log(`✅ Found ${users.length} seed users\n`);

    // ── FIX 1: Add avatar + cover to every seed user profile ─────────────────
    console.log('👤 Adding profile pictures to all seed users...');
    let avatarCount = 0;
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      // Use pravatar.cc for consistent human avatars (deterministic by index)
      // Use picsum for covers (landscape images)
      const avatarIndex = (i % 70) + 1; // pravatar has ~70 real photos
      const coverSeed   = user.id.slice(0, 8);
      await client.query(
        `UPDATE user_profiles
         SET avatar_url = $1, cover_url = $2
         WHERE user_id = $3`,
        [
          `https://i.pravatar.cc/150?img=${avatarIndex}`,
          `https://picsum.photos/seed/${coverSeed}cover/1200/400`,
          user.id,
        ]
      );
      avatarCount++;
    }
    console.log(`  ✅ ${avatarCount} profiles updated with avatar + cover\n`);

    // ── FIX 2: Add image posts and promotional posts to personal feed ─────────
    console.log('📸 Adding image posts and promo posts to personal feed...');
    let imagePostCount = 0, promoPostCount = 0;

    // 50 image posts
    for (let i = 0; i < 50; i++) {
      const user    = users[i % users.length];
      const content = IMAGE_POST_CONTENTS[i % IMAGE_POST_CONTENTS.length];
      const imgSeed = `img${user.id.slice(0,6)}${i}`;
      await client.query(
        `INSERT INTO posts
           (author_id, author_name, author_avatar, content, image_url, post_type,
            like_count, comment_count, created_at)
         VALUES ($1,$2,$3,$4,$5,'image',$6,$7,
                 NOW() - ($8 || ' hours')::INTERVAL)`,
        [
          user.id,
          user.full_name,
          `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
          content,
          `https://picsum.photos/seed/${imgSeed}/800/600`,
          rand(10, 300),
          rand(0, 40),
          rand(0, 168), // last 7 days
        ]
      );
      imagePostCount++;
    }

    // 30 promotional posts (post_type='text' but with promo tag + image)
    for (let i = 0; i < 30; i++) {
      const user  = users[i % users.length];
      const promo = PROMO_POST_CONTENTS[i % PROMO_POST_CONTENTS.length];
      const imgSeed = `promo${user.id.slice(0,6)}${i}`;
      await client.query(
        `INSERT INTO posts
           (author_id, author_name, author_avatar, content, image_url, post_type,
            like_count, comment_count, created_at)
         VALUES ($1,$2,$3,$4,$5,'image',$6,$7,
                 NOW() - ($8 || ' hours')::INTERVAL)`,
        [
          user.id,
          user.full_name,
          `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
          `${promo.text} ${promo.tag}`,
          `https://picsum.photos/seed/${imgSeed}/800/400`,
          rand(50, 400),
          rand(5, 50),
          rand(0, 72),
        ]
      );
      promoPostCount++;
    }

    console.log(`  ✅ ${imagePostCount} image posts added`);
    console.log(`  ✅ ${promoPostCount} promotional posts added\n`);

    // ── FIX 3 + 4: Business logos and business-specific posts ─────────────────
    console.log('🏢 Adding logos and posts to businesses...');
    const { rows: businesses } = await client.query(
      `SELECT b.id, b.owner_id, b.business_name, b.business_category,
              u.full_name as owner_name
       FROM businesses b
       JOIN users u ON u.id = b.owner_id
       WHERE u.is_seed = TRUE
       ORDER BY b.created_at`
    );
    console.log(`  Found ${businesses.length} businesses`);

    let bizLogoCount = 0, bizPostCount = 0;

    for (let i = 0; i < businesses.length; i++) {
      const biz = businesses[i];
      const cat = biz.business_category || 'service';

      // Update business with logo + cover image
      const logoSeed  = biz.id.slice(0, 8);
      const coverSeed = biz.id.slice(0, 6) + 'biz';
      await client.query(
        `UPDATE businesses
         SET business_logo_url  = $1,
             business_cover_url = $2
         WHERE id = $3`,
        [
          `https://picsum.photos/seed/${logoSeed}logo/200/200`,
          `https://picsum.photos/seed/${coverSeed}/1200/400`,
          biz.id,
        ]
      );
      bizLogoCount++;

      // Also update the corresponding user_profile business fields
      await client.query(
        `UPDATE user_profiles
         SET business_logo_url  = $1,
             business_cover_url = $2
         WHERE user_id = $3`,
        [
          `https://picsum.photos/seed/${logoSeed}logo/200/200`,
          `https://picsum.photos/seed/${coverSeed}/1200/400`,
          biz.owner_id,
        ]
      );

      // Add 1 business-specific post (at most one per business to keep feed clean)
      // Every 2nd business gets a post to avoid flooding
      if (i % 2 === 0) {
        const templates = BUSINESS_POST_TEMPLATES[cat] || BUSINESS_POST_TEMPLATES.service;
        const content   = templates[i % templates.length];
        const imgSeed   = `bizpost${biz.id.slice(0,6)}`;

        await client.query(
          `INSERT INTO posts
             (author_id, author_name, author_avatar, content, image_url, post_type,
              like_count, comment_count, created_at)
           VALUES ($1,$2,$3,$4,$5,'image',$6,$7,
                   NOW() - ($8 || ' hours')::INTERVAL)`,
          [
            biz.owner_id,
            biz.owner_name,
            `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
            `${biz.business_name}: ${content}`,
            `https://picsum.photos/seed/${imgSeed}/800/500`,
            rand(20, 250),
            rand(2, 30),
            rand(0, 120),
          ]
        );
        bizPostCount++;
      }
    }

    console.log(`  ✅ ${bizLogoCount} businesses updated with logo + cover`);
    console.log(`  ✅ ${bizPostCount} business posts added\n`);

    // ── FIX: Update showroom logo_url to match business logo ─────────────────
    console.log('🏪 Updating showroom covers with user avatars as logos...');
    const { rows: showrooms } = await client.query(
      `SELECT s.id, s.owner_id FROM showrooms s
       JOIN users u ON u.id = s.owner_id
       WHERE u.is_seed = TRUE`
    );
    for (const s of showrooms) {
      const idx = users.findIndex(u => u.id === s.owner_id);
      if (idx >= 0) {
        await client.query(
          `UPDATE showrooms SET logo_url = $1 WHERE id = $2`,
          [`https://i.pravatar.cc/150?img=${(idx % 70) + 1}`, s.id]
        );
      }
    }
    console.log(`  ✅ ${showrooms.length} showroom logos updated\n`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('════════════════════════════════════════');
    console.log('✅ Media patch complete!');
    console.log('════════════════════════════════════════');
    console.log(`  Profile avatars + covers: ${avatarCount} users`);
    console.log(`  Image posts added:        ${imagePostCount}`);
    console.log(`  Promo posts added:        ${promoPostCount}`);
    console.log(`  Business logos updated:   ${bizLogoCount}`);
    console.log(`  Business posts added:     ${bizPostCount}`);
    console.log(`  Showroom logos updated:   ${showrooms.length}`);
    console.log('');
    console.log('Now browse:');
    console.log('  Personal feed: https://nodbusiness.vercel.app/feed (Personal tab)');
    console.log('  Business feed: https://nodbusiness.vercel.app/feed (Business tab)');
    console.log('  Profile:       Login → click any user avatar');
    console.log('════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ Patch failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
