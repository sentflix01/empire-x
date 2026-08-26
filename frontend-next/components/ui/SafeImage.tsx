'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { resolveMediaUrl } from '@/lib/media';

type SafeImageProps = Omit<React.ComponentPropsWithoutRef<'img'>, 'src' | 'onError' | 'width' | 'height'> & {
  src?: unknown;
  fallback?: React.ReactNode;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  onError?: () => void;
};

/**
 * Safe wrapper around next/image with fallback support.
 * Uses `fill` by default for responsive sizing inside relative containers.
 * Falls back to native <img> when src is invalid/unresolvable.
 */
export default function SafeImage({
  src,
  fallback = null,
  fill = true,
  sizes,
  priority = false,
  onError,
  className,
  alt,
  style,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = resolveMediaUrl(src);

  useEffect(() => setFailed(false), [resolvedSrc]);

  if (!resolvedSrc || failed) return <>{fallback}</>;

  const handleError = () => {
    setFailed(true);
    onError?.();
  };

  return (
    <Image
      src={resolvedSrc}
      alt={alt || ''}
      fill={fill}
      sizes={sizes}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      onError={handleError}
      className={className}
      style={style}
      {...props}
    />
  );
}