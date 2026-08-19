/**
 * showroomTaxonomy.ts
 *
 * Maps the global 5-class business taxonomy (Primary → Quinary sectors,
 * 500+ business types worldwide) into 20 practical categories that
 * Nodbusiness's showroom builder can serve intelligently.
 *
 * Design principle: Any business in the world should be able to find
 * their category in under 10 seconds — by typing keywords OR by browsing.
 */

export interface BusinessCategory {
  key: string;
  label: string;
  labelAm?: string;          // Amharic label
  icon: string;              // Lucide icon name
  emoji: string;             // quick visual identifier
  description: string;       // shown in category picker
  descriptionAm?: string;
  globalSector: string;      // 1st class sector
  globalDivision: string;    // 2nd class division
  keywords: string[];        // search triggers (EN + Amharic romanized)
  subcategories: string[];   // 3rd/4th class examples shown to user
  suggestedColor: string;    // default brand color for this category
  sampleName: string;        // example business name (shown in wizard)
  sampleTagline: string;     // example tagline
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  // ── 1. Food & Dining ──────────────────────────────────────────────────────
  {
    key: 'restaurant',
    label: 'Food & Dining',
    labelAm: 'ምግብ እና ምግብ ቤት',
    icon: 'UtensilsCrossed',
    emoji: '🍽️',
    description: 'Restaurants, cafes, bakeries, catering, bars, food stalls',
    descriptionAm: 'ምግብ ቤቶች፣ ካፌዎች፣ ቤከሪዎች',
    globalSector: 'Tertiary',
    globalDivision: 'Hospitality & Tourism',
    keywords: [
      'restaurant', 'cafe', 'coffee', 'bakery', 'food', 'catering', 'bar', 'grill',
      'bistro', 'kitfo', 'injera', 'tej', 'tej bet', 'buna', 'bunna', 'kategna',
      'habesha', 'cuisine', 'dining', 'eatery', 'kitchen', 'buffet', 'pizza',
      'burger', 'juice', 'smoothie', 'pastry', 'cake', 'shiro', 'tibs',
      'fast food', 'takeaway', 'delivery food', 'catering service',
    ],
    subcategories: [
      'Restaurant', 'Café', 'Bakery', 'Bar & Tej House', 'Catering Service',
      'Fast Food', 'Juice Bar', 'Pastry Shop', 'Food Truck', 'Hotel Restaurant',
      'Traditional Ethiopian', 'Pizza & Pasta', 'Grill & BBQ',
    ],
    suggestedColor: '#f97316',
    sampleName: 'Yod Abyssinia Restaurant',
    sampleTagline: 'Authentic Ethiopian cuisine with live cultural music',
  },

  // ── 2. Shop & Retail ─────────────────────────────────────────────────────
  {
    key: 'retail',
    label: 'Shop & Retail',
    labelAm: 'ሱቅ እና ንግድ',
    icon: 'ShoppingBag',
    emoji: '🛍️',
    description: 'Physical shops, boutiques, markets, product stores',
    globalSector: 'Tertiary',
    globalDivision: 'Retail & Wholesale Trade',
    keywords: [
      'shop', 'store', 'retail', 'boutique', 'market', 'fashion', 'clothing',
      'clothes', 'apparel', 'shoes', 'footwear', 'accessories', 'jewelry',
      'habesha kemis', 'traditional dress', 'electronics', 'appliances',
      'supermarket', 'grocery', 'stationery', 'bookstore', 'sports', 'toys',
      'furniture', 'home goods', 'gifts', 'souvenirs', 'hardware', 'tools',
    ],
    subcategories: [
      'Fashion & Clothing', 'Electronics & Gadgets', 'Grocery & Supermarket',
      'Traditional Crafts & Souvenirs', 'Jewelry & Accessories', 'Books & Stationery',
      'Sports & Fitness Equipment', 'Home & Furniture', 'Toys & Games',
      'Hardware & Tools', 'Cosmetics & Beauty Products', 'Baby & Kids',
    ],
    suggestedColor: '#3b82f6',
    sampleName: 'Bole Fashion House',
    sampleTagline: 'Modern and traditional fashion for every occasion',
  },

