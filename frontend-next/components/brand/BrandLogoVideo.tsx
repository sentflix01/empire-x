'use client';

/**
 * BrandLogoVideo — drop-in replacement for BrandLogo for focal-point placements.
 *
 * Plays the brand intro video looped and muted inside a black circle.
 * The static SVG icon is shown instantly as a placeholder until the video's
 * first frame is ready — prevents a plain black circle flash on slow
 * connections or mobile devices.
 *
 * Accepts the same props as BrandLogo so it can be used anywhere BrandLogo
 * is used as a visual centerpiece (not tiny inline icons).
 *
 * Usage:
 *   <BrandLogoVideo size={72} className="w-[72px] h-[72px] mx-auto" label="Nodbusiness" />
 */
import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoVideoProps {
  /** Size and spacing classes e.g. "w-14 h-14". Defaults to 56px. */
  className?: string;
  /** Pixel hint for fallback image; CSS classes control rendered size. */
  size?: number;
  /** Accessible label — provide when the logo stands alone without adjacent text. */
  label?: string;
  style?: React.CSSProperties;
}

export default function BrandLogoVideo({
  className,
  size = 56,
  label,
  style,
}: BrandLogoVideoProps) {
  const [errored, setErrored]   = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const px = size;

  // Hard error fallback — video completely failed to load
  if (errored) {
    return (
      <Image
        src="/brand/nodbusiness-icon.svg"
        alt={label ?? ''}
        aria-hidden={label ? undefined : true}
        width={px}
        height={px}
        style={style}
        className={cn('inline-block shrink-0 rounded-full object-cover', className ?? 'w-14 h-14')}
      />
    );
  }

  return (
    <div
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        position: 'relative',
        width: px,
        height: px,
        borderRadius: '50%',
        backgroundColor: '#0a0a0a',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
      className={cn('shrink-0', className)}
    >
      {/* Static SVG placeholder — visible instantly, fades out once video is ready */}
      <Image
        src="/brand/nodbusiness-icon.svg"
        alt=""
        aria-hidden
        width={px}
        height={px}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: videoReady ? 0 : 1,
          transition: videoReady ? 'opacity 0.25s ease-out' : 'none',
        }}
      />

      {/* Video — fades in when first frame is ready */}
      <video
        ref={videoRef}
        src="/brand/nodbusiness-intro.mp4"
        autoPlay
        muted
        playsInline
        loop
        onCanPlay={() => setVideoReady(true)}
        onError={() => setErrored(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          opacity: videoReady ? 1 : 0,
          transition: videoReady ? 'opacity 0.25s ease-in' : 'none',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
