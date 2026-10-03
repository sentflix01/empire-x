/**
 * seed-patch-business-feed.js ? Fix business feed sections and logos
 *
 * Problems fixed:
 *
 * 1. user_profiles.business_sections is NULL ? business feed shows nothing
 *    Fix: Copy and enrich sections from showrooms into user_profiles.business_sections
 *    Format matches exactly what BusinessShowroomFeed.tsx expects:
 *    - type: 'services' or 'menu' with items[] having name, description, price
 *    - type: 'features' with items[] having title
 *    - type: 'hero' with title, content
 *
 * 2. business_logo_url uses picsum (random dark photos as square logos)
 *    Fix: Use pravatar.cc (human round avatars) for logos ? matches reference pictures
 *
 * 3. Services section items missing price
 *    Fix: Add ETB price string to each service item
 *
 * Run: node db/seed-patch-business-feed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');
const { assertSafeDevSeed } = require('./operationSafety');

const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ?? Services with prices per category ? what BusinessShowroomFeed renders ?????
const SERVICES_WITH_PRICES = {
  restaurant: {
    title: 'WHAT WE SERVE',
    items: [
      { name: 'Traditional Firfir',   description: 'Shredded injera with spiced lamb sauce',        price: 'From 80 ETB' },
      { name: 'Special Tibs Combo',   description: 'Tender tibs with injera, salad, and ayib',      price: 'From 180 ETB' },
      { name: 'Kitfo with Gomen',     description: 'Minced beef with greens and cottage cheese',     price: 'From 200 ETB' },
      { name: 'Shiro Wot',            description: 'Chickpea stew ? perfect for fasting days',      price: 'From 70 ETB' },
      { name: 'Coffee Ceremony',      description: 'Full traditional ceremony for 4?6 guests',      price: 'From 250 ETB' },
    ],
  },
  shop: {
    title: 'WHAT WE SELL',
    items: [
      { name: 'Habesha Kemis',        description: 'Hand-woven traditional dress with tilet',       price: 'From 800 ETB' },
      { name: 'Leather Sandals',      description: 'Handcrafted genuine leather, all sizes',        price: 'From 350 ETB' },
      { name: 'Netsela Shawl',        description: 'Cotton shawl with traditional patterns',        price: 'From 200 ETB' },
      { name: 'Gabi Blanket',         description: 'Thick traditional cotton blanket',              price: 'From 500 ETB' },
      { name: 'Custom Order',         description: 'Traditional outfit made to your measurements',  price: 'From 1,200 ETB' },
    ],
  },
  service: {
    title: 'WHAT WE OFFER',
    items: [
      { name: 'Standard Package',     description: 'Reliable service with clear timelines',         price: 'From 500 ETB' },
      { name: 'Premium Package',      description: 'Priority service with dedicated support',       price: 'From 2,000 ETB' },
      { name: 'Enterprise Plan',      description: 'Tailored solution ? custom scope and pricing',  price: 'Get Quote' },
    ],
  },
  health: {
    title: 'OUR SERVICES',
    items: [
      { name: 'General Consultation', description: 'Walk-in or scheduled visit with physician',     price: 'From 150 ETB' },
      { name: 'Full Blood Panel',     description: 'Complete blood count + liver + kidney function', price: 'From 350 ETB' },
      { name: 'Dental Checkup',       description: 'Cleaning, X-ray, and full examination',        price: 'From 400 ETB' },
      { name: 'Prenatal Package',     description: '8-visit program with ultrasounds',             price: 'From 1,500 ETB' },
    ],
  },
  realestate: {
    title: 'AVAILABLE LISTINGS',
    items: [
      { name: '2BR Apartment (Bole)', description: 'Modern, furnished, 24/7 security',             price: 'From 15,000 ETB/mo' },
      { name: 'Studio (Yeka)',        description: 'Compact with kitchenette, utilities included',  price: 'From 6,000 ETB/mo' },
      { name: 'Commercial Space',     description: 'Ground-floor retail, high foot traffic',        price: 'From 20,000 ETB/mo' },
      { name: 'Property Management',  description: 'Full management ? tenant, rent, maintenance',   price: 'From 2,000 ETB/mo' },
    ],
  },
  portfolio: {
    title: 'OUR SERVICES',
    items: [
      { name: 'Photography Session',  description: 'Professional portraits or product photos',     price: 'From 1,500 ETB' },
      { name: 'Video Production',     description: '60-second promo video, color graded',          price: 'From 5,000 ETB' },
      { name: 'Logo + Brand Kit',     description: '3 concepts, guidelines, all formats',          price: 'From 2,000 ETB' },
      { name: 'UI/UX Design',         description: '10 app screens in Figma + prototype',          price: 'From 4,000 ETB' },
    ],
  },
};

// ?? Features section for categories that show chips ???????????????????????????
const FEATURES = {
  restaurant: ['Dine-In', 'Takeaway', 'Catering', 'Fasting Menu', 'Delivery'],
  shop:       ['In-Store', 'Online Orders', 'Custom Made', 'Wholesale', 'Gift Wrap'],
  service:    ['On-Site', 'Remote', 'Certified', 'Insured', 'Fast Turnaround'],
  health:     ['Walk-In', 'Appointments', 'Lab Tests', 'Emergency', 'Insurance'],
  realestate: ['Residential', 'Commercial', 'Short-Term', 'Long-Term', 'Furnished'],
  portfolio:  ['Photography', 'Video', 'Design', 'Branding', 'Web'],
};

function buildBusinessSections(category, businessName) {
  const cat = category || 'service';
  const services = SERVICES_WITH_PRICES[cat] || SERVICES_WITH_PRICES.service;
  const features = FEATURES[cat] || FEATURES.service;

  return [
    {
      type:    'hero',
      title:   businessName,
      content: `Welcome to ${businessName}. Trusted by the Addis Ababa community.`,
      visible: true,
    },
    {
      type:    'services',
      title:   services.title,
      items:   services.items,
      visible: true,
    },
    {
      type:    'features',
      title:   'Highlights',
      items:   features.map(f => ({ title: f })),
      visible: true,
    },
    {
      type:    'contact',
      title:   'Contact Us',
      phone:   `+251 9${rand(10,99)} ${rand(100,999)} ${rand(1000,9999)}`,
      visible: true,
    },
  ];
}

async function patch() {
  assertSafeDevSeed();
  const client = await pool.connect();
  console.log('\n?? Business Feed Patch\n');
  console.log('Fixes: business_sections NULL, logo URLs, services with prices\n');

  try {
    // ?? Load seed users with business profiles ????????????????????????????????
    const { rows: profiles } = await client.query(
      `SELECT up.user_id, up.business_name, up.business_category,
              up.business_sections, u.full_name
       FROM user_profiles up
       JOIN users u ON u.id = up.user_id
       WHERE u.is_seed = TRUE AND up.has_business_profile = TRUE
       ORDER BY u.created_at`
    );
    console.log(`Found ${profiles.length} business profiles to patch\n`);

    let sectionsFixed = 0, logosFixed = 0;

    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];

      // Build proper business_sections with services + prices
      const bizName  = p.business_name || p.full_name;
      const sections = buildBusinessSections(p.business_category, bizName);

      // Use pravatar (human avatar) for logo ? matches reference pictures
      const avatarIndex = (i % 70) + 1;
      const logoUrl = `https://i.pravatar.cc/150?img=${avatarIndex}`;

      // Build proper business_hours JSON for restaurant/health categories
      let hoursJson = null;
      if (['restaurant', 'health'].includes(p.business_category)) {
        hoursJson = JSON.stringify([
          { day: 'Monday',    hours: '8:00 AM ? 9:00 PM' },
          { day: 'Tuesday',   hours: '8:00 AM ? 9:00 PM' },
          { day: 'Wednesday', hours: '8:00 AM ? 9:00 PM' },
          { day: 'Thursday',  hours: '8:00 AM ? 9:00 PM' },
          { day: 'Friday',    hours: '8:00 AM ? 10:00 PM' },
          { day: 'Saturday',  hours: '9:00 AM ? 10:00 PM' },
          { day: 'Sunday',    hours: p.business_category === 'restaurant' ? '10:00 AM ? 8:00 PM' : 'Closed' },
        ]);
      }

      await client.query(
        `UPDATE user_profiles
         SET business_sections    = $1,
             business_logo_url    = $2,
             business_hours       = COALESCE($3, business_hours)
         WHERE user_id = $4`,
        [
          JSON.stringify(sections),
          logoUrl,
          hoursJson,
          p.user_id,
        ]
      );
      sectionsFixed++;
      logosFixed++;
    }
    console.log(`? ${sectionsFixed} profiles patched with business_sections`);
    console.log(`? ${logosFixed} business logos updated to pravatar.cc\n`);

    // ?? Also patch businesses table logo ?????????????????????????????????????
    const { rows: bizs } = await client.query(
      `SELECT b.id, b.owner_id FROM businesses b
       JOIN users u ON u.id = b.owner_id
       WHERE u.is_seed = TRUE ORDER BY b.created_at`
    );
    console.log(`Patching ${bizs.length} business logos...`);
    for (let i = 0; i < bizs.length; i++) {
      const avatarIndex = (i % 70) + 1;
      await client.query(
        `UPDATE businesses SET business_logo_url = $1 WHERE id = $2`,
        [`https://i.pravatar.cc/150?img=${avatarIndex}`, bizs[i].id]
      );
    }
    console.log(`? ${bizs.length} businesses logo URLs updated\n`);

    // ?? Patch showrooms sections to also include price in service items ???????
    const { rows: showrooms } = await client.query(
      `SELECT s.id, s.category, s.sections
       FROM showrooms s
       JOIN users u ON u.id = s.owner_id
       WHERE u.is_seed = TRUE`
    );
    console.log(`Patching ${showrooms.length} showroom sections with prices...`);
    let showroomFixed = 0;
    for (const s of showrooms) {
      try {
        const sections = JSON.parse(s.sections || '[]');
        const cat = s.category || 'service';
        const servicePrices = SERVICES_WITH_PRICES[cat] || SERVICES_WITH_PRICES.service;

        const patched = sections.map(sec => {
          if ((sec.type === 'services' || sec.type === 'menu') && sec.items?.length) {
            return {
              ...sec,
              title: servicePrices.title,
              items: sec.items.map((item, idx) => ({
                ...item,
                price: servicePrices.items[idx % servicePrices.items.length]?.price || 'From 200 ETB',
              })),
            };
          }
          return sec;
        });

        await client.query(
          `UPDATE showrooms SET sections = $1 WHERE id = $2`,
          [JSON.stringify(patched), s.id]
        );
        showroomFixed++;
      } catch { /* skip malformed */ }
    }
    console.log(`? ${showroomFixed} showrooms patched with service prices\n`);

    // ?? Summary ???????????????????????????????????????????????????????????????
    console.log('????????????????????????????????????????');
    console.log('? Business feed patch complete!');
    console.log('????????????????????????????????????????');
    console.log(`  Profiles with business_sections: ${sectionsFixed}`);
    console.log(`  Business logos (pravatar):       ${logosFixed}`);
    console.log(`  Showrooms with prices:           ${showroomFixed}`);
    console.log('');
    console.log('Now the business feed shows:');
    console.log('  ? Cover image (landscape picsum)');
    console.log('  ? Logo (round human avatar from pravatar.cc)');
    console.log('  ? Business name + description + location');
    console.log('  ? WHAT WE OFFER / OUR SERVICES with ETB prices');
    console.log('  ? Visit button linking to showroom');
    console.log('');
    console.log('Browse: https://nodbusiness.vercel.app/feed ? Business tab');
    console.log('????????????????????????????????????????\n');

  } catch (err) {
    console.error('\n? Patch failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

patch();
