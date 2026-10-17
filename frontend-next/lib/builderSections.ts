/**
 * builderSections.ts
 * All 25 section types for the Showroom Web Builder.
 * Extracted from use.html and adapted for the React app.
 */

export interface RepeaterItemField {
  key: string;
  label: string;
  /** "product": pick one of the owner's catalogue products; Buy Now then sells it. */
  type: "text" | "textarea" | "product";
  placeholder?: string;
}

export interface BuilderField {
  key: string;
  label: string;
  type: "text" | "textarea" | "color" | "repeater";
  placeholder?: string;
  itemFields?: RepeaterItemField[];
}

export interface SectionType {
  key: string;
  label: string;
  icon: string; // lucide icon name
  tier: "freemium" | "premium" | "pro";
  tierLabel?: string;     // e.g. "Premium feature" — shown in locked state
  tierFeatures?: string[]; // bullet points shown in upgrade prompt
  fields: BuilderField[];
}

export const SECTION_TYPES: SectionType[] = [
  {
    key: "hero", label: "Hero Banner", icon: "Sparkles", tier: "freemium",
    fields: [
      { key: "title",    label: "Business Name",  type: "text",     placeholder: "Your Business Name" },
      { key: "subtitle", label: "Tagline",         type: "text",     placeholder: "A short powerful tagline" },
      { key: "cta",      label: "Button Text",     type: "text",     placeholder: "Contact Us" },
      { key: "heroBg",   label: "Gradient Start",  type: "color" },
      { key: "heroBg2",  label: "Gradient End",    type: "color" },
    ],
  },
  {
    key: "about", label: "About Us", icon: "Info", tier: "freemium",
    fields: [
      { key: "aboutTitle", label: "Section Title", type: "text",     placeholder: "About Us" },
      { key: "aboutDesc",  label: "Description",   type: "textarea", placeholder: "Tell your story..." },
      { key: "aboutImage", label: "Image URL",     type: "text",     placeholder: "https://..." },
    ],
  },
  {
    key: "items", label: "Products / Items", icon: "ShoppingBag", tier: "freemium",
    fields: [
      { key: "itemsTitle", label: "Section Title", type: "text", placeholder: "Our Products" },
      {
        key: "items", label: "Items", type: "repeater",
        itemFields: [
          { key: "name",  label: "Name",        type: "text",     placeholder: "Product name" },
          { key: "desc",  label: "Description", type: "text",     placeholder: "Brief description" },
          { key: "price", label: "Price",        type: "text",     placeholder: "29.99" },
          { key: "icon",  label: "Icon",         type: "text",     placeholder: "fa-box" },
          { key: "product_id", label: "Sell as product (optional)", type: "product" },
        ],
      },
    ],
  },
  {
    key: "gallery", label: "Gallery", icon: "Images", tier: "freemium",
    fields: [
      { key: "galleryTitle", label: "Section Title", type: "text", placeholder: "Gallery" },
      {
        key: "galleryImages", label: "Images", type: "repeater",
        itemFields: [
          { key: "url",     label: "Image URL", type: "text", placeholder: "https://..." },
          { key: "caption", label: "Caption",   type: "text", placeholder: "Photo caption" },
        ],
      },
    ],
  },
  {
    key: "services", label: "Services", icon: "Briefcase", tier: "freemium",
    fields: [
      { key: "servTitle", label: "Section Title", type: "text", placeholder: "Our Services" },
      {
        key: "services", label: "Services", type: "repeater",
        itemFields: [
          { key: "name", label: "Service Name",  type: "text",     placeholder: "Web Design" },
          { key: "desc", label: "Description",   type: "textarea", placeholder: "What we offer" },
          { key: "icon", label: "Icon (fa-)",    type: "text",     placeholder: "fa-cog" },
          { key: "price", label: "Price (optional)", type: "text",   placeholder: "From 500 ETB" },
          { key: "product_id", label: "Sell as product (optional)", type: "product" },
        ],
      },
    ],
  },
  {
    key: "testimonials", label: "Testimonials", icon: "MessageSquareQuote", tier: "freemium",
    fields: [
      { key: "testTitle", label: "Section Title", type: "text", placeholder: "What People Say" },
      {
        key: "testimonials", label: "Reviews", type: "repeater",
        itemFields: [
          { key: "quote",  label: "Quote",       type: "textarea", placeholder: "Amazing experience!" },
          { key: "author", label: "Author Name", type: "text",     placeholder: "Jane Doe" },
          { key: "role",   label: "Role/Title",  type: "text",     placeholder: "CEO, Company" },
        ],
      },
    ],
  },
  {
    key: "contact", label: "Contact", icon: "Mail", tier: "freemium",
    fields: [
      { key: "location", label: "Address",       type: "text", placeholder: "Your street address" },
      { key: "phone",    label: "Phone",         type: "text", placeholder: "+1 234 567 8900" },
      { key: "email",    label: "Email",         type: "text", placeholder: "hello@example.com" },
      { key: "hours",    label: "Working Hours", type: "text", placeholder: "Mon-Sat 9AM-6PM" },
      { key: "whatsapp", label: "WhatsApp No.",  type: "text", placeholder: "+12345678900" },
    ],
  },
  {
    key: "social", label: "Social Links", icon: "Share2", tier: "freemium",
    fields: [
      { key: "facebook",  label: "Facebook URL",  type: "text", placeholder: "https://facebook.com/..." },
      { key: "instagram", label: "Instagram URL", type: "text", placeholder: "https://instagram.com/..." },
      { key: "telegram",  label: "Telegram URL",  type: "text", placeholder: "https://t.me/..." },
      { key: "youtube",   label: "YouTube URL",   type: "text", placeholder: "https://youtube.com/..." },
      { key: "tiktok",    label: "TikTok URL",    type: "text", placeholder: "https://tiktok.com/@..." },
      { key: "twitter",   label: "Twitter/X URL", type: "text", placeholder: "https://x.com/..." },
      { key: "linkedin",  label: "LinkedIn URL",  type: "text", placeholder: "https://linkedin.com/in/..." },
    ],
  },
  {
    key: "pricing", label: "Pricing Plans", icon: "Tag", tier: "freemium",
    fields: [
      { key: "pricingTitle", label: "Section Title", type: "text", placeholder: "Pricing" },
      {
        key: "plans", label: "Plans", type: "repeater",
        itemFields: [
          { key: "name",     label: "Plan Name", type: "text", placeholder: "Basic" },
          { key: "price",    label: "Price",     type: "text", placeholder: "49.99" },
          { key: "period",   label: "Period",    type: "text", placeholder: "/mo" },
          { key: "features", label: "Features (comma separated)", type: "text", placeholder: "Feature 1, Feature 2" },
          { key: "product_id", label: "Sell as product (optional)", type: "product" },
        ],
      },
    ],
  },
  {
    key: "team", label: "Team Members", icon: "Users", tier: "freemium",
    fields: [
      { key: "teamTitle", label: "Section Title", type: "text", placeholder: "Our Team" },
      {
        key: "members", label: "Members", type: "repeater",
        itemFields: [
          { key: "name",  label: "Name",      type: "text",     placeholder: "Alex Rivera" },
          { key: "role",  label: "Role",      type: "text",     placeholder: "Lead Designer" },
          { key: "image", label: "Photo URL", type: "text",     placeholder: "https://..." },
          { key: "bio",   label: "Short Bio", type: "textarea", placeholder: "Brief description" },
        ],
      },
    ],
  },
  {
    key: "faq", label: "FAQ", icon: "HelpCircle", tier: "freemium",
    fields: [
      { key: "faqTitle", label: "Section Title", type: "text", placeholder: "Frequently Asked Questions" },
      {
        key: "faqs", label: "Questions", type: "repeater",
        itemFields: [
          { key: "question", label: "Question", type: "text",     placeholder: "How does it work?" },
          { key: "answer",   label: "Answer",   type: "textarea", placeholder: "Your answer here..." },
        ],
      },
    ],
  },
  {
    key: "features", label: "Key Features", icon: "Zap", tier: "freemium",
    fields: [
      { key: "featTitle", label: "Section Title", type: "text", placeholder: "Why Choose Us" },
      {
        key: "features", label: "Features", type: "repeater",
        itemFields: [
          { key: "name", label: "Feature",     type: "text", placeholder: "Lightning Fast" },
          { key: "desc", label: "Description", type: "text", placeholder: "Built for speed" },
          { key: "icon", label: "Icon (fa-)",  type: "text", placeholder: "fa-bolt" },
        ],
      },
    ],
  },
  {
    key: "stats", label: "Stats / Numbers", icon: "BarChart2", tier: "freemium",
    fields: [
      { key: "statsTitle", label: "Section Title", type: "text", placeholder: "By the Numbers" },
      {
        key: "stats", label: "Stats", type: "repeater",
        itemFields: [
          { key: "number", label: "Number",      type: "text", placeholder: "5,000+" },
          { key: "label",  label: "Label",       type: "text", placeholder: "Happy Customers" },
          { key: "icon",   label: "Icon (fa-)",  type: "text", placeholder: "fa-users" },
        ],
      },
    ],
  },
  {
    key: "portfolio", label: "Portfolio / Work", icon: "FolderOpen", tier: "premium",
    tierLabel: "Premium feature",
    tierFeatures: ["Showcase projects", "Client logos", "Project details"],
    fields: [
      { key: "portTitle", label: "Section Title", type: "text", placeholder: "Our Work" },
      {
        key: "portfolio", label: "Projects", type: "repeater",
        itemFields: [
          { key: "title",  label: "Project Title", type: "text",     placeholder: "Brand X" },
          { key: "desc",   label: "Description",   type: "textarea", placeholder: "What we did" },
          { key: "image",  label: "Image URL",     type: "text",     placeholder: "https://..." },
          { key: "client", label: "Client",        type: "text",     placeholder: "Client name" },
        ],
      },
    ],
  },
  {
    key: "newsletter", label: "Newsletter", icon: "Send", tier: "premium",
    tierLabel: "Premium feature",
    tierFeatures: ["Email capture", "Subscriber management", "Custom forms"],
    fields: [
      { key: "newsTitle", label: "Headline",     type: "text", placeholder: "Subscribe for Updates" },
      { key: "newsDesc",  label: "Description",  type: "text", placeholder: "Get the latest news" },
      { key: "newsBtn",   label: "Button Text",  type: "text", placeholder: "Subscribe" },
    ],
  },
  {
    key: "video", label: "Video", icon: "PlayCircle", tier: "premium",
    tierLabel: "Premium feature",
    tierFeatures: ["Video embedding", "Custom thumbnails", "Playback analytics"],
    fields: [
      { key: "vidTitle", label: "Section Title",   type: "text", placeholder: "Watch Our Story" },
      { key: "vidUrl",   label: "YouTube URL",     type: "text", placeholder: "https://youtu.be/..." },
      { key: "vidDesc",  label: "Caption",         type: "text", placeholder: "Video description" },
    ],
  },
  {
    key: "map", label: "Location Map", icon: "MapPin", tier: "premium",
    tierLabel: "Premium feature",
    tierFeatures: ["Google Maps embed", "Custom markers", "Directions link"],
    fields: [
      { key: "mapTitle", label: "Section Title",     type: "text", placeholder: "Find Us" },
      { key: "mapUrl",   label: "Google Maps Embed", type: "text", placeholder: "https://maps.google.com/embed?..." },
      { key: "address",  label: "Address Text",      type: "text", placeholder: "Your street address" },
    ],
  },
  {
    key: "cta", label: "Call to Action", icon: "Megaphone", tier: "premium",
    tierLabel: "Premium feature",
    tierFeatures: ["Conversion tracking", "A/B testing", "Custom styling"],
    fields: [
      { key: "ctaTitle", label: "Headline",     type: "text",  placeholder: "Ready to get started?" },
      { key: "ctaDesc",  label: "Description",  type: "text",  placeholder: "Contact us today" },
      { key: "ctaBtn",   label: "Button Text",  type: "text",  placeholder: "Contact Us" },
      { key: "ctaBg",    label: "Background",   type: "color" },
    ],
  },
  {
    key: "process", label: "How It Works", icon: "GitBranch", tier: "premium",
    tierLabel: "Premium feature",
    tierFeatures: ["Step-by-step flow", "Custom icons", "Progress tracking"],
    fields: [
      { key: "processTitle", label: "Section Title", type: "text", placeholder: "How It Works" },
      {
        key: "processSteps", label: "Steps", type: "repeater",
        itemFields: [
          { key: "title", label: "Step Title",   type: "text",     placeholder: "Step 1" },
          { key: "desc",  label: "Description",  type: "textarea", placeholder: "What happens here" },
          { key: "icon",  label: "Icon (fa-)",   type: "text",     placeholder: "fa-arrow-right" },
        ],
      },
    ],
  },
  {
    key: "booking", label: "Booking / Appointment", icon: "CalendarCheck", tier: "premium",
    tierLabel: "Premium feature",
    tierFeatures: ["Calendar integration", "Payment collection", "Reminders"],
    fields: [
      { key: "bookingTitle", label: "Section Title", type: "text",     placeholder: "Book an Appointment" },
      { key: "bookingDesc",  label: "Description",   type: "textarea", placeholder: "Schedule your session..." },
      { key: "bookingBtn",   label: "Button Text",   type: "text",     placeholder: "Book Now" },
    ],
  },
  {
    key: "caseStudies", label: "Case Studies", icon: "TrendingUp", tier: "pro",
    tierLabel: "Pro feature",
    tierFeatures: ["Detailed metrics", "Client quotes", "Visual storytelling"],
    fields: [
      { key: "caseTitle", label: "Section Title", type: "text", placeholder: "Success Stories" },
      {
        key: "caseStudies", label: "Case Studies", type: "repeater",
        itemFields: [
          { key: "title",   label: "Title",   type: "text",     placeholder: "Client success" },
          { key: "summary", label: "Summary", type: "textarea", placeholder: "What we achieved" },
          { key: "result",  label: "Result",  type: "text",     placeholder: "300% increase in sales" },
        ],
      },
    ],
  },
  {
    key: "partners", label: "Partners / Clients", icon: "Handshake", tier: "pro",
    tierLabel: "Pro feature",
    tierFeatures: ["Logo grid", "Partner categories", "Testimonials"],
    fields: [
      { key: "partnersTitle", label: "Section Title", type: "text", placeholder: "Our Partners" },
      {
        key: "partners", label: "Partners", type: "repeater",
        itemFields: [
          { key: "name", label: "Partner Name", type: "text", placeholder: "Company Name" },
          { key: "logo", label: "Logo URL",     type: "text", placeholder: "https://..." },
          { key: "note", label: "Note",         type: "text", placeholder: "Brief description" },
        ],
      },
    ],
  },
  {
    key: "awards", label: "Awards & Recognition", icon: "Award", tier: "pro",
    tierLabel: "Pro feature",
    tierFeatures: ["Award showcase", "Year filtering", "Category tags"],
    fields: [
      { key: "awardsTitle", label: "Section Title", type: "text", placeholder: "Awards & Recognition" },
      {
        key: "awards", label: "Awards", type: "repeater",
        itemFields: [
          { key: "title",  label: "Award Title", type: "text",     placeholder: "Best Business 2024" },
          { key: "detail", label: "Details",     type: "textarea", placeholder: "Award details" },
        ],
      },
    ],
  },
  {
    key: "industries", label: "Industries We Serve", icon: "Building2", tier: "pro",
    tierLabel: "Pro feature",
    tierFeatures: ["Industry filtering", "Case study links", "Expertise tags"],
    fields: [
      { key: "industriesTitle", label: "Section Title", type: "text", placeholder: "Industries We Serve" },
      {
        key: "industries", label: "Industries", type: "repeater",
        itemFields: [
          { key: "name", label: "Industry",    type: "text",     placeholder: "Healthcare" },
          { key: "desc", label: "Description", type: "textarea", placeholder: "How we help" },
        ],
      },
    ],
  },
  // ── Pro-only sections for Enterprise tier ───────────────────────────────────
  {
    key: "inventory_catalog",
    label: "Inventory Catalog",
    icon: "Package",
    tier: "pro",
    tierLabel: "Pro feature",
    tierFeatures: ["Live product sync", "Bulk CSV/JSON import", "Stock indicators"],
    fields: [
      { key: "catalogTitle", label: "Section Title", type: "text", placeholder: "Our Products" },
      { key: "showStock",    label: "Show stock levels", type: "text", placeholder: "true" },
    ],
  },
  {
    key: "live_location_tracking",
    label: "Live Location",
    icon: "Navigation",
    tier: "pro",
    tierLabel: "Pro feature",
    tierFeatures: ["Real-time GPS pin on showroom", "Visible to any visitor", "Socket.IO powered"],
    fields: [
      { key: "locationTitle", label: "Section Title", type: "text", placeholder: "Find us live" },
    ],
  },
  {
    key: "save_showroom",
    label: "Save / Bookmark Button",
    icon: "Bookmark",
    tier: "pro",
    tierLabel: "Pro feature",
    tierFeatures: [
      "Let visitors bookmark your showroom",
      "Appears on their Bookmarks page",
      "Drives repeat visits",
    ],
    fields: [
      { key: "saveTitle", label: "Section Title", type: "text", placeholder: "Save this showroom" },
      { key: "saveDesc",  label: "Description",   type: "text", placeholder: "Bookmark us and find us again easily" },
    ],
  },
];

