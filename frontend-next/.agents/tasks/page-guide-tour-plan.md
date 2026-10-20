# Implementation Plan -- Nodbusiness In-App Page Guide Tours
Generated from MASTER_TOUR_PROMPT.md

---


## Decisions recorded

D1 - No FEAT decomposition. Both parts (attribute additions + PageGuide rewrite) are tightly coupled: attributes must exist before PageGuide targets them. Single loop handles this cleanly.

D2 - Extend PageGuide.tsx in place; no library. The spec explicitly says so. Missing capabilities: per-tour keys, wait-for-element retry, graceful skip, full buildSteps() expansion.

D3 - Per-tour localStorage keys replace the single global key. New pattern: nodbusiness-tour-<TOUR_ID>-done. Legacy nodbusiness-page-guide-seen treated as done for TOUR-LANDING and TOUR-FEED on backwards compat check.

D4 - tourId derived from pathname via a getTourId(pathname) lookup function. Dynamic segments matched with startsWith(). Unmapped paths return 'GENERIC'.

D5 - Wait-for-element: 100ms polling, max 2000ms (20 retries). After timeout call advance() to skip the step gracefully and log console.warn.


---

## Plan


- [ ] 1. Add data-page-guide attributes to app/landing/page.tsx
  The file already has landing-nav (on the <nav>) and landing-actions (on the hero content div).
  Add six missing hooks to existing elements only - no new elements.

  Attribute -> Element:
  - landing-register  -> <Link href="/register"> inside the <nav> (the hidden sm:inline-flex one)
  - landing-signin    -> <Link href="/login"> inside the <nav> (Sign In button)
  - landing-stats     -> the inner <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 rounded-3xl..."> (stats grid wrapper)
  - landing-modules   -> <div className="grid gap-4 md:grid-cols-3"> that maps over modules
  - landing-cta-section -> <section className="bg-slate-950 px-6 py-20 text-white"> (bottom CTA section)
  - landing-guest     -> <Link href="/feed"> Explore as Guest link in the hero section

  Files: frontend-next/app/landing/page.tsx
  Verify: cd frontend-next && npx tsc --noEmit --pretty false   (zero new errors)

