/**
 * Business & showroom section templates — mirrors frontend businessTemplates.js
 * Used by seed.js to generate proper mini-websites for every business category.
 */

const DEFAULT_TEMPLATE_ID = {
  restaurant: 'restaurant_menu',
  shop: 'shop_grid',
  service: 'service_pro',
  health: 'health_clinic',
  other: 'shop_marketplace',
  realestate: 'realestate_modern',
  event: 'event_wedding',
  portfolio: 'portfolio_gallery',
  course: 'course_academy',
};

const TEMPLATES = {
  restaurant_menu: [
    { type: 'hero', title: 'Authentic Flavors', subtitle: 'Fresh, delicious, made with love', cta: 'Order Now' },
    { type: 'about', title: 'About Us', content: '' },
    { type: 'services', title: 'Our Specialties', items: [
      { name: 'Injera Combo', description: 'Traditional Ethiopian platter', price: 'From 350 ETB' },
      { name: 'Kitfo', description: 'Premium Ethiopian steak tartare', price: 'From 450 ETB' },
      { name: 'Coffee Ceremony', description: 'Authentic Ethiopian coffee experience', price: 'From 150 ETB' },
    ]},
    { type: 'gallery', title: 'Food Gallery' },
    { type: 'hours', title: 'Opening Hours' },
    { type: 'testimonials', title: 'What Guests Say', items: [
      { name: 'Selam T.', text: 'Best Ethiopian food in Addis Ababa!' },
      { name: 'Daniel K.', text: 'Amazing atmosphere and friendly staff.' },
    ]},
    { type: 'contact', title: 'Visit or Order' },
  ],
  shop_grid: [
    { type: 'hero', title: 'Welcome', subtitle: 'Shop our collection', cta: 'Browse Products' },
    { type: 'featured_products', title: 'Featured Products' },
    { type: 'products', title: 'All Products' },
    { type: 'about', title: 'About Our Shop', content: '' },
    { type: 'features', title: 'Why Shop With Us', items: [
      { title: 'Fast Delivery', desc: 'Nationwide shipping across Ethiopia' },
      { title: 'Secure Payment', desc: 'Stripe & cash on delivery' },
      { title: 'Easy Returns', desc: '7-day return policy' },
    ]},
    { type: 'contact', title: 'Contact Us' },
  ],
  shop_marketplace: [
    { type: 'hero', title: 'Everything You Need', subtitle: 'Quality products at your fingertips', cta: 'Start Shopping' },
    { type: 'features', title: 'Shop With Confidence', items: [
      { title: 'Quality Guaranteed', desc: 'Verified sellers only' },
      { title: 'Best Prices', desc: 'Competitive pricing in ETB' },
      { title: '24/7 Support', desc: 'Always here to help' },
    ]},
    { type: 'featured_products', title: 'Trending Now' },
    { type: 'products', title: 'Browse All' },
    { type: 'contact', title: 'Customer Support' },
  ],
  service_pro: [
    { type: 'hero', title: 'Professional Services', subtitle: 'Expert solutions for your needs', cta: 'Book a Service' },
    { type: 'about', title: 'About Us', content: '' },
    { type: 'services', title: 'What We Offer', items: [
      { name: 'Consultation', description: 'Expert advice tailored to your needs', price: 'From 500 ETB' },
      { name: 'Standard Service', description: 'Full professional service package', price: 'From 2,000 ETB' },
      { name: 'Premium Package', description: 'End-to-end solution with support', price: 'From 5,000 ETB' },
    ]},
    { type: 'process', title: 'How It Works', items: [
      { title: 'Consult', desc: 'Tell us your needs' },
      { title: 'Plan', desc: 'We create a plan' },
      { title: 'Deliver', desc: 'We execute flawlessly' },
    ]},
    { type: 'testimonials', title: 'Client Testimonials', items: [
      { name: 'Abebe G.', text: 'Professional and reliable service.' },
      { name: 'Mekdes H.', text: 'Exceeded our expectations!' },
    ]},
    { type: 'contact', title: 'Book a Consultation' },
  ],
  health_clinic: [
    { type: 'hero', title: 'Your Health, Our Priority', subtitle: 'Expert care you can trust', cta: 'Book Appointment' },
    { type: 'about', title: 'About Our Clinic', content: '' },
    { type: 'services', title: 'Our Services', items: [
      { name: 'General Checkup', description: 'Comprehensive health assessment', price: 'From 800 ETB' },
      { name: 'Specialist Consultation', description: 'Expert medical consultation', price: 'From 1,200 ETB' },
      { name: 'Lab Tests', description: 'Full diagnostic services', price: 'From 300 ETB' },
    ]},
    { type: 'team', title: 'Our Team' },
    { type: 'hours', title: 'Working Hours' },
    { type: 'contact', title: 'Book a Visit' },
  ],
  realestate_modern: [
    { type: 'hero', title: 'Building the Future', subtitle: 'Premium developments across Addis Ababa', cta: 'Explore Projects' },
    { type: 'gallery', title: 'Our Projects' },
    { type: 'products', title: 'Available Units' },
    { type: 'features', title: 'Why Choose Us', items: [
      { title: 'Quality Build', desc: 'Premium materials' },
      { title: 'Prime Locations', desc: 'Best neighborhoods in Addis' },
      { title: 'Flexible Payment', desc: 'Mortgage options available' },
    ]},
    { type: 'contact', title: 'Book a Site Visit' },
  ],
  portfolio_gallery: [
    { type: 'hero', title: 'Creative Works', subtitle: 'Bringing ideas to life', cta: 'View Portfolio' },
    { type: 'gallery', title: 'Portfolio' },
    { type: 'about', title: 'About the Artist', content: '' },
    { type: 'services', title: 'Services & Pricing', items: [
      { name: 'Basic Package', description: 'Starter creative project', price: 'From 3,000 ETB' },
      { name: 'Standard Package', description: 'Full creative solution', price: 'From 8,000 ETB' },
    ]},
    { type: 'contact', title: "Let's Work Together" },
  ],
  course_academy: [
    { type: 'hero', title: 'Learn New Skills', subtitle: 'Expert-led courses for growth', cta: 'Browse Courses' },
    { type: 'courses', title: 'Available Courses' },
    { type: 'instructor', title: 'Meet Your Instructor' },
    { type: 'testimonials', title: 'Student Success Stories', items: [
      { name: 'Yonas B.', text: 'This course changed my career!' },
    ]},
    { type: 'contact', title: 'Get in Touch' },
  ],
  event_wedding: [
    { type: 'hero', title: 'Unforgettable Events', subtitle: 'Creating memories that last', cta: 'Book Now' },
    { type: 'services', title: 'Our Packages', items: [
      { name: 'Basic Package', description: 'Essential event services', price: 'From 15,000 ETB' },
      { name: 'Premium Package', description: 'Full event management', price: 'From 50,000 ETB' },
    ]},
    { type: 'gallery', title: 'Past Events' },
    { type: 'contact', title: 'Plan Your Event' },
  ],
};

