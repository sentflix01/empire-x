'use client';
/**
 * The landing page (decision "Landing page: showroom-first hero and one type
 * scale", project-brain/DECISIONS.md). It is the first thing investors,
 * enterprises, offices and small sellers see, so it follows one type scale
 * and one call-to-action order:
 *
 *   eyebrow  text-xs semibold uppercase, wide tracking
 *   h1       4xl → 5xl → 6xl extrabold, tight
 *   h2       3xl → 4xl bold, tight
 *   lead     lg → xl, relaxed, at most 36rem wide
 *   body     base, leading-7
 *   actions  h-12 rounded-xl: one solid primary, one outline, one text link
 *
 * Every word goes through t('landing.*') with the English text as default, so
 * the server HTML is English and the language switch in the nav changes the
 * page. Only facts the product supports are stated (no invented numbers).
 */
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BedDouble,
  Bot,
  Building2,
  CreditCard,
  Landmark,
  LayoutGrid,
  LayoutTemplate,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  Rocket,
  ShoppingBag,
  Star,
  Store,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROMO } from '@/lib/promoAssets';
import GlobeLogo from '@/components/brand/GlobeLogo';
import BrandLogo from '@/components/brand/BrandLogo';
import Wordmark from '@/components/brand/Wordmark';
import PromoGuide from '@/components/promo/PromoGuide';
import PromoVideo from '@/components/promo/PromoVideo';
import { LandingPreferences } from './LandingControls';
import TryDemoButton from './TryDemoButton';
import DemoEndedNotice from './DemoEndedNotice';

const CONTAINER = 'mx-auto w-full max-w-6xl px-5 sm:px-8';
const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.14em]';
const H2 = 'text-3xl font-bold tracking-tight sm:text-4xl';
// bg-primary-foreground is white in both themes (.dark remaps bg-white to the card colour), and the
// inline brand blue avoids the dark theme's lighter .text-primary: 5.2:1 on white either way.
// Theme-aware buttons. Light: solid brand blue with white text. Dark: white with brand blue
// text (bg-primary-foreground stays white in both themes; the exact brand blue keeps 5.2:1
// where the dark theme's lighter text-primary would not).
const PRIMARY_COLORS = 'bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary-foreground dark:text-brand-blue dark:hover:bg-primary-foreground/90';
const CTA = 'inline-flex h-[clamp(2.75rem,6svh,3rem)] items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-base font-semibold transition min-[360px]:px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:focus-visible:ring-white';
const PRIMARY = `${CTA} shadow-lg shadow-primary/20 dark:shadow-black/10 ${PRIMARY_COLORS}`;
// The closing call to action sits on brand blue in both themes.
const ON_BLUE_PRIMARY = `${CTA} bg-primary-foreground text-brand-blue shadow-lg shadow-black/10 hover:bg-primary-foreground/90 focus-visible:ring-white`;
const ON_BLUE_OUTLINE = `${CTA} border border-white/40 text-white hover:bg-white/10 focus-visible:ring-white`;
// text-brand-blue, not text-primary: the dark theme lightens .text-primary with a stronger rule,
// which would beat dark:text-white here.
const OUTLINE = `${CTA} border border-primary/40 text-brand-blue hover:bg-primary-subtle disabled:cursor-wait disabled:opacity-70 dark:border-white/40 dark:text-white dark:hover:bg-white/10`;

type Item = { key: string; title: string; desc: string; Icon: LucideIcon };

const AUDIENCES: Item[] = [
  { key: 'people', title: 'People & creators', desc: 'Posts, followers and sales', Icon: Users },
  { key: 'shops', title: 'Shops & restaurants', desc: 'Menus, products and orders', Icon: Store },
  { key: 'hotels', title: 'Hotels & services', desc: 'Rooms, bookings and prices', Icon: BedDouble },
  { key: 'companies', title: 'Companies', desc: 'Teams, branches and catalogues', Icon: Building2 },
  { key: 'government', title: 'Government offices', desc: 'Services, hours and contacts', Icon: Landmark },
];

