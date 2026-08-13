/**
 * showroomTemplates.ts
 *
 * Maps each of the 20 business categories to a showroom template —
 * which sections appear, in what order, with what labels and sample data.
 *
 * Design principle: when a restaurant owner opens the builder,
 * they should see "Our Menu", not a blank canvas. When a lawyer opens it,
 * they see "Practice Areas". Same underlying section, different context.
 */

// ── Field Types ───────────────────────────────────────────────────────────────
export type FieldType =
  | 'text' | 'textarea' | 'richtext' | 'number' | 'currency'
  | 'image' | 'images' | 'url' | 'phone' | 'email'
  | 'select' | 'toggle' | 'color' | 'time' | 'date' | 'location';

export interface SectionField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];       // for select fields
  hint?: string;            // helper text shown below field
  maxLength?: number;
}

// ── Section Types ─────────────────────────────────────────────────────────────
export type SectionType =
  | 'hero' | 'about' | 'services' | 'items' | 'team'
  | 'gallery' | 'testimonials' | 'faq' | 'contact' | 'hours'
  | 'locations' | 'pricing' | 'process' | 'social' | 'cta' | 'stats';

export interface SectionTemplate {
  type: SectionType;
  title: string;              // section heading label (category-specific)
  subtitle?: string;          // optional subheading
  icon: string;               // Lucide icon name
  required: boolean;          // can the user delete this section?
  layout?: 'grid' | 'list' | 'carousel' | 'timeline' | 'cards' | 'accordion';
  fields: SectionField[];
  defaultItems?: Record<string, unknown>[];  // pre-filled sample data
  hint?: string;              // shown in builder to guide user
}

export interface ShowroomTemplate {
  categoryKey: string;
  sections: SectionTemplate[];
}

// ── Shared field libraries ────────────────────────────────────────────────────
const CONTACT_FIELDS: SectionField[] = [
  { key: 'phone',    label: 'Phone Number',  type: 'phone',    required: false, placeholder: '+1 234 567 8900' },
  { key: 'whatsapp', label: 'WhatsApp',      type: 'phone',    required: false, placeholder: '+1 234 567 8900' },
  { key: 'telegram', label: 'Telegram',      type: 'text',     required: false, placeholder: '@yourusername' },
  { key: 'email',    label: 'Email Address', type: 'email',    required: false, placeholder: 'hello@yourbusiness.com' },
  { key: 'address',  label: 'Address',       type: 'textarea', required: false, placeholder: 'Your street address, City, Country' },
  { key: 'location', label: 'Map Pin',       type: 'location', required: false },
  { key: 'website',  label: 'Website URL',   type: 'url',      required: false, placeholder: 'https://yourbusiness.com' },
];

const HERO_FIELDS: SectionField[] = [
  { key: 'title',       label: 'Business Name',   type: 'text',     required: true,  placeholder: 'Your Business Name', maxLength: 80 },
  { key: 'subtitle',    label: 'Tagline',         type: 'text',     required: false, placeholder: 'A short memorable tagline', maxLength: 120 },
  { key: 'cover_image', label: 'Cover Photo',     type: 'image',    required: false, hint: 'Best size: 1200×400px. Wide and landscape.' },
  { key: 'logo',        label: 'Logo',            type: 'image',    required: false, hint: 'Square logo works best. Min 200×200px.' },
  { key: 'cta_text',    label: 'Button Text',     type: 'text',     required: false, placeholder: 'Contact Us', maxLength: 30 },
  { key: 'cta_link',    label: 'Button Link',     type: 'url',      required: false, placeholder: '#contact' },
];

const ABOUT_FIELDS: SectionField[] = [
  { key: 'title',   label: 'Section Title',   type: 'text',     required: false, placeholder: 'About Us' },
  { key: 'content', label: 'Your Story',      type: 'richtext', required: true,  placeholder: 'Tell visitors who you are, what you do, and what makes you different...', maxLength: 1000 },
  { key: 'image',   label: 'Photo (optional)',type: 'image',    required: false, hint: 'A photo of your team, shop, or workspace.' },
];

