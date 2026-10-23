/**
 * seed-showrooms.js — Showroom + Product seed for Nodbusiness
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
const { announceShowroomPublished } = require('../lib/showroomAnnouncement');

// ── Helpers ───────────────────────────────────────────────────────────────────
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

function makeSlug(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Color presets (from frontend-next/lib/builderSections.ts COLOR_PRESETS) ──
const COLOR_PRESETS = [
  ['#2563EB', '#7C3AED'],
  ['#1a1a2e', '#16213e'],
  ['#e74c3c', '#c0392b'],
  ['#2ecc71', '#27ae60'],
  ['#3498db', '#2980b9'],
  ['#9b59b6', '#8e44ad'],
  ['#1abc9c', '#16a085'],
  ['#e67e22', '#d35400'],
  ['#2c3e50', '#34495e'],
  ['#f39c12', '#e67e22'],
];

// ── 50 showroom configs, 5 per category ──────────────────────────────────────
const SHOWROOM_CONFIGS = [
  // ── Food & Beverage (0–4) ─────────────────────────────────────────────────
  {
    name: 'Selam Habesha Kitchen',
    category: 'Food & Beverage',
    address: 'Bole, Addis Ababa',
    phone: '+251 91 123 4567',
    email: 'info@selamkitchen.et',
    description: 'Authentic Ethiopian cuisine served fresh daily in the heart of Bole.',
    sectionKeys: ['hero', 'menu', 'gallery', 'delivery', 'offer', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Special Tibs Combo',       price: 280, currency: 'ETB', desc: 'Tender beef tibs with injera, salad, and ayib — a full Ethiopian feast.' },
      { title: 'Kitfo with Gomen',          price: 320, currency: 'ETB', desc: 'Freshly minced beef seasoned with mitmita and niter kibbeh, served warm.' },
      { title: 'Shiro Wot + Atkilt',        price: 120, currency: 'ETB', desc: 'Creamy chickpea stew with mixed vegetable sides, perfect for fasting days.' },
      { title: 'Firfir Breakfast Plate',    price: 90,  currency: 'ETB', desc: 'Shredded injera with spiced lamb or vegetarian sauce, served hot.' },
      { title: 'Ethiopian Coffee Set',      price: 80,  currency: 'ETB', desc: 'Traditional coffee ceremony with popcorn for two guests.' },
    ],
  },
  {
    name: "Kaldi's Coffee Roasters",
    category: 'Food & Beverage',
    address: 'Kazanchis, Addis Ababa',
    phone: '+251 91 234 5678',
    email: 'hello@kaldiscoffee.et',
    description: 'Specialty single-origin Ethiopian coffee roasted fresh in Kazanchis.',
    sectionKeys: ['hero', 'menu', 'gallery', 'delivery', 'offer', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Yirgacheffe Filter Bag (250g)', price: 180, currency: 'ETB', desc: 'Light roast, floral and citrus notes. Freshly roasted to order.' },
      { title: 'Harrar Dark Roast (250g)',      price: 160, currency: 'ETB', desc: 'Bold dry-process beans with wine and blueberry notes.' },
      { title: 'Espresso Double Shot',          price: 60,  currency: 'ETB', desc: 'Thick, rich espresso pulled from our house blend.' },
      { title: 'Cold Brew Bottle (500ml)',       price: 120, currency: 'ETB', desc: 'Smooth 18-hour cold brew, ready to drink.' },
      { title: 'Avocado Toast + Macchiato',     price: 150, currency: 'ETB', desc: 'Ripe avocado on sourdough paired with an Ethiopian macchiato.' },
    ],
  },
  {
    name: 'Alem Bakery & Pastry',
    category: 'Food & Beverage',
    address: 'Piassa, Addis Ababa',
    phone: '+251 92 345 6789',
    email: 'orders@alembakery.et',
    description: 'Freshly baked bread, cakes, and pastries made every morning in Piassa.',
    sectionKeys: ['hero', 'menu', 'gallery', 'delivery', 'offer', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Doro Dabo (Spiced Bread)',    price: 60,  currency: 'ETB', desc: 'Traditional Ethiopian spiced bread baked fresh each morning.' },
      { title: 'Honey Cake (Slice)',          price: 55,  currency: 'ETB', desc: 'Moist layer cake with Ethiopian honey glaze.' },
      { title: 'Croissant (2 pcs)',           price: 70,  currency: 'ETB', desc: 'Flaky butter croissants baked fresh before 7 am.' },
      { title: 'Birthday Cake (1 kg)',        price: 650, currency: 'ETB', desc: 'Custom birthday cake with your message, ordered 24 hours ahead.' },
      { title: 'Samosa Pack (6 pcs)',         price: 80,  currency: 'ETB', desc: 'Crispy beef or vegetable samosas, perfect for meetings.' },
    ],
  },
  {
    name: 'Yene Migib Catering',
    category: 'Food & Beverage',
    address: 'CMC, Addis Ababa',
    phone: '+251 93 456 7890',
    email: 'events@yenemigib.et',
    description: 'Full-service Ethiopian catering for weddings, corporate events, and family gatherings.',
    sectionKeys: ['hero', 'menu', 'gallery', 'delivery', 'offer', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Wedding Buffet Package (50 pax)',   price: 18000, currency: 'ETB', desc: 'Full injera buffet with 10 wots, salad, and dessert for 50 guests.' },
      { title: 'Corporate Lunch Box (per person)',  price: 180,   currency: 'ETB', desc: 'Individual lunch box: main, side, salad, and water. Minimum 20 boxes.' },
      { title: 'Coffee Ceremony Setup',            price: 1200,  currency: 'ETB', desc: 'Full ceremony setup with green beans, jebena, incense, and cups for 20.' },
      { title: 'Fasting Menu Per Head',            price: 120,   currency: 'ETB', desc: 'Vegan fasting platter per person: shiro, misir, atkilt, and injera.' },
      { title: 'Private Chef (Half Day)',          price: 2500,  currency: 'ETB', desc: 'Personal chef cooks at your home for up to 4 hours.' },
    ],
  },
  {
    name: 'Blue Nile Juice Bar',
    category: 'Food & Beverage',
    address: 'Sarbet, Addis Ababa',
    phone: '+251 94 567 8901',
    email: 'info@bluenilejuice.et',
    description: 'Fresh avocado, mango, and papaya juices and smoothie bowls in Sarbet.',
    sectionKeys: ['hero', 'menu', 'gallery', 'delivery', 'offer', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Layered Avocado Juice (Large)', price: 90,  currency: 'ETB', desc: 'Three-layer Ethiopian avocado juice with mango and papaya.' },
      { title: 'Green Detox Smoothie',         price: 110, currency: 'ETB', desc: 'Spinach, cucumber, pineapple, and ginger blend.' },
      { title: 'Mixed Fruit Bowl',             price: 130, currency: 'ETB', desc: 'Seasonal fruit bowl with honey and granola topping.' },
      { title: 'Fresh Sugarcane Juice (1L)',   price: 60,  currency: 'ETB', desc: 'Pressed to order from fresh sugarcane sticks.' },
      { title: 'Protein Mango Shake',          price: 120, currency: 'ETB', desc: 'Ripe mango, milk, peanut butter, and oats. High protein.' },
    ],
  },

  // ── Health & Medical (5–9) ────────────────────────────────────────────────
  {
    name: 'Meda Community Pharmacy',
    category: 'Health & Medical',
    address: 'Megenagna, Addis Ababa',
    phone: '+251 91 678 9012',
    email: 'rx@medapharmacy.et',
    description: 'Licensed community pharmacy with delivery across Addis Ababa, serving since 2015.',
    sectionKeys: ['hero', 'services', 'certifications', 'testimonials', 'team', 'contact'],
    products: [
      { title: 'Prescription Dispensing',       price: 20,  currency: 'ETB', desc: 'Same-day prescription filling with licensed pharmacist review.' },
      { title: 'Home Delivery (per order)',      price: 50,  currency: 'ETB', desc: 'Medications delivered to your door within 2 hours in Addis.' },
      { title: 'Blood Pressure Check',          price: 30,  currency: 'ETB', desc: 'Walk-in BP screening with our pharmacy technician.' },
      { title: 'Diabetes Glucose Test',         price: 50,  currency: 'ETB', desc: 'Rapid blood sugar test with results in 5 minutes.' },
      { title: 'Vitamin & Supplement Pack',     price: 350, currency: 'ETB', desc: 'Monthly vitamin D, B12, and iron bundle recommended by pharmacist.' },
    ],
  },
  {
    name: 'Hayat Medical Center',
    category: 'Health & Medical',
    address: 'Bole, Addis Ababa',
    phone: '+251 91 789 0123',
    email: 'appointments@hayatmedical.et',
    description: 'Full-service general clinic offering consultations, lab tests, and specialist referrals.',
    sectionKeys: ['hero', 'services', 'certifications', 'testimonials', 'team', 'contact'],
    products: [
      { title: 'General Consultation',        price: 300, currency: 'ETB', desc: 'Walk-in or scheduled visit with a licensed physician. Prescription included.' },
      { title: 'Full Blood Panel',            price: 650, currency: 'ETB', desc: 'CBC, liver function, and kidney function. Results in 24 hours.' },
      { title: 'Ultrasound Scan',             price: 900, currency: 'ETB', desc: 'Abdominal or obstetric ultrasound with written report.' },
      { title: 'Prenatal Care Package',       price: 3500, currency: 'ETB', desc: '8-visit prenatal program including ultrasounds and blood tests.' },
      { title: 'Annual Health Check-Up',      price: 1200, currency: 'ETB', desc: 'Comprehensive check-up: blood panel, ECG, urine, and consultation.' },
    ],
  },
  {
    name: 'Fitsum Dental Clinic',
    category: 'Health & Medical',
    address: 'Gerji, Addis Ababa',
    phone: '+251 92 890 1234',
    email: 'smile@fitsumdental.et',
    description: 'Modern dental clinic providing cleaning, fillings, and orthodontics in Gerji.',
    sectionKeys: ['hero', 'services', 'certifications', 'testimonials', 'team', 'contact'],
    products: [
      { title: 'Dental Cleaning + Checkup',   price: 600,  currency: 'ETB', desc: 'Professional scaling, polishing, and full examination.' },
      { title: 'Tooth Filling (Composite)',   price: 800,  currency: 'ETB', desc: 'Tooth-colored composite filling, same-day appointment.' },
      { title: 'Teeth Whitening Session',     price: 2500, currency: 'ETB', desc: 'In-chair LED whitening — up to 6 shades lighter in one session.' },
      { title: 'Tooth Extraction',            price: 400,  currency: 'ETB', desc: 'Simple or surgical extraction with local anaesthesia.' },
      { title: 'Dental X-Ray (Panoramic)',    price: 350,  currency: 'ETB', desc: 'Full-mouth digital panoramic X-ray with same-day report.' },
    ],
  },
  {
    name: 'Green Life Gym & Wellness',
    category: 'Health & Medical',
    address: 'Ayat, Addis Ababa',
    phone: '+251 93 901 2345',
    email: 'members@greenlifegym.et',
    description: 'Modern gym with personal training, yoga classes, and sauna facilities in Ayat.',
    sectionKeys: ['hero', 'services', 'certifications', 'testimonials', 'team', 'contact'],
    products: [
      { title: 'Monthly Gym Membership',      price: 800,  currency: 'ETB', desc: 'Unlimited gym access, locker, and one group class per week.' },
      { title: 'Personal Training (10 sessions)', price: 3500, currency: 'ETB', desc: '10 one-hour personal training sessions with certified trainer.' },
      { title: 'Yoga Class (monthly)',        price: 600,  currency: 'ETB', desc: 'Daily morning yoga classes, unlimited access for one month.' },
      { title: 'Sauna & Steam (per session)', price: 150,  currency: 'ETB', desc: 'Single sauna and steam room access session.' },
      { title: 'Nutrition Consultation',      price: 500,  currency: 'ETB', desc: 'One-hour session with certified nutritionist and meal plan.' },
    ],
  },
  {
    name: 'Tikur Anbessa Diagnostics',
    category: 'Health & Medical',
    address: 'Lideta, Addis Ababa',
    phone: '+251 94 012 3456',
    email: 'lab@tikurdiagnostics.et',
    description: 'Accredited diagnostic laboratory offering 150+ tests with same-day results in Lideta.',
    sectionKeys: ['hero', 'services', 'certifications', 'testimonials', 'team', 'contact'],
    products: [
      { title: 'Complete Blood Count (CBC)',   price: 200, currency: 'ETB', desc: 'Full blood cell count and differential. Results in 4 hours.' },
      { title: 'Thyroid Panel (T3/T4/TSH)',   price: 550, currency: 'ETB', desc: 'Comprehensive thyroid hormone test. Results in 24 hours.' },
      { title: 'COVID-19 PCR Test',           price: 900, currency: 'ETB', desc: 'RT-PCR test with certified result, accepted for travel.' },
      { title: 'HIV/Hepatitis Combo Screen',  price: 300, currency: 'ETB', desc: 'Confidential HIV, Hepatitis B, and Hepatitis C rapid test.' },
      { title: 'Urinalysis + Culture',        price: 250, currency: 'ETB', desc: 'Complete urine test with bacterial culture and sensitivity.' },
    ],
  },

  // ── Business & Commerce (10–14) ───────────────────────────────────────────
  {
    name: 'Desta Electronics Shop',
    category: 'Business & Commerce',
    address: 'Merkato, Addis Ababa',
    phone: '+251 91 123 9876',
    email: 'sales@destaelectronics.et',
    description: 'Authorised dealer of Tecno, Samsung, and itel electronics at Merkato\'s best prices.',
    sectionKeys: ['hero', 'items', 'brands', 'gallery', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Tecno Camon 30 (8GB/256GB)',  price: 18500, currency: 'ETB', desc: 'Latest Tecno flagship with 64MP camera, 5000mAh battery.' },
      { title: 'Samsung Galaxy A15',          price: 14900, currency: 'ETB', desc: 'Samsung mid-range with AMOLED screen and 6000mAh battery.' },
      { title: 'itel Vision 3 Plus Tablet',   price: 8500,  currency: 'ETB', desc: '10-inch Android tablet, perfect for schools and business.' },
      { title: 'Bluetooth Speaker (JBL Go4)', price: 2200,  currency: 'ETB', desc: 'Waterproof portable speaker with 7-hour battery.' },
      { title: 'USB-C Fast Charger (65W)',    price: 650,   currency: 'ETB', desc: 'GaN 65W fast charger compatible with all USB-C devices.' },
    ],
  },
  {
    name: 'Haile Fashion Store',
    category: 'Business & Commerce',
    address: 'Bole Medhanialem, Addis Ababa',
    phone: '+251 92 234 8765',
    email: 'shop@hailefashion.et',
    description: 'Contemporary Ethiopian and imported fashion for men and women in Bole.',
    sectionKeys: ['hero', 'items', 'brands', 'gallery', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Habesha Kemis (Ladies)',      price: 1800, currency: 'ETB', desc: 'Hand-woven traditional dress with modern tilet embroidery. All sizes.' },
      { title: "Men's Linen Suit Set",        price: 2500, currency: 'ETB', desc: 'Two-piece linen suit with traditional collar detail, slim fit.' },
      { title: 'Netela Shawl (Cotton)',       price: 350,  currency: 'ETB', desc: 'Lightweight cotton shawl with traditional border pattern.' },
      { title: 'Leather Oxford Shoes (Men)',  price: 1200, currency: 'ETB', desc: 'Handcrafted genuine leather oxford shoes from Merkato craftsmen.' },
      { title: 'Handbag (Ladies, Leather)',   price: 950,  currency: 'ETB', desc: 'Genuine leather handbag with traditional Ethiopian pattern lining.' },
    ],
  },
  {
    name: 'Abyssinia Hardware',
    category: 'Business & Commerce',
    address: 'Gofa, Addis Ababa',
    phone: '+251 93 345 7654',
    email: 'orders@abyssiniahw.et',
    description: 'Full hardware supply store for contractors and homeowners in Gofa — open 7 days.',
    sectionKeys: ['hero', 'items', 'brands', 'gallery', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Makita Drill 13mm (DF483)',    price: 5800,  currency: 'ETB', desc: 'Brushless 18V cordless drill driver with 2 batteries.' },
      { title: 'Portland Cement (50kg bag)',   price: 550,   currency: 'ETB', desc: 'OPC Grade 42.5 Portland cement for construction work.' },
      { title: 'UPVC Pipe (4-inch, 6m)',       price: 420,   currency: 'ETB', desc: 'Pressure-rated UPVC pipe for water and drainage.' },
      { title: 'Galvanized Roofing Sheet (3m)', price: 780,  currency: 'ETB', desc: 'Corrugated galvanized steel roofing sheet, 0.4mm gauge.' },
      { title: 'Safety Helmet + Vest Kit',    price: 320,   currency: 'ETB', desc: 'CE-marked hard hat and high-vis vest combo for site safety.' },
    ],
  },
  {
    name: 'Eden Supermarket',
    category: 'Business & Commerce',
    address: 'Kazanchis, Addis Ababa',
    phone: '+251 94 456 6543',
    email: 'info@edensupermarket.et',
    description: 'Modern supermarket stocking local and imported groceries, fresh produce, and household items.',
    sectionKeys: ['hero', 'items', 'brands', 'gallery', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Fresh Vegetable Box (Weekly)', price: 450,  currency: 'ETB', desc: 'Seasonal vegetables for a family of 4, sourced from Bishoftu farms.' },
      { title: 'Imported Cooking Oil (5L)',    price: 680,  currency: 'ETB', desc: 'Premium imported sunflower oil in 5-litre bottle.' },
      { title: 'Basmati Rice (5kg)',           price: 420,  currency: 'ETB', desc: 'Long-grain Indian basmati rice in sealed 5kg bag.' },
      { title: 'Laundry Detergent (Ariel 3kg)', price: 380, currency: 'ETB', desc: 'Ariel powder detergent for all washing machines and hand wash.' },
      { title: 'Fresh Eggs (Tray of 30)',      price: 320,  currency: 'ETB', desc: 'Farm-fresh eggs from local poultry farms, collected daily.' },
    ],
  },
  {
    name: 'Lily Cosmetics',
    category: 'Business & Commerce',
    address: 'Friendship, Addis Ababa',
    phone: '+251 91 567 5432',
    email: 'beauty@lilycosmetics.et',
    description: 'Premium cosmetics, skin care, and beauty supplies for all skin tones at Friendship.',
    sectionKeys: ['hero', 'items', 'brands', 'gallery', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Fenty Beauty Foundation (30ml)', price: 1200, currency: 'ETB', desc: 'Pro Filt\'r foundation in 50 shades, suitable for Ethiopian skin tones.' },
      { title: 'Shea Butter Body Lotion (500ml)', price: 380, currency: 'ETB', desc: 'Pure shea butter lotion for dry skin, unscented and skin-safe.' },
      { title: 'Natural Hair Relaxer Kit',      price: 480,  currency: 'ETB', desc: 'Gentle hair relaxer with conditioning treatment for coarse hair.' },
      { title: 'Eyeshadow Palette (12 colours)', price: 650, currency: 'ETB', desc: 'Matte and shimmer shades in a warm pigmented palette.' },
      { title: 'Lip Gloss Set (6 shades)',       price: 320, currency: 'ETB', desc: 'Long-lasting hydrating lip gloss in 6 complementary shades.' },
    ],
  },

  // ── Construction & Trade (15–19) ──────────────────────────────────────────
  {
    name: 'Yohannes Construction PLC',
    category: 'Construction & Trade',
    address: 'Ayat, Addis Ababa',
    phone: '+251 92 678 4321',
    email: 'contracts@yohannesplc.et',
    description: 'Licensed general contractor delivering residential and commercial builds across Addis Ababa.',
    sectionKeys: ['hero', 'services', 'before_after', 'certifications', 'portfolio', 'testimonials', 'contact'],
    products: [
      { title: 'Residential House Build (per sqm)', price: 8500,  currency: 'ETB', desc: 'Full construction cost per square metre including labour and materials.' },
      { title: 'Villa Renovation (full)',           price: 350000, currency: 'ETB', desc: 'Complete renovation of a 3-bedroom villa: plastering, tiling, painting.' },
      { title: 'Foundation Work (per m²)',          price: 3200,  currency: 'ETB', desc: 'Strip or raft foundation including excavation and concrete.' },
      { title: 'Roof Construction (per sqm)',       price: 2800,  currency: 'ETB', desc: 'Timber truss and galvanized iron sheet roof installation.' },
      { title: 'Site Management (per month)',       price: 15000, currency: 'ETB', desc: 'Dedicated site engineer supervision for your project.' },
    ],
  },
  {
    name: 'Addis Solar & Electric',
    category: 'Construction & Trade',
    address: 'Lebu, Addis Ababa',
    phone: '+251 93 789 3210',
    email: 'install@addissolar.et',
    description: 'Solar panel installation and electrical contracting for homes and businesses in Lebu.',
    sectionKeys: ['hero', 'services', 'before_after', 'certifications', 'portfolio', 'testimonials', 'contact'],
    products: [
      { title: 'Solar Home System (3kW)',      price: 95000,  currency: 'ETB', desc: '3kW solar PV system with inverter, battery, and 5-year warranty.' },
      { title: 'Solar Water Heater (200L)',    price: 28000,  currency: 'ETB', desc: 'Evacuated tube solar water heater, installed on rooftop.' },
      { title: 'House Electrical Rewiring',   price: 18000,  currency: 'ETB', desc: 'Full rewiring of a 3-bedroom house with breaker panel upgrade.' },
      { title: 'Generator Installation',      price: 35000,  currency: 'ETB', desc: '10kVA standby generator supply and installation with auto changeover.' },
      { title: 'Energy Audit & Report',       price: 2500,   currency: 'ETB', desc: 'On-site energy audit with detailed report and saving recommendations.' },
    ],
  },
  {
    name: 'Habesha Tiles & Floors',
    category: 'Construction & Trade',
    address: 'Mekanisa, Addis Ababa',
    phone: '+251 94 890 2109',
    email: 'sales@habeshatiles.et',
    description: 'Supply and installation of floor and wall tiles, marble, and epoxy flooring in Mekanisa.',
    sectionKeys: ['hero', 'services', 'before_after', 'certifications', 'portfolio', 'testimonials', 'contact'],
    products: [
      { title: 'Porcelain Floor Tile (per m²)',   price: 380, currency: 'ETB', desc: '60×60cm polished porcelain tile, imported Italian design.' },
      { title: 'Marble Countertop (per m)',       price: 2200, currency: 'ETB', desc: 'White Carrara marble countertop, cut and installed per linear metre.' },
      { title: 'Epoxy Floor Coating (per m²)',    price: 450, currency: 'ETB', desc: '2mm self-levelling epoxy coating for commercial and garage floors.' },
      { title: 'Tile Installation Labour (per m²)', price: 180, currency: 'ETB', desc: 'Skilled tiler supply and fix, including grout and levelling.' },
      { title: 'Bathroom Tile Makeover',          price: 12000, currency: 'ETB', desc: 'Full bathroom retiling — floor, walls, and shower. Labour and tiles.' },
    ],
  },
  {
    name: 'Akaki Metal Works',
    category: 'Construction & Trade',
    address: 'Akaki, Addis Ababa',
    phone: '+251 91 901 0987',
    email: 'fab@ahahimetalworks.et',
    description: 'Custom metal fabrication, gates, doors, and structural steelwork based in Akaki.',
    sectionKeys: ['hero', 'services', 'before_after', 'certifications', 'portfolio', 'testimonials', 'contact'],
    products: [
      { title: 'Security Door (Steel, Custom)', price: 8500,  currency: 'ETB', desc: 'Heavy-gauge steel security door, custom size, powder-coated finish.' },
      { title: 'Compound Gate (Double Leaf)',   price: 22000, currency: 'ETB', desc: 'Motorised or manual double-leaf compound gate with welded design.' },
      { title: 'Steel Window Frame (per piece)', price: 1800, currency: 'ETB', desc: 'Standard or custom steel window frame with glass and installation.' },
      { title: 'Staircase Railing (per metre)', price: 1200, currency: 'ETB', desc: 'Welded steel or wrought iron railing, custom design available.' },
      { title: 'Metal Roof Truss (per sqm)',    price: 950,  currency: 'ETB', desc: 'Structural steel roof truss fabricated and installed.' },
    ],
  },
  {
    name: 'Genet Cleaning Services',
    category: 'Construction & Trade',
    address: 'Bole, Addis Ababa',
    phone: '+251 92 012 9876',
    email: 'book@genetcleaning.et',
    description: 'Professional commercial and residential deep cleaning using eco-friendly products in Bole.',
    sectionKeys: ['hero', 'services', 'before_after', 'certifications', 'portfolio', 'testimonials', 'contact'],
    products: [
      { title: 'Office Deep Clean (per session)', price: 2500, currency: 'ETB', desc: 'Full office cleaning for up to 100 sqm, including toilets.' },
      { title: 'Residential Deep Clean (3BR)',    price: 1800, currency: 'ETB', desc: 'Full house deep clean — kitchen, bathrooms, bedrooms, living room.' },
      { title: 'Post-Construction Clean-Up',      price: 4500, currency: 'ETB', desc: 'Dust, debris, and cement removal from a newly built house.' },
      { title: 'Carpet Steam Cleaning (per m²)',  price: 80,   currency: 'ETB', desc: 'Hot water extraction carpet cleaning with drying in 3 hours.' },
      { title: 'Monthly Office Contract',        price: 6000, currency: 'ETB', desc: 'Daily cleaning service for offices, 22 working days per month.' },
    ],
  },

  // ── Transport & Logistics (20–24) ─────────────────────────────────────────
  {
    name: 'Ethio Cargo Express',
    category: 'Transport & Logistics',
    address: 'Gofa, Addis Ababa',
    phone: '+251 93 123 8765',
    email: 'cargo@ethiocargoexpress.et',
    description: 'Same-day and next-day cargo and courier service within Addis Ababa and intercity.',
    sectionKeys: ['hero', 'services', 'pricing', 'contact'],
    products: [
      { title: 'Same-Day City Delivery',      price: 150, currency: 'ETB', desc: 'Door-to-door delivery within Addis Ababa in 4 hours or less.' },
      { title: 'Intercity Parcel (up to 10kg)', price: 350, currency: 'ETB', desc: 'Next-day delivery to Dire Dawa, Bahir Dar, Hawassa, or Mekelle.' },
      { title: 'Express Document Delivery',   price: 80,  currency: 'ETB', desc: 'Urgent document pickup and delivery within 2 hours in Addis.' },
      { title: 'Monthly Courier Contract',    price: 4500, currency: 'ETB', desc: 'Dedicated daily runner for your business. Up to 10 deliveries/day.' },
      { title: 'Freight (per 100kg, intercity)', price: 1200, currency: 'ETB', desc: 'Road freight for bulky goods to major Ethiopian cities.' },
    ],
  },
  {
    name: 'Addis Car Rental',
    category: 'Transport & Logistics',
    address: 'Airport Road, Addis Ababa',
    phone: '+251 94 234 7654',
    email: 'fleet@addiscarrental.et',
    description: 'Self-drive and chauffeur car rental from Bole airport and city locations.',
    sectionKeys: ['hero', 'services', 'pricing', 'contact'],
    products: [
      { title: 'Toyota Corolla (per day)',     price: 2500, currency: 'ETB', desc: 'Fuel-efficient sedan, self-drive, includes 200km per day.' },
      { title: 'Toyota Land Cruiser (per day)', price: 8000, currency: 'ETB', desc: '4WD LandCruiser for intercity or rugged-terrain trips.' },
      { title: 'Minibus (12-seater, per day)', price: 5000, currency: 'ETB', desc: '12-seat minibus with driver for group transfers.' },
      { title: 'Airport Transfer (one way)',   price: 800,  currency: 'ETB', desc: 'Meet-and-greet pickup or drop-off at Bole International Airport.' },
      { title: 'Monthly Executive Lease',     price: 55000, currency: 'ETB', desc: 'Dedicated car + driver for corporate clients, 22 working days.' },
    ],
  },
  {
    name: 'Swift Delivery Riders',
    category: 'Transport & Logistics',
    address: 'Megenagna, Addis Ababa',
    phone: '+251 91 345 6543',
    email: 'dispatch@swiftdelivery.et',
    description: 'On-demand motorcycle delivery for restaurants, shops, and e-commerce in Addis.',
    sectionKeys: ['hero', 'services', 'pricing', 'contact'],
    products: [
      { title: 'Single Delivery (per trip)',  price: 80,  currency: 'ETB', desc: 'One pickup, one drop-off within Addis. 30-60 minutes.' },
      { title: '10-Trip Bundle',              price: 700, currency: 'ETB', desc: 'Pre-paid 10 deliveries, valid 30 days, no expiry if unused.' },
      { title: 'Restaurant Daily Runner',    price: 2500, currency: 'ETB', desc: 'Dedicated rider for your restaurant: up to 25 deliveries/day.' },
      { title: 'Bulky Item Pickup (van)',     price: 500, currency: 'ETB', desc: 'Small van for items too big for a motorbike. Same-day.' },
      { title: 'Subscription (100 trips/mo)', price: 6000, currency: 'ETB', desc: 'Monthly plan for high-volume businesses: 100 trips, priority dispatch.' },
    ],
  },
  {
    name: 'Tsion Moving Services',
    category: 'Transport & Logistics',
    address: 'Sarbet, Addis Ababa',
    phone: '+251 92 456 5432',
    email: 'move@tsionmoving.et',
    description: 'Professional house and office relocation with packing, moving, and setup services.',
    sectionKeys: ['hero', 'services', 'pricing', 'contact'],
    products: [
      { title: 'Studio / 1BR Move',           price: 3500,  currency: 'ETB', desc: 'Full packing, loading, transport, and unloading for a small flat.' },
      { title: '3-Bedroom House Move',        price: 8500,  currency: 'ETB', desc: 'Full house relocation with packing materials and two-person crew.' },
      { title: 'Office Relocation',           price: 15000, currency: 'ETB', desc: 'Overnight office move with IT equipment handling and furniture assembly.' },
      { title: 'Single Item Transport',       price: 800,   currency: 'ETB', desc: 'Move a single large item (sofa, fridge, bed frame) anywhere in Addis.' },
      { title: 'Storage (per month)',         price: 1200,  currency: 'ETB', desc: 'Secure, dry storage unit for household or business items.' },
    ],
  },
  {
    name: 'Atlas Travel Agency',
    category: 'Transport & Logistics',
    address: 'Bole, Addis Ababa',
    phone: '+251 93 567 4321',
    email: 'tickets@atlastravel.et',
    description: 'IATA-accredited travel agency for flights, visas, hotels, and tour packages.',
    sectionKeys: ['hero', 'services', 'pricing', 'contact'],
    products: [
      { title: 'Domestic Flight Ticket',      price: 3500,  currency: 'ETB', desc: 'Ethiopian Airlines economy ticket to any domestic destination.' },
      { title: 'Visa Application Assistance', price: 1500,  currency: 'ETB', desc: 'Document prep and submission for Schengen, US, UK, or GCC visas.' },
      { title: 'Hotel Booking Service',       price: 500,   currency: 'ETB', desc: 'Hotel search, comparison, and booking in any country. Fee per booking.' },
      { title: 'Lalibela Heritage Tour (3D)',  price: 12500, currency: 'ETB', desc: '3-day guided tour to Lalibela: flights, hotel, meals, and guide.' },
      { title: 'Corporate Travel Management', price: 8000,  currency: 'ETB', desc: 'Monthly corporate travel service: tickets, hotels, and expense reports.' },
    ],
  },

  // ── Education (25–29) ─────────────────────────────────────────────────────
  {
    name: 'Kidus Language Academy',
    category: 'Education',
    address: 'Gerji, Addis Ababa',
    phone: '+251 94 678 3210',
    email: 'enroll@kiduslanguage.et',
    description: 'English, French, Arabic, and Chinese language courses for all levels in Gerji.',
    sectionKeys: ['hero', 'services', 'event_schedule', 'features', 'testimonials', 'contact'],
    products: [
      { title: 'English Course (3 months)',   price: 3500, currency: 'ETB', desc: 'Beginner to advanced English, 5 days/week, 2 hours/day.' },
      { title: 'French Beginner (1 month)',   price: 1800, currency: 'ETB', desc: 'Intensive French A1 course. 4 hours daily, small classes.' },
      { title: 'IELTS Preparation Course',    price: 4500, currency: 'ETB', desc: '6-week IELTS prep with mock tests and tutor feedback.' },
      { title: 'Business English (Online)',   price: 2500, currency: 'ETB', desc: 'Live online business English, 3×/week. Certificate on completion.' },
      { title: 'Arabic for Beginners (2mo)',  price: 2800, currency: 'ETB', desc: 'Modern standard Arabic, 2-month evening course.' },
    ],
  },
  {
    name: 'Selam Driving School',
    category: 'Education',
    address: 'Lebu, Addis Ababa',
    phone: '+251 91 789 2109',
    email: 'drive@selamdriving.et',
    description: 'Accredited driving school for cars and motorcycles with Ethiopian driving licence prep.',
    sectionKeys: ['hero', 'services', 'event_schedule', 'features', 'testimonials', 'contact'],
    products: [
      { title: 'Standard Car Licence Package',   price: 4500, currency: 'ETB', desc: '30 practical + 10 theory lessons. Includes licence test fees.' },
      { title: 'Motorcycle Licence Course',      price: 2800, currency: 'ETB', desc: '15 practical lessons for Category A motorcycle licence.' },
      { title: 'Defensive Driving (Advanced)',   price: 2200, currency: 'ETB', desc: '10-hour advanced course for experienced drivers. Certificate issued.' },
      { title: 'Theory-Only Prep (10 sessions)', price: 800,  currency: 'ETB', desc: 'Highway code, road signs, and practice mock tests only.' },
      { title: 'Truck & Bus Licence (Cat. C/D)', price: 6500, currency: 'ETB', desc: 'Heavy vehicle licence course — 35 lessons, includes theory exam.' },
    ],
  },
  {
    name: 'Ethiopian Music Academy',
    category: 'Education',
    address: 'Kazanchis, Addis Ababa',
    phone: '+251 92 890 0987',
    email: 'learn@ethiomusic.et',
    description: 'One-on-one and group lessons in krar, masinko, guitar, piano, and voice in Kazanchis.',
    sectionKeys: ['hero', 'services', 'event_schedule', 'features', 'testimonials', 'contact'],
    products: [
      { title: 'Krar Lessons (monthly)',      price: 1200, currency: 'ETB', desc: 'Traditional Ethiopian krar — 8 one-hour lessons per month.' },
      { title: 'Guitar Beginner Course (3mo)', price: 3000, currency: 'ETB', desc: '12-week acoustic or electric guitar course for absolute beginners.' },
      { title: 'Vocal Training (monthly)',    price: 1500, currency: 'ETB', desc: 'Individual singing lessons, 8 sessions: technique and repertoire.' },
      { title: 'Piano Lessons (monthly)',     price: 1800, currency: 'ETB', desc: 'Classical and contemporary piano, 4 lessons per month.' },
      { title: 'Group Band Workshop (5-day)', price: 2500, currency: 'ETB', desc: '5-day intensive ensemble workshop: rhythm, melody, and performance.' },
    ],
  },
  {
    name: 'Future Coders Institute',
    category: 'Education',
    address: 'Ayat, Addis Ababa',
    phone: '+251 93 901 9876',
    email: 'enroll@futurecoders.et',
    description: 'Practical coding and software development bootcamps for youth and professionals in Ayat.',
    sectionKeys: ['hero', 'services', 'event_schedule', 'features', 'testimonials', 'contact'],
    products: [
      { title: 'Web Dev Bootcamp (3 months)',  price: 8500,  currency: 'ETB', desc: 'HTML, CSS, JavaScript, and React. Project-based, job-ready.' },
      { title: 'Python for Beginners (6 wks)', price: 4500,  currency: 'ETB', desc: '6-week Python basics course: syntax, data, automation, and projects.' },
      { title: 'Mobile App Dev (Flutter, 3mo)', price: 10000, currency: 'ETB', desc: 'Build Android and iOS apps with Flutter and Dart.' },
      { title: 'Database & SQL (4 weeks)',     price: 3500,  currency: 'ETB', desc: 'Practical SQL and PostgreSQL for backend and data work.' },
      { title: 'UI/UX Design Course (2 months)', price: 7000, currency: 'ETB', desc: 'Figma, user research, wireframing, and prototyping.' },
    ],
  },
  {
    name: 'Sunrise Kindergarten',
    category: 'Education',
    address: 'CMC, Addis Ababa',
    phone: '+251 94 012 8765',
    email: 'admin@sunrisekinder.et',
    description: 'Nurturing bilingual (Amharic/English) kindergarten for ages 2–6 in a safe CMC environment.',
    sectionKeys: ['hero', 'services', 'event_schedule', 'features', 'testimonials', 'contact'],
    products: [
      { title: 'Nursery (Age 2–3) Monthly Fee',  price: 2200, currency: 'ETB', desc: 'Half-day nursery program, Mon–Fri 7:30am–12:30pm.' },
      { title: 'Kindergarten (Age 4–6) Monthly', price: 2800, currency: 'ETB', desc: 'Full-day KG program with lunch, Mon–Fri 7:30am–4:00pm.' },
      { title: 'After-School Care (monthly)',    price: 800,  currency: 'ETB', desc: 'After-school supervision until 6:00pm for enrolled students.' },
      { title: 'Transport (monthly, one way)',   price: 600,  currency: 'ETB', desc: 'Daily school bus pickup or drop-off within 5km radius.' },
      { title: 'Holiday Camp (per week)',        price: 1200, currency: 'ETB', desc: 'Themed holiday activity camp for ages 3–6, Mon–Fri 8am–3pm.' },
    ],
  },

  // ── Professional Services (30–34) ─────────────────────────────────────────
  {
    name: 'Addis Digital Agency',
    category: 'Professional Services',
    address: 'Bole, Addis Ababa',
    phone: '+251 91 123 7654',
    email: 'hello@addisdigital.et',
    description: 'Full-service digital marketing and web development agency serving Ethiopian businesses.',
    sectionKeys: ['hero', 'services', 'certifications', 'portfolio', 'team', 'testimonials', 'contact'],
    products: [
      { title: 'Website Design Package',         price: 12000, currency: 'ETB', desc: '5-page responsive website with CMS, mobile optimized, 1-month support.' },
      { title: 'Social Media Management (1mo)',  price: 6000,  currency: 'ETB', desc: '20 posts across 2 platforms, content creation, scheduling, and analytics.' },
      { title: 'Logo + Brand Identity',          price: 4500,  currency: 'ETB', desc: 'Logo, colour palette, typography, and brand guideline PDF. 3 concepts.' },
      { title: 'Google Ads Campaign (setup)',    price: 3500,  currency: 'ETB', desc: 'Google Search campaign setup: keywords, ad copy, and conversion tracking.' },
      { title: 'SEO Audit & Report',             price: 2800,  currency: 'ETB', desc: 'Full on-page and technical SEO audit with action plan.' },
    ],
  },
  {
    name: 'Habtamu & Associates Law Firm',
    category: 'Professional Services',
    address: 'Piassa, Addis Ababa',
    phone: '+251 92 234 6543',
    email: 'legal@habtamulaw.et',
    description: 'Business law, real estate, employment, and litigation services from Piassa.',
    sectionKeys: ['hero', 'services', 'certifications', 'portfolio', 'team', 'testimonials', 'contact'],
    products: [
      { title: 'Business Registration',          price: 2500,  currency: 'ETB', desc: 'Full company registration with MoTRI — certificate in 2 weeks.' },
      { title: 'Contract Drafting (standard)',   price: 3000,  currency: 'ETB', desc: 'Professionally drafted commercial contract reviewed by senior counsel.' },
      { title: 'Real Estate Title Review',       price: 2000,  currency: 'ETB', desc: 'Legal due diligence on land title deeds and transfer documents.' },
      { title: 'Employment Dispute Consultation', price: 1500, currency: 'ETB', desc: 'One-hour employment law consultation with written advice.' },
      { title: 'Litigation Representation (per hearing)', price: 5000, currency: 'ETB', desc: 'Court appearance and representation per hearing session.' },
    ],
  },
  {
    name: 'Tsehay Accounting & Tax',
    category: 'Professional Services',
    address: 'Kazanchis, Addis Ababa',
    phone: '+251 93 345 5432',
    email: 'tax@tsehayaccounting.et',
    description: 'ICPAE-certified accounting, tax filing, and payroll services for SMEs in Kazanchis.',
    sectionKeys: ['hero', 'services', 'certifications', 'portfolio', 'team', 'testimonials', 'contact'],
    products: [
      { title: 'Annual Tax Return (SME)',        price: 3500, currency: 'ETB', desc: 'ERCA-compliant annual business tax return filing. VAT included.' },
      { title: 'Monthly Bookkeeping',            price: 2500, currency: 'ETB', desc: 'Monthly books: income, expenses, invoices, and bank reconciliation.' },
      { title: 'Payroll Processing (per month)', price: 1800, currency: 'ETB', desc: 'Salary calculation, pension deduction, and payslip generation.' },
      { title: 'VAT Registration & Filing',     price: 2000, currency: 'ETB', desc: 'VAT registration with ERCA and monthly VAT return preparation.' },
      { title: 'Financial Statements (annual)',  price: 4500, currency: 'ETB', desc: 'IFRS-compliant annual financial statements: P&L, balance sheet, cash flow.' },
    ],
  },
  {
    name: 'Nile HR & Recruitment',
    category: 'Professional Services',
    address: 'Friendship, Addis Ababa',
    phone: '+251 94 456 4321',
    email: 'hr@nilehr.et',
    description: 'End-to-end HR consulting and executive recruitment for Ethiopian companies.',
    sectionKeys: ['hero', 'services', 'certifications', 'portfolio', 'team', 'testimonials', 'contact'],
    products: [
      { title: 'Recruitment (per hire, junior)',  price: 5000,  currency: 'ETB', desc: 'Sourcing, screening, and shortlisting for entry-level positions.' },
      { title: 'Executive Search (per placement)', price: 25000, currency: 'ETB', desc: 'Retained search for C-suite and director-level roles.' },
      { title: 'HR Policy Manual (setup)',        price: 8000,  currency: 'ETB', desc: 'Full HR policy manual tailored to Ethiopian labour law.' },
      { title: 'Payroll Outsourcing (monthly)',   price: 3500,  currency: 'ETB', desc: 'Complete payroll management for up to 30 employees.' },
      { title: 'Staff Training Workshop (1 day)', price: 6500,  currency: 'ETB', desc: 'Custom 1-day HR or leadership training workshop on-site.' },
    ],
  },
  {
    name: 'TechFix IT Support',
    category: 'Professional Services',
    address: 'Megenagna, Addis Ababa',
    phone: '+251 91 567 3210',
    email: 'support@techfix.et',
    description: 'On-site and remote IT support, networking, and device repair for offices in Addis.',
    sectionKeys: ['hero', 'services', 'certifications', 'portfolio', 'team', 'testimonials', 'contact'],
    products: [
      { title: 'On-Site IT Support (per hour)', price: 500,   currency: 'ETB', desc: 'Certified technician on-site for troubleshooting and repairs.' },
      { title: 'Monthly IT Retainer (up to 5 devices)', price: 4500, currency: 'ETB', desc: 'Proactive monthly IT support: patches, backups, and helpdesk.' },
      { title: 'Network Setup (office, up to 20 users)', price: 15000, currency: 'ETB', desc: 'Structured cabling, router, switches, and Wi-Fi access points.' },
      { title: 'Data Recovery',                 price: 2500,  currency: 'ETB', desc: 'Laptop, desktop, or USB drive data recovery. No recovery, no charge.' },
      { title: 'CCTV Installation (4 cameras)', price: 18000, currency: 'ETB', desc: '4-camera IP CCTV system with 1TB DVR and remote viewing.' },
    ],
  },

  // ── Agriculture & Farming (35–39) ─────────────────────────────────────────
  {
    name: 'Rift Valley Coffee Farm',
    category: 'Agriculture & Farming',
    address: 'Jimma Road, Addis Ababa area',
    phone: '+251 92 678 2109',
    email: 'export@riftvalleycoffee.et',
    description: 'Shade-grown single-origin Jimma coffee direct from farm to buyer, export and retail.',
    sectionKeys: ['hero', 'items', 'about', 'contact'],
    products: [
      { title: 'Washed Jimma Grade 2 (1kg)',   price: 320, currency: 'ETB', desc: 'Sun-dried, hand-sorted Grade 2 Jimma coffee, fresh harvest.' },
      { title: 'Natural Process Jimma (1kg)',  price: 380, currency: 'ETB', desc: 'Natural dry-process Jimma with fruit-forward, wine-like notes.' },
      { title: 'Green Coffee Beans (10kg)',    price: 2800, currency: 'ETB', desc: 'Unroasted green coffee beans for roasters. Consistent Grade 2.' },
      { title: 'Farm-Roasted Blend (500g)',    price: 220, currency: 'ETB', desc: 'Medium roast house blend, roasted on-farm in small batches.' },
      { title: 'Coffee Seedlings (per 100)',   price: 500, currency: 'ETB', desc: 'Healthy Jimma 74 variety seedlings for smallholder planting.' },
    ],
  },
  {
    name: 'Selam Organic Vegetables',
    category: 'Agriculture & Farming',
    address: 'Chancho, near Addis Ababa',
    phone: '+251 93 789 1098',
    email: 'farm@selamorganic.et',
    description: 'Pesticide-free vegetables grown in Chancho, delivered weekly to homes in Addis.',
    sectionKeys: ['hero', 'items', 'about', 'contact'],
    products: [
      { title: 'Weekly Veg Box (Family, 5kg)',  price: 480, currency: 'ETB', desc: 'Mixed seasonal organic vegetables for a family of 4, delivered Friday.' },
      { title: 'Tomato (1kg)',                  price: 45,  currency: 'ETB', desc: 'Vine-ripened organic tomatoes, pesticide-free.' },
      { title: 'Lettuce & Salad Greens (bag)',  price: 60,  currency: 'ETB', desc: 'Mixed salad greens: lettuce, rocket, and spinach. Washed and bagged.' },
      { title: 'Carrot (1kg)',                  price: 35,  currency: 'ETB', desc: 'Sweet organic carrots, farm-fresh and unwaxed.' },
      { title: 'Herb Bundle (3 types)',         price: 55,  currency: 'ETB', desc: 'Fresh rosemary, thyme, and parsley from the farm.' },
    ],
  },
  {
    name: 'Ethiopian Honey House',
    category: 'Agriculture & Farming',
    address: 'Holeta, near Addis Ababa',
    phone: '+251 94 890 0876',
    email: 'honey@ethiohoneyhouse.et',
    description: 'Pure wild-forest and highland honey from Holeta beekeepers, direct to your door.',
    sectionKeys: ['hero', 'items', 'about', 'contact'],
    products: [
      { title: 'White Forest Honey (500g)',     price: 280, currency: 'ETB', desc: 'Raw, unfiltered white honey from Holeta highland forests.' },
      { title: 'Dark Highland Honey (500g)',    price: 240, currency: 'ETB', desc: 'Rich dark honey with molasses notes from mountain hives.' },
      { title: 'Honeycomb Section (300g)',      price: 320, currency: 'ETB', desc: 'Pure honeycomb cut fresh from the hive, wax and all.' },
      { title: 'Honey Gift Box (3 varieties)',  price: 680, currency: 'ETB', desc: 'Gift box with 3×250g jars: white, dark, and creamed honey.' },
      { title: 'Beeswax Block (100g)',          price: 120, currency: 'ETB', desc: 'Natural beeswax block for cosmetics, candles, or wood polish.' },
    ],
  },
  {
    name: 'Abay Agri Supplies',
    category: 'Agriculture & Farming',
    address: 'Bishoftu Road, Addis Ababa',
    phone: '+251 91 901 9765',
    email: 'supply@abayagri.et',
    description: 'Agricultural inputs, seeds, fertilisers, and tools for smallholder and commercial farmers.',
    sectionKeys: ['hero', 'items', 'about', 'contact'],
    products: [
      { title: 'Urea Fertilizer (50kg bag)',    price: 1800, currency: 'ETB', desc: 'Agricultural-grade urea 46% N, bulk pricing available.' },
      { title: 'Hybrid Maize Seed (5kg)',       price: 650,  currency: 'ETB', desc: 'BH-546 hybrid maize seed, improved drought-tolerant variety.' },
      { title: 'Drip Irrigation Kit (1 dunam)', price: 8500, currency: 'ETB', desc: 'Complete drip system for 1000 sqm: tape, fittings, and filter.' },
      { title: 'Knapsack Sprayer (16L)',        price: 750,  currency: 'ETB', desc: 'Manual backpack sprayer for pesticide and herbicide application.' },
      { title: 'Compost (1 tonne delivery)',    price: 2200, currency: 'ETB', desc: 'Matured organic compost delivered to your farm gate.' },
    ],
  },
  {
    name: 'Nile Poultry Farm',
    category: 'Agriculture & Farming',
    address: 'Dukem, near Addis Ababa',
    phone: '+251 92 012 8654',
    email: 'orders@nilepoultry.et',
    description: 'Commercial broiler and layer poultry farm supplying whole chickens and eggs in bulk.',
    sectionKeys: ['hero', 'items', 'about', 'contact'],
    products: [
      { title: 'Live Broiler Chicken (2kg+)',   price: 350, currency: 'ETB', desc: 'Healthy 42-day broiler chicken, live weight 2kg and above.' },
      { title: 'Fresh Eggs (Crate of 30)',      price: 310, currency: 'ETB', desc: 'Large brown eggs from vaccinated layers, collected daily.' },
      { title: 'Dressed Chicken (per kg)',      price: 220, currency: 'ETB', desc: 'Cleaned and dressed whole chicken, ready to cook.' },
      { title: 'Day-Old Chicks (per 100)',      price: 4500, currency: 'ETB', desc: 'Vaccinated day-old broiler or layer chicks for your farm.' },
      { title: 'Poultry Feed (50kg, broiler)',  price: 900, currency: 'ETB', desc: 'Broiler finisher pellet feed, high protein, 50kg bag.' },
    ],
  },

  // ── Hospitality & Tourism (40–44) ─────────────────────────────────────────
  {
    name: 'Addis View Guesthouse',
    category: 'Hospitality & Tourism',
    address: 'Bole, Addis Ababa',
    phone: '+251 93 123 7543',
    email: 'reservations@addisviewguesthouse.et',
    description: 'Quiet, clean guesthouse with garden and free breakfast, walking distance from Bole airport.',
    sectionKeys: ['hero', 'gallery', 'services', 'event_schedule', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Standard Room (per night)',    price: 1800, currency: 'ETB', desc: 'En-suite standard room with Wi-Fi, breakfast, and garden view.' },
      { title: 'Deluxe Room (per night)',      price: 2800, currency: 'ETB', desc: 'Spacious deluxe room with AC, safe, and city view. Breakfast included.' },
      { title: 'Airport Transfer (one way)',   price: 500,  currency: 'ETB', desc: 'Pick-up from Bole airport to guesthouse, available 24/7.' },
      { title: 'Conference Room (half day)',   price: 3500, currency: 'ETB', desc: 'Air-conditioned conference room for 15, with projector and refreshments.' },
      { title: 'Laundry Service (per kg)',     price: 80,   currency: 'ETB', desc: 'Same-day laundry and pressing service for guests.' },
    ],
  },
  {
    name: 'Ethiopia Heritage Tours',
    category: 'Hospitality & Tourism',
    address: 'Piassa, Addis Ababa',
    phone: '+251 94 234 6432',
    email: 'tours@ethiopiaheritagetours.et',
    description: 'Licensed tour operator specialising in cultural, historical, and adventure tours across Ethiopia.',
    sectionKeys: ['hero', 'gallery', 'services', 'event_schedule', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Lalibela Rock Churches Tour (3D)', price: 15000, currency: 'ETB', desc: '3-day guided Lalibela tour: flights, hotel, guide, and entrance fees.' },
      { title: 'Addis Ababa City Tour (1 day)',    price: 1500,  currency: 'ETB', desc: 'Full-day Addis tour: museums, markets, monuments, and lunch.' },
      { title: 'Omo Valley Cultural Tour (7D)',   price: 45000, currency: 'ETB', desc: '7-day Omo Valley cultural tour: tribes, ceremonies, and lodges.' },
      { title: 'Simien Mountains Trek (5D)',      price: 28000, currency: 'ETB', desc: '5-day Simien trek with guide, porter, national park fees, and camping.' },
      { title: 'Danakil Depression Adventure (3D)', price: 18000, currency: 'ETB', desc: '3-day Danakil tour including Erta Ale and Dallol salt flats.' },
    ],
  },
  {
    name: 'Lalibela Wedding Venue',
    category: 'Hospitality & Tourism',
    address: 'CMC, Addis Ababa',
    phone: '+251 91 345 5321',
    email: 'events@lalibelawedding.et',
    description: 'Elegant indoor and outdoor wedding and event venue for up to 500 guests in CMC.',
    sectionKeys: ['hero', 'gallery', 'services', 'event_schedule', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Full Wedding Package (200 pax)', price: 180000, currency: 'ETB', desc: 'Venue, catering, decoration, DJ, photography, and video for 200 guests.' },
      { title: 'Venue Hire Only (per day)',       price: 45000,  currency: 'ETB', desc: 'Venue rental from 8am to midnight, chairs, tables, and lighting.' },
      { title: 'Corporate Event Package (100 pax)', price: 55000, currency: 'ETB', desc: 'Venue, catering, AV, and event staff for a corporate event.' },
      { title: 'Wedding Photography (full day)', price: 18000,  currency: 'ETB', desc: 'Full-day photo and video coverage with edited album and USB.' },
      { title: 'Floral Decoration Package',      price: 22000,  currency: 'ETB', desc: 'Full venue floral setup: stage, tables, entrance arch, and bouquets.' },
    ],
  },
  {
    name: 'Entoto Eco-Lodge',
    category: 'Hospitality & Tourism',
    address: 'Entoto, Addis Ababa',
    phone: '+251 92 456 4210',
    email: 'stay@entotoecolodge.et',
    description: 'Sustainable eco-lodge nestled in Entoto forest — fresh air, hiking trails, and city views.',
    sectionKeys: ['hero', 'gallery', 'services', 'event_schedule', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Forest Cabin (per night)',     price: 3500, currency: 'ETB', desc: 'Private eco-cabin with log fire, solar power, and forest view.' },
      { title: 'Glamping Tent (per night)',    price: 2200, currency: 'ETB', desc: 'Furnished safari tent with real bed and shared eco-bathroom.' },
      { title: 'Guided Entoto Forest Hike',   price: 800,  currency: 'ETB', desc: '3-hour guided forest hike with birdwatching and historical stops.' },
      { title: 'Yoga & Nature Retreat (2D)',   price: 7500, currency: 'ETB', desc: '2-day yoga retreat with meals, accommodation, and guided walks.' },
      { title: 'Group Bonfire Dinner (per pax)', price: 1200, currency: 'ETB', desc: 'Outdoor group dinner with bonfire, traditional food, and live music.' },
    ],
  },
  {
    name: 'Capital Hotel & Restaurant',
    category: 'Hospitality & Tourism',
    address: 'Kazanchis, Addis Ababa',
    phone: '+251 93 567 3109',
    email: 'info@capitalhoteladdis.et',
    description: 'Business hotel with 60 rooms, rooftop restaurant, pool, and conference facilities in Kazanchis.',
    sectionKeys: ['hero', 'gallery', 'services', 'event_schedule', 'testimonials', 'contact', 'social'],
    products: [
      { title: 'Standard Room (per night)',    price: 3200, currency: 'ETB', desc: 'Comfortable standard room with Wi-Fi, TV, and continental breakfast.' },
      { title: 'Executive Suite (per night)',  price: 7500, currency: 'ETB', desc: 'Spacious executive suite with lounge area, minibar, and city views.' },
      { title: 'Rooftop Restaurant Dinner (per pax)', price: 850, currency: 'ETB', desc: '3-course set dinner at rooftop restaurant. Booking required.' },
      { title: 'Pool Day Pass',               price: 400,  currency: 'ETB', desc: 'Non-resident pool day pass including sunbed and one drink.' },
      { title: 'Conference Hall (full day)',   price: 18000, currency: 'ETB', desc: 'Air-conditioned hall for 80 people with AV, PA, and coffee service.' },
    ],
  },

  // ── Beauty & Personal Care (45–49) ────────────────────────────────────────
  {
    name: 'Meron Hair & Beauty Salon',
    category: 'Beauty & Personal Care',
    address: 'Bole, Addis Ababa',
    phone: '+251 94 678 2098',
    email: 'book@meronbeauty.et',
    description: 'Full-service hair salon for women: cuts, braids, treatments, and styling in Bole.',
    sectionKeys: ['hero', 'services', 'gallery', 'before_after', 'pricing', 'contact', 'social'],
    products: [
      { title: 'Wash, Cut & Blow-Dry',        price: 500,  currency: 'ETB', desc: 'Shampoo, precision cut, blow-dry, and style finish.' },
      { title: 'Box Braids (full head)',       price: 2500, currency: 'ETB', desc: 'Full-head box braids with kanekalon hair included. 4–5 hours.' },
      { title: 'Keratin Smoothing Treatment', price: 3500, currency: 'ETB', desc: 'Brazilian keratin treatment for frizz-free, silky hair for 3 months.' },
      { title: 'Hair Colour (full, single)',  price: 1800, currency: 'ETB', desc: 'Full head single-process colour with conditioning treatment.' },
      { title: 'Scalp Treatment + Massage',  price: 800,  currency: 'ETB', desc: 'Deep conditioning scalp treatment with 20-minute head massage.' },
    ],
  },
  {
    name: 'Selam Nail Studio',
    category: 'Beauty & Personal Care',
    address: 'Megenagna, Addis Ababa',
    phone: '+251 91 789 0987',
    email: 'nails@selamstudio.et',
    description: 'Gel, acrylic, and nail art studio with the latest designs and nail health treatments.',
    sectionKeys: ['hero', 'services', 'gallery', 'before_after', 'pricing', 'contact', 'social'],
    products: [
      { title: 'Gel Manicure (hands)',        price: 650,  currency: 'ETB', desc: 'Gel polish manicure with cuticle care and hand massage.' },
      { title: 'Acrylic Full Set',            price: 1200, currency: 'ETB', desc: 'Full acrylic nail extension set with nail art of your choice.' },
      { title: 'Pedicure + Gel Polish',       price: 800,  currency: 'ETB', desc: 'Full pedicure with callus removal and long-lasting gel polish.' },
      { title: 'Nail Art (per nail)',         price: 50,   currency: 'ETB', desc: 'Custom nail art design per nail — floral, geometric, or 3D.' },
      { title: 'Nail Removal & Repair',       price: 400,  currency: 'ETB', desc: 'Safe removal of gel or acrylic with nail repair and conditioning.' },
    ],
  },
  {
    name: 'Liya Bridal Beauty',
    category: 'Beauty & Personal Care',
    address: 'Kazanchis, Addis Ababa',
    phone: '+251 92 890 9876',
    email: 'bride@liyabridal.et',
    description: 'Specialist bridal makeup, hairdressing, and beauty packages for Ethiopian weddings.',
    sectionKeys: ['hero', 'services', 'gallery', 'before_after', 'pricing', 'contact', 'social'],
    products: [
      { title: 'Bridal Makeup (full day)',     price: 8500,  currency: 'ETB', desc: 'Airbrush foundation, full glam bridal makeup, touch-up kit included.' },
      { title: 'Bridal Hair + Tiara',         price: 5500,  currency: 'ETB', desc: 'Bridal updo or habesha hairstyle with crystal tiara fitting.' },
      { title: 'Bridal Package (makeup + hair + nails)', price: 12000, currency: 'ETB', desc: 'Complete bridal beauty: makeup, hair, manicure, and pedicure.' },
      { title: 'Trial Makeup Session',        price: 2000,  currency: 'ETB', desc: 'Pre-wedding trial: test your full bridal look before the day.' },
      { title: "Bridesmaid Makeup (per person)", price: 2500, currency: 'ETB', desc: 'Coordinated bridesmaid makeup. Min. 3 people, price per person.' },
    ],
  },
  {
    name: "Atlas Men's Grooming",
    category: 'Beauty & Personal Care',
    address: 'Friendship, Addis Ababa',
    phone: '+251 93 901 8765',
    email: 'book@atlasgrooming.et',
    description: "Premium barbershop for men: fades, beard trims, hot towel shaves, and scalp treatments.",
    sectionKeys: ['hero', 'services', 'gallery', 'before_after', 'pricing', 'contact', 'social'],
    products: [
      { title: 'Classic Fade Haircut',        price: 350, currency: 'ETB', desc: 'Skin fade or taper fade haircut with line-up and styling.' },
      { title: 'Beard Trim & Shape',          price: 200, currency: 'ETB', desc: 'Beard shaping, trim, and hot towel finish.' },
      { title: 'Full Groom Package',         price: 650, currency: 'ETB', desc: 'Haircut + beard trim + hot towel shave + scalp massage.' },
      { title: 'Hot Towel Shave',            price: 300, currency: 'ETB', desc: 'Traditional hot towel straight-razor shave with pre-shave oil.' },
      { title: 'Kids Haircut (under 12)',    price: 200, currency: 'ETB', desc: 'Patient, fun haircut for boys under 12. Lolly included.' },
    ],
  },
  {
    name: 'Yenege Skin Care Clinic',
    category: 'Beauty & Personal Care',
    address: 'Gerji, Addis Ababa',
    phone: '+251 94 012 7654',
    email: 'skin@yenegeskin.et',
    description: 'Medical-grade skin care clinic offering facials, acne treatment, and laser therapies in Gerji.',
    sectionKeys: ['hero', 'services', 'gallery', 'before_after', 'pricing', 'contact', 'social'],
    products: [
      { title: 'Classic Deep Facial (60 min)', price: 1200, currency: 'ETB', desc: 'Deep cleansing facial with extractions, serum, and LED therapy.' },
      { title: 'Acne Treatment Program (4 sessions)', price: 6500, currency: 'ETB', desc: '4-session acne program with chemical peel and LED red light.' },
      { title: 'Skin Brightening Peel',       price: 1800, currency: 'ETB', desc: 'TCA or lactic acid peel for even skin tone and dark spot fading.' },
      { title: 'Microneedling Session',       price: 2500, currency: 'ETB', desc: 'Collagen-induction microneedling for scars, pores, and texture.' },
      { title: 'Under-Eye Treatment',         price: 1500, currency: 'ETB', desc: 'Targeted under-eye treatment for dark circles and puffiness.' },
    ],
  },
];

// ── Assign theme colors from COLOR_PRESETS (cycle by index % 10) ─────────────
SHOWROOM_CONFIGS.forEach((cfg, i) => {
  const [c1, c2] = COLOR_PRESETS[i % COLOR_PRESETS.length];
  cfg.themeColor  = c1;
  cfg.themeColor2 = c2;
});

// ── buildSections: generate section data for each key in config.sectionKeys ─
function buildSections(config) {
  return config.sectionKeys.map(type => {
    switch (type) {
      case 'hero':
        return { type, title: config.name, subtitle: config.description, cta: 'Contact Us', heroBg: config.themeColor, heroBg2: config.themeColor2 };
      case 'menu':
        return { type, menuTitle: 'Our Menu', dishes: config.products.map(p => ({ category: 'Featured', name: p.title, desc: p.desc, price: `${p.price} ETB`, photo: '', product_id: null })) };
      case 'items':
        return { type, itemsTitle: 'Our Products', items: config.products.map(p => ({ name: p.title, desc: p.desc, price: `${p.price} ETB`, product_id: null })) };
      case 'services':
        return { type, servTitle: 'Our Services', services: config.products.map(p => ({ name: p.title, desc: p.desc, price: `${p.price} ETB`, product_id: null })) };
      case 'gallery':
        return { type, galleryTitle: 'Gallery', galleryImages: [] };
      case 'testimonials':
        return { type, testTitle: 'What People Say', testimonials: [] };
      case 'contact':
        return { type, location: config.address, phone: config.phone, email: config.email, hours: 'Mon-Sat 8am-6pm', whatsapp: config.phone };
      case 'social':
        return { type, facebook: '', instagram: '', telegram: '', youtube: '', tiktok: '', twitter: '', linkedin: '' };
      case 'team':
        return { type, teamTitle: 'Our Team', members: [] };
      case 'about':
        return { type, aboutTitle: 'About Us', aboutDesc: config.description, aboutImage: '' };
      case 'pricing':
        return { type, pricingTitle: 'Our Pricing', plans: config.products.map(p => ({ name: p.title, price: `${p.price} ETB`, period: '', features: p.desc, product_id: null })) };
      case 'features':
        return { type, featTitle: 'Why Choose Us', features: config.products.slice(0, 4).map(p => ({ name: p.title, desc: p.desc })) };
      case 'faq':
        return { type, faqTitle: 'Common Questions', faqs: [] };
      case 'stats':
        return { type, statsTitle: 'Our Numbers', stats: [] };
      case 'hours':
        return { type, hoursTitle: 'Opening Hours', openingHours: 'Mon-Sat 8am-6pm' };
      case 'offer':
        return { type, offerTitle: 'Special Offer', offerDesc: '', offerPhoto: '', offerEnds: '', offerBtn: 'Order Now' };
      case 'payment_info':
        return { type, payTitle: 'How to Pay', payNote: '' };
      case 'portfolio':
        return { type, portTitle: 'Our Work', portfolio: [] };
      case 'delivery':
        return { type, deliveryTitle: 'Delivery Options', deliveryZones: [{ zone: 'Addis Ababa', fee: '50 ETB', time: '1-2 hours' }], deliveryNote: '' };
      case 'certifications':
        return { type, certsTitle: 'Our Credentials', certs: [] };
      case 'brands':
        return { type, brandsTitle: 'Brands We Carry', brands: [] };
      case 'event_schedule':
        return { type, eventsTitle: 'Upcoming Events', events: [] };
      case 'before_after':
        return { type, baTitle: 'Before & After', baPairs: [] };
      case 'job_openings':
        return { type, jobsTitle: "We're Hiring", jobs: [] };
      default:
        return { type };
    }
  });
}

// ── getSpotlightConfig: spotlight distribution by index ──────────────────────
// Best content section by category
const CONTENT_SECTION_BY_CATEGORY = {
  'Food & Beverage':        'menu',
  'Business & Commerce':    'items',
  'Agriculture & Farming':  'items',
  'Health & Medical':       'services',
  'Construction & Trade':   'services',
  'Transport & Logistics':  'services',
  'Education':              'services',
  'Professional Services':  'services',
  'Hospitality & Tourism':  'services',
  'Beauty & Personal Care': 'services',
};

function getSpotlightConfig(index, config) {
  const pos        = index % 5;
  const contentKey = CONTENT_SECTION_BY_CATEGORY[config.category] || 'services';
  const sectionKeys = config.sectionKeys;
  const hasContent      = sectionKeys.includes(contentKey);
  const hasContact      = sectionKeys.includes('contact');
  const hasTestimonials = sectionKeys.includes('testimonials');

  switch (pos) {
    case 0:
      // single — best content section
      return {
        mode: 'single',
        sectionIds: [hasContent ? contentKey : (sectionKeys[1] || sectionKeys[0] || 'hero')],
        carouselCount: 1,
      };
    case 1:
      // carousel with carouselCount=1
      return {
        mode: 'carousel',
        sectionIds: sectionKeys.slice(0, 2),
        carouselCount: 1,
      };
    case 2:
      // carousel with carouselCount=2
      return {
        mode: 'carousel',
        sectionIds: sectionKeys.slice(0, 3),
        carouselCount: 2,
      };
    case 3:
      // single — contact or testimonials
      return {
        mode: 'single',
        sectionIds: [hasContact ? 'contact' : (hasTestimonials ? 'testimonials' : sectionKeys[0] || 'hero')],
        carouselCount: 1,
      };
    case 4:
      // off
      return {
        mode: 'off',
        sectionIds: [],
        carouselCount: 1,
      };
    default:
      return { mode: 'off', sectionIds: [], carouselCount: 1 };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  assertSafeDevSeed();
  const client = await pool.connect();
  console.log('\n🌱 Nodbusiness Showroom + Product Seed\n');
  console.log('Creates: 50 showrooms (10 categories × 5), 150-300 products, business subscriptions\n');

  try {
    // ── Load existing seed users ──────────────────────────────────────────────
    console.log('📋 Loading existing seed users...');
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
      console.error('❌ No seed users found. Run node db/seed.js first.');
      process.exit(1);
    }
    console.log(`  ✅ Found ${users.length} seed users\n`);

    // ── Load existing businesses (to link products and subscriptions) ─────────
    console.log('📋 Loading existing businesses...');
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
    console.log(`  ✅ Found ${businesses.length} businesses\n`);

    // ── 1. business_subscriptions — freemium row for each business ────────────
    console.log('💳 Creating business subscriptions (freemium tier)...');
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
    console.log(`  ✅ ${subCount} business subscriptions\n`);

    // ── 2. Showrooms — 1 per seed user ────────────────────────────────────────
    console.log('🏪 Creating showrooms...');
    const showroomRecords = [];

    for (let i = 0; i < users.length; i++) {
      const user    = users[i];
      const cfg     = SHOWROOM_CONFIGS[i % SHOWROOM_CONFIGS.length];
      const userBiz = businesses.find(b => b.owner_id === user.id);

      if (!userBiz) throw new Error(`Seed user ${user.email} has no business row; run seed.js first.`);

      const slug     = makeSlug(cfg.name);
      const sections = buildSections(cfg);

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
          cfg.name,
          slug,
          cfg.category,
          userBiz.business_template || 'default',
          JSON.stringify(sections),
          `https://picsum.photos/seed/${slug.slice(0, 12)}/1200/400`,
          `https://picsum.photos/seed/${slug.slice(0, 8)}logo/200/200`,
          cfg.themeColor,
          cfg.description,
          rand(50, 2000),
        ]
      );

      const showroom = rows[0];

      // Apply spotlight distribution
      const spotlight = getSpotlightConfig(i, cfg);
      await client.query(
        `UPDATE showrooms
         SET spotlight_mode=$1, spotlight_section_ids=$2, spotlight_carousel_count=$3
         WHERE id=$4`,
        [spotlight.mode, JSON.stringify(spotlight.sectionIds), spotlight.carouselCount, showroom.id]
      );

      // Update user_profile
      await client.query(
        `UPDATE user_profiles
         SET has_business_profile = TRUE,
             profile_type         = 'business',
             business_name        = $1,
             business_category    = $2,
             business_template    = $3,
             business_theme_color = $4
         WHERE user_id = $5`,
        [cfg.name, cfg.category, userBiz.business_template || 'default', cfg.themeColor, user.id]
      );

      // Announce to followers
      try {
        await announceShowroomPublished({
          id:          showroom.id,
          owner_id:    user.id,
          title:       cfg.name,
          slug,
          description: cfg.description,
          cover_image: `https://picsum.photos/seed/${slug.slice(0, 12)}/1200/400`,
        });
      } catch (announceErr) {
        console.warn(`  ⚠️  announceShowroomPublished failed for ${cfg.name}: ${announceErr.message}`);
      }

      showroomRecords.push({
        id:         showroom.id,
        title:      showroom.title,
        category:   cfg.category,
        ownerId:    user.id,
        businessId: userBiz.id,
      });
    }
    console.log(`  ✅ ${showroomRecords.length} showrooms published\n`);

    // ── 3. Products — 3–6 per showroom ────────────────────────────────────────
    console.log('📦  Creating products...');
    let productCount = 0;

    for (let i = 0; i < showroomRecords.length; i++) {
      const showroom   = showroomRecords[i];
      const cfg        = SHOWROOM_CONFIGS[i % SHOWROOM_CONFIGS.length];
      const productPool = cfg.products;
      const count      = rand(3, Math.min(6, productPool.length));
      const chosen     = [...productPool].sort(() => Math.random() - 0.5).slice(0, count);

      for (const p of chosen) {
        const price   = randF(p.price * 0.9, p.price * 1.1);
        const stock   = rand(1, 50);
        const imgSeed = p.title.replace(/\s/g, '').slice(0, 8).toLowerCase();
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
            p.currency || 'ETB',
            stock,
            images,
            cfg.category,
            rand(0, 500),
          ]
        );
        productCount++;
      }

      // Update business_subscriptions product_count
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
    console.log(`  ✅ ${productCount} products\n`);

    // ── 4. Product reviews — a few per product ────────────────────────────────
    console.log('⭐ Creating product reviews...');
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
      } catch { /* reviews table may have a different constraint — skip */ }
    }
    console.log(`  ✅ ${reviewCount} reviews\n`);

    // ── 5. Showroom views — simulate real traffic ─────────────────────────────
    console.log('👁️  Simulating showroom views...');
    for (const showroom of showroomRecords.slice(0, 30)) {
      const views = rand(50, 2000);
      await client.query(
        `UPDATE showrooms SET view_count = $1 WHERE id = $2`,
        [views, showroom.id]
      );
    }
    console.log('  ✅ View counts set\n');

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════');
    console.log('✅ Showroom seed complete!');
    console.log('═══════════════════════════════════════════');
    console.log(`  Showrooms:              ${showroomRecords.length}`);
    console.log(`  Products:               ${productCount}`);
    console.log(`  Reviews:                ${reviewCount}`);
    console.log(`  Business subscriptions: ${subCount} (freemium)`);
    console.log('');
    console.log('Browse:');
    console.log('  Frontend:    https://nodbusiness.vercel.app/showrooms');
    console.log('  Marketplace: https://nodbusiness.vercel.app/marketplace');
    console.log('');
    console.log('Seed users use the TEST_ACCOUNT_PASSWORD supplied to the guarded local seed command.');
    console.log('═══════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) seed();

// Backward-compat exports
// BUILDER_CATEGORY and BUILDER_SECTIONS derived from SHOWROOM_CONFIGS
const BUILDER_CATEGORY = Object.fromEntries(
  SHOWROOM_CONFIGS.map(cfg => [cfg.name, cfg.category])
);
const BUILDER_SECTIONS = Object.fromEntries(
  SHOWROOM_CONFIGS.map(cfg => [cfg.name, cfg.sectionKeys])
);

module.exports = { BUSINESS_CONFIGS: SHOWROOM_CONFIGS, BUILDER_CATEGORY, BUILDER_SECTIONS, buildSections };
