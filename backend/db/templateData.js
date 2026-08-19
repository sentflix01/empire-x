/**
 * templateData.js
 * Nodbusiness — Business showroom section templates.
 *
 * Each template produces a `sections` array whose shape matches exactly what
 * SectionRenderer.tsx reads:
 *   { type, title, subtitle?, content?, cta?, email?, phone?, location?, items? }
 *
 * 12 specialised business-type templates cover every real-world company type
 * in the seed: ride-hailing, telecom, bank, hotel, restaurant, construction,
 * e-commerce, law/accounting, school, farm, beauty salon, IT/tech.
 *
 * Businesses not matched by name fall back to a category default.
 */

// ── Verified businesses (shown with badge in the UI) ─────────────────────────
const VERIFIED_BUSINESSES = [
  'Ethiopian Airlines', 'Ethio Telecom', 'Commercial Bank of Ethiopia',
  'Safaricom Telecommunications Ethiopia', 'Sheraton Addis', 'Hilton Addis Ababa',
  'Hyatt Regency Addis Ababa', 'BGI Ethiopia PLC', 'Haile Grand Addis Ababa',
  'Dashen Bank SC', 'Awash International Bank', 'Bank of Abyssinia',
  'East Africa Bottling (Coca-Cola)', 'Heineken Breweries Ethiopia',
  'Ethiopian Electric Power', 'MIDROC Ethiopia', 'Yod Abyssinia Cultural Restaurant',
  'Radisson Blu Hotel Addis Ababa', 'Tomoca Coffee', 'Sur Construction',
];

// ── Price ranges per category (used by seed for product pricing) ─────────────
const PRICE_RANGE = {
  restaurant:  { min: 80,    max: 800    },
  shop:        { min: 400,   max: 8000   },
  service:     { min: 500,   max: 15000  },
  health:      { min: 300,   max: 8000   },
  hotel:       { min: 2500,  max: 25000  },
  telecom:     { min: 50,    max: 2000   },
  bank:        { min: 0,     max: 500    },
  farm:        { min: 200,   max: 5000   },
  it_tech:     { min: 5000,  max: 80000  },
  other:       { min: 200,   max: 5000   },
  realestate:  { min: 500000,max: 5000000},
};

// ── Default working hours ────────────────────────────────────────────────────
const DEFAULT_HOURS = [
  { day: 'Monday',    hours: '8:00 AM – 6:00 PM' },
  { day: 'Tuesday',   hours: '8:00 AM – 6:00 PM' },
  { day: 'Wednesday', hours: '8:00 AM – 6:00 PM' },
  { day: 'Thursday',  hours: '8:00 AM – 6:00 PM' },
  { day: 'Friday',    hours: '8:00 AM – 6:00 PM' },
  { day: 'Saturday',  hours: '9:00 AM – 4:00 PM' },
  { day: 'Sunday',    hours: 'Closed'              },
];

// ── Business-name → specialised template key ─────────────────────────────────
function getBusinessType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('yango') || n.includes(' ride') || (n.includes('taxi') && !n.includes('repair'))) return 'ride_service';
  if (n.includes('telecom') || n.includes('safaricom') || n.includes('telebirr')) return 'telecom';
  if (
    n.includes('bank') || n.includes('microfinance') ||
    n.includes('abyssinia') && n.includes('bank') ||
    n.includes('dashen') || n.includes('awash') || n.includes('wegagen') ||
    n.includes('bunna') || n.includes('berhan') || n.includes('nib int') ||
    n.includes('abay bank') || n.includes('oromia int') || n.includes('addis international bank') ||
    n.includes('national bank')
  ) return 'bank';
  if (
    n.includes('sheraton') || n.includes('hilton') || n.includes('hyatt') ||
    n.includes('haile grand') || n.includes('radisson') || n.includes('golden tulip') ||
    n.includes('ramada') || n.includes('intercontinental') || n.includes('best western') ||
    n.includes('hotel') || n.includes('guesthouse') || n.includes('lodge')
  ) return 'hotel';
  if (
    n.includes('yod abyssinia') || n.includes('kategna') || n.includes('tomoca') ||
    n.includes('totot') || n.includes('restaurant') || n.includes('cafe') ||
    n.includes('coffee shop') || n.includes('bakery') || n.includes('pastry') ||
    n.includes('juice bar') || n.includes('catering')
  ) return 'restaurant';
  if (
    n.includes('sur construction') || n.includes('gebecon') || n.includes('gemshu') ||
    n.includes('construction') || n.includes('contractor') || n.includes('engineering') ||
    n.includes('architect') || n.includes('builder')
  ) return 'construction';
  if (
    n.includes('hub tech') || n.includes('dream tech') || n.includes('icog') ||
    n.includes('atlantic it') || n.includes('software') || n.includes('technology') ||
    n.includes('it solution') || n.includes('digital') || n.includes('bpo')
  ) return 'it_tech';
  if (n.includes('legal') || n.includes('advocates') || n.includes('law firm') || n.includes('attorney') || n.includes('accounting') || n.includes('tax') || n.includes('audit')) return 'law';
  if (n.includes('school') || n.includes('academy') || n.includes('college') || n.includes('university') || n.includes('training') || n.includes('institute')) return 'school';
  if (n.includes('farm') || n.includes('coffee export') || n.includes('agri') || n.includes('poultry') || n.includes('dairy') || n.includes('spice') || n.includes('organic')) return 'farm';
  if (n.includes('salon') || n.includes('spa') || n.includes('beauty') || n.includes('nail') || n.includes('barber') || n.includes('grooming') || n.includes('lash')) return 'beauty';
  return null; // fall back to category default
}

