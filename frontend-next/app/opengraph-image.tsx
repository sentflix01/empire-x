/**
 * app/opengraph-image.tsx — Generated OG card for the root layout.
 *
 * Next.js App Router renders this as a PNG at build time and serves it at
 * /opengraph-image. The root layout metadata already references it via
 * the file convention — no manual metadata update needed.
 *
 * Output: 1200 × 630 px (standard OG card size)
 */
import { HEX } from '@/lib/colorTokens';
import { ImageResponse } from 'next/og';

export const alt = "Nodbusiness — Africa's Superapp";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: HEX.primary,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Logo circle */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: HEX.primary,
            border: '4px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          }}
        >
          {/* Simple "N" lettermark — matches brand icon shape */}
          <span
            style={{
              color: '#ffffff',
              fontSize: 60,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            N
          </span>
        </div>

        {/* Wordmark */}
        <div
          style={{
            color: '#ffffff',
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: 16,
          }}
        >
          Nodbusiness
        </div>

        {/* Tagline */}
        <div
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: '0.01em',
          }}
        >
          Social · Commerce · Services
        </div>
      </div>
    ),
    { ...size },
  );
}