- [ ] 2. Add data-page-guide attributes to LandingControls.tsx and TryDemoButton.tsx
  - LandingControls.tsx: add data-page-guide="landing-preferences" to the root <div className="flex items-center gap-1.5"> in LandingPreferences.
  - TryDemoButton.tsx: add data-page-guide="landing-demo-btn" to the root <button> element.

  Files: frontend-next/components/landing/LandingControls.tsx, frontend-next/components/landing/TryDemoButton.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 3. Add data-page-guide attributes to views/Register.tsx (9 hooks)
  Attribute -> Element:
  - register-page     -> <form onSubmit={handleSubmit}> element (the registration form)
  - register-google   -> <div ref={googleRef}> (the Google Sign-Up button host div)
  - register-email    -> <Input id="email"> element
  - register-password -> <Input id="password"> element
  - register-confirm  -> <Input id="confirm"> element
  - register-terms    -> <label className="flex items-start gap-3 cursor-pointer"> wrapping the checkbox
  - register-submit   -> <Button type="submit"> element
  - register-otp      -> <div className="flex flex-col items-center gap-4 mb-6"> wrapping InputOTP (OTP screen branch)
  - register-resend   -> the Resend code <button> in the OTP screen

  Files: frontend-next/views/Register.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 4. Add data-page-guide attributes to views/Login.tsx (6 hooks)
  Read the file first to confirm element structure, then add:
  - login-google        -> Google button host <div> (equivalent of googleRef div)
  - login-email         -> email <Input> element
  - login-password      -> password <Input> element
  - login-forgot        -> forgot password <Link> or <button>
  - login-submit        -> <Button type="submit"> element
  - login-register-link -> "Create Account" / register <Link>

  Files: frontend-next/views/Login.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 5. Add data-page-guide attributes to views/Onboarding.tsx (4 hooks)
  Read the file first, then add:
  - onboard-welcome  -> welcome heading/intro section container
  - onboard-name     -> display name <Input> or its wrapping group
  - onboard-type     -> personal/business selector container (radio or button group)
  - onboard-continue -> continue/submit <Button>

  Files: frontend-next/views/Onboarding.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 6. Add data-page-guide attributes to views/Home.tsx (5 new hooks)
  feed-banner and feed-content are already present. Add five new ones:
  - feed-guest-banner -> <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200/70..."> (guest banner block)
  - feed-filters      -> <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center"> (filter chips row; only rendered when feedMode === "personal")
  - feed-refresh      -> <button onClick={() => loadPosts(true)} disabled={loading}...> (the RefreshCw button inside the filter bar)
  - feed-posts        -> wrap the <AnimatePresence> posts block with <div data-page-guide="feed-posts"> since no single DOM container exists (this is the ONE permitted new wrapper in this plan; the fragment has no DOM parent)
  - feed-create-post  -> wrap the {user && <CreatePostForm .../>} with <div data-page-guide="feed-create-post"> if CreatePostForm does not accept data-* props, otherwise add directly to the component element

  Files: frontend-next/views/Home.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 7. Add data-page-guide attributes to views/Search.tsx (2 new hooks)
  search-input and search-tabs are already present. Add:
  - search-results -> the results list container div
  - search-empty   -> the empty-state element shown when no results

  Files: frontend-next/views/Search.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 8. Add data-page-guide attributes to views/Profile.tsx (6 hooks)
  Element map (confirmed from source read):
  - profile-header       -> <div className="bg-card rounded-2xl border border-border/50 overflow-hidden mb-4"> (profile header card)
  - profile-avatar       -> <div className="relative w-24 h-24 rounded-2xl bg-card p-0.5 shadow-lg"> (avatar container)
  - profile-verified     -> <VerifiedBadge> element inside the personal name row (add data-page-guide directly to the component; if it cannot forward data-* props, wrap with <span data-page-guide="profile-verified">)
  - profile-view-toggle  -> <div className="flex items-center bg-secondary/60 rounded-full p-0.5 ..."> (Personal/Business toggle pill)
  - profile-edit-btn     -> <Link href="/profile/edit"> wrapping the Edit Button
  - profile-create-showroom -> <Link href="/business/create" className="inline-flex items-center gap-1 text-xs text-amber-600..."> (shown when isOwner and no businesses)

  Files: frontend-next/views/Profile.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 9. Add data-page-guide attributes to PersonalProfile.tsx and BusinessProfile.tsx (1 hook each)
  Read both files first to find the root container.
  - PersonalProfile.tsx: data-page-guide="profile-personal-tab" on root container element
  - BusinessProfile.tsx: data-page-guide="profile-business-tab" on root container element

  Files: frontend-next/components/profile/PersonalProfile.tsx, frontend-next/components/profile/BusinessProfile.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 10. Add data-page-guide attributes to views/ProfileEdit.tsx (6 hooks)
  Read the file first. Then add:
  - profile-edit-avatar   -> avatar upload button/clickable area
  - profile-edit-cover    -> cover image upload button/area
  - profile-edit-name     -> display-name <Input>
  - profile-edit-bio      -> bio textarea or Input
  - profile-edit-location -> location Input
  - profile-edit-ticker   -> ticker toggle switch or its container

  Files: frontend-next/views/ProfileEdit.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 11. Add data-page-guide attributes to views/Orders.tsx (9 hooks)
  Element map (confirmed from source read):
  - orders-header           -> <div className="flex items-center gap-3 mb-6"> (ShoppingBag + h1 "Orders")
  - orders-tabs             -> <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-5"> (tab switcher)
  - orders-list             -> <div className="space-y-3"> containing orders.map(...)
  - orders-status-badge     -> <Badge variant="outline" className="text-xs ..."> in each order card (data-page-guide on the badge in each iteration; querySelector finds the first one which is correct)
  - orders-detail-expand    -> the ChevronDown/Up <button> at the end of each order's action row
  - orders-invoice-btn      -> the FileDown invoice <button> (inside order.status === "completed" check)
  - orders-return-btn       -> the RotateCcw Return <button> (inside canReturn check)
  - orders-seller-actions   -> the isSelling && next && <Button> (seller advance-status button)
  - orders-delivery-timeline -> wrap <DeliveryTimeline> with <div data-page-guide="orders-delivery-timeline">

  Files: frontend-next/views/Orders.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 12. Add data-page-guide attributes to views/Wallet.tsx (6 hooks)
  Element map (confirmed from source read):
  - wallet-balance      -> <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white mb-6"> (balance card)
  - wallet-currency     -> <p className="text-sm text-white/70 mt-1">{wallet?.currency ...}</p> inside the balance card
  - wallet-transactions -> <div className="bg-card rounded-2xl border border-border/50 overflow-hidden"> wrapping the transaction list (in the "overview" tab)
  - wallet-filter       -> <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-5"> (overview/withdraw tab bar)
  - wallet-topup        -> the <p> note about top-ups ("The wallet no longer accepts top-ups...") -- this is the most prominent element in the top-up area; if a top-up section or button exists elsewhere in the file, prefer that
  - wallet-payout       -> <Button onClick={handleWithdraw}...> in the withdraw tab

  Files: frontend-next/views/Wallet.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 13. Add data-page-guide attributes to views/Messages.tsx (4 hooks)
  Element map (confirmed from source read):
  - messages-header -> <div className="flex items-center justify-between px-4 pt-4 pb-2"> (title row with h1 + NewChatMenu)
  - messages-list   -> the scrollable conversations/contacts list container below the sticky header
  - messages-search -> <input ... placeholder="Search conversations..."> search input
  - messages-new    -> <NewChatMenu> component element (the compose button)

  Files: frontend-next/views/Messages.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 14. Add data-page-guide attributes to ChatRoom.tsx, Notifications.tsx, ProductDetail.tsx, Cart.tsx
  Read each file first, then add:
  ChatRoom.tsx:      chat-header, chat-messages, chat-input, chat-attachments
  Notifications.tsx: notif-header, notif-list, notif-unread, notif-mark-all
  ProductDetail.tsx: product-images, product-title, product-category, product-add-cart, product-buy-now, product-request, product-seller
  Cart.tsx:          cart-items, cart-quantity, cart-remove, cart-summary, cart-checkout

  Files: frontend-next/views/ChatRoom.tsx, frontend-next/views/Notifications.tsx, frontend-next/views/ProductDetail.tsx, frontend-next/views/Cart.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 15. Add data-page-guide attributes to Showrooms.tsx, ShowroomView.tsx, ShowroomCreate.tsx, ShowroomWizard.tsx
  Read each file first, then add:
  Showrooms.tsx:      showrooms-header (title+create-btn div), showrooms-search (Input), showrooms-grid (card grid div)
  ShowroomView.tsx:   showroom-hero, showroom-sections, showroom-products, showroom-contact
  ShowroomCreate.tsx: showroom-create-name, showroom-create-category, showroom-builder, showroom-section-editor, showroom-preview, showroom-publish
  ShowroomWizard.tsx: showroom-templates

  Files: frontend-next/views/Showrooms.tsx, frontend-next/views/ShowroomView.tsx, frontend-next/views/ShowroomCreate.tsx, frontend-next/views/ShowroomWizard.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 16. Add data-page-guide attributes to BusinessCreate.tsx, BusinessInventory.tsx, ProductCreate.tsx, BusinessSubscription.tsx, Referral.tsx, Scorecard.tsx, CouponsManage.tsx, ProductQuickScan.tsx
  Read each file first, then add:
  BusinessCreate.tsx:     biz-create-name, biz-create-category, biz-create-description, biz-create-logo, biz-create-color, biz-create-submit
  BusinessInventory.tsx:  inventory-header, inventory-add-btn, inventory-search, inventory-filters, inventory-product-card, inventory-bulk-actions
  ProductCreate.tsx:      product-create-title, product-create-desc, product-create-category, product-create-images, product-create-price, product-create-stock, product-create-publish
  BusinessSubscription.tsx: sub-header, sub-features, sub-plans, sub-checkout-btn
  Referral.tsx:           referral-code, referral-copy, referral-stats, referral-share
  Scorecard.tsx:          scorecard-score, scorecard-streak, scorecard-badges, scorecard-milestones
  CouponsManage.tsx:      coupons-header, coupons-list, coupons-create-btn, coupons-usage
  ProductQuickScan.tsx:   scan-viewfinder, scan-torch, scan-result

  Files: all in frontend-next/views/
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 17. Add data-page-guide attributes to Explore.tsx, HashtagFeed.tsx, BusinessAnalytics.tsx, Admin.tsx, DevOps.tsx, Friends.tsx, Bookmarks.tsx, NearbyMap.tsx, AccountSettings.tsx, PrivacyAndSecurity.tsx
  Read each file first, then add:
  Explore.tsx:            explore-header, explore-featured, explore-trending, explore-categories
  HashtagFeed.tsx:        hashtag-header, hashtag-follow-btn, hashtag-posts
  BusinessAnalytics.tsx:  analytics-header, analytics-tiles, analytics-chart, analytics-top-posts
  Admin.tsx:              admin-header, admin-stats, admin-users, admin-flags, admin-moderation
  DevOps.tsx:             devops-header, devops-errors, devops-health
  Friends.tsx:            friends-header, friends-tabs, friends-suggestions, friends-follow-btn
  Bookmarks.tsx:          bookmarks-header, bookmarks-tabs, bookmarks-list
  NearbyMap.tsx:          nearby-map, nearby-locate, nearby-filters, nearby-marker
  AccountSettings.tsx:    settings-header, settings-email, settings-password, settings-language, settings-theme, settings-notifications, settings-danger
  PrivacyAndSecurity.tsx: privacy-header, privacy-visibility, privacy-blocked, privacy-export

  Files: all in frontend-next/views/
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 18. Rewrite PageGuide.tsx -- Part A: getTourId() and per-tour persistence
  Replace the single-key 'nodbusiness-page-guide-seen' logic with per-tour keys.

  A. Add getTourId(pathname: string): string function BEFORE the PageGuide component:
  `	ypescript
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
    if (pathname.startsWith('/products/scan')) return 'PRODUCT-SCAN';
    if (pathname.startsWith('/products/')) return 'PRODUCT-DETAIL';
    if (pathname === '/businesses') return 'BUSINESSES';
    if (pathname === '/business/create') return 'BIZ-CREATE';
    if (pathname === '/business/edit') return 'BIZ-EDIT';
    if (pathname === '/business/inventory') return 'INVENTORY';
    if (pathname === '/business/subscription') return 'SUBSCRIPTION';
    if (pathname.startsWith('/business/subscription/receipt/')) return 'SUB-RECEIPT';
    if (pathname === '/business/subscription/return') return 'SUB-RETURN';
    if (pathname === '/showrooms') return 'SHOWROOMS';
    if (pathname === '/showroom/create') return 'SHOWROOM-CREATE';
    if (pathname === '/showroom/samples') return 'SHOWROOM-SAMPLES';
    if (pathname === '/showroom/templates') return 'SHOWROOM-TEMPLATES';
    if (pathname.startsWith('/showroom/')) return 'SHOWROOM-VIEW';
    if (pathname.startsWith('/showrooms/')) return 'SHOWROOM-VIEW';
    if (pathname === '/profile') return 'PROFILE-OWN';
    if (pathname === '/profile/edit') return 'PROFILE-EDIT';
    if (pathname.startsWith('/profile/')) return 'PROFILE-OTHER';
    if (pathname.startsWith('/p/')) return 'PROFILE-PUBLIC';
    if (pathname === '/messages') return 'MESSAGES';
    if (pathname.startsWith('/messages/')) return 'CHATROOM';
    if (pathname === '/notifications') return 'NOTIFICATIONS';
    if (pathname === '/friends') return 'FRIENDS';
    if (pathname === '/orders') return 'ORDERS';
    if (pathname === '/orders/success') return 'ORDER-SUCCESS';
    if (pathname === '/orders/cancel') return 'ORDER-CANCEL';
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
  `

  B. In the useEffect that checks localStorage, replace:
     OLD: if (!localStorage.getItem('nodbusiness-page-guide-seen')) setOpen(true);
     NEW:
     const tourId = getTourId(pathname);
     const tourKey = 'nodbusiness-tour-' + tourId + '-done';
     const legacyKey = 'nodbusiness-page-guide-seen';
     // backwards compat: treat legacy key as done for LANDING and FEED only
     const legacyDone = (tourId === 'LANDING' || tourId === 'FEED') && localStorage.getItem(legacyKey) === 'true';
     if (!localStorage.getItem(tourKey) && !legacyDone) setOpen(true);

  C. In the close() callback, replace:
     OLD: localStorage.setItem('nodbusiness-page-guide-seen', 'true');
     NEW:
     const tourId = getTourId(pathname);
     localStorage.setItem('nodbusiness-tour-' + tourId + '-done', 'true');

  D. Derive tourId inside the component (after pathname is defined) and memoize:
     const tourId = useMemo(() => getTourId(pathname), [pathname]);

  Files: frontend-next/components/PageGuide.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)


