# Public Showroom Page — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Convert to SSR / ISR

- [ ] Audit `frontend-next/app/showroom/[slug]/page.tsx`
- [ ] Convert data fetching from client-side `useEffect` to Next.js `generateStaticParams` + `fetch` at build time, OR use `async` server component that fetches server-side
- [ ] Use `revalidate: 60` (ISR — revalidate every 60 seconds) so live edits appear within 1 minute
  ```ts
  export const revalidate = 60;
  export default async function ShowroomPage({ params }) {
    const showroom = await fetchShowroom(params.slug); // server-side
    if (!showroom || showroom.status !== 'published') notFound();
    return <ShowroomView showroom={showroom} />;
  }
  ```
- [ ] `notFound()` for unpublished or missing slugs

---

## Step 2 — SEO Meta Tags

- [ ] Add `generateMetadata` to the page:
  ```ts
  export async function generateMetadata({ params }) {
    const showroom = await fetchShowroom(params.slug);
    return {
      title: `${showroom.title} — Nodbusiness`,
      description: showroom.description?.slice(0, 155) || `${showroom.title} on Nodbusiness`,
      openGraph: {
        title: showroom.title,
        description: showroom.description?.slice(0, 155),
        images: [showroom.cover_image || showroom.logo_url],
        url: `https://nodbusiness.app/showroom/${showroom.slug}`,
        type: 'website',
      },
      twitter: { card: 'summary_large_image' },
    };
  }
  ```

---

## Step 3 — View Count Increment

- [ ] On page load (server or client): `POST /api/showrooms/:id/view`
  - Backend: `UPDATE showrooms SET view_count = view_count + 1 WHERE id = $1`
  - Use a fire-and-forget fetch (don't block page render)
  - Deduplicate: only count once per session (check sessionStorage flag)

---

## Step 4 — Sticky Section Navigation

- [ ] Detect section types in the showroom's sections array
- [ ] Generate jump links: "Menu" → `#section-items`, "About" → `#section-about`, "Contact" → `#section-contact`
- [ ] Sticky horizontal scroll nav below the hero section
- [ ] Active section highlighted based on scroll position (`IntersectionObserver`)
- [ ] Smooth scroll on click (`scroll-behavior: smooth`)
- [ ] Hidden on mobile if fewer than 3 sections

---

## Step 5 — Contact Section Buttons

- [ ] Phone: `<a href="tel:+251912345678">` — opens dialer
- [ ] Email: `<a href="mailto:info@business.com">` — opens mail client
- [ ] WhatsApp: `<a href="https://wa.me/251912345678">` — opens WhatsApp
- [ ] Telegram: `<a href="https://t.me/username">` — opens Telegram
- [ ] Website: `<a href="..." target="_blank" rel="noopener">` — opens in new tab
- [ ] All contact links have large tap targets (min 44×44px)

---

## Step 6 — Share Button

- [ ] Share button in showroom header (top-right)
- [ ] Uses Web Share API when available (`navigator.share`)
  ```ts
  navigator.share({ title: showroom.title, url: window.location.href })
  ```
- [ ] Fallback: dropdown with Copy Link / WhatsApp / Telegram
- [ ] Copy Link: copies URL to clipboard + shows "Copied!" tooltip for 2s

---

## Step 7 — Section Rendering Polish

- [ ] Audit all 25+ section types render correctly at 375px
- [ ] All section images lazy-loaded with blur placeholder
- [ ] Items/menu sections: responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- [ ] Gallery section: masonry or equal-grid, tap to open lightbox
- [ ] Map section: embed correctly on mobile (not overflowing)
- [ ] Video section: responsive embed (16:9 ratio maintained)

---

## Step 8 — Verify

- [ ] Page loads in < 2s on Slow 4G (Lighthouse)
- [ ] Correct OG image when URL shared on WhatsApp
- [ ] Section jump nav scrolls smoothly to correct section
- [ ] Phone/WhatsApp/email buttons work on mobile
- [ ] Unpublished slug shows 404 page
- [ ] View count increments (check DB after visit)
- [ ] ISR revalidates within 60s after edit + publish
