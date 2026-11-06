import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No X-Powered-By: Next.js header (audit F-016).
  poweredByHeader: false,
  // TypeScript errors are now surfaced in CI — do not ignore them
  typescript: {
    ignoreBuildErrors: false,
  },

  // Allow importing Leaflet and other browser-only packages
  transpilePackages: ["leaflet", "react-leaflet"],

  // Re-enabled — Leaflet is now loaded with dynamic() + ssr:false so strict
  // double-mount no longer double-initialises maps.
  reactStrictMode: true,

  // Keep browser API traffic on the app's own origin. In private browsing,
  // browsers may block refresh cookies sent directly to a different-site API.
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${apiBase}/api/:path*` }];
  },

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
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "unpkg.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "placehold.co" },
      // Allow any HTTPS hostname for user-uploaded media URLs
      // (storage domains cannot all be predicted at build time)
      { protocol: "https", hostname: "**" },
    ],
  },

  // Security headers
  async headers() {
    // The Content-Security-Policy for pages is set per request with a nonce in
    // proxy.ts (lib/csp.ts, audit F-016); these headers apply to every response.
    return [
      {
        // Global security headers for all pages
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",      value: "nosniff" },
          { key: "X-Frame-Options",              value: "DENY" },
          { key: "X-XSS-Protection",             value: "1; mode=block" },
          { key: "Referrer-Policy",              value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",           value: "camera=(self), microphone=(), geolocation=(self)" },
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin-allow-popups" },
        ],
      },
      {
        // OAuth2 callback page — must have COOP: unsafe-none so the popup can
        // access window.opener and send postMessage back to the Login page.
        // When COOP is same-origin-allow-popups the popup context gets isolated
        // after navigating through Google's cross-origin domain, making
        // window.opener null and window.closed unreadable.
        source: "/auth/google/callback",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
        ],
      },
    ];
  },
};

export default nextConfig;
