'use client';
/**
 * "Watch how it works": a button that opens a full promo video in a
 * phone-shaped player with the browser's own controls. `video` picks which:
 * "guide" (PROMO.guide, about 170 s: the whole app) or "builder"
 * (PROMO.builder, about 110 s: how anyone builds and keeps changing their
 * website from pieces, with no code). Both have English titles and subtitles. Nothing is downloaded until the button is pressed (decision
 * "Promo videos load when visible"). The player is a modal dialog: focus
 * stays inside, Esc or the 44 px close button closes it, and focus returns
 * to the button.
 */
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Play, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROMO, pickRendition, type PromoClip, type PromoRendition } from '@/lib/promoAssets';
import { cn } from '@/lib/utils';

type Props = {
  /**
   * "pill" shows the label; "icon" is a round button whose label is read by
   * screen readers only; "row" is a full-width row with the label and `meta`
   * (for example the length) under it.
   */
  variant?: 'pill' | 'icon' | 'row';
  /** Second line of a "row", such as "3 min". */
  meta?: string;
  /** Which video the button opens. */
  video?: 'guide' | 'builder';
  className?: string;
};

type Words = [key: string, fallback: string];
const VIDEOS: Record<NonNullable<Props['video']>, { clip: PromoClip; label: Words; title: Words; description: Words }> = {
  guide: {
    clip: PROMO.guide,
    label: ['promo.watch', 'Watch how it works'],
    title: ['promo.guideTitle', 'How Nodbusiness works'],
    description: ['promo.guideDescription', 'An animation with subtitles, in eight steps: post your life on the Personal feed; explore the feeds, zoom into photos and peek at a friend\'s business without leaving the page; search for what you need near you, such as a hotel room, compare the closest places by price and reviews, and book; start a website from a ready-made template or from blank sections; fill it by adding photos, pasting links and filling simple forms; pick a colour and see it on computer, tablet and phone; publish it to the Business feed, where people find it and scan its QR code; customers order, message you and pay you directly. One account holds your personal life and your business.'],
  },
  builder: {
    clip: PROMO.builder,
    label: ['promo.watchBuilder', 'Build, edit & sell your way'],
    title: ['promo.builderTitle', 'Build, edit & sell your way, no code'],
    description: ['promo.builderDescription', 'An animation with subtitles, in seven steps. Many website makers build a site quickly, but changing it later needs code. On Nodbusiness a website is made of pieces: choose what you are building, such as a hotel, a shop, a city office or a company; start from a ready template or from scratch; add pieces such as a cover, rooms, photos and prices with +; tap a piece to fill a simple form with photos, words and prices while the preview updates; edit, move up or down, delete or add any piece at any time; pick a colour and see it on computer, tablet and phone; publish and sell, as booking requests and orders arrive; later change a photo and tap Update. A city office, a company, a child and a grandmother build their own sites the same way.'],
  },
};

/**
 * The player's width in CSS px (matches the classes on Dialog.Content): at
 * most 380 px and 86% of the screen height. On phones it leaves an 88 px
 * column on the right free, where the always-visible assistant buttons float,
 * so they never cover the video's controls.
 */
function playerWidth(): number {
  if (typeof window === 'undefined') return 380;
  const wide = window.innerWidth >= 640;
  return Math.min(wide ? window.innerWidth * 0.92 : window.innerWidth * 0.96 - 88, 380, (window.innerHeight * 0.86 * 9) / 16);
}

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export default function PromoGuide({ variant = 'pill', video = 'guide', meta, className }: Props) {
  const { t } = useTranslation();
  const [clip, setClip] = useState<PromoRendition | null>(null);
  const v = VIDEOS[video];
  const label = t(...v.label);

  function onOpenChange(open: boolean) {
    if (!open) { setClip(null); return; }
    const w = playerWidth();
    setClip(pickRendition(v.clip, w, (w * 16) / 9, window.devicePixelRatio || 1));
  }

  return (
    <Dialog.Root open={!!clip} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        {variant === 'row' ? (
          <button
            type="button"
            className={cn(
              // Follows the theme: card colours in light mode, glass on the dark hero.
              'flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/20 dark:bg-white/10 dark:text-white dark:shadow-none dark:backdrop-blur dark:hover:bg-white/20',
              className,
            )}
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground dark:bg-primary-foreground dark:text-brand-blue">
              <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-snug">{label}</span>
              {meta && <span className="block text-xs text-muted-foreground dark:text-white/75">{meta}</span>}
            </span>
          </button>
        ) : (
          <button
            type="button"
            aria-label={variant === 'icon' ? label : undefined}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-full font-bold text-white ring-1 ring-white/45 backdrop-blur transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
              variant === 'pill' ? 'bg-white/15 pl-1.5 pr-5 text-sm' : 'w-11 bg-inverse/45',
              className,
            )}
          >
            <span className={cn('inline-flex items-center justify-center rounded-full', variant === 'pill' ? 'h-8 w-8 bg-white text-primary' : 'h-5 w-5 text-white')}>
              <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden="true" />
            </span>
            {variant === 'pill' && label}
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-overlay bg-black/85" />
        <Dialog.Content className="fixed left-[4vw] top-1/2 z-overlay w-[min(calc(96vw_-_88px),380px,calc(86svh*9/16))] -translate-y-1/2 focus:outline-none sm:left-1/2 sm:w-[min(92vw,380px,calc(86svh*9/16))] sm:-translate-x-1/2">
          <Dialog.Title className="sr-only">{t(...v.title)}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {t(...v.description)}
          </Dialog.Description>
          <div className="rounded-[2.25rem] bg-inverse p-2 shadow-2xl ring-1 ring-white/15">
            {clip && (
              <video
                key={clip.mp4}
                controls
                autoPlay={!prefersReducedMotion()}
                playsInline
                muted
                preload="none"
                poster={clip.poster}
                width={clip.width}
                height={clip.height}
                className="block aspect-[9/16] w-full rounded-[1.75rem] bg-white"
                data-testid="promo-guide-video"
              >
                <source src={clip.mp4} type="video/mp4" />
                {/* Subtitles are drawn into the video; this track is the same text for caption tools (CC). */}
                {v.clip.captions && <track kind="subtitles" src={v.clip.captions} srcLang="en" label="English" />}
              </video>
            )}
          </div>
          <Dialog.Close
            className="absolute -right-14 top-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-lg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t('promo.close', 'Close')}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
