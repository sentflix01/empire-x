
export type ShowroomSampleId = "starter" | "premium";

export interface ShowroomTemplateSample {
  id: ShowroomSampleId;
  name: string;
  desc: string;
  activeSections: string[];
  formData: Record<string, any>;
}

const titleCase = (value = "") =>
  value
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());

const baseContact = {
  location: "City, Country",
  phone: "+251 911 234 567",
  email: "hello@example.com",
  hours: "Mon-Sat 9AM-6PM",
  whatsapp: "+251911234567",
  facebook: "https://facebook.com/",
  instagram: "https://instagram.com/",
  telegram: "https://t.me/",
};

const sampleBase = (templateName: string) => {
  const name = titleCase(templateName) || "Business";
  return {
    title: name,
    subtitle: `Professional ${name.toLowerCase()} services built for trusted customers.`,
    cta: "Contact Us",
    heroBg: "#2563EB",
    heroBg2: "#7C3AED",
    aboutTitle: `About ${name}`,
    aboutDesc: `${name} helps customers get reliable products, clear service, and fast support through Nodbusiness.`,
    galleryTitle: "Gallery",
    galleryImages: [],
    itemsTitle: "Featured Offers",
    items: [
      { name: "Starter Offer", desc: "A simple entry package for new customers", price: "From $10", icon: "fa-box" },
      { name: "Best Value", desc: "Popular option with stronger value", price: "From $30", icon: "fa-star" },
      { name: "Premium Package", desc: "Complete support for serious buyers", price: "Get Quote", icon: "fa-gem" },
    ],
    servTitle: "Services",
    services: [
      { name: "Consultation", desc: "Understand customer needs and recommend the right solution", price: "Free", icon: "fa-comments" },
      { name: "Delivery", desc: "Fast local delivery and clear order updates", price: "From $3", icon: "fa-truck" },
      { name: "After-Sales Support", desc: "Help customers after purchase", price: "Included", icon: "fa-headset" },
    ],
    featTitle: "Why Choose Us",
    features: [
      { name: "Trusted Service", desc: "Clear communication and reliable delivery", icon: "fa-shield-halved" },
      { name: "Fast Response", desc: "Quick replies through phone, chat, and WhatsApp", icon: "fa-bolt" },
      { name: "Quality First", desc: "Products and services checked before delivery", icon: "fa-check" },
    ],
    testTitle: "Customer Reviews",
    testimonials: [
      { quote: "Professional service and clear communication from start to finish.", author: "Satisfied Customer", role: "Verified Buyer" },
      { quote: "The team helped me choose the right option and delivered on time.", author: "Repeat Client", role: "Business Customer" },
    ],
    pricingTitle: "Packages",
    plans: [
      { name: "Basic", price: "$10", period: "", features: "Consultation, Basic support, Standard delivery" },
      { name: "Pro", price: "$30", period: "", features: "Priority support, Custom option, Faster delivery" },
      { name: "Enterprise", price: "Get Quote", period: "", features: "Bulk order, Dedicated support, Custom terms" },
    ],
    statsTitle: "By the Numbers",
    stats: [
      { value: "500+", label: "Customers served" },
      { value: "24h", label: "Average response" },
      { value: "4.8", label: "Customer rating" },
    ],
    faqTitle: "Questions",
    faqs: [
      { question: "How do I order?", answer: "Contact us from this showroom or message us through Nodbusiness." },
      { question: "Do you deliver?", answer: "Yes, delivery options are available depending on location and order size." },
    ],
    ctaTitle: "Ready to Start?",
    ctaDesc: `Talk to ${name} today and get the right solution for your needs.`,
    ctaBtn: "Send Message",
    ctaBg: "#2563EB",
    ...baseContact,
  };
};

