/**
 * Showroom template library — 9 categories × 3-4 named templates each.
 * Each template has: id, name, desc, accent_color, preview_color (gradient), sections[]
 */

export interface ShowroomTemplate {
  id: string;
  name: string;
  desc: string;
  accent_color: string;
  preview_gradient: string;
  sections: Record<string, unknown>[];
}

export interface ShowroomCategory {
  value: string;
  label: string;
  subtitle: string;
  icon: string; // emoji
  templates: ShowroomTemplate[];
}

// ── BUSINESS & COMMERCE ──────────────────────────────────────────────────────
const BUSINESS_TEMPLATES: ShowroomTemplate[] = [
  {
    id: "biz_shop",
    name: "Online Shop",
    desc: "Product catalogue with cart, featured items and contact",
    accent_color: "#F97316",
    preview_gradient: "from-orange-400 to-amber-500",
    sections: [
      { type: "hero", title: "Welcome to Our Shop", subtitle: "Quality products, great prices", cta: "Shop Now" },
      { type: "featured_products", title: "Featured Products" },
      { type: "products", title: "All Products" },
      { type: "about", title: "About Us", content: "We are a trusted local shop serving Addis Ababa." },
      { type: "testimonials", title: "Customer Reviews", items: [{ name: "Happy Customer", text: "Great products and fast delivery!" }] },
      { type: "contact", title: "Contact Us" },
    ],
  },
  {
    id: "biz_restaurant",
    name: "Restaurant & Café",
    desc: "Menu, gallery, opening hours and reservations",
    accent_color: "#EF4444",
    preview_gradient: "from-red-500 to-orange-400",
    sections: [
      { type: "hero", title: "Welcome to Our Restaurant", subtitle: "Authentic Ethiopian cuisine", cta: "View Menu" },
      { type: "services", title: "Our Menu", items: [
        { name: "Breakfast", description: "Traditional Ethiopian breakfast", price: "From 80 ETB" },
        { name: "Lunch Special", description: "Daily lunch combo", price: "From 150 ETB" },
        { name: "Dinner", description: "Full dinner experience", price: "From 200 ETB" },
      ]},
      { type: "gallery", title: "Our Food" },
      { type: "hours", title: "Opening Hours" },
      { type: "contact", title: "Reserve a Table" },
    ],
  },
  {
    id: "biz_service",
    name: "Service Business",
    desc: "Services, pricing, team and booking form",
    accent_color: "#3B82F6",
    preview_gradient: "from-blue-500 to-cyan-400",
    sections: [
      { type: "hero", title: "Professional Services", subtitle: "Trusted by hundreds of clients", cta: "Get a Quote" },
      { type: "services", title: "What We Offer", items: [
        { name: "Basic Package", description: "Essential service", price: "From 500 ETB" },
        { name: "Standard Package", description: "Full service", price: "From 1,500 ETB" },
        { name: "Premium Package", description: "All-inclusive", price: "From 3,000 ETB" },
      ]},
      { type: "features", title: "Why Choose Us", items: [
        { title: "Experienced Team", desc: "5+ years in the industry" },
        { title: "Fast Delivery", desc: "On-time, every time" },
        { title: "Satisfaction Guaranteed", desc: "Or your money back" },
      ]},
      { type: "testimonials", title: "Client Reviews", items: [{ name: "Bekele A.", text: "Best service in Addis Ababa!" }] },
      { type: "contact", title: "Book Now" },
    ],
  },
  {
    id: "biz_salon",
    name: "Salon & Beauty",
    desc: "Services menu, gallery, booking and pricing",
    accent_color: "#EC4899",
    preview_gradient: "from-pink-500 to-rose-400",
    sections: [
      { type: "hero", title: "Beauty & Style Studio", subtitle: "Look and feel your best", cta: "Book Appointment" },
      { type: "services", title: "Our Services", items: [
        { name: "Haircut & Style", description: "Professional cuts and styling", price: "From 200 ETB" },
        { name: "Hair Treatment", description: "Nourishing hair treatments", price: "From 500 ETB" },
        { name: "Makeup & Bridal", description: "Special occasion looks", price: "From 800 ETB" },
      ]},
      { type: "gallery", title: "Our Work" },
      { type: "hours", title: "Working Hours" },
      { type: "contact", title: "Book Your Session" },
    ],
  },
];

