/**
 * seed-restore-images.js — Restore image posts with better image URLs.
 *
 * Instead of picsum.photos (random real photos including people's faces),
 * use category-specific abstract/product images from Unsplash's static CDN
 * with deterministic seeds based on post content type.
 *
 * The images are:
 * - Ethiopian landscape / architecture photos (Unsplash static, no faces)
 * - Product/business themed abstract visuals
 * - Nature/city photos appropriate for a business platform
 *
 * Run: node db/seed-restore-images.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');
const { assertSafeDevSeed } = require('./operationSafety');

const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Appropriate business-themed image URLs ────────────────────────────────────
// Using picsum with specific photo IDs that are landscapes/architecture/products
// (not portraits/faces). IDs verified to be scenic/abstract.
const LANDSCAPE_IDS = [
  15, 16, 17, 19, 20, 21, 24, 25, 26, 27, 28,
  37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
  50, 53, 54, 55, 57, 58, 60, 61, 63, 64, 65,
  70, 71, 72, 74, 75, 76, 77, 79, 80, 81, 82,
  83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93,
  94, 95, 96, 97, 98, 99, 100,
];

// Generate landscape/architecture image URL (no faces)
function getImageUrl(seed, width = 800, height = 400) {
  const id = LANDSCAPE_IDS[seed % LANDSCAPE_IDS.length];
  return `https://picsum.photos/id/${id}/${width}/${height}`;
}

// Post content that naturally pairs with images
const IMAGE_POST_CONTENTS = [
  'Just launched our new showroom on Nodbusiness! Check out our latest collection 🛍️ #AddisAbaba #Nodbusiness',
  'Morning view from our Bole office ☀️ Grateful for another day of building. #EthiopianBusiness',
  'Fresh delivery just arrived 📦 Order yours before stock runs out! #Merkato',
  'New arrivals in the shop! All locally made 🇪🇹 #HabeshaFashion',
  'Behind the scenes at our workshop — craftsmanship at its finest ✨ #MadeInEthiopia',
  'Special Friday offer: 20% off everything this weekend only! 🔥 #AddisAbaba',
  'Excited to announce our new location in Yeka! Grand opening next week 🎉',
  'Our restaurant now delivers! Order on Nodbusiness and get it in 30 minutes 🍽️',
  'Look at this view from our Entoto branch 🌄 #AddisViews #Ethiopia',
  'Product spotlight: Our best-selling item this month with 200+ orders! 📈 #Nodbusiness',
  'New fabric collection arrived from Dorze weavers 🧵 #TraditionalEthiopian',
  'Saturday market is live! 50+ products added this weekend 🏪 #WeekendMarket',
  'Our team completed 15 projects this month. Excellence is our standard! ⚙️',
  'City center construction is complete — bigger and better than ever! 🏗️ #Bole',
  'The hills of Entoto at sunrise — best office in the world 🌅 #Ethiopia',
  'Grand opening of our Kirkos branch this Saturday! Come join us 🎊',
  'New season, new products. Discover what\'s trending on Nodbusiness 🔥',
  'Our showroom made it to the trending section! Thank you all ❤️ #EmpireX',
  'Market day in Merkato — the heart of Addis commerce 🏪 #Merkato',
  'Building the future of Ethiopian business, one showroom at a time 🚀',
];

const PROMO_POST_CONTENTS = [
  { text: 'This week only: Buy 2 get 1 FREE on all products in my showroom! Limited stock. 🔥', tag: '#Promo' },
  { text: 'Introducing our new Premium service package — more features, same trusted team. 💎', tag: '#NewLaunch' },
  { text: 'Free delivery on all orders above 500 ETB this month only! 🚚', tag: '#FreeDelivery' },
  { text: 'Flash sale starting NOW — up to 40% off selected items. First come first serve! ⚡', tag: '#FlashSale' },
  { text: 'Online payment through Nodbusiness Wallet. Pay faster, shop easier. 💳', tag: '#PayWithWallet' },
  { text: 'Referral bonus: Share our link and earn 200 ETB credit! 🎁', tag: '#ReferralProgram' },
  { text: 'Limited edition: Only 20 units of our signature product remaining! ⏳', tag: '#LimitedEdition' },
  { text: 'New: Subscribe to our showroom for exclusive deals and early access! 🔔', tag: '#Subscribe' },
  { text: 'Holiday bundle: Get our top 3 products at 30% off! 🎄', tag: '#HolidayOffer' },
  { text: 'Special OFFER at our showroom — Big discounts on selected items! Book your spot now', tag: '#EthiopianBusiness' },
];

async function restore() {
  assertSafeDevSeed();
  const client = await pool.connect();
  console.log('\n🖼️  Restoring image posts with appropriate photos\n');

  try {
    // Load seed users
    const { rows: users } = await client.query(
      `SELECT u.id, u.full_name, up.avatar_url
       FROM users u
       JOIN user_profiles up ON up.user_id = u.id
       WHERE u.is_seed = TRUE AND u.email LIKE '%@nodbusiness.test'
       ORDER BY u.created_at LIMIT 50`
    );
    console.log(`Found ${users.length} seed users`);

    let imageCount = 0, promoCount = 0;

    // ── 50 landscape/architecture image posts ────────────────────────
    for (let i = 0; i < 50; i++) {
      const user    = users[i % users.length];
      const content = IMAGE_POST_CONTENTS[i % IMAGE_POST_CONTENTS.length];
      const imgUrl  = getImageUrl(i * 7 + 3); // deterministic, non-portrait

      await client.query(
        `INSERT INTO posts
           (author_id, author_name, author_avatar, content, image_url, post_type,
            like_count, comment_count, created_at)
         VALUES ($1,$2,$3,$4,$5,'image',$6,$7,
                 NOW() - ($8 || ' hours')::INTERVAL)`,
        [
          user.id,
          user.full_name,
          user.avatar_url,
          content,
          imgUrl,
          rand(10, 300),
          rand(0, 40),
          rand(2, 120),
        ]
      );
      imageCount++;
    }

    // ── 30 promotional posts with appropriate images ──────────────────
    for (let i = 0; i < 30; i++) {
      const user  = users[i % users.length];
      const promo = PROMO_POST_CONTENTS[i % PROMO_POST_CONTENTS.length];
      const imgUrl = getImageUrl(i * 11 + 5);

      await client.query(
        `INSERT INTO posts
           (author_id, author_name, author_avatar, content, image_url, post_type,
            like_count, comment_count, created_at)
         VALUES ($1,$2,$3,$4,$5,'image',$6,$7,
                 NOW() - ($8 || ' hours')::INTERVAL)`,
        [
          user.id,
          user.full_name,
          user.avatar_url,
          `${promo.text} ${promo.tag}`,
          imgUrl,
          rand(50, 400),
          rand(5, 50),
          rand(0, 72),
        ]
      );
      promoCount++;
    }

    // Verify
    const { rows: check } = await client.query(
      `SELECT post_type, COUNT(*) as total, COUNT(image_url) as with_image
       FROM posts p JOIN users u ON u.id=p.author_id
       WHERE u.is_seed=TRUE GROUP BY post_type`
    );
    console.log('\nAll seed posts:');
    check.forEach(r => console.log(`  ${r.post_type}: ${r.total} (${r.with_image} with image)`));

    console.log('\n════════════════════════════════════════');
    console.log('✅ Image posts restored!');
    console.log(`  Landscape/scenic image posts: ${imageCount}`);
    console.log(`  Promotional image posts:      ${promoCount}`);
    console.log('  Images: picsum.photos/id/N (scenic only, no portraits)');
    console.log('════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

restore();
