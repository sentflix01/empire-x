# Showroom Section Types — Tasks

## Status: 🔴 Not Started

## The Build Plan

The showroom system needs three interconnected pieces:
1. A **global business taxonomy** that maps any business in the world to one of 20 categories
2. A **template engine** that knows which sections each category needs and with what labels
3. A **section renderer** that displays each section type beautifully across all devices

---

## Step 1 — Global Business Taxonomy File

- [ ] Create `frontend-next/lib/showroomTaxonomy.ts`

This file is the brain. It maps the global 5-class business taxonomy down to 20 categories
that Halehame's showroom builder can handle.

```ts
export interface BusinessCategory {
  key: string;
  label: string;
  icon: string;           // Lucide icon name
  description: string;    // shown in category picker
  globalClass: {          // where this sits in the global taxonomy
    sector: '1st' | '2nd'; // which primary sector
    division: string;      // 2nd class division name
  };
  keywords: string[];     // for search: "cafe barista espresso" → restaurant
  subcategories: string[]; // 3rd/4th class examples shown to user
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    key: 'restaurant',
    label: 'Food & Dining',
    icon: 'UtensilsCrossed',
    description: 'Restaurants, cafes, bakeries, food stalls, catering services',
    globalClass: { sector: '1st', division: 'Hospitality & Tourism' },
    keywords: ['restaurant', 'cafe', 'coffee', 'bakery', 'food', 'catering', 'bar', 'grill', 'bistro', 'kitfo', 'injera', 'tej', 'tej bet'],
    subcategories: ['Restaurant', 'Café', 'Bakery', 'Bar & Nightclub', 'Catering Service', 'Food Truck', 'Fast Food', 'Juice Bar', 'Tea House'],
  },
  // ... (all 20 categories)
];
```

- [ ] All 20 categories with complete `keywords` and `subcategories` arrays
- [ ] Include Ethiopian-specific keywords (tej bet, tej, injera, habesha kemis, etc.) for local relevance
- [ ] `getCategory(key)` helper function
- [ ] `searchCategories(query)` for the wizard's category search

---

## Step 2 — Template Engine

- [ ] Create `frontend-next/lib/showroomTemplates.ts`

```ts
export interface SectionTemplate {
  type: string;          // 'items' | 'services' | 'gallery' | etc.
  title: string;         // category-specific label: "Our Menu" vs "Practice Areas"
  subtitle?: string;     // optional hint
  required: boolean;     // can user remove this section?
  defaultItems?: any[];  // pre-filled sample data
  fields: SectionField[]; // what fields this section has
  icon: string;          // display icon
}

export interface ShowroomTemplate {
  categoryKey: string;
  sections: SectionTemplate[];
  colorScheme: {
    primary: string;     // suggested brand color
    accent: string;
  };
  sampleName: string;    // "Kategna Kitchen" for restaurant
  sampleTagline: string; // "Authentic Ethiopian cuisine in the heart of Addis"
}

export const SHOWROOM_TEMPLATES: Record<string, ShowroomTemplate> = {
  restaurant: {
    categoryKey: 'restaurant',
    sections: [
      { type: 'hero', title: 'Welcome', required: true, fields: [...], icon: 'Home' },
      { type: 'items', title: 'Our Menu', required: false, fields: [
          { key: 'name', label: 'Dish Name', type: 'text', required: true },
          { key: 'price', label: 'Price (ETB)', type: 'number', required: false },
          { key: 'description', label: 'Description', type: 'textarea', required: false },
          { key: 'image', label: 'Photo', type: 'image', required: false },
          { key: 'category', label: 'Category (e.g. Starters)', type: 'text', required: false },
        ], icon: 'UtensilsCrossed' },
      // ...
    ],
  },
  // ... all 20 templates
};
```