  // ── 3. General Services ───────────────────────────────────────────────────
  {
    key: 'service',
    label: 'General Services',
    labelAm: 'አጠቃላይ አገልግሎቶች',
    icon: 'Wrench',
    emoji: '🔧',
    description: 'Repair, cleaning, maintenance, handyman, any service business',
    globalSector: 'Tertiary',
    globalDivision: 'Personal Services',
    keywords: [
      'service', 'repair', 'fix', 'maintenance', 'cleaning', 'handyman', 'plumber',
      'electrician', 'carpenter', 'painter', 'tailoring', 'laundry', 'dry clean',
      'printing', 'courier', 'delivery', 'moving', 'installation', 'welding',
      'mechanic', 'garage', 'car wash', 'pest control', 'security guard',
    ],
    subcategories: [
      'Cleaning Services', 'Plumbing & Electrical', 'Carpentry & Construction',
      'Car Repair & Garage', 'Tailoring & Alterations', 'Laundry & Dry Cleaning',
      'Printing & Photocopying', 'Security Services', 'Moving & Relocation',
      'IT Repair & Support', 'Photography & Video', 'Event Equipment Rental',
    ],
    suggestedColor: '#6366f1',
    sampleName: 'Global Home Services',
    sampleTagline: 'Professional home services you can trust',
  },

  // ── 4. Health & Wellness ──────────────────────────────────────────────────
  {
    key: 'health',
    label: 'Health & Wellness',
    labelAm: 'ጤና እና ደህንነት',
    icon: 'Heart',
    emoji: '🏥',
    description: 'Clinics, hospitals, pharmacies, therapy, wellness centers',
    globalSector: 'Tertiary',
    globalDivision: 'Healthcare Services',
    keywords: [
      'health', 'clinic', 'hospital', 'doctor', 'medical', 'pharmacy', 'dental',
      'dentist', 'eye', 'optometry', 'therapy', 'mental health', 'counseling',
      'physiotherapy', 'lab', 'laboratory', 'nursing', 'wellness', 'yoga',
      'meditation', 'nutrition', 'dietitian', 'pediatric', 'gynecology', 'surgeon',
    ],
    subcategories: [
      'General Clinic', 'Dental Clinic', 'Eye Care', 'Mental Health & Therapy',
      'Pharmacy', 'Diagnostic Laboratory', 'Physiotherapy', 'Maternity Clinic',
      'Pediatric Clinic', 'Specialist Hospital', 'Traditional Medicine',
      'Nutrition & Dietitian', 'Yoga & Wellness Center',
    ],
    suggestedColor: '#10b981',
    sampleName: 'Bethzatha Medical Center',
    sampleTagline: 'Compassionate care for your entire family',
  },

  // ── 5. Beauty & Grooming ──────────────────────────────────────────────────
  {
    key: 'beauty',
    label: 'Beauty & Grooming',
    labelAm: 'ውበት እና እንክብካቤ',
    icon: 'Sparkles',
    emoji: '💅',
    description: 'Salons, barbershops, spas, skincare, nail care, cosmetics',
    globalSector: 'Tertiary',
    globalDivision: 'Personal Services',
    keywords: [
      'salon', 'barber', 'barbershop', 'hair', 'haircut', 'beauty', 'spa',
      'massage', 'nail', 'manicure', 'pedicure', 'skincare', 'facial', 'waxing',
      'threading', 'makeup', 'bridal', 'cosmetics', 'grooming', 'lash', 'brow',
    ],
    subcategories: [
      'Hair Salon', 'Barbershop', 'Day Spa', 'Nail Salon', 'Skincare Clinic',
      'Massage & Relaxation', 'Bridal Beauty', 'Makeup Artist',
      'Men\'s Grooming', 'Natural & Organic Beauty', 'Lash & Brow Studio',
    ],
    suggestedColor: '#ec4899',
    sampleName: 'Glam Studio Bole',
    sampleTagline: 'Where beauty meets expertise',
  },