- [ ] 19. Rewrite PageGuide.tsx -- Part B: wait-for-element retry in updatePosition
  Replace the current synchronous updatePosition with an async polling version.

  The current implementation does: let target = document.querySelector(current.target) and returns null immediately if not found.

  New implementation:
  1. Add a retryRef = useRef<ReturnType<typeof setTimeout> | null>(null) to track pending retry.
  2. Add a retryCountRef = useRef(0) to track how many retries have been attempted.
  3. In updatePosition, after the element lookup, if target is null and retryCountRef.current < 20:
     retryCountRef.current += 1;
     retryRef.current = setTimeout(() => updatePosition(scrollTarget), 100);
     return;
  4. If target is still null after 20 retries (2000ms):
     console.warn('PageGuide: target not found', current.target);
     advance();
     return;
  5. On each new step (when index changes), reset retryCountRef.current = 0 and clear any pending retryRef.
  6. On component unmount / tour close, clear retryRef.current.

  Exact placement: the retry logic goes at the point in updatePosition where target is null after the querySelector call, just before the existing 'if (!(target instanceof HTMLElement)) { setRect(null); return; }' guard.

  Files: frontend-next/components/PageGuide.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)


- [ ] 20. Rewrite PageGuide.tsx -- Part C: expand buildSteps() for all 57 pages
  The current buildSteps() handles only 4 routes; all others fall back to 3 generic steps.
  Replace with a complete implementation covering all routes from the spec.

  Structure:
  function buildSteps(pathname, language, isMobile): GuideStep[] {
    const strings = copy[language].steps;
    const make = (key, target) => ({ target, title: strings[key][0], description: strings[key][1] });
    const tourId = getTourId(pathname);
    switch (tourId) {
      case 'LANDING': return [landing steps...];
      case 'REGISTER': return [register steps...];
      ... (one case per TOUR_ID)
      default: return [generic fallback steps];
    }
  }

  Full step list per tour (all targets from Part E of the spec):

  LANDING (10 steps): landingNavWelcome, landingPreferences, landingRegister, landingSignin,
    landingThreeWays, landingDemo, landingGuest, landingStats, landingModules, landingCta
    Targets: landing-nav, landing-preferences, landing-register, landing-signin,
    landing-actions, landing-demo-btn, landing-guest, landing-stats, landing-modules, landing-cta-section

  REGISTER (9 steps): registerPage, registerGoogle, registerEmail, registerPassword,
    registerConfirm, registerTerms, registerSubmit, registerOtp, registerResend
    Targets: register-page, register-google, register-email, register-password,
    register-confirm, register-terms, register-submit, register-otp, register-resend

  LOGIN (6 steps): loginGoogle, loginEmail, loginPassword, loginForgot, loginSubmit, loginRegisterLink
    Targets: login-google, login-email, login-password, login-forgot, login-submit, login-register-link

  ONBOARD (4 steps): onboardWelcome, onboardName, onboardType, onboardContinue
    Targets: onboard-welcome, onboard-name, onboard-type, onboard-continue

  FEED (9 steps): feedHeader, feedGuestBanner (conditional), feedBanner, feedContent,
    feedFilters, feedRefresh, feedPosts, feedCreatePost, feedEnd
    Targets: app-header, feed-guest-banner, feed-banner, feed-content,
    feed-filters, feed-refresh, feed-posts, feed-create-post, app-header (end)

  MARKETPLACE (5 steps): marketplaceHeading, marketplaceSearch, marketplaceCategories,
    marketplaceProducts, marketplaceEnd
    Targets: marketplace-heading, marketplace-search, marketplace-categories, marketplace-products (x2)

  SEARCH (4 steps): searchInput, searchTabs, searchResults, searchEmpty
    Targets: search-input, search-tabs, search-results, search-empty

  PROFILE-OWN (9 steps): profileHeader, profileAvatar, profileVerified, profileViewToggle,
    profilePersonalTab, profileBusinessTab, profileEditBtn, profileCreateShowroom, profileEnd
    Targets: profile-header, profile-avatar, profile-verified, profile-view-toggle,
    profile-personal-tab, profile-business-tab, profile-edit-btn, profile-create-showroom, profile-header

  PROFILE-PUBLIC (2 steps, subset): profileHeader, profileViewToggle

  PROFILE-OTHER (same as PROFILE-PUBLIC)

  ORDERS (10 steps): ordersHeader, ordersTabs, ordersList, ordersStatusBadge,
    ordersDetailExpand, ordersInvoiceBtn, ordersReturnBtn, ordersSellerActions,
    ordersDeliveryTimeline, ordersEnd
    Targets: orders-header, orders-tabs, orders-list, orders-status-badge,
    orders-detail-expand, orders-invoice-btn, orders-return-btn, orders-seller-actions,
    orders-delivery-timeline, orders-header

  WALLET (7 steps): walletBalance, walletCurrency, walletTransactions, walletFilter,
    walletTopup, walletPayout, walletEnd
    Targets: wallet-balance, wallet-currency, wallet-transactions, wallet-filter,
    wallet-topup, wallet-payout, wallet-balance

  MESSAGES (5 steps): messagesHeader, messagesList, messagesSearch, messagesNew, messagesEnd
    Targets: messages-header, messages-list, messages-search, messages-new, messages-header

  CHATROOM (5 steps): chatHeader, chatMessages, chatInput, chatAttachments, chatEnd
    Targets: chat-header, chat-messages, chat-input, chat-attachments, chat-header

  NOTIFICATIONS (5 steps): notifHeader, notifList, notifUnread, notifMarkAll, notifEnd
    Targets: notif-header, notif-list, notif-unread, notif-mark-all, notif-header

  PRODUCT-DETAIL (8 steps): productImages, productTitle, productCategory,
    productAddCart, productBuyNow, productRequest, productSeller, productEnd
    Targets: product-images, product-title, product-category, product-add-cart,
    product-buy-now, product-request, product-seller, product-add-cart

  CART (6 steps): cartItems, cartQuantity, cartRemove, cartSummary, cartCheckout, cartEnd
    Targets: cart-items, cart-quantity, cart-remove, cart-summary, cart-checkout, cart-items

  SHOWROOMS (4 steps): showroomsHeader, showroomsSearch, showroomsGrid, showroomsEnd
    Targets: showrooms-header, showrooms-search, showrooms-grid, showrooms-grid

  SHOWROOM-VIEW (5 steps): showroomHero, showroomSections, showroomProducts, showroomContact, showroomEnd
    Targets: showroom-hero, showroom-sections, showroom-products, showroom-contact, showroom-hero

  SHOWROOM-CREATE/SAMPLES/TEMPLATES (8 steps): showroomCreateName, showroomCreateCategory,
    showroomTemplates, showroomBuilder, showroomSectionEditor, showroomPreview, showroomPublish, showroomEnd
    Targets: showroom-create-name, showroom-create-category, showroom-templates,
    showroom-builder, showroom-section-editor, showroom-preview, showroom-publish, showroom-publish

  PROFILE-EDIT (7 steps): profileEditAvatar, profileEditCover, profileEditName,
    profileEditBio, profileEditLocation, profileEditTicker, profileEditEnd
    Targets: profile-edit-avatar, profile-edit-cover, profile-edit-name,
    profile-edit-bio, profile-edit-location, profile-edit-ticker, profile-edit-avatar

  SETTINGS / ACCOUNT (8 steps): settingsHeader, settingsEmail, settingsPassword,
    settingsLanguage, settingsTheme, settingsNotifications, settingsDanger, settingsEnd
    Targets: settings-header, settings-email, settings-password, settings-language,
    settings-theme, settings-notifications, settings-danger, settings-header

  PRIVACY (5 steps): privacyHeader, privacyVisibility, privacyBlocked, privacyExport, privacyEnd
    Targets: privacy-header, privacy-visibility, privacy-blocked, privacy-export, privacy-header

  NEARBY (5 steps): nearbyMap, nearbyLocate, nearbyFilters, nearbyMarker, nearbyEnd
    Targets: nearby-map, nearby-locate, nearby-filters, nearby-marker, nearby-map

  FRIENDS (5 steps): friendsHeader, friendsTabs, friendsSuggestions, friendsFollowBtn, friendsEnd
    Targets: friends-header, friends-tabs, friends-suggestions, friends-follow-btn, friends-header

  BOOKMARKS (4 steps): bookmarksHeader, bookmarksTabs, bookmarksList, bookmarksEnd
    Targets: bookmarks-header, bookmarks-tabs, bookmarks-list, bookmarks-header

  EXPLORE (5 steps): exploreHeader, exploreFeatured, exploreTrending, exploreCategories, exploreEnd
    Targets: explore-header, explore-featured, explore-trending, explore-categories, explore-header

  HASHTAG (3 steps): hashtagHeader, hashtagFollowBtn, hashtagPosts
    Targets: hashtag-header, hashtag-follow-btn, hashtag-posts

  ANALYTICS (5 steps): analyticsHeader, analyticsTiles, analyticsChart, analyticsTopPosts, analyticsEnd
    Targets: analytics-header, analytics-tiles, analytics-chart, analytics-top-posts, analytics-header

  BIZ-CREATE (7 steps): bizCreateName, bizCreateCategory, bizCreateDescription,
    bizCreateLogo, bizCreateColor, bizCreateSubmit, bizCreateEnd
    Targets: biz-create-name, biz-create-category, biz-create-description,
    biz-create-logo, biz-create-color, biz-create-submit, biz-create-name

  INVENTORY (7 steps): inventoryHeader, inventoryAddBtn, inventorySearch,
    inventoryFilters, inventoryProductCard, inventoryBulkActions, inventoryEnd
    Targets: inventory-header, inventory-add-btn, inventory-search,
    inventory-filters, inventory-product-card, inventory-bulk-actions, inventory-header

  PRODUCT-CREATE / PRODUCT-EDIT (8 steps): productCreateTitle, productCreateDesc,
    productCreateCategory, productCreateImages, productCreatePrice, productCreateStock,
    productCreatePublish, productCreateEnd
    Targets: product-create-title, product-create-desc, product-create-category,
    product-create-images, product-create-price, product-create-stock, product-create-publish, product-create-title

  SUBSCRIPTION (5 steps): subHeader, subFeatures, subPlans, subCheckoutBtn, subEnd
    Targets: sub-header, sub-features, sub-plans, sub-checkout-btn, sub-header

  REFERRAL (4 steps): referralCode, referralCopy, referralStats, referralShare
    Targets: referral-code, referral-copy, referral-stats, referral-share

  SCORECARD (5 steps): scorecardScore, scorecardStreak, scorecardBadges, scorecardMilestones, scorecardEnd
    Targets: scorecard-score, scorecard-streak, scorecard-badges, scorecard-milestones, scorecard-score

  COUPONS (4 steps): couponsHeader, couponsList, couponsCreateBtn, couponsUsage
    Targets: coupons-header, coupons-list, coupons-create-btn, coupons-usage

  PRODUCT-SCAN (3 steps): scanViewfinder, scanTorch, scanResult
    Targets: scan-viewfinder, scan-torch, scan-result

  ADMIN (5 steps): adminHeader, adminStats, adminUsers, adminFlags, adminModeration
    Targets: admin-header, admin-stats, admin-users, admin-flags, admin-moderation

  DEVOPS (3 steps): devopsHeader, devopsErrors, devopsHealth
    Targets: devops-header, devops-errors, devops-health

  GENERIC (3 steps, unchanged fallback): header, navigation/mobileNavigation, generic
    Targets: app-header, desktop-navigation/mobile-navigation, main-content

  Files: frontend-next/components/PageGuide.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)