// ── CREATIVE & PORTFOLIO ─────────────────────────────────────────────────────
const CREATIVE_TEMPLATES: ShowroomTemplate[] = [
  {
    id: "cre_designer",
    name: "Designer Portfolio",
    desc: "Gallery, services, case studies and contact",
    accent_color: "#8B5CF6",
    preview_gradient: "from-violet-500 to-purple-400",
    sections: [
      { type: "hero", title: "Creative Design Studio", subtitle: "Turning ideas into visual stories", cta: "View Portfolio" },
      { type: "gallery", title: "Portfolio" },
      { type: "about", title: "About Me", content: "Passionate designer with years of experience." },
      { type: "services", title: "Services", items: [
        { name: "Brand Identity", description: "Logo, colors, typography", price: "From 3,000 ETB" },
        { name: "Web Design", description: "Custom website designs", price: "From 5,000 ETB" },
        { name: "Print Design", description: "Flyers, brochures, banners", price: "From 500 ETB" },
      ]},
      { type: "contact", title: "Let's Create Together" },
    ],
  },
  {
    id: "cre_photographer",
    name: "Photography Studio",
    desc: "Photo gallery, packages and booking",
    accent_color: "#06B6D4",
    preview_gradient: "from-cyan-500 to-sky-400",
    sections: [
      { type: "hero", title: "Photography Studio", subtitle: "Capturing life's precious moments", cta: "View Gallery" },
      { type: "gallery", title: "Portfolio" },
      { type: "services", title: "Photography Packages", items: [
        { name: "Portrait Session", description: "1hr individual or couple shoot", price: "From 1,500 ETB" },
        { name: "Event Coverage", description: "Full event photography", price: "From 5,000 ETB" },
        { name: "Commercial", description: "Product and brand photography", price: "From 3,000 ETB" },
      ]},
      { type: "testimonials", title: "Client Feedback", items: [{ name: "Sara L.", text: "Beautiful photos, professional service!" }] },
      { type: "contact", title: "Book a Session" },
    ],
  },
  {
    id: "cre_artist",
    name: "Artist Showcase",
    desc: "Art gallery, commissions and story",
    accent_color: "#F59E0B",
    preview_gradient: "from-amber-400 to-yellow-300",
    sections: [
      { type: "hero", title: "Art Gallery", subtitle: "Original works and commissions", cta: "Explore Art" },
      { type: "gallery", title: "Gallery" },
      { type: "about", title: "Artist Statement", content: "My art is inspired by Ethiopian culture and heritage." },
      { type: "products", title: "Available Works" },
      { type: "contact", title: "Commission a Piece" },
    ],
  },
];

