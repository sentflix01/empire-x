'use client';

import React, { useEffect, useState } from 'react';
import { resolveMediaUrl } from '@/lib/media';

type SafeImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: unknown;
  fallback?: React.ReactNode;
};

/**
 * A native image with a deterministic mobile-safe source and a visual fallback.
 * It prevents failed uploads from rendering a browser broken-image icon/alt text.
 */
export default function SafeImage({ src, fallback = null, onError, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = resolveMediaUrl(src);

  useEffect(() => setFailed(false), [resolvedSrc]);

  if (!resolvedSrc || failed) return <>{fallback}</>;

  return (
    <img loading="lazy"
      {...props}
      src={resolvedSrc}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