// Default sections per category
export const CATEGORY_DEFAULT_SECTIONS: Record<string, string[]> = {
  "Business & Commerce":    ["hero", "items", "gallery", "testimonials", "contact", "social"],
  "Health & Medical":       ["hero", "services", "testimonials", "team", "contact"],
  "Food & Beverage":        ["hero", "items", "gallery", "testimonials", "contact", "social"],
  "Construction & Trade":   ["hero", "services", "portfolio", "testimonials", "contact"],
  "Transport & Logistics":  ["hero", "services", "pricing", "contact"],
  "Education":              ["hero", "services", "features", "testimonials", "contact"],
  "Professional Services":  ["hero", "services", "portfolio", "team", "testimonials", "contact"],
  "Agriculture & Farming":  ["hero", "items", "about", "contact"],
  "Hospitality & Tourism":  ["hero", "gallery", "services", "testimonials", "contact", "social"],
  "Beauty & Personal Care": ["hero", "services", "gallery", "pricing", "contact", "social"],
};

// Color presets [gradient start, end]
export const COLOR_PRESETS: [string, string][] = [
  ["#2563EB", "#7C3AED"],
  ["#1a1a2e", "#16213e"],
  ["#e74c3c", "#c0392b"],
  ["#2ecc71", "#27ae60"],
  ["#3498db", "#2980b9"],
  ["#9b59b6", "#8e44ad"],
  ["#1abc9c", "#16a085"],
  ["#e67e22", "#d35400"],
  ["#2c3e50", "#34495e"],
  ["#f39c12", "#e67e22"],
];

