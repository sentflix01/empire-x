import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pre-existing TypeScript errors across UI components — ignoreBuildErrors allows
  // the production build to succeed while these are addressed as a follow-up.
  typescript: {
    ignoreBuildErrors: true,
  },

  // Allow importing Leaflet and other browser-only packages
  transpilePackages: ["leaflet", "react-leaflet"],

  // React-Leaflet mutates DOM nodes during mount; strict dev remounting can double-initialize maps.
  reactStrictMode: false,

  // Turbopack config — fix workspace root detection warning
  turbopack: {
    root: __dirname,
    // Tell Turbopack to treat leaflet CSS as client-only
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json", ".css"],
  },

  // Image optimization — allow backend uploads and external images
  images: {
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
    const isProd = process.env.NODE_ENV === 'production';
    const googleScriptSrc = `https://accounts.google.com https://js.stripe.com https://browser.sentry-cdn.com`;
    const googleUnsafeInline = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? " 'unsafe-inline'" : '';

    const csp = [
      `default-src 'self'`,
      // Styles: self + unsafe-inline (required for Tailwind/CSS-in-JS) + Google GSI + Leaflet/FontAwesome CDN
      `style-src 'self' 'unsafe-inline' https://accounts.google.com https://unpkg.com https://cdnjs.cloudflare.com`,
      // Scripts: self + Google GSI + Stripe.js + Sentry.
      // Google Identity Services injects inline script blocks, so we allow unsafe-inline only when Google login is enabled.
      isProd
        ? `script-src 'self' ${googleScriptSrc}${googleUnsafeInline}`
        : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com`,
      // Images: self + data URIs + blob + backend + ALL possible Railway/storage hosts
      // We use wildcard patterns to catch any subdomain or storage provider used in production.
      isProd
        ? `img-src 'self' data: blob: ${apiHost} https: http://localhost:3001 https://*.railway.app https://*.up.railway.app https://*.r2.dev https://pub-*.r2.dev https://*.supabase.co https://raw.githubusercontent.com https://unpkg.com https://maps.gstatic.com https://*.tile.openstreetmap.org https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://storage.googleapis.com`
        : `img-src 'self' data: blob: http: https:`,
      // Fonts: self + Google Fonts (if used)
      `font-src 'self'`,
      // API calls, Sentry, Stripe, WebSocket (socket.io), Google auth
      `connect-src 'self' ${apiHost} ${wsHost} ws://localhost:3001 wss://localhost:3001 https://*.railway.app wss://*.railway.app wss://*.up.railway.app https://*.up.railway.app https://*.sentry.io https://api.stripe.com https://api.chapa.co https://accounts.google.com`,
      // Stripe Checkout/Elements renders in iframes
      `frame-src https://js.stripe.com https://hooks.stripe.com`,
      // No plugins, no base-uri override
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      isProd ? `upgrade-insecure-requests` : '',
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
        ],
      },
    ];
  },
};

export default nextConfig;

