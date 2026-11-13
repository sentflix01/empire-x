'use client';
/**
 * A wordless promo clip that fills its frame (lib/promoAssets.ts).
 *
 * - The poster image paints first and is all that shows with reduced motion
 *   or data saving on (useBrandMotion, audit F-045).
 * - The video file is requested only once the frame is at least a quarter
 *   visible, and it pauses when the frame scrolls away (decision "Promo videos
 *   load when visible").
 * - The smaller rendition is used unless the frame needs more pixels.
 * - A pause button stops the motion (WCAG 2.2.2); the picture itself is
 *   decorative and `description` gives screen readers the same story.
 */
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrandMotion } from '@/lib/brandMotion';
import { pickRendition, posterSrcSet, type PromoClip, type PromoRendition } from '@/lib/promoAssets';
import { cn } from '@/lib/utils';

type Props = {
  clip: PromoClip;
  /** Classes for the frame. It must have a size; the clip fills it. */
  className?: string;
  /** CSS object-position, e.g. "right center" to keep the action in view. */
  objectPosition?: string;
  /** The poster's `sizes` attribute. */
  sizes?: string;
  /** What the clip shows, read by screen readers. */
  description?: string;
  /** Classes for the pause button (position). */
  buttonClassName?: string;
  /** Called with true once the video is playable here (not with reduced motion or data saving), false otherwise. */
  onPlayable?: (playable: boolean) => void;
};

export default function PromoVideo({
  clip,
  className,
  objectPosition = 'center',
  sizes = '100vw',
  description,
  buttonClassName = 'bottom-2 right-2',
  onPlayable,
}: Props) {
  const { t } = useTranslation();
  const motion = useBrandMotion();
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<PromoRendition | null>(null);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = frame.current;
    if (!motion || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (entry.isIntersecting) {
        setSource((current) => current ?? pickRendition(clip, el.clientWidth, el.clientHeight, window.devicePixelRatio || 1));
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [motion, clip]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (inView && !paused) v.play().catch(() => { /* autoplay refused: the poster stays */ });
    else v.pause();
  }, [inView, paused, source]);

  const playable = motion && !!source;
  useEffect(() => { onPlayable?.(playable); }, [playable, onPlayable]);

  const fill = 'absolute inset-0 h-full w-full object-cover';
  return (
    <div ref={frame} className={cn('relative overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={clip.small.poster}
        srcSet={posterSrcSet(clip)}
        sizes={sizes}
        width={clip.large.width}
        height={clip.large.height}
        alt=""
        aria-hidden="true"
        decoding="async"
        className={fill}
        style={{ objectPosition }}
      />
      {motion && source && (
        <video
          ref={video}
          muted
          loop
          playsInline
          autoPlay
          preload="none"
          poster={source.poster}
          aria-hidden="true"
          tabIndex={-1}
          className={fill}
          style={{ objectPosition }}
          data-testid="promo-video"
        >
          <source src={source.mp4} type="video/mp4" />
        </video>
      )}
      {description && <p className="sr-only">{description}</p>}
      {motion && source && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t('promo.play', 'Play animation') : t('promo.pause', 'Pause animation')}
          className={cn(
            'absolute z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-inverse/55 text-white backdrop-blur transition hover:bg-inverse/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
            buttonClassName,
          )}
        >
          {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