// ── EDUCATION & COACHING ────────────────────────────────────────────────────
const EDUCATION_TEMPLATES: ShowroomTemplate[] = [
  {
    id: "edu_academy",
    name: "Learning Academy",
    desc: "Courses, instructors, testimonials and enrollment",
    accent_color: "#10B981",
    preview_gradient: "from-emerald-500 to-green-400",
    sections: [
      { type: "hero", title: "Learn & Grow", subtitle: "Expert-led courses for real results", cta: "Browse Courses" },
      { type: "features", title: "Why Learn With Us", items: [
        { title: "Expert Instructors", desc: "Industry professionals" },
        { title: "Flexible Schedule", desc: "Learn at your own pace" },
        { title: "Certificate", desc: "Get certified upon completion" },
      ]},
      { type: "services", title: "Our Courses", items: [
        { name: "Beginner Course", description: "Foundation skills", price: "From 500 ETB" },
        { name: "Intermediate", description: "Build on basics", price: "From 1,000 ETB" },
        { name: "Advanced", description: "Master the subject", price: "From 2,000 ETB" },
      ]},
      { type: "testimonials", title: "Student Stories", items: [{ name: "Student", text: "Changed my career!" }] },
      { type: "contact", title: "Enroll Today" },
    ],
  },
  {
    id: "edu_tutor",
    name: "Private Tutor",
    desc: "Subjects, schedule, rates and booking",
    accent_color: "#3B82F6",
    preview_gradient: "from-blue-500 to-indigo-400",
    sections: [
      { type: "hero", title: "Private Tutoring", subtitle: "Personalized learning for every student", cta: "Book a Session" },
      { type: "about", title: "About Your Tutor", content: "Experienced educator passionate about student success." },
      { type: "services", title: "Subjects", items: [
        { name: "Mathematics", description: "Grades 7-12 & University", price: "300 ETB/hr" },
        { name: "English", description: "All levels", price: "250 ETB/hr" },
        { name: "Science", description: "Physics, Chemistry, Biology", price: "300 ETB/hr" },
      ]},
      { type: "hours", title: "Available Times" },
      { type: "contact", title: "Schedule a Session" },
    ],
  },
  {
    id: "edu_coach",
    name: "Life & Business Coach",
    desc: "Programs, transformation stories and consultation",
    accent_color: "#F97316",
    preview_gradient: "from-orange-500 to-amber-400",
    sections: [
      { type: "hero", title: "Transform Your Life", subtitle: "Coaching that creates real change", cta: "Start Your Journey" },
      { type: "about", title: "My Approach", content: "Helping individuals and businesses unlock their full potential." },
      { type: "services", title: "Coaching Programs", items: [
        { name: "Discovery Session", description: "60-minute intro session", price: "500 ETB" },
        { name: "Monthly Coaching", description: "4 sessions per month", price: "3,000 ETB/month" },
        { name: "Business Growth", description: "90-day business acceleration", price: "15,000 ETB" },
      ]},
      { type: "testimonials", title: "Transformation Stories", items: [{ name: "Client", text: "Completely changed my mindset!" }] },
      { type: "contact", title: "Book a Free Consultation" },
    ],
  },
];

// ── EVENTS & BOOKING ─────────────────────────────────────────────────────────
const EVENTS_TEMPLATES: ShowroomTemplate[] = [
  {
    id: "evt_wedding",
    name: "Wedding Planner",
    desc: "Packages, gallery, reviews and consultation booking",
    accent_color: "#F43F5E",
    preview_gradient: "from-rose-400 to-pink-300",
    sections: [
      { type: "hero", title: "Your Perfect Wedding", subtitle: "Creating unforgettable moments", cta: "Plan Your Day" },
      { type: "gallery", title: "Our Events" },
      { type: "services", title: "Wedding Packages", items: [
        { name: "Essential", description: "Intimate ceremony", price: "From 25,000 ETB" },
        { name: "Premium", description: "Full wedding experience", price: "From 60,000 ETB" },
        { name: "Luxury", description: "All-inclusive luxury", price: "From 150,000 ETB" },
      ]},
      { type: "testimonials", title: "Happy Couples", items: [{ name: "Meron & Yonas", text: "They made our dream wedding come true!" }] },
      { type: "contact", title: "Book a Consultation" },
    ],
  },
  {
    id: "evt_workshop",
    name: "Workshop & Training",
    desc: "Upcoming events, registration and agenda",
    accent_color: "#8B5CF6",
    preview_gradient: "from-violet-500 to-indigo-400",
    sections: [
      { type: "hero", title: "Workshops & Training", subtitle: "Skill-building sessions for professionals", cta: "Register Now" },
      { type: "services", title: "Upcoming Workshops", items: [
        { name: "Business Workshop", description: "2-day intensive", price: "2,000 ETB" },
        { name: "Tech Training", description: "Full-day coding session", price: "1,500 ETB" },
      ]},
      { type: "features", title: "What You'll Get", items: [
        { title: "Expert Facilitators", desc: "Industry professionals" },
        { title: "Certificate", desc: "Recognized certification" },
        { title: "Networking", desc: "Connect with peers" },
      ]},
      { type: "contact", title: "Register Your Spot" },
    ],
  },
  {
    id: "evt_venue",
    name: "Venue & Halls",
    desc: "Venue photos, capacity, packages and booking",
    accent_color: "#D97706",
    preview_gradient: "from-amber-500 to-yellow-400",
    sections: [
      { type: "hero", title: "Premier Event Venue", subtitle: "The perfect setting for every occasion", cta: "Check Availability" },
      { type: "gallery", title: "Venue Gallery" },
      { type: "features", title: "Venue Features", items: [
        { title: "Capacity 500+", desc: "Large and small halls" },
        { title: "Full Catering", desc: "In-house catering team" },
        { title: "AV Equipment", desc: "State-of-the-art tech" },
      ]},
      { type: "services", title: "Packages", items: [
        { name: "Half Day", description: "4-hour rental", price: "From 8,000 ETB" },
        { name: "Full Day", description: "8-hour rental", price: "From 15,000 ETB" },
        { name: "Weekend Package", description: "2-day event", price: "From 25,000 ETB" },
      ]},
      { type: "contact", title: "Request a Quote" },
    ],
  },
];