- [ ] 21. Add all English copy keys to copy.en.steps in PageGuide.tsx
  Keep all 14 existing keys. Add new keys in the same [title, body] tuple format.
  Full list of new keys (english copy from spec Part E):

  LANDING: landingNavWelcome, landingPreferences, landingRegister, landingSignin,
    landingThreeWays, landingDemo, landingGuest, landingStats, landingModules, landingCta
  REGISTER: registerPage, registerGoogle, registerEmail, registerPassword,
    registerConfirm, registerTerms, registerSubmit, registerOtp, registerResend
  LOGIN: loginGoogle, loginEmail, loginPassword, loginForgot, loginSubmit, loginRegisterLink
  ONBOARD: onboardWelcome, onboardName, onboardType, onboardContinue
  FEED: feedHeader, feedGuestBanner, feedBuildShowroom, feedAnnouncements,
    feedFilters, feedRefresh, feedPosts, feedCreatePost, feedEnd
  MARKETPLACE: marketplaceHeading, marketplaceFind, marketplaceCategories2, marketplaceCards, marketplaceEnd
  SEARCH: searchAnything, searchTabs2, searchResults, searchEmpty
  PROFILE-OWN: profileYour, profilePhoto, profileVerified2, profileViewToggle2,
    profilePersonal, profileBusiness2, profileEdit2, profileCreateShowroom2, profileEnd
  ORDERS: ordersHeader2, ordersTabs2, ordersList2, ordersStatusBadge2,
    ordersDetailExpand2, ordersInvoiceBtn2, ordersReturnBtn2, ordersSellerActions2,
    ordersDeliveryTimeline2, ordersEnd
  WALLET: walletBalance2, walletCurrency2, walletTransactions2, walletFilter2,
    walletTopup2, walletPayout2, walletEnd
  MESSAGES: messagesHeader2, messagesList2, messagesSearch2, messagesNew2, messagesEnd
  CHATROOM: chatHeader2, chatMessages2, chatInput2, chatAttachments2, chatEnd
  NOTIFICATIONS: notifHeader2, notifList2, notifUnread2, notifMarkAll2, notifEnd
  PRODUCT-DETAIL: productImages2, productTitle2, productCategory2, productAddCart2,
    productBuyNow2, productRequest2, productSeller2, productEnd
  CART: cartItems2, cartQuantity2, cartRemove2, cartSummary2, cartCheckout2, cartEnd
  SHOWROOMS: showroomsHeader2, showroomsSearch2, showroomsGrid2, showroomsEnd
  SHOWROOM-VIEW: showroomHero2, showroomSections2, showroomProducts2, showroomContact2, showroomEnd
  SHOWROOM-CREATE: showroomCreateName2, showroomCreateCategory2, showroomTemplates2,
    showroomBuilder2, showroomSectionEditor2, showroomPreview2, showroomPublish2, showroomCreateEnd
  PROFILE-EDIT: profileEditAvatar2, profileEditCover2, profileEditName2,
    profileEditBio2, profileEditLocation2, profileEditTicker2, profileEditEnd
  SETTINGS: settingsHeader2, settingsEmail2, settingsPassword2, settingsLanguage2,
    settingsTheme2, settingsNotifications2, settingsDanger2, settingsEnd
  PRIVACY: privacyHeader2, privacyVisibility2, privacyBlocked2, privacyExport2, privacyEnd
  NEARBY: nearbyMap2, nearbyLocate2, nearbyFilters2, nearbyMarker2, nearbyEnd
  FRIENDS: friendsHeader2, friendsTabs2, friendsSuggestions2, friendsFollowBtn2, friendsEnd
  BOOKMARKS: bookmarksHeader2, bookmarksTabs2, bookmarksList2, bookmarksEnd
  EXPLORE: exploreHeader2, exploreFeatured2, exploreTrending2, exploreCategories2, exploreEnd
  HASHTAG: hashtagHeader2, hashtagFollowBtn2, hashtagPosts2
  ANALYTICS: analyticsHeader2, analyticsTiles2, analyticsChart2, analyticsTopPosts2, analyticsEnd
  BIZ-CREATE: bizCreateName2, bizCreateCategory2, bizCreateDescription2,
    bizCreateLogo2, bizCreateColor2, bizCreateSubmit2, bizCreateEnd
  INVENTORY: inventoryHeader2, inventoryAddBtn2, inventorySearch2,
    inventoryFilters2, inventoryProductCard2, inventoryBulkActions2, inventoryEnd
  PRODUCT-CREATE: productCreateTitle2, productCreateDesc2, productCreateCategory2,
    productCreateImages2, productCreatePrice2, productCreateStock2, productCreatePublish2, productCreateEnd
  SUBSCRIPTION: subHeader2, subFeatures2, subPlans2, subCheckoutBtn2, subEnd
  REFERRAL: referralCode2, referralCopy2, referralStats2, referralShare2
  SCORECARD: scorecardScore2, scorecardStreak2, scorecardBadges2, scorecardMilestones2, scorecardEnd
  COUPONS: couponsHeader2, couponsList2, couponsCreateBtn2, couponsUsage2
  PRODUCT-SCAN: scanViewfinder2, scanTorch2, scanResult2
  ADMIN: adminHeader2, adminStats2, adminUsers2, adminFlags2, adminModeration2
  DEVOPS: devopsHeader2, devopsErrors2, devopsHealth2

  NOTE: Use unique key names (suffix '2' avoids collision with existing keys).
  The exact copy text for each key comes directly from the table in Part E of MASTER_TOUR_PROMPT.md.
  Implementer: read Part E completely and transcribe each title and body verbatim.

  Files: frontend-next/components/PageGuide.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 22. Add Amharic copy keys (copy.am.steps) mirroring all English keys from step 21
  The Amharic translations must be added to copy.am.steps for EVERY new key added in step 21.
  Existing 14 Amharic keys stay unchanged.
  Translation method: translate each English title and body to Amharic.
  Use the same concise register as the existing Amharic copy (confirmed readable on-screen).
  The implementer must translate each string from the English copy in step 21.
  Key names are identical to the English equivalents (keys are language-agnostic).
  The copy object shape must remain: 'as const' tuple [title, body] for each key.

  Reference existing Amharic keys for style/register:
    welcome: ['ወደ Nodbusiness እንኳን በደህና መጡ', 'ይህ አጭር መመሪያ...']
    feedBanner: ['የንግድ ሾውሩም ይፍጠሩ', 'ከዚህ ባነር...']

  Files: frontend-next/components/PageGuide.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 23. Wire up StepKey type and close() / advance() to use tourId from step 18
  The existing 'type StepKey = keyof typeof copy.en.steps' must be updated
  to include all new keys added in steps 21 and 22.
  TypeScript will infer this automatically from the 'as const' object if keys are spelled correctly.
  No manual type declaration change is needed UNLESS the type is used explicitly elsewhere.

  Also: update the close() callback to use the memoized tourId from step 18 (not re-derive it):
    const close = useCallback(() => {
      setOpen(false);
      try { localStorage.setItem('nodbusiness-tour-' + tourId + '-done', 'true'); } catch {}
      launcherRef.current?.focus();
    }, [tourId]);

  NOTE: tourId must be added to the useCallback dependency array.

  Files: frontend-next/components/PageGuide.tsx
  Verify: npx tsc --noEmit --pretty false  (zero new errors)