// ── 12 specialised section templates ─────────────────────────────────────────
// Every section shape matches SectionRenderer.tsx exactly.

function rideServiceSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Fast, safe, and affordable rides across Addis Ababa. Book in seconds.', cta: 'Book a Ride' },
    { type: 'services', title: 'Our Services', items: [
      { name: 'Standard Ride', description: 'Comfortable sedan for everyday trips around the city', price: 'From 60 ETB' },
      { name: 'Premium Ride', description: 'SUV or luxury car for business and special occasions', price: 'From 150 ETB' },
      { name: 'Package Delivery', description: 'Same-day door-to-door package delivery within Addis', price: 'From 80 ETB' },
      { name: 'Airport Transfer', description: 'Reliable pickup and drop-off at Bole International Airport', price: 'From 250 ETB' },
    ]},
    { type: 'features', title: 'Why Choose Us', items: [
      { title: 'Verified Drivers', desc: 'Every driver is background-checked and licensed' },
      { title: '2-Min Avg Pickup', desc: 'Large driver network means you never wait long' },
      { title: 'Safe Payments', desc: 'Pay by cash, TeleBirr, or in-app wallet' },
      { title: '24/7 Support', desc: 'Customer care available around the clock' },
    ]},
    { type: 'process', title: 'How to Book', items: [
      { title: 'Open the App', desc: 'Download our app or book through Nodbusiness' },
      { title: 'Set Your Pickup', desc: 'Enter your location and destination' },
      { title: 'Get Matched', desc: 'A nearby verified driver accepts your request' },
      { title: 'Arrive Safely', desc: 'Track your ride live and rate your experience' },
    ]},
    { type: 'services', title: 'Pricing Guide', items: [
      { name: 'Within Same District', description: 'Short trip inside one neighbourhood', price: '60 – 100 ETB' },
      { name: 'Cross-District Trip', description: 'Between major areas of Addis Ababa', price: '100 – 200 ETB' },
      { name: 'Airport Run', description: 'Any point in Addis to Bole Airport', price: '250 – 400 ETB' },
      { name: 'Monthly Corporate Plan', description: 'Unlimited rides for registered businesses', price: 'From 3,000 ETB/mo' },
    ]},
    { type: 'faq', title: 'Common Questions', items: [
      { question: 'How is the fare calculated?', answer: 'Fares are based on distance and time. You see the price before confirming your booking — no surprises.' },
      { question: 'Is it safe to ride alone at night?', answer: 'Yes. All drivers are verified, and every trip is tracked live. Share your trip status with family or friends from the app.' },
      { question: 'How do I pay?', answer: 'Cash, TeleBirr, CBE Birr, and in-app wallet are all accepted. Choose at checkout.' },
      { question: 'Can I schedule a ride in advance?', answer: 'Yes — schedule up to 7 days in advance. Perfect for airport trips and early meetings.' },
    ]},
    { type: 'services', title: 'By the Numbers', items: [
      { name: '500,000+ Rides', description: 'Completed across Addis Ababa since launch' },
      { name: '4.8 ★ Rating', description: 'Average customer satisfaction score' },
      { name: '2 Min Avg Wait', description: 'Our driver network keeps pickups fast' },
      { name: '3,000+ Drivers', description: 'Verified, trained, and ready to serve' },
    ]},
    { type: 'contact', title: 'Contact & Support', email: biz.email || 'support@rideethi.com', phone: biz.phone || '+251 115 570 000', location: biz.address || 'Bole, Addis Ababa, Ethiopia' },
  ];
}

function telecomSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Connecting Ethiopia with fast 4G/5G, affordable data, and digital financial services.', cta: 'Explore Packages' },
    { type: 'services', title: 'Data & Voice Packages', items: [
      { name: '4G Data Bundle – 10GB', description: '10GB high-speed data, valid for 30 days', price: '199 ETB' },
      { name: 'Voice Pack – 500 Min', description: '500 minutes to all local networks, valid 30 days', price: '149 ETB' },
      { name: 'Daily Combo', description: '500MB data + 30 minutes, valid 24 hours', price: '15 ETB' },
      { name: 'International Roaming', description: 'Stay connected in 100+ countries', price: 'From 500 ETB' },
    ]},
    { type: 'services', title: 'Pricing Plans', items: [
      { name: 'Daily Pack', description: '500MB + 30 free minutes — ideal for light users', price: '15 ETB / day' },
      { name: 'Weekly Pack', description: '3GB data + 100 minutes — great for regular use', price: '79 ETB / week' },
      { name: 'Monthly Pack', description: '15GB data + unlimited on-net calls', price: '399 ETB / month' },
      { name: 'Family Pack', description: 'Share 30GB across up to 5 numbers', price: '699 ETB / month' },
    ]},
    { type: 'features', title: 'Why Choose Us', items: [
      { title: '99% Network Coverage', desc: 'Nationwide 4G across all major cities and regions' },
      { title: 'TeleBirr Digital Wallet', desc: 'Send money, pay bills, and shop — all from your phone' },
      { title: 'Fiber Internet', desc: 'High-speed home and business fibre available in Addis Ababa' },
      { title: '24/7 Customer Care', desc: 'Call 994 or visit any of our 300+ service centres' },
    ]},
    { type: 'faq', title: 'Frequently Asked Questions', items: [
      { question: 'How do I activate a data bundle?', answer: 'Dial *777# or open the TeleBirr app and select "Buy Bundle". Your package activates instantly.' },
      { question: 'What is TeleBirr?', answer: 'TeleBirr is our mobile money service. Send and receive money, pay bills, and top up data without visiting a branch.' },
      { question: 'How do I check my balance?', answer: 'Dial *804# for airtime balance, or *777# for data balance. Also available in the TeleBirr app.' },
      { question: 'Can I port my number to you?', answer: 'Yes. Visit any service centre with your ID and current SIM to start the number porting process.' },
    ]},
    { type: 'services', title: 'Network Stats', items: [
      { name: '45M+ Subscribers', description: 'The largest telecom network in Ethiopia' },
      { name: '99% Coverage', description: 'Nationwide 4G and expanding 5G in Addis' },
      { name: '300+ Service Centres', description: 'Find us in every major town and district' },
      { name: '24/7 Support Line 994', description: 'Always available — calls, data, payments' },
    ]},
    { type: 'contact', title: 'Visit or Call Us', email: biz.email || 'customercare@ethiotelecom.et', phone: biz.phone || '994', location: biz.address || 'Arada, Addis Ababa, Ethiopia' },
  ];
}

function bankSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Trusted banking for individuals, businesses, and communities across Ethiopia.', cta: 'Open an Account' },
    { type: 'services', title: 'Our Banking Services', items: [
      { name: 'Savings Account', description: 'Earn competitive interest. Open with 0 ETB — no minimum balance required.', price: '0 ETB to open' },
      { name: 'Current Account', description: 'For businesses and frequent transactions. Cheque book included.', price: 'From 500 ETB' },
      { name: 'Business Loan', description: 'Flexible loans for SMEs with competitive interest rates and fast approval.', price: 'From 50,000 ETB' },
      { name: 'Forex & SWIFT Transfer', description: 'Send and receive international payments in USD, EUR, GBP, and more.', price: 'See branch rates' },
      { name: 'Mobile Banking App', description: 'Transfer, pay bills, check balance — anytime, anywhere.', price: 'Free' },
    ]},
    { type: 'features', title: 'Why Bank With Us', items: [
      { title: 'FDIC-Grade Security', desc: 'Your deposits are fully insured and protected by Ethiopian banking law' },
      { title: '400+ Branches', desc: 'Nationwide presence across all regions of Ethiopia' },
      { title: 'Digital First', desc: 'Mobile app, internet banking, and ATM network for 24/7 access' },
      { title: 'SME Focused', desc: 'Dedicated relationship managers and tailored products for growing businesses' },
    ]},
    { type: 'services', title: 'By the Numbers', items: [
      { name: '10M+ Customers', description: 'Serving individuals and businesses across Ethiopia' },
      { name: '400+ Branches', description: 'Nationwide network covering all major regions' },
      { name: '24/7 Digital Banking', description: 'Mobile app, internet banking, and ATM available always' },
      { name: '7% p.a. Savings Rate', description: 'Competitive interest on standard savings accounts' },
    ]},
    { type: 'faq', title: 'Common Questions', items: [
      { question: 'What documents do I need to open an account?', answer: 'A valid national ID or passport, one passport photo, and a completed account opening form — available at any branch.' },
      { question: 'Is my money safe?', answer: 'Yes. All deposits are regulated by the National Bank of Ethiopia and protected by Ethiopian banking law.' },
      { question: 'How do I apply for a business loan?', answer: 'Visit your nearest branch with your trade licence, 6 months bank statement, and business plan. Our team will guide you through the process.' },
      { question: 'Can I bank online?', answer: 'Yes. Our mobile app and internet banking portal let you transfer, pay bills, and manage your account 24/7.' },
    ]},
    { type: 'services', title: 'Open Positions', items: [
      { name: 'Relationship Manager – SME', description: 'Addis Ababa branches — 3+ years banking experience required', price: 'Full-time' },
      { name: 'Digital Banking Officer', description: 'Develop and support our growing mobile and internet banking platforms', price: 'Full-time' },
      { name: 'Branch Teller', description: 'Multiple branches across Addis Ababa — fresh graduates welcome', price: 'Full-time' },
    ]},
    { type: 'contact', title: 'Visit a Branch', email: biz.email || 'info@bank.et', phone: biz.phone || '+251 115 514 000', location: biz.address || 'Arada, Addis Ababa, Ethiopia' },
  ];
}

function hotelSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'World-class comfort and authentic Ethiopian hospitality in the heart of Addis Ababa.', cta: 'Book Your Stay' },
    { type: 'services', title: 'Room Types', items: [
      { name: 'Standard Room', description: 'Comfortable room with city view, free WiFi, and daily breakfast included', price: '3,500 ETB / night' },
      { name: 'Deluxe Room', description: 'Spacious room with premium furnishings, king bed, and lounge access', price: '6,500 ETB / night' },
      { name: 'Executive Suite', description: 'Separate living area, panoramic views, priority check-in, and butler service', price: '15,000 ETB / night' },
      { name: 'Conference Hall', description: 'Seats 50–500 guests. Full AV, catering, and event coordination included', price: 'From 25,000 ETB' },
    ]},
    { type: 'features', title: 'Hotel Facilities', items: [
      { title: 'Free High-Speed WiFi', desc: 'Fibre-optic internet throughout all rooms and public areas' },
      { title: 'Airport Shuttle', desc: 'Complimentary transfers to and from Bole International Airport' },
      { title: 'Swimming Pool & Spa', desc: 'Heated indoor pool, steam room, and full-service spa' },
      { title: 'Restaurant & Bar', desc: 'Ethiopian and international cuisine, plus rooftop bar with city views' },
    ]},
    { type: 'services', title: 'Dining & Events', items: [
      { name: 'Main Restaurant', description: 'Ethiopian and international buffet breakfast, lunch and dinner', price: 'From 350 ETB' },
      { name: 'Rooftop Bar & Lounge', description: 'Cocktails and light bites with panoramic city views', price: 'From 150 ETB' },
      { name: 'Wedding & Gala Venue', description: 'Full wedding packages with catering, décor, and coordination', price: 'From 80,000 ETB' },
      { name: 'Business Meeting Rooms', description: 'Private meeting rooms for 8–20 people with AV and catering', price: 'From 5,000 ETB / day' },
    ]},
    { type: 'testimonials', title: 'Guest Reviews', items: [
      { name: 'Tigist A.', text: 'Exceptional service and beautiful rooms. The breakfast buffet is the best in Addis Ababa. Will definitely come back!' },
      { name: 'Daniel K.', text: 'We hosted our corporate gala here and everything was perfect. The team handled every detail professionally.' },
      { name: 'Sarah M.', text: 'Stayed for a week on a business trip. The airport shuttle and room service made everything so convenient.' },
    ]},
    { type: 'contact', title: 'Reservations & Enquiries', email: biz.email || 'reservations@hotel.et', phone: biz.phone || '+251 115 171 717', location: biz.address || 'Kirkos, Addis Ababa, Ethiopia' },
  ];
}

function restaurantSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Authentic Ethiopian cuisine, warm hospitality, and an atmosphere that feels like home.', cta: 'See Our Menu' },
    { type: 'services', title: 'Menu Highlights', items: [
      { name: 'Injera Combo', description: 'Traditional injera with choice of tibs, doro wot, misir, and ayib — served family style', price: '350 ETB' },
      { name: 'Kitfo Special', description: 'Premium Ethiopian minced beef seasoned with mitmita and niter kibbeh — our signature dish', price: '480 ETB' },
      { name: 'Coffee Ceremony', description: 'Full traditional Ethiopian coffee ceremony with popcorn and incense — an experience, not just a drink', price: '180 ETB' },
      { name: 'Tibs Plate', description: 'Sautéed beef or lamb with rosemary, garlic, and jalapeños, served with injera', price: '420 ETB' },
      { name: 'Beyayenet Fasting', description: 'A colourful spread of 7 vegan dishes on injera — perfect for fasting days', price: '280 ETB' },
      { name: 'Family Platter', description: 'Feeds 4–6 people: mix of meat and vegetarian dishes with fresh injera', price: '1,400 ETB' },
    ]},
    { type: 'features', title: 'Our Experience', items: [
      { title: 'Live Cultural Music', desc: 'Traditional Ethiopian music and dance performances every evening' },
      { title: 'Family & Group Seating', desc: 'Private mesob tables for groups up to 20 — reservations recommended' },
      { title: 'Catering Available', desc: 'We cater events, weddings, and corporate functions across Addis' },
      { title: 'Home Delivery', desc: 'Fresh meals delivered within 10km of our restaurant' },
    ]},
    { type: 'testimonials', title: 'What Our Guests Say', items: [
      { name: 'Abebe G.', text: 'Best kitfo in the entire city. The coffee ceremony at the end was the perfect finish to an incredible meal.' },
      { name: 'Sara J.', text: 'Brought international guests here and they were blown away by the flavours and the cultural performance. Highly recommended!' },
      { name: 'Mekdes T.', text: 'The beyayenet is incredible — so many flavours and all fresh. The staff are warm and attentive. We come every weekend.' },
    ]},
    { type: 'contact', title: 'Visit Us or Order', email: biz.email || 'hello@restaurant.et', phone: biz.phone || '+251 911 234 567', location: biz.address || 'Bole, Addis Ababa, Ethiopia' },
  ];
}

function constructionSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Building the future of Ethiopia — quality construction, on time and on budget.', cta: 'Request a Quote' },
    { type: 'services', title: 'Our Services', items: [
      { name: 'Residential Construction', description: 'Villas, apartments, and family homes built to your design and budget', price: 'Get Quote' },
      { name: 'Commercial Buildings', description: 'Offices, retail spaces, hotels, and multi-use developments', price: 'Get Quote' },
      { name: 'Interior Design & Fit-Out', description: 'Complete interior design, carpentry, tiling, and painting', price: 'From 50,000 ETB' },
      { name: 'Renovation & Remodelling', description: 'Upgrade and modernise existing structures — full or partial', price: 'From 30,000 ETB' },
    ]},
    { type: 'process', title: 'How We Work', items: [
      { title: 'Site Assessment', desc: 'Our engineers visit your site, assess requirements, and provide a free consultation' },
      { title: 'Design & Planning', desc: 'Architects and engineers produce detailed drawings and cost breakdown' },
      { title: 'Construction Phase', desc: 'Licensed teams execute the build with regular progress updates' },
      { title: 'Handover', desc: 'Final inspection, punch-list completion, and official handover with warranty' },
    ]},
    { type: 'features', title: 'Why Choose Us', items: [
      { title: '20+ Years Experience', desc: 'Decades of successful projects across Addis Ababa and Ethiopia' },
      { title: 'Licensed Engineers', desc: 'All our engineers hold Ethiopian Ministry of Works licences' },
      { title: 'On-Time Delivery', desc: 'Strict project schedules with milestone tracking and client reports' },
      { title: 'Quality Materials', desc: 'We source cement, rebar, and finishes only from verified suppliers' },
    ]},
    { type: 'services', title: 'Track Record', items: [
      { name: '500+ Projects Delivered', description: 'Residential, commercial, and infrastructure across Ethiopia' },
      { name: '20 Years in Business', description: 'Established, licensed, and trusted by government and private clients' },
      { name: '98% On-Time Rate', description: 'We meet our project milestones — delays are the exception, not the rule' },
      { name: '1,000+ Trained Workers', description: 'Our workforce is skilled, safety-certified, and managed directly by us' },
    ]},
    { type: 'contact', title: 'Start Your Project', email: biz.email || 'projects@construction.et', phone: biz.phone || '+251 911 345 678', location: biz.address || 'Nifas Silk-Lafto, Addis Ababa, Ethiopia' },
  ];
}

function ecommerceSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Quality products, verified sellers, and fast delivery across Addis Ababa and Ethiopia.', cta: 'Shop Now' },
    { type: 'services', title: 'Product Categories', items: [
      { name: 'Fashion & Clothing', description: 'Habesha kemis, modern clothing, accessories, and shoes from verified sellers', price: 'From 400 ETB' },
      { name: 'Electronics', description: 'Phones, laptops, accessories, and home appliances — all with warranty', price: 'From 2,000 ETB' },
      { name: 'Home & Decor', description: 'Traditional baskets, furniture, décor items, and kitchen supplies', price: 'From 300 ETB' },
      { name: 'Food & Groceries', description: 'Spices, honey, grains, and packaged foods from local producers', price: 'From 100 ETB' },
    ]},
    { type: 'features', title: 'Why Shop With Us', items: [
      { title: 'Next-Day Delivery', desc: 'Order before 2PM and receive in Addis Ababa the next morning' },
      { title: 'Cash on Delivery', desc: 'Pay when your order arrives — no card required' },
      { title: '7-Day Returns', desc: 'Not satisfied? Return within 7 days for a full refund' },
      { title: 'Verified Sellers', desc: 'Every seller is checked, rated, and accountable on our platform' },
    ]},
    { type: 'testimonials', title: 'Customer Reviews', items: [
      { name: 'Hana T.', text: 'Ordered a habesha dress for Timkat and it arrived the next day, perfectly packaged. Amazing service!' },
      { name: 'Natnael B.', text: 'Great prices and fast delivery. The return process was smooth when I needed a different size.' },
      { name: 'Kalkidan A.', text: 'Found exactly what I needed and the seller was responsive. Will definitely shop here again.' },
    ]},
    { type: 'contact', title: 'Customer Support', email: biz.email || 'support@shop.et', phone: biz.phone || '+251 115 500 000', location: biz.address || 'Bole, Addis Ababa, Ethiopia' },
  ];
}

function lawSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Professional legal and financial services trusted by businesses and individuals across Ethiopia.', cta: 'Book a Consultation' },
    { type: 'services', title: 'Our Services', items: [
      { name: 'Business Registration', description: 'Full company formation — trade licence, TIN, commercial registration, and memorandum', price: '5,000 ETB' },
      { name: 'Tax Filing & Compliance', description: 'Annual tax returns, VAT registration, and ongoing compliance for businesses', price: '3,000 ETB / year' },
      { name: 'Contract Drafting & Review', description: 'Employment, supplier, lease, and partnership agreements — Amharic and English', price: '8,000 ETB' },
      { name: 'Court Representation', description: 'Commercial disputes, labour cases, and civil litigation', price: 'Get Quote' },
    ]},
    { type: 'process', title: 'How We Work', items: [
      { title: 'Free Consultation', desc: 'First meeting is free — tell us your situation and we assess your needs' },
      { title: 'Assessment & Proposal', desc: 'We review your documents and present a clear scope and fixed fee' },
      { title: 'Engagement Letter', desc: 'You approve the scope, timeline, and fee — then we begin' },
      { title: 'Delivery & Follow-Up', desc: 'We deliver your documents and provide 30 days of follow-up support' },
    ]},
    { type: 'features', title: 'Why Choose Us', items: [
      { title: 'Bilingual Service', desc: 'All services delivered in both Amharic and English' },
      { title: 'Fixed Fees', desc: 'Transparent pricing — no hidden costs or surprise invoices' },
      { title: 'Fast Turnaround', desc: 'Most registrations and filings completed within 5 business days' },
      { title: 'Experienced Team', desc: 'Lawyers and accountants with 10+ years of Ethiopian practice' },
    ]},
    { type: 'faq', title: 'Common Questions', items: [
      { question: 'How long does business registration take?', answer: 'Standard registration is completed in 3–5 business days after submitting all required documents.' },
      { question: 'Do you handle import/export licencing?', answer: 'Yes — we handle import, export, and customs clearance documentation through the Ethiopian Customs Commission.' },
      { question: 'Can you help with work permit applications?', answer: 'Yes. We assist foreign nationals and employers with work permits and residence permit applications.' },
    ]},
    { type: 'contact', title: 'Book a Consultation', email: biz.email || 'info@legal.et', phone: biz.phone || '+251 115 157 000', location: biz.address || 'Kirkos, Addis Ababa, Ethiopia' },
  ];
}

function schoolSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Expert-led courses that build real skills and open real doors in Ethiopia and beyond.', cta: 'Enroll Now' },
    { type: 'services', title: 'Our Programs', items: [
      { name: 'Beginner English', description: 'Start from the basics — speaking, reading, and writing with a certified instructor', price: '800 ETB / month' },
      { name: 'Business Communication', description: 'English and presentation skills for professionals and entrepreneurs', price: '1,500 ETB / month' },
      { name: 'Arabic Language', description: 'Standard and spoken Arabic — ideal for trade, travel, and religious purposes', price: '1,200 ETB / month' },
      { name: 'Computer & IT Skills', description: 'MS Office, internet, email, and intro to coding — beginner level', price: '1,000 ETB / month' },
    ]},
    { type: 'services', title: 'Enrollment Packages', items: [
      { name: 'Monthly Enrollment', description: 'Flexible month-to-month — cancel any time', price: 'From 800 ETB / mo' },
      { name: '3-Month Package', description: 'Discounted 10% — commit to 3 months and save', price: 'From 2,160 ETB' },
      { name: 'Intensive Bootcamp', description: '6 weeks, daily classes, fast-track completion', price: 'From 5,000 ETB' },
      { name: 'Private Tutoring', description: '1-on-1 sessions scheduled at your convenience', price: 'From 500 ETB / hr' },
    ]},
    { type: 'features', title: 'Why Study With Us', items: [
      { title: 'Small Class Sizes', desc: 'Maximum 12 students per class — more attention, faster progress' },
      { title: 'Certified Instructors', desc: 'All teachers hold internationally recognised teaching qualifications' },
      { title: 'Certificate Provided', desc: 'Receive a verified certificate on completing any course' },
      { title: 'Flexible Schedule', desc: 'Morning, afternoon, and evening classes to fit your lifestyle' },
    ]},
    { type: 'testimonials', title: 'Student Success Stories', items: [
      { name: 'Yonas B.', text: 'I joined the English business communication course and landed a job at an international NGO three months later. Worth every birr.' },
      { name: 'Meron K.', text: 'The Arabic course here is structured and practical. My instructor was patient and the small class size made a huge difference.' },
      { name: 'Biruk G.', text: 'Completed the IT skills bootcamp and immediately started freelancing. Highly recommend for anyone who wants to upskill fast.' },
    ]},
    { type: 'contact', title: 'Register or Enquire', email: biz.email || 'info@academy.et', phone: biz.phone || '+251 116 600 000', location: biz.address || 'Bole, Addis Ababa, Ethiopia' },
  ];
}

function farmSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Fresh from Ethiopian soil — organic produce, specialty coffee, and traditional spices direct from the source.', cta: 'Order Direct' },
    { type: 'services', title: 'Our Products', items: [
      { name: 'Yirgacheffe Coffee – Grade 1', description: 'Sun-dried, naturally processed specialty coffee. Floral and fruity notes. Export-grade.', price: '2,500 ETB / kg' },
      { name: 'Harrar Coffee – Grade 2', description: 'Bold, winey dry-process coffee from eastern Ethiopia. Ideal for espresso.', price: '2,200 ETB / kg' },
      { name: 'Berbere Spice Mix', description: 'Traditional Ethiopian berbere — freshly ground to order from our farm blend', price: '450 ETB / kg' },
      { name: 'Organic Honey', description: 'Wild-harvested forest honey from Tigray and Wellega — unprocessed and raw', price: '1,200 ETB / kg' },
      { name: 'Fresh Vegetables (Seasonal)', description: 'Tomatoes, onions, peppers, and leafy greens grown without chemicals', price: 'Market price' },
    ]},
    { type: 'features', title: 'Farm Promise', items: [
      { title: 'Organic & Natural', desc: 'No synthetic pesticides or fertilisers — our soil and your health matter' },
      { title: 'Direct from Farm', desc: 'No middlemen — you buy directly from us and we deliver fresh' },
      { title: 'Export Available', desc: 'We export coffee and spices globally — contact us for MOQ and pricing' },
      { title: 'Bulk Pricing', desc: 'Volume discounts available for restaurants, exporters, and shops' },
    ]},
    { type: 'services', title: 'Our Numbers', items: [
      { name: '500+ Hectares', description: 'Total farm land under cultivation across Ethiopian highlands' },
      { name: '15 Countries Exported To', description: 'Our coffee and spices reach Europe, US, Middle East, and Asia' },
      { name: 'Organic Certified', description: 'Certified by Ethiopian Organic Certification Programme (EthOCERT)' },
      { name: '200+ Partner Farmers', description: 'We work with smallholder farmers in our cooperative network' },
    ]},
    { type: 'contact', title: 'Place an Order', email: biz.email || 'sales@farm.et', phone: biz.phone || '+251 911 100 200', location: biz.address || 'Bole, Addis Ababa, Ethiopia' },
  ];
}

function beautySections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Expert beauty treatments in a clean, relaxing space. Look and feel your best.', cta: 'Book Appointment' },
    { type: 'services', title: 'Our Treatments', items: [
      { name: 'Hair Styling & Blowout', description: 'Cut, colour, blowout, and protective styles for all hair types', price: '500 – 2,000 ETB' },
      { name: 'Manicure & Pedicure', description: 'Classic, gel, or acrylic — hands and feet treated and polished', price: '350 ETB' },
      { name: 'Traditional Body Massage', description: 'Full-body Ethiopian oil massage — 60 or 90 minutes', price: '800 – 1,200 ETB' },
      { name: 'Skin Facial', description: 'Deep-cleanse, steam, and hydration treatment for all skin types', price: '1,000 ETB' },
      { name: 'Henna Art', description: 'Traditional and modern henna designs for hands and arms', price: 'From 300 ETB' },
    ]},
    { type: 'services', title: 'Pricing Menu', items: [
      { name: 'Basic Package', description: 'Hair wash + blowout + eyebrow shaping', price: '600 ETB' },
      { name: 'Glow Package', description: 'Facial + manicure + pedicure', price: '1,800 ETB' },
      { name: 'Bridal Package', description: 'Full bridal prep — hair, makeup, nails, and henna', price: '8,000 ETB' },
      { name: 'Monthly Membership', description: 'Unlimited basic treatments + 20% off all add-ons', price: '2,500 ETB / mo' },
    ]},
    { type: 'features', title: 'Why Come to Us', items: [
      { title: 'Certified Stylists', desc: 'All stylists hold professional beauty certificates and 3+ years experience' },
      { title: 'Premium Products', desc: 'We use only professional-grade products — safe for your skin and hair' },
      { title: 'Private Rooms', desc: 'Private treatment rooms available for massages and bridal prep sessions' },
      { title: 'Easy Appointment Booking', desc: 'Book via Nodbusiness, WhatsApp, or walk in — we accommodate same-day appointments' },
    ]},
    { type: 'testimonials', title: 'Client Reviews', items: [
      { name: 'Lidya M.', text: 'My go-to salon in Addis. The hair stylists here actually listen to what you want and deliver. Never disappointed.' },
      { name: 'Selamawit G.', text: 'Booked the bridal package for my wedding and it was absolutely perfect. Every guest was asking about my makeup and hair.' },
      { name: 'Hiwot B.', text: 'The traditional massage here is therapeutic. The staff are professional and the space is so clean and calming.' },
    ]},
    { type: 'contact', title: 'Book Your Session', email: biz.email || 'hello@beautylounge.et', phone: biz.phone || '+251 911 900 100', location: biz.address || 'Bole, Addis Ababa, Ethiopia' },
  ];
}

function itTechSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: 'Custom software, mobile apps, and IT infrastructure for businesses that want to grow digitally.', cta: 'Get a Quote' },
    { type: 'services', title: 'Our Services', items: [
      { name: 'Web Development', description: 'Responsive websites and web apps — React, Next.js, Node.js, and WordPress', price: 'From 30,000 ETB' },
      { name: 'Mobile App Development', description: 'iOS and Android apps, React Native and Flutter, from MVP to full product', price: 'From 80,000 ETB' },
      { name: 'IT Support & Managed Services', description: 'Network setup, server management, helpdesk, and monthly IT contracts', price: 'From 5,000 ETB / mo' },
      { name: 'Cloud & Infrastructure Setup', description: 'AWS, Azure, and Google Cloud deployment, configuration, and migration', price: 'From 20,000 ETB' },
    ]},
    { type: 'process', title: 'How We Deliver', items: [
      { title: 'Discovery', desc: 'We learn your business, define requirements, and validate your idea' },
      { title: 'Design', desc: 'UI/UX wireframes and architecture blueprint — you approve before we build' },
      { title: 'Development', desc: 'Agile sprints with bi-weekly demos so you always know progress' },
      { title: 'Testing & Launch', desc: 'QA, staging, and live deployment — we handle everything' },
      { title: 'Ongoing Support', desc: 'Post-launch support, updates, and feature additions on retainer' },
    ]},
    { type: 'features', title: 'Why Work With Us', items: [
      { title: 'Local Team, Global Standards', desc: 'Ethiopian engineers trained to international best practices' },
      { title: 'Fixed-Price Contracts', desc: 'No scope creep surprises — we agree on scope and price upfront' },
      { title: 'Source Code Ownership', desc: 'You own 100% of the code we write — no lock-in' },
      { title: 'Maintenance Included', desc: 'First 3 months of bug fixes and updates are included in every project' },
    ]},
    { type: 'services', title: 'Selected Work', items: [
      { name: 'E-Commerce Platform', description: 'Multi-vendor marketplace for Ethiopian fashion brands — 10,000+ users', price: 'Delivered' },
      { name: 'Hospital Management System', description: 'Patient records, appointments, and billing for Addis Ababa clinic', price: 'Delivered' },
      { name: 'Mobile Banking App', description: 'iOS and Android banking app for regional Ethiopian bank — 50,000 downloads', price: 'Delivered' },
    ]},
    { type: 'contact', title: 'Start Your Project', email: biz.email || 'hello@techco.et', phone: biz.phone || '+251 116 700 000', location: biz.address || 'Bole, Addis Ababa, Ethiopia' },
  ];
}

// ── Category fallback templates (used when no name-match found) ──────────────

function genericServiceSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: `Professional ${n.toLowerCase()} services trusted by customers across Addis Ababa.`, cta: 'Contact Us' },
    { type: 'services', title: 'What We Offer', items: [
      { name: 'Standard Package', description: 'Reliable service with clear timelines and professional delivery', price: 'From 500 ETB' },
      { name: 'Premium Package', description: 'Priority service with dedicated support and faster turnaround', price: 'From 2,000 ETB' },
      { name: 'Enterprise Plan', description: 'Tailored solution for businesses — custom scope and pricing', price: 'Get Quote' },
    ]},
    { type: 'features', title: 'Why Choose Us', items: [
      { title: 'Experienced Team', desc: 'Professionals with years of hands-on experience in our field' },
      { title: 'Fast Response', desc: 'We reply within 2 hours and deliver on time — every time' },
      { title: 'Quality Guaranteed', desc: 'Every job is checked before delivery. Not satisfied? We fix it free.' },
    ]},
    { type: 'testimonials', title: 'What Clients Say', items: [
      { name: 'Satisfied Client', text: 'Professional service and clear communication from start to finish. Will use again.' },
      { name: 'Repeat Customer', text: 'The team helped me choose the right option and delivered exactly as promised.' },
    ]},
    { type: 'faq', title: 'Common Questions', items: [
      { question: 'How do I get started?', answer: 'Contact us through this showroom or send a message on Nodbusiness. We respond within 2 hours.' },
      { question: 'Do you deliver or come to my location?', answer: 'Yes — we offer both on-site service and delivery depending on the job type. Ask us for details.' },
    ]},
    { type: 'contact', title: 'Get in Touch', email: biz.email || 'hello@business.et', phone: biz.phone || '+251 911 234 567', location: biz.address || 'Addis Ababa, Ethiopia' },
  ];
}