// ── NONPROFIT & IMPACT ───────────────────────────────────────────────────────
const NONPROFIT_TEMPLATES: ShowroomTemplate[] = [
  {
    id: "npo_charity",
    name: "Charity Organization",
    desc: "Mission, impact stats, programs and donation",
    accent_color: "#EF4444",
    preview_gradient: "from-red-400 to-rose-300",
    sections: [
      { type: "hero", title: "Making a Difference", subtitle: "Every contribution changes lives", cta: "Donate Now" },
      { type: "about", title: "Our Mission", content: "We work to improve lives in underserved communities across Ethiopia." },
      { type: "features", title: "Our Impact", items: [
        { title: "5,000+ Lives", desc: "Directly impacted" },
        { title: "20 Communities", desc: "Across Ethiopia" },
        { title: "100% Transparent", desc: "Open financial reports" },
      ]},
      { type: "services", title: "Programs", items: [
        { name: "Education", description: "School supplies and scholarships" },
        { name: "Healthcare", description: "Free medical clinics" },
        { name: "Livelihoods", description: "Skills training" },
      ]},
      { type: "contact", title: "Get Involved" },
    ],
  },
  {
    id: "npo_community",
    name: "Community Project",
    desc: "Local initiative, volunteers and events",
    accent_color: "#10B981",
    preview_gradient: "from-emerald-500 to-teal-400",
    sections: [
      { type: "hero", title: "Building Community", subtitle: "Together we are stronger", cta: "Join Us" },
      { type: "about", title: "About Our Project", content: "A grassroots initiative to improve our neighborhood." },
      { type: "services", title: "Activities", items: [
        { name: "Clean-up Days", description: "Monthly neighborhood clean-up" },
        { name: "Youth Programs", description: "After-school activities" },
        { name: "Community Garden", description: "Urban farming project" },
      ]},
      { type: "contact", title: "Volunteer With Us" },
    ],
  },
];