  // ── 6. Education & Training ───────────────────────────────────────────────
  {
    key: 'education',
    label: 'Education & Training',
    labelAm: 'ትምህርት እና ሥልጠና',
    icon: 'GraduationCap',
    emoji: '📚',
    description: 'Schools, tutoring, training centers, online courses, coaching',
    globalSector: 'Tertiary',
    globalDivision: 'Education Services',
    keywords: [
      'school', 'education', 'training', 'tutor', 'tutoring', 'coaching', 'course',
      'academy', 'institute', 'college', 'university', 'learning', 'language',
      'driving school', 'music school', 'art school', 'coding', 'programming',
      'vocational', 'skills', 'certification', 'exam prep', 'study',
    ],
    subcategories: [
      'Private School', 'Tutoring Center', 'Language School', 'Driving School',
      'IT & Coding Academy', 'Music School', 'Art & Design School',
      'Professional Training', 'Exam Preparation', 'Vocational Training',
      'Online Course Creator', 'Sports Academy', 'Daycare & Preschool',
    ],
    suggestedColor: '#f59e0b',
    sampleName: 'Global Learning Center',
    sampleTagline: 'Empowering minds, building futures',
  },

  // ── 7. Real Estate ────────────────────────────────────────────────────────
  {
    key: 'realestate',
    label: 'Real Estate',
    labelAm: 'ሪል እስቴት',
    icon: 'Building2',
    emoji: '🏢',
    description: 'Property sales, rentals, management, development',
    globalSector: 'Tertiary',
    globalDivision: 'Real Estate Services',
    keywords: [
      'real estate', 'property', 'apartment', 'house', 'villa', 'rent', 'sale',
      'lease', 'commercial', 'office space', 'land', 'condominium', 'condo',
      'building', 'compound', 'bungalow', 'studio', 'penthouse', 'warehouse',
    ],
    subcategories: [
      'Residential Sales', 'Apartment Rentals', 'Commercial Property',
      'Property Management', 'Real Estate Development', 'Land Sales',
      'Office Space Rental', 'Industrial Property', 'Property Valuation',
    ],
    suggestedColor: '#0ea5e9',
    sampleName: 'Global Property Group',
    sampleTagline: 'Finding your perfect space in your city',
  },

  // ── 8. Technology & IT ────────────────────────────────────────────────────
  {
    key: 'technology',
    label: 'Technology & IT',
    labelAm: 'ቴክኖሎጂ እና IT',
    icon: 'Code2',
    emoji: '💻',
    description: 'Software, IT services, app development, digital solutions',
    globalSector: 'Quaternary',
    globalDivision: 'Information Technology',
    keywords: [
      'software', 'technology', 'IT', 'tech', 'app', 'website', 'digital',
      'developer', 'programming', 'coding', 'web design', 'mobile app',
      'system', 'network', 'cloud', 'data', 'cybersecurity', 'startup',
      'SaaS', 'e-commerce solution', 'ERP', 'CRM', 'IT support',
    ],
    subcategories: [
      'Software Development', 'Web Design & Development', 'Mobile App Development',
      'IT Support & Consulting', 'Cloud Services', 'Cybersecurity',
      'Data Analytics', 'UI/UX Design', 'ERP & Business Systems',
      'E-commerce Solutions', 'Digital Marketing Tech', 'AI & Machine Learning',
    ],
    suggestedColor: '#8b5cf6',
    sampleName: 'EthioTech Solutions',
    sampleTagline: 'Building digital solutions for African businesses',
  },

