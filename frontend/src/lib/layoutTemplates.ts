// @ts-nocheck
/**
 * Three universal, professional layout templates for the business mini-website.
 * Users pick one during onboarding. Each defines a distinct section structure
 * and accent color, rendered by BusinessProfile's SectionRenderer.
 */
export const LAYOUT_TEMPLATES = [
    {
      id: "aurora_modern",
      name: "Aurora Modern",
      desc: "Clean, spacious layout with a minimalist aesthetic. Perfect for contemporary brands.",
      accent_color: "#6366F1",
      layout_style: "modern",
      sections: [
        { type: "hero", title: "Welcome", subtitle: "Discover something exceptional", cta: "Explore Now" },
        { type: "featured_products", title: "Featured" },
        { type: "about", title: "Our Story" },
        {
          type: "features",
          title: "Why Choose Us",
          items: [
            { title: "Quality First", desc: "Crafted with attention to every detail" },
            { title: "Fast & Reliable", desc: "Built for speed and dependability" },
            { title: "Customer Focused", desc: "Your satisfaction is our priority" },
          ],
        },
        {
          type: "testimonials",
          title: "What People Say",
          items: [
            { name: "Sarah K.", text: "Absolutely love the experience — exceeded my expectations!" },
            { name: "Daniel M.", text: "Professional, reliable, and genuinely caring. Highly recommend." },
          ],
        },
        { type: "contact", title: "Get in Touch" },
      ],
    },
    {
      id: "empire_elegant",
      name: "Empire Elegant",
      desc: "Sophisticated dark-and-gold design for premium brands and luxury experiences.",
      accent_color: "#D4AF37",
      layout_style: "elegant",
      sections: [
        { type: "hero", title: "Timeless Excellence", subtitle: "Crafted for the discerning few", cta: "Discover More" },
        { type: "gallery", title: "Gallery" },
        { type: "story", title: "Our Heritage" },
        { type: "featured_products", title: "Signature Collection" },
        {
          type: "testimonials",
          title: "Client Reflections",
          items: [
            { name: "Abebe T.", text: "Elegance in every detail — a truly refined experience." },
            { name: "Lily H.", text: "Premium quality that speaks for itself." },
          ],
        },
        {
          type: "faq",
          title: "Questions",
          items: [
            { question: "What makes you different?", answer: "Our commitment to timeless quality and personal service." },
            { question: "Do you offer customization?", answer: "Yes, every experience can be tailored to your needs." },
          ],
        },
        { type: "contact", title: "Connect" },
      ],
    },
    {
      id: "bold_studio",
      name: "Bold Studio",
      desc: "Vibrant, high-energy layout that commands attention. Ideal for creative and dynamic brands.",
      accent_color: "#7C3AED",
      layout_style: "bold",
      sections: [
        { type: "hero", title: "Make Your Mark", subtitle: "Bold ideas, bold results", cta: "Get Started" },
        {
          type: "features",
          title: "What Sets Us Apart",
          items: [
            { title: "Creative Vision", desc: "We see possibilities others miss" },
            { title: "Bold Execution", desc: "We turn ideas into impact, fast" },
            { title: "Unstoppable Energy", desc: "Momentum that drives results" },
          ],
        },
        { type: "products", title: "Our Work" },
        {
          type: "services",
          title: "Services",
          items: [
            { name: "Strategy Session", description: "Define your bold direction", price: "From 2,000 ETB" },
            { name: "Creative Sprint", description: "Rapid, high-impact delivery", price: "From 8,000 ETB" },
            { name: "Full Campaign", description: "End-to-end bold transformation", price: "From 25,000 ETB" },
          ],
        },
        {
          type: "testimonials",
          title: "Happy Clients",
          items: [
            { name: "Marcus B.", text: "They brought energy and vision to our brand. Incredible!" },
            { name: "Nadia A.", text: "Bold, creative, and delivered beyond what we imagined." },
          ],
        },
        { type: "contact", title: "Let's Talk" },
      ],
    },
  ];
  
  export const getLayoutTemplateById = (id) =>
    LAYOUT_TEMPLATES.find((t) => t.id === id) || LAYOUT_TEMPLATES[0];
