import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brandAssets';

interface BrandLogoProps {
  /** Size and spacing classes, e.g. "w-4 h-4". Defaults to 24px. */
  className?: string;
  /**
   * Rendered size in pixels (CSS classes still decide the box). At 24 px and
   * below the bolder small drawing is used, so pass the real size for big logos.
   */
  size?: number;
  /** "onBlue" adds a white ring so the logo stays visible on blue backgrounds. */
  variant?: 'default' | 'onBlue';
  /** Give a label when the logo stands alone; omit it when text names the brand next to it. */
  label?: string;
  style?: React.CSSProperties;
}

/** The icon file for a size and background (lib/brandAssets.ts). */
export function brandIconSrc(size: number, variant: 'default' | 'onBlue' = 'default'): string {
  const small = size <= 24;
  if (variant === 'onBlue') return small ? BRAND.iconOnBlueSmall : BRAND.iconOnBlue;
  return small ? BRAND.iconSmall : BRAND.icon;
}

/**
 * The Nodbusiness emblem: the network of businesses over the globe, white on
 * brand blue. A vector, so it is sharp at every size. Accepts the same
 * className as a lucide icon, so it can be passed as an `icon` component.
 */
export default function BrandLogo({ className, size = 24, variant = 'default', label, style }: BrandLogoProps) {
  return (
    // A plain <img>: SVGs gain nothing from the image optimiser.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brandIconSrc(size, variant)}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      style={style}
      className={cn('inline-block shrink-0 rounded-full object-contain', className ?? 'w-6 h-6')}
    />
  );
}
