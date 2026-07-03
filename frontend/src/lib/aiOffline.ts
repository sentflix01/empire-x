/**
 * aiOffline.ts
 * Rule-based offline AI engine for the Empire X assistant.
 * Returns an answer string if the question matches a known pattern,
 * or null if the question should be forwarded to the OpenAI API.
 */

interface Rule {
  patterns: RegExp[];
  answer: string | ((match: string) => string);
}

const RULES: Rule[] = [
  // ── Greetings ──────────────────────────────────────────────────────────────
  {
    patterns: [/^(hi|hello|hey|selam|salam|good morning|good afternoon|good evening)\b/i],
    answer: "👋 Hello! I'm the Empire X AI assistant. I can help you navigate the app, write descriptions, find products, post tasks, and more. What would you like to do today?",
  },
  {
    patterns: [/how are you|are you okay|what('s| is) up/i],
    answer: "I'm doing great, thanks for asking! 😊 Ready to help you get the most out of Empire X. What can I do for you?",
  },
  {
    patterns: [/who are you|what are you|what can you do|your name/i],
    answer: "I'm **Empire X AI** — your built-in smart assistant. I can help with:\n• Navigating the app\n• Writing product/business descriptions\n• Answering how-to questions\n• Tips for growing your business on Empire X\n\nAsk me anything!",
  },

  // ── Showroom ───────────────────────────────────────────────────────────────
  {
    patterns: [/create.*showroom|make.*showroom|build.*showroom|showroom.*create|how.*showroom/i],
    answer: "🏪 To create a Showroom:\n1. Tap **Create Showroom** in the sidebar\n2. Choose a template that fits your business category\n3. Fill in your business name, description, services/products, contact info\n4. Customise colours and sections\n5. Hit **Publish** — your showroom goes live instantly!\n\nYour showroom gets a unique link you can share on WhatsApp, social media, and anywhere else.",
  },
  {
    patterns: [/edit.*showroom|update.*showroom/i],
    answer: "To edit your showroom, go to **Showroom Studio** in the sidebar, find your showroom, and click Edit. You can update any section, change colours, reorder blocks, and republish — all changes are live immediately.",
  },
  {
    patterns: [/what is.*showroom|showroom mean|showroom feature/i],
    answer: "A Showroom is your personal business mini-website inside Empire X. It's like having a professional webpage — with your products, services, gallery, testimonials, contact info, and social links — all in one place. Share it with customers via a direct link. 🌟",
  },

  // ── Marketplace / Products ─────────────────────────────────────────────────
  {
    patterns: [/sell.*product|list.*product|add.*product|post.*product|how.*sell/i],
    answer: "🛒 To list a product:\n1. Go to **Market** → tap **+ List Product**\n2. Add a title, photos, price, category, and description\n3. Set stock quantity and condition\n4. Tap **Publish**\n\nTip: Use the **AI Generate** button on the description field to auto-write a compelling product description!",
  },
  {
    patterns: [/buy.*product|find.*product|search.*product|how.*buy/i],
    answer: "🛍️ To find products:\n1. Tap **Market** in the bottom nav\n2. Use the search bar or filter by category\n3. Tap any product to see details, reviews, and the seller's profile\n4. Add to cart and checkout — or message the seller directly.",
  },
  {
    patterns: [/product.*review|leave.*review|write.*review|how.*review/i],
    answer: "⭐ To leave a review:\n1. Go to any product detail page\n2. Scroll to the **Reviews** section at the bottom\n3. Click the stars to select your rating (1–5)\n4. Optionally add a comment\n5. Tap **Submit review**\n\nYou can edit or delete your review anytime.",
  },

  // ── Tasks / Errands ────────────────────────────────────────────────────────
  {
    patterns: [/post.*task|create.*task|add.*task|how.*task/i],
    answer: "📋 To post a task/errand:\n1. Go to **Tasks** → tap **+ Post Task**\n2. Choose the task type (delivery, grocery, document pickup, etc.)\n3. Set your offered payment, deadline, and location\n4. Submit — people nearby can bid to help you!\n\nYou'll see all bids and can accept the best one.",
  },
  {
    patterns: [/accept.*task|bid.*task|apply.*task|earn.*task/i],
    answer: "💰 To earn money from tasks:\n1. Go to **Tasks** and browse open tasks near you\n2. Tap **Apply / Bid** on any task you can complete\n3. Enter your bid amount and a message\n4. If the requester accepts your bid, the task is yours!\n\nComplete the task, get marked as done, and get paid. 🎉",
  },

  // ── Referral ───────────────────────────────────────────────────────────────
  {
    patterns: [/referral|refer.*friend|invite.*friend|referral.*code|how.*referral/i],
    answer: "🎁 The Empire X Referral Program:\n• Go to **My Account → Referral** in the sidebar\n• Copy your unique referral code or link\n• Share it with friends\n• When they sign up using your code → you earn **50 points**, they earn **20 welcome points**\n\nPoints can be used for discounts and rewards!",
  },

  // ── Wallet ─────────────────────────────────────────────────────────────────
  {
    patterns: [/wallet|top.?up|withdraw|balance|how.*pay/i],
    answer: "💳 Your Empire X Wallet:\n• Go to **My Account → Wallet**\n• **Top Up**: Add funds (connected to Chapa/Stripe in production)\n• **Withdraw**: Request a payout to your bank account\n• **History**: See all transactions\n\nYour wallet balance is used for marketplace purchases and task payments.",
  },

  // ── Messages / Chat ────────────────────────────────────────────────────────
  {
    patterns: [/send.*message|message.*someone|how.*chat|direct.*message/i],
    answer: "💬 To message someone:\n1. Tap **Chat** in the bottom nav\n2. Tap the **compose** icon to start a new conversation\n3. Search for the person by name or username\n4. Type and send!\n\nYou can also tap the message icon on any profile or product page to contact the seller/user directly.",
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  {
    patterns: [/notification|push.*notif|enable.*notif|turn on.*notif/i],
    answer: "🔔 To enable push notifications:\n1. Go to **Profile → Edit Profile**\n2. Scroll down to find the **Push Notifications** toggle\n3. Flip it on and allow the browser permission prompt\n\nYou'll get notified about likes, comments, messages, and orders — even when the app is closed!",
  },

  // ── Stories ────────────────────────────────────────────────────────────────
  {
    patterns: [/add.*story|post.*story|create.*story|how.*story/i],
    answer: "📸 To add a Story:\n1. On the Home feed, tap the **+ Add Story** hexagon\n2. Choose a photo or video from your device\n3. It uploads automatically and expires after **24 hours**\n\nStories show a countdown timer so viewers know how long they have left to watch.",
  },

  // ── Business / Profile ─────────────────────────────────────────────────────
  {
    patterns: [/create.*business|add.*business|set up.*business|business.*profile/i],
    answer: "🏢 To create a Business Profile:\n1. Go to **Profile → Edit Profile**\n2. Switch to the **Business** tab\n3. Fill in your business name, category, description, and contact info\n4. Choose a theme colour and upload a logo\n5. Save — your business profile is now live!\n\nYou can then create a Showroom, list products, and post tasks all under your business.",
  },
  {
    patterns: [/edit.*profile|update.*profile|change.*profile/i],
    answer: "✏️ To edit your profile:\n1. Tap your avatar or go to **Profile**\n2. Tap the **Edit** button\n3. Update your name, bio, headline, location, avatar, and more\n4. Tap **Save Profile**\n\nYou can also toggle your Ticker (scrolling announcement bar) from the same screen.",
  },

  // ── Search ─────────────────────────────────────────────────────────────────
  {
    patterns: [/search|find.*people|find.*product|find.*job|find.*event/i],
    answer: "🔍 Use the **Search** bar at the top of the app to find:\n• People and profiles\n• Products and services\n• Jobs and tasks\n• Events and courses\n• Showrooms\n• Hashtag posts\n\nYou can also filter by distance, price range, and date.",
  },

  // ── Points ─────────────────────────────────────────────────────────────────
  {
    patterns: [/points|earn.*points|what.*points|rewards/i],
    answer: "⭐ Empire X Points:\n• Earn **50 points** when someone uses your referral code\n• Earn **20 points** when you sign up with a referral code\n• More ways to earn points are coming soon!\n\nCheck your points balance on your **Profile** or the **Referral** page.",
  },

  // ── Events / Jobs / Courses ────────────────────────────────────────────────
  {
    patterns: [/post.*event|create.*event|add.*event/i],
    answer: "📅 To post an event:\n1. Go to **Events** in the Discover section\n2. Tap **+ Create Event**\n3. Fill in the title, date, location, description, and ticket info\n4. Publish — your event will appear in the events feed!",
  },
  {
    patterns: [/post.*job|create.*job|add.*job/i],
    answer: "💼 To post a job:\n1. Go to **Jobs** in the Discover section\n2. Tap **+ Post Job**\n3. Fill in the position, company, location, salary range, and requirements\n4. Publish — job seekers can apply directly through the app.",
  },

  // ── Nearby Map ─────────────────────────────────────────────────────────────
  {
    patterns: [/nearby|near me|close to me|location.*product|map/i],
    answer: "📍 The **Nearby Map** shows products and tasks near your location:\n1. Go to **Nearby Map** in the sidebar\n2. Tap **Locate Me** to share your location\n3. Browse tasks and products within your chosen radius (5–100 km)\n4. Tap any marker on the map for details\n\nPerfect for finding local deals and errands!",
  },

  // ── AI description ─────────────────────────────────────────────────────────
  {
    patterns: [/write.*description|generate.*description|product.*description|business.*description/i],
    answer: "✍️ To auto-generate a description with AI:\n1. When creating a **product**, **job**, or **business profile** — look for the **AI Generate** button next to the description field\n2. Make sure you've entered the title first\n3. Click **AI Generate** — a compelling description is written for you instantly!\n\nYou can edit it afterwards to add your personal touch.",
  },

  // ── Offline / connectivity ─────────────────────────────────────────────────
  {
    patterns: [/offline|no internet|no connection|works offline/i],
    answer: "📶 Empire X works in limited offline mode:\n• Previously loaded pages and content are cached\n• You can read your feed, messages, and notifications\n• Actions that require internet (posting, buying) will resume when you reconnect\n\nFor the best experience, stay connected to WiFi or mobile data.",
  },

  // ── Help / general ─────────────────────────────────────────────────────────
  {
    patterns: [/help|support|contact.*support|problem|issue|bug/i],
    answer: "🆘 Need help? Here's what you can do:\n• Use this AI assistant for instant answers\n• Check the **Settings** in your profile for account options\n• For serious issues, contact us at **support@empirex.app**\n\nWhat specific problem are you having? I'll do my best to help!",
  },
  {
    patterns: [/thank|thanks|thank you|appreciate/i],
    answer: "You're welcome! 😊 Happy to help. Is there anything else you'd like to know about Empire X?",
  },
];

/**
 * Try to answer a message using offline rules.
 * Returns an answer string if matched, null otherwise.
 */
export function offlineAnswer(message: string): string | null {
  const lower = message.toLowerCase().trim();
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(lower)) {
        return typeof rule.answer === "function" ? rule.answer(lower) : rule.answer;
      }
    }
  }
  return null;
}

/** Check if the browser is currently online */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
