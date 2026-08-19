# Showroom Embed Widget — Tasks

## Status: 🔴 Not Started

---

## What This Enables

Any business owner pastes one line of code onto their personal website,
Facebook page description, or any HTML page — and their live Nodbusiness
showroom appears there instantly. Updates automatically.

```html
<!-- Paste anywhere -->
<script src="https://nodbusiness.vercel.app/embed.js"
        data-showroom="kategna-kitchen-bole">
</script>
```

---

## Step 1 — Embed Script (`/embed.js`)

- [ ] Create `frontend-next/public/embed.js` — a self-contained JavaScript file:
  ```js
  (function() {
    // Find all embed containers on the page
    var containers = document.querySelectorAll('script[data-showroom]');
    containers.forEach(function(script) {
      var slug = script.getAttribute('data-showroom');
      var theme = script.getAttribute('data-theme') || 'light';
      var sections = script.getAttribute('data-sections') || 'all';
      var height = script.getAttribute('data-height') || '600px';

      // Create iframe
      var iframe = document.createElement('iframe');
      iframe.src = 'https://nodbusiness.vercel.app/embed/showroom/' + slug
        + '?theme=' + theme + '&sections=' + sections;
      iframe.width = '100%';
      iframe.height = height;
      iframe.style.border = 'none';
      iframe.style.borderRadius = '12px';
      iframe.style.overflow = 'hidden';
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('title', slug + ' showroom');

      // Replace script tag with iframe
      script.parentNode.insertBefore(iframe, script);
    });
  })();
  ```

---

## Step 2 — Embed-Optimized Showroom Page

- [ ] Create `frontend-next/app/embed/showroom/[slug]/page.tsx`
  - Same data as `/showroom/[slug]` but:
  - No Nodbusiness header/nav/footer
  - No "Create your own showroom" banner
  - Minimal chrome — just the showroom content
  - Adds "Powered by Nodbusiness" small badge at bottom-right
  - Query param `?theme=dark` forces dark mode
  - Query param `?sections=hero,items,contact` shows only those sections

---

## Step 3 — Embed Options

| Attribute | Values | Default | Description |
|---|---|---|---|
| `data-showroom` | slug string | required | The showroom slug |
| `data-theme` | `light` / `dark` / `auto` | `auto` | Color theme |
| `data-height` | CSS height | `600px` | iframe height |
| `data-sections` | comma-separated or `all` | `all` | Which sections to show |
| `data-lang` | `en` / `am` | browser | Display language |
| `data-hide-badge` | `true` / `false` | `false` | Hide "Powered by" badge |

---

## Step 4 — Embed Generator UI

- [ ] Add "Embed" button on showroom builder page
- [ ] Opens modal with:
  - Live preview of the embed
  - Config options: theme, height, sections to include
  - Copy button for the generated code snippet
  - Preview in light/dark mode toggle
  - Example: "Paste this on your website, Facebook, or anywhere"

---

## Step 5 — CORS & Security

- [ ] Backend: add `X-Frame-Options: ALLOWALL` header for embed routes only
  (or use `Content-Security-Policy: frame-ancestors *`)
- [ ] All other routes keep `X-Frame-Options: DENY` (clickjacking protection)
- [ ] Embed route must be read-only — no forms that submit, no auth flows
- [ ] Rate limit embed views (prevents scraping)

---

## Step 6 — Verify

- [ ] Create a simple HTML file locally, paste embed code, open in browser
- [ ] Showroom renders correctly inside iframe
- [ ] Updates on showroom edit within 60s (ISR revalidation)
- [ ] Works in dark mode when `data-theme="dark"`
- [ ] `data-sections="hero,contact"` shows only those two sections
- [ ] "Powered by Nodbusiness" badge links back to the showroom page
