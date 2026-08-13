import {
    ShoppingBag, GraduationCap, Briefcase, UtensilsCrossed,
    Palette, CalendarDays, Home, HeartPulse, LayoutGrid
  } from "lucide-react";
  
  export const BUSINESS_CATEGORIES = [
    {
      value: "shop",
      label: "Online Shop",
      icon: ShoppingBag,
      desc: "Sell physical products, retail, e-commerce",
      color: "#3B82F6",
      templates: [
        {
          id: "shop_grid",
          name: "Product Grid Store",
          desc: "Clean grid layout with featured products",
          sections: [
            { type: "hero", title: "Welcome", subtitle: "Shop our collection", cta: "Browse Products" },
            { type: "featured_products", title: "Featured Products" },
            { type: "products", title: "All Products" },
            { type: "about", title: "About Our Shop" },
            { type: "features", title: "Why Shop With Us", items: [{ icon: "truck", title: "Fast Delivery", desc: "Nationwide shipping" }, { icon: "shield", title: "Secure Payment", desc: "Protected transactions" }, { icon: "refresh", title: "Easy Returns", desc: "7-day return policy" }] },
            { type: "contact", title: "Contact Us" }
          ]
        },
        {
          id: "shop_boutique",
          name: "Boutique Store",
          desc: "Elegant single-column layout for premium brands",
          sections: [
            { type: "hero", title: "Premium Collection", subtitle: "Curated for you", cta: "Shop Now" },
            { type: "products", title: "Our Collection" },
            { type: "story", title: "Our Story" },
            { type: "testimonials", title: "Customer Love" },
            { type: "contact", title: "Visit Us" }
          ]
        },
        {
          id: "shop_marketplace",
          name: "Marketplace Pro",
          desc: "Large catalog with featured banner and categories",
          sections: [
            { type: "hero", title: "Everything You Need", subtitle: "Thousands of products at your fingertips", cta: "Start Shopping" },
            { type: "features", title: "Shop With Confidence", items: [{ title: "Quality Guaranteed", desc: "Verified sellers only" }, { title: "Best Prices", desc: "Competitive pricing" }, { title: "24/7 Support", desc: "Always here to help" }] },
            { type: "featured_products", title: "Trending Now" },
            { type: "products", title: "Browse All" },
            { type: "faq", title: "Shopping FAQ", items: [{ question: "How long does delivery take?", answer: "2-5 business days nationwide" }, { question: "What payment methods are accepted?", answer: "Cash on delivery, bank transfer, and mobile money" }] },
            { type: "contact", title: "Customer Support" }
          ]
        },
        {
          id: "shop_flash",
          name: "Flash Sale Store",
          desc: "Bold, urgent layout for promotions and deals",
          sections: [
            { type: "hero", title: "Limited Time Deals", subtitle: "Up to 70% off — today only!", cta: "Grab Deals" },
            { type: "featured_products", title: "🔥 Hot Deals" },
            { type: "products", title: "All Sale Items" },
            { type: "features", title: "Why Shop With Us", items: [{ title: "Lightning Fast", desc: "Same-day dispatch" }, { title: "Best Price", desc: "Price match guarantee" }, { title: "Secure", desc: "Safe checkout" }] },
            { type: "contact", title: "Need Help?" }
          ]
        }
      ]
    },
    {
      value: "course",
      label: "Course / Education",
      icon: GraduationCap,
      desc: "Sell online courses, coaching, training",
      color: "#8B5CF6",
      templates: [
        {
          id: "course_academy",
          name: "Course Academy",
          desc: "Full learning platform with course listings",
          sections: [
            { type: "hero", title: "Learn New Skills", subtitle: "Expert-led courses for growth", cta: "Browse Courses" },
            { type: "courses", title: "Available Courses" },
            { type: "instructor", title: "Meet Your Instructor" },
            { type: "testimonials", title: "Student Success Stories" },
            { type: "faq", title: "Frequently Asked Questions" },
            { type: "contact", title: "Get in Touch" }
          ]
        },
        {
          id: "course_coach",
          name: "Coach & Mentor",
          desc: "Personal coaching page with booking focus",
          sections: [
            { type: "hero", title: "Transform Your Life", subtitle: "1-on-1 coaching with proven results", cta: "Book a Session" },
            { type: "instructor", title: "Your Coach" },
            { type: "services", title: "Coaching Programs", items: [{ name: "1-on-1 Session", description: "60-minute private coaching call", price: "From 2,000 ETB" }, { name: "Group Workshop", description: "Join a cohort of motivated learners", price: "From 1,000 ETB" }, { name: "Mentorship Package", description: "12-week transformation program", price: "From 15,000 ETB" }] },
            { type: "testimonials", title: "Client Transformations" },
            { type: "contact", title: "Start Your Journey" }
          ]
        },
        {
          id: "course_mini",
          name: "Mini Course Landing",
          desc: "Single-product landing page optimized for conversion",
          sections: [
            { type: "hero", title: "Master a New Skill in 7 Days", subtitle: "Step-by-step video course", cta: "Enroll Now" },
            { type: "features", title: "What You'll Learn", items: [{ title: "Module 1", desc: "Foundations" }, { title: "Module 2", desc: "Core Skills" }, { title: "Module 3", desc: "Advanced Techniques" }, { title: "Module 4", desc: "Real-World Projects" }] },
            { type: "testimonials", title: "What Students Say" },
            { type: "faq", title: "Before You Enroll", items: [{ question: "Do I need experience?", answer: "No, this course starts from the basics." }, { question: "How long do I have access?", answer: "Lifetime access including future updates." }] },
            { type: "contact", title: "Questions?" }
          ]
        }
      ]
    },
    {
      value: "service",
      label: "Professional Service",
      icon: Briefcase,
      desc: "Consulting, freelancing, agency services",
      color: "#06B6D4",
      templates: [
        {
          id: "service_pro",
          name: "Service Provider",
          desc: "Showcase services with booking",
          sections: [
            { type: "hero", title: "Professional Services", subtitle: "Expert solutions for your needs", cta: "Book a Service" },
            { type: "services", title: "What We Offer" },
            { type: "process", title: "How It Works", items: [{ title: "Consult", desc: "Tell us your needs" }, { title: "Plan", desc: "We create a plan" }, { title: "Deliver", desc: "We execute flawlessly" }] },
            { type: "testimonials", title: "Client Testimonials" },
            { type: "contact", title: "Book a Consultation" }
          ]
        },
        {
          id: "service_agency",
          name: "Agency Pro",
          desc: "Corporate agency layout with team and process",
          sections: [
            { type: "hero", title: "We Build Brands", subtitle: "Creative agency for ambitious businesses", cta: "Get a Quote" },
            { type: "services", title: "Our Expertise", items: [{ name: "Branding", description: "Identity design and brand strategy", price: "From 10,000 ETB" }, { name: "Web Design", description: "Beautiful, fast websites", price: "From 25,000 ETB" }, { name: "Digital Marketing", description: "Growth-focused campaigns", price: "From 5,000 ETB/mo" }, { name: "Content Creation", description: "Photos, videos, and copy", price: "From 3,000 ETB" }] },
            { type: "process", title: "Our Process", items: [{ title: "Discover", desc: "We learn about your business" }, { title: "Design", desc: "We craft the solution" }, { title: "Deploy", desc: "We launch and optimize" }, { title: "Deliver", desc: "We measure and grow" }] },
            { type: "testimonials", title: "Trusted By" },
            { type: "team", title: "Meet the Team" },
            { type: "contact", title: "Start a Project" }
          ]
        },
        {
          id: "service_freelancer",
          name: "Freelancer Hub",
          desc: "Personal brand page for independent professionals",
          sections: [
            { type: "hero", title: "Hi, I'm Your Expert", subtitle: "Freelance services done right", cta: "Hire Me" },
            { type: "instructor", title: "About Me" },
            { type: "services", title: "Services & Rates", items: [{ name: "Quick Fix", description: "Small tasks, 24h turnaround", price: "From 500 ETB" }, { name: "Standard Project", description: "Most popular, 1-week delivery", price: "From 3,000 ETB" }, { name: "Full Project", description: "End-to-end solution", price: "From 10,000 ETB" }] },
            { type: "testimonials", title: "Client Reviews" },
            { type: "contact", title: "Let's Talk" }
          ]
        }
      ]
    },
    {
      value: "restaurant",
      label: "Restaurant / Food",
      icon: UtensilsCrossed,
      desc: "Menu, food delivery, restaurant",
      color: "#F97316",
      templates: [
        {
          id: "restaurant_menu",
          name: "Restaurant Menu",
          desc: "Digital menu with online ordering",
          sections: [
            { type: "hero", title: "Authentic Flavors", subtitle: "Fresh, delicious, made with love", cta: "Order Now" },
            { type: "menu", title: "Our Menu" },
            { type: "gallery", title: "Food Gallery" },
            { type: "hours", title: "Opening Hours" },
            { type: "contact", title: "Visit or Order" }
          ]
        },
        {
          id: "restaurant_delivery",
          name: "Food Delivery Hub",
          desc: "Delivery-focused layout with promo banner",
          sections: [
            { type: "hero", title: "Hot Meals, Delivered Fast", subtitle: "Order online in 2 minutes", cta: "Order Delivery" },
            { type: "features", title: "Why Order From Us", items: [{ title: "30-Min Delivery", desc: "Hot food at your door" }, { title: "Free Delivery", desc: "On orders over 500 ETB" }, { title: "Pay on Delivery", desc: "Cash or mobile money" }] },
            { type: "menu", title: "Popular Dishes" },
            { type: "gallery", title: "From Our Kitchen" },
            { type: "hours", title: "Delivery Hours" },
            { type: "contact", title: "Place Your Order" }
          ]
        },
        {
          id: "restaurant_cafe",
          name: "Café & Coffee",
          desc: "Cozy café layout with ambiance focus",
          sections: [
            { type: "hero", title: "Your Daily Grind", subtitle: "Crafted coffee & fresh bakes", cta: "See Menu" },
            { type: "menu", title: "Menu" },
            { type: "gallery", title: "Our Space" },
            { type: "story", title: "Our Coffee Story" },
            { type: "hours", title: "We're Open" },
            { type: "contact", title: "Find Us" }
          ]
        }
      ]
    },
    {
      value: "portfolio",
      label: "Creative Portfolio",
      icon: Palette,
      desc: "Designers, photographers, artists",
      color: "#EC4899",
      templates: [
        {
          id: "portfolio_gallery",
          name: "Portfolio Gallery",
          desc: "Visual showcase of creative work",
          sections: [
            { type: "hero", title: "Creative Works", subtitle: "Bringing ideas to life", cta: "View Portfolio" },
            { type: "gallery", title: "Portfolio" },
            { type: "about", title: "About the Artist" },
            { type: "services", title: "Services & Pricing" },
            { type: "contact", title: "Let's Work Together" }
          ]
        },
        {
          id: "portfolio_studio",
          name: "Creative Studio",
          desc: "Studio page with services, process, and clients",
          sections: [
            { type: "hero", title: "Design That Moves People", subtitle: "Branding, web, and visual design", cta: "Start a Project" },
            { type: "gallery", title: "Selected Work" },
            { type: "services", title: "What We Do", items: [{ name: "Brand Identity", description: "Logo, colors, guidelines", price: "From 8,000 ETB" }, { name: "Web Design", description: "Responsive, beautiful sites", price: "From 20,000 ETB" }, { name: "Photography", description: "Product & lifestyle shoots", price: "From 3,000 ETB" }] },
            { type: "process", title: "How We Work", items: [{ title: "Brief", desc: "Understanding your vision" }, { title: "Concept", desc: "Creative exploration" }, { title: "Refine", desc: "Polishing the details" }, { title: "Deliver", desc: "Final assets ready" }] },
            { type: "testimonials", title: "Happy Clients" },
            { type: "contact", title: "Let's Create Together" }
          ]
        },
        {
          id: "portfolio_minimal",
          name: "Minimal Showcase",
          desc: "Clean, minimal layout that lets the work speak",
          sections: [
            { type: "hero", title: "Portfolio", subtitle: "A selection of recent work", cta: "" },
            { type: "gallery", title: "" },
            { type: "about", title: "About" },
            { type: "contact", title: "Contact" }
          ]
        }
      ]
    },
    {
      value: "event",
      label: "Event / Booking",
      icon: CalendarDays,
      desc: "Events, venues, ticketing",
      color: "#10B981",
      templates: [
        {
          id: "event_platform",
          name: "Event Platform",
          desc: "List and sell event tickets",
          sections: [
            { type: "hero", title: "Upcoming Events", subtitle: "Don't miss out", cta: "Browse Events" },
            { type: "events", title: "Events" },
            { type: "about", title: "About Us" },
            { type: "contact", title: "Contact" }
          ]
        },
        {
          id: "event_venue",
          name: "Venue & Booking",
          desc: "Showcase a venue for weddings and events",
          sections: [
            { type: "hero", title: "Your Perfect Event Space", subtitle: "Elegant venues for unforgettable moments", cta: "Book a Tour" },
            { type: "gallery", title: "Our Venue" },
            { type: "services", title: "Event Packages", items: [{ name: "Intimate Gathering", description: "Up to 50 guests", price: "From 25,000 ETB" }, { name: "Grand Celebration", description: "Up to 200 guests", price: "From 75,000 ETB" }, { name: "Corporate Event", description: "Conferences & meetings", price: "From 40,000 ETB" }] },
            { type: "testimonials", title: "Happy Hosts" },
            { type: "contact", title: "Check Availability" }
          ]
        },
        {
          id: "event_conference",
          name: "Conference Hub",
          desc: "Promote a conference or summit with speakers",
          sections: [
            { type: "hero", title: "Join the Summit", subtitle: "3 days of learning & networking", cta: "Register Now" },
            { type: "features", title: "What to Expect", items: [{ title: "30+ Speakers", desc: "Industry leaders" }, { title: "Workshops", desc: "Hands-on sessions" }, { title: "Networking", desc: "Connect with peers" }] },
            { type: "team", title: "Featured Speakers" },
            { type: "faq", title: "Event FAQ", items: [{ question: "Where is it held?", answer: "At the main conference center in the city" }, { question: "Is lunch included?", answer: "Yes, all tickets include lunch and refreshments" }] },
            { type: "contact", title: "Get Your Ticket" }
          ]
        }
      ]
    },
    {
      value: "realestate",
      label: "Real Estate",
      icon: Home,
      desc: "Property listings, agent services",
      color: "#0EA5E9",
      templates: [
        {
          id: "realestate_listings",
          name: "Property Listings",
          desc: "Showcase properties for sale/rent",
          sections: [
            { type: "hero", title: "Find Your Dream Home", subtitle: "Premium properties", cta: "View Listings" },
            { type: "products", title: "Featured Properties" },
            { type: "about", title: "About Our Agency" },
            { type: "testimonials", title: "Client Reviews" },
            { type: "contact", title: "Contact Agent" }
          ]
        },
        {
          id: "realestate_agent",
          name: "Agent Profile",
          desc: "Personal brand for a real estate agent",
          sections: [
            { type: "hero", title: "Your Trusted Property Advisor", subtitle: "Helping you find the perfect home", cta: "Contact Me" },
            { type: "instructor", title: "About the Agent" },
            { type: "products", title: "My Listings" },
            { type: "features", title: "Why Work With Me", items: [{ title: "10+ Years", desc: "Market expertise" }, { title: "500+ Deals", desc: "Successful closings" }, { title: "Full Service", desc: "From search to keys" }] },
            { type: "testimonials", title: "Client Stories" },
            { type: "contact", title: "Schedule a Viewing" }
          ]
        },
        {
          id: "realestate_developer",
          name: "Developer Showcase",
          desc: "Present new developments and projects",
          sections: [
            { type: "hero", title: "Building the Future", subtitle: "Premium developments across the city", cta: "Explore Projects" },
            { type: "gallery", title: "Our Projects" },
            { type: "products", title: "Available Units" },
            { type: "features", title: "Why Choose Us", items: [{ title: "Quality Build", desc: "Premium materials" }, { title: "Prime Locations", desc: "Best neighborhoods" }, { title: "Flexible Payment", desc: "Mortgage options" }] },
            { type: "contact", title: "Book a Site Visit" }
          ]
        }
      ]
    },
    {
      value: "health",
      label: "Health & Wellness",
      icon: HeartPulse,
      desc: "Clinics, fitness, wellness services",
      color: "#EF4444",
      templates: [
        {
          id: "health_clinic",
          name: "Health & Wellness",
          desc: "Book appointments, list services",
          sections: [
            { type: "hero", title: "Your Health, Our Priority", subtitle: "Expert care you can trust", cta: "Book Appointment" },
            { type: "services", title: "Our Services" },
            { type: "team", title: "Our Team" },
            { type: "hours", title: "Working Hours" },
            { type: "contact", title: "Book a Visit" }
          ]
        },
        {
          id: "health_fitness",
          name: "Fitness & Gym",
          desc: "Promote gym memberships and training programs",
          sections: [
            { type: "hero", title: "Get Fit, Stay Strong", subtitle: "Your journey to a healthier you starts here", cta: "Join Now" },
            { type: "services", title: "Membership Plans", items: [{ name: "Monthly", description: "Full gym access", price: "1,500 ETB/mo" }, { name: "Personal Training", description: "1-on-1 sessions", price: "From 500 ETB/session" }, { name: "Group Classes", description: "Yoga, HIIT, and more", price: "From 300 ETB/class" }] },
            { type: "gallery", title: "Our Facility" },
            { type: "team", title: "Meet the Trainers" },
            { type: "testimonials", title: "Member Transformations" },
            { type: "hours", title: "Gym Hours" },
            { type: "contact", title: "Start Your Free Trial" }
          ]
        },
        {
          id: "health_spa",
          name: "Spa & Wellness",
          desc: "Relaxation-focused layout for spa and beauty",
          sections: [
            { type: "hero", title: "Relax, Renew, Rejuvenate", subtitle: "Your sanctuary of calm", cta: "Book Treatment" },
            { type: "services", title: "Treatments", items: [{ name: "Massage Therapy", description: "Full body relaxation", price: "From 1,200 ETB" }, { name: "Facial Treatment", description: "Glowing skin care", price: "From 800 ETB" }, { name: "Day Spa Package", description: "Full day of pampering", price: "From 5,000 ETB" }] },
            { type: "gallery", title: "Our Space" },
            { type: "hours", title: "Spa Hours" },
            { type: "contact", title: "Reserve Your Spot" }
          ]
        }
      ]
    },
    {
      value: "other",
      label: "Other Business",
      icon: LayoutGrid,
      desc: "Custom business profile",
      color: "#6B7280",
      templates: [
        {
          id: "custom_basic",
          name: "Custom Website",
          desc: "Flexible template for any business",
          sections: [
            { type: "hero", title: "Welcome", subtitle: "Your business tagline", cta: "Learn More" },
            { type: "about", title: "About Us" },
            { type: "products", title: "What We Offer" },
            { type: "contact", title: "Contact Us" }
          ]
        },
        {
          id: "custom_landing",
          name: "Landing Page",
          desc: "Conversion-focused single-page layout",
          sections: [
            { type: "hero", title: "Your Big Idea Starts Here", subtitle: "Let's make it happen together", cta: "Get Started" },
            { type: "features", title: "What Sets Us Apart", items: [{ title: "Innovation", desc: "Fresh approaches" }, { title: "Quality", desc: "No compromises" }, { title: "Support", desc: "Always available" }] },
            { type: "testimonials", title: "What People Say" },
            { type: "faq", title: "Questions?", items: [{ question: "How do I get started?", answer: "Just reach out and we'll guide you through the process." }, { question: "What are your hours?", answer: "We're available Monday to Saturday, 9 AM to 6 PM." }] },
            { type: "contact", title: "Let's Connect" }
          ]
        },
        {
          id: "custom_community",
          name: "Community Hub",
          desc: "For clubs, organizations, and communities",
          sections: [
            { type: "hero", title: "Join Our Community", subtitle: "Connect, learn, and grow together", cta: "Become a Member" },
            { type: "about", title: "Who We Are" },
            { type: "services", title: "Membership Benefits", items: [{ name: "Events", description: "Exclusive member events" }, { name: "Resources", description: "Tools and guides" }, { name: "Network", description: "Connect with peers" }] },
            { type: "gallery", title: "Community Moments" },
            { type: "contact", title: "Join Us" }
          ]
        }
      ]
    }
  ];
  
  export const getCategoryByValue = (value) => BUSINESS_CATEGORIES.find(c => c.value === value);
  export const getTemplateById = (categoryValue, templateId) => {
    const cat = getCategoryByValue(categoryValue);
    if (!cat) return null;
    return cat.templates.find(t => t.id === templateId) || cat.templates[0];
  };
