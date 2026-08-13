/**
 * showroomSectionFields.ts
 *
 * Single source of truth for ALL Showroom Studio section definitions.
 * Fully aligned with ShowroomStudio.html — every section type, every field key,
 * every repeater sub-field, and every skeleton preview type are consistent.
 *
 * 32 section types total (30 from HTML + story + hours added for completeness).
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type FieldType = "text" | "textarea" | "repeater" | "select" | "toggle";

export interface ItemField {
  key: string;
  label: string;
  type: "text" | "textarea";
  placeholder?: string;
}

export interface SectionField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  /** Only for type = "repeater" */
  itemFields?: ItemField[];
  /** Only for type = "select" */
  options?: string[];
}

/** Skeleton preview layout key — maps to renderSkeleton() in ShowroomTemplates */
export type SkeletonType =
  | "products" | "services" | "menu" | "gallery" | "grid"
  | "events" | "calendar" | "impact" | "blog" | "videos"
  | "episodes" | "features" | "waitlist" | "stats" | "forum"
  | "hero" | "contact" | "text";

export interface SectionDefinition {
  /** Section type key — used in template section arrays */
  type: string;
  /** Display label */
  label: string;
  /** lucide-react component name */
  icon: string;
  /** Skeleton preview type for gallery cards */
  skeletonType: SkeletonType;
  /** Editable fields */
  fields: SectionField[];
}

// ── Section definitions ──────────────────────────────────────────────────────