const TESTIMONIALS_FIELDS: SectionField[] = [
  { key: 'name',    label: 'Customer Name',  type: 'text',     required: true,  placeholder: 'Abebe Girma' },
  { key: 'role',    label: 'Title / Role',   type: 'text',     required: false, placeholder: 'Business Owner' },
  { key: 'quote',   label: 'Their Review',   type: 'textarea', required: true,  placeholder: 'What did they say about your business?', maxLength: 300 },
  { key: 'rating',  label: 'Star Rating',    type: 'select',   required: false, options: ['5', '4', '3'] },
  { key: 'avatar',  label: 'Photo',          type: 'image',    required: false },
];

const FAQ_FIELDS: SectionField[] = [
  { key: 'question', label: 'Question', type: 'text',     required: true, placeholder: 'How do I place an order?' },
  { key: 'answer',   label: 'Answer',   type: 'textarea', required: true, placeholder: 'You can order by calling us, via WhatsApp, or through our online store.', maxLength: 400 },
];

const SOCIAL_FIELDS: SectionField[] = [
  { key: 'instagram', label: 'Instagram URL',  type: 'url',  required: false },
  { key: 'facebook',  label: 'Facebook URL',   type: 'url',  required: false },
  { key: 'tiktok',    label: 'TikTok URL',     type: 'url',  required: false },
  { key: 'youtube',   label: 'YouTube URL',    type: 'url',  required: false },
  { key: 'linkedin',  label: 'LinkedIn URL',   type: 'url',  required: false },
  { key: 'twitter',   label: 'X (Twitter) URL',type: 'url',  required: false },
];

const HOURS_FIELDS: SectionField[] = [
  { key: 'monday',    label: 'Monday',    type: 'text', required: false, placeholder: '8:00 AM – 6:00 PM' },
  { key: 'tuesday',   label: 'Tuesday',   type: 'text', required: false, placeholder: '8:00 AM – 6:00 PM' },
  { key: 'wednesday', label: 'Wednesday', type: 'text', required: false, placeholder: '8:00 AM – 6:00 PM' },
  { key: 'thursday',  label: 'Thursday',  type: 'text', required: false, placeholder: '8:00 AM – 6:00 PM' },
  { key: 'friday',    label: 'Friday',    type: 'text', required: false, placeholder: '8:00 AM – 6:00 PM' },
  { key: 'saturday',  label: 'Saturday',  type: 'text', required: false, placeholder: '9:00 AM – 4:00 PM' },
  { key: 'sunday',    label: 'Sunday',    type: 'text', required: false, placeholder: 'Closed' },
];

const PROCESS_FIELDS: SectionField[] = [
  { key: 'step',        label: 'Step Name',   type: 'text',     required: true,  placeholder: 'Step 1: Contact Us' },
  { key: 'description', label: 'Description', type: 'textarea', required: true,  placeholder: 'What happens in this step?', maxLength: 200 },
  { key: 'icon',        label: 'Icon',        type: 'select',   required: false, options: ['Phone', 'FileText', 'CheckCircle', 'Truck', 'Star', 'Clock', 'MessageCircle', 'CreditCard', 'Search', 'Settings', 'Users', 'Package'] },
];

const TEAM_FIELDS: SectionField[] = [
  { key: 'name',   label: 'Name',       type: 'text',     required: true,  placeholder: 'Dr. Mekdes Tesfaye' },
  { key: 'role',   label: 'Role/Title', type: 'text',     required: true,  placeholder: 'General Practitioner' },
  { key: 'bio',    label: 'Short Bio',  type: 'textarea', required: false, placeholder: '10 years of experience in...', maxLength: 200 },
  { key: 'avatar', label: 'Photo',      type: 'image',    required: false },
  { key: 'email',  label: 'Email',      type: 'email',    required: false },
  { key: 'phone',  label: 'Phone',      type: 'phone',    required: false },
];

const CTA_FIELDS: SectionField[] = [
  { key: 'heading',    label: 'Headline',    type: 'text',  required: true,  placeholder: 'Ready to get started?', maxLength: 80 },
  { key: 'subheading', label: 'Subheadline', type: 'text',  required: false, placeholder: 'Contact us today for a free consultation.', maxLength: 120 },
  { key: 'cta_text',   label: 'Button Text', type: 'text',  required: true,  placeholder: 'Get in Touch', maxLength: 30 },
  { key: 'cta_link',   label: 'Button Link', type: 'url',   required: false, placeholder: '#contact' },
  { key: 'bg_color',   label: 'Background',  type: 'color', required: false },
];