- [ ] 24. Full build and lint verification
  After all code changes, run the full frontend verification suite:
    cd frontend-next
    npm run lint
    npx tsc --noEmit --pretty false
    npm run build

  Expected: zero TypeScript errors, zero lint errors, build succeeds.
  If build fails: fix the specific error before proceeding.
  Do NOT run npm test as a gate -- the tour is UI-only and has no unit tests yet.

  Files: no file changes in this step
  Verify: build output shows 'Compiled successfully' or equivalent

---

## Appendix A: attribute-to-element mapping (quick reference)

Confirmed from source reads. Attributes listed as EXISTING need no change. Others are NEW.

app/landing/page.tsx:
  EXISTING: landing-nav (<nav>), landing-actions (hero content div)
  NEW: landing-register (<Link href='/register'> in nav), landing-signin (<Link href='/login'> in nav)
  NEW: landing-stats (stats grid div), landing-modules (modules grid div)
  NEW: landing-cta-section (final <section>), landing-guest (<Link href='/feed'> Explore as Guest)

components/landing/LandingControls.tsx:
  NEW: landing-preferences (root <div> of LandingPreferences)

components/landing/TryDemoButton.tsx:
  NEW: landing-demo-btn (root <button>)

views/Home.tsx:
  EXISTING: feed-banner (<section> with gradient), feed-content (<div> wrapping CompanyAnnouncementTicker)
  NEW: feed-guest-banner (amber div shown when !isAuthenticated)
  NEW: feed-filters (filter chips <div>, inside feedMode==='personal' branch)
  NEW: feed-refresh (RefreshCw <button>)
  NEW: feed-posts (new <div> wrapper around AnimatePresence posts block)
  NEW: feed-create-post (wrapper around CreatePostForm or on the component directly)