// ── PERSONAL & LIFESTYLE ─────────────────────────────────────────────────────
const PERSONAL_TEMPLATES: ShowroomTemplate[] = [
  {
    id: "per_blog",
    name: "Personal Blog",
    desc: "About, latest posts, interests and contact",
    accent_color: "#06B6D4",
    preview_gradient: "from-cyan-500 to-sky-400",
    sections: [
      { type: "hero", title: "My Blog", subtitle: "Stories, thoughts and experiences", cta: "Read My Stories" },
      { type: "about", title: "About Me", content: "Writer, explorer, and lifelong learner based in Addis Ababa." },
      { type: "gallery", title: "Recent Photos" },
      { type: "contact", title: "Say Hello" },
    ],
  },
  {
    id: "per_travel",
    name: "Travel & Adventure",
    desc: "Travel stories, photo journal and tips",
    accent_color: "#3B82F6",
    preview_gradient: "from-blue-500 to-cyan-400",
    sections: [
      { type: "hero", title: "Travel Diaries", subtitle: "Exploring Ethiopia and beyond", cta: "Start Exploring" },
      { type: "gallery", title: "Travel Gallery" },
      { type: "about", title: "About the Traveler", content: "" },
      { type: "services", title: "Travel Guides", items: [{ name: "Addis Ababa Guide", description: "Top spots and hidden gems" }] },
      { type: "contact", title: "Connect" },
    ],
  },
  {
    id: "per_cv",
    name: "Professional CV",
    desc: "Skills, experience, education and portfolio",
    accent_color: "#1E293B",
    preview_gradient: "from-slate-700 to-slate-500",
    sections: [
      { type: "hero", title: "Professional Profile", subtitle: "Available for new opportunities", cta: "Download CV" },
      { type: "about", title: "About Me", content: "" },
      { type: "features", title: "Core Skills", items: [
        { title: "Communication", desc: "Fluent in English and Amharic" },
        { title: "Problem Solving", desc: "Analytical and creative thinker" },
      ]},
      { type: "services", title: "Experience", items: [{ name: "Current Role", description: "Company · 2022–Present" }] },
      { type: "contact", title: "Get in Touch" },
    ],
  },
];

// ── MEDIA & CREATORS ─────────────────────────────────────────────────────────
const MEDIA_TEMPLATES: ShowroomTemplate[] = [
  {
    id: "med_youtube",
    name: "YouTube Creator",
    desc: "Channel, videos, merchandise and subscribe CTA",
    accent_color: "#EF4444",
    preview_gradient: "from-red-500 to-red-400",
    sections: [
      { type: "hero", title: "My Channel", subtitle: "Subscribe for weekly videos", cta: "Subscribe Now" },
      { type: "gallery", title: "Latest Videos" },
      { type: "about", title: "About the Channel", content: "" },
      { type: "products", title: "Merchandise" },
      { type: "contact", title: "Collaborations & Inquiries" },
    ],
  },
  {
    id: "med_podcast",
    name: "Podcast Show",
    desc: "Episodes, hosts, platforms and subscribe",
    accent_color: "#7C3AED",
    preview_gradient: "from-purple-600 to-violet-400",
    sections: [
      { type: "hero", title: "The Podcast", subtitle: "Real conversations, real insights", cta: "Listen Now" },
      { type: "about", title: "About the Show", content: "" },
      { type: "services", title: "Recent Episodes", items: [
        { name: "Episode 1", description: "Starting the journey" },
        { name: "Episode 2", description: "Growing your business" },
      ]},
      { type: "contact", title: "Sponsor or Guest" },
    ],
  },
  {
    id: "med_writer",
    name: "Writer & Author",
    desc: "Books, articles, newsletter and reading list",
    accent_color: "#78350F",
    preview_gradient: "from-amber-800 to-amber-600",
    sections: [
      { type: "hero", title: "Author & Writer", subtitle: "Words that inspire and inform", cta: "Read My Work" },
      { type: "about", title: "About the Author", content: "" },
      { type: "products", title: "Published Books" },
      { type: "gallery", title: "Featured Articles" },
      { type: "contact", title: "Speaking & Collaboration" },
    ],
  },
];