// ── Template factory helpers ───────────────────────────────────────────────────
function heroSection(overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'hero', title: 'Welcome', icon: 'Home', required: true, layout: 'cards', fields: HERO_FIELDS, ...overrides };
}
function aboutSection(overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'about', title: 'About Us', icon: 'Info', required: false, layout: 'cards', fields: ABOUT_FIELDS, ...overrides };
}
function contactSection(overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'contact', title: 'Contact Us', icon: 'Phone', required: true, layout: 'cards', fields: CONTACT_FIELDS, ...overrides };
}
function testimonialsSection(overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'testimonials', title: 'What Our Customers Say', icon: 'Quote', required: false, layout: 'carousel',
    fields: TESTIMONIALS_FIELDS,
    defaultItems: [
      { name: 'Abebe Girma', role: 'Customer', quote: 'Excellent service! I highly recommend them to everyone.', rating: '5' },
      { name: 'Tigist Haile', role: 'Regular Customer', quote: 'Best quality in the area. Always satisfied!', rating: '5' },
    ],
    ...overrides };
}
function faqSection(overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'faq', title: 'Frequently Asked Questions', icon: 'HelpCircle', required: false, layout: 'accordion', fields: FAQ_FIELDS, ...overrides };
}
function hoursSection(overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'hours', title: 'Opening Hours', icon: 'Clock', required: false, layout: 'list', fields: HOURS_FIELDS,
    defaultItems: [{ monday: '8:00 AM – 8:00 PM', tuesday: '8:00 AM – 8:00 PM', wednesday: '8:00 AM – 8:00 PM', thursday: '8:00 AM – 8:00 PM', friday: '8:00 AM – 8:00 PM', saturday: '9:00 AM – 5:00 PM', sunday: 'Closed' }],
    ...overrides };
}
function socialSection(overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'social', title: 'Follow Us', icon: 'Share2', required: false, layout: 'cards', fields: SOCIAL_FIELDS, ...overrides };
}
function ctaSection(overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'cta', title: 'Call to Action', icon: 'Zap', required: false, layout: 'cards', fields: CTA_FIELDS,
    defaultItems: [{ heading: 'Ready to get started?', cta_text: 'Contact Us Today', cta_link: '#contact' }],
    ...overrides };
}
function processSection(title = 'How It Works', overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'process', title, icon: 'GitBranch', required: false, layout: 'timeline', fields: PROCESS_FIELDS,
    defaultItems: [
      { step: 'Contact Us', description: 'Reach out by phone, WhatsApp, or email to discuss your needs.', icon: 'Phone' },
      { step: 'We Assess', description: 'We review your requirements and provide a tailored solution.', icon: 'Search' },
      { step: 'We Deliver', description: 'Our team completes the work to the highest standard.', icon: 'CheckCircle' },
    ],
    ...overrides };
}
function teamSection(title = 'Meet Our Team', roleLabel = 'Team Member', overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'team', title, icon: 'Users', required: false, layout: 'grid', fields: TEAM_FIELDS,
    hint: `Add your ${roleLabel.toLowerCase()}s and their roles.`,
    ...overrides };
}
function gallerySection(title = 'Gallery', overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'gallery', title, icon: 'Image', required: false, layout: 'grid',
    fields: [
      { key: 'images', label: 'Photos', type: 'images', required: true, hint: 'Upload up to 20 photos. Drag to reorder.' },
      { key: 'caption', label: 'Caption (optional)', type: 'text', required: false, placeholder: 'Brief description of these photos' },
    ],
    ...overrides };
}
function itemsSection(title: string, itemFields: SectionField[], defaultItems?: Record<string, unknown>[], overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'items', title, icon: 'List', required: false, layout: 'grid', fields: itemFields, defaultItems, ...overrides };
}
function servicesSection(title = 'Our Services', overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'services', title, icon: 'Star', required: false, layout: 'grid',
    fields: [
      { key: 'name',        label: 'Service Name',  type: 'text',     required: true,  placeholder: 'Service name', maxLength: 80 },
      { key: 'description', label: 'Description',   type: 'textarea', required: false, placeholder: 'What does this service include?', maxLength: 300 },
      { key: 'price',       label: 'Price',   type: 'text',     required: false, placeholder: '500 or Free' },
      { key: 'duration',    label: 'Duration',      type: 'text',     required: false, placeholder: '1 hour' },
      { key: 'icon',        label: 'Icon',          type: 'select',   required: false, options: ['Star', 'Check', 'Zap', 'Shield', 'Award', 'Target', 'Globe', 'Layers', 'Settings', 'Code', 'Heart', 'Truck'] },
      { key: 'image',       label: 'Photo',         type: 'image',    required: false },
    ],
    ...overrides };
}
function pricingSection(title = 'Our Pricing', overrides?: Partial<SectionTemplate>): SectionTemplate {
  return { type: 'pricing', title, icon: 'CreditCard', required: false, layout: 'cards',
    fields: [
      { key: 'name',        label: 'Plan Name',        type: 'text',     required: true,  placeholder: 'Basic' },
      { key: 'price',       label: 'Price',   type: 'text',     required: true,  placeholder: '500/month' },
      { key: 'description', label: 'Brief Description',type: 'text',     required: false, placeholder: 'Perfect for individuals' },
      { key: 'features',    label: 'Features (one per line)', type: 'textarea', required: false, placeholder: 'Feature 1\nFeature 2\nFeature 3' },
      { key: 'cta_text',    label: 'Button Text',      type: 'text',     required: false, placeholder: 'Get Started' },
      { key: 'highlight',   label: 'Mark as Popular?', type: 'toggle',   required: false },
    ],
    ...overrides };
}

