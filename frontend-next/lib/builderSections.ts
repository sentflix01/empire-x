/**
 * builderSections.ts
 * The Showroom Studio section catalogue: what each section is called, which
 * plan it needs, and the fields its form shows. Owners are everyday social
 * media users, so fields are things they already do: write, add a photo,
 * paste a link, switch something on. No colour codes, icon codes or embeds.
 *
 * Field and section keys are stored in published sites: rename labels freely,
 * never keys. A field the form no longer shows becomes "hidden" so saved
 * values are kept (see serializeShowroomSections).
 */

export interface RepeaterItemField {
  key: string;
  label: string;
  /** "product": pick one of the owner's catalogue products; Buy Now then sells it. "image": Add photo. */
  type: "text" | "textarea" | "product" | "image";
  placeholder?: string;
}

export interface BuilderField {
  key: string;
  label: string;
  /**
   * "image": Add photo (uploaded); "toggle": on/off switch; "hidden": kept but not shown (set elsewhere, e.g. Style);
   * "date": a day picker; "hours": the weekly opening-hours picker.
   */
  type: "text" | "textarea" | "color" | "repeater" | "image" | "toggle" | "hidden" | "date" | "hours";
  placeholder?: string;
  /** One line under the field explaining it in plain words. */
  hint?: string;
  itemFields?: RepeaterItemField[];
}

export interface SectionType {
  key: string;
  label: string;
  icon: string; // lucide icon name
  tier: "freemium" | "premium" | "pro";
  /** One plain sentence: what this section does on the website. */
  purpose?: string;
  tierLabel?: string;     // e.g. "Premium feature" — shown in locked state
  tierFeatures?: string[]; // bullet points shown in upgrade prompt
  fields: BuilderField[];
}

const TITLE = (placeholder: string): BuilderField => ({ key: "", label: "Section heading", type: "text", placeholder });

