'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';
import client from '@/api/client';

type GuideStep = { target: string; title: string; description: string };

const copy = {
  en: {
    launcher: 'Page guide', next: 'Next', back: 'Back', skip: 'Skip guide', done: 'Finish',
    steps: {
      welcome: ['Welcome to Nodbusiness', 'This short guide highlights the main areas on this page. Select Next to move through each step.'],
      landingNav: ['Your account options', 'Create an account or sign in here. You can also change language and display preferences.'],
      landingActions: ['Choose how to explore', 'Create an account, try the practice workspace, or browse public businesses as a guest.'],
      header: ['Platform header', 'Use the header to reach your home page and find common platform actions.'],
      navigation: ['Platform navigation', 'Use the navigation to move between the platform areas available to your account.'],
      mobileNavigation: ['Mobile navigation', 'On smaller screens, use this bottom navigation to reach common areas. Open More for additional links.'],
      marketplaceSearch: ['Find products', 'Enter a product or keyword to narrow the marketplace results.'],
      marketplaceCategories: ['Browse by category', 'Choose a category to focus the product list on the items you need.'],
      marketplaceProducts: ['Explore the product list', 'Open a product card to see its details and available actions.'],
      searchInput: ['Search the platform', 'Enter a name, product, showroom, or post to see matching results.'],
      searchFilters: ['Refine your results', 'Choose a result type and use filters for sorting, distance, price, or date.'],
      feedBanner: ['Build a business showroom', 'Start creating a mini website for your business from this banner.'],
      feedContent: ['Explore the page', 'This is the main content area. Use the controls here to browse and interact with what is shown.'],
      generic: ['Page content', 'This is the main area for this page. Use its visible controls to continue.'],
    },
  },
  am: {
    launcher: 'የገጽ መመሪያ', next: 'ቀጣይ', back: 'ተመለስ', skip: 'መመሪያውን ዝለል', done: 'ጨርስ',
    steps: {
      welcome: ['ወደ Nodbusiness እንኳን በደህና መጡ', 'ይህ አጭር መመሪያ በዚህ ገጽ ያሉ ዋና ክፍሎችን ያሳያል። ወደ ቀጣዩ ለመሄድ “ቀጣይ”ን ይምረጡ።'],
      landingNav: ['የመለያ አማራጮች', 'እዚህ መለያ ይፍጠሩ ወይም ይግቡ። ቋንቋና የማሳያ ምርጫዎችንም መቀየር ይችላሉ።'],
      landingActions: ['እንዴት መጠቀም እንደሚፈልጉ ይምረጡ', 'መለያ ይፍጠሩ፣ የልምምድ ቦታውን ይሞክሩ ወይም ያለ መለያ ይፈልጉ።'],
      header: ['የመድረኩ ራስጌ', 'ወደ መነሻ ገጽ ለመመለስና የተለመዱ እርምጃዎችን ለማግኘት ራስጌውን ይጠቀሙ።'],
      navigation: ['የመድረክ አሰሳ', 'ለመለያዎ የሚገኙ የመድረኩን ክፍሎች ለመክፈት አሰሳውን ይጠቀሙ።'],
      mobileNavigation: ['የሞባይል አሰሳ', 'በትንንሽ ስክሪኖች ላይ ዋና ክፍሎችን ለመክፈት የታችኛውን አሰሳ ይጠቀሙ። ሌሎች አገናኞችን ለማየት “ተጨማሪ”ን ይክፈቱ።'],
      marketplaceSearch: ['ምርቶችን ያግኙ', 'የገበያ ውጤቶችን ለማጣራት የምርት ስም ወይም ቁልፍ ቃል ያስገቡ።'],
      marketplaceCategories: ['በምድብ ይፈልጉ', 'የሚፈልጉትን እቃዎች በተሻለ ለማየት ምድብ ይምረጡ።'],
      marketplaceProducts: ['የምርት ዝርዝሩን ይመልከቱ', 'ዝርዝሮቹንና የሚገኙ እርምጃዎችን ለማየት የምርት ካርድ ይክፈቱ።'],
      searchInput: ['በመድረኩ ይፈልጉ', 'ተዛማጅ ውጤቶችን ለማየት ሰው፣ ምርት፣ ሾውሩም ወይም ልጥፍ ያስገቡ።'],
      searchFilters: ['ውጤቶችን ያጣሩ', 'የውጤት አይነት ይምረጡ፤ በቅደም ተከተል፣ ርቀት፣ ዋጋ ወይም ቀን ያጣሩ።'],
      feedBanner: ['የንግድ ሾውሩም ይፍጠሩ', 'ከዚህ ባነር ለንግድዎ አነስተኛ ድረገጽ መፍጠር ይጀምሩ።'],
      feedContent: ['ገጹን ይመልከቱ', 'ይህ ዋናው የይዘት ክፍል ነው። የሚታዩትን መቆጣጠሪያዎች ይጠቀሙ።'],
      generic: ['የገጹ ይዘት', 'ይህ የገጹ ዋና ክፍል ነው። ለመቀጠል የሚታዩትን መቆጣጠሪያዎች ይጠቀሙ።'],
    },
  },
} as const;

type StepKey = keyof typeof copy.en.steps;