// ── THE TEMPLATES ─────────────────────────────────────────────────────────────
export const SHOWROOM_TEMPLATES: Record<string, ShowroomTemplate> = {

  restaurant: {
    categoryKey: 'restaurant',
    sections: [
      heroSection({ subtitle: 'Great food, warm atmosphere' }),
      itemsSection('Our Menu', [
        { key: 'name',        label: 'Dish Name',       type: 'text',     required: true,  placeholder: 'House Special' },
        { key: 'price',       label: 'Price',           type: 'currency', required: false, placeholder: '15' },
        { key: 'description', label: 'Description',     type: 'textarea', required: false, placeholder: 'Freshly prepared with seasonal ingredients', maxLength: 200 },
        { key: 'image',       label: 'Photo',           type: 'image',    required: false },
        { key: 'category',    label: 'Menu Category',   type: 'text',     required: false, placeholder: 'Main Dishes' },
        { key: 'is_vegan',    label: 'Vegan/Fasting?',  type: 'toggle',   required: false },
      ], [
        { name: 'House Special', price: '18', category: 'Main Course', description: 'Our most popular dish, freshly prepared daily', is_vegan: false },
        { name: 'Seasonal Salad', price: '12', category: 'Starters', description: 'Fresh ingredients sourced from local farms', is_vegan: true },
        { name: 'Signature Drink', price: '6', category: 'Beverages', description: 'House-made specialty beverage', is_vegan: true },
      ]),
      gallerySection('Photos'),
      hoursSection(),
      aboutSection({ title: 'Our Story' }),
      testimonialsSection(),
      contactSection(),
      socialSection(),
    ],
  },

  retail: {
    categoryKey: 'retail',
    sections: [
      heroSection(),
      itemsSection('Our Products', [
        { key: 'name',        label: 'Product Name',    type: 'text',     required: true,  placeholder: 'Premium Handmade Item' },
        { key: 'price',       label: 'Price',           type: 'currency', required: false },
        { key: 'description', label: 'Description',     type: 'textarea', required: false, maxLength: 200 },
        { key: 'image',       label: 'Photo',           type: 'image',    required: false },
        { key: 'category',    label: 'Category',        type: 'text',     required: false, placeholder: 'Women\'s Fashion' },
        { key: 'sku',         label: 'SKU / Code',      type: 'text',     required: false },
        { key: 'available',   label: 'In Stock?',       type: 'toggle',   required: false },
      ]),
      gallerySection('Shop Photos'),
      aboutSection(),
      hoursSection(),
      testimonialsSection(),
      contactSection(),
      socialSection(),
    ],
  },

  service: {
    categoryKey: 'service',
    sections: [
      heroSection(),
      servicesSection('What We Offer'),
      processSection('How It Works'),
      teamSection('Our Team', 'Staff'),
      gallerySection('Our Work'),
      testimonialsSection(),
      faqSection(),
      hoursSection(),
      contactSection(),
    ],
  },

  health: {
    categoryKey: 'health',
    sections: [
      heroSection(),
      servicesSection('Medical Services'),
      teamSection('Our Doctors & Staff', 'Doctor'),
      aboutSection({ title: 'About Our Clinic' }),
      processSection('How to Book an Appointment'),
      hoursSection(),
      testimonialsSection(),
      faqSection({ defaultItems: [
        { question: 'Do I need an appointment?', answer: 'Walk-ins are welcome, but booking in advance is recommended to reduce waiting time.' },
        { question: 'Which insurance plans do you accept?', answer: 'We accept CBE Insurance, CBHI, and most major private insurers. Contact us for details.' },
        { question: 'How long does a consultation take?', answer: 'A standard consultation is 20–30 minutes. Specialist visits may take longer.' },
      ]}),
      contactSection(),
    ],
  },

  beauty: {
    categoryKey: 'beauty',
    sections: [
      heroSection(),
      servicesSection('Our Treatments'),
      gallerySection('Our Work'),
      pricingSection('Treatment Prices'),
      teamSection('Meet Our Stylists', 'Stylist'),
      hoursSection(),
      testimonialsSection(),
      faqSection(),
      contactSection(),
      socialSection(),
    ],
  },

  education: {
    categoryKey: 'education',
    sections: [
      heroSection(),
      servicesSection('Our Programs'),
      pricingSection('Tuition & Fees'),
      teamSection('Our Instructors', 'Instructor'),
      processSection('Enrollment Process'),
      aboutSection({ title: 'Our Mission' }),
      testimonialsSection({ title: 'Student Success Stories' }),
      faqSection(),
      contactSection(),
    ],
  },

  realestate: {
    categoryKey: 'realestate',
    sections: [
      heroSection(),
      itemsSection('Current Listings', [
        { key: 'name',        label: 'Property Title',  type: 'text',     required: true,  placeholder: '2-Bedroom Apartment — City Center' },
        { key: 'price',       label: 'Price/Rent',type: 'currency', required: false },
        { key: 'type',        label: 'Type',            type: 'select',   required: false, options: ['For Sale', 'For Rent', 'For Lease', 'Commercial'] },
        { key: 'bedrooms',    label: 'Bedrooms',        type: 'text',     required: false, placeholder: '2' },
        { key: 'size',        label: 'Size (sqm)',       type: 'text',     required: false },
        { key: 'location',    label: 'Location',        type: 'text',     required: false, placeholder: 'City Center' },
        { key: 'description', label: 'Description',     type: 'textarea', required: false, maxLength: 300 },
        { key: 'images',      label: 'Photos',          type: 'images',   required: false },
      ]),
      aboutSection({ title: 'About Our Agency' }),
      teamSection('Our Agents', 'Agent'),
      processSection('How We Work'),
      testimonialsSection({ title: 'Client Stories' }),
      contactSection(),
    ],
  },

  technology: {
    categoryKey: 'technology',
    sections: [
      heroSection(),
      servicesSection('Our Solutions'),
      processSection('How We Work'),
      pricingSection('Our Plans'),
      teamSection('Our Team', 'Developer'),
      gallerySection('Our Projects'),
      testimonialsSection({ title: 'Client Reviews' }),
      faqSection(),
      ctaSection({ defaultItems: [{ heading: 'Ready to build your digital future?', cta_text: 'Get a Free Quote', cta_link: '#contact' }] }),
      contactSection(),
    ],
  },

  creative: {
    categoryKey: 'creative',
    sections: [
      heroSection(),
      gallerySection('Our Portfolio'),
      servicesSection('What We Do'),
      pricingSection('Packages'),
      processSection('Our Process'),
      teamSection('The Creative Team', 'Designer'),
      testimonialsSection({ title: 'Client Feedback' }),
      contactSection(),
      socialSection(),
    ],
  },

  legal: {
    categoryKey: 'legal',
    sections: [
      heroSection(),
      servicesSection('Practice Areas'),
      teamSection('Our Attorneys', 'Attorney'),
      aboutSection({ title: 'About the Firm' }),
      processSection('How We Work'),
      testimonialsSection({ title: 'Client Testimonials' }),
      faqSection({ defaultItems: [
        { question: 'What is your consultation fee?', answer: 'Initial consultations are free. We will discuss our fees at the first meeting.' },
        { question: 'How long does a typical case take?', answer: 'It depends on the complexity. Simple cases can resolve in weeks; complex ones may take months.' },
      ]}),
      contactSection(),
    ],
  },

  finance: {
    categoryKey: 'finance',
    sections: [
      heroSection(),
      servicesSection('Our Financial Products'),
      aboutSection({ title: 'About Us' }),
      teamSection('Our Advisors', 'Advisor'),
      processSection('How to Apply'),
      testimonialsSection(),
      faqSection(),
      ctaSection(),
      contactSection(),
    ],
  },

  construction: {
    categoryKey: 'construction',
    sections: [
      heroSection(),
      gallerySection('Our Projects'),
      servicesSection('Our Services'),
      processSection('Our Process'),
      teamSection('Our Team', 'Engineer'),
      aboutSection({ title: 'About the Company' }),
      testimonialsSection({ title: 'Client Reviews' }),
      contactSection(),
    ],
  },

  automotive: {
    categoryKey: 'automotive',
    sections: [
      heroSection(),
      itemsSection('Our Vehicles', [
        { key: 'name',        label: 'Vehicle Name',    type: 'text',     required: true,  placeholder: 'Toyota Land Cruiser 200' },
        { key: 'year',        label: 'Year',            type: 'text',     required: false },
        { key: 'price',       label: 'Price',     type: 'currency', required: false },
        { key: 'type',        label: 'Type',            type: 'select',   required: false, options: ['For Sale', 'For Rent', 'New', 'Used'] },
        { key: 'mileage',     label: 'Mileage (km)',    type: 'text',     required: false },
        { key: 'description', label: 'Description',     type: 'textarea', required: false, maxLength: 200 },
        { key: 'images',      label: 'Photos',          type: 'images',   required: false },
      ]),
      servicesSection('Our Services'),
      gallerySection('Gallery'),
      hoursSection(),
      testimonialsSection(),
      contactSection(),
    ],
  },

  agriculture: {
    categoryKey: 'agriculture',
    sections: [
      heroSection(),
      itemsSection('Our Products', [
        { key: 'name',        label: 'Product Name',    type: 'text',     required: true,  placeholder: 'Yirgacheffe Grade 1 Coffee' },
        { key: 'price',       label: 'Price',           type: 'text',     required: false, placeholder: 'USD 8/kg' },
        { key: 'description', label: 'Description',     type: 'textarea', required: false, maxLength: 300 },
        { key: 'origin',      label: 'Origin/Region',   type: 'text',     required: false, placeholder: 'Yirgacheffe, Sidama' },
        { key: 'certifications', label: 'Certifications', type: 'text',  required: false, placeholder: 'Organic, Fair Trade' },
        { key: 'image',       label: 'Photo',           type: 'image',    required: false },
      ]),
      aboutSection({ title: 'About Our Farm' }),
      processSection('Our Process'),
      gallerySection('Farm Photos'),
      testimonialsSection({ title: 'Buyer Reviews' }),
      contactSection(),
    ],
  },

  manufacturing: {
    categoryKey: 'manufacturing',
    sections: [
      heroSection(),
      servicesSection('Our Products & Capabilities'),
      aboutSection({ title: 'About the Company' }),
      processSection('Our Manufacturing Process'),
      gallerySection('Factory & Products'),
      teamSection('Leadership Team', 'Executive'),
      testimonialsSection({ title: 'Partner Reviews' }),
      ctaSection({ defaultItems: [{ heading: 'Looking for a manufacturing partner?', cta_text: 'Request a Quote', cta_link: '#contact' }] }),
      contactSection(),
    ],
  },

  logistics: {
    categoryKey: 'logistics',
    sections: [
      heroSection(),
      servicesSection('Our Services'),
      processSection('How We Deliver'),
      aboutSection(),
      gallerySection('Our Fleet'),
      testimonialsSection(),
      faqSection({ defaultItems: [
        { question: 'What areas do you serve?', answer: 'We serve your city and surrounding regions. Contact us for specific coverage details.' },
        { question: 'How do I track my shipment?', answer: 'You can track your shipment in real-time by calling us or via our WhatsApp updates.' },
      ]}),
      contactSection(),
    ],
  },

  entertainment: {
    categoryKey: 'entertainment',
    sections: [
      heroSection(),
      gallerySection('Photos & Events'),
      servicesSection('What We Offer'),
      itemsSection('Upcoming Events', [
        { key: 'name',        label: 'Event Name',      type: 'text',     required: true },
        { key: 'date',        label: 'Date',            type: 'text',     required: true,  placeholder: 'Saturday, August 20, 2026' },
        { key: 'time',        label: 'Time',            type: 'text',     required: false, placeholder: '7:00 PM' },
        { key: 'price',       label: 'Ticket Price',    type: 'text',     required: false, placeholder: '20 / Free' },
        { key: 'description', label: 'Description',     type: 'textarea', required: false, maxLength: 200 },
        { key: 'image',       label: 'Event Photo',     type: 'image',    required: false },
      ]),
      teamSection('Our Team', 'Staff'),
      testimonialsSection({ title: 'What People Say' }),
      hoursSection(),
      contactSection(),
      socialSection(),
    ],
  },

  nonprofit: {
    categoryKey: 'nonprofit',
    sections: [
      heroSection({ subtitle: 'Making a difference together' }),
      aboutSection({ title: 'Our Mission' }),
      servicesSection('Our Programs'),
      teamSection('Our Team', 'Staff'),
      processSection('How We Work'),
      gallerySection('Our Impact'),
      testimonialsSection({ title: 'Stories of Change' }),
      ctaSection({ defaultItems: [{ heading: 'Join us in creating change', cta_text: 'Support Our Mission', cta_link: '#contact' }] }),
      faqSection(),
      contactSection(),
    ],
  },

  hospitality: {
    categoryKey: 'hospitality',
    sections: [
      heroSection(),
      itemsSection('Our Rooms & Accommodation', [
        { key: 'name',        label: 'Room Type',       type: 'text',     required: true,  placeholder: 'Deluxe Double Room' },
        { key: 'price',       label: 'Price per Night', type: 'currency', required: false },
        { key: 'capacity',    label: 'Capacity',        type: 'text',     required: false, placeholder: '2 Adults' },
        { key: 'amenities',   label: 'Amenities',       type: 'text',     required: false, placeholder: 'WiFi, AC, TV, Breakfast included' },
        { key: 'description', label: 'Description',     type: 'textarea', required: false, maxLength: 200 },
        { key: 'images',      label: 'Room Photos',     type: 'images',   required: false },
      ]),
      servicesSection('Hotel Amenities'),
      gallerySection('Hotel Photos'),
      aboutSection({ title: 'About the Hotel' }),
      testimonialsSection({ title: 'Guest Reviews' }),
      contactSection(),
    ],
  },

  ecommerce: {
    categoryKey: 'ecommerce',
    sections: [
      heroSection({ subtitle: 'Shop the best, delivered to you' }),
      itemsSection('Featured Products', [
        { key: 'name',        label: 'Product Name',    type: 'text',     required: true },
        { key: 'price',       label: 'Price',     type: 'currency', required: false },
        { key: 'description', label: 'Description',     type: 'textarea', required: false, maxLength: 200 },
        { key: 'image',       label: 'Product Photo',   type: 'image',    required: false },
        { key: 'link',        label: 'Buy Link (URL)',  type: 'url',      required: false },
        { key: 'badge',       label: 'Badge',           type: 'select',   required: false, options: ['New', 'Sale', 'Best Seller', 'Limited'] },
      ]),
      aboutSection(),
      testimonialsSection(),
      faqSection({ defaultItems: [
        { question: 'How do I order?', answer: 'Click any product, then contact us via WhatsApp or phone to place your order.' },
        { question: 'What payment methods do you accept?', answer: 'We accept major credit/debit cards, mobile payments, and bank transfers.' },
        { question: 'How long does delivery take?', answer: 'Same-day delivery within the city. 2–5 days for other regions.' },
      ]}),
      contactSection(),
      socialSection(),
    ],
  },
};

// ── Helper: get template for a category ──────────────────────────────────────
export function getTemplate(categoryKey: string): ShowroomTemplate {
  return SHOWROOM_TEMPLATES[categoryKey] ?? SHOWROOM_TEMPLATES['service'];
}

// ── Helper: get default sections JSON string for DB storage ──────────────────
export function getDefaultSections(categoryKey: string): string {
  const template = getTemplate(categoryKey);
  return JSON.stringify(
    template.sections.map(s => ({
      type: s.type,
      title: s.title,
      items: s.defaultItems ?? [],
    }))
  );
}

export default SHOWROOM_TEMPLATES;