export const SECTION_TYPES: SectionType[] = [
  {
    key: "hero", label: "Top of your page", icon: "Sparkles", tier: "freemium",
    purpose: "The first thing visitors see: your name, one line about you, and a button.",
    fields: [
      { key: "title",    label: "Business name",          type: "text", placeholder: "Your Business Name" },
      { key: "subtitle", label: "One line about you",     type: "text", placeholder: "Fresh bread every morning" },
      { key: "cta",      label: "Button words",           type: "text", placeholder: "Contact Us", hint: "The button takes visitors to what you sell." },
      { key: "heroBg",   label: "Colour 1", type: "hidden" },
      { key: "heroBg2",  label: "Colour 2", type: "hidden" },
      { key: "siteFont", label: "Lettering", type: "hidden" },
      { key: "whatsappButton", label: "WhatsApp button", type: "hidden" },
    ],
  },
  {
    key: "about", label: "About us", icon: "Info", tier: "freemium",
    purpose: "Your story, in your own words, with a photo.",
    fields: [
      { ...TITLE("About Us"), key: "aboutTitle" },
      { key: "aboutDesc",  label: "Your story", type: "textarea", placeholder: "How you started, what you care about…" },
      { key: "aboutImage", label: "Photo",      type: "image" },
    ],
  },
  {
    key: "items", label: "Things you sell", icon: "ShoppingBag", tier: "freemium",
    purpose: "Cards for your products. Link a card to a product so visitors can buy it.",
    fields: [
      { ...TITLE("Our Products"), key: "itemsTitle" },
      {
        key: "items", label: "Items", type: "repeater",
        itemFields: [
          { key: "name",  label: "Name",        type: "text", placeholder: "Product name" },
          { key: "desc",  label: "Short description", type: "text", placeholder: "Brief description" },
          { key: "price", label: "Price",       type: "text", placeholder: "250 ETB" },
          { key: "product_id", label: "Sell as product (optional)", type: "product" },
        ],
      },
    ],
  },
  {
    key: "gallery", label: "Photos", icon: "Images", tier: "freemium",
    purpose: "A grid of your best photos.",
    fields: [
      { ...TITLE("Gallery"), key: "galleryTitle" },
      {
        key: "galleryImages", label: "Photos", type: "repeater",
        itemFields: [
          { key: "url",     label: "Photo",   type: "image" },
          { key: "caption", label: "Caption (optional)", type: "text", placeholder: "Our shop on a busy morning" },
        ],
      },
    ],
  },
  {
    key: "services", label: "Services", icon: "Briefcase", tier: "freemium",
    purpose: "What you do for customers, with prices. Visitors can order or ask for a price.",
    fields: [
      { ...TITLE("Our Services"), key: "servTitle" },
      {
        key: "services", label: "Services", type: "repeater",
        itemFields: [
          { key: "name", label: "Service name", type: "text",     placeholder: "Haircut" },
          { key: "desc", label: "What's included", type: "textarea", placeholder: "Wash, cut and style" },
          { key: "price", label: "Price (optional)", type: "text", placeholder: "From 500 ETB" },
          { key: "product_id", label: "Sell as product (optional)", type: "product" },
        ],
      },
    ],
  },
  {
    key: "testimonials", label: "What customers say", icon: "MessageSquareQuote", tier: "freemium",
    purpose: "Kind words your customers told you, in their words.",
    fields: [
      { ...TITLE("What People Say"), key: "testTitle" },
      {
        key: "testimonials", label: "Quotes", type: "repeater",
        itemFields: [
          { key: "quote",  label: "What they said", type: "textarea", placeholder: "Amazing experience!" },
          { key: "author", label: "Their name",     type: "text",     placeholder: "Selam T." },
          { key: "role",   label: "Who they are (optional)", type: "text", placeholder: "Regular customer" },
        ],
      },
    ],
  },
  {
    key: "contact", label: "Contact", icon: "Mail", tier: "freemium",
    purpose: "How to reach you. Visitors tap to call, message or email.",
    fields: [
      { key: "location", label: "Address or landmark", type: "text", placeholder: "Bole, near Medhanialem church" },
      { key: "phone",    label: "Phone",          type: "text", placeholder: "+251 91 234 5678" },
      { key: "email",    label: "Email",          type: "text", placeholder: "hello@example.com" },
      { key: "hours",    label: "Opening hours",  type: "text", placeholder: "Mon–Sat 8:00–18:00" },
      { key: "whatsapp", label: "WhatsApp number", type: "text", placeholder: "+251 91 234 5678" },
    ],
  },
  {
    key: "social", label: "Social links", icon: "Share2", tier: "freemium",
    purpose: "Buttons to your social pages. Paste the link from the app's Share button.",
    fields: [
      { key: "facebook",  label: "Facebook page link",  type: "text", placeholder: "https://facebook.com/yourpage" },
      { key: "instagram", label: "Instagram link",      type: "text", placeholder: "https://instagram.com/yourname" },
      { key: "telegram",  label: "Telegram link",       type: "text", placeholder: "https://t.me/yourchannel" },
      { key: "youtube",   label: "YouTube link",        type: "text", placeholder: "https://youtube.com/@yourchannel" },
      { key: "tiktok",    label: "TikTok link",         type: "text", placeholder: "https://tiktok.com/@yourname" },
      { key: "twitter",   label: "X (Twitter) link",    type: "text", placeholder: "https://x.com/yourname" },
      { key: "linkedin",  label: "LinkedIn link",       type: "text", placeholder: "https://linkedin.com/in/yourname" },
    ],
  },
  {
    key: "pricing", label: "Price list", icon: "Tag", tier: "freemium",
    purpose: "Packages side by side with what each includes.",
    fields: [
      { ...TITLE("Pricing"), key: "pricingTitle" },
      {
        key: "plans", label: "Packages", type: "repeater",
        itemFields: [
          { key: "name",     label: "Package name", type: "text", placeholder: "Basic" },
          { key: "price",    label: "Price",        type: "text", placeholder: "500 ETB" },
          { key: "period",   label: "Per (optional)", type: "text", placeholder: "/month" },
          { key: "features", label: "What's included (separate with commas)", type: "text", placeholder: "Delivery, Gift wrap" },
          { key: "product_id", label: "Sell as product (optional)", type: "product" },
        ],
      },
    ],
  },
  {
    key: "team", label: "Our team", icon: "Users", tier: "freemium",
    purpose: "The people behind your business, with photos.",
    fields: [
      { ...TITLE("Our Team"), key: "teamTitle" },
      {
        key: "members", label: "People", type: "repeater",
        itemFields: [
          { key: "name",  label: "Name",  type: "text", placeholder: "Abebe K." },
          { key: "role",  label: "Job",   type: "text", placeholder: "Head chef" },
          { key: "image", label: "Photo", type: "image" },
          { key: "bio",   label: "A few words (optional)", type: "textarea", placeholder: "10 years of experience" },
        ],
      },
    ],
  },
  {
    key: "faq", label: "Questions & answers", icon: "HelpCircle", tier: "freemium",
    purpose: "Answers to what customers often ask. Visitors tap a question to open it.",
    fields: [
      { ...TITLE("Frequently Asked Questions"), key: "faqTitle" },
      {
        key: "faqs", label: "Questions", type: "repeater",
        itemFields: [
          { key: "question", label: "Question", type: "text",     placeholder: "Do you deliver?" },
          { key: "answer",   label: "Answer",   type: "textarea", placeholder: "Yes, across Addis Ababa." },
        ],
      },
    ],
  },
  {
    key: "features", label: "Why choose us", icon: "Zap", tier: "freemium",
    purpose: "Three or four reasons people pick you.",
    fields: [
      { ...TITLE("Why Choose Us"), key: "featTitle" },
      {
        key: "features", label: "Reasons", type: "repeater",
        itemFields: [
          { key: "name", label: "Reason",       type: "text", placeholder: "Fast delivery" },
          { key: "desc", label: "A few words",  type: "text", placeholder: "Same day in Addis" },
        ],
      },
    ],
  },
  {
    key: "stats", label: "Our numbers", icon: "BarChart2", tier: "freemium",
    purpose: "Big numbers that build trust, like customers served.",
    fields: [
      { ...TITLE("By the Numbers"), key: "statsTitle" },
      {
        key: "stats", label: "Numbers", type: "repeater",
        itemFields: [
          { key: "number", label: "Number",       type: "text", placeholder: "5,000+" },
          { key: "label",  label: "What it counts", type: "text", placeholder: "Happy customers" },
        ],
      },
    ],
  },
  {
    key: "portfolio", label: "Our work", icon: "FolderOpen", tier: "premium",
    purpose: "Photos of jobs you finished.",
    tierLabel: "Premium feature",
    tierFeatures: ["Showcase projects", "Client logos", "Project details"],
    fields: [
      { ...TITLE("Our Work"), key: "portTitle" },
      {
        key: "portfolio", label: "Projects", type: "repeater",
        itemFields: [
          { key: "title",  label: "Project name", type: "text",     placeholder: "Kitchen renovation" },
          { key: "desc",   label: "What you did", type: "textarea", placeholder: "New cabinets and tiles" },
          { key: "image",  label: "Photo",        type: "image" },
          { key: "client", label: "For (optional)", type: "text",   placeholder: "Client name" },
        ],
      },
    ],
  },
  {
    key: "before_after", label: "Before & after", icon: "ArrowLeftRight", tier: "premium",
    purpose: "Show the change you made. Side-by-side photos that speak for themselves.",
    tierLabel: "Premium feature",
    tierFeatures: ["Side-by-side transformation photos", "Great for salons, clinics, construction"],
    fields: [
      { key: "baTitle", label: "Section heading", type: "text", placeholder: "Before & After" },
      {
        key: "baPairs", label: "Pairs", type: "repeater",
        itemFields: [
          { key: "label",  label: "Label (optional)", type: "text",  placeholder: "Kitchen renovation" },
          { key: "before", label: "Before photo",     type: "image" },
          { key: "after",  label: "After photo",      type: "image" },
        ],
      },
    ],
  },
  {
    key: "job_openings", label: "We're hiring", icon: "UserPlus", tier: "premium",
    purpose: "Open positions at your business. Visitors see the role and tap to apply.",
    tierLabel: "Premium feature",
    tierFeatures: ["Post open positions", "Applicants contact you directly"],
    fields: [
      { key: "jobsTitle", label: "Section heading", type: "text", placeholder: "We're Hiring" },
      {
        key: "jobs", label: "Positions", type: "repeater",
        itemFields: [
          { key: "title",      label: "Job title",                    type: "text",     placeholder: "Barista" },
          { key: "type",       label: "Type",                         type: "text",     placeholder: "Full-time / Part-time" },
          { key: "desc",       label: "What the job involves",        type: "textarea", placeholder: "What the job involves" },
          { key: "salary",     label: "Salary (optional)",            type: "text",     placeholder: "Salary range or negotiable" },
          { key: "product_id", label: "Collect application fee (optional)", type: "product" },
        ],
      },
    ],
  },
  {
    key: "newsletter", label: "Email sign-up", icon: "Send", tier: "premium",
    purpose: "Visitors leave their email; you see the list on your website page.",
    tierLabel: "Premium feature",
    tierFeatures: ["Email capture", "Subscriber management", "Custom forms"],
    fields: [
      { key: "newsTitle", label: "Heading",     type: "text", placeholder: "Get our news" },
      { key: "newsDesc",  label: "A few words", type: "text", placeholder: "New products and offers, once a month" },
      { key: "newsBtn",   label: "Button words", type: "text", placeholder: "Sign up" },
    ],
  },
  {
    key: "video", label: "Video", icon: "PlayCircle", tier: "premium",
    purpose: "Play a YouTube video on your page.",
    tierLabel: "Premium feature",
    tierFeatures: ["Video embedding", "Custom thumbnails", "Playback analytics"],
    fields: [
      { ...TITLE("Watch Our Story"), key: "vidTitle" },
      { key: "vidUrl",   label: "YouTube link", type: "text", placeholder: "https://youtu.be/…", hint: "On YouTube tap Share, then Copy link, and paste it here." },
      { key: "vidDesc",  label: "Caption (optional)", type: "text", placeholder: "How we make our coffee" },
    ],
  },
  {
    key: "map", label: "Map", icon: "MapPin", tier: "premium",
    purpose: "A map of where you are, with a Directions button.",
    tierLabel: "Premium feature",
    tierFeatures: ["Map from your address", "Directions link"],
    fields: [
      { ...TITLE("Find Us"), key: "mapTitle" },
      { key: "address",  label: "Address or landmark", type: "text", placeholder: "Bole Road, Addis Ababa", hint: "Write it the way you'd tell a taxi driver." },
      { key: "mapUrl",   label: "Map link", type: "hidden" },
    ],
  },
  {
    key: "cta", label: "Big button", icon: "Megaphone", tier: "premium",
    purpose: "A bold strip that asks visitors to get in touch.",
    tierLabel: "Premium feature",
    tierFeatures: ["Conversion tracking", "A/B testing", "Custom styling"],
    fields: [
      { key: "ctaTitle", label: "Heading",      type: "text", placeholder: "Ready to order?" },
      { key: "ctaDesc",  label: "A few words",  type: "text", placeholder: "Message us today" },
      { key: "ctaBtn",   label: "Button words", type: "text", placeholder: "Contact Us", hint: "The button takes visitors to your contact details." },
      { key: "ctaBg",    label: "Colour", type: "hidden" },
    ],
  },
  {
    key: "process", label: "Steps", icon: "GitBranch", tier: "premium",
    purpose: "How working with you goes, step by step.",
    tierLabel: "Premium feature",
    tierFeatures: ["Step-by-step flow", "Custom icons", "Progress tracking"],
    fields: [
      { ...TITLE("How It Works"), key: "processTitle" },
      {
        key: "processSteps", label: "Steps", type: "repeater",
        itemFields: [
          { key: "title", label: "Step",         type: "text",     placeholder: "Choose your cake" },
          { key: "desc",  label: "What happens", type: "textarea", placeholder: "Pick a size and flavour" },
        ],
      },
    ],
  },
  {
    key: "booking", label: "Book or request", icon: "CalendarCheck", tier: "premium",
    purpose: "A button visitors tap to request a booking; you get it as a request.",
    tierLabel: "Premium feature",
    tierFeatures: ["Booking requests", "Payment collection", "Reminders"],
    fields: [
      { ...TITLE("Book an Appointment"), key: "bookingTitle" },
      { key: "bookingDesc",  label: "A few words",  type: "textarea", placeholder: "Tell us the day and time you'd like" },
      { key: "bookingBtn",   label: "Button words", type: "text",     placeholder: "Request a booking" },
    ],
  },
  {
    key: "caseStudies", label: "Success stories", icon: "TrendingUp", tier: "pro",
    purpose: "Short stories of how you helped a customer, with the result.",
    tierLabel: "Pro feature",
    tierFeatures: ["Detailed metrics", "Client quotes", "Visual storytelling"],
    fields: [
      { ...TITLE("Success Stories"), key: "caseTitle" },
      {
        key: "caseStudies", label: "Stories", type: "repeater",
        itemFields: [
          { key: "title",   label: "Story title", type: "text",     placeholder: "A wedding for 300 guests" },
          { key: "summary", label: "What you did", type: "textarea", placeholder: "Catering and decoration" },
          { key: "result",  label: "The result",  type: "text",     placeholder: "Booked again for 2027" },
        ],
      },
    ],
  },
  {
    key: "partners", label: "Partners & clients", icon: "Handshake", tier: "pro",
    purpose: "Logos of businesses you work with.",
    tierLabel: "Pro feature",
    tierFeatures: ["Logo grid", "Partner categories", "Testimonials"],
    fields: [
      { ...TITLE("Our Partners"), key: "partnersTitle" },
      {
        key: "partners", label: "Partners", type: "repeater",
        itemFields: [
          { key: "name", label: "Name", type: "text", placeholder: "Company name" },
          { key: "logo", label: "Logo", type: "image" },
          { key: "note", label: "A few words (optional)", type: "text", placeholder: "Supplier since 2020" },
        ],
      },
    ],
  },
  {
    key: "awards", label: "Awards & certificates", icon: "Award", tier: "pro",
    purpose: "Prizes, licences and certificates that show you're trusted.",
    tierLabel: "Pro feature",
    tierFeatures: ["Award showcase", "Year filtering", "Category tags"],
    fields: [
      { ...TITLE("Awards & Recognition"), key: "awardsTitle" },
      {
        key: "awards", label: "Awards", type: "repeater",
        itemFields: [
          { key: "title",  label: "Award or certificate", type: "text",     placeholder: "Best Café 2025" },
          { key: "detail", label: "A few words",          type: "textarea", placeholder: "Given by…" },
        ],
      },
    ],
  },
  {
    key: "industries", label: "Who we serve", icon: "Building2", tier: "pro",
    purpose: "The kinds of customers you work with.",
    tierLabel: "Pro feature",
    tierFeatures: ["Industry filtering", "Case study links", "Expertise tags"],
    fields: [
      { ...TITLE("Industries We Serve"), key: "industriesTitle" },
      {
        key: "industries", label: "Customers", type: "repeater",
        itemFields: [
          { key: "name", label: "Kind of customer", type: "text",     placeholder: "Restaurants" },
          { key: "desc", label: "How you help",     type: "textarea", placeholder: "Daily fresh deliveries" },
        ],
      },
    ],
  },
  {
    key: "delivery", label: "Delivery options", icon: "Truck", tier: "freemium",
    purpose: "Your delivery zones, fees and estimated times. Visitors know before they order.",
    fields: [
      { key: "deliveryTitle", label: "Section heading", type: "text", placeholder: "Delivery Options" },
      {
        key: "deliveryZones", label: "Delivery zones", type: "repeater",
        itemFields: [
          { key: "zone", label: "Zone or area", type: "text", placeholder: "Bole" },
          { key: "fee",  label: "Delivery fee", type: "text", placeholder: "0 ETB or 50 ETB" },
          { key: "time", label: "Estimated time", type: "text", placeholder: "30\u201360 min" },
        ],
      },
      { key: "deliveryNote", label: "Extra note (optional)", type: "textarea", placeholder: "We deliver Mon\u2013Sat 8am\u20138pm" },
    ],
  },
  {
    key: "certifications", label: "Licences & certificates", icon: "BadgeCheck", tier: "freemium",
    purpose: "Your trade licence, medical registration, or any certificate that shows you are qualified.",
    fields: [
      { key: "certsTitle", label: "Section heading", type: "text", placeholder: "Our Credentials" },
      {
        key: "certs", label: "Certificates", type: "repeater",
        itemFields: [
          { key: "name",   label: "Certificate or licence name", type: "text", placeholder: "Certificate or licence name" },
          { key: "issuer", label: "Issued by",                   type: "text", placeholder: "Issued by" },
          { key: "year",   label: "Year",                        type: "text", placeholder: "Year" },
        ],
      },
    ],
  },
  {
    key: "brands", label: "Brands we carry", icon: "Tag", tier: "freemium",
    purpose: "The brands your shop stocks. Helps visitors find what they are looking for.",
    fields: [
      { key: "brandsTitle", label: "Section heading", type: "text", placeholder: "Brands We Carry" },
      {
        key: "brands", label: "Brands", type: "repeater",
        itemFields: [
          { key: "name", label: "Brand name",              type: "text",  placeholder: "Brand name" },
          { key: "logo", label: "Logo",                    type: "image" },
          { key: "note", label: "A note (optional)",       type: "text",  placeholder: "Authorised dealer" },
        ],
      },
    ],
  },
  {
    key: "event_schedule", label: "Events & schedule", icon: "CalendarDays", tier: "freemium",
    purpose: "Upcoming classes, events or sessions with date, time and price.",
    fields: [
      { key: "eventsTitle", label: "Section heading", type: "text", placeholder: "Upcoming Events" },
      {
        key: "events", label: "Events", type: "repeater",
        itemFields: [
          { key: "title",      label: "Event or class name",      type: "text",    placeholder: "Event or class name" },
          { key: "date",       label: "Date & time",              type: "text",    placeholder: "Sat 10 Jan, 9am" },
          { key: "price",      label: "Price",                    type: "text",    placeholder: "500 ETB or Free" },
          { key: "seats",      label: "Seats left (optional)",    type: "text",    placeholder: "Seats left" },
          { key: "product_id", label: "Sell a ticket (optional)", type: "product" },
        ],
      },
    ],
  },
  {
    key: "menu", label: "Menu", icon: "UtensilsCrossed", tier: "freemium",
    purpose: "Your dishes and drinks by group, with photos and prices. Visitors can order.",
    fields: [
      { key: "menuTitle", label: "Section heading", type: "text", placeholder: "Our Menu" },
      {
        key: "dishes", label: "Dishes", type: "repeater",
        itemFields: [
          { key: "category", label: "Group (optional)", type: "text", placeholder: "Breakfast" },
          { key: "name",  label: "Dish or drink", type: "text", placeholder: "Special Firfir" },
          { key: "desc",  label: "A few words (optional)", type: "text", placeholder: "With fresh injera" },
          { key: "price", label: "Price", type: "text", placeholder: "180 ETB" },
          { key: "photo", label: "Photo (optional)", type: "image" },
          { key: "product_id", label: "Sell as product (optional)", type: "product" },
        ],
      },
    ],
  },
  {
    key: "offer", label: "Today's offer", icon: "Megaphone", tier: "freemium",
    purpose: "A short special offer with an end date. It disappears by itself when it ends.",
    fields: [
      { key: "offerTitle", label: "The offer", type: "text", placeholder: "20% off all cakes this weekend" },
      { key: "offerDesc",  label: "A few words (optional)", type: "textarea", placeholder: "Order before Sunday 6 pm" },
      { key: "offerPhoto", label: "Photo (optional)", type: "image" },
      { key: "offerEnds",  label: "Last day", type: "date", hint: "After this day visitors no longer see the offer." },
      { key: "offerBtn",   label: "Button words", type: "text", placeholder: "Order now", hint: "The button takes visitors to what you sell." },
    ],
  },
  {
    key: "hours", label: "Opening hours", icon: "Clock", tier: "freemium",
    purpose: "Your days and times. Visitors see if you are open right now.",
    fields: [
      { key: "hoursTitle",   label: "Section heading", type: "text", placeholder: "Opening Hours" },
      { key: "openingHours", label: "Days and times", type: "hours" },
    ],
  },
  // ── Living sections: fill themselves from the business's real data ─────────
  {
    key: "payment_info", label: "How to pay me", icon: "Wallet", tier: "freemium",
    purpose: "Your telebirr, CBE or bank accounts from your Business settings, with Copy buttons. Always up to date.",
    fields: [
      { key: "payTitle", label: "Section heading", type: "text", placeholder: "How to pay" },
      { key: "payNote",  label: "A note for buyers (optional)", type: "text", placeholder: "Send the receipt on WhatsApp after paying" },
    ],
  },
  {
    key: "inventory_catalog",
    label: "Product catalogue",
    icon: "Package",
    tier: "pro",
    purpose: "All your products from My Products, with search and categories. Updates by itself.",
    tierLabel: "Pro feature",
    tierFeatures: ["Your live products", "Search and categories", "Stock left"],
    fields: [
      { ...TITLE("Our Products"), key: "catalogTitle" },
      { key: "showStock", label: "Show how many are left", type: "toggle" },
    ],
  },
  {
    key: "live_location_tracking",
    label: "Live location",
    icon: "Navigation",
    tier: "pro",
    purpose: "Shows where you are right now on a map when you share it, like a delivery or a food truck.",
    tierLabel: "Pro feature",
    tierFeatures: ["Your position on a map", "Visible to any visitor", "Updates live"],
    fields: [
      { ...TITLE("Find us live"), key: "locationTitle" },
    ],
  },
  {
    key: "save_showroom",
    label: "Save button",
    icon: "Bookmark",
    tier: "pro",
    purpose: "A button visitors tap to save your website and find it again in their Saved items.",
    tierLabel: "Pro feature",
    tierFeatures: [
      "Let visitors bookmark your showroom",
      "Appears on their Bookmarks page",
      "Drives repeat visits",
    ],
    fields: [
      { ...TITLE("Save this showroom"), key: "saveTitle" },
      { key: "saveDesc",  label: "A few words", type: "text", placeholder: "Save us and find us again easily" },
    ],
  },
];

// Default sections per category
export const CATEGORY_DEFAULT_SECTIONS: Record<string, string[]> = {
  "Business & Commerce":    ["hero", "items", "brands", "gallery", "testimonials", "contact", "social"],
  "Health & Medical":       ["hero", "services", "certifications", "testimonials", "team", "contact"],
  "Food & Beverage":        ["hero", "menu", "gallery", "delivery", "offer", "testimonials", "contact", "social"],
  "Construction & Trade":   ["hero", "services", "before_after", "certifications", "portfolio", "testimonials", "contact"],
  "Transport & Logistics":  ["hero", "services", "pricing", "contact"],
  "Education":              ["hero", "services", "event_schedule", "features", "testimonials", "contact"],
  "Professional Services":  ["hero", "services", "certifications", "portfolio", "team", "testimonials", "contact"],
  "Agriculture & Farming":  ["hero", "items", "about", "contact"],
  "Hospitality & Tourism":  ["hero", "gallery", "services", "event_schedule", "testimonials", "contact", "social"],
  "Beauty & Personal Care": ["hero", "services", "gallery", "before_after", "pricing", "contact", "social"],
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
