/**
 * seed-patch-fix.js — Final patch: businesses.business_sections + post avatars
 *
 * Fix 1: businesses.business_sections is NULL → copy from user_profiles
 *         (BusinessShowroomFeed reads biz.business_sections, not user_profiles)
 * Fix 2: posts.author_avatar is NULL → update with user_profiles.avatar_url
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');
const { assertSafeDevSeed } = require('./operationSafety');

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const SERVICES = {
  restaurant: { title: 'WHAT WE SERVE', items: [
    { name: 'Traditional Firfir',   description: 'Shredded injera with spiced lamb sauce',      price: 'From 80 ETB' },
    { name: 'Special Tibs Combo',   description: 'Tender tibs with injera, salad, and ayib',    price: 'From 180 ETB' },
    { name: 'Kitfo with Gomen',     description: 'Minced beef with greens and cottage cheese',   price: 'From 200 ETB' },
    { name: 'Shiro Wot',            description: 'Chickpea stew — perfect for fasting days',    price: 'From 70 ETB' },
  ]},
  shop: { title: 'WHAT WE SELL', items: [
    { name: 'Habesha Kemis',        description: 'Hand-woven traditional dress with tilet',     price: 'From 800 ETB' },
    { name: 'Leather Sandals',      description: 'Handcrafted genuine leather, all sizes',      price: 'From 350 ETB' },
    { name: 'Netsela Shawl',        description: 'Cotton shawl with traditional patterns',      price: 'From 200 ETB' },
    { name: 'Custom Order',         description: 'Traditional outfit made to your measurements',price: 'From 1,200 ETB' },
  ]},
  service: { title: 'WHAT WE OFFER', items: [
    { name: 'Standard Package',     description: 'Reliable service with clear timelines',       price: 'From 500 ETB' },
    { name: 'Premium Package',      description: 'Priority service with dedicated support',     price: 'From 2,000 ETB' },
    { name: 'Enterprise Plan',      description: 'Tailored solution — custom scope',            price: 'Get Quote' },
  ]},
  health: { title: 'OUR SERVICES', items: [
    { name: 'General Consultation', description: 'Walk-in or scheduled visit with physician',   price: 'From 150 ETB' },
    { name: 'Full Blood Panel',     description: 'Complete blood count + liver + kidney',       price: 'From 350 ETB' },
    { name: 'Dental Checkup',       description: 'Cleaning, X-ray, and full examination',      price: 'From 400 ETB' },
  ]},
  realestate: { title: 'AVAILABLE LISTINGS', items: [
    { name: '2BR Apartment (Bole)', description: 'Modern, furnished, 24/7 security',           price: 'From 15,000/mo' },
    { name: 'Studio (Yeka)',        description: 'Compact with kitchenette, all utilities',     price: 'From 6,000/mo' },
    { name: 'Property Management',  description: 'Full management service',                     price: 'From 2,000/mo' },
  ]},
  portfolio: { title: 'OUR SERVICES', items: [
    { name: 'Photography Session',  description: 'Professional portraits or products',         price: 'From 1,500 ETB' },
    { name: 'Video Production',     description: '60-second promo video, color graded',        price: 'From 5,000 ETB' },
    { name: 'Logo + Brand Kit',     description: '3 concepts, guidelines, all formats',        price: 'From 2,000 ETB' },
  ]},
};

function buildSections(category, name) {
  const svc = SERVICES[category] || SERVICES.service;
  return JSON.stringify([
    { type: 'hero',     title: name, content: `Welcome to ${name}.`, visible: true },
    { type: 'services', title: svc.title, items: svc.items, visible: true },
    { type: 'features', title: 'Highlights',
      items: ['Trusted', 'Addis Ababa', 'Fast Service', 'Quality'].map(t => ({ title: t })),
      visible: true },
  ]);
}

async function patch() {
  assertSafeDevSeed();
  const client = await pool.connect();
  console.log('\n🔧 Final Seed Patch\n');

  try {
    // ── Fix 1: businesses.business_sections ──────────────────────────
    console.log('🏢 Patching businesses.business_sections...');
    const { rows: bizs } = await client.query(
      `SELECT b.id, b.business_name, b.business_category, b.owner_id
       FROM businesses b
       JOIN users u ON u.id = b.owner_id
       WHERE u.is_seed = TRUE ORDER BY b.created_at`
    );
    let bizFixed = 0;
    for (let i = 0; i < bizs.length; i++) {
      const b = bizs[i];
      const sections = buildSections(b.business_category, b.business_name);
      const hours = ['restaurant','health'].includes(b.business_category) ? JSON.stringify([
        { day: 'Monday', hours: '8:00 AM – 9:00 PM' },
        { day: 'Tuesday', hours: '8:00 AM – 9:00 PM' },
        { day: 'Wednesday', hours: '8:00 AM – 9:00 PM' },
        { day: 'Thursday', hours: '8:00 AM – 9:00 PM' },
        { day: 'Friday', hours: '8:00 AM – 10:00 PM' },
        { day: 'Saturday', hours: '9:00 AM – 10:00 PM' },
        { day: 'Sunday', hours: b.business_category === 'restaurant' ? '10:00 AM – 8:00 PM' : 'Closed' },
      ]) : null;
      await client.query(
        `UPDATE businesses
         SET business_sections  = $1,
             business_logo_url  = $2,
             business_hours     = COALESCE($3, business_hours)
         WHERE id = $4`,
        [sections, `https://i.pravatar.cc/150?img=${(i % 70) + 1}`, hours, b.id]
      );
      bizFixed++;
    }
    console.log(`  ✅ ${bizFixed} businesses patched\n`);

    // ── Fix 2: posts.author_avatar ────────────────────────────────────
    console.log('📸 Patching posts.author_avatar...');
    const { rows: updated } = await client.query(
      `UPDATE posts p
       SET author_avatar = up.avatar_url
       FROM user_profiles up
       WHERE p.author_id = up.user_id
         AND (p.author_avatar IS NULL OR p.author_avatar = '')
         AND up.avatar_url IS NOT NULL
       RETURNING p.id`
    );
    console.log(`  ✅ ${updated.length} posts updated with author avatar\n`);

    // Also make sure all seed posts have author_avatar set from profile
    const { rows: allUpdated } = await client.query(
      `UPDATE posts p
       SET author_avatar = up.avatar_url
       FROM user_profiles up
       JOIN users u ON u.id = up.user_id
       WHERE p.author_id = u.id
         AND u.is_seed = TRUE
         AND up.avatar_url IS NOT NULL
       RETURNING p.id`
    );
    console.log(`  ✅ ${allUpdated.length} seed posts synced with avatar\n`);

    console.log('════════════════════════════════════════');
    console.log('✅ Patch complete!');
    console.log(`  businesses.business_sections: ${bizFixed}`);
    console.log(`  posts.author_avatar synced: ${allUpdated.length}`);
    console.log('════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

patch();