// ── STARTUP & SAAS ───────────────────────────────────────────────────────────
const STARTUP_TEMPLATES: ShowroomTemplate[] = [
  {
    id: "sta_landing",
    name: "Product Launch",
    desc: "Hero, features, pricing and waitlist signup",
    accent_color: "#6366F1",
    preview_gradient: "from-indigo-500 to-violet-400",
    sections: [
      { type: "hero", title: "Introducing Our Product", subtitle: "Built for the African market", cta: "Join Waitlist" },
      { type: "features", title: "Key Features", items: [
        { title: "Fast", desc: "Optimized for low bandwidth" },
        { title: "Local Payment", desc: "Telebirr and bank integration" },
        { title: "Mobile First", desc: "Works on any smartphone" },
      ]},
      { type: "services", title: "Pricing", items: [
        { name: "Free", description: "For individuals", price: "0 ETB" },
        { name: "Pro", description: "For small teams", price: "500 ETB/mo" },
        { name: "Business", description: "For enterprises", price: "2,000 ETB/mo" },
      ]},
      { type: "contact", title: "Request Early Access" },
    ],
  },
  {
    id: "sta_agency",
    name: "Tech Agency",
    desc: "Services, portfolio, team and project inquiry",
    accent_color: "#0EA5E9",
    preview_gradient: "from-sky-500 to-blue-400",
    sections: [
      { type: "hero", title: "We Build Digital Products", subtitle: "From idea to launch in record time", cta: "Start a Project" },
      { type: "services", title: "Services", items: [
        { name: "Web Development", description: "Custom websites and apps", price: "From 15,000 ETB" },
        { name: "Mobile Apps", description: "iOS and Android", price: "From 30,000 ETB" },
        { name: "UI/UX Design", description: "Beautiful, usable interfaces", price: "From 8,000 ETB" },
      ]},
      { type: "features", title: "Our Process", items: [
        { title: "Discover", desc: "We learn your goals" },
        { title: "Design", desc: "We prototype solutions" },
        { title: "Deliver", desc: "We ship and support" },
      ]},
      { type: "contact", title: "Get a Free Quote" },
    ],
  },
  {
    id: "sta_saas",
    name: "SaaS Product",
    desc: "App features, how it works, pricing and demo",
    accent_color: "#10B981",
    preview_gradient: "from-emerald-500 to-green-400",
    sections: [
      { type: "hero", title: "The Smart Business Tool", subtitle: "Automate and grow your business", cta: "Try for Free" },
      { type: "features", title: "Features", items: [
        { title: "Automation", desc: "Automate repetitive tasks" },
        { title: "Analytics", desc: "Real-time business insights" },
        { title: "Integrations", desc: "Works with your tools" },
      ]},
      { type: "services", title: "Plans", items: [
        { name: "Starter", description: "1 user, basic features", price: "Free" },
        { name: "Growth", description: "Up to 5 users", price: "999 ETB/mo" },
        { name: "Scale", description: "Unlimited users", price: "2,999 ETB/mo" },
      ]},
      { type: "contact", title: "Book a Demo" },
    ],
  },
];

