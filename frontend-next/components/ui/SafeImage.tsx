'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { resolveMediaUrl } from '@/lib/media';

type SafeImageProps = Omit<React.ComponentPropsWithoutRef<'img'>, 'src' | 'onError' | 'width' | 'height'> & {
  src?: unknown;
  fallback?: React.ReactNode;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  onError?: React.ReactEventHandler<HTMLImageElement>;
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
  width,
  height,
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

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    setFailed(true);
    onError?.(event);
  };

  // When fill=false, use width/height for intrinsic sizing
  if (!fill) {
    return (
      <Image
        src={resolvedSrc}
        alt={alt || ''}
        width={width ?? 800}
        height={height ?? 450}
        sizes={sizes}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        onError={handleError}
        className={className}
        style={style}
        unoptimized
        {...props}
      />
    );
  }

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
