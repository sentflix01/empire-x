'use client';

/**
 * BrandLogoVideo — drop-in replacement for BrandLogo for focal-point placements.
 *
 * Plays the brand intro video once, muted, inside a blue circle, then fades
 * back to the sharp vector logo. The vector logo also shows until the
 * video's first frame is ready, so there is never an empty circle.
 *
 * Accepts the same props as BrandLogo so it can be used anywhere BrandLogo
 * is used as a visual centerpiece (not tiny inline icons).
 *
 * Usage:
 *   <BrandLogoVideo size={72} className="w-[72px] h-[72px] mx-auto" label="Nodbusiness" />
 */
import { HEX } from '@/lib/colorTokens';
import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { BRAND_INTRO_VIDEO, useBrandMotion } from '@/lib/brandMotion';
import { BRAND } from '@/lib/brandAssets';

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
  const motion = useBrandMotion();
  const [errored, setErrored]   = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [ended, setEnded] = useState(false);
  const showVideo = videoReady && !ended;
  const videoRef = useRef<HTMLVideoElement>(null);
  const px = size;

  // Static logo when the video failed, or motion / data saving says no (F-045)
  if (errored || !motion) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={BRAND.icon}
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
        backgroundColor: HEX.primary,
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
      className={cn('shrink-0', className)}
    >
      {/* Vector logo: shown first, hidden while the video plays, back when it ends */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND.icon}
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
          opacity: showVideo ? 0 : 1,
          transition: videoReady ? 'opacity 0.3s ease' : 'none',
        }}
      />

      {/* Video — fades in when first frame is ready */}
      <video
        ref={videoRef}
        src={BRAND_INTRO_VIDEO}
        autoPlay
        muted
        playsInline
        onCanPlay={() => setVideoReady(true)}
        onEnded={() => setEnded(true)}
        onError={() => setErrored(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          opacity: showVideo ? 1 : 0,
          transition: videoReady ? 'opacity 0.3s ease' : 'none',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