  // ── 9. Creative & Design ──────────────────────────────────────────────────
  {
    key: 'creative',
    label: 'Creative & Design',
    labelAm: 'ፈጠራ እና ዲዛይን',
    icon: 'Palette',
    emoji: '🎨',
    description: 'Graphic design, photography, video, branding, art studios',
    globalSector: 'Quaternary',
    globalDivision: 'Digital Media & Content',
    keywords: [
      'design', 'graphic', 'logo', 'branding', 'photography', 'photo', 'video',
      'film', 'animation', 'illustration', 'art', 'artist', 'creative', 'media',
      'content', 'social media', 'advertising', 'marketing', 'agency', 'studio',
      'print', 'signage', 'billboard', 'wedding photography',
    ],
    subcategories: [
      'Graphic Design Studio', 'Photography Studio', 'Video Production',
      'Branding & Identity', 'Advertising Agency', 'Social Media Agency',
      'Animation Studio', 'Print & Signage', 'Wedding Photography',
      'Content Creation', 'Illustration & Art', 'Interior Design',
    ],
    suggestedColor: '#a855f7',
    sampleName: 'Pixel Creative Studio',
    sampleTagline: 'Visual storytelling that grows your brand',
  },

  // ── 10. Legal & Consulting ────────────────────────────────────────────────
  {
    key: 'legal',
    label: 'Legal & Consulting',
    labelAm: 'ህግ እና ምክር',
    icon: 'Scale',
    emoji: '⚖️',
    description: 'Law firms, consultants, advisors, business consulting',
    globalSector: 'Tertiary',
    globalDivision: 'Professional Services',
    keywords: [
      'law', 'lawyer', 'attorney', 'legal', 'firm', 'advocate', 'notary',
      'consulting', 'consultant', 'advisor', 'management', 'strategy',
      'audit', 'compliance', 'HR', 'human resources', 'business plan',
      'immigration', 'contract', 'corporate', 'tax advisory',
    ],
    subcategories: [
      'Law Firm', 'Management Consulting', 'HR Consulting', 'Tax Advisory',
      'Business Plan Consulting', 'Immigration Services', 'Corporate Law',
      'Family Law', 'Property Law', 'Notary Services', 'Compliance Consulting',
    ],
    suggestedColor: '#1d4ed8',
    sampleName: 'Global Legal Partners',
    sampleTagline: 'Expert legal guidance for your business and life',
  },

  // ── 11. Finance & Insurance ───────────────────────────────────────────────
  {
    key: 'finance',
    label: 'Finance & Insurance',
    labelAm: 'ፋይናንስ እና ኢንሹራንስ',
    icon: 'TrendingUp',
    emoji: '💰',
    description: 'Banks, microfinance, insurance, investment, accounting firms',
    globalSector: 'Tertiary',
    globalDivision: 'Financial Services',
    keywords: [
      'finance', 'bank', 'banking', 'microfinance', 'loan', 'credit', 'insurance',
      'investment', 'accounting', 'bookkeeping', 'tax', 'auditing', 'leasing',
      'remittance', 'forex', 'money transfer', 'savings', 'cooperative',
    ],
    subcategories: [
      'Microfinance Institution', 'Insurance Agency', 'Accounting Firm',
      'Investment Advisory', 'Money Transfer Service', 'Tax Preparation',
      'Credit Union / Equb', 'Leasing Company', 'Forex Bureau',
      'Bookkeeping Services', 'Financial Planning', 'Auditing Firm',
    ],
    suggestedColor: '#d97706',
    sampleName: 'Nile Capital Advisors',
    sampleTagline: 'Your trusted partner for financial growth',
  },