function buildSteps(pathname: string, language: 'en' | 'am', isMobile: boolean): GuideStep[] {
  const strings = copy[language].steps;
  const make = (key: StepKey, target: string): GuideStep => ({ target, title: strings[key][0], description: strings[key][1] });
  if (pathname === '/landing' || pathname === '/') return [make('landingNav', '[data-page-guide="landing-nav"]'), make('landingActions', '[data-page-guide="landing-actions"]')];
  if (pathname === '/marketplace') return [make('marketplaceSearch', '[data-page-guide="marketplace-search"]'), make('marketplaceCategories', '[data-page-guide="marketplace-categories"]'), make('marketplaceProducts', '[data-page-guide="marketplace-products"]')];
  if (pathname === '/search') return [make('searchInput', '[data-page-guide="search-input"]'), make('searchFilters', '[data-page-guide="search-tabs"]')];
  if (pathname === '/feed') return [make('feedBanner', '[data-page-guide="feed-banner"]'), make('feedContent', '[data-page-guide="feed-content"]')];
  return [make('header', '[data-page-guide="app-header"]'), make(isMobile ? 'mobileNavigation' : 'navigation', `[data-page-guide="${isMobile ? 'mobile-navigation' : 'desktop-navigation'}"]`), make('generic', '[data-page-guide="main-content"]')];
}

export default function PageGuide() {
  const pathname = usePathname() || '/';
  const { i18n } = useTranslation();
  const language: 'en' | 'am' = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('am') ? 'am' : 'en';
  const words = copy[language];
  const [isMobile, setIsMobile] = useState(false);
  const steps = useMemo(() => buildSteps(pathname, language, isMobile), [pathname, language, isMobile]);
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [card, setCard] = useState({ top: 0, left: 0 });
  const dialogRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setMounted(true);
    let active = true;
    client.get('/api/flags/page-guided-tours').then(({ data }) => {
      if (!active || data?.enabled_for_user !== true) return;
      setEnabled(true);
      try {
        if (!localStorage.getItem('nodbusiness-page-guide-seen')) setOpen(true);
      } catch { setOpen(true); }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const current = steps[index];
  const updatePosition = useCallback((scrollTarget = false) => {
    if (!open || !current) return;
    let target = document.querySelector(current.target);
    if (target instanceof HTMLElement && target.dataset.pageGuide === 'main-content') {
      target = target.querySelector('h1') ?? target.querySelector('button, a, input') ?? target;
    }
    if (target instanceof HTMLElement && target.dataset.pageGuide === 'marketplace-products' && target.getBoundingClientRect().height > 300) {
      target = target.firstElementChild instanceof HTMLElement ? target.firstElementChild : target;
    }
    if (!(target instanceof HTMLElement)) { setRect(null); return; }
    if (scrollTarget) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center', inline: 'nearest' });
    requestAnimationFrame(() => {
      const bounds = target.getBoundingClientRect();
      setRect(bounds);
      const width = Math.min(360, window.innerWidth - 32);
      const left = Math.max(16, Math.min(bounds.left + bounds.width / 2 - width / 2, window.innerWidth - width - 16));
      const below = bounds.bottom + 18;
      const top = below + 210 < window.innerHeight ? below : Math.max(16, bounds.top - 230);
      setCard({ top: Math.min(top, window.innerHeight - 220), left });
    });
  }, [current, open]);

  useEffect(() => {
    setIndex(0);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    updatePosition(true);
    const measure = () => updatePosition(false);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, updatePosition]);

  const close = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem('nodbusiness-page-guide-seen', 'true'); } catch { /* Storage can be disabled. */ }
    launcherRef.current?.focus();
  }, []);
  const advance = () => {
    if (index >= steps.length - 1) { close(); return; }
    setIndex(value => value + 1);
  };

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  if (!mounted || !enabled) return null;
  return <>
    <button ref={launcherRef} type="button" onClick={() => { setIndex(0); setOpen(true); }} className="fixed bottom-6 left-4 z-[900] inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-lg transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary max-md:bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]" aria-label={words.launcher}>
      <HelpCircle className="h-4 w-4" aria-hidden="true" />{words.launcher}
    </button>
    {open && mounted && createPortal(<div className="fixed inset-0 z-[1000]" aria-label="Page guide">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true" onClick={event => event.preventDefault()}>
        <defs><mask id="page-guide-mask"><rect width="100%" height="100%" fill="white" />{rect && <rect x={Math.max(0, rect.left - 8)} y={Math.max(0, rect.top - 8)} width={Math.min(window.innerWidth, rect.width + 16)} height={Math.min(window.innerHeight, rect.height + 16)} rx="14" fill="black" />}</mask></defs>
        <rect width="100%" height="100%" fill="rgba(3, 7, 18, 0.72)" mask="url(#page-guide-mask)" />
      </svg>
      {rect && <div aria-hidden="true" className="pointer-events-none fixed rounded-2xl border-2 border-blue-400 shadow-[0_0_0_2px_rgba(255,255,255,0.85)]" style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }} />}
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="page-guide-title" aria-describedby="page-guide-description" className="fixed z-[1002] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-2rem)] max-w-[22.5rem] overflow-y-auto rounded-2xl border border-border bg-background p-4 text-foreground shadow-2xl sm:p-5" style={{ top: card.top, left: card.left }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="mb-1 text-xs font-semibold text-primary">{index + 1} / {steps.length}</p><h2 id="page-guide-title" className="text-base font-bold leading-snug">{current?.title}</h2></div>
          <button type="button" onClick={close} className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={words.skip}><X className="h-4 w-4" /></button>
        </div>
        <p id="page-guide-description" aria-live="polite" className="text-sm leading-relaxed text-muted-foreground">{current?.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={close} className="min-h-11 px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">{words.skip}</button>
          <div className="flex items-center gap-2">
            {index > 0 && <button type="button" onClick={() => setIndex(value => value - 1)} className="min-h-11 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-secondary">{words.back}</button>}
            <button type="button" onClick={advance} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{index === steps.length - 1 ? words.done : words.next}</button>
          </div>
        </div>
      </section>
    </div>, document.body)}
  </>;
}
