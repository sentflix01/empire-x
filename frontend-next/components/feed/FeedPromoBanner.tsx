'use client';
/**
 * The feed's "Build Your Mini Website" banner (views/Home.tsx).
 *
 * Owner, 13 Nov 2026: the wordless promo clip plays inside the banner and is
 * what visitors see first; the badge and text are hidden. A slider next to the
 * "Join Free" button lets the viewer bring the text in: as it rises, a solid
 * brand-blue layer fades over the clip and the text fades in, until at the top
 * the clip is fully covered and the banner is the plain blue text banner
 * (white text 5.2:1, WCAG 1.4.3).
 *
 * The heading stays in the accessibility tree at every level (it is the page's
 * h1), and "Join Free" is always fully visible. When the clip can't play
 * (reduced motion, data saving) the text shows and there is no slider.
 *
 * Pause and guide sit at the top right: the app's floating
 * help and assistant buttons cover the bottom-right corner on phones.
 */
import Link from 'next/link';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PromoGuide from '@/components/promo/PromoGuide';
import PromoVideo from '@/components/promo/PromoVideo';
import { PROMO } from '@/lib/promoAssets';
import { token } from '@/lib/colorTokens';

export default function FeedPromoBanner({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation();
  const [bannerPlayable, setBannerPlayable] = useState(false);
  /** 0 = only the animation, 100 = only the text (the clip fully covered). */
  const [textLevel, setTextLevel] = useState(0);
  const level = bannerPlayable ? textLevel / 100 : 1;

  return (
    <section data-page-guide="feed-banner" className="relative overflow-hidden rounded-2xl text-white shadow-lg shadow-primary/25" style={{ background: token.primary }}>
      <PromoVideo
        clip={PROMO.banner}
        className="absolute inset-0 h-full w-full"
        objectPosition="right center"
        sizes="(min-width: 640px) 640px, 100vw"
        buttonClassName="right-16 top-3"
        onPlayable={setBannerPlayable}
        description={t('promo.bannerDescription', 'Animation: someone picks a website template, adds a photo and a link, publishes it, and it appears in the Business feed with their products.')}
      />
      {/* Solid brand blue over the clip, as opaque as the slider says. */}
      <div
        aria-hidden="true"
        data-testid="feed-banner-scrim"
        className="pointer-events-none absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none"
        style={{ background: token.primary, opacity: level }}
      />
      <PromoGuide variant="icon" className="absolute right-3 top-3 z-20" />
      <div className="relative z-10 flex min-h-[132px] flex-col justify-center px-5 py-5 sm:px-6">
        <div
          data-testid="feed-banner-text"
          className="max-w-[250px] transition-opacity duration-200 motion-reduce:transition-none"
          style={{ opacity: level }}
        >
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/40">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('common.showroomStudio')}
          </div>
          <p className="text-sm font-semibold leading-none text-white">{t('feed.createBusiness')}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-normal sm:text-3xl">
            {t('feed.buildMiniWebsite')}
          </h1>
          <p className="mt-2 text-sm font-medium leading-snug text-white">{t('feed.shareEmpire')}</p>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Link href={isAuthenticated ? "/showroom/create" : "/register"}
            className="inline-flex h-10 shrink-0 items-center rounded-xl bg-white px-5 text-sm font-bold text-primary shadow-md shadow-black/10 transition-all duration-200 hover:bg-primary-subtle hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            {isAuthenticated ? t('feed.getStarted') : 'Join Free'}
          </Link>
          {bannerPlayable && (
            <label className="flex h-10 min-w-0 max-w-[150px] flex-1 items-center rounded-full bg-inverse/45 px-3 backdrop-blur">
              <span className="sr-only">{t('promo.textLevel', 'Show the text over the animation')}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={textLevel}
                onChange={(e) => setTextLevel(Number(e.target.value))}
                aria-valuetext={t('promo.textLevelValue', '{{n}}% text', { n: textLevel }).replace('{{n}}', String(textLevel))}
                data-testid="feed-banner-text-level"
                className="h-1.5 w-full cursor-pointer accent-white"
              />
            </label>
          )}
        </div>
      </div>
    </section>
  );
}
