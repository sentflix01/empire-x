'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';
import client from '@/api/client';

type GuideStep = { target: string; title: string; description: string };

// ── Tour ID mapping ────────────────────────────────────────────────────────────
function getTourId(pathname: string): string {
  if (pathname === '/landing' || pathname === '/') return 'LANDING';
  if (pathname === '/login') return 'LOGIN';
  if (pathname === '/register') return 'REGISTER';
  if (pathname === '/onboarding') return 'ONBOARD';
  if (pathname === '/forgot-password') return 'FORGOT';
  if (pathname === '/reset-password') return 'RESET';
  if (pathname === '/choose-account') return 'CHOOSE-ACCT';
  if (pathname === '/choose-mode') return 'CHOOSE-MODE';
  if (pathname === '/feed') return 'FEED';
  if (pathname === '/explore') return 'EXPLORE';
  if (pathname === '/search') return 'SEARCH';
  if (pathname === '/marketplace') return 'MARKETPLACE';
  if (pathname.startsWith('/products/create')) return 'PRODUCT-CREATE';
  if (pathname.startsWith('/products/edit')) return 'PRODUCT-EDIT';
  if (pathname === '/products/scan') return 'PRODUCT-SCAN';
  if (pathname.startsWith('/products/')) return 'PRODUCT-DETAIL';
  if (pathname === '/businesses') return 'BUSINESSES';
  if (pathname === '/business/create') return 'BIZ-CREATE';
  if (pathname === '/business/edit') return 'BIZ-EDIT';
  if (pathname === '/business/inventory') return 'INVENTORY';
  if (pathname === '/business/subscription/return') return 'SUB-RETURN';
  if (pathname.startsWith('/business/subscription/receipt/')) return 'SUB-RECEIPT';
  if (pathname === '/business/subscription') return 'SUBSCRIPTION';
  if (pathname === '/showrooms') return 'SHOWROOMS';
  if (pathname === '/showroom/create') return 'SHOWROOM-CREATE';
  if (pathname === '/showroom/samples') return 'SHOWROOM-SAMPLES';
  if (pathname === '/showroom/templates') return 'SHOWROOM-TEMPLATES';
  if (pathname.startsWith('/showroom/')) return 'SHOWROOM-VIEW';
  if (pathname.startsWith('/showrooms/')) return 'SHOWROOM-VIEW';
  if (pathname === '/profile/edit') return 'PROFILE-EDIT';
  if (pathname === '/profile') return 'PROFILE-OWN';
  if (pathname.startsWith('/profile/')) return 'PROFILE-OTHER';
  if (pathname.startsWith('/p/')) return 'PROFILE-PUBLIC';
  if (pathname === '/messages') return 'MESSAGES';
  if (pathname.startsWith('/messages/')) return 'CHATROOM';
  if (pathname === '/notifications') return 'NOTIFICATIONS';
  if (pathname === '/friends') return 'FRIENDS';
  if (pathname === '/orders/success') return 'ORDER-SUCCESS';
  if (pathname === '/orders/cancel') return 'ORDER-CANCEL';
  if (pathname === '/orders') return 'ORDERS';
  if (pathname.startsWith('/order/')) return 'ORDER-TOKEN';
  if (pathname === '/cart') return 'CART';
  if (pathname === '/wallet') return 'WALLET';
  if (pathname === '/bookmarks') return 'BOOKMARKS';
  if (pathname === '/nearby') return 'NEARBY';
  if (pathname.startsWith('/hashtag/')) return 'HASHTAG';
  if (pathname === '/coupons') return 'COUPONS';
  if (pathname === '/referral') return 'REFERRAL';
  if (pathname === '/scorecard') return 'SCORECARD';
  if (pathname === '/analytics') return 'ANALYTICS';
  if (pathname === '/settings') return 'SETTINGS';
  if (pathname === '/account') return 'ACCOUNT';
  if (pathname === '/privacy') return 'PRIVACY';
  if (pathname === '/admin/devops') return 'DEVOPS';
  if (pathname === '/admin') return 'ADMIN';
  return 'GENERIC';
}