const SHOWROOM_CATEGORY_MAP = {
  restaurant: 'business',
  shop: 'business',
  service: 'business',
  health: 'business',
  other: 'business',
  realestate: 'business',
  event: 'events',
  portfolio: 'creative',
  course: 'education',
};

const DEFAULT_HOURS = [
  { day: 'Monday', hours: '8:00 AM - 6:00 PM' },
  { day: 'Tuesday', hours: '8:00 AM - 6:00 PM' },
  { day: 'Wednesday', hours: '8:00 AM - 6:00 PM' },
  { day: 'Thursday', hours: '8:00 AM - 6:00 PM' },
  { day: 'Friday', hours: '8:00 AM - 6:00 PM' },
  { day: 'Saturday', hours: '9:00 AM - 4:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
];

function personalizeSections(sections, biz) {
  return sections.map(s => {
    const copy = { ...s };
    if (copy.type === 'hero') {
      copy.title = biz.name;
      copy.subtitle = biz.desc?.slice(0, 120) || copy.subtitle;
    }
    if (copy.type === 'about' || copy.type === 'story') {
      copy.content = biz.desc || copy.content;
    }
    if (copy.type === 'contact') {
      copy.email = biz.email || '';
      copy.phone = biz.phone || '';
      copy.location = biz.address || '';
    }
    if (copy.items) copy.items = copy.items.map(i => ({ ...i }));
    return copy;
  });
}

function getBusinessTemplateData(category) {
  const templateId = DEFAULT_TEMPLATE_ID[category] || DEFAULT_TEMPLATE_ID.other;
  const sections = TEMPLATES[templateId] || TEMPLATES.shop_grid;
  return { templateId, sections: JSON.parse(JSON.stringify(sections)) };
}

function buildBusinessSections(biz) {
  const { templateId, sections } = getBusinessTemplateData(biz.cat);
  return {
    templateId,
    sections: JSON.stringify(personalizeSections(sections, biz)),
    hours: JSON.stringify(DEFAULT_HOURS),
  };
}

function buildShowroomData(biz) {
  const { templateId, sections } = getBusinessTemplateData(biz.cat);
  const slug = biz.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + biz.id?.slice(0, 6) || Math.random().toString(36).slice(2, 8);
  return {
    title: biz.name,
    description: biz.desc,
    slug,
    category: SHOWROOM_CATEGORY_MAP[biz.cat] || 'business',
    template: templateId,
    sections: JSON.stringify(personalizeSections(sections, biz)),
    status: 'published',
    theme_color: biz.color || '#D4AF37',
  };
}

module.exports = {
  DEFAULT_TEMPLATE_ID,
  DEFAULT_HOURS,
  getBusinessTemplateData,
  buildBusinessSections,
  buildShowroomData,
  personalizeSections,
};