  // ── 12. Construction & Engineering ───────────────────────────────────────
  {
    key: 'construction',
    label: 'Construction & Engineering',
    labelAm: 'ግንባታ እና ምህንድስና',
    icon: 'HardHat',
    emoji: '🏗️',
    description: 'Construction companies, engineering firms, architecture, renovation',
    globalSector: 'Secondary',
    globalDivision: 'Construction & Building Materials',
    keywords: [
      'construction', 'build', 'building', 'engineer', 'engineering', 'architect',
      'architecture', 'contractor', 'renovation', 'remodel', 'structural', 'civil',
      'plumbing', 'electrical installation', 'interiors', 'landscaping', 'roads',
      'bridges', 'concrete', 'steel', 'infrastructure',
    ],
    subcategories: [
      'General Contractor', 'Architecture Firm', 'Civil Engineering',
      'Interior Design & Fit-out', 'Electrical Engineering', 'Plumbing & Sanitation',
      'Landscaping', 'Road Construction', 'Building Materials Supply',
      'Real Estate Development', 'Project Management', 'Structural Engineering',
    ],
    suggestedColor: '#78716c',
    sampleName: 'Sur Construction PLC',
    sampleTagline: 'Building cities and infrastructure that last',
  },

  // ── 13. Automotive ────────────────────────────────────────────────────────
  {
    key: 'automotive',
    label: 'Automotive',
    labelAm: 'ተሽከርካሪ',
    icon: 'Car',
    emoji: '🚗',
    description: 'Car sales, repair garages, spare parts, car rental, driving schools',
    globalSector: 'Secondary',
    globalDivision: 'Automotive Manufacturing / Retail',
    keywords: [
      'car', 'vehicle', 'auto', 'automotive', 'garage', 'mechanic', 'repair',
      'spare parts', 'tires', 'car wash', 'rental', 'dealer', 'dealership',
      'truck', 'motorcycle', 'bus', 'electric vehicle', 'EV', 'lubricant',
    ],
    subcategories: [
      'Car Dealership', 'Auto Repair Garage', 'Spare Parts Shop', 'Car Rental',
      'Motorcycle Shop', 'Car Wash', 'Tires & Wheels', 'Driving School',
      'Vehicle Inspection', 'Fleet Management', 'EV Charging Station',
    ],
    suggestedColor: '#ef4444',
    sampleName: 'Marathon Motors',
    sampleTagline: 'Your complete automotive solution in Addis',
  },

  // ── 14. Agriculture & Food Production ────────────────────────────────────
  {
    key: 'agriculture',
    label: 'Agriculture & Food Production',
    labelAm: 'ግብርና እና ምግብ ምርት',
    icon: 'Sprout',
    emoji: '🌾',
    description: 'Farms, food processing, coffee export, agri-business',
    globalSector: 'Primary',
    globalDivision: 'Agriculture & Farming',
    keywords: [
      'farm', 'agriculture', 'farming', 'crop', 'harvest', 'coffee', 'coffee export',
      'tea', 'spice', 'teff', 'grain', 'vegetable', 'fruit', 'livestock',
      'dairy', 'honey', 'bee', 'organic', 'greenhouse', 'agri', 'food processing',
      'milling', 'export', 'plantation',
    ],
    subcategories: [
      'Coffee Farm & Export', 'Vegetable Farm', 'Fruit Orchard', 'Livestock Farm',
      'Dairy Farm', 'Honey & Apiary', 'Grain & Teff Farming', 'Greenhouse',
      'Food Processing Plant', 'Spice Production', 'Organic Farm', 'Agri-Input Supply',
    ],
    suggestedColor: '#65a30d',
    sampleName: 'Yirgacheffe Coffee Estate',
    sampleTagline: 'Single-origin Ethiopian specialty coffee',
  },