views/Register.tsx:
  NEW: register-page on <form>, register-google on <div ref={googleRef}>
  NEW: register-email on <Input id='email'>, register-password on <Input id='password'>
  NEW: register-confirm on <Input id='confirm'>
  NEW: register-terms on the <label> wrapping checkbox
  NEW: register-submit on <Button type='submit'>
  NEW: register-otp on <div> wrapping InputOTP (OTP branch)
  NEW: register-resend on Resend <button> (OTP branch)

views/Profile.tsx:
  NEW: profile-header on profile header card <div>
  NEW: profile-avatar on avatar container <div>
  NEW: profile-verified on <VerifiedBadge> or wrapping <span>
  NEW: profile-view-toggle on Personal/Business toggle pill <div>
  NEW: profile-edit-btn on <Link href='/profile/edit'>
  NEW: profile-create-showroom on create-business <Link>

views/Orders.tsx:
  NEW: orders-header on ShoppingBag+h1 <div mb-6>
  NEW: orders-tabs on tab switcher <div>
  NEW: orders-list on orders.map() <div space-y-3>
  NEW: orders-status-badge on status <Badge> in each card
  NEW: orders-detail-expand on ChevronDown/Up expand <button>
  NEW: orders-invoice-btn on FileDown invoice <button>
  NEW: orders-return-btn on RotateCcw Return <button>
  NEW: orders-seller-actions on seller advance-status <Button>
  NEW: orders-delivery-timeline on wrapper <div> around DeliveryTimeline