// ── Copy strings ────────────────────────────────────────────────────────────
const copy = {
  en: {
    launcher: 'Page guide', next: 'Next', back: 'Back', skip: 'Skip guide', done: 'Finish',
    steps: {
      // shared / layout
      welcome:              ['Welcome to Nodbusiness',       'This short guide highlights the main areas on this page. Select Next to move through each step.'],
      header:               ['Platform header',              'The top bar stays visible on every page. Use it to go home, search, and reach notifications and your profile.'],
      navigation:           ['Platform navigation',          'Use the sidebar to move between the platform areas available to your account.'],
      mobileNavigation:     ['Mobile navigation',            'On smaller screens, use this bottom bar to reach common areas. Open More for additional links.'],
      generic:              ['Page content',                 'This is the main area for this page. Use its visible controls to continue.'],
      // landing
      landingNav:           ['Your account options',         'Create an account or sign in here. You can also change language and display preferences.'],
      landingPreferences:   ['Display preferences',          'Switch between light and dark mode, or change the app language here.'],
      landingRegister:      ['Create an account',            'Start here to get your own Nodbusiness profile, business showroom, and wallet.'],
      landingSignin:        ['Already have an account?',     'Tap Sign In to return to your feed, orders, and messages.'],
      landingActions:       ['Three ways to start',          'Create a full account, try the demo workspace, or browse as a guest — no sign-up needed.'],
      landingDemo:          ['Try the demo',                 'The demo workspace lets you explore all features with sample data. Activity stays separate from real accounts.'],
      landingGuest:         ['Browse without signing in',    'See public businesses and the marketplace as a guest. Sign up later to like, follow, and buy.'],
      landingStats:         ["What's included",              'Six merchant tools, 27+ showroom templates, a 24/7 AI assistant, and one connected platform.'],
      landingModules:       ['All tools in one place',       'Every card is a platform module — Feed, Marketplace, Showrooms, Wallet, Messaging, and AI.'],
      landingCta:           ['Ready to start?',              'Create your account now to unlock the full platform. It takes under a minute.'],
      // auth
      registerPage:         ['Create your account',          'Fill in your email and choose a password to register. Or use Google for a faster sign-up.'],
      registerGoogle:       ['Sign up with Google',          'The fastest option — one tap links your Google account with no password needed.'],
      registerEmail:        ['Email field',                  'Enter the email address you want linked to your account.'],
      registerPassword:     ['Choose a password',            'Pick a strong password. It must match the confirm field below.'],
      registerConfirm:      ['Confirm your password',        'Re-enter the same password to make sure it is correct.'],
      registerTerms:        ['Terms of Service',             'Tick this box to agree before your account can be created.'],
      registerSubmit:       ['Create your account',          'Tap this button to submit. A verification code will be sent to your email.'],
      registerOtp:          ['Verify your email',            'Enter the 6-digit code we emailed you. It expires in a few minutes.'],
      registerResend:       ["Didn't get the code?",         'Tap Resend after the countdown to receive a new verification code.'],
      loginGoogle:          ['Sign in with Google',          'The quickest way in — one tap and you are back in your account.'],
      loginEmail:           ['Email address',                'Enter the email you used when you registered.'],
      loginPassword:        ['Your password',                'Enter your password. Tap the eye icon to reveal it if needed.'],
      loginForgot:          ['Forgot your password?',        'Tap here to receive a reset link by email.'],
      loginSubmit:          ['Log in',                       'Tap to sign in and go to your Feed.'],
      loginRegisterLink:    ['New here?',                    'No account yet? Tap Create Account to register for free.'],
      onboardWelcome:       ["You're in — welcome!",         'This quick setup helps Nodbusiness personalise your experience. It only takes a moment.'],
      onboardName:          ['Your display name',            'This is how other users will see you across the platform.'],
      onboardType:          ['Personal or Business?',        'Choose Personal to browse and buy, or Business to sell and create a showroom.'],
      onboardContinue:      ['Continue to your Feed',        'Tap Continue when you are ready. You can update everything later in Settings.'],
      // feed
      feedBanner:           ['Build a showroom',             'Tap Get Started to create a mini website for your business — pick a template and go live in minutes.'],
      feedContent:          ['Nodbusiness announcements',    'Platform news scrolls here. Tap × to hide it, or the eye icon to bring it back.'],
      feedGuestBanner:      ['Browsing as a guest',          'Sign up for free to like posts, follow businesses, and place orders.'],
      feedFilters:          ['Filter your feed',             'Switch between For You, Nearby, Following, and Trending to change which posts you see.'],
      feedRefresh:          ['Refresh the feed',             'Tap this button to load the latest posts from scratch.'],
      feedPosts:            ['Posts from your network',      'Scroll down to browse posts. Like, comment, share, or bookmark any post with the icons below each one.'],
      feedCreatePost:       ['Share something',              'Tap here to write a post, add photos, or share a product to your feed.'],
      feedEnd:              ['Feed tour complete',           'Explore the sidebar to visit Marketplace, Messages, or your Profile.'],
      // marketplace
      marketplaceHeading:   ['The Marketplace',              'Browse and buy products from local sellers all in one place.'],
      marketplaceSearch:    ['Find a product',               'Type a product name or keyword to narrow the list instantly.'],
      marketplaceCategories:['Browse by category',           'Tap a category chip to filter products by type. Tap All to reset.'],
      marketplaceProducts:  ['Product cards',                'Each card shows the price and seller. Tap a card to see full details and buy.'],
      marketplaceEnd:       ['Marketplace done',             'Tap any product to open the detail page, add to cart, or contact the seller.'],
      // search
      searchInput:          ['Search anything',              'Enter a name, product, showroom, or hashtag to find matches across the platform.'],
      searchTabs:           ['Filter by type',               'Choose People, Products, Showrooms, or Posts to focus your results.'],
      searchResults:        ['Your results',                 'Tap any result to open it. Results update as you type.'],
      searchEmpty:          ['No results yet',               "If nothing appears, check the spelling or try a different filter tab."],
      // profile
      profileHeader:        ['Your profile',                 'Your name, avatar, and cover photo appear here. These are visible to everyone on the platform.'],
      profileAvatar:        ['Profile photo',                'This is your public avatar. Tap Edit Profile to change it.'],
      profileVerified:      ['Verified badge',               'This badge shows your account is verified by Nodbusiness.'],
      profileViewToggle:    ['Switch views',                 'Toggle between your Personal and Business profiles. Each has its own posts and showrooms.'],
      profilePersonalTab:   ['Personal profile',             'Your personal posts, followers, and following count live here.'],
      profileBusinessTab:   ['Business profile',             'Your registered businesses and their showrooms are listed here.'],
      profileEditBtn:       ['Edit your profile',            'Tap Edit to update your name, bio, location, and photo.'],
      profileCreateShowroom:['Add a showroom',               'Tap the + button to create a new showroom for one of your businesses.'],
      profileEnd:           ['Profile tour done',            'Visit Settings to manage privacy, security, and notification preferences.'],
      // profile edit
      profileEditAvatar:    ['Profile photo',                'Tap the avatar to upload a new photo. Recommended size: 400 × 400 px.'],
      profileEditCover:     ['Cover image',                  'The cover appears at the top of your profile. Landscape images work best.'],
      profileEditName:      ['Display name',                 'This is the name everyone sees on your posts and profile.'],
      profileEditBio:       ['Bio',                          'Write a short description of who you are or what your business does.'],
      profileEditLocation:  ['Location',                     'Adding a city helps local customers find you in Nearby searches.'],
      profileEditTicker:    ['Profile ticker',               'Turn on a scrolling announcement on your profile — great for promotions.'],
      profileEditEnd:       ['Profile edit done',            'Tap Save to apply your changes. They appear on your profile immediately.'],
      // orders
      ordersHeader:         ['Your orders',                  'Every order you placed or received as a seller appears here.'],
      ordersTabs:           ['Buyer and seller tabs',        'Switch between orders you placed and orders you received.'],
      ordersList:           ['Order cards',                  'Each card shows the product, status badge, and order date. Tap a card to expand it.'],
      ordersStatusBadge:    ['Order status',                 'Colours tell you the order state — yellow for pending, green for paid, red for cancelled.'],
      ordersDetailExpand:   ['Order details',                'Expanding an order shows item breakdown, delivery address, and available actions.'],
      ordersInvoiceBtn:     ['Download invoice',             'Tap the invoice icon to download a PDF receipt for any completed order.'],
      ordersReturnBtn:      ['Request a return',             'If something is wrong, tap Return to start a return or refund request.'],
      ordersSellerActions:  ['Seller controls',              'As a seller, confirm, process, ship, or mark orders as delivered from this panel.'],
      ordersDeliveryTimeline:['Delivery timeline',           'Track where the shipment is — sellers add updates and buyers see them in real time.'],
      ordersEnd:            ['Orders tour done',             'Open the Wallet tour to see payment history and manage your balance.'],
      // wallet
      walletBalance:        ['Your wallet balance',          'This is the amount available to spend or transfer in your Nodbusiness wallet.'],
      walletCurrency:       ['Currency display',             'Your balance is shown in ETB (Ethiopian Birr) by default.'],
      walletTransactions:   ['Transaction history',          'Every incoming and outgoing payment is listed here with date and status.'],
      walletFilter:         ['Filter transactions',          'Filter by date, type, or status to find a specific payment.'],
      walletTopup:          ['Add funds',                    'Top up your wallet with Stripe or Chapa using the Add Funds button.'],
      walletPayout:         ['Withdraw funds',               'Move your wallet balance to a bank account or mobile money with Withdraw.'],
      walletEnd:            ['Wallet tour done',             'Use your wallet balance at checkout in the Marketplace or to pay for subscriptions.'],
      // messages
      messagesHeader:       ['Your messages',                'All your direct conversations appear here, newest first.'],
      messagesList:         ['Conversation list',            'Tap any conversation to open it and see the full message history.'],
      messagesSearch:       ['Search conversations',         'Type a name to quickly find a specific conversation.'],
      messagesNew:          ['Start a conversation',         'Tap the compose button to message any user or business directly.'],
      messagesEnd:          ['Messages done',                'Open a conversation to see the Chat Room tour for sending messages and files.'],
      // chat room
      chatHeader:           ['Conversation header',          "The other person's name and online status appear here. Tap their name to view their profile."],
      chatMessages:         ['Message thread',               'Your messages appear on the right; theirs on the left. Scroll up to see older messages.'],
      chatInput:            ['Type a message',               'Write here and press Enter or the send button to deliver your message.'],
      chatAttachments:      ['Send a file',                  'Tap the attachment icon to share an image or file in the conversation.'],
      chatEnd:              ['Chat tour done',               'Go back to Messages to start another conversation.'],
      // notifications
      notifHeader:          ['Your notifications',           'Every alert about your account appears here — likes, comments, orders, and messages.'],
      notifList:            ['Notification list',            'Tap any notification to go directly to the related post, order, or conversation.'],
      notifUnread:          ['Unread indicator',             'Unread notifications are highlighted. Tapping one marks it as read.'],
      notifMarkAll:         ['Mark all as read',             'Tap this button to clear all unread indicators at once.'],
      notifEnd:             ['Notifications done',           'Adjust which notifications you receive in Settings → Notifications.'],
      // friends
      friendsHeader:        ['Friends and followers',        'See who follows you, who you follow, and people you might know.'],
      friendsTabs:          ['Switch tabs',                  'Toggle between Followers, Following, and Suggestions to manage your network.'],
      friendsSuggestions:   ['People you may know',          'These are accounts with mutual connections or shared interests.'],
      friendsFollowBtn:     ['Follow or unfollow',           'Tap Follow to add someone to your feed. Tap again to unfollow.'],
      friendsEnd:           ['Friends done',                 'Your following list determines who appears in the Following feed filter.'],
      // bookmarks
      bookmarksHeader:      ['Your bookmarks',               'Everything you have saved — posts, products, and showrooms — is here.'],
      bookmarksTabs:        ['Filter by type',               'Switch between Posts, Products, and Showrooms to find what you saved.'],
      bookmarksList:        ['Saved items',                  'Tap any item to open it. Tap the bookmark icon again on a post or product to remove it.'],
      bookmarksEnd:         ['Bookmarks done',               'Add bookmarks by tapping the bookmark icon on any post or product card.'],
      // explore
      exploreHeader:        ['Explore Nodbusiness',          'Discover trending posts, new businesses, and featured showrooms.'],
      exploreFeatured:      ['Featured content',             'Curated posts and businesses promoted by Nodbusiness appear at the top.'],
      exploreTrending:      ['Trending now',                 'The most-liked and shared content across the platform is shown here.'],
      exploreCategories:    ['Browse categories',            'Tap a category to filter the explore feed by business type or topic.'],
      exploreEnd:           ['Explore done',                 'Tap any hashtag in a post to open a dedicated hashtag feed.'],
      // hashtag
      hashtagHeader:        ['Hashtag feed',                 'All posts tagged with this hashtag are collected here.'],
      hashtagFollowBtn:     ['Follow this hashtag',          'Tap Follow to add posts with this tag to your main feed.'],
      hashtagPosts:         ['Tagged posts',                 'Scroll to browse. Like, comment, or share just as you would in the main feed.'],
      // nearby
      nearbyMap:            ['Nearby map',                   'The map shows businesses and products near your current location.'],
      nearbyLocate:         ['Your location',                'Tap the locate button to centre the map on where you are right now.'],
      nearbyFilters:        ['Filter nearby results',        'Choose to show Businesses, Products, or People on the map.'],
      nearbyMarker:         ['Map pins',                     'Tap a pin to see a quick preview. Tap the preview to open the full profile or product.'],
      nearbyEnd:            ['Nearby done',                  'Adjust your search radius from the filter panel to see more or fewer results.'],
      // product detail
      productImages:        ['Product photos',               'Swipe through the images to see the product from every angle.'],
      productTitle:         ['Product details',              'The name, price, and description tell you exactly what is included.'],
      productCategory:      ['Category and tags',            'Use these to find similar products in the Marketplace.'],
      productAddCart:       ['Add to cart',                  'Tap Add to Cart to save this product for checkout later.'],
      productBuyNow:        ['Buy now',                      'Tap Buy Now to go straight to checkout without saving to cart.'],
      productRequest:       ['Request pricing',              'Some products need a quote. Tap Request Price to message the seller directly.'],
      productSeller:        ['About the seller',             "See the seller's rating and tap their name to visit their profile or showroom."],
      productEnd:           ['Product tour done',            'Go to your Cart to review items and complete checkout.'],
      // cart
      cartItems:            ['Your cart',                    'Every product you have added appears here. Check quantities before proceeding.'],
      cartQuantity:         ['Adjust quantity',              'Use + and − to change how many of each item you want.'],
      cartRemove:           ['Remove an item',               'Tap the trash icon to remove a product from your cart.'],
      cartSummary:          ['Order summary',                'See the subtotal, any fees, and the final amount before you pay.'],
      cartCheckout:         ['Go to checkout',               'Tap Checkout to choose your payment method and confirm the order.'],
      cartEnd:              ['Cart tour done',               'After checkout, track your orders on the Orders page.'],
      // showrooms
      showroomsHeader:      ['Business showrooms',           'Every business with a live mini website is listed here.'],
      showroomsSearch:      ['Find a showroom',              'Type a business name or category to filter the list.'],
      showroomsGrid:        ['Showroom cards',               'Each card shows the logo, name, and category. Tap to open the full showroom.'],
      showroomsEnd:         ['Showrooms done',               'Create your own showroom from the Feed banner or Showroom Studio.'],
      // showroom view
      showroomHero:         ['Business showroom',            "This is the business's public mini website — logo, cover, and headline section."],
      showroomSections:     ['Showroom sections',            'Scroll down to see products, services, team, testimonials, and contact details.'],
      showroomProducts:     ['Products section',             'Tap any product to open its detail page and buy directly.'],
      showroomContact:      ['Contact the business',         'Tap Message to chat with the seller, or use their listed phone and address.'],
      showroomViewEnd:      ['Showroom done',                'Browse more showrooms in the Showrooms directory.'],
      // showroom create
      showroomCreateName:   ['Name your showroom',           "This becomes your business's public web address on Nodbusiness."],
      showroomCreateCategory:['Choose a category',           'Select the category that best describes your business type.'],
      showroomTemplates:    ['Pick a template',              'Templates give you a ready-made layout. Choose the one closest to your business.'],
      showroomBuilder:      ['Customise sections',           'Add, remove, or reorder sections — hero, products, team, testimonials, and more.'],
      showroomSectionEditor:['Edit a section',               'Tap any section to edit its text, images, and layout. Changes preview instantly.'],
      showroomPreview:      ['Live preview',                 'This panel shows exactly how your showroom looks to visitors.'],
      showroomPublish:      ['Publish your showroom',        'Tap Publish to make your showroom live. You can edit it any time after.'],
      showroomCreateEnd:    ['Showroom done',                'Share the link to your showroom on the Feed to reach customers immediately.'],
      // business create
      bizCreateName:        ['Business name',                'Enter the official name customers will see on your profile and showroom.'],
      bizCreateCategory:    ['Business category',            'Choose the category that best matches what your business sells or offers.'],
      bizCreateDescription: ['Description',                  'Write a short summary of your business. This appears on your profile.'],
      bizCreateLogo:        ['Business logo',                'Upload a square logo. It will appear on your showroom and product cards.'],
      bizCreateColor:       ['Theme colour',                 'Pick a colour that matches your brand. It is used across your showroom.'],
      bizCreateSubmit:      ['Create your business',         'Tap Create to register the business. You can add products and a showroom next.'],
      bizCreateEnd:         ['Business created',             'Start the Showroom Creation tour to build your mini website.'],
      // inventory
      inventoryHeader:      ['Your inventory',               'Every product you have listed for this business is shown here.'],
      inventoryAddBtn:      ['Add a product',                'Tap Add Product to list a new item in your inventory and Marketplace.'],
      inventorySearch:      ['Search products',              'Type a name to filter your product list.'],
      inventoryFilters:     ['Filter by status',             'Show all products, or filter by Active, Draft, or Out of Stock.'],
      inventoryProductCard: ['Product card',                 'Each card shows price, stock level, and status. Tap to edit or manage the product.'],
      inventoryBulkActions: ['Bulk actions',                 'Select multiple products to publish, archive, or delete them together.'],
      inventoryEnd:         ['Inventory done',               'Add your first product to make it available in the Marketplace.'],
      // product create/edit
      productCreateTitle:   ['Product name',                 'Enter a clear name that buyers will search for in the Marketplace.'],
      productCreateDesc:    ['Description',                  'Describe the product in detail. Tap the AI button to generate a draft automatically.'],
      productCreateCategory:['Category',                     'Choose the right category so buyers find this product easily.'],
      productCreateImages:  ['Product images',               'Upload up to five photos. The first image is the main listing photo.'],
      productCreatePrice:   ['Set the price',                'Enter the price buyers will pay. Leave blank to enable Request Price mode.'],
      productCreateStock:   ['Stock quantity',               'Enter how many you have available. We alert you when stock runs low.'],
      productCreatePublish: ['Publish or save draft',        'Publish makes the product live. Save as Draft hides it until you are ready.'],
      productCreateEnd:     ['Product done',                 'Your product is live in the Marketplace. Check Inventory to manage it.'],
      // product scan
      scanViewfinder:       ['Scan a product',               'Point your camera at a product barcode or QR code to find it in the Marketplace.'],
      scanTorch:            ['Torch',                        'Tap the torch button to turn on your camera light in dim conditions.'],
      scanResult:           ['Scan result',                  'When a product is found, a card appears with its name, price, and a link to the detail page.'],
      // subscription
      subHeader:            ['Nodbusiness Pro',              'Upgrade to unlock promoted posts, priority support, and advanced analytics.'],
      subFeatures:          ["What's included",              "Each plan tier lists exactly which features are unlocked with it."],
      subPlans:             ['Choose a plan',                'Select the monthly or annual plan that suits your business size. Annual saves you money.'],
      subCheckout:          ['Proceed to payment',           'Tap Subscribe to go to the secure payment screen.'],
      subEnd:               ['Subscription done',            'After payment, your Pro badge and features activate immediately.'],
      // referral
      referralCode:         ['Your referral code',           'Share this unique code with friends. When they sign up using it, both of you earn a reward.'],
      referralCopy:         ['Copy your link',               'Tap Copy to copy your personal referral link to share anywhere.'],
      referralStats:        ['Referral stats',               'See how many people signed up using your code and the rewards you have earned.'],
      referralShare:        ['Share with friends',           'Use the share buttons to send your link via WhatsApp, Telegram, or any app.'],
      // scorecard
      scorecardScore:       ['Your score',                   'Your Nodbusiness score reflects how active and engaged you are on the platform.'],
      scorecardStreak:      ['Activity streak',              'Log in and take actions every day to build and maintain your streak.'],
      scorecardBadges:      ['Earned badges',                'Badges are awarded for reaching milestones. Tap a badge to see how you earned it.'],
      scorecardMilestones:  ['Next milestones',              'See what actions you need to take to earn your next badge or level up.'],
      scorecardEnd:         ['Scorecard done',               'Share your badges on the Feed to let your network know about your achievements.'],
      // coupons
      couponsHeader:        ['Coupons and discounts',        'Create promo codes that buyers enter at checkout for a discount.'],
      couponsList:          ['Your coupons',                 'Active, expired, and draft coupons are listed here with their codes and usage count.'],
      couponsCreateBtn:     ['Create a coupon',              'Tap New Coupon to set a code, discount amount, and expiry date.'],
      couponsUsage:         ['Track usage',                  'See how many times each code has been used and how much discount was given.'],
      // analytics
      analyticsHeader:      ['Business analytics',           'See how your posts, showroom, and products are performing.'],
      analyticsTiles:       ['Summary numbers',              'Total views, followers, orders, and revenue at a glance.'],
      analyticsChart:       ['Growth chart',                 'The chart shows your follower and visit trends over time. Hover a point for details.'],
      analyticsTopPosts:    ['Top posts',                    'Your best-performing posts by reach and engagement are ranked here.'],
      analyticsEnd:         ['Analytics done',               'Use these insights to decide when to post and which products to promote.'],
      // settings
      settingsHeader:       ['Account settings',             'Manage everything about your account from this page.'],
      settingsEmail:        ['Email address',                'Your login email is shown here. Contact support to change it.'],
      settingsPassword:     ['Change password',              'Update your password here. You will need to confirm your current one first.'],
      settingsLanguage:     ['Language',                     'Switch between English and Amharic. The change applies immediately.'],
      settingsTheme:        ['Theme',                        "Choose light or dark mode, or follow your device's system setting."],
      settingsNotifications:['Notification preferences',     'Choose which activity types send you a notification or an email.'],
      settingsDanger:       ['Danger zone',                  'Delete your account permanently here. This action cannot be undone.'],
      settingsEnd:          ['Settings done',                'Visit Privacy and Security to manage who can see your content.'],
      // privacy
      privacyHeader:        ['Privacy and security',         'Control who sees your profile and how your data is used.'],
      privacyVisibility:    ['Profile visibility',           'Set your profile to Public or Private. Private profiles are only visible to followers.'],
      privacyBlocked:       ['Blocked users',                'Accounts you have blocked cannot see your profile or message you.'],
      privacyExport:        ['Export your data',             'Download a copy of all your account data at any time.'],
      privacyEnd:           ['Privacy done',                 'Your changes are saved automatically.'],
      // admin
      adminHeader:          ['Admin dashboard',              'Platform-wide controls for users, content, feature flags, and system health.'],
      adminStats:           ['Platform stats',               'Total users, active businesses, daily orders, and system status at a glance.'],
      adminUsers:           ['User management',              'Search, view, suspend, or delete any user account from this table.'],
      adminFlags:           ['Feature flags',                'Enable or disable platform features for all users or specific rollout percentages.'],
      adminModeration:      ['Content moderation',           'Review reported posts and take action — approve, remove, or escalate.'],
      // devops
      devopsHeader:         ['DevOps live feed',             'Real-time server errors, warnings, and events stream here as they happen.'],
      devopsErrors:         ['Error log',                    'Each entry shows the error type, route, and timestamp. Tap to see the full stack trace.'],
      devopsHealth:         ['Health checks',                'Service status for the API, database, Redis, and storage are shown here.'],
    },
  },
  am: {
    launcher: 'የገጽ መመሪያ', next: 'ቀጣይ', back: 'ተመለስ', skip: 'መመሪያውን ዝለል', done: 'ጨርስ',
    steps: {
      welcome:              ['ወደ Nodbusiness እንኳን በደህና መጡ', 'ይህ አጭር መመሪያ በዚህ ገጽ ያሉ ዋና ክፍሎችን ያሳያል። ወደ ቀጣዩ ለመሄድ "ቀጣይ"ን ይምረጡ።'],
      header:               ['የመድረኩ ራስጌ',            'ወደ መነሻ ገጽ ለመመለስና የተለመዱ እርምጃዎችን ለማግኘት ራስጌውን ይጠቀሙ።'],
      navigation:           ['የመድረክ አሰሳ',            'ለመለያዎ የሚገኙ የመድረኩን ክፍሎች ለመክፈት አሰሳውን ይጠቀሙ።'],
      mobileNavigation:     ['የሞባይል አሰሳ',            'በትንንሽ ስክሪኖች ላይ ዋና ክፍሎችን ለመክፈት የታችኛውን አሰሳ ይጠቀሙ።'],
      generic:              ['የገጹ ይዘት',               'ይህ የገጹ ዋና ክፍል ነው። ለመቀጠል የሚታዩትን መቆጣጠሪያዎች ይጠቀሙ።'],
      landingNav:           ['የመለያ አማራጮች',          'እዚህ መለያ ይፍጠሩ ወይም ይግቡ። ቋንቋና የማሳያ ምርጫዎችንም መቀየር ይችላሉ።'],
      landingPreferences:   ['የማሳያ ምርጫዎች',          'ጨለማ ወይም ብርሃን ሁነታ ይምረጡ ወይም ቋንቋ ይቀይሩ።'],
      landingRegister:      ['መለያ ይፍጠሩ',             'ራስዎን ለ Nodbusiness ለመመዝገብ ይጀምሩ።'],
      landingSignin:        ['ቀደም ብለው ምዝገባ አደረጉ?',  'ወደ Feed፣ ትዕዛዞችዎ እና መልዕክቶችዎ ለመመለስ Sign In ን ይምሩ።'],
      landingActions:       ['ለመጀመር ሦስት መንገዶች',    'ሙሉ መለያ ይፍጠሩ፣ ዲሞ ቦታን ይሞክሩ ወይም ያለ ምዝገባ ያስሱ።'],
      landingDemo:          ['ዲሞን ይሞክሩ',             'ዲሞ የስሪት ቦታ ሁሉም ባህሪያትን ለማሰስ ያስችልዎታል። ወሳኝ ዳታ ከዲሞ ተለይቷል።'],
      landingGuest:         ['ሳይመዘገቡ ያስሱ',           'ወደ ሕዝባዊ ንግዶች እና ሸቀጣ ሸቀጥ ይስሱ። ለተጨማሪ ባህሪያት ኋላ ይመዝገቡ።'],
      landingStats:         ['ምን ይካተታል',              '6 የነጋዴ መሳሪያዎች፣ 27+ ቅርጸቶች፣ 24/7 AI ረዳት እና አንድ የተቀናጀ ፕላትፎርም።'],
      landingModules:       ['ሁሉም ዝዝ በአንድ ቦታ',       'እያንዳንዱ ካርድ የፕላትፎርም ሞዱል ነው — Feed, Marketplace, Showrooms, Wallet, Messaging, AI።'],
      landingCta:           ['ለመጀመር ዝግጁ ናቸሁ?',       'አሁን መለያዎን ይፍጠሩ። ከአንድ ደቂቃ ያነሰ ጊዜ ይወስዳል።'],
      registerPage:         ['መለያዎን ይፍጠሩ',            'ኢሜይልዎን ያስገቡ እና 암ኮድ ይምረጡ። ወይም Google ይጠቀሙ።'],
      registerGoogle:       ['Google ይጠቀሙ',            'ፈጣኑ አማራጭ — አንድ ጠቅ እና አዲስ ግንኙነት ተፈጠረ።'],
      registerEmail:        ['ኢሜይል አስገቡ',              'ለ Nodbusiness ሂሳብዎ ሊያገናኙ የሚፈልጉትን ኢሜይል ያስገቡ።'],
      registerPassword:     ['ምስጢር ቃል ይምረጡ',          'ጠንካራ ምስጢር ቃል ይምረጡ። ከዚህ ቀጥሎ ካለው ማረጋገጫ ጋር ይዛሙ።'],
      registerConfirm:      ['ምስጢር ቃሉን ያረጋግጡ',        'ትክክለኛ ምስጢር ቃሉን እንደ ያዘ ሌላ ጊዜ ያስገቡ።'],
      registerTerms:        ['የአጠቃቀም ደንቦች',            'ምዝገባ ከማከናወናቸው ይህን ሳጥን ምልክት ያድርጉ።'],
      registerSubmit:       ['ምዝገባ ይጨርሱ',              'ይህን ቁልፍ ሲጫኑ ለኢሜይልዎ ሁለተኛ ማረጋገጫ ኮድ ይላካል።'],
      registerOtp:          ['ኢሜይልዎን ያረጋግጡ',          'ለኢሜይልዎ የተላከውን 6 ቁጥር ያስገቡ። ኮዱ ለጥቂት ደቂቃዎች ብቻ ይሰራል።'],
      registerResend:       ['ኮዱ አልደረሰዎትም?',           'ቆጠሮ ካለቀ በኋላ Resend ን ጠቅ ያድርጉ።'],
      loginGoogle:          ['Google ይጠቀሙ',            'ፈጣኑ መንገድ — አንድ ጠቅ እና ወደ ሂሳብዎ ይገቡ።'],
      loginEmail:           ['ኢሜይል አድራሻ',              'ሲመዘገቡ የተጠቀሙትን ኢሜይል ያስገቡ።'],
      loginPassword:        ['ምስጢር ቃልዎ',               'ምስጢር ቃልዎን ያስገቡ። አስፈላጊ ከሆነ Eye icon ን ጠቅ ያድርጉ።'],
      loginForgot:          ['ምስጢር ቃሉን ረሱ?',           'ለሊንክ ይህን ጠቅ ያድርጉ። ወደ ኢሜይልዎ ይላካል።'],
      loginSubmit:          ['ይግቡ',                    'ጠቅ ያድርጉ — ወደ Feed ይሸጋገራሉ።'],
      loginRegisterLink:    ['አዲስ ናቸሁ?',               'ሂሳብ ካልፈጠሩ Create Account ን ጠቅ ያድርጉ።'],
      onboardWelcome:       ['ሰላም! ተቀበሉ',              'ይህ ፈጣን ቅርፀት ልምዳዎን ያበጃል። ጥቂት ጊዜ ይወስዳል።'],
      onboardName:          ['ስምዎ',                    'ይህ ሌሎች ተጠቃሚዎች በፕላትፎርሙ ላይ የሚያዩዎት ስም ነው።'],
      onboardType:          ['ሰው ወይም ንግድ?',            'ለግዢ እና ፍሰት Personal ይምረጡ፣ ለሽያጭ ወይም ሾውሩም Business ይምረጡ።'],
      onboardContinue:      ['ወደ Feed ይሂዱ',            'ዝግጁ ሲሆኑ Continue ን ጠቅ ያድርጉ። ሁሉንም ኋላ ማዘመን ይቻላል።'],
      feedBanner:           ['ሾውሩም ይፍጠሩ',             'ለንግድዎ ሚኒ ድረ ቤት ለመፍጠር Get Started ን ጠቅ ያድርጉ።'],
      feedContent:          ['የ Nodbusiness ማስታወቂያዎች',  'የፕላትፎርም ዜናዎች እዚህ ይሸፈናሉ። × ን ሸሽ ወይም Eye ን ጠቅ ያድርጉ።'],
      feedGuestBanner:      ['እንደ እንግዳ ያስሱ',           'ለነፃ ምዝገባ ጠቅ ያድርጉ ለተጨማሪ ባህሪያት።'],
      feedFilters:          ['Feedዎን ያጣሩ',             'ለናቸሁ፣ Nearby፣ Following እና Trending ያስሱ።'],
      feedRefresh:          ['Feedን አዘምኑ',              'ቁልፉን ጠቅ አድርጉ ለቅርብ ጊዜ ልጥፎችን ለማስወጣት።'],
      feedPosts:            ['ከኔትዎርክዎ ልጥፎች',          'ወደ ታች ስሩ። ምሳሌ፣ አስተያየት፣ አጋፋ ወይም Bookmark ያድርጉ።'],
      feedCreatePost:       ['አጋፍሩ',                   'ልጥፍ ለመፃፍ፣ ፎቶ ለማስጨመር ወይም ምርት ለማካፈል ጠቅ ያድርጉ።'],
      feedEnd:              ['Feed ጉዞ አለቀ',            'Marketplace፣ Messages ወይም Profile ለመክፈት Sidebar ን ያስሱ።'],
      marketplaceHeading:   ['ሸቀጣ ሸቀጥ',               'ሁሉም ሻጮች ምርቶቻቸውን በአንድ ቦታ ያዘጋጃሉ።'],
      marketplaceSearch:    ['ምርት ፈልጉ',                'የምርት ስም ወይም ቁልፍ ቃል ያስገቡ።'],
      marketplaceCategories:['ምድብ ሁሉ ፈልጉ',            'ምድብ ቺፕ ጠቅ ያድርጉ። "ሁሉ" ምድቦቹን ያስወዳዳሉ።'],
      marketplaceProducts:  ['ምርት ካርዶች',               'ዋጋ እና ሻጭ ይታያሉ። ለዝርዝር ካርዱን ጠቅ ያድርጉ።'],
      marketplaceEnd:       ['Marketplace ጉዞ አለቀ',     'ምርት ጠቅ አድርጉ ዝርዝር ለማየት፣ ወደ Cart ለመጨመር ወይም ሻጭ ለማናገር።'],
      searchInput:          ['ፍለጋ',                    'ሰው፣ ምርት፣ ሾውሩም ወይም ሃሽታግ ያስገቡ።'],
      searchTabs:           ['ዓይነት ያጣሩ',               'ሰዎች፣ ምርቶች፣ ሾውሩሞች ወይም ልጥፎች ይምረጡ።'],
      searchResults:        ['ውጤቶችዎ',                  'ለመክፈት ውጤቱን ጠቅ ያድርጉ። ሲጽፉ ይዘምናሉ።'],
      searchEmpty:          ['ምንም ውጤት አልተገኘም',         'ፊደሉን ያረጋግጡ ወይም ሌላ ማጣሪያ ሞክሩ።'],
      profileHeader:        ['ፕሮፋይልዎ',                 'ስምዎ፣ አቫታርዎ እና ሽፋን ፎቶዎ እዚህ ይታያሉ።'],
      profileAvatar:        ['ፕሮፋይል ፎቶ',               'ይህ ሕዝባዊ አቫታርዎ ነው። ለማስቀየር ፕሮፋይል ያርትዑ ጠቅ ያድርጉ።'],
      profileVerified:      ['የተረጋገጠ ምልክት',            'ይህ ምልክት ሂሳብዎ በ Nodbusiness መሆኑን ያሳያል።'],
      profileViewToggle:    ['ዕይታ ቀያሪ',                'ሰው እና ንግድ ፕሮፋይሎችዎ ይቀያዩ። ሁሉ ለየብቻ ልጥፎቻቸው አሏቸው።'],
      profilePersonalTab:   ['ሰዋዊ ፕሮፋይል',              'ልጥፎችዎ፣ ተከታዮችዎ እና ተከታዮቻቸዎ ቆጠሮ እዚህ ይሆናሉ።'],
      profileBusinessTab:   ['ስራ ፕሮፋይል',               'የተመዘገቡ ስራዎቻቸዎ እና ሾውሩሞቻቸዎ እዚህ ናቸው።'],
      profileEditBtn:       ['ፕሮፋይልዎን ያርትዑ',           'ስም፣ ባዮ፣ አካባቢ እና ፎቶ ለማዘዘ ያርትዑ ጠቅ ያድርጉ።'],
      profileCreateShowroom:['ሾውሩም ያክሉ',               '+ ቁልፍ ጠቅ ያድርጉ ለንግድዎ አዲስ ሾውሩም ለመፍጠር።'],
      profileEnd:           ['ፕሮፋይል ጉዞ አለቀ',           'ምስጢርነት፣ ደህንነት እና ማሳወቂያዎችን ለማስተዳደር Settings ይጎብኙ።'],
      profileEditAvatar:    ['ፕሮፋይል ፎቶ',               'አቫታሩን ጠቅ አድርጉ አዲስ ፎቶ ለመጫን። 400×400 px ሰብስቦ ያቅዱ።'],
      profileEditCover:     ['ሽፋን ምስል',                'ሽፋን ፕሮፋይልዎ ላይ ይታያል። ሰፊ ምስሎች ይሻላሉ።'],
      profileEditName:      ['ዕይታ ስም',                 'ሁሉ ይህን ስም ይዩዋቸዋል።'],
      profileEditBio:       ['ባዮ',                     'ስለ ራስዎ ወይም ንግድዎ አጭር ማብራሪያ ያስገቡ።'],
      profileEditLocation:  ['ቦታ',                     'ከተማ ማከል ቅርብ ደንበኞቸ ለ Nearby ፍለጋ ይረዳዎታቸዋል።'],
      profileEditTicker:    ['ፕሮፋይል ቲከር',              'ማስታወቂያ ለማሸብለል ያብሩ — ለሽያጭ ጥሩ ነው።'],
      profileEditEnd:       ['ፕሮፋይል ኤዲት ጉዞ አለቀ',      'ለውጦቹ ወዲያው ፕሮፋይልዎ ላይ ይታያሉ።'],
      ordersHeader:         ['ትዕዛዞችዎ',                 'አስቀምጠዋቸሁ ወይም እንደ ሻጭ የደረሳቸሁ ትዕዛዞች እዚህ ናቸው።'],
      ordersTabs:           ['ገዢ እና ሻጭ ትርዝሞች',        'ያስቀመጧቸዉ እና ያገኛቸሁ ትዕዛዞች ይቀያዩ።'],
      ordersList:           ['ትዕዛዝ ካርዶች',              'እያንዳንዱ ካርድ ምርቱ፣ ሁኔታ ምልክቱ እና ቀኑን ያሳያሉ።'],
      ordersStatusBadge:    ['ትዕዛዝ ሁኔታ',               'ቀለሞቹ ሁኔታ ያሳያሉ — ቢጫ ለ pending፣ አረንጓዴ ለ paid።'],
      ordersDetailExpand:   ['ዝርዝር ያሳዩ',               'ትዕዛዙን ሲዘረጉ ዝርዝር፣ አድራሻ እና ተቀናቃኞቹ ይታያሉ።'],
      ordersInvoiceBtn:     ['ደረሰኝ አውርዱ',              'ለፈጸሙ ትዕዛዞች PDF ደረሰኝ ለማውረድ ጠቅ ያድርጉ።'],
      ordersReturnBtn:      ['መልስ ጠይቁ',                'ችግር ካለ ለ Return ጠቅ ያድርጉ።'],
      ordersSellerActions:  ['የሻጭ ቁጥጥሮች',              'ትዕዛዙን ያረጋግጡ፣ ያሂዱ፣ ያሰጡ ወይም ያደረሱ ብሉ።'],
      ordersDeliveryTimeline:['የቡሎ መከታተያ',             'ሻጮቹ አዘምናሉ — ገዢዎቹ ሁኔታ ያዩዋቸዋሉ።'],
      ordersEnd:            ['ትዕዛዝ ጉዞ አለቀ',             'ክፍያ ታሪክ ለማየት Wallet ጎብኙ።'],
      walletBalance:        ['የWallet ቀሪ ሂሳብ',          'ለ Nodbusiness Wallet ለማውጣት ወይም ለማዛወር ያለ ገንዘብ።'],
      walletCurrency:       ['ምንዛሪ ዕይታ',               'ቀሪ ሂሳብ ETB (ብር) ሁነው ይታያሉ።'],
      walletTransactions:   ['ክፍያ ታሪክ',                'ሁሉም ክፍያዎች እዚህ ዝርዝር ናቸው።'],
      walletFilter:         ['ጣሪያ',                    'በቀን፣ ዓይነት ወይም ሁኔታ ያጣሩ።'],
      walletTopup:          ['ገንዘብ ያስጨምሩ',             'Stripe ወይም Chapa ተጠቅሞ ወደ Wallet ያስጨምሩ።'],
      walletPayout:         ['ያስወጡ',                   'ቀሪ ሂሳቡ ወደ ባንክ ወይም ሞባይል ብር ያዛውሩ።'],
      walletEnd:            ['Wallet ጉዞ አለቀ',           'Wallet ሂሳቡን ቼክ አውት ሲሉ ወይም Subscription ሲከፍሉ ይጠቀሙ።'],
      messagesHeader:       ['ስልኮቻቸዎ',                  'ሁሉም ቀጥተኛ ዕርቅ ውይይቶቻቸዎ እዚህ አሉ።'],
      messagesList:         ['ውይይት ዝርዝር',              'ሙሉ የቃለ-ጉዞ ታሪኩን ለማየት ውይይቱን ጠቅ ያድርጉ።'],
      messagesSearch:       ['ውይይቶችን ፈልጉ',            'ስም አስገብቶ ሪኮርዱን ያጣሩ።'],
      messagesNew:          ['ውይይት ጀምሩ',               'የ compose ቁልፍ ጠቅ ያድርጉ ለማናጋር።'],
      messagesEnd:          ['Messages ጉዞ አለቀ',         'Chat Room ጉዞ ለምርጥ ሲፋትሃት ለማፅናናት።'],
      chatHeader:           ['ውይይት ራስጌ',               'ሌላኛው ሰው ስም እዚህ ይታያሉ። ፕሮፋይሉን ለመክፈት ጠቅ ያድርጉ።'],
      chatMessages:         ['ዕርቅ ቃሎች',                'ያንቺ ቃሎቸ ቀኝ; ሌላኛው ሰው ቃሎቸ ግራ። ወደ ላይ ስሩ ታሪኩን ለማየት።'],
      chatInput:            ['መልዕክት ፃፉ',               'ፃፍ ወይም Enter / ላኪ ቁልፍ ጠቅ ያድርጉ።'],
      chatAttachments:      ['ፋይል ላኩ',                 'Attachment icon ጠቅ ያድርጉ ምስል ወይም ፋይል ለሌላ ሰው ለማጋራት።'],
      chatEnd:              ['Chat ጉዞ አለቀ',             'ሌላ ውይይት ለመጀመር ወደ Messages ይምለሱ።'],
      notifHeader:          ['ማሳወቂያዎችዎ',               'ሁሉም ማሳወቂያዎቸ — Likes፣ አስተያየቶቸ፣ ትዕዛዞቸ — እዚህ ናቸው።'],
      notifList:            ['ማሳወቂያ ዝርዝር',             'ለዕርምጃ ቀጥታ ለመሸጋገር ማሳወቂያውን ጠቅ ያድርጉ።'],
      notifUnread:          ['ያልተነበቡ ምልክቶች',           'ያልተነበቡ ምልክቶች ይደምቃሉ። ጠቅ ሲሉ ያነበቡ ይሆናሉ።'],
      notifMarkAll:         ['ሁሉ ያነበቡ',                'ሁሉ ምልክቶቸን ለማጽዳት ይህን ጠቅ ያድርጉ።'],
      notifEnd:             ['ማሳወቂያ ጉዞ አለቀ',           'የምርጦ ማሳወቂያዎቸን ለማስተካከል Settings ይሂዱ።'],
      friendsHeader:        ['ጓደኞቸ እና ተከታዮቸ',           'ተከታዮቸ፣ ተከታዮቻቸዎ እና ሊያውቋቸዎ የሚችሉ ሰዎች ይታያሉ።'],
      friendsTabs:          ['ትርዝሞቸ ቀያሪ',              'ተከታዮቸ፣ ተከታዮቻቸዎ እና Suggestions ይቀያዩ።'],
      friendsSuggestions:   ['ሊያውቋቸዎ ሰዎቸ',              'ሙቱዋዊ ትስስር ያላቸዎ ሰዎቸ ናቸው።'],
      friendsFollowBtn:     ['Follow ወይም Unfollow',     'Follow ጠቅ ያድርጉ Feedዎ ለማስጨመር። ለይፌ ለቀነስ ይጠቀሙ።'],
      friendsEnd:           ['Friends ጉዞ አለቀ',          'ተከታዮቻቸዎ ዝርዝር Following Feed filter ይወስናሉ።'],
      bookmarksHeader:      ['Bookmarks ዎ',              'ያቆዩ ልጥፎቸ፣ ምርቶቸ እና ሾውሩሞቸ እዚህ ናቸው።'],
      bookmarksTabs:        ['ዓይነት ያጣሩ',               'ልጥፎቸ፣ ምርቶቸ እና ሾውሩሞቸ ይቀያዩ።'],
      bookmarksList:        ['የቀዩ ዝርዝሮቸ',               'ለመክፈት ጠቅ ያድርጉ። Bookmark icon ዳግም ጠቅ ለማስወገድ።'],
      bookmarksEnd:         ['Bookmarks ጉዞ አለቀ',        'ልጥፍ ወይም ምርት ካርድ ላይ Bookmark icon ጠቅ ያድርጉ።'],
      exploreHeader:        ['Nodbusiness ያስሱ',          'ምርጥ ልጥፎቸ፣ ስራዎቸ እና ሾውሩሞቸ ያስሱ።'],
      exploreFeatured:      ['Featured ይዘቶቸ',            'ፕሮሞ ልጥፎቸ እና ስራዎቸ እዚህ ናቸው።'],
      exploreTrending:      ['Trending',                 'ፕላትፎርሙ ላይ ምርጦቸ ተሰምረዋቸዋሉ።'],
      exploreCategories:    ['ምድቦቸ ያስሱ',                'ምድብ ጠቅ ያድርጉ Feed ለማጣር።'],
      exploreEnd:           ['Explore ጉዞ አለቀ',           'Hashtag Feed ጉዞ ለሂሽታጎቸ።'],
      hashtagHeader:        ['Hashtag Feed',             'ይህ Hashtag ጋር የሚዛመዱ ሁሉ ልጥፎቸ እዚህ ናቸው።'],
      hashtagFollowBtn:     ['Hashtag ተከተሉ',             'Follow ጠቅ ያድርጉ ዋና Feed ለማምጣት።'],
      hashtagPosts:         ['የ Tag ልጥፎቸ',               'ወደ ታች ያስሱ። Like, Comment, Share ሁሉ ተደርጋሉ።'],
      nearbyMap:            ['ቅርብ ካርታ',                'ካርታ ቅርብ ስራዎቸ እና ምርቶቸ ያሳያሉ።'],
      nearbyLocate:         ['ቦታዎ',                    'አሁን ያሉ ቦታ ካርታውን ለማዕከል ጠቅ ያድርጉ።'],
      nearbyFilters:        ['ቅርብ ማጣሪያ',                'ስራዎቸ፣ ምርቶቸ ወይም ሰዎቸ ለማሳየት ይምረጡ።'],
      nearbyMarker:         ['ካርታ ፒኖቸ',                'ፒን ጠቅ ያድርጉ ዝርዝር ለማየት። ዝርዝሩን ጠቅ ፕሮፋይሉን ለማሳያ።'],
      nearbyEnd:            ['Nearby ጉዞ አለቀ',            'የፍለጋ ርቀት ለመቀየር ፊልተር ፓኔሉን ይጠቀሙ።'],
      productImages:        ['ምርት ፎቶዎቸ',               'ምርቱን ከሁሉ አቅጣጫ ለማየት ምስሎቸ ያስሱ።'],
      productTitle:         ['ዝርዝር ምርት',               'ስሙ፣ ዋጋ እና ዝርዝሩ ምን ያካትቱ ያሳያሉ።'],
      productCategory:      ['ምድብ እና ታጎቸ',              'ሌሎቸ ምርቶቸ ለማፈለግ ጠቅ ያድርጉ።'],
      productAddCart:       ['ወደ Cart ያስጨምሩ',           'ምርቱን ለኋሊ ለማቆየት ጠቅ ያድርጉ።'],
      productBuyNow:        ['አሁን ይግዙ',                 'ወደ Checkout ቀጥ ለመሄድ ጠቅ ያድርጉ።'],
      productRequest:       ['ዋጋ ይጠይቁ',                 'አንዳንዶቸ ዋጋ ያስፈልጋቸዋሉ። ሻጩ ለማናጋር Request Price ጠቅ ያድርጉ።'],
      productSeller:        ['ሻጩ ማነው',                  'Rating ያዩ፣ ፕሮፋይሉ ወይም ሾውሩሙ ለማፈለግ ስሙ ጠቅ ያድርጉ።'],
      productEnd:           ['ምርት ጉዞ አለቀ',              'ዝርዝሮቸ ያዩ። ወደ Cart ሂዱ ክፍያ ለማጠናቀቅ።'],
      cartItems:            ['Cart ዎ',                  'ያስጨምሯቸዉ ምርቶቸ ሁሉ እዚህ ናቸው።'],
      cartQuantity:         ['ብዛት ያስቀይሩ',              '+ እና − ጠቅ ያድርጉ ቁጥሩ ለመቀያየር።'],
      cartRemove:           ['ምርት ያስወግዱ',               'ምርቱን ለማስወጣት Trash icon ጠቅ ያድርጉ።'],
      cartSummary:          ['ሂሳብ ማጠቃለያ',               'Subtotal፣ ክፍያዎቸ እና ጠቅላላ ዋጋ ያዩ።'],
      cartCheckout:         ['Checkout ሂዱ',             'ክፍያ ዘዴ ለመምረጥ Checkout ጠቅ ያድርጉ።'],
      cartEnd:              ['Cart ጉዞ አለቀ',             'Checkout ካደረጉ ትዕዛዙን Orders ሲፈልጉ ያዩ።'],
      showroomsHeader:      ['ሾውሩሞቸ ዳይሬክቶሪ',           'ሕያው ሚኒ ድረ ቤት ያላቸዉ ሁሉ ስራዎቸ እዚህ ናቸው።'],
      showroomsSearch:      ['ሾውሩም ፈልጉ',               'ስራ ስም ወይም ምድብ ያስገቡ።'],
      showroomsGrid:        ['ሾውሩም ካርዶቸ',              'Logo፣ ስም እና ምድብ ያሳያሉ። ሾውሩሙ ለማከፈት ጠቅ ያድርጉ።'],
      showroomsEnd:         ['Showrooms ጉዞ አለቀ',        'ሾውሩም ለመፍጠር Feed Banner ወይም Studio ይጠቀሙ።'],
      showroomHero:         ['ሾውሩም Hero',               'ሚኒ ድረ ቤቱ Logo፣ ሽፋን እና ዝርዝር ዋና ክፍሉ።'],
      showroomSections:     ['ሾውሩም Sections',           'ምርቶቸ፣ ቡድን፣ ምስክርነቶቸ እና ያዕቀፉ ያዩ።'],
      showroomProducts:     ['ምርቶቸ Section',             'ምርቱን ዝርዝር ለማይ ጠቅ ያድርጉ — ቀጥ ያሰጡ ይቻላሉ።'],
      showroomContact:      ['ስራ ያናጉ',                 'Message ጠቅ ያድርጉ ሻጩ ለማናጋር።'],
      showroomViewEnd:      ['Showroom ጉዞ አለቀ',         'ሌሎቸ ሾውሩሞቸ ያስሱ ዳይሬክቶሪ ውስጥ።'],
      showroomCreateName:   ['ሾውሩሙን ስሙ',               'ስሙ Nodbusiness ላይ የሕዝብ ድርሳን አድራሻ ይሆናሉ።'],
      showroomCreateCategory:['ምድብ ይምረጡ',              'ስራዎ ምን እንደሚሸጥ ወይም እንደሚሰጥ ያጣምሩ።'],
      showroomTemplates:    ['Template ይምረጡ',           'Templates ዝግጁ አቀማምጦ ያቀርባሉ። ለስራዎ የቀረበ ያዩ።'],
      showroomBuilder:      ['Sections ያበጁ',            'Sections ያስጨምሩ፣ ያስወጡ ወይም ቅደም ይቀያይሩ።'],
      showroomSectionEditor:['Section ያርትዑ',             'ጽሑፉ፣ ምስሎቸ እና አቀማምጦ ለማስቀየር ጠቅ ያድርጉ።'],
      showroomPreview:      ['Live Preview',             'ፓኔሉ ጎብኚዎቸ ሾውሩሙ ያዩትን ያሳያሉ።'],
      showroomPublish:      ['ሾውሩሙ Publish ያድርጉ',       'Publish ጠቅ ያድርጉ ሕያው ለማድረግ። ኋሊ ማርትዓት ይቻላሉ።'],
      showroomCreateEnd:    ['Showroom ፈጠራ ጉዞ አለቀ',    'ሾውሩሙ ሊንክ Feed ላይ አጋሩ ደንበኞቸ ለማሳወቅ።'],
      bizCreateName:        ['ስራ ስም',                  'ዕደ ደንበኞቸ ፕሮፋይልዎ ወይም ሾውሩም ላይ የሚያዩ ስም።'],
      bizCreateCategory:    ['ስራ ምድብ',                 'ስራዎ ምን እንደሚሸጥ ወይም እንደሚሰጥ ያጣምሩ።'],
      bizCreateDescription: ['ዝርዝር',                   'አጭር ማብራሪያ ያስገቡ — ፕሮፋይልዎ ላይ ይታያሉ።'],
      bizCreateLogo:        ['ስራ Logo',                 'ካሬ Logo ይጫኑ — ሾውሩምዎ እና ምርት ካርዶቸ ላይ ይታያሉ።'],
      bizCreateColor:       ['Theme ቀለም',               'ብራንድዎ ቀለም ይምረጡ — ሾውሩሙ ላይ ይሰራሉ።'],
      bizCreateSubmit:      ['ስራ ፍጠሩ',                 'Create ጠቅ ያድርጉ። ቀጥሎ ምርት እና ሾውሩም ያክሉ።'],
      bizCreateEnd:         ['ስራ ተፈጠረ',               'Showroom ለመፍጠር Showroom Creation ጉዞ ጀምሩ።'],
      inventoryHeader:      ['ዕቃ ቋቱዎ',                  'ለዚህ ስራ ያስቀናቁዋቸዉ ሁሉ ምርቶቸ እዚህ ናቸው።'],
      inventoryAddBtn:      ['ምርት ያክሉ',                 'Add Product ጠቅ ያድርጉ አዲስ ምርት ለ Marketplace።'],
      inventorySearch:      ['ምርቶቸ ፈልጉ',               'ስም ፃፍ ዝርዝሩ ለማጣር።'],
      inventoryFilters:     ['ሁኔታ ያጣሩ',                'ሁሉ፣ Active፣ Draft ወይም Out of Stock ያሳዩ።'],
      inventoryProductCard: ['ምርት ካርድ',                 'ዋጋ፣ ክምችት እና ሁኔታ ያሳያሉ። ለማርትዓ ጠቅ ያድርጉ።'],
      inventoryBulkActions: ['ቡድን ዕርምጃዎቸ',              'ብዙ ምርቶቸ ምረጡ — Publish፣ Archive ወይም Delete።'],
      inventoryEnd:         ['Inventory ጉዞ አለቀ',        'Marketplace ለማምጣት ምርቱ ያስጨምሩ።'],
      productCreateTitle:   ['ምርት ስም',                  'ግዢዎቸ ሸቀጣ ሸቀጥ ላይ ምን ይፈልጉ ለሚለው ግልጽ ስም ያስገቡ።'],
      productCreateDesc:    ['ዝርዝር',                   'ምርቱ ዝርዝር ያስገቡ። AI ቁልፍ ሁለተኛ ጽሑፍ ያስፈጥራሉ።'],
      productCreateCategory:['ምድብ',                    'ምርቱ በቀላሉ ለሸቀጣ ሸቀጥ ያሳያሉ።'],
      productCreateImages:  ['ምርት ምስሎቸ',               'እስከ 5 ፎቶዎቸ ይጫኑ። 1ኛው ዋና ምስል ይሆናሉ።'],
      productCreatePrice:   ['ዋጋ ያዘጋጁ',               'ግዢዎቸ የሚከፍሉትን ዋጋ ያስገቡ። ባዶ ካለ Request Price ሁነት።'],
      productCreateStock:   ['ክምችት ብዛት',               'ምን ያህል ናቸዉ ያስገቡ። ዝቅ ሲል ማስጠንቀቂያ ይሰጣቸዋሉ።'],
      productCreatePublish: ['Publish ወይም Draft',        'Publish ሕያው ያደርጋሉ። Draft ዝግጁ ሲሆኑ ይሸሸጋሉ።'],
      productCreateEnd:     ['ምርት ጉዞ አለቀ',             'ምርቱ Marketplace ላይ ቀርቧል — Inventory ያስተዳድሩ።'],
      scanViewfinder:       ['ምርት ይቃኙ',                'ካሜራዎ ባርኮድ ወይም QR ኮድ ላይ ያቅዱ።'],
      scanTorch:            ['Torch',                   'ጎዶሎ ቦታ Torch ቁልፍ ጠቅ ያድርጉ ካሜራ መብራቱን ለማብራት።'],
      scanResult:           ['Scan ውጤት',               'ምርቱ ሲገኝ ስሙ፣ ዋጋ እና ሊንክ ካርድ ይታያሉ።'],
      subHeader:            ['Nodbusiness Pro',          'Promoted posts፣ ፈጣን ድጋፍ እና Analytics ለማቅናት Upgrade ያድርጉ።'],
      subFeatures:          ['ምን ያካትቱ',                'ዋጋ Tier ምን Unlock እንደሚያደርጉ ዝርዝሩ ይሰጥዎቸዋሉ።'],
      subPlans:             ['Plan ይምረጡ',              'ወርሃዊ ወይም ዓመታዊ ስምምነት ይምረጡ። ዓመቱ ይቆጥቡዎታቸዋሉ።'],
      subCheckout:          ['ወደ ክፍያ ሂዱ',             'Subscribe ጠቅ ያድርጉ ለ Secure ክፍያ ፓኔሉ ለመሸጋገር።'],
      subEnd:               ['Subscription ጉዞ አለቀ',    'ክፍያ ካደረጉ Pro ምልክቱ ወዲያው ይሰራሉ።'],
      referralCode:         ['Referral ኮዱዎ',            'ኮዱ ለጓደኞቸ አጋሩ — ሁለቱም ሲመዘገቡ ሽልማት ያገኛሉ።'],
      referralCopy:         ['ሊንኩ ቅዱ',                 'Copy ጠቅ ያድርጉ ሊንኩ ለቀጥ ለሚቀጥሉ ለሌሎቸ ለማጋራት።'],
      referralStats:        ['Referral ስታቲስቲክስ',        'ምን ያህሎቸ ሲመዘገቡ ያዩ እና ሽልማቶቸዎ።'],
      referralShare:        ['ጓደኞቸ አጋሩ',                'WhatsApp፣ Telegram ወይም ሌላ App ሊንኩ ሊጋሩ ይጠቀሙ።'],
      scorecardScore:       ['ውጤትዎ',                   'ውጤቱ ምን ያህሎቸ ፕላትፎርሙ ላይ ንቁ እንደሆኑ ያሳያሉ።'],
      scorecardStreak:      ['ቀጣይ ቆይ',                 'ዘወትር ይጠቀሙ ቀጣዩን ቅደም ለማቆየት።'],
      scorecardBadges:      ['ያሸለሙ Badges',             'Milestones ሲደርሱ Badges ያሸልሙዎቸዋሉ። ጠቅ ለዝርዝር።'],
      scorecardMilestones:  ['ቀጣዩ Milestones',           'ቀጣዩ Badge ወይም Level ለምን ማድረግ እንደሚፈልጉ ያዩ።'],
      scorecardEnd:         ['Scorecard ጉዞ አለቀ',        'Badges Feed ላይ አጋሩ ኔትዎርክዎ ያውቃቸዋሉ።'],
      couponsHeader:        ['Coupons እና ቅናሾቸ',         'ፕሮሞ ኮዶቸ ፍጠሩ — ግዢዎቸ Checkout ሲከፍሉ ያስጨምሩዋቸዋሉ።'],
      couponsList:          ['Coupons ዎ',               'Active፣ ያለፉ እና Draft Coupons ዝርዝር ናቸው።'],
      couponsCreateBtn:     ['Coupon ይፍጠሩ',             'ኮድ፣ ቅናሽ እና ማብቂያ ቀን ለማዘጋጀት New Coupon ጠቅ ያድርጉ።'],
      couponsUsage:         ['Usage ይከታተሉ',              'ምን ያህሎቸ ጊዜ ጥቅም ላይ ዋሉ እና ምን ያህሎቸ ቅናሽ ሰጠዋሉ ያዩ።'],
      analyticsHeader:      ['ስራ Analytics',             'ልጥፎቸ፣ ሾውሩሙ እና ምርቶቸ ምን ያህሎቸ ፍሬ አፈሩ ያዩ።'],
      analyticsTiles:       ['ማጠቃለያ ቁጥሮቸ',              'ጠቅ Views፣ ተከታዮቸ፣ ትዕዛዞቸ እና ገቢ ያዩ።'],
      analyticsChart:       ['ዕድገት Chart',               'ቀን ሲዘልቅ ተከታዮቸ እና ጎብኝ አዝማሚያ ያሳያሉ።'],
      analyticsTopPosts:    ['ምርጥ ልጥፎቸ',               'ምርጥ ፍሬ ያፈሩ ልጥፎቸ ደረጃ ይሰጣሉ።'],
      analyticsEnd:         ['Analytics ጉዞ አለቀ',        'ምን ጊዜ ልጥፍ ለማኖር እና ምን ምርት ለ Promote ለሚለው ያጠቀሙ።'],
      settingsHeader:       ['Account Settings',         'ሂሳብዎ ሁሉ ይህ ገጽ ላይ ያስተዳደሩ።'],
      settingsEmail:        ['ኢሜይል አድራሻ',               'ሎጊን ኢሜይልዎ እዚህ ይታያሉ።'],
      settingsPassword:     ['ምስጢር ቃሉ ቀያሪ',            'ዋናውን ምስጢር ቃሉ ካረጋገጡ አዲሱን ያስገቡ።'],
      settingsLanguage:     ['ቋንቋ',                     'አማርኛ ወይም English ይምረጡ — ወዲያው ይሰራሉ።'],
      settingsTheme:        ['Theme',                   "ብርሃን ወይም ጨለማ ሁነቱ ይምረጡ — ወይም ሲስተሙ ይቁ ያድርጉ።"],
      settingsNotifications:['ማሳወቂያ ምርጫዎቸ',             'ምን ዓይነቶቸ ማሳወቂያ ወይም ኢሜይሉ ይሰጥዎቸዋሉ ይምረጡ።'],
      settingsDanger:       ['Danger Zone',              'ሂሳብዎ ቋሚ ለመሰረዝ። ይህ ሊቀለበስ አይችልም።'],
      settingsEnd:          ['Settings ጉዞ አለቀ',          'ምስጢርነት እና ደህንነት ለ Privacy ይጎብኙ።'],
      privacyHeader:        ['ምስጢርነት እና ደህንነት',         'ፕሮፋይልዎ ማን ያያሉ እና ዳታዎ ምን ለሚሰራ ይቆጣጠሩ።'],
      privacyVisibility:    ['ፕሮፋይሉ ዕይታ',              'Public ወይም Private ይምረጡ — Private ተከታዮቸ ብቻ ያዩ።'],
      privacyBlocked:       ['ታግደዋቸዉ ሂሳቦቸ',             'ያዘጋቸዉ ሂሳቦቸ ፕሮፋይልዎ ወይም Message ማድረግ አይችሉም።'],
      privacyExport:        ['ዳታ አውርዱ',                'ሁሉ ሂሳብ ዳታዎ ቅዳ ለማውረድ ጠቅ ያድርጉ።'],
      privacyEnd:           ['Privacy ጉዞ አለቀ',           'ለውጦቹ ራሳቸው ይቀመጣሉ።'],
      adminHeader:          ['Admin Dashboard',          'ሰዎቸ፣ ይዘቶቸ፣ Feature Flags እና System Health ቁጥጥሮቸ።'],
      adminStats:           ['Platform Stats',           'ጠቅ ሰዎቸ፣ ስራዎቸ፣ ትዕዛዞቸ እና System Status ያዩ።'],
      adminUsers:           ['የሰዎቸ አስተዳደር',              'ሂሳቦቸ ፈልጉ፣ ያዩ፣ ያቁሙ ወይም ይሰርዙ።'],
      adminFlags:           ['Feature Flags',            'ፕላትፎርሙ ባህሪያቶቸ ያስሩ ወይም ያሰናክሉ።'],
      adminModeration:      ['ይዘቶቸ Moderation',          'የሪፖርት ልጥፎቸ ያዩ — ያስፈቅዱ፣ ያስወጡ ወይም ያስተላልፉ።'],
      devopsHeader:         ['DevOps Live Feed',         'ሲስተሙ Errors፣ ማስጠንቀቂያዎቸ እና ዝርዝሮቸ Real-time ናቸው።'],
      devopsErrors:         ['Error Log',                'ዓይነቱ፣ Route እና ጊዜ ያሳያሉ — Stack ለማሳየት ጠቅ ያድርጉ።'],
      devopsHealth:         ['Health Checks',            'API፣ Database፣ Redis እና Storage ሁኔቶቸ እዚህ ናቸው።'],
    },
  },
} as const;