// ── SOCIAL / COMMUNITY ───────────────────────────────────────────────────────
const COMMUNITY_TEMPLATES: ShowroomTemplate[] = [
  {
    id: "com_club",
    name: "Club & Association",
    desc: "About, membership, events and join form",
    accent_color: "#D97706",
    preview_gradient: "from-amber-500 to-yellow-400",
    sections: [
      { type: "hero", title: "Join Our Club", subtitle: "Connect, learn and grow together", cta: "Become a Member" },
      { type: "about", title: "Who We Are", content: "" },
      { type: "services", title: "Membership Plans", items: [
        { name: "Free Member", description: "Basic access" },
        { name: "Full Member", description: "All benefits", price: "200 ETB/mo" },
      ]},
      { type: "services", title: "Upcoming Events", items: [{ name: "Monthly Meetup", description: "Every last Saturday" }] },
      { type: "contact", title: "Join Us" },
    ],
  },
  {
    id: "com_fanpage",
    name: "Fan Page",
    desc: "Content, updates, gallery and engagement",
    accent_color: "#EC4899",
    preview_gradient: "from-pink-500 to-fuchsia-400",
    sections: [
      { type: "hero", title: "Welcome Fans!", subtitle: "Your official fan community", cta: "Join Community" },
      { type: "gallery", title: "Latest Updates" },
      { type: "about", title: "About This Page", content: "" },
      { type: "contact", title: "Send a Message" },
    ],
  },
  {
    id: "com_forum",
    name: "Discussion Forum",
    desc: "Topics, community rules, membership and discussions",
    accent_color: "#6366F1",
    preview_gradient: "from-indigo-500 to-blue-400",
    sections: [
      { type: "hero", title: "Community Forum", subtitle: "Share, learn, and connect", cta: "Join Discussion" },
      { type: "about", title: "Community Guidelines", content: "Be respectful, be helpful, be awesome." },
      { type: "features", title: "Topics We Cover", items: [
        { title: "Technology", desc: "Tech news and tutorials" },
        { title: "Business", desc: "Entrepreneurship tips" },
        { title: "Lifestyle", desc: "Culture and community" },
      ]},
      { type: "contact", title: "Get in Touch" },
    ],
  },
];

// ── Master category registry ─────────────────────────────────────────────────
export const SHOWROOM_CATEGORIES: ShowroomCategory[] = [
  { value: "business",   label: "Business & Commerce",  subtitle: "E-commerce, services, restaurants", icon: "🏪", templates: BUSINESS_TEMPLATES },
  { value: "creative",   label: "Creative & Portfolio", subtitle: "Designers, photographers, artists",  icon: "🎨", templates: CREATIVE_TEMPLATES },
  { value: "education",  label: "Education & Coaching", subtitle: "Courses, tutors, training",          icon: "🎓", templates: EDUCATION_TEMPLATES },
  { value: "events",     label: "Events & Booking",     subtitle: "Weddings, appointments, workshops",  icon: "📅", templates: EVENTS_TEMPLATES },
  { value: "nonprofit",  label: "Nonprofit & Impact",   subtitle: "Charity, community projects",        icon: "❤️", templates: NONPROFIT_TEMPLATES },
  { value: "personal",   label: "Personal & Lifestyle", subtitle: "Blogs, travel, family",              icon: "👤", templates: PERSONAL_TEMPLATES },
  { value: "media",      label: "Media & Creators",     subtitle: "YouTubers, podcasts, writers",       icon: "📺", templates: MEDIA_TEMPLATES },
  { value: "startup",    label: "Startup & SaaS",       subtitle: "Landing pages, waitlists",           icon: "🚀", templates: STARTUP_TEMPLATES },
  { value: "community",  label: "Social / Community",   subtitle: "Forums, fan pages, clubs",           icon: "👥", templates: COMMUNITY_TEMPLATES },
];

export function getCategoryByValue(value: string): ShowroomCategory | undefined {
  return SHOWROOM_CATEGORIES.find(c => c.value === value);
}

export function getTemplateById(templateId: string): ShowroomTemplate | undefined {
  for (const cat of SHOWROOM_CATEGORIES) {
    const t = cat.templates.find(t => t.id === templateId);
    if (t) return t;
  }
  return undefined;
}

export function getShowroomSections(category: string, title = '', description = ''): string {
  const cat = getCategoryByValue(category);
  const base = cat?.templates[0]?.sections ?? BUSINESS_TEMPLATES[0].sections;
  return JSON.stringify(base.map((s: any) => {
    const copy = { ...s };
    if (copy.type === 'hero' && title) { copy.title = title; if (description) copy.subtitle = description; }
    if (copy.type === 'about' && description) copy.content = description;
    return copy;
  }));
}

// Legacy compat
export const SHOWROOM_SECTIONS_BY_CATEGORY = Object.fromEntries(
  SHOWROOM_CATEGORIES.map(c => [c.value, c.templates[0].sections])
);
