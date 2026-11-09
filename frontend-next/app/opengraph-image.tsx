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
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BRAND } from '@/lib/brandAssets';

export const alt = "Nodbusiness — Africa's Superapp";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // The ringed logo (the card is brand blue), inlined as a data URI.
  const logo = await readFile(join(process.cwd(), 'public', BRAND.iconOnBlue));
  const logoSrc = `data:image/svg+xml;base64,${logo.toString('base64')}`;
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

        {/* Logo */}
        <img src={logoSrc} alt="" width={140} height={140} style={{ marginBottom: 28, borderRadius: '50%', boxShadow: '0 8px 40px rgba(0,0,0,0.35)' }} />

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