- [ ] All 20 category templates
- [ ] Each template has 6–10 sections in logical order
- [ ] Each section has complete field definitions with type, label, required flag
- [ ] Sample data pre-filled (so the builder isn't empty on first open)

---

## Step 3 — Section Field Types

Every section field must support these input types:

- [ ] `text` — single line input
- [ ] `textarea` — multi-line rich text (with basic bold/italic)
- [ ] `number` — numeric input with currency label
- [ ] `image` — single image upload
- [ ] `images` — multiple image upload (gallery)
- [ ] `url` — URL input with validation
- [ ] `phone` — phone number with flag/country code
- [ ] `email` — email with validation
- [ ] `select` — dropdown from predefined options
- [ ] `toggle` — boolean yes/no
- [ ] `color` — color picker
- [ ] `time` — time picker (for hours section)
- [ ] `date` — date picker
- [ ] `location` — map pin picker + address

---

## Step 4 — Smart Category Wizard

The entry point when creating a new showroom. Three steps:

### Step 1: Find Your Business Category

```
[Search box: "What kind of business do you have?"]
[Type: "coffee" → shows Restaurant category highlighted]

OR browse all 20 categories as visual cards:
[Food & Dining] [Shop & Retail] [Health & Wellness] [Beauty] ...
```

- [ ] Search box with instant matching against `keywords` array
- [ ] 20 category cards in a responsive grid (icon + label + description)
- [ ] Clicking a card shows its subcategories: "This includes: Restaurant, Café, Bakery..."
- [ ] "Not sure?" → "Tell us what you do" free-text → AI categorization

### Step 2: Choose Your Business Subcategory

```
You selected: Food & Dining
[Restaurant] [Café] [Bakery] [Catering] [Bar] [Food Truck] [Other]
```

- [ ] Grid of subcategory chips (3rd/4th class specific types)
- [ ] "Other" option for any not listed
- [ ] Selecting subcategory updates the template (e.g. bakery → no menu, add "Baked Goods" items)

### Step 3: Name Your Business

```
Business name: [____________]
Your tagline:  [____________] (optional)
Primary color: [○ Blue] [○ Gold] [○ Green] [○ Purple] [○ Red] [Custom]
```

- [ ] Name required, min 2 chars
- [ ] Tagline optional
- [ ] Color picker with brand color suggestions per category
  - Restaurant → warm orange/red
  - Finance → navy blue/gold
  - Health → green/teal
  - Creative → purple/violet
- [ ] "Create Showroom" → generates template + opens builder

---

## Step 5 — Section Renderer Components

Each section type needs a **viewer component** (public showroom) and an **editor component** (builder):

### Section: Hero
- [ ] `ShowroomHero.tsx` — full-width cover, logo, name, tagline, CTA button
- [ ] Editor: cover image upload, logo upload, name, tagline, CTA text + link, overlay opacity
- [ ] Mobile: stacked layout, smaller text

### Section: Items (Menu / Products / Listings / Rooms)
- [ ] `ShowroomItems.tsx` — grid/list of items with image, name, price, description
- [ ] Layout toggle: Grid (2-4 cols) / List / Compact
- [ ] Category grouping: items grouped by their `category` field with section headings
- [ ] Editor: add/edit/remove/reorder items, drag-and-drop on desktop
- [ ] Mobile: single column, large images

### Section: Services (Treatments / Practice Areas / Solutions)
- [ ] `ShowroomServices.tsx` — services list with icon, title, description
- [ ] Layout: cards or list
- [ ] Editor: add/edit/remove services, icon picker (from Lucide set)

### Section: Gallery (Portfolio / Projects / Photos)
- [ ] `ShowroomGallery.tsx` — masonry or grid layout
- [ ] Click to open lightbox with prev/next navigation
- [ ] Editor: multi-upload, reorder, caption per image
- [ ] Mobile: 2-column grid, tap to expand

### Section: Team (Doctors / Attorneys / Instructors / Agents)
- [ ] `ShowroomTeam.tsx` — cards with photo, name, role, bio, contact
- [ ] Editor: add/remove people, role label customizable per category

### Section: Testimonials
- [ ] `ShowroomTestimonials.tsx` — carousel or grid of quotes
- [ ] Each testimonial: quote, author name, role, star rating, photo
- [ ] Auto-scroll carousel on mobile

### Section: Hours
- [ ] `ShowroomHours.tsx` — day-by-day open/close display
- [ ] "Open now" / "Closes in 2 hours" calculated live from current time
- [ ] Editor: each day toggle open/closed + time range

### Section: Pricing
- [ ] `ShowroomPricing.tsx` — plan cards side-by-side
- [ ] Highlight one plan as "Popular" or "Best Value"
- [ ] Features list with checkmarks
- [ ] CTA button per plan

### Section: Process (How It Works)
- [ ] `ShowroomProcess.tsx` — numbered steps with icon, title, description
- [ ] Linear flow: Step 1 → Step 2 → Step 3 → Step 4
- [ ] Mobile: vertical stack with connecting line

### Section: Contact
- [ ] `ShowroomContact.tsx` — phone (click-to-call), email (mailto), address, map embed
- [ ] Social links: WhatsApp, Telegram, Instagram, Facebook, TikTok, LinkedIn, Twitter
- [ ] Optional: contact form (name, email, message, send)

### Section: FAQ
- [ ] `ShowroomFAQ.tsx` — accordion Q&A list
- [ ] Smooth open/close animation
- [ ] Search within FAQs (if > 10 items)

### Section: CTA Banner
- [ ] `ShowroomCTA.tsx` — full-width colored banner with headline + button
- [ ] Use cases: "Book Now", "Get a Quote", "Donate", "Apply Now"
- [ ] Gradient background using brand colors

### Section: Social
- [ ] `ShowroomSocial.tsx` — social media links as large icon buttons
- [ ] Optional: embed latest Instagram post (via public embed API)

### Section: Locations
- [ ] `ShowroomLocations.tsx` — multiple location cards each with address + map pin
- [ ] Embedded Leaflet mini-map per location or combined map with all pins

---

## Step 6 — Mobile-First Rendering Rules

Every section must follow these mobile rules:

- [ ] `hero`: cover image max 60vh on mobile, text readable on small screens
- [ ] `items`: 1 column on ≤375px, 2 columns on 376–767px, 3+ on ≥768px
- [ ] `gallery`: 2 columns on mobile, 3 on tablet, 4 on desktop
- [ ] `team`: 1 column on mobile, 2 on tablet
- [ ] `pricing`: horizontal scroll on mobile (not stacked — keeps comparison visible)
- [ ] `process`: vertical numbered list on mobile
- [ ] `contact`: full-width buttons (phone, WhatsApp, email) easy to tap (min 48px height)
- [ ] All text: min 14px, touch targets min 44×44px

---

## Step 7 — Empty States in Builder

When a user first opens the builder, every section shows **sample data** relevant to their category:

- Restaurant `items` section → pre-filled with "Special Injera Combo - 250 ETB", "Coffee - 50 ETB"
- Law firm `services` → pre-filled with "Contract Law", "Employment Law", "Family Law"
- Tech company `pricing` → pre-filled with "Starter - $29/mo", "Pro - $99/mo", "Enterprise - Custom"

This prevents the terrifying "blank canvas" problem that kills no-code builders.

---

## Step 8 — Verify

- [ ] User can find their business category in < 10 seconds via search
- [ ] Builder opens with relevant pre-filled sections and sample data
- [ ] Can add/remove/reorder any section in < 3 taps
- [ ] All 20 category templates render correctly on mobile
- [ ] Public showroom loads in < 2s (see v1.4 public-page tasks)
- [ ] A non-technical user (coffee shop owner, no web experience) can publish in < 10 minutes