type StepKey = keyof typeof copy.en.steps;

// ── buildSteps: all routes ─────────────────────────────────────────────────
function buildSteps(pathname: string, language: 'en' | 'am', isMobile: boolean): GuideStep[] {
  const strings = copy[language].steps;
  const make = (key: StepKey, target: string): GuideStep => ({ target, title: strings[key][0], description: strings[key][1] });
  const tourId = getTourId(pathname);

  switch (tourId) {
    case 'LANDING':
      return [
        make('landingNav',            '[data-page-guide="landing-nav"]'),
        make('landingPreferences',    '[data-page-guide="landing-preferences"]'),
        make('landingRegister',       '[data-page-guide="landing-register"]'),
        make('landingSignin',         '[data-page-guide="landing-signin"]'),
        make('landingActions',        '[data-page-guide="landing-actions"]'),
        make('landingDemo',           '[data-page-guide="landing-demo-btn"]'),
        make('landingGuest',          '[data-page-guide="landing-guest"]'),
        make('landingStats',          '[data-page-guide="landing-stats"]'),
        make('landingModules',        '[data-page-guide="landing-modules"]'),
        make('landingCta',            '[data-page-guide="landing-cta-section"]'),
      ];
    case 'REGISTER':
      return [
        make('registerPage',     '[data-page-guide="register-page"]'),
        make('registerGoogle',   '[data-page-guide="register-google"]'),
        make('registerEmail',    '[data-page-guide="register-email"]'),
        make('registerPassword', '[data-page-guide="register-password"]'),
        make('registerConfirm',  '[data-page-guide="register-confirm"]'),
        make('registerTerms',    '[data-page-guide="register-terms"]'),
        make('registerSubmit',   '[data-page-guide="register-submit"]'),
        make('registerOtp',      '[data-page-guide="register-otp"]'),
        make('registerResend',   '[data-page-guide="register-resend"]'),
      ];
    case 'LOGIN':
      return [
        make('loginGoogle',       '[data-page-guide="login-google"]'),
        make('loginEmail',        '[data-page-guide="login-email"]'),
        make('loginPassword',     '[data-page-guide="login-password"]'),
        make('loginForgot',       '[data-page-guide="login-forgot"]'),
        make('loginSubmit',       '[data-page-guide="login-submit"]'),
        make('loginRegisterLink', '[data-page-guide="login-register-link"]'),
      ];
    case 'ONBOARD':
      return [
        make('onboardWelcome',  '[data-page-guide="onboard-welcome"]'),
        make('onboardName',     '[data-page-guide="onboard-name"]'),
        make('onboardType',     '[data-page-guide="onboard-type"]'),
        make('onboardContinue', '[data-page-guide="onboard-continue"]'),
      ];
    case 'FEED':
      return [
        make('header',          '[data-page-guide="app-header"]'),
        make('feedBanner',      '[data-page-guide="feed-banner"]'),
        make('feedContent',     '[data-page-guide="feed-content"]'),
        make('feedFilters',     '[data-page-guide="feed-filters"]'),
        make('feedRefresh',     '[data-page-guide="feed-refresh"]'),
        make('feedPosts',       '[data-page-guide="feed-posts"]'),
        make('feedCreatePost',  '[data-page-guide="feed-create-post"]'),
        make('feedEnd',         '[data-page-guide="app-header"]'),
      ];
    case 'EXPLORE':
      return [
        make('exploreHeader',     '[data-page-guide="explore-header"]'),
        make('exploreFeatured',   '[data-page-guide="explore-featured"]'),
        make('exploreTrending',   '[data-page-guide="explore-trending"]'),
        make('exploreCategories', '[data-page-guide="explore-categories"]'),
        make('exploreEnd',        '[data-page-guide="explore-header"]'),
      ];
    case 'SEARCH':
      return [
        make('searchInput',   '[data-page-guide="search-input"]'),
        make('searchTabs',    '[data-page-guide="search-tabs"]'),
        make('searchResults', '[data-page-guide="search-results"]'),
        make('searchEmpty',   '[data-page-guide="search-empty"]'),
      ];
    case 'MARKETPLACE':
      return [
        make('marketplaceHeading',    '[data-page-guide="marketplace-heading"]'),
        make('marketplaceSearch',     '[data-page-guide="marketplace-search"]'),
        make('marketplaceCategories', '[data-page-guide="marketplace-categories"]'),
        make('marketplaceProducts',   '[data-page-guide="marketplace-products"]'),
        make('marketplaceEnd',        '[data-page-guide="marketplace-products"]'),
      ];
    case 'PRODUCT-DETAIL':
      return [
        make('productImages',   '[data-page-guide="product-images"]'),
        make('productTitle',    '[data-page-guide="product-title"]'),
        make('productCategory', '[data-page-guide="product-category"]'),
        make('productAddCart',  '[data-page-guide="product-add-cart"]'),
        make('productBuyNow',   '[data-page-guide="product-buy-now"]'),
        make('productRequest',  '[data-page-guide="product-request"]'),
        make('productSeller',   '[data-page-guide="product-seller"]'),
        make('productEnd',      '[data-page-guide="product-add-cart"]'),
      ];
    case 'PRODUCT-CREATE':
    case 'PRODUCT-EDIT':
      return [
        make('productCreateTitle',    '[data-page-guide="product-create-title"]'),
        make('productCreateDesc',     '[data-page-guide="product-create-desc"]'),
        make('productCreateCategory', '[data-page-guide="product-create-category"]'),
        make('productCreateImages',   '[data-page-guide="product-create-images"]'),
        make('productCreatePrice',    '[data-page-guide="product-create-price"]'),
        make('productCreateStock',    '[data-page-guide="product-create-stock"]'),
        make('productCreatePublish',  '[data-page-guide="product-create-publish"]'),
        make('productCreateEnd',      '[data-page-guide="product-create-title"]'),
      ];
    case 'PRODUCT-SCAN':
      return [
        make('scanViewfinder', '[data-page-guide="scan-viewfinder"]'),
        make('scanTorch',      '[data-page-guide="scan-torch"]'),
        make('scanResult',     '[data-page-guide="scan-result"]'),
      ];
    case 'CART':
      return [
        make('cartItems',    '[data-page-guide="cart-items"]'),
        make('cartQuantity', '[data-page-guide="cart-quantity"]'),
        make('cartRemove',   '[data-page-guide="cart-remove"]'),
        make('cartSummary',  '[data-page-guide="cart-summary"]'),
        make('cartCheckout', '[data-page-guide="cart-checkout"]'),
        make('cartEnd',      '[data-page-guide="cart-items"]'),
      ];
    case 'ORDERS':
      return [
        make('ordersHeader',          '[data-page-guide="orders-header"]'),
        make('ordersTabs',            '[data-page-guide="orders-tabs"]'),
        make('ordersList',            '[data-page-guide="orders-list"]'),
        make('ordersStatusBadge',     '[data-page-guide="orders-status-badge"]'),
        make('ordersDetailExpand',    '[data-page-guide="orders-detail-expand"]'),
        make('ordersInvoiceBtn',      '[data-page-guide="orders-invoice-btn"]'),
        make('ordersReturnBtn',       '[data-page-guide="orders-return-btn"]'),
        make('ordersSellerActions',   '[data-page-guide="orders-seller-actions"]'),
        make('ordersDeliveryTimeline','[data-page-guide="orders-delivery-timeline"]'),
        make('ordersEnd',             '[data-page-guide="orders-header"]'),
      ];
    case 'WALLET':
      return [
        make('walletBalance',      '[data-page-guide="wallet-balance"]'),
        make('walletCurrency',     '[data-page-guide="wallet-currency"]'),
        make('walletTransactions', '[data-page-guide="wallet-transactions"]'),
        make('walletFilter',       '[data-page-guide="wallet-filter"]'),
        make('walletTopup',        '[data-page-guide="wallet-topup"]'),
        make('walletPayout',       '[data-page-guide="wallet-payout"]'),
        make('walletEnd',          '[data-page-guide="wallet-balance"]'),
      ];
    case 'MESSAGES':
      return [
        make('messagesHeader', '[data-page-guide="messages-header"]'),
        make('messagesList',   '[data-page-guide="messages-list"]'),
        make('messagesSearch', '[data-page-guide="messages-search"]'),
        make('messagesNew',    '[data-page-guide="messages-new"]'),
        make('messagesEnd',    '[data-page-guide="messages-header"]'),
      ];
    case 'CHATROOM':
      return [
        make('chatHeader',      '[data-page-guide="chat-header"]'),
        make('chatMessages',    '[data-page-guide="chat-messages"]'),
        make('chatInput',       '[data-page-guide="chat-input"]'),
        make('chatAttachments', '[data-page-guide="chat-attachments"]'),
        make('chatEnd',         '[data-page-guide="chat-header"]'),
      ];
    case 'NOTIFICATIONS':
      return [
        make('notifHeader',  '[data-page-guide="notif-header"]'),
        make('notifList',    '[data-page-guide="notif-list"]'),
        make('notifUnread',  '[data-page-guide="notif-unread"]'),
        make('notifMarkAll', '[data-page-guide="notif-mark-all"]'),
        make('notifEnd',     '[data-page-guide="notif-header"]'),
      ];
    case 'FRIENDS':
      return [
        make('friendsHeader',      '[data-page-guide="friends-header"]'),
        make('friendsTabs',        '[data-page-guide="friends-tabs"]'),
        make('friendsSuggestions', '[data-page-guide="friends-suggestions"]'),
        make('friendsFollowBtn',   '[data-page-guide="friends-follow-btn"]'),
        make('friendsEnd',         '[data-page-guide="friends-header"]'),
      ];
    case 'BOOKMARKS':
      return [
        make('bookmarksHeader', '[data-page-guide="bookmarks-header"]'),
        make('bookmarksTabs',   '[data-page-guide="bookmarks-tabs"]'),
        make('bookmarksList',   '[data-page-guide="bookmarks-list"]'),
        make('bookmarksEnd',    '[data-page-guide="bookmarks-header"]'),
      ];
    case 'NEARBY':
      return [
        make('nearbyMap',     '[data-page-guide="nearby-map"]'),
        make('nearbyLocate',  '[data-page-guide="nearby-locate"]'),
        make('nearbyFilters', '[data-page-guide="nearby-filters"]'),
        make('nearbyMarker',  '[data-page-guide="nearby-marker"]'),
        make('nearbyEnd',     '[data-page-guide="nearby-map"]'),
      ];
    case 'HASHTAG':
      return [
        make('hashtagHeader',    '[data-page-guide="hashtag-header"]'),
        make('hashtagFollowBtn', '[data-page-guide="hashtag-follow-btn"]'),
        make('hashtagPosts',     '[data-page-guide="hashtag-posts"]'),
      ];
    case 'PROFILE-OWN':
      return [
        make('profileHeader',        '[data-page-guide="profile-header"]'),
        make('profileAvatar',        '[data-page-guide="profile-avatar"]'),
        make('profileVerified',      '[data-page-guide="profile-verified"]'),
        make('profileViewToggle',    '[data-page-guide="profile-view-toggle"]'),
        make('profilePersonalTab',   '[data-page-guide="profile-personal-tab"]'),
        make('profileBusinessTab',   '[data-page-guide="profile-business-tab"]'),
        make('profileEditBtn',       '[data-page-guide="profile-edit-btn"]'),
        make('profileCreateShowroom','[data-page-guide="profile-create-showroom"]'),
        make('profileEnd',           '[data-page-guide="profile-header"]'),
      ];
    case 'PROFILE-OTHER':
    case 'PROFILE-PUBLIC':
      return [
        make('profileHeader',     '[data-page-guide="profile-header"]'),
        make('profileViewToggle', '[data-page-guide="profile-view-toggle"]'),
      ];
    case 'PROFILE-EDIT':
      return [
        make('profileEditAvatar',   '[data-page-guide="profile-edit-avatar"]'),
        make('profileEditCover',    '[data-page-guide="profile-edit-cover"]'),
        make('profileEditName',     '[data-page-guide="profile-edit-name"]'),
        make('profileEditBio',      '[data-page-guide="profile-edit-bio"]'),
        make('profileEditLocation', '[data-page-guide="profile-edit-location"]'),
        make('profileEditTicker',   '[data-page-guide="profile-edit-ticker"]'),
        make('profileEditEnd',      '[data-page-guide="profile-edit-avatar"]'),
      ];
    case 'SHOWROOMS':
      return [
        make('showroomsHeader', '[data-page-guide="showrooms-header"]'),
        make('showroomsSearch', '[data-page-guide="showrooms-search"]'),
        make('showroomsGrid',   '[data-page-guide="showrooms-grid"]'),
        make('showroomsEnd',    '[data-page-guide="showrooms-grid"]'),
      ];
    case 'SHOWROOM-VIEW':
      return [
        make('showroomHero',     '[data-page-guide="showroom-hero"]'),
        make('showroomSections', '[data-page-guide="showroom-sections"]'),
        make('showroomProducts', '[data-page-guide="showroom-products"]'),
        make('showroomContact',  '[data-page-guide="showroom-contact"]'),
        make('showroomViewEnd',  '[data-page-guide="showroom-hero"]'),
      ];
    case 'SHOWROOM-CREATE':
    case 'SHOWROOM-SAMPLES':
    case 'SHOWROOM-TEMPLATES':
      return [
        make('showroomCreateName',    '[data-page-guide="showroom-create-name"]'),
        make('showroomCreateCategory','[data-page-guide="showroom-create-category"]'),
        make('showroomTemplates',     '[data-page-guide="showroom-templates"]'),
        make('showroomBuilder',       '[data-page-guide="showroom-builder"]'),
        make('showroomSectionEditor', '[data-page-guide="showroom-section-editor"]'),
        make('showroomPreview',       '[data-page-guide="showroom-preview"]'),
        make('showroomPublish',       '[data-page-guide="showroom-publish"]'),
        make('showroomCreateEnd',     '[data-page-guide="showroom-publish"]'),
      ];
    case 'BIZ-CREATE':
    case 'BIZ-EDIT':
      return [
        make('bizCreateName',        '[data-page-guide="biz-create-name"]'),
        make('bizCreateCategory',    '[data-page-guide="biz-create-category"]'),
        make('bizCreateDescription', '[data-page-guide="biz-create-description"]'),
        make('bizCreateLogo',        '[data-page-guide="biz-create-logo"]'),
        make('bizCreateColor',       '[data-page-guide="biz-create-color"]'),
        make('bizCreateSubmit',      '[data-page-guide="biz-create-submit"]'),
        make('bizCreateEnd',         '[data-page-guide="biz-create-name"]'),
      ];
    case 'INVENTORY':
      return [
        make('inventoryHeader',      '[data-page-guide="inventory-header"]'),
        make('inventoryAddBtn',      '[data-page-guide="inventory-add-btn"]'),
        make('inventorySearch',      '[data-page-guide="inventory-search"]'),
        make('inventoryFilters',     '[data-page-guide="inventory-filters"]'),
        make('inventoryProductCard', '[data-page-guide="inventory-product-card"]'),
        make('inventoryBulkActions', '[data-page-guide="inventory-bulk-actions"]'),
        make('inventoryEnd',         '[data-page-guide="inventory-header"]'),
      ];
    case 'SUBSCRIPTION':
      return [
        make('subHeader',   '[data-page-guide="sub-header"]'),
        make('subFeatures', '[data-page-guide="sub-features"]'),
        make('subPlans',    '[data-page-guide="sub-plans"]'),
        make('subCheckout', '[data-page-guide="sub-checkout-btn"]'),
        make('subEnd',      '[data-page-guide="sub-header"]'),
      ];
    case 'REFERRAL':
      return [
        make('referralCode',  '[data-page-guide="referral-code"]'),
        make('referralCopy',  '[data-page-guide="referral-copy"]'),
        make('referralStats', '[data-page-guide="referral-stats"]'),
        make('referralShare', '[data-page-guide="referral-share"]'),
      ];
    case 'SCORECARD':
      return [
        make('scorecardScore',      '[data-page-guide="scorecard-score"]'),
        make('scorecardStreak',     '[data-page-guide="scorecard-streak"]'),
        make('scorecardBadges',     '[data-page-guide="scorecard-badges"]'),
        make('scorecardMilestones', '[data-page-guide="scorecard-milestones"]'),
        make('scorecardEnd',        '[data-page-guide="scorecard-score"]'),
      ];
    case 'COUPONS':
      return [
        make('couponsHeader',   '[data-page-guide="coupons-header"]'),
        make('couponsList',     '[data-page-guide="coupons-list"]'),
        make('couponsCreateBtn','[data-page-guide="coupons-create-btn"]'),
        make('couponsUsage',    '[data-page-guide="coupons-usage"]'),
      ];
    case 'ANALYTICS':
      return [
        make('analyticsHeader',   '[data-page-guide="analytics-header"]'),
        make('analyticsTiles',    '[data-page-guide="analytics-tiles"]'),
        make('analyticsChart',    '[data-page-guide="analytics-chart"]'),
        make('analyticsTopPosts', '[data-page-guide="analytics-top-posts"]'),
        make('analyticsEnd',      '[data-page-guide="analytics-header"]'),
      ];
    case 'SETTINGS':
    case 'ACCOUNT':
      return [
        make('settingsHeader',        '[data-page-guide="settings-header"]'),
        make('settingsEmail',         '[data-page-guide="settings-email"]'),
        make('settingsPassword',      '[data-page-guide="settings-password"]'),
        make('settingsLanguage',      '[data-page-guide="settings-language"]'),
        make('settingsTheme',         '[data-page-guide="settings-theme"]'),
        make('settingsNotifications', '[data-page-guide="settings-notifications"]'),
        make('settingsDanger',        '[data-page-guide="settings-danger"]'),
        make('settingsEnd',           '[data-page-guide="settings-header"]'),
      ];
    case 'PRIVACY':
      return [
        make('privacyHeader',     '[data-page-guide="privacy-header"]'),
        make('privacyVisibility', '[data-page-guide="privacy-visibility"]'),
        make('privacyBlocked',    '[data-page-guide="privacy-blocked"]'),
        make('privacyExport',     '[data-page-guide="privacy-export"]'),
        make('privacyEnd',        '[data-page-guide="privacy-header"]'),
      ];
    case 'ADMIN':
      return [
        make('adminHeader',     '[data-page-guide="admin-header"]'),
        make('adminStats',      '[data-page-guide="admin-stats"]'),
        make('adminUsers',      '[data-page-guide="admin-users"]'),
        make('adminFlags',      '[data-page-guide="admin-flags"]'),
        make('adminModeration', '[data-page-guide="admin-moderation"]'),
      ];
    case 'DEVOPS':
      return [
        make('devopsHeader', '[data-page-guide="devops-header"]'),
        make('devopsErrors', '[data-page-guide="devops-errors"]'),
        make('devopsHealth', '[data-page-guide="devops-health"]'),
      ];
    default:
      return [
        make('header',      '[data-page-guide="app-header"]'),
        make(isMobile ? 'mobileNavigation' : 'navigation',
          `[data-page-guide="${isMobile ? 'mobile-navigation' : 'desktop-navigation'}"]`),
        make('generic', '[data-page-guide="main-content"]'),
      ];
  }
}

