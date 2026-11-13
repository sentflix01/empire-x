'use client';
/**
 * The feed's "Build Your Mini Website" banner (views/Home.tsx).
 *
 * The wordless promo clip plays inside the banner, behind the text, at every
 * size, so the banner stays the size of its text and the feed starts early on
 * phones. A brand-blue layer sits over the clip: 95% behind the text on phones
 * (the clip shows through faintly; white text stays at ≥4.7:1 even over a white
 * frame) and solid behind the text from sm up, fading to clear on the right
 * (WCAG 1.4.3). The eye button fades the text away so the
 * viewer can watch the whole animation, and brings it back; it only appears
 * when the clip can play (not with reduced motion or data saving).
 *
 * The controls sit in one row at the top right (pause, eye, guide): the app's
 * floating help and assistant buttons cover the bottom-right corner on phones.
 */
import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PromoGuide from '@/components/promo/PromoGuide';
import PromoVideo from '@/components/promo/PromoVideo';
import { PROMO } from '@/lib/promoAssets';
import { token } from '@/lib/colorTokens';

export default function FeedPromoBanner({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation();
  const [bannerPlayable, setBannerPlayable] = useState(false);
  const [showBannerAnimation, setShowBannerAnimation] = useState(false);

  return (
    <section data-page-guide="feed-banner" className="relative overflow-hidden rounded-2xl text-white shadow-lg shadow-primary/25" style={{ background: token.primary }}>
      <PromoVideo
        clip={PROMO.banner}
        className="absolute inset-0 h-full w-full"
        objectPosition="right center"
        sizes="(min-width: 640px) 640px, 100vw"
        buttonClassName="right-[7.25rem] top-3"
        onPlayable={setBannerPlayable}
        description={t('promo.bannerDescription', 'Animation: someone picks a website template, adds a photo and a link, publishes it, and it appears in the Business feed with their products.')}
      />
      <PromoGuide variant="icon" className="absolute right-3 top-3 z-20" />
      <div
        aria-hidden="true"
        data-testid="feed-banner-scrim"
        className={`pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary)/0.95)_0,hsl(var(--primary)/0.95)_250px,hsl(var(--primary)/0.4)_100%)] transition-opacity duration-300 motion-reduce:transition-none sm:bg-[linear-gradient(90deg,hsl(var(--primary))_0,hsl(var(--primary))_290px,hsl(var(--primary)/0)_380px)] ${showBannerAnimation ? 'opacity-0' : 'opacity-100'}`}
      />
      <div
        data-testid="feed-banner-text"
        aria-hidden={showBannerAnimation || undefined}
        inert={showBannerAnimation || undefined}
        className={`relative z-10 flex min-h-[132px] items-center justify-between gap-4 px-5 py-5 transition-opacity duration-300 motion-reduce:transition-none sm:px-6 ${showBannerAnimation ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="max-w-[250px]">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/40">
            <Sparkles className="h-3 w-3" />
            {t('common.showroomStudio')}
          </div>
          <p className="text-sm font-semibold leading-none text-white">{t('feed.createBusiness')}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-normal sm:text-3xl">
            {t('feed.buildMiniWebsite')}
          </h1>
          <p className="mt-2 text-sm font-medium leading-snug text-white">{t('feed.shareEmpire')}</p>
          <Link href={isAuthenticated ? "/showroom/create" : "/register"}
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-white px-5 text-sm font-bold text-primary shadow-md shadow-black/10 transition-all duration-200 hover:bg-primary-subtle hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            {isAuthenticated ? t('feed.getStarted') : 'Join Free'}
          </Link>
        </div>
      </div>
      {bannerPlayable && (
        <button
          type="button"
          onClick={() => setShowBannerAnimation((v) => !v)}
          aria-pressed={showBannerAnimation}
          aria-label={showBannerAnimation ? t('promo.showText', 'Show text') : t('promo.showAnimation', 'Show animation')}
          className="absolute right-16 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-inverse/55 text-white backdrop-blur transition hover:bg-inverse/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {showBannerAnimation ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}
    </section>
  );
}