function categorySample(templateName: string, category: string, premium = false) {
  const name = titleCase(templateName);
  const cat = category || "";
  const base = sampleBase(name);

  if (name.toLowerCase().includes("import/export")) {
    return {
      ...base,
      title: premium ? "Global Trade Partner" : "Import Export Solutions",
      subtitle: premium ? "End-to-end sourcing, customs, logistics, and trade documentation." : "Reliable sourcing, shipping, customs support, and B2B trade.",
      cta: premium ? "Request Trade Consultation" : "Get Import Quote",
      aboutDesc: "We help businesses source products, manage supplier communication, prepare documents, and coordinate import/export logistics with clear updates.",
      itemsTitle: "Trade Services",
      items: [
        { name: "Product Sourcing", desc: "Find verified suppliers and compare offers", price: "From $40", icon: "fa-magnifying-glass" },
        { name: "Customs Support", desc: "Documentation and clearance guidance", price: "Get Quote", icon: "fa-file-contract" },
        { name: "Freight Coordination", desc: "Air, sea, and land shipment planning", price: "Get Quote", icon: "fa-ship" },
      ],
      services: [
        { name: "Supplier Verification", desc: "Check supplier reliability before payment", price: "From $70", icon: "fa-shield" },
        { name: "Bulk Order Management", desc: "Coordinate purchase, inspection, and dispatch", price: "Custom", icon: "fa-boxes-stacked" },
        { name: "Export Documentation", desc: "Invoice, packing list, certificate support", price: "Get Quote", icon: "fa-passport" },
      ],
      features: [
        { name: "Verified Partners", desc: "Work with checked suppliers and logistics contacts", icon: "fa-circle-check" },
        { name: "Clear Timelines", desc: "Track sourcing, payment, shipment, and clearance stages", icon: "fa-route" },
        { name: "Business Focused", desc: "Built for wholesalers, shops, and growing importers", icon: "fa-briefcase" },
      ],
    };
  }

  if (cat.includes("Business") || cat.includes("Commerce")) {
    return {
      ...base,
      subtitle: premium ? `Premium ${name.toLowerCase()} with ordering, delivery, and business support.` : `Trusted ${name.toLowerCase()} for local customers and businesses.`,
      itemsTitle: premium ? "Best Sellers" : "Products",
      items: [
        { name: `${name} Standard`, desc: "Reliable everyday option", price: "From $16", icon: "fa-box" },
        { name: `${name} Premium`, desc: "Higher quality package", price: "From $36", icon: "fa-star" },
        { name: "Bulk Order", desc: "For shops, offices, and resellers", price: "Get Quote", icon: "fa-boxes-stacked" },
      ],
    };
  }

  if (cat.includes("Food") || cat.includes("Beverage")) {
    return {
      ...base,
      cta: premium ? "Reserve a Table" : "Order Now",
      itemsTitle: premium ? "Signature Menu" : "Menu Highlights",
      items: [
        { name: "Signature Plate", desc: "Freshly prepared customer favorite", price: "From $5", icon: "fa-utensils" },
        { name: "Family Combo", desc: "Perfect for groups and delivery", price: "From $18", icon: "fa-plate-wheat" },
        { name: "Fresh Drink", desc: "Juice, coffee, or house special", price: "From $2", icon: "fa-mug-hot" },
      ],
    };
  }

  if (cat.includes("Health") || cat.includes("Medical")) {
    return {
      ...base,
      cta: "Book Appointment",
      itemsTitle: "Care Options",
      services: [
        { name: "Consultation", desc: "Professional assessment and advice", price: "From $10", icon: "fa-stethoscope" },
        { name: "Follow-up Care", desc: "Continued support after first visit", price: "From $6", icon: "fa-calendar-check" },
        { name: "Health Package", desc: "Bundled service for better outcomes", price: "Get Quote", icon: "fa-heart-pulse" },
      ],
    };
  }

  if (cat.includes("Transport") || cat.includes("Logistics")) {
    return {
      ...base,
      cta: "Request Delivery",
      services: [
        { name: "Standard Service", desc: "Reliable scheduled transport", price: "From $3", icon: "fa-truck" },
        { name: "Express Service", desc: "Priority handling and fast delivery", price: "From $7", icon: "fa-bolt" },
        { name: "Business Contract", desc: "Recurring logistics for companies", price: "Get Quote", icon: "fa-handshake" },
      ],
    };
  }

  if (cat.includes("Education")) {
    return {
      ...base,
      cta: "Enroll Now",
      services: [
        { name: "Beginner Program", desc: "Start with strong foundations", price: "From $10", icon: "fa-book" },
        { name: "Advanced Training", desc: "Practical skill development", price: "From $30", icon: "fa-graduation-cap" },
        { name: "Private Session", desc: "Personal coaching and support", price: "Get Quote", icon: "fa-user-graduate" },
      ],
    };
  }

  return base;
}

export function getShowroomTemplateSamples(templateName: string, category: string): ShowroomTemplateSample[] {
  const starter = categorySample(templateName, category, false);
  const premium = categorySample(templateName, category, true);
  return [
    {
      id: "starter",
      name: "Starter sample",
      desc: "Clean practical layout with ready-to-edit content.",
      activeSections: ["hero", "items", "services", "features", "testimonials", "contact", "social"],
      formData: starter,
    },
    {
      id: "premium",
      name: "Premium sample",
      desc: "More complete business layout with packages, proof, and CTA.",
      activeSections: ["hero", "about", "items", "services", "pricing", "stats", "faq", "testimonials", "contact", "social"],
      formData: premium,
    },
  ];
}

export function getShowroomTemplateSample(templateName: string, category: string, sampleId: string): ShowroomTemplateSample {
  const samples = getShowroomTemplateSamples(templateName, category);
  return samples.find(sample => sample.id === sampleId) ?? samples[0];
}