export function getSectionType(key: string): SectionType | undefined {
  return SECTION_TYPES.find(s => s.key === key);
}

// All 300 templates: 10 categories × 30 sub-templates
export const BUILDER_CATEGORY_META = [
  { cat: "Business & Commerce",   icon: "Store",      color: "#e74c3c" },
  { cat: "Health & Medical",      icon: "Heart",      color: "#27ae60" },
  { cat: "Food & Beverage",       icon: "UtensilsCrossed", color: "#f39c12" },
  { cat: "Construction & Trade",  icon: "HardHat",    color: "#8e44ad" },
  { cat: "Transport & Logistics", icon: "Truck",      color: "#2980b9" },
  { cat: "Education",             icon: "GraduationCap", color: "#1abc9c" },
  { cat: "Professional Services", icon: "Briefcase",  color: "#d4a017" },
  { cat: "Agriculture & Farming", icon: "Sprout",     color: "#2e7d32" },
  { cat: "Hospitality & Tourism", icon: "Hotel",      color: "#e91e63" },
  { cat: "Beauty & Personal Care",icon: "Sparkles",   color: "#ff6f91" },
];

export const BUILDER_TEMPLATES: Record<string, string[]> = {
  "Business & Commerce":    ["Fashion & Clothing Store","Electronics & Appliances","Pharmacy & Drugstore","Supermarket & Grocery","Real Estate Agency","Auto Parts & Garage","Wholesale Supplier","Import/Export","Furniture & Decor","Bookshop & Stationery","Hardware Store","Toys & Children","Sports Equipment","Jewelry Shop","Office Supplies","Pet Shop","Printing & Branding","Music Instruments","Gas Station","Cleaning Supplies","Textile & Fabric","Baby & Maternity","Thrift Store","Chemical Supplies","Cosmetics Store","Gift Shop","Camera Rental","Luggage Store","Religious Products","Car Care Products"],
  "Health & Medical":       ["Medical Clinic","Dental Clinic","Gym & Fitness","Spa & Wellness","Mental Health","Nutrition Coaching","Veterinary Clinic","Eye Care & Optical","Physiotherapy","Diagnostic Lab","Herbal Medicine","Home Healthcare","Blood Bank","Maternity Clinic","Oncology Center","Dermatology","Pediatric Clinic","Speech Therapy","Occupational Therapy","Chiropractic","Lab Supplies","Ambulance Service","Medical Waste","Safety Training","Fertility Clinic","Sleep Clinic","Podiatry","Addiction Treatment","Medical Tourism","Public Health"],
  "Food & Beverage":        ["Catering Business","Bakery & Pastry","Coffee Shop","Juice Bar","Food Delivery","Ethiopian Restaurant","Pizza & Italian","Chinese & Asian","Shisha Lounge","Ice Cream Shop","Meal Prep Service","Butcher Shop","Fish Market","Honey & Organic","Beverage Distributor","Snacks Brand","Tej & Traditional","Canteen Service","Cooking Classes","Spice Shop","Smoothie Bar","Coffee Export","Craft Brewery","Vegan Restaurant","Food Truck","Oil Distributor","Bottled Water","Ice Supply","Street Food Aggregator","Restaurant Supply"],
  "Construction & Trade":   ["Construction Company","Architect & Interior","Solar Energy","Cleaning Services","Security Services","Plumbing & Electrical","Real Estate Developer","Glass & Aluminum","Tile & Flooring","Paint Shop","Water & Sanitation","Metal Fabrication","Roofing Contractor","Generator Supply","Landscaping","Elevator Services","Pool Construction","Event Equipment","Prefab Buildings","Scaffolding","Demolition","Flooring Install","Insulation","Concrete Cutting","Surveying","Heavy Equipment","Fire Safety","Waterproofing","Waste Management","Building Inspection"],
  "Transport & Logistics":  ["Courier Service","Car Rental","Travel Agency","Moving Service","Taxi Service","Bajaj Service","Vehicle Import","Auto Body Repair","Tire Shop","Car Wash","License Assistance","Roadside Help","Vehicle Tracking","Boat Transport","Air Cargo","Bicycle Shop","Truck Stop","Fuel Transport","Livestock Transport","Refrigerated Transport","Motorcycle Parts","Car Battery","Vehicle Leasing","Auto Glass","Container Sales","Port Handling","Courier Franchise","School Bus","Tour Charter","Airport Shuttle"],
  "Education":              ["Driving School","Language School","Kindergarten","Exam Prep","Vocational Training","Music School","Art School","Sports Academy","Test Prep Center","Online Learning","Adult Literacy","Special Needs","Religious School","Study Abroad","Scholarship Info","Entrepreneurship","Public Speaking","Summer Camp","School Supply","Educational Toys","Teacher Training","Parenting Workshop","STEM Robotics","Agri Training","Nursing School","Aviation Training","Hospitality Training","Computer Training","Photography Class","Culinary School"],
  "Professional Services":  ["Law Firm","Accounting & Tax","Marketing Agency","Printing & Design","HR & Recruitment","IT Support","Architecture Firm","Engineering","Business Registration","IP Lawyer","Patent Agent","Immigration","Notary Public","Financial Advisor","Insurance","Real Estate Appraisal","Quantity Surveyor","Environmental","Translation","Virtual Assistant","Call Center","Mailing Service","Event Management","Wedding Planner","Funeral Services","Security Consulting","Graphic Design","Web Development","Data Entry","Voice Over"],
  "Agriculture & Farming":  ["Farm Producer","Agri Supplies","Veterinary Services","Coffee Farm","Flower Export","Spice Farm","Fruit Orchard","Vegetable Farm","Poultry Farm","Fish Farm","Goat & Sheep","Cattle Ranch","Beekeeping","Teff Farming","Oilseed Farming","Cereal Farming","Horticulture","Agro-Processing","Organic Certification","Farm Machinery","Irrigation","Soil Testing","Seed Multiplication","Agrochemical","Farm Software","Cooperative","Feed Mill","Vet Pharmacy","Dairy Processing","Extension Services"],
  "Hospitality & Tourism":  ["Hotel & Guesthouse","Wedding Venue","Tour Operator","Resort & Spa","Eco-Lodge","Bed & Breakfast","Hostel","Campground","Hotel Restaurant","Tourist Info","Tourist Car Rental","Cultural Guide","Bird Watching","Historical Tour","Coffee Tour","Safari Lodge","Balloon Tour","Horse Riding","Bike Tour","Photo Tour","Souvenir Shop","Travel Insurance","Visa Service","Airport Greet","Lake Cruise","Rafting","Helicopter Tour","Desert Camp","Mountain Climb","Pilgrimage Tour"],
  "Beauty & Personal Care": ["Hair Salon","Nail Studio","Bridal Services","Men's Grooming","Skin Care","Waxing Salon","Massage Therapy","Aromatherapy","Henna Art","Permanent Makeup","Lash Extensions","Barber Supply","Beauty School","Fitness Wear","Herbal Beauty","Hair Extensions","Wig Shop","Cosmetic Dentistry","Weight Loss","Tattoo Studio","Men's Salon","Personal Stylist","Image Consultant","Perfume Shop","Natural Soap","Beauty Box","Makeup Agency","Beauty Equipment","Reflexology","Body Sculpting"],
};