  // ── 15. Manufacturing & Industry ──────────────────────────────────────────
  {
    key: 'manufacturing',
    label: 'Manufacturing & Industry',
    labelAm: 'ማምረት እና ኢንዱስትሪ',
    icon: 'Factory',
    emoji: '🏭',
    description: 'Factories, production plants, industrial companies',
    globalSector: 'Secondary',
    globalDivision: 'Various Manufacturing Sectors',
    keywords: [
      'factory', 'manufacturing', 'production', 'industrial', 'plant', 'mill',
      'textile', 'garment', 'furniture', 'packaging', 'plastic', 'metal',
      'fabrication', 'welding', 'assembly', 'processing', 'export manufacturing',
    ],
    subcategories: [
      'Garment & Textile Factory', 'Furniture Manufacturer', 'Food Processing Factory',
      'Metal Fabrication', 'Packaging Factory', 'Plastic Manufacturing',
      'Leather Products', 'Chemical Manufacturing', 'Building Materials', 'Export Factory',
    ],
    suggestedColor: '#57534e',
    sampleName: 'Ethio Industrial Group',
    sampleTagline: 'Quality manufacturing for local and global markets',
  },

  // ── 16. Transport & Logistics ────────────────────────────────────────────
  {
    key: 'logistics',
    label: 'Transport & Logistics',
    labelAm: 'ትራንስፖርት እና ሎጂስቲክስ',
    icon: 'Truck',
    emoji: '🚚',
    description: 'Transport companies, freight, courier, delivery services',
    globalSector: 'Tertiary',
    globalDivision: 'Transportation & Logistics',
    keywords: [
      'transport', 'logistics', 'freight', 'shipping', 'courier', 'delivery',
      'trucking', 'cargo', 'forwarding', 'customs', 'clearing', 'warehouse',
      'storage', 'distribution', 'last mile', 'bus company', 'taxi', 'ride',
    ],
    subcategories: [
      'Freight Transport', 'Courier & Parcel Delivery', 'Customs Clearance',
      'Warehousing & Storage', 'Bus & Minibus Transport', 'Taxi & Ride Services',
      'Cargo Airline Agent', 'Import/Export Agent', 'Cold Chain Logistics',
    ],
    suggestedColor: '#0891b2',
    sampleName: 'Express Logistics Co.',
    sampleTagline: 'Reliable freight solutions across the region and beyond',
  },

  // ── 17. Entertainment & Events ────────────────────────────────────────────
  {
    key: 'entertainment',
    label: 'Entertainment & Events',
    labelAm: 'መዝናኛ እና ዝግጅቶች',
    icon: 'Music',
    emoji: '🎭',
    description: 'Event planning, venues, entertainment, media, nightlife',
    globalSector: 'Tertiary',
    globalDivision: 'Media & Entertainment',
    keywords: [
      'event', 'wedding', 'party', 'entertainment', 'venue', 'hall', 'theater',
      'cinema', 'concert', 'music', 'band', 'DJ', 'nightclub', 'bar', 'lounge',
      'games', 'sports club', 'gym', 'fitness', 'recreation', 'park', 'resort',
    ],
    subcategories: [
      'Event Planning', 'Wedding Venue', 'Concert & Music Venue', 'Cinema',
      'Sports & Fitness Club', 'Gaming Center', 'Nightclub & Lounge',
      'Cultural Center', 'Conference Center', 'Amusement Park',
      'Photography & Videography (Events)',
    ],
    suggestedColor: '#7c3aed',
    sampleName: 'City Events & Entertainment',
    sampleTagline: 'Creating unforgettable experiences',
  },

  // ── 18. NGO & Non-profit ──────────────────────────────────────────────────
  {
    key: 'nonprofit',
    label: 'NGO & Non-profit',
    labelAm: 'መንግሥታዊ ያልሆነ ድርጅት',
    icon: 'Heart',
    emoji: '🤝',
    description: 'NGOs, charities, community organizations, foundations',
    globalSector: 'Quinary',
    globalDivision: 'Philanthropy & Charities',
    keywords: [
      'NGO', 'nonprofit', 'charity', 'foundation', 'community', 'aid', 'relief',
      'organization', 'association', 'church', 'mosque', 'temple', 'religious',
      'humanitarian', 'volunteer', 'development', 'social enterprise', 'impact',
    ],
    subcategories: [
      'Humanitarian Aid Organization', 'Community Development',
      'Religious Organization', 'Environmental NGO', 'Youth Organization',
      'Women\'s Rights Organization', 'Health NGO', 'Education NGO',
      'Social Enterprise', 'Cooperative', 'Charity Foundation',
    ],
    suggestedColor: '#14b8a6',
    sampleName: 'City Community Foundation',
    sampleTagline: 'Building stronger communities together',
  },