const STEPS: Item[] = [
  { key: 'build', title: 'Build it', desc: 'Make your profile and your showroom website from a ready template or from scratch. Edit, move or delete any part at any time, with no code.', Icon: LayoutTemplate },
  { key: 'connect', title: 'Connect & share it', desc: 'Post your moments and your products, follow people and businesses, and chat. Friends, creators and businesses find you in the feeds.', Icon: MessageCircle },
  { key: 'sell', title: 'Buy or sell it', desc: 'Anyone can buy and sell: products, services and bookings. Customers pay the seller directly, and Nodbusiness never holds the money.', Icon: Rocket },
];

const MODULES: Item[] = [
  { key: 'showrooms', title: 'Showroom websites', desc: 'A mini website for every business, built from sections you control.', Icon: Store },
  { key: 'marketplace', title: 'Marketplace', desc: 'Products, services and room bookings from local sellers.', Icon: ShoppingBag },
  { key: 'payments', title: 'Direct payments', desc: 'Customers pay the seller directly. Nodbusiness never holds the money.', Icon: CreditCard },
  { key: 'social', title: 'Social feed', desc: 'Posts, stories and a Business feed that shows what is near you first.', Icon: Users },
  { key: 'messaging', title: 'Messaging', desc: 'Direct chat, groups, channels and notifications.', Icon: MessageCircle },
  { key: 'assistant', title: 'AI assistant', desc: 'Help writing descriptions, finding things and answering questions.', Icon: Bot },
];

const TRUST: Item[] = [
  { key: 'reviews', title: 'Verified customer reviews', desc: '', Icon: Star },
  { key: 'direct', title: 'Direct payment to sellers', desc: '', Icon: CreditCard },
  { key: 'private', title: 'Private contact details', desc: '', Icon: Lock },
  { key: 'nearby', title: 'Nearby discovery', desc: '', Icon: MapPin },
];

/** The phone promo video and the two full videos (each downloaded only when its button is pressed). */
function HeroMedia({ tr }: { tr: (key: string, fallback: string) => string }) {
  return (
    // On desktop the phone is sized by the screen height (9:16), so the hero never grows past one screen.
    <div className="mx-auto w-full max-w-[300px] lg:w-[calc(min(54svh,520px)*9/16+1.25rem)] lg:max-w-none">
      <div className="rounded-[2.5rem] bg-inverse p-2.5 shadow-2xl shadow-black/30 ring-1 ring-border dark:shadow-black/40 dark:ring-white/15">
        <PromoVideo
          clip={PROMO.landing}
          className="aspect-[9/16] w-full rounded-[2rem] bg-white"
          sizes="300px"
          buttonClassName="bottom-3 right-3"
          description={tr('videoDescription', 'How Nodbusiness works, as an animation: a person shares a photo on the Personal feed, builds a website from a template or from sections by adding photos, pasting links and filling forms, publishes it to the Business feed, and customers order, message and pay them directly.')}
        />
      </div>
      <div className="mt-[clamp(0.75rem,2.5svh,1.25rem)] space-y-2">
        <p className={`${EYEBROW} text-muted-foreground dark:text-white/75`}>{tr('watch', 'Watch')}</p>
        <PromoGuide variant="row" meta={tr('guideLength', '3 min')} />
        <PromoGuide variant="row" video="builder" meta={tr('builderLength', '2 min')} />
      </div>
    </div>
  );
}