// ── PageGuide component ────────────────────────────────────────────────────
export default function PageGuide() {
  const pathname = usePathname() || '/';
  const { i18n } = useTranslation();
  const language: 'en' | 'am' = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('am') ? 'am' : 'en';
  const words = copy[language];
  const [isMobile, setIsMobile] = useState(false);
  const steps = useMemo(() => buildSteps(pathname, language, isMobile), [pathname, language, isMobile]);
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [card, setCard] = useState({ top: 0, left: 0 });
  const dialogRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  // Per-tour storage keys
  const tourId = useMemo(() => getTourId(pathname), [pathname]);
  const tourKey = `nodbusiness-tour-${tourId}-done`;
  const legacyKey = 'nodbusiness-page-guide-seen';

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setMounted(true);
    let active = true;
    client.get('/api/flags/page-guided-tours').then(({ data }) => {
      if (!active || data?.enabled_for_user !== true) return;
      setEnabled(true);
      try {
        // Backwards compat: treat legacy key as done for LANDING and FEED
        const legacyDone = (tourId === 'LANDING' || tourId === 'FEED') &&
          localStorage.getItem(legacyKey) === 'true';
        if (!localStorage.getItem(tourKey) && !legacyDone) setOpen(true);
      } catch { setOpen(true); }
    }).catch(() => {});
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourKey, tourId]);

  const current = steps[index];

  // Clear any pending retry when step or open state changes
  useEffect(() => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    retryCountRef.current = 0;
  }, [index, open]);

  const advance = useCallback(() => {
    setIndex(prev => {
      if (prev >= steps.length - 1) return prev; // handled by close()
      return prev + 1;
    });
  }, [steps.length]);

  const updatePosition = useCallback((scrollTarget = false) => {
    if (!open || !current) return;
    let target = document.querySelector(current.target);

    // Special handling for main-content pointing at its first meaningful child
    if (target instanceof HTMLElement && target.dataset.pageGuide === 'main-content') {
      target = target.querySelector('h1') ?? target.querySelector('button, a, input') ?? target;
    }
    if (target instanceof HTMLElement && target.dataset.pageGuide === 'marketplace-products' && target.getBoundingClientRect().height > 300) {
      target = target.firstElementChild instanceof HTMLElement ? target.firstElementChild : target;
    }

    if (!(target instanceof HTMLElement)) {
      // Wait-for-element retry: poll every 100ms up to 2000ms (20 retries)
      if (retryCountRef.current < 20) {
        retryCountRef.current += 1;
        retryRef.current = setTimeout(() => updatePosition(scrollTarget), 100);
      } else {
        console.warn('PageGuide: target not found', current.target);
        // Gracefully skip to next step
        if (index < steps.length - 1) {
          advance();
        } else {
          setRect(null);
        }
      }
      return;
    }

    if (scrollTarget) target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'center',
      inline: 'nearest',
    });

    requestAnimationFrame(() => {
      const bounds = target.getBoundingClientRect();
      setRect(bounds);
      const width = Math.min(360, window.innerWidth - 32);
      const left = Math.max(16, Math.min(bounds.left + bounds.width / 2 - width / 2, window.innerWidth - width - 16));
      const below = bounds.bottom + 18;
      const top = below + 210 < window.innerHeight ? below : Math.max(16, bounds.top - 230);
      setCard({ top: Math.min(top, window.innerHeight - 220), left });
    });
  }, [current, open, index, steps.length, advance]);

  useEffect(() => { setIndex(0); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    updatePosition(true);
    const measure = () => updatePosition(false);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, updatePosition]);

  const close = useCallback(() => {
    setOpen(false);
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    try { localStorage.setItem(tourKey, 'true'); } catch { /* storage disabled */ }
    launcherRef.current?.focus();
  }, [tourKey]);

  const advanceStep = () => {
    if (index >= steps.length - 1) { close(); return; }
    setIndex(value => value + 1);
  };

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  if (!mounted || !enabled) return null;

  return <>
    <button
      ref={launcherRef}
      type="button"
      onClick={() => { setIndex(0); setOpen(true); }}
      className="fixed bottom-6 left-4 z-[900] inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-lg transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary max-md:bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]"
      aria-label={words.launcher}
    >
      <HelpCircle className="h-4 w-4" aria-hidden="true" />{words.launcher}
    </button>

    {open && mounted && createPortal(
      <div className="fixed inset-0 z-[1000]" aria-label="Page guide">
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true" onClick={event => event.preventDefault()}>
          <defs>
            <mask id="page-guide-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={Math.max(0, rect.left - 8)}
                  y={Math.max(0, rect.top - 8)}
                  width={Math.min(window.innerWidth, rect.width + 16)}
                  height={Math.min(window.innerHeight, rect.height + 16)}
                  rx="14"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(3, 7, 18, 0.72)" mask="url(#page-guide-mask)" />
        </svg>

        {rect && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed rounded-2xl border-2 border-blue-400 shadow-[0_0_0_2px_rgba(255,255,255,0.85)]"
            style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }}
          />
        )}

        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="page-guide-title"
          aria-describedby="page-guide-description"
          className="fixed z-[1002] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-2rem)] max-w-[22.5rem] overflow-y-auto rounded-2xl border border-border bg-background p-4 text-foreground shadow-2xl sm:p-5"
          style={{ top: card.top, left: card.left }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold text-primary">{index + 1} / {steps.length}</p>
              <h2 id="page-guide-title" className="text-base font-bold leading-snug">{current?.title}</h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={words.skip}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p id="page-guide-description" aria-live="polite" className="text-sm leading-relaxed text-muted-foreground">
            {current?.description}
          </p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={close}
              className="min-h-11 px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              {words.skip}
            </button>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => setIndex(value => value - 1)}
                  className="min-h-11 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-secondary"
                >
                  {words.back}
                </button>
              )}
              <button
                type="button"
                onClick={advanceStep}
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {index === steps.length - 1 ? words.done : words.next}
              </button>
            </div>
          </div>
        </section>
      </div>,
      document.body
    )}
  </>;
}