  // ── 19. Hotel & Travel ────────────────────────────────────────────────────
  {
    key: 'hospitality',
    label: 'Hotel & Travel',
    labelAm: 'ሆቴልና ጉዞ',
    icon: 'Hotel',
    emoji: '🏨',
    description: 'Hotels, guesthouses, travel agencies, tour operators',
    globalSector: 'Tertiary',
    globalDivision: 'Hospitality & Tourism',
    keywords: [
      'hotel', 'guesthouse', 'lodge', 'resort', 'hostel', 'bed and breakfast',
      'travel', 'tour', 'tourism', 'travel agency', 'booking', 'accommodation',
      'safari', 'trekking', 'guide', 'vacation', 'holiday', 'apartment rental',
    ],
    subcategories: [
      'Luxury Hotel', 'Boutique Hotel', 'Guesthouse & B&B', 'Hostel',
      'Travel Agency', 'Tour Operator', 'Safari & Adventure', 'Airport Transfer',
      'Serviced Apartments', 'Eco-Lodge', 'Conference Hotel',
    ],
    suggestedColor: '#b45309',
    sampleName: 'Highland Nature Lodge',
    sampleTagline: 'Experience nature and culture like never before',
  },

  // ── 20. Online Store / E-commerce ────────────────────────────────────────
  {
    key: 'ecommerce',
    label: 'Online Store',
    labelAm: 'የኦንላይን ሱቅ',
    icon: 'Globe',
    emoji: '🌐',
    description: 'Online-only businesses, dropshipping, digital products, subscriptions',
    globalSector: 'Tertiary',
    globalDivision: 'Retail & Wholesale Trade (Digital)',
    keywords: [
      'online', 'e-commerce', 'digital', 'dropship', 'subscription', 'download',
      'digital product', 'ebook', 'course', 'membership', 'affiliate', 'online shop',
      'marketplace', 'virtual', 'remote service', 'freelance',
    ],
    subcategories: [
      'Online Product Store', 'Digital Downloads', 'Online Courses & eBooks',
      'Subscription Service', 'Freelance Profile', 'Dropshipping Store',
      'Online Marketplace', 'SaaS Product', 'Newsletter & Blog',
    ],
    suggestedColor: '#2563eb',
    sampleName: 'Global Digital Market',
    sampleTagline: 'Shop and discover the best products, online',
  },
];

// ── Helper functions ──────────────────────────────────────────────────────────

/** Get a category by key */
export function getCategory(key: string): BusinessCategory | undefined {
  return BUSINESS_CATEGORIES.find(c => c.key === key);
}

/** Search categories by keyword */
export function searchCategories(query: string): BusinessCategory[] {
  if (!query.trim()) return BUSINESS_CATEGORIES;
  const q = query.toLowerCase().trim();
  return BUSINESS_CATEGORIES.filter(cat =>
    cat.label.toLowerCase().includes(q) ||
    cat.description.toLowerCase().includes(q) ||
    cat.keywords.some(k => k.toLowerCase().includes(q)) ||
    cat.subcategories.some(s => s.toLowerCase().includes(q))
  );
}

/** Get suggested brand colors for a category */
export function getCategoryColor(key: string): string {
  return getCategory(key)?.suggestedColor ?? '#2563eb';
}

export default BUSINESS_CATEGORIES;