export const SECTION_DEFINITIONS: SectionDefinition[] = [

  // ── hero ──────────────────────────────────────────────────────────────────
  {
    type: "hero",
    label: "Hero",
    icon: "Sparkles",
    skeletonType: "hero",
    fields: [
      { key: "title",    label: "Headline",             type: "text",     placeholder: "Your bold headline" },
      { key: "subtitle", label: "Subtitle / Tagline",   type: "text",     placeholder: "A short tagline" },
      { key: "cta",      label: "CTA Button Text",      type: "text",     placeholder: "Get started" },
      { key: "image",    label: "Background Image URL", type: "text",     placeholder: "https://..." },
    ],
  },

  // ── about ─────────────────────────────────────────────────────────────────
  {
    type: "about",
    label: "About",
    icon: "Info",
    skeletonType: "text",
    fields: [
      { key: "title",       label: "Section Title", type: "text",     placeholder: "About us" },
      { key: "description", label: "Description",   type: "textarea", placeholder: "Tell your story..." },
      { key: "image",       label: "Image URL",     type: "text",     placeholder: "https://..." },
    ],
  },

  // ── menu ──────────────────────────────────────────────────────────────────
  {
    type: "menu",
    label: "Menu",
    icon: "UtensilsCrossed",
    skeletonType: "menu",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Our menu" },
      {
        key: "items", label: "Menu Items", type: "repeater",
        itemFields: [
          { key: "name",        label: "Item Name",    type: "text", placeholder: "Dish name" },
          { key: "description", label: "Description",  type: "text", placeholder: "Brief description" },
          { key: "price",       label: "Price",        type: "text", placeholder: "15.00" },
        ],
      },
    ],
  },

  // ── gallery ───────────────────────────────────────────────────────────────
  {
    type: "gallery",
    label: "Gallery",
    icon: "Images",
    skeletonType: "gallery",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Gallery" },
      {
        key: "images", label: "Images", type: "repeater",
        itemFields: [
          { key: "image",   label: "Image URL", type: "text", placeholder: "https://..." },
          { key: "caption", label: "Caption",   type: "text", placeholder: "Photo description" },
        ],
      },
    ],
  },

  // ── testimonials ──────────────────────────────────────────────────────────
  {
    type: "testimonials",
    label: "Testimonials",
    icon: "MessageSquareQuote",
    skeletonType: "text",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "What people say" },
      {
        key: "items", label: "Testimonials", type: "repeater",
        itemFields: [
          { key: "quote",  label: "Quote",        type: "textarea", placeholder: "Amazing experience!" },
          { key: "author", label: "Author Name",  type: "text",     placeholder: "Jane Doe" },
          { key: "role",   label: "Role / Title", type: "text",     placeholder: "CEO, Company" },
        ],
      },
    ],
  },

  // ── pricing ───────────────────────────────────────────────────────────────
  {
    type: "pricing",
    label: "Pricing",
    icon: "Tag",
    skeletonType: "grid",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Pricing plans" },
      {
        key: "plans", label: "Plans", type: "repeater",
        itemFields: [
          { key: "name",     label: "Plan Name",                        type: "text",     placeholder: "Pro" },
          { key: "price",    label: "Price",                            type: "text",     placeholder: "49.99/mo" },
          { key: "features", label: "Features (comma-separated)",       type: "text",     placeholder: "Feature 1, Feature 2" },
          { key: "cta",      label: "Button Text",                      type: "text",     placeholder: "Get started" },
        ],
      },
    ],
  },

  // ── services ──────────────────────────────────────────────────────────────
  {
    type: "services",
    label: "Services",
    icon: "Briefcase",
    skeletonType: "services",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Our services" },
      {
        key: "items", label: "Services", type: "repeater",
        itemFields: [
          { key: "title",       label: "Service Name",  type: "text",     placeholder: "Web design" },
          { key: "description", label: "Description",   type: "text",     placeholder: "What we offer" },
          { key: "price",       label: "Price",         type: "text",     placeholder: "From " },
          { key: "icon",        label: "Icon (name)",   type: "text",     placeholder: "e.g. Globe" },
        ],
      },
    ],
  },

  // ── team ──────────────────────────────────────────────────────────────────
  {
    type: "team",
    label: "Team",
    icon: "Users",
    skeletonType: "grid",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Our team" },
      {
        key: "members", label: "Team Members", type: "repeater",
        itemFields: [
          { key: "name",  label: "Full Name",   type: "text",     placeholder: "Alex Rivera" },
          { key: "role",  label: "Role / Title",type: "text",     placeholder: "Lead designer" },
          { key: "bio",   label: "Short Bio",   type: "textarea", placeholder: "Brief bio..." },
          { key: "image", label: "Photo URL",   type: "text",     placeholder: "https://..." },
        ],
      },
    ],
  },

  // ── contact ───────────────────────────────────────────────────────────────
  {
    type: "contact",
    label: "Contact",
    icon: "Mail",
    skeletonType: "contact",
    fields: [
      { key: "title",       label: "Section Title", type: "text",     placeholder: "Get in touch" },
      { key: "description", label: "Description",   type: "textarea", placeholder: "We'd love to hear from you..." },
      { key: "email",       label: "Email",         type: "text",     placeholder: "hello@example.com" },
      { key: "phone",       label: "Phone",         type: "text",     placeholder: "+1 234 567 8900" },
      { key: "address",     label: "Address",       type: "textarea", placeholder: "Your street address, City, Country" },
    ],
  },

  // ── newsletter ────────────────────────────────────────────────────────────
  {
    type: "newsletter",
    label: "Newsletter",
    icon: "Send",
    skeletonType: "waitlist",
    fields: [
      { key: "title",       label: "Headline",         type: "text", placeholder: "Subscribe" },
      { key: "subtitle",    label: "Sub-text",         type: "text", placeholder: "Stay updated" },
      { key: "placeholder", label: "Input Placeholder",type: "text", placeholder: "Enter your email" },
      { key: "button",      label: "Button Text",      type: "text", placeholder: "Subscribe" },
    ],
  },

  // ── footer ────────────────────────────────────────────────────────────────
  {
    type: "footer",
    label: "Footer",
    icon: "AlignJustify",
    skeletonType: "text",
    fields: [
      { key: "text",      label: "Footer Text",      type: "text",     placeholder: "© 2026 Your brand" },
      { key: "tagline",   label: "Tagline",          type: "text",     placeholder: "Your tagline" },
      { key: "links",     label: "Nav Links (comma-separated)", type: "text", placeholder: "Privacy, Terms, Contact" },
    ],
  },

  // ── features ──────────────────────────────────────────────────────────────
  {
    type: "features",
    label: "Features",
    icon: "Zap",
    skeletonType: "features",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Key features" },
      {
        key: "items", label: "Features", type: "repeater",
        itemFields: [
          { key: "title",       label: "Feature Title", type: "text",     placeholder: "Lightning fast" },
          { key: "description", label: "Description",   type: "text",     placeholder: "Built for speed" },
          { key: "icon",        label: "Icon Name",     type: "text",     placeholder: "Zap" },
        ],
      },
    ],
  },

  // ── stats ─────────────────────────────────────────────────────────────────
  {
    type: "stats",
    label: "Stats",
    icon: "BarChart2",
    skeletonType: "stats",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "By the numbers" },
      {
        key: "items", label: "Stats", type: "repeater",
        itemFields: [
          { key: "number", label: "Number / Value", type: "text", placeholder: "10K+" },
          { key: "label",  label: "Label",          type: "text", placeholder: "Happy customers" },
        ],
      },
    ],
  },

  // ── blog ──────────────────────────────────────────────────────────────────
  {
    type: "blog",
    label: "Blog",
    icon: "BookOpen",
    skeletonType: "blog",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Latest posts" },
      {
        key: "posts", label: "Blog Posts", type: "repeater",
        itemFields: [
          { key: "title",   label: "Post Title", type: "text",     placeholder: "How to..." },
          { key: "excerpt", label: "Excerpt",    type: "text",     placeholder: "A short summary" },
          { key: "date",    label: "Date",       type: "text",     placeholder: "Jan 15, 2026" },
          { key: "image",   label: "Image URL",  type: "text",     placeholder: "https://..." },
        ],
      },
    ],
  },

  // ── events ────────────────────────────────────────────────────────────────
  {
    type: "events",
    label: "Events",
    icon: "CalendarDays",
    skeletonType: "events",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Upcoming events" },
      {
        key: "items", label: "Events", type: "repeater",
        itemFields: [
          { key: "title",    label: "Event Name",  type: "text",     placeholder: "Workshop" },
          { key: "date",     label: "Date",        type: "text",     placeholder: "Feb 20, 2026" },
          { key: "location", label: "Location",    type: "text",     placeholder: "Online / Your city" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Event details..." },
        ],
      },
    ],
  },

  // ── faq ───────────────────────────────────────────────────────────────────
  {
    type: "faq",
    label: "FAQ",
    icon: "HelpCircle",
    skeletonType: "text",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Frequently asked" },
      {
        key: "items", label: "FAQ Items", type: "repeater",
        itemFields: [
          { key: "question", label: "Question", type: "text",     placeholder: "What is..." },
          { key: "answer",   label: "Answer",   type: "textarea", placeholder: "The answer is..." },
        ],
      },
    ],
  },

  // ── products ──────────────────────────────────────────────────────────────
  {
    type: "products",
    label: "Products",
    icon: "ShoppingBag",
    skeletonType: "products",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Our products" },
      {
        key: "items", label: "Products", type: "repeater",
        itemFields: [
          { key: "name",        label: "Product Name",  type: "text",     placeholder: "Product name" },
          { key: "price",       label: "Price",         type: "text",     placeholder: "29.99" },
          { key: "image",       label: "Image URL",     type: "text",     placeholder: "https://..." },
          { key: "description", label: "Description",   type: "text",     placeholder: "Short description" },
        ],
      },
    ],
  },

  // ── portfolio ─────────────────────────────────────────────────────────────
  {
    type: "portfolio",
    label: "Portfolio",
    icon: "FolderOpen",
    skeletonType: "gallery",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Our work" },
      {
        key: "items", label: "Portfolio Items", type: "repeater",
        itemFields: [
          { key: "title",       label: "Project Title", type: "text",     placeholder: "Brand X" },
          { key: "description", label: "Description",   type: "text",     placeholder: "What we did" },
          { key: "image",       label: "Image URL",     type: "text",     placeholder: "https://..." },
          { key: "link",        label: "Project Link",  type: "text",     placeholder: "https://..." },
        ],
      },
    ],
  },

  // ── booking ───────────────────────────────────────────────────────────────
  {
    type: "booking",
    label: "Booking",
    icon: "CalendarCheck",
    skeletonType: "calendar",
    fields: [
      { key: "title",       label: "Section Title", type: "text",     placeholder: "Book now" },
      { key: "description", label: "Description",   type: "textarea", placeholder: "Schedule your session..." },
      { key: "cta",         label: "Button Text",   type: "text",     placeholder: "Book appointment" },
    ],
  },

  // ── donate ────────────────────────────────────────────────────────────────
  {
    type: "donate",
    label: "Donate",
    icon: "HeartHandshake",
    skeletonType: "text",
    fields: [
      { key: "title",       label: "Section Title", type: "text",     placeholder: "Support our cause" },
      { key: "description", label: "Description",   type: "textarea", placeholder: "Every contribution helps..." },
      { key: "cta",         label: "Button Text",   type: "text",     placeholder: "Donate now" },
    ],
  },

  // ── volunteer ─────────────────────────────────────────────────────────────
  {
    type: "volunteer",
    label: "Volunteer",
    icon: "HandHeart",
    skeletonType: "text",
    fields: [
      { key: "title",       label: "Section Title", type: "text",     placeholder: "Get involved" },
      { key: "description", label: "Description",   type: "textarea", placeholder: "Join our team..." },
      { key: "cta",         label: "Button Text",   type: "text",     placeholder: "Volunteer" },
    ],
  },

  // ── mission ───────────────────────────────────────────────────────────────
  {
    type: "mission",
    label: "Mission",
    icon: "Target",
    skeletonType: "text",
    fields: [
      { key: "title",       label: "Section Title",    type: "text",     placeholder: "Our mission" },
      { key: "description", label: "Mission Statement",type: "textarea", placeholder: "What we stand for..." },
      { key: "vision",      label: "Vision",           type: "textarea", placeholder: "What we aim to achieve..." },
      { key: "image",       label: "Image URL",        type: "text",     placeholder: "https://..." },
    ],
  },

  // ── impact ────────────────────────────────────────────────────────────────
  {
    type: "impact",
    label: "Impact",
    icon: "TrendingUp",
    skeletonType: "impact",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Our impact" },
      {
        key: "stats", label: "Impact Stats", type: "repeater",
        itemFields: [
          { key: "number", label: "Number",  type: "text", placeholder: "1,000+" },
          { key: "label",  label: "Label",   type: "text", placeholder: "Trees planted" },
        ],
      },
    ],
  },

  // ── social ────────────────────────────────────────────────────────────────
  {
    type: "social",
    label: "Social Links",
    icon: "Share2",
    skeletonType: "text",
    fields: [
      { key: "title",     label: "Section Title", type: "text", placeholder: "Follow us" },
      { key: "links",     label: "Social links (comma-separated)", type: "text", placeholder: "instagram, youtube, twitter" },
      { key: "instagram", label: "Instagram URL", type: "text", placeholder: "https://instagram.com/..." },
      { key: "facebook",  label: "Facebook URL",  type: "text", placeholder: "https://facebook.com/..." },
      { key: "twitter",   label: "Twitter / X URL",type: "text",placeholder: "https://x.com/..." },
      { key: "telegram",  label: "Telegram URL",  type: "text", placeholder: "https://t.me/..." },
      { key: "youtube",   label: "YouTube URL",   type: "text", placeholder: "https://youtube.com/..." },
      { key: "tiktok",    label: "TikTok URL",    type: "text", placeholder: "https://tiktok.com/@..." },
    ],
  },

  // ── videos ────────────────────────────────────────────────────────────────
  {
    type: "videos",
    label: "Videos",
    icon: "PlayCircle",
    skeletonType: "videos",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Latest videos" },
      {
        key: "items", label: "Videos", type: "repeater",
        itemFields: [
          { key: "title",     label: "Video Title",      type: "text", placeholder: "Video title" },
          { key: "url",       label: "YouTube URL",      type: "text", placeholder: "https://youtu.be/..." },
          { key: "thumbnail", label: "Thumbnail URL",    type: "text", placeholder: "https://..." },
        ],
      },
    ],
  },

  // ── episodes ──────────────────────────────────────────────────────────────
  {
    type: "episodes",
    label: "Episodes",
    icon: "Mic2",
    skeletonType: "episodes",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Recent episodes" },
      {
        key: "items", label: "Episodes", type: "repeater",
        itemFields: [
          { key: "title",       label: "Episode Title", type: "text",     placeholder: "Ep 1: Hello" },
          { key: "description", label: "Description",   type: "text",     placeholder: "Brief summary" },
          { key: "date",        label: "Date",          type: "text",     placeholder: "Jan 10, 2026" },
          { key: "url",         label: "Listen URL",    type: "text",     placeholder: "https://..." },
          { key: "duration",    label: "Duration",      type: "text",     placeholder: "42 min" },
        ],
      },
    ],
  },

  // ── books ─────────────────────────────────────────────────────────────────
  {
    type: "books",
    label: "Books",
    icon: "BookMarked",
    skeletonType: "grid",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "My books" },
      {
        key: "items", label: "Books", type: "repeater",
        itemFields: [
          { key: "title",       label: "Book Title",    type: "text",     placeholder: "Book name" },
          { key: "description", label: "Description",   type: "textarea", placeholder: "A short synopsis" },
          { key: "cover",       label: "Cover Image URL",type: "text",    placeholder: "https://..." },
          { key: "link",        label: "Buy / Read Link",type: "text",    placeholder: "https://..." },
        ],
      },
    ],
  },

  // ── waitlist ──────────────────────────────────────────────────────────────
  {
    type: "waitlist",
    label: "Waitlist",
    icon: "Clock",
    skeletonType: "waitlist",
    fields: [
      { key: "title",       label: "Headline",         type: "text",     placeholder: "Join the waitlist" },
      { key: "subtitle",    label: "Sub-text",         type: "textarea", placeholder: "Be the first to know" },
      { key: "placeholder", label: "Email Placeholder",type: "text",     placeholder: "Enter your email" },
      { key: "cta",         label: "Button Text",      type: "text",     placeholder: "Sign up" },
    ],
  },

  // ── community ─────────────────────────────────────────────────────────────
  {
    type: "community",
    label: "Community",
    icon: "Globe",
    skeletonType: "text",
    fields: [
      { key: "title",       label: "Section Title", type: "text",     placeholder: "Our community" },
      { key: "description", label: "Description",   type: "textarea", placeholder: "Join the conversation..." },
      { key: "members",     label: "Member Count",  type: "text",     placeholder: "2,500+" },
      { key: "cta",         label: "Button Text",   type: "text",     placeholder: "Join now" },
    ],
  },

  // ── topics ────────────────────────────────────────────────────────────────
  {
    type: "topics",
    label: "Topics",
    icon: "Hash",
    skeletonType: "forum",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Forum topics" },
      {
        key: "items", label: "Topics", type: "repeater",
        itemFields: [
          { key: "title",   label: "Topic Title",  type: "text", placeholder: "Introduce yourself" },
          { key: "replies", label: "Replies",      type: "text", placeholder: "42" },
          { key: "last",    label: "Last Active",  type: "text", placeholder: "2h ago" },
        ],
      },
    ],
  },

  // ── projects ──────────────────────────────────────────────────────────────
  {
    type: "projects",
    label: "Projects",
    icon: "FolderKanban",
    skeletonType: "grid",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Our projects" },
      {
        key: "items", label: "Projects", type: "repeater",
        itemFields: [
          { key: "title",       label: "Project Name",  type: "text",     placeholder: "Project name" },
          { key: "description", label: "Description",   type: "textarea", placeholder: "What this project achieved" },
          { key: "image",       label: "Image URL",     type: "text",     placeholder: "https://..." },
          { key: "status",      label: "Status",        type: "text",     placeholder: "Ongoing / Completed" },
        ],
      },
    ],
  },

  // ── subscribe ─────────────────────────────────────────────────────────────
  {
    type: "subscribe",
    label: "Subscribe",
    icon: "BellRing",
    skeletonType: "waitlist",
    fields: [
      { key: "title",    label: "Headline",  type: "text", placeholder: "Subscribe" },
      { key: "subtitle", label: "Sub-text",  type: "text", placeholder: "Never miss an episode" },
      { key: "cta",      label: "Button",    type: "text", placeholder: "Subscribe" },
    ],
  },

  // ── story (bonus — used by empire_elegant template) ───────────────────────
  {
    type: "story",
    label: "Our Story",
    icon: "BookHeart",
    skeletonType: "text",
    fields: [
      { key: "title",       label: "Section Title", type: "text",     placeholder: "Our story" },
      { key: "description", label: "Story",         type: "textarea", placeholder: "Where we started and where we are going..." },
      { key: "image",       label: "Image URL",     type: "text",     placeholder: "https://..." },
    ],
  },

  // ── hours ─────────────────────────────────────────────────────────────────
  {
    type: "hours",
    label: "Opening Hours",
    icon: "Clock3",
    skeletonType: "text",
    fields: [
      { key: "title", label: "Section Title", type: "text", placeholder: "Opening Hours" },
      {
        key: "schedule", label: "Schedule", type: "repeater",
        itemFields: [
          { key: "day",   label: "Day(s)",   type: "text", placeholder: "Mon–Fri" },
          { key: "hours", label: "Hours",    type: "text", placeholder: "9:00 AM – 6:00 PM" },
        ],
      },
      { key: "note", label: "Note", type: "text", placeholder: "Closed on public holidays" },
    ],
  },

  // ── instructor ────────────────────────────────────────────────────────────
  {
    type: "instructor",
    label: "Instructor",
    icon: "GraduationCap",
    skeletonType: "text",
    fields: [
      { key: "title",       label: "Section Title", type: "text",     placeholder: "Meet your instructor" },
      { key: "name",        label: "Name",          type: "text",     placeholder: "Full name" },
      { key: "bio",         label: "Bio",           type: "textarea", placeholder: "Background and experience..." },
      { key: "image",       label: "Photo URL",     type: "text",     placeholder: "https://..." },
      { key: "credentials", label: "Credentials",  type: "text",     placeholder: "PhD, MSc, 10 years experience" },
    ],
  },

];

// ── Helper functions ─────────────────────────────────────────────────────────

/** Look up a section definition by its type key */
export function getSectionDefinition(type: string): SectionDefinition | undefined {
  return SECTION_DEFINITIONS.find(s => s.type === type);
}

/**
 * Build the initial form-data object for a list of section keys.
 * Returns { [fieldKey]: "" | [] } ready to bind to form inputs.
 */
export function buildInitialFormData(sectionKeys: string[]): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of sectionKeys) {
    const def = getSectionDefinition(key);
    if (!def) continue;
    for (const field of def.fields) {
      data[field.key] = field.type === "repeater" ? [] : "";
    }
  }
  return data;
}

/**
 * Get all section definitions for a given list of section type keys.
 * Sections not found in SECTION_DEFINITIONS are silently skipped.
 */
export function getSectionsForTemplate(sectionKeys: string[]): SectionDefinition[] {
  return sectionKeys
    .map(key => getSectionDefinition(key))
    .filter((d): d is SectionDefinition => d !== undefined);
}

/** All available section type strings */
export const ALL_SECTION_TYPES = SECTION_DEFINITIONS.map(s => s.type);
