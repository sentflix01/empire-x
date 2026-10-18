/**
 * The lettering choices in Showroom Studio's Style menu, self-hosted by
 * next/font (no requests to Google from visitors). Studio's preview, the Style
 * menu and the published site all use these, so they match.
 */
import { Inter, Playfair_Display, Space_Grotesk } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap' });

export const SITE_FONTS: Record<string, { fontFamily: string }> = {
  'Inter': inter.style,
  'Playfair Display': playfair.style,
  'Space Grotesk': spaceGrotesk.style,
};

export const FONT_OPTIONS = Object.keys(SITE_FONTS);

/** CSS font-family for a saved choice; unknown or empty falls back to Inter. */
export function siteFontFamily(name: unknown): string {
  return (SITE_FONTS[String(name ?? '')] ?? SITE_FONTS.Inter).fontFamily;
}