views/Wallet.tsx:
  NEW: wallet-balance on amber gradient balance card <div>
  NEW: wallet-currency on currency <p> inside balance card
  NEW: wallet-transactions on transaction list <div>
  NEW: wallet-filter on overview/withdraw tab bar <div>
  NEW: wallet-topup on top-up note <p> (top-up button removed per platform model)
  NEW: wallet-payout on withdraw <Button>

views/Messages.tsx:
  NEW: messages-header on title row <div> (h1+NewChatMenu)
  NEW: messages-list on conversations/contacts list container
  NEW: messages-search on <input> search element
  NEW: messages-new on <NewChatMenu> component

views/Showrooms.tsx:
  NEW: showrooms-header on title+Create button <div flex justify-between mb-6>
  NEW: showrooms-search on <Input> search element
  NEW: showrooms-grid on card grid <div grid-cols-1 md:grid-cols-2>

---

## Appendix B: backward compatibility note

The legacy key 'nodbusiness-page-guide-seen' is NOT deleted.
Any user who previously dismissed the old guide will have this key set to 'true'.
Per D3, it is treated as equivalent to nodbusiness-tour-LANDING-done and nodbusiness-tour-FEED-done.
All other tours (ORDERS, WALLET, etc.) are new and will auto-start on first visit regardless.
This means users who dismissed the old guide will not see the LANDING or FEED tours again,
but will see all other tours on first visit -- which is the correct behavior.

---

## Appendix C: QA checklist after implementation

For each new tour:
1. Open page in browser, run: document.querySelectorAll('[data-page-guide]') -- confirm all expected hooks present
2. Start tour via launcher button -- confirm step 1 spotlight frames correct element
3. Click Next through all steps -- confirm each step's spotlight frames correct element
4. Press Esc -- confirm tour closes and nodbusiness-tour-<ID>-done is set in localStorage
5. Reload page -- confirm tour does NOT auto-start again (done key present)
6. Manually delete done key -- confirm tour auto-starts on next load
7. Test at 375px mobile width -- confirm card appears above mobile bottom nav
8. Test missing element: temporarily remove a data-page-guide attr -- confirm step skips with console.warn
9. Switch to Amharic -- confirm all Amharic copy renders without overflow
10. Toggle dark mode -- confirm overlay and card are readable

