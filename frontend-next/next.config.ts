import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
      { protocol: "https", hostname: "*.up.railway.app" },
      { protocol: "https", hostname: "unpkg.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",            value: "DENY" },
          { key: "X-XSS-Protection",           value: "1; mode=block" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;

