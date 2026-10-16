/**
 * seed-showrooms.js ? Showroom + Product seed for Nodbusiness
 *
 * Seeds showrooms and products on top of the existing 50 seed users
 * and 150 businesses created by seed.js. Strictly follows how the
 * app's builder actually creates data:
 *
 *   - Showrooms: same columns as POST /api/showrooms, sections as JSON
 *   - Products: same columns as POST /api/products, linked to showroom
 *   - business_subscriptions: freemium row per business (as app creates it)
 *   - Slug: title-lowercase-timestamp (same as showrooms.ts route)
 *   - is_seed: TRUE on all records so cleanup scripts can remove them
 *
 * What this creates:
 *   - 1 published showroom per seed user (50 total)
 *   - 3-6 products per showroom (150-300 products total)
 *   - business_subscriptions freemium row per existing business
 *   - Showroom sections that match the actual builder's editable field schema
 *
 * Run: node db/seed-showrooms.js
 * Clean: node db/cleanup-seed-data.js (removes is_seed=TRUE users and cascade)
 *
 * Requirements: seed.js must have been run first (needs existing seed users)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');
const { assertSafeDevSeed } = require('./operationSafety');

// ?? Helpers ???????????????????????????????????????????????????????????????????
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

function makeSlug(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ?? Business templates ? same categories as seed.js ???????????????????????????
const BUSINESS_CONFIGS = {
  restaurant: {
    template:   'restaurant_menu',
    themeColor: '#D4AF37',
    sectionTypes: ['hero', 'menu', 'gallery', 'contact', 'hours'],
    productCategory: 'Food & Beverage',
    products: [
      { title: 'Special Tibs Combo',          priceRange: [180, 320], currency: 'ETB', desc: 'Tender beef tibs with injera, salad, and ayib. A full Ethiopian feast.' },
      { title: 'Kitfo with Gomen',             priceRange: [200, 350], currency: 'ETB', desc: 'Freshly minced beef seasoned with mitmita and niter kibbeh. Served warm.' },
      { title: 'Shiro Wot + Atkilt',           priceRange: [80,  150], currency: 'ETB', desc: 'Creamy chickpea stew with mixed vegetable sides. Perfect for fasting days.' },
      { title: 'Injera Family Basket',         priceRange: [150, 250], currency: 'ETB', desc: 'Fresh injera (10 pieces) delivered daily. Teff and barley blend.' },
      { title: 'Ethiopian Coffee Ceremony Set',priceRange: [250, 450], currency: 'ETB', desc: 'Full ceremony set ? green beans, jebena, incense, and cups for 6.' },
      { title: 'Firfir Breakfast Plate',       priceRange: [60,  120], currency: 'ETB', desc: 'Shredded injera with spiced lamb or vegetarian sauce. Served hot.' },
    ],
  },
  shop: {
    template:   'shop_grid',
    themeColor: '#2563eb',
    sectionTypes: ['hero', 'featured_products', 'categories', 'about', 'contact'],
    productCategory: 'Fashion & Accessories',
    products: [
      { title: 'Habesha Kemis (Traditional Dress)', priceRange: [800,  2500], currency: 'ETB', desc: 'Hand-woven traditional Ethiopian dress with tilet embroidery. Made in Addis.' },
      { title: 'Ethiopian Leather Sandals',         priceRange: [350,  900],  currency: 'ETB', desc: 'Handcrafted genuine leather sandals from Merkato craftsmen. All sizes available.' },
      { title: 'Netsela Shawl',                     priceRange: [200,  600],  currency: 'ETB', desc: 'Cotton shawl with traditional border pattern. Lightweight and versatile.' },
      { title: 'Gabi Blanket (Double Layer)',        priceRange: [500,  1200], currency: 'ETB', desc: 'Thick traditional Ethiopian cotton blanket. Machine washable.' },
      { title: 'Beaded Necklace Set',                priceRange: [150,  400],  currency: 'ETB', desc: 'Hand-beaded necklace and earring set in traditional color patterns.' },
      { title: 'Modern Habesha Suit (Men)',          priceRange: [1200, 3500], currency: 'ETB', desc: 'Contemporary Ethiopian suit with traditional collar embroidery. Custom sizing.' },
    ],
  },
  service: {
    template:   'service_agency',
    themeColor: '#7c3aed',
    sectionTypes: ['hero', 'services', 'portfolio', 'team', 'contact'],
    productCategory: 'Services',
    products: [
      { title: 'Website Design Package',       priceRange: [3000, 15000], currency: 'ETB', desc: 'Full responsive website ? 5 pages, mobile optimized, 1 month support included.' },
      { title: 'Logo + Brand Identity Kit',    priceRange: [1500, 6000],  currency: 'ETB', desc: 'Logo design, color palette, typography, and brand guidelines. 3 concepts.' },
      { title: 'Social Media Management (1mo)',priceRange: [2000, 8000],  currency: 'ETB', desc: '20 posts/month across 2 platforms. Content creation + scheduling + analytics.' },
      { title: 'Tax Filing Service',           priceRange: [500,  2000],  currency: 'ETB', desc: 'Annual business tax return preparation. VAT registration included if needed.' },
      { title: 'Business Registration',        priceRange: [1200, 3000],  currency: 'ETB', desc: 'Full company registration with Ministry of Trade. Certificate in 2 weeks.' },
      { title: 'Electrical Installation',      priceRange: [2500, 12000], currency: 'ETB', desc: 'Residential wiring, panel upgrades, and new installations. Licensed electricians.' },
    ],
  },
  health: {
    template:   'health_clinic',
    themeColor: '#10b981',
    sectionTypes: ['hero', 'services', 'doctors', 'appointment', 'contact'],
    productCategory: 'Health & Wellness',
    products: [
      { title: 'General Consultation',         priceRange: [150, 400],  currency: 'ETB', desc: 'Walk-in or scheduled visit with licensed physician. Prescription included.' },
      { title: 'Full Blood Panel Test',        priceRange: [350, 800],  currency: 'ETB', desc: 'Complete blood count, liver function, kidney function. Results in 24 hours.' },
      { title: 'Dental Cleaning + Checkup',    priceRange: [400, 900],  currency: 'ETB', desc: 'Professional cleaning, X-ray, and full dental examination.' },
      { title: 'Prenatal Care Package',        priceRange: [1500, 4000],currency: 'ETB', desc: '8-visit prenatal program including ultrasounds, blood tests, and consultations.' },
      { title: 'Eye Examination + Glasses',    priceRange: [600, 1800], currency: 'ETB', desc: 'Full vision test with prescription and standard frame selection.' },
      { title: 'Vitamin & Supplement Pack',    priceRange: [200, 600],  currency: 'ETB', desc: 'Monthly vitamin D, B12, iron, and multivitamin bundle. Pharmacist recommended.' },
    ],
  },
  realestate: {
    template:   'realestate_listings',
    themeColor: '#f59e0b',
    sectionTypes: ['hero', 'listings', 'featured_products', 'about', 'contact'],
    productCategory: 'Real Estate',
    products: [
      { title: '2-Bedroom Apartment (Bole)',    priceRange: [15000, 25000], currency: 'ETB', desc: 'Modern 2BR/1BA in Bole, furnished, 24/7 security, underground parking.' },
      { title: 'Studio Apartment (Yeka)',       priceRange: [6000,  12000], currency: 'ETB', desc: 'Compact studio with kitchenette. Utilities included. Near Yeka Sub City.' },
      { title: 'Commercial Space (Kirkos)',     priceRange: [20000, 60000], currency: 'ETB', desc: '80sqm ground-floor retail space. High foot traffic, corner location.' },
      { title: 'Land Plot (Akaki, 500sqm)',     priceRange: [500000,1500000],currency:'ETB', desc: 'Residential land with clear title deed. Infrastructure ready. Financing available.' },
      { title: '3-Bedroom Villa (CMC)',         priceRange: [35000, 80000], currency: 'ETB', desc: 'Fully furnished villa with garden, backup generator, and domestic help quarters.' },
      { title: 'Property Management Service',  priceRange: [2000,  8000],  currency: 'ETB', desc: 'Full property management ? tenant finding, rent collection, maintenance.' },
    ],
  },
  portfolio: {
    template:   'portfolio_gallery',
    themeColor: '#ef4444',
    sectionTypes: ['hero', 'portfolio', 'about', 'skills', 'contact'],
    productCategory: 'Creative Services',
    products: [
      { title: 'Photography Session (2 hours)', priceRange: [1500, 5000], currency: 'ETB', desc: 'Professional portrait, product, or event photography. Edited photos in 3 days.' },
      { title: 'Video Production (1 min ad)',   priceRange: [5000, 20000],currency: 'ETB', desc: 'Script, shoot, edit, and deliver a 60-second promo video. Color graded.' },
      { title: 'Illustration Package',          priceRange: [2000, 8000], currency: 'ETB', desc: '5 custom digital illustrations. Character design, icons, or editorial art.' },
      { title: 'UI/UX Design (App Screens)',    priceRange: [4000, 15000],currency: 'ETB', desc: '10 mobile app screens designed in Figma. Interactive prototype included.' },
      { title: 'Motion Graphics (30 sec)',      priceRange: [3000, 10000],currency: 'ETB', desc: 'Animated logo reveal or social media ad. After Effects + delivery in MP4.' },
      { title: 'Content Writing (Blog Pack)',   priceRange: [500,  2000],  currency: 'ETB', desc: '4 blog posts (800 words each). SEO optimized. Topic research included.' },
    ],
  },
};

// Builder category and section fields from frontend-next/lib/builderSections.ts.
const BUILDER_CATEGORY = {
  restaurant: 'Food & Beverage', shop: 'Business & Commerce', service: 'Professional Services',
  health: 'Health & Medical', realestate: 'Business & Commerce', portfolio: 'Professional Services',
};
const BUILDER_SECTIONS = {
  restaurant: ['hero', 'items', 'gallery', 'testimonials', 'contact', 'social'],
  shop: ['hero', 'items', 'gallery', 'testimonials', 'contact', 'social'],
  service: ['hero', 'services', 'portfolio', 'team', 'testimonials', 'contact'],
  health: ['hero', 'services', 'testimonials', 'team', 'contact'],
  realestate: ['hero', 'items', 'gallery', 'testimonials', 'contact', 'social'],
  portfolio: ['hero', 'services', 'portfolio', 'team', 'testimonials', 'contact'],
};

// ShowroomCreate persists active sections as { type, ...SECTION_TYPES field values }.
function buildSections(category, business) {
  const config = BUSINESS_CONFIGS[category] || BUSINESS_CONFIGS.service;
  const color = business.business_theme_color || config.themeColor;
  const form = {
    title: business.business_name,
    subtitle: business.business_description || `Welcome to ${business.business_name}`,
    cta: category === 'restaurant' ? 'View Menu' : category === 'shop' ? 'Browse Products' : 'Contact Us',
    heroBg: color, heroBg2: color,
    itemsTitle: category === 'restaurant' ? 'Our Menu' : category === 'realestate' ? 'Available Properties' : 'Our Products',
    items: config.products.slice(0, 3).map((item) => ({
      name: item.title, desc: item.desc, price: `ETB ${item.priceRange[0].toLocaleString()}+`, icon: 'fa-box',
    })),
    galleryTitle: 'Gallery', galleryImages: [],
    servTitle: 'Our Services',
    services: config.products.slice(0, 3).map((item) => ({ name: item.title, desc: item.desc, icon: 'fa-star' })),
    portTitle: 'Our Work', portfolio: [],
    teamTitle: category === 'health' ? 'Our Care Team' : 'Our Team', members: [],
    testTitle: 'What People Say', testimonials: [],
    location: business.business_address || business.location || '',
    phone: business.business_contact_phone || '', email: business.business_contact_email || '',
    hours: business.business_hours || 'Contact us for business hours',
    whatsapp: '', facebook: '', instagram: '', telegram: '', youtube: '', tiktok: '', twitter: '', linkedin: '',
  };
  const fieldsByType = {
    hero: ['title', 'subtitle', 'cta', 'heroBg', 'heroBg2'], items: ['itemsTitle', 'items'],
    gallery: ['galleryTitle', 'galleryImages'], testimonials: ['testTitle', 'testimonials'],
    contact: ['location', 'phone', 'email', 'hours', 'whatsapp'],
    social: ['facebook', 'instagram', 'telegram', 'youtube', 'tiktok', 'twitter', 'linkedin'],
    services: ['servTitle', 'services'], portfolio: ['portTitle', 'portfolio'], team: ['teamTitle', 'members'],
  };
  return BUILDER_SECTIONS[category].map((type) => ({
    type, ...Object.fromEntries(fieldsByType[type].map((field) => [field, form[field]])),
  }));
}
// ?? Main ??????????????????????????????????????????????????????????????????????
async function seed() {
  assertSafeDevSeed();
  const client = await pool.connect();
  console.log('\n?? Nodbusiness Showroom + Product Seed\n');
  console.log('Creates: 50 showrooms, 150-300 products, business subscriptions\n');

  try {
    // ?? Load existing seed users ??????????????????????????????????????????????
    console.log('?? Loading existing seed users...');
    const { rows: users } = await client.query(
      `SELECT u.id, u.full_name, u.email,
              up.location, up.latitude, up.longitude
       FROM users u
       JOIN user_profiles up ON up.user_id = u.id
       WHERE u.is_seed = TRUE AND u.email LIKE '%@nodbusiness.test'
       ORDER BY u.created_at
       LIMIT 50`
    );
    if (!users.length) {
      console.error('? No seed users found. Run node db/seed.js first.');
      process.exit(1);
    }
    console.log(`  ? Found ${users.length} seed users\n`);

    // ?? Load existing businesses (to link products and subscriptions) ?????????
    console.log('?? Loading existing businesses...');
    const { rows: businesses } = await client.query(
      `SELECT b.id, b.owner_id, b.business_name, b.business_category,
              b.business_template, b.business_description, b.business_contact_email,
              b.business_contact_phone, b.business_address, b.business_hours,
              b.business_theme_color, up.location
       FROM businesses b
       JOIN users u ON u.id = b.owner_id
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.is_seed = TRUE
       ORDER BY b.created_at`
    );
    console.log(`  ? Found ${businesses.length} businesses\n`);

    // ?? 1. business_subscriptions ? freemium row for each business ????????????
    console.log('?? Creating business subscriptions (freemium tier)...');
    let subCount = 0;
    for (const biz of businesses) {
      await client.query(
        `INSERT INTO business_subscriptions
           (business_id, tier, status)
         VALUES ($1, 'freemium', 'active')
         ON CONFLICT (business_id) DO NOTHING`,
        [biz.id]
      );
      subCount++;
    }
    console.log(`  ? ${subCount} business subscriptions\n`);

    // ?? 2. Showrooms ? 1 per seed user ???????????????????????????????????????
    console.log('?? Creating showrooms...');
    const showroomRecords = [];
    const CATEGORIES = Object.keys(BUSINESS_CONFIGS);

    for (let i = 0; i < users.length; i++) {
      const user     = users[i];
      // Find this user's first business (for linking)
      const userBiz = businesses.find(b => b.owner_id === user.id);

      if (!userBiz) throw new Error(`Seed user ${user.email} has no business row; run seed.js first and inspect its output.`);
      const fallbackCategory = CATEGORIES[i % CATEGORIES.length];
      const businessCategory = BUSINESS_CONFIGS[userBiz.business_category] ? userBiz.business_category : fallbackCategory;
      const config   = BUSINESS_CONFIGS[businessCategory];
      const title     = userBiz.business_name;
      const slug      = makeSlug(title);
      const sections  = buildSections(businessCategory, userBiz);
      const color     = userBiz.business_theme_color || config.themeColor;

      const { rows } = await client.query(
        `INSERT INTO showrooms
           (owner_id, title, slug, category, template,
            sections, cover_image, logo_url,
            status, theme_color,
            description, view_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'published',$9,$10,$11)
         RETURNING id, title, category`,
        [
          user.id,
          title,
          slug,
          BUILDER_CATEGORY[businessCategory],
          userBiz.business_template || config.template,
          JSON.stringify(sections),
          `https://picsum.photos/seed/${slug.slice(0,12)}/1200/400`,
          `https://picsum.photos/seed/${slug.slice(0,8)}logo/200/200`,
          color,
          userBiz.business_description || `${title} in ${userBiz.location || user.location || 'Addis Ababa'}.`,
          rand(50, 2000),
        ]
      );

      const showroom = rows[0];
      showroomRecords.push({
        id:        showroom.id,
        title:     showroom.title,
        category:  businessCategory,
        ownerId:   user.id,
        businessId: userBiz ? userBiz.id : null,
      });

      // Update user_profile to reflect business profile status
      await client.query(
        `UPDATE user_profiles
         SET has_business_profile = TRUE,
             profile_type         = 'business',
             business_name        = $1,
             business_category    = $2,
             business_template    = $3,
             business_theme_color = $4
         WHERE user_id = $5`,
        [userBiz.business_name, userBiz.business_category, userBiz.business_template || config.template, color, user.id]
      );
    }
    console.log(`  ? ${showroomRecords.length} showrooms published\n`);

    // ?? 3. Products ? 3?6 per showroom ???????????????????????????????????????
    console.log('???  Creating products...');
    let productCount = 0;

    for (const showroom of showroomRecords) {
      const config       = BUSINESS_CONFIGS[showroom.category] || BUSINESS_CONFIGS.service;
      const productPool  = config.products;
      const count        = rand(3, Math.min(6, productPool.length));
      // Shuffle and pick count products without repeats
      const chosen = [...productPool].sort(() => Math.random() - 0.5).slice(0, count);

      for (const p of chosen) {
        const price = randF(p.priceRange[0], p.priceRange[1]);
        const stock = rand(1, 50);
        // Images: 2?3 picsum photos based on product title seed
        const imgSeed = p.title.replace(/\s/g,'').slice(0, 8).toLowerCase();
        const images  = JSON.stringify([
          `https://picsum.photos/seed/${imgSeed}1/600/600`,
          `https://picsum.photos/seed/${imgSeed}2/600/600`,
        ]);

        await client.query(
          `INSERT INTO products
             (seller_id, business_id, showroom_id,
              title, description, price, currency,
              stock, images, category, status, view_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11)`,
          [
            showroom.ownerId,
            showroom.businessId,
            showroom.id,
            p.title,
            p.desc,
            price,
            p.currency ?? 'ETB',
            stock,
            images,
            config.productCategory,
            rand(0, 500),
          ]
        );
        productCount++;
      }

      // Update business_subscriptions product_count for this business
      if (showroom.businessId) {
        await client.query(
          `UPDATE business_subscriptions
           SET product_count = (
             SELECT COUNT(*) FROM products WHERE business_id = $1
           )
           WHERE business_id = $1`,
          [showroom.businessId]
        );
      }
    }
    console.log(`  ? ${productCount} products\n`);

    // ?? 4. Product reviews ? a few per product ????????????????????????????????
    console.log('? Creating product reviews...');
    const { rows: allProducts } = await client.query(
      `SELECT p.id, p.seller_id FROM products p
       JOIN showrooms s ON s.id = p.showroom_id
       JOIN users u ON u.id = s.owner_id
       WHERE u.is_seed = TRUE
       LIMIT 100`
    );
    const REVIEW_TEXTS = [
      'Excellent quality, exactly as described. Fast delivery!',
      'Very happy with this purchase. Will buy again.',
      'Good value for money. Seller was very responsive.',
      'Exactly what I needed. Highly recommend to anyone in Addis.',
      'Quality product. Packaging was careful and item arrived safely.',
      'The best I have found on Nodbusiness. Five stars!',
      'Decent quality for the price. Delivery was on time.',
      'Great seller, honest description. Item is perfect.',
    ];
    let reviewCount = 0;
    for (const product of allProducts.slice(0, 60)) {
      const reviewer = users[rand(0, users.length - 1)];
      if (reviewer.id === product.seller_id) continue;
      const rating = rand(3, 5);
      try {
        await client.query(
          `INSERT INTO reviews
             (reviewer_id, product_id, seller_id, rating, comment)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT DO NOTHING`,
          [reviewer.id, product.id, product.seller_id, rating, pick(REVIEW_TEXTS)]
        );
        reviewCount++;
      } catch { /* reviews table may have different constraint ? skip */ }
    }
    console.log(`  ? ${reviewCount} reviews\n`);

    // ?? 5. Showroom views ? simulate real traffic ?????????????????????????????
    console.log('???  Simulating showroom views (no extra Redis commands)...');
    for (const showroom of showroomRecords.slice(0, 30)) {
      const views = rand(50, 2000);
      await client.query(
        `UPDATE showrooms SET view_count = $1 WHERE id = $2`,
        [views, showroom.id]
      );
    }
    console.log('  ? View counts set\n');

    // ?? Summary ???????????????????????????????????????????????????????????????
    console.log('????????????????????????????????????????');
    console.log('? Showroom seed complete!');
    console.log('????????????????????????????????????????');
    console.log(`  Showrooms:              ${showroomRecords.length}`);
    console.log(`  Products:               ${productCount}`);
    console.log(`  Reviews:                ${reviewCount}`);
    console.log(`  Business subscriptions: ${subCount} (freemium)`);
    console.log('');
    console.log('Browse:');
    console.log('  Frontend:  https://nodbusiness.vercel.app/showrooms');
    console.log('  Marketplace: https://nodbusiness.vercel.app/marketplace');
    console.log('');
    console.log('Seed users use the TEST_ACCOUNT_PASSWORD supplied to the guarded local seed command.');
    console.log('????????????????????????????????????????\n');

  } catch (err) {
    console.error('\n? Seed failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) seed();

module.exports = { BUSINESS_CONFIGS, BUILDER_CATEGORY, BUILDER_SECTIONS, buildSections };
