'use client';
/**
 * "Watch how it works": a button that opens the full wordless guide
 * (PROMO.guide, about 92 s) in a phone-shaped player with the browser's own
 * controls. Nothing is downloaded until the button is pressed (decision
 * "Promo videos load when visible"). The player is a modal dialog: focus
 * stays inside, Esc or the 44 px close button closes it, and focus returns
 * to the button.
 */
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Play, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROMO, pickRendition, type PromoRendition } from '@/lib/promoAssets';
import { cn } from '@/lib/utils';

type Props = {
  /** "pill" shows the label; "icon" is a round button whose label is read by screen readers only. */
  variant?: 'pill' | 'icon';
  className?: string;
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

export default function PromoGuide({ variant = 'pill', className }: Props) {
  const { t } = useTranslation();
  const [clip, setClip] = useState<PromoRendition | null>(null);
  const label = t('promo.watch', 'Watch how it works');

  function onOpenChange(open: boolean) {
    if (!open) { setClip(null); return; }
    const w = playerWidth();
    setClip(pickRendition(PROMO.guide, w, (w * 16) / 9, window.devicePixelRatio || 1));
  }

  return (
    <Dialog.Root open={!!clip} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
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
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-overlay bg-black/85" />
        <Dialog.Content className="fixed left-[4vw] top-1/2 z-overlay w-[min(calc(96vw_-_88px),380px,calc(86svh*9/16))] -translate-y-1/2 focus:outline-none sm:left-1/2 sm:w-[min(92vw,380px,calc(86svh*9/16))] sm:-translate-x-1/2">
          <Dialog.Title className="sr-only">{t('promo.guideTitle', 'How Nodbusiness works')}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {t('promo.guideDescription', 'A wordless animation in six steps: post your life on the Personal feed; start a website from a ready-made template or from blank sections; fill it by adding photos, pasting links and filling simple forms; pick a colour and see it on computer, tablet and phone; publish it to the Business feed, where people find it and scan its QR code; customers order, message you and pay you directly. One account holds your personal life and your business.')}
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