export default function LandingContent({ templateCount }: { templateCount: number }) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const tr = (key: string, fallback: string) => String(t(`landing.${key}`, fallback));

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      {/* ── Navigation: follows the theme; fits 320 px (Sign in only below sm; "Start free" is the hero's main button) ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/90 text-foreground backdrop-blur-xl dark:border-white/10 dark:bg-inverse/85 dark:text-white">
        <nav data-page-guide="landing-nav" aria-label={tr('navLabel', 'Main')} className={`${CONTAINER} flex h-16 items-center justify-between gap-2`}>
          <Link href="/landing" aria-label="Nodbusiness" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Wordmark tone="light" className="text-[1.05rem] min-[360px]:text-lg sm:text-2xl dark:hidden" />
            <Wordmark tone="dark" className="hidden text-[1.05rem] min-[360px]:text-lg sm:text-2xl dark:inline-flex" />
          </Link>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <LandingPreferences />
            <Link data-page-guide="landing-signin" href="/login" className="inline-flex h-9 items-center whitespace-nowrap rounded-lg px-2.5 text-sm font-semibold transition hover:bg-muted sm:px-3 dark:hover:bg-white/10">
              {tr('signIn', 'Sign in')}
            </Link>
            <Link data-page-guide="landing-register" href="/register" className={`hidden h-9 items-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold sm:inline-flex ${PRIMARY_COLORS}`}>
              {tr('startFree', 'Start free')}
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} className="outline-none">
      {/* ── Hero: exactly one screen tall (100svh, header included) on every device.
             Sizes follow both the width and the height of the screen, so nothing is
             pushed out; below lg the phone video moves to the next section. ── */}
      <section
        aria-labelledby="landing-title"
        data-testid="landing-hero"
        className="relative h-[100svh] overflow-hidden bg-[linear-gradient(160deg,hsl(var(--background))_0%,hsl(var(--primary-subtle))_55%,hsl(var(--brand-secondary-subtle))_100%)] pt-16 text-foreground dark:bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_47%,#7c3aed_100%)] dark:text-white"
      >
        <div aria-hidden="true" className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--primary)/0.07)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.07)_1px,transparent_1px)] [background-size:48px_48px] dark:opacity-25 dark:[background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)]" />
        <DemoEndedNotice />
        <div className={`${CONTAINER} relative grid h-full items-center gap-8 py-[clamp(0.75rem,3svh,2.5rem)] lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-14`}>
          <div data-page-guide="landing-actions" className="min-w-0">
            {/* Centred over the text column; sized by the screen's width and height. */}
            <GlobeLogo className="mx-auto w-[clamp(3.5rem,min(28vw,20svh),13rem)] drop-shadow-2xl" />
            <h1 id="landing-title" className="mt-[clamp(0.75rem,3svh,2rem)] text-balance text-[clamp(1.5rem,min(8.5vw,7svh),4.25rem)] font-extrabold leading-[1.08] tracking-tight">
              <span className="block">{tr('heroBuild', 'Build it.')}</span>{' '}
              <span className="block">{tr('heroConnect', 'Connect & share it.')}</span>{' '}
              <span className="block"><span className="underline decoration-primary/40 decoration-[0.09em] underline-offset-[0.14em] dark:decoration-white/45">{tr('heroSell', 'Buy or sell it.')}</span></span>
            </h1>
            <p className="mt-[clamp(0.5rem,2.2svh,1.5rem)] max-w-xl text-[clamp(1rem,min(4.2vw,2.4svh),1.25rem)] leading-relaxed text-muted-foreground [@media(max-height:599px)]:hidden dark:text-white/85">
              {tr('heroLead', 'Share your moments, build your showroom, and buy or sell with anyone: people, creators and businesses, in one app.')}
            </p>
            <div className="mt-[clamp(0.75rem,3.5svh,2.25rem)] flex flex-wrap items-center gap-3">
              <Link href="/register" data-testid="hero-start" className={PRIMARY}>
                {tr('startFree', 'Start free')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <TryDemoButton className={OUTLINE} label={tr('tryDemoShort', 'Try demo')} />
            </div>
            <Link data-page-guide="landing-guest" href="/feed" className="mt-[clamp(0.5rem,2svh,1.25rem)] inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-white/85 dark:hover:text-white">
              {tr('exploreLink', 'Or explore as a guest')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/* Desktop: the phone video, sized by the screen height, with the two full videos under it. */}
          <div className="hidden lg:block" data-testid="hero-media">
            <HeroMedia tr={tr} />
          </div>
        </div>
      </section>

      {/* ── Phones and tablets: the same videos, right under the hero ── */}
      <section aria-label={tr('watch', 'Watch')} className="border-b border-border bg-card py-12 lg:hidden" data-testid="landing-media-mobile">
        <div className={`${CONTAINER} mx-auto max-w-sm`}>
          <HeroMedia tr={tr} />
        </div>
      </section>

      {/* ── Built for ── */}
      <section aria-labelledby="landing-audience" className="border-b border-border bg-card py-12">
        <div className={CONTAINER}>
          <h2 id="landing-audience" className={`${EYEBROW} text-center text-muted-foreground`}>
            {tr('builtFor', 'Built for every kind of organisation')}
          </h2>
          <ul data-page-guide="landing-stats" className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {AUDIENCES.map(({ key, title, desc, Icon }) => (
              <li key={key} className="flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="text-sm font-semibold">{tr(`audiences.${key}.title`, title)}</span>
                <span className="text-xs leading-5 text-muted-foreground">{tr(`audiences.${key}.desc`, desc)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How it works ── */}
      <section aria-labelledby="landing-how" className="bg-background py-20 sm:py-24">
        <div className={CONTAINER}>
          <div className="max-w-2xl">
            <p className={`${EYEBROW} text-primary`}>{tr('howEyebrow', 'How it works')}</p>
            <h2 id="landing-how" className={`mt-3 ${H2}`}>{tr('howTitle', 'One app to build, connect, buy and sell.')}</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {tr('howLead', 'Whether you are sharing your day or running a company, you use the same three steps, and everyone can reach everyone.')}
            </p>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ key, title, desc, Icon }, i) => (
              <li key={key} className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="text-sm font-semibold text-muted-foreground">{tr('stepLabel', 'Step')} {i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{tr(`steps.${key}.title`, title)}</h3>
                <p className="mt-2 text-base leading-7 text-muted-foreground">{tr(`steps.${key}.desc`, desc)}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-base text-muted-foreground">
            {tr('templatesNote', '{{n}} ready templates, one for each kind of business.').replace('{{n}}', String(templateCount))}{' '}
            <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">{tr('startBuilding', 'Start building')}</Link>
          </p>
        </div>
      </section>

      {/* ── Platform ── */}
      <section aria-labelledby="landing-platform" className="bg-secondary py-20 sm:py-24">
        <div className={CONTAINER}>
          <div className="max-w-2xl">
            <p className={`${EYEBROW} text-primary`}>{tr('platformEyebrow', 'One connected platform')}</p>
            <h2 id="landing-platform" className={`mt-3 ${H2}`}>{tr('platformTitle', 'Everything your business needs, connected.')}</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {tr('platformLead', 'Your website, your customers and your orders live in one account, next to the social feed where people discover you.')}
            </p>
          </div>
          <div data-page-guide="landing-modules" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ key, title, desc, Icon }) => (
              <article key={key} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-5 text-lg font-semibold">{tr(`modules.${key}.title`, title)}</h3>
                <p className="mt-2 text-base leading-7 text-muted-foreground">{tr(`modules.${key}.desc`, desc)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section aria-labelledby="landing-trust" className="bg-background py-20 sm:py-24">
        <div className={`${CONTAINER} grid gap-12 lg:grid-cols-2 lg:items-center`}>
          <div>
            <p className={`${EYEBROW} text-brand-secondary`}>{tr('trustEyebrow', 'Built for trust')}</p>
            <h2 id="landing-trust" className={`mt-3 ${H2}`}>{tr('trustTitle', 'From showroom to payment, in one place.')}</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {tr('trustLead', 'Customers find you nearby, see your showroom, message you, pay you directly and leave a review once their order is complete.')}
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {TRUST.map(({ key, title, Icon }) => (
                <li key={key} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold">
                  <Icon className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  {tr(`trust.${key}`, title)}
                </li>
              ))}
            </ul>
          </div>
          <div aria-hidden="true" className="relative overflow-hidden rounded-3xl bg-inverse p-6 shadow-2xl shadow-primary/20 sm:p-10">
            <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:36px_36px]" />
            <div className="relative mx-auto max-w-sm rounded-[2rem] bg-inverse/70 p-3 shadow-2xl ring-1 ring-white/20">
              <div className="rounded-[1.5rem] bg-card p-4 text-card-foreground">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BrandLogo size={40} className="h-10 w-10 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Nodbusiness</p>
                      <p className="text-xs text-muted-foreground">{tr('dash.title', 'Business dashboard')}</p>
                    </div>
                  </div>
                  <LayoutGrid className="h-5 w-5 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { Icon: Store, label: tr('dash.showroom', 'Showroom'), value: tr('dash.live', 'Live'), bg: 'bg-primary' },
                    { Icon: Package, label: tr('dash.orders', 'Orders'), value: '128', bg: 'bg-success' },
                    { Icon: MessageCircle, label: tr('dash.messages', 'Messages'), value: '12', bg: 'bg-brand-secondary' },
                    { Icon: Star, label: tr('dash.rating', 'Rating'), value: '4.8', bg: 'bg-inverse ring-1 ring-border' },
                  ].map(({ Icon, label, value, bg }) => (
                    <div key={label} className={`rounded-2xl p-4 text-white ${bg}`}>
                      <Icon className="mb-5 h-5 w-5" />
                      <p className="text-xs text-white/80">{label}</p>
                      <p className="text-lg font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">{tr('dash.tipTitle', 'New booking request')}</p>
                    <BedDouble className="h-5 w-5 text-brand-secondary" />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{tr('dash.tip', 'Deluxe room · 2 nights · confirm to hold the dates.')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final call to action ── */}
      <section data-page-guide="landing-cta-section" aria-labelledby="landing-cta" className="bg-[linear-gradient(135deg,#1d4ed8_0%,#7c3aed_100%)] py-20 text-white sm:py-24">
        <div className={`${CONTAINER} text-center`}>
          <h2 id="landing-cta" className={H2}>{tr('ctaTitle', 'Start your showroom today.')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/85">
            {tr('ctaLead', 'Build it in minutes, change it whenever you want, and sell to customers who find you.')}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className={ON_BLUE_PRIMARY}>
              {tr('startFree', 'Start free')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/login" className={ON_BLUE_OUTLINE}>{tr('signIn', 'Sign in')}</Link>
          </div>
        </div>
      </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-inverse py-12 text-sm text-white/75">
        <div className={`${CONTAINER} grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]`}>
          <div>
            <Wordmark tone="dark" className="text-xl" />
            <p className="mt-3 max-w-xs leading-6">{tr('footerAbout', 'Business showrooms, social discovery and direct orders in one place.')}</p>
          </div>
          {[
            { key: 'product', title: 'Product', links: [['/marketplace', 'Marketplace'], ['/showrooms', 'Showrooms'], ['/businesses', 'Businesses']] },
            { key: 'account', title: 'Account', links: [['/login', 'Sign in'], ['/register', 'Create account'], ['/feed', 'Explore as guest']] },
            { key: 'legal', title: 'Legal', links: [['/service-agreement', 'Service agreement']] },
          ].map((col) => (
            <nav key={col.key} aria-label={tr(`footer.${col.key}`, col.title)}>
              <p className="font-semibold text-white">{tr(`footer.${col.key}`, col.title)}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map(([href, label]) => (
                  <li key={href}><Link href={href} className="hover:text-white hover:underline">{tr(`footer.links.${href.slice(1)}`, label)}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className={`${CONTAINER} mt-10 border-t border-white/10 pt-6 text-xs`}>
          © {year} Nodbusiness. {tr('rights', 'All rights reserved.')}
        </div>
      </footer>
    </div>
  );
}