function genericShopSections(biz) {
  const n = biz.name;
  return [
    { type: 'hero', title: n, subtitle: `Quality products from ${n} — local craftsmanship, reliable stock, and fast delivery.`, cta: 'Shop Now' },
    { type: 'services', title: 'Featured Products', items: [
      { name: 'Best Seller', description: 'Our most popular item — trusted by hundreds of customers', price: 'From 800 ETB' },
      { name: 'Value Bundle', description: 'More for less — curated set of our top products', price: 'From 1,500 ETB' },
      { name: 'Bulk / Wholesale', description: 'For shops, offices, and resellers — bulk pricing available', price: 'Get Quote' },
    ]},
    { type: 'features', title: 'Why Shop With Us', items: [
      { title: 'Verified Quality', desc: 'Every product is checked before it leaves our store' },
      { title: 'Fast Delivery', desc: 'Same-day delivery available within Addis Ababa' },
      { title: 'Easy Returns', desc: '7-day return policy — no questions asked' },
    ]},
    { type: 'testimonials', title: 'Customer Reviews', items: [
      { name: 'Hana B.', text: 'Great quality and fast delivery. Exactly what I needed and well packaged.' },
      { name: 'Dawit K.', text: 'Ordered in bulk for my shop. Good price and reliable stock. Recommended.' },
    ]},
    { type: 'contact', title: 'Order or Visit', email: biz.email || 'shop@business.et', phone: biz.phone || '+251 911 234 567', location: biz.address || 'Addis Ababa, Ethiopia' },
  ];
}

// ── Route incoming biz to the right template builder ────────────────────────
function buildSectionsForBiz(biz) {
  const bizType = getBusinessType(biz.name);
  switch (bizType) {
    case 'ride_service':  return rideServiceSections(biz);
    case 'telecom':       return telecomSections(biz);
    case 'bank':          return bankSections(biz);
    case 'hotel':         return hotelSections(biz);
    case 'restaurant':    return restaurantSections(biz);
    case 'construction':  return constructionSections(biz);
    case 'it_tech':       return itTechSections(biz);
    case 'law':           return lawSections(biz);
    case 'school':        return schoolSections(biz);
    case 'farm':          return farmSections(biz);
    case 'beauty':        return beautySections(biz);
    default:
      // Category fallback
      if (biz.cat === 'restaurant') return restaurantSections(biz);
      if (biz.cat === 'shop')       return genericShopSections(biz);
      return genericServiceSections(biz);
  }
}

// ── Validation helper ────────────────────────────────────────────────────────
function validate(sections, bizName) {
  if (!Array.isArray(sections) || sections.length === 0) {
    console.warn(`[templateData] WARN: ${bizName} — sections array is empty`);
    return;
  }
  for (const s of sections) {
    if (!s.type) console.warn(`[templateData] WARN: ${bizName} — section missing type:`, s);
    if (!s.title) console.warn(`[templateData] WARN: ${bizName} — section missing title:`, s.type);
  }
}

// ── Personalize contact details from biz object ──────────────────────────────
function personalizeSections(sections, biz) {
  return sections.map(s => {
    const copy = { ...s };
    if (s.type === 'hero') {
      copy.title    = biz.name    || copy.title;
      copy.subtitle = biz.desc?.slice(0, 140) || copy.subtitle;
    }
    if (s.type === 'contact') {
      if (biz.email)   copy.email    = biz.email;
      if (biz.phone)   copy.phone    = biz.phone;
      if (biz.address) copy.location = biz.address;
    }
    if (s.items) copy.items = s.items.map(i => ({ ...i }));
    return copy;
  });
}

// ── Legacy DEFAULT_TEMPLATE_ID (kept for backward compat) ───────────────────
const DEFAULT_TEMPLATE_ID = {
  restaurant: 'restaurant_menu',
  shop:       'shop_grid',
  service:    'service_pro',
  health:     'health_clinic',
  other:      'shop_marketplace',
  realestate: 'realestate_modern',
  event:      'event_wedding',
  portfolio:  'portfolio_gallery',
  course:     'course_academy',
};

// ── Public API ───────────────────────────────────────────────────────────────

function getBusinessTemplateData(biz) {
  const sections = buildSectionsForBiz(biz);
  validate(sections, biz.name);
  const bizType  = getBusinessType(biz.name) || biz.cat || 'other';
  const template = DEFAULT_TEMPLATE_ID[biz.cat] || DEFAULT_TEMPLATE_ID.other;
  return { templateId: bizType, sections: JSON.parse(JSON.stringify(sections)), template };
}

function buildBusinessSections(biz) {
  const { templateId, sections } = getBusinessTemplateData(biz);
  return {
    templateId,
    sections: JSON.stringify(personalizeSections(sections, biz)),
    hours:    JSON.stringify(DEFAULT_HOURS),
  };
}

function buildShowroomData(biz) {
  const { templateId, sections } = getBusinessTemplateData(biz);
  const slug =
    (biz.name || 'business')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const themeMap = {
    ride_service:  '#1a1a2e',
    telecom:       '#0060A9',
    bank:          '#1B4F72',
    hotel:         '#D4AF37',
    restaurant:    '#c0392b',
    construction:  '#7f5c1e',
    ecommerce:     '#3B82F6',
    law:           '#2C3E50',
    school:        '#1abc9c',
    farm:          '#2e7d32',
    beauty:        '#ff6f91',
    it_tech:       '#7C3AED',
  };
  const bizType  = getBusinessType(biz.name) || biz.cat || 'other';
  const themeColor = biz.color || themeMap[bizType] || '#D4AF37';

  return {
    title:        biz.name,
    description:  biz.desc,
    slug,
    category:     'business',
    template:     templateId,
    sections:     JSON.stringify(personalizeSections(sections, biz)),
    status:       'published',
    theme_color:  themeColor,
  };
}

module.exports = {
  DEFAULT_TEMPLATE_ID,
  DEFAULT_HOURS,
  VERIFIED_BUSINESSES,
  PRICE_RANGE,
  getBusinessType,
  getBusinessTemplateData,
  buildBusinessSections,
  buildShowroomData,
  personalizeSections,
  validate,
};
