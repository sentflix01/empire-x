import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript errors are now surfaced in CI — do not ignore them
  typescript: {
    ignoreBuildErrors: false,
  },

  // Allow importing Leaflet and other browser-only packages
  transpilePackages: ["leaflet", "react-leaflet"],

  // Re-enabled — Leaflet is now loaded with dynamic() + ssr:false so strict
  // double-mount no longer double-initialises maps.
  reactStrictMode: true,

  // BUG-5: the dev-tools launcher defaulted to the bottom-left corner and
  // overlapped the sidebar footer, stealing clicks from the Log out button.
  // Pin it to the bottom-right where no UI controls live.
  devIndicators: {
    position: "bottom-right",
  },

  // Turbopack config — fix workspace root detection warning
  turbopack: {
    // Tell Turbopack to treat leaflet CSS as client-only
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json", ".css"],
  },

  // Image optimization — allow backend uploads and external images
  images: {
    // Serve modern formats (webp/avif) for 25-50% smaller payloads
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images for 30 days (default is 60s)
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Responsive breakpoints for srcset generation
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "http",  hostname: "localhost" },
      { protocol: "https", hostname: "*.railway.app" },
      { protocol: "https", hostname: "*.up.railway.app" },
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "unpkg.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      // Seeded story media (db/seed.js) and showroom gallery fallback images
      // (components/showroom/SectionRenderer.tsx) use picsum.photos.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      // Showroom BuilderPreview fallbacks use placehold.co.
      { protocol: "https", hostname: "placehold.co" },
    ],
  },

  // Security headers
  async headers() {
    // TD-013: Content Security Policy for the Next.js frontend
    // - script-src: self + Next.js HMR inline scripts (dev only) + Stripe + Sentry CDN
    // - connect-src: self + backend API + Sentry + Stripe APIs
    // - img-src: self + data URIs + blob + R2 + GitHub raw (used by Leaflet/maps)
    // - frame-src: Stripe iframe (required for Stripe Elements)
    // Adjust NEXT_PUBLIC_API_BASE_URL as needed for your deployment.
    const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
    const wsHost = apiHost.replace(/^https?:/, 'wss:').replace(/^http:/, 'ws:');
    const googleScriptSrc = `https://accounts.google.com https://js.stripe.com https://browser.sentry-cdn.com https://vercel.live`;

    const csp = [
      `default-src 'self' https://vercel.com https://vercel.live`,
      // Styles: self + unsafe-inline (required for Tailwind/CSS-in-JS) + Google GSI + Leaflet/FontAwesome CDN
      `style-src 'self' 'unsafe-inline' https://accounts.google.com https://unpkg.com https://cdnjs.cloudflare.com`,
      // Scripts: Next.js requires 'unsafe-inline' for its inline bootstrap scripts (__NEXT_DATA__ etc.)
      // and 'unsafe-eval' in dev for HMR. Both dev and prod include 'unsafe-inline'.
      process.env.NODE_ENV !== 'production'
        ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${googleScriptSrc}`
        : `script-src 'self' 'unsafe-inline' ${googleScriptSrc}`,
      // Images: allow all HTTPS sources + self + data + blob.
      // We cannot predict all storage domains (Railway, Supabase, R2, CDN, user avatars)
      // at build time, so we use 'https:' wildcard which allows any HTTPS image source.
      // This is safe for a pure-API backend (no cross-site form actions, no scripts).
      `img-src 'self' data: blob: https: http://localhost:3001 http://localhost:3000`,
      // Fonts: self + Google Fonts (if used)
      `font-src 'self'`,
      // API calls, Sentry, Stripe, WebSocket (socket.io), Google auth
      `connect-src 'self' ${apiHost} ${wsHost} ws://localhost:3001 wss://localhost:3001 https://*.railway.app wss://*.railway.app wss://*.up.railway.app https://*.up.railway.app https://*.sentry.io https://api.stripe.com https://api.chapa.co https://accounts.google.com`,
      // Stripe Checkout/Elements + Google Sign-In renders in iframes
      `frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com`,
      // No plugins, no base-uri override
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      // Allow Vercel live feedback manifest and worker scripts
      `manifest-src 'self' https://vercel.live https://vercel.com`,
      `worker-src 'self' blob:`,
      `upgrade-insecure-requests`,
    ].filter(Boolean).join('; ');

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",            value: "DENY" },
          { key: "X-XSS-Protection",           value: "1; mode=block" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Content-Security-Policy",    value: csp },
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;

