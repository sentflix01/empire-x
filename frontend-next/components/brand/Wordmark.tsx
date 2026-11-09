import { cn } from '@/lib/utils';
import { brandIconSrc } from './BrandLogo';

/**
 * "Nodbusiness" with the logo as the "o", in the brand's heavy sans (as on the
 * landing hero and sign-in), not the serif heading font.
 * tone="dark" is for dark backgrounds (white letters, ringed logo).
 * Font size comes from className (the logo scales with the letters).
 */
export default function Wordmark({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Nodbusiness"
      className={cn('inline-flex items-center font-body font-black leading-none tracking-tight', tone === 'dark' ? 'text-white' : 'text-foreground', className)}
    >
      <span aria-hidden="true">N</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brandIconSrc(48, tone === 'dark' ? 'onBlue' : 'default')} alt="" aria-hidden="true" width={48} height={48} className="mx-[0.02em] h-[0.92em] w-[0.92em] translate-y-[0.04em]" />
      <span aria-hidden="true">dbusiness</span>
    </span>
  );
}
