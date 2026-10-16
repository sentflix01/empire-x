import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  /** Size and spacing classes, e.g. "w-4 h-4". Defaults to 24px. */
  className?: string;
  /** Pixel size hint for the image; CSS classes decide the rendered size. */
  size?: number;
  /** Give a label when the logo stands alone; omit it when text names the brand next to it. */
  label?: string;
  style?: React.CSSProperties;
}

/**
 * The Nodbusiness emblem. Use it wherever the brand is shown as an icon,
 * including places that used a crown. Accepts the same className as a
 * lucide icon, so it can be passed as an `icon` component.
 */
export default function BrandLogo({ className, size = 24, label, style }: BrandLogoProps) {
  return (
    <Image
      src="/brand/nodbusiness-icon.svg"
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      style={style}
      className={cn('inline-block shrink-0 rounded-[22%] object-cover', className ?? 'w-6 h-6')}
    />
  );
}
