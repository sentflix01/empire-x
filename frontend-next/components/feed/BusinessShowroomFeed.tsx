'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { entities } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

import {
  Store, ShoppingBag, MapPin, MessageSquare, ArrowRight, Clock,
  UtensilsCrossed, Briefcase, HeartPulse, Palette, CalendarDays,
  Home as HomeIcon, GraduationCap, LucideProps, ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findOrCreateConversation } from '@/lib/messaging';
import { getCategoryByValue } from '@/lib/businessTemplates';
import VerifiedBadge, { VerificationType } from '@/components/ui/VerifiedBadge';
import PurchaseModal from '@/components/checkout/PurchaseModal';
import SharedBookmarkButton from '@/components/ui/BookmarkButton';

/* ── Types ───────────────────────────────────────────────────────── */
interface SectionItem {
  name?: string;
  title?: string;
  description?: string;
  desc?: string;
  price?: string;
}

interface Section {
  type: string;
  title?: string;
  subtitle?: string;
  location?: string;
  items?: SectionItem[];
}

interface HourEntry {
  day: string;
  hours: string;
}

interface Product {
  id: string;
  title?: string;
  price?: number;
  currency?: string;
  images?: string;
}

interface Business {
  id: string;
  owner_id?: string;
  business_name?: string;
  business_category?: string;
  business_theme_color?: string;
  business_logo_url?: string;
  business_cover_url?: string;
  business_description?: string;
  business_address?: string;
  business_sections?: string;
  business_hours?: string;
  showroom_id?: string;
  showroom_slug?: string;
  [key: string]: unknown;
}

interface Profile {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  has_business_profile?: boolean;
  business_name?: string;
  business_description?: string;
  is_verified?: boolean;
  verification_type?: VerificationType;
  [key: string]: unknown;
}

interface User {
  id?: string;
  [key: string]: unknown;
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const parseImages = (v?: string): string[] => {
  try { return JSON.parse(v ?? '[]'); } catch { return v ? [v] : []; }
};
const parseSections = (v?: string): Section[] => {
  try { return JSON.parse(v ?? '[]'); } catch { return []; }
};
const parseHours = (v?: string): HourEntry[] => {
  try { return JSON.parse(v ?? '[]'); } catch { return []; }
};

type CatIconType = React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>;

const CAT_ICONS: Record<string, CatIconType> = {
  restaurant: UtensilsCrossed, shop: ShoppingBag, service: Briefcase,
  health: HeartPulse, portfolio: Palette, event: CalendarDays,
  realestate: HomeIcon, course: GraduationCap, other: Store,
};

/* ── Sub-components ──────────────────────────────────────────────── */
function ServicesList({ title, items, themeColor, onBuy }: {
  title?: string;
  items?: SectionItem[];
  themeColor: string;
  onBuy?: (item: SectionItem) => void;
}) {
  if (!items?.length) return null;
  return (
    <div>
      {title && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{title}</p>}
      <div className="space-y-1.5">
        {items.slice(0, 3).map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{item.name ?? item.title}</p>
              {(item.description ?? item.desc) && (
                <p className="text-xs text-muted-foreground truncate">{item.description ?? item.desc}</p>
              )}
            </div>
            {item.price && (
              <button
                onClick={() => onBuy?.(item)}
                className={`text-xs font-bold shrink-0 rounded-full px-2 py-0.5 transition-all ${
                  onBuy
                    ? 'hover:opacity-80 active:scale-95 cursor-pointer underline-offset-2 hover:underline'
                    : 'cursor-default'
                }`}
                style={{ color: themeColor }}
                aria-label={`Buy ${item.name ?? item.title} — ${item.price}`}
                type="button"
              >
                {item.price}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HoursPreview({ hours }: { hours: HourEntry[] }) {
  if (!hours.length) return null;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const row = hours.find(h => h.day === today);
  return (
    <div className="flex items-center gap-1.5">
      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">
        {row
          ? row.hours === 'Closed'
            ? <span className="text-red-500 font-medium">Closed today</span>
            : <><span className="text-green-600 font-medium">Open</span> · {row.hours}</>
          : 'Hours not set'}
      </span>
    </div>
  );
}

function FeatureChips({ items, themeColor }: { items?: SectionItem[]; themeColor: string }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.slice(0, 3).map((item, i) => (
        <span key={i} className="text-xs px-2.5 py-1 rounded-full"
          style={{ backgroundColor: themeColor + '18', color: themeColor }}>
          {item.title}
        </span>
      ))}
    </div>
  );
}

function SectionChips({ sections, themeColor }: { sections: Section[]; themeColor: string }) {
  const chips = sections.filter(s => s.title && s.type !== 'hero').slice(0, 4);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((s, i) => (
        <span key={i} className="text-xs px-2.5 py-1 rounded-full"
          style={{ backgroundColor: themeColor + '18', color: themeColor }}>
          {s.title}
        </span>
      ))}
    </div>
  );
}

function ProductsGrid({ products, themeColor, profileUserId, onBuy }: {
  products: Product[];
  themeColor: string;
  profileUserId: string;
  onBuy?: (product: Product) => void;
}) {
  if (!products.length) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Products</p>
        <Link href={`/profile/${profileUserId}?view=business`} className="text-xs font-medium" style={{ color: themeColor }}>
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {products.slice(0, 4).map(p => {
          const imgs = parseImages(p.images);
          return (
            <div key={p.id} className="rounded-lg border border-border/40 overflow-hidden hover:shadow-sm transition-all relative group">
              <Link href={`/products/${p.id}`}>
                <div className="aspect-square bg-secondary/20 relative overflow-hidden">
                  {imgs[0]
                    ? <NextImage src={imgs[0]} alt={p.title ?? ''} fill className="object-cover" unoptimized />
                    : <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                        <ShoppingBag className="w-5 h-5" />
                      </div>}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{p.title}</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color: themeColor }}>
                    {p.price?.toLocaleString()} {p.currency ?? 'ETB'}
                  </p>
                </div>
              </Link>
              {/* Quick-buy button — appears on hover */}
              {onBuy && p.price && (
                <button
                  onClick={() => onBuy(p)}
                  className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                  style={{ backgroundColor: themeColor }}
                  aria-label={`Buy ${p.title}`}
                  type="button"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PropertyGrid({ products, themeColor }: { products: Product[]; themeColor: string }) {
  if (!products.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Listings</p>
      <div className="grid grid-cols-2 gap-2">
        {products.slice(0, 2).map(p => {
          const imgs = parseImages(p.images);
          return (
            <Link href={`/products/${p.id}`} key={p.id}
              className="rounded-lg border border-border/40 overflow-hidden hover:shadow-sm transition-all">
              <div className="aspect-video bg-secondary/20 relative overflow-hidden">
                {imgs[0]
                  ? <NextImage src={imgs[0]} alt={p.title} fill className="object-cover" unoptimized />
                  : <div className="w-full h-full flex items-center justify-center">
                      <HomeIcon className="w-5 h-5 text-muted-foreground/20" />
                    </div>}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{p.title}</p>
                <p className="text-xs font-bold mt-0.5" style={{ color: themeColor }}>
                  {p.price?.toLocaleString()} ETB
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Category-specific content ───────────────────────────────────── */
interface CategoryContentProps {
  biz: Business | Profile;
  sections: Section[];
  products: Product[];
  themeColor: string;
  profileUserId: string;
  onBuyService?: (item: SectionItem) => void;
  onBuyProduct?: (product: Product) => void;
}

function CategoryContent({ biz, sections, products, themeColor, profileUserId, onBuyService, onBuyProduct }: CategoryContentProps) {
  const cat = (biz.business_category as string | undefined) ?? 'other';
  const get = (type: string) => sections.find(s => s.type === type);
  const servicesSection = get('services') ?? get('menu');
  const featuresSection = get('features');
  const hours = parseHours(biz.business_hours as string | undefined);

  switch (cat) {
    case 'restaurant':
      return (
        <div className="space-y-2.5">
          {(servicesSection?.items?.length ?? 0) > 0 && (
            <ServicesList title={servicesSection!.title ?? 'Menu Highlights'} items={servicesSection!.items} themeColor={themeColor} onBuy={onBuyService} />
          )}
          <HoursPreview hours={hours} />
        </div>
      );
    case 'shop':
      return (
        <div className="space-y-2.5">
          {products.length > 0
            ? <ProductsGrid products={products} themeColor={themeColor} profileUserId={profileUserId} onBuy={onBuyProduct} />
            : <FeatureChips items={featuresSection?.items} themeColor={themeColor} />}
        </div>
      );
    case 'service':
      return (
        <div className="space-y-2.5">
          {(servicesSection?.items?.length ?? 0) > 0
            ? <ServicesList title={servicesSection!.title ?? 'Services'} items={servicesSection!.items} themeColor={themeColor} onBuy={onBuyService} />
            : <FeatureChips items={featuresSection?.items} themeColor={themeColor} />}
        </div>
      );
    case 'health':
      return (
        <div className="space-y-2.5">
          {(servicesSection?.items?.length ?? 0) > 0 && (
            <ServicesList title={servicesSection!.title ?? 'Services'} items={servicesSection!.items} themeColor={themeColor} onBuy={onBuyService} />
          )}
          <HoursPreview hours={hours} />
        </div>
      );
    case 'course': {
      const coursesSec = get('courses') ?? servicesSection;
      return (
        <div className="space-y-2.5">
          {(coursesSec?.items?.length ?? 0) > 0
            ? <ServicesList title="Programs" items={coursesSec!.items} themeColor={themeColor} onBuy={onBuyService} />
            : <FeatureChips items={featuresSection?.items} themeColor={themeColor} />}
        </div>
      );
    }
    case 'event':
      return (
        <div className="space-y-2.5">
          {(servicesSection?.items?.length ?? 0) > 0 && (
            <ServicesList title={servicesSection!.title ?? 'Packages'} items={servicesSection!.items} themeColor={themeColor} onBuy={onBuyService} />
          )}
        </div>
      );
    case 'realestate':
      return (
        <div className="space-y-2.5">
          {products.length > 0
            ? <PropertyGrid products={products} themeColor={themeColor} />
            : <FeatureChips items={featuresSection?.items} themeColor={themeColor} />}
        </div>
      );
    case 'portfolio':
      return (
        <div className="space-y-2.5">
          {(servicesSection?.items?.length ?? 0) > 0
            ? <ServicesList title={servicesSection!.title} items={servicesSection!.items} themeColor={themeColor} onBuy={onBuyService} />
            : <SectionChips sections={sections} themeColor={themeColor} />}
        </div>
      );
    default:
      return <SectionChips sections={sections} themeColor={themeColor} />;
  }
}

/* ── Main export ─────────────────────────────────────────────────── */
interface BusinessShowroomFeedProps {
  profile?: Profile;
  currentUser?: User | null;
  businesses?: Business[];
}

export default function BusinessShowroomFeed({ profile, currentUser, businesses: propBusinesses }: BusinessShowroomFeedProps) {
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  const [feedBusinesses, setFeedBusinesses] = useState<Business[]>([]); // global feed mode
  const [feedError, setFeedError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [qrOpenId, setQrOpenId] = useState<string | null>(null); // QR popup
  const router = useRouter();
  const { user: signedInUser } = useAuth();
  const viewer = currentUser ?? signedInUser;

  // ── Purchase modal state ───────────────────────────────────────────
  const [purchaseModal, setPurchaseModal] = useState<{
    item: { id?: string; title: string; description?: string; price?: number; currency?: string; images?: string };
    seller: { user_id: string; business_name?: string; display_name?: string };
  } | null>(null);

  // ── Global feed mode (no profile prop) ────────────────────────────
  const isFeedMode = !profile;

  const loadFeedBusinesses = useCallback(async () => {
    setLoading(true);
    setFeedError('');
    try {
      const [businessRows, showroomRows] = await Promise.all([
        entities.Business.filter({}, '-created_at', 50) as Promise<Business[]>,
        entities.Showroom.filter({ status: 'published' }, '-created_at', 50) as Promise<Array<Record<string, unknown>>>,
      ]);
      const publishedShowrooms = showroomRows.filter(showroom => showroom.status === 'published');
      const showroomItems: Business[] = publishedShowrooms.map(showroom => {
        const sectionsJson = typeof showroom.sections === 'string'
          ? showroom.sections
          : JSON.stringify(showroom.sections ?? []);
        const contact = parseSections(sectionsJson).find(section => section.type === 'contact');
        return {
          ...showroom,
          id: String(showroom.id),
          owner_id: String(showroom.owner_id ?? ''),
          business_name: String(showroom.title ?? 'Business'),
          business_category: String(showroom.category ?? 'other'),
          business_theme_color: String(showroom.theme_color ?? '#2563EB'),
          business_logo_url: String(showroom.logo_url ?? ''),
          business_cover_url: String(showroom.cover_image ?? ''),
          business_description: String(showroom.description ?? ''),
          business_address: String(contact?.location ?? ''),
          business_sections: sectionsJson,
          showroom_id: String(showroom.id),
          showroom_slug: String(showroom.slug ?? ''),
        };
      });
      const nameKey = (value?: string) => String(value ?? '').trim().toLocaleLowerCase();
      const showroomKeys = new Set(publishedShowrooms.map(showroom =>
        `${showroom.owner_id}:${nameKey(String(showroom.title ?? ''))}`,
      ));
      const businessItems = businessRows
        .filter(business => !showroomKeys.has(`${business.owner_id}:${nameKey(business.business_name)}`))
        .map(business => {
          const matchingShowroom = publishedShowrooms.find(showroom =>
            showroom.owner_id === business.owner_id && nameKey(String(showroom.title ?? '')) === nameKey(business.business_name),
          );
          return matchingShowroom
            ? { ...business, showroom_id: String(matchingShowroom.id), showroom_slug: String(matchingShowroom.slug ?? '') }
            : business;
        });
      setFeedBusinesses([...showroomItems, ...businessItems]
        .sort((left, right) => Date.parse(String(right.created_at ?? '')) - Date.parse(String(left.created_at ?? '')))
        .slice(0, 50));
    } catch {
      setFeedBusinesses([]);
      setFeedError('We could not load business profiles. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const ownerId = profile?.user_id;
  const loadData = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const businesses: Business[] = (await entities.Business.filter({ owner_id: ownerId })) as Business[];
      setAllBusinesses(businesses ?? []);
      if (businesses.length > 0) setSelectedBizId(businesses[0].id);
    } catch { /* ignore */ }
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    if (isFeedMode) {
      loadFeedBusinesses();
      return;
    }
    if (!profile?.user_id) return;
    if (propBusinesses !== undefined) {
      setAllBusinesses(propBusinesses ?? []);
      if ((propBusinesses?.length ?? 0) > 0) setSelectedBizId(propBusinesses![0].id);
      setLoading(false);
    } else {
      loadData();
    }
  }, [isFeedMode, profile?.user_id, propBusinesses, loadData, loadFeedBusinesses]);

  useEffect(() => {
    if (isFeedMode || !selectedBizId) return;
    const biz = allBusinesses.find(b => b.id === selectedBizId);
    const filter = biz
      ? { business_id: biz.id, status: 'active' }
      : { seller_id: profile!.user_id, status: 'active' };
    entities.Product.filter(filter, '-created_at', 4)
      .then((p) => setProducts(p as unknown as Product[]))
      .catch(() => setProducts([]));
  }, [selectedBizId, isFeedMode, allBusinesses, profile]);

  const handleMessage = async (targetUserId: string, targetName: string) => {
    if (!currentUser || messaging) return;
    setMessaging(true);
    try {
      const conv = await findOrCreateConversation(currentUser, targetUserId, targetName);
      if (conv) router.push(`/messages/${conv.id}`);
    } catch (e) { console.error(e); }
    setMessaging(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Global feed mode — render a scrollable list of business cards ──
  if (isFeedMode) {
    const buildPath = signedInUser ? '/showroom/create' : '/register';
    if (feedBusinesses.length === 0) {
      return (
        <div className="text-center py-10 px-4">
          {feedError ? (
            <>
              <p role="alert" className="text-sm font-medium text-destructive">{feedError}</p>
              <button type="button" onClick={loadFeedBusinesses} className="mt-3 text-sm font-semibold text-primary hover:underline">Try again</button>
            </>
          ) : (
            <>
              <Store className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No published businesses yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create a showroom and publish it to share it here.</p>
              <Link href={buildPath} className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
                Build a showroom
              </Link>
            </>
          )}
        </div>
      );
    }
    return (
    <>
      <div className="space-y-4">
        {feedBusinesses.map((biz) => {
          const color      = (biz.business_theme_color as string) || '#2563EB';
          const bizName    = (biz.business_name as string)        || 'Business';
          const category   = (biz.business_category as string)    || 'other';
          const CatIcon    = CAT_ICONS[category] ?? Store;
          const sections   = parseSections(biz.business_sections as string | undefined);
          const heroSection= sections.find(s => s.type === 'hero');
          const servSection= sections.find(s => s.type === 'services');
          const logoUrl    = biz.business_logo_url as string | undefined;
          const coverUrl   = biz.business_cover_url as string | undefined;
          const ownerId    = biz.owner_id as string || '';
          const showroomSlug = typeof biz.showroom_slug === 'string' ? biz.showroom_slug : '';
          const showroomId = typeof biz.showroom_id === 'string' ? biz.showroom_id : '';
          const visitPath = showroomSlug
            ? `/showroom/${showroomSlug}`
            : showroomId
              ? `/showrooms/${showroomId}`
              : `/profile/${ownerId}?view=business`;
          const qrUrl = typeof window !== 'undefined'
            ? showroomSlug
              ? `${window.location.origin}/showroom/${showroomSlug}`
              : showroomId
                ? `${window.location.origin}/showrooms/${showroomId}`
                : `${window.location.origin}/profile/${ownerId}?view=business`
            : showroomSlug
              ? `https://nodbusiness.vercel.app/showroom/${showroomSlug}`
              : showroomId
                ? `https://nodbusiness.vercel.app/showrooms/${showroomId}`
                : `https://nodbusiness.vercel.app/profile/${ownerId}?view=business`;

          return (
            <div key={biz.id} className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-sm">
              {/* Cover */}
              <div className="relative h-24 overflow-hidden">
                {coverUrl
                  ? <NextImage src={coverUrl} alt={`${bizName}'s cover`} fill className="object-cover" unoptimized />
                  : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                      <div className="w-full h-full opacity-10" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',
                        backgroundSize: '12px 12px',
                      }} />
                    </div>}
                <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white bg-black/35 backdrop-blur-sm">
                  <CatIcon className="w-3 h-3" />
                  {category}
                </span>
              </div>

              {/* Header */}
              <div className="px-4 pb-3 -mt-6 relative">
                <div className="flex items-end justify-between">
                  <div className="flex items-end gap-2">
                    <div className="w-14 h-14 rounded-xl border-4 border-white overflow-hidden shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}>
                      {logoUrl
                        ? <NextImage src={logoUrl} alt={`${bizName}'s logo`} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                        : <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                            {bizName.charAt(0)}
                          </div>}
                    </div>
                    {/* QR code button — same size as logo square (w-14 h-14 rounded-xl) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setQrOpenId(qrOpenId === biz.id ? null : biz.id)}
                        className="w-14 h-14 rounded-xl border-4 border-white bg-white flex items-center justify-center hover:border-amber-400/60 transition-all shadow-sm overflow-hidden"
                        aria-label={`Show QR code for ${bizName}`}
                        title="Scan to open this business profile"
                      >
                        {/* Preview QR at button size — actual scannable QR in popup */}
                        <QRCodeSVG
                          value={qrUrl}
                          size={46}
                          level="L"
                          includeMargin={false}
                          style={{ display: 'block' }}
                        />
                      </button>
                      {/* Full-screen centered modal QR popup */}
                      {qrOpenId === biz.id && (
                        <>
                          {/* Backdrop */}
                          <div
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
                            onClick={() => setQrOpenId(null)}
                          >
                            {/* Modal — stopPropagation so clicking inside doesn't close */}
                            <div
                              className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-xs w-full animate-in fade-in zoom-in-95 duration-200"
                              onClick={e => e.stopPropagation()}
                            >
                              {/* Close button */}
                              <button
                                onClick={() => setQrOpenId(null)}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                type="button"
                                aria-label="Close QR code"
                              >
                                ✕
                              </button>
                              {/* Business logo + name */}
                              <div className="flex flex-col items-center mb-4">
                                <div className="w-14 h-14 rounded-xl border-2 overflow-hidden mb-2 shadow-sm" style={{ borderColor: color, backgroundColor: color }}>
                                  {logoUrl
                                    ? <NextImage src={logoUrl} alt={bizName} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                                    : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">{bizName.charAt(0)}</div>}
                                </div>
                                <h3 className="font-bold text-sm text-center text-slate-800 leading-tight px-2">{bizName}</h3>
                                {biz.business_address && (
                                  <p className="text-xs text-slate-400 text-center mt-0.5">{biz.business_address as string}</p>
                                )}
                              </div>
                              {/* Large scannable QR */}
                              <div className="flex justify-center">
                                <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-inner">
                                  <QRCodeSVG
                                    value={qrUrl}
                                    size={220}
                                    level="H"
                                    includeMargin
                                    imageSettings={{
                                      src: '/brand/nodbusiness-icon.svg',
                                      height: 36,
                                      width: 36,
                                      excavate: true,
                                    }}
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-center text-slate-400 mt-3 px-4">
                                Scan with your phone camera to open this business showroom — no account needed
                              </p>
                              <Link
                                href={visitPath}
                                className="mt-3 flex items-center justify-center gap-2 w-full h-9 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                                style={{ backgroundColor: color }}
                                onClick={() => setQrOpenId(null)}
                              >
                                Visit Business Profile
                              </Link>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <SharedBookmarkButton
                      targetId={showroomId || biz.id}
                      targetType="showroom"
                      itemData={{ title: bizName }}
                      className="w-8 h-8 rounded-full border border-border/40 bg-card/80 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-95 transition-all"
                    />
                  </div>
                  <div className="flex gap-2 mb-1">
                    {viewer && ownerId && ownerId !== viewer.id && (
                      <Button size="sm" variant="outline" className="rounded-full h-7 text-xs"
                        onClick={() => handleMessage(ownerId, bizName)} disabled={messaging}>
                        <MessageSquare className="w-3 h-3 mr-1" />Message
                      </Button>
                    )}
                    <Link href={visitPath}>
                      <Button size="sm" className="rounded-full h-7 text-xs text-white"
                        style={{ backgroundColor: color }}>
                        Visit <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <h3 className="mt-2 font-display text-base font-bold" style={{ color }}>{bizName}</h3>
                {heroSection?.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{heroSection.subtitle}</p>
                )}
                {biz.business_address && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {biz.business_address as string}
                  </p>
                )}
              </div>

              {/* Services preview */}
              {servSection?.items && servSection.items.length > 0 && (
                <div className="px-4 pb-4">
                  <ServicesList
                    title={servSection.title}
                    items={servSection.items}
                    themeColor={color}
                    onBuy={(svcItem) => {
                      // Parse price string like "ETB 500" or "From 30,000 ETB" → number
                      const priceStr = svcItem.price ?? '';
                      const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
                      setPurchaseModal({
                        item: {
                          title: svcItem.name ?? svcItem.title ?? 'Service',
                          description: svcItem.description ?? svcItem.desc,
                          price: priceNum,
                          currency: 'ETB',
                        },
                        seller: {
                          user_id: ownerId,
                          business_name: bizName,
                        },
                      });
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Purchase modal — shared across all feed-mode business cards */}
      {purchaseModal && (
        <PurchaseModal
          item={purchaseModal.item}
          seller={purchaseModal.seller}
          buyer={viewer ? { id: viewer.id as string } : undefined}
          onClose={() => setPurchaseModal(null)}
        />
      )}
    </>
    );
  }

  // ── Single profile mode (original behaviour) ───────────────────────
  const business = allBusinesses.find(b => b.id === selectedBizId) ?? null;
  const biz: Business | Profile = business ?? profile!;
  const bizName = (biz.business_name as string | undefined) ?? profile!.display_name ?? 'Business';
  const themeColor = (biz.business_theme_color as string | undefined) ?? '#2563EB';
  const sections = parseSections(biz.business_sections as string | undefined);
  const hasBusiness = allBusinesses.length > 0 || profile!.has_business_profile || biz.business_description;
  const category = (biz.business_category as string | undefined) ?? 'other';
  const categoryMeta = getCategoryByValue(category);
  const CatIcon = CAT_ICONS[category] ?? Store;
  const heroSection = sections.find(s => s.type === 'hero');
  const coverUrl = biz.business_cover_url as string | undefined;
  const logoUrl = biz.business_logo_url as string | undefined;

  if (!hasBusiness) {
    return (
      <div className="text-center py-8 px-4">
        <Store className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No business profile set up</p>
        <p className="text-xs text-muted-foreground/60 mt-1">This user hasn't created a business showroom yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Cover */}
      <div className="relative h-28 overflow-hidden">
        {coverUrl
          ? <NextImage src={coverUrl} alt={`${bizName}'s cover`} fill className="object-cover" unoptimized />
          : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}>
              <div className="w-full h-full opacity-10" style={{
                backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',
                backgroundSize: '12px 12px',
              }} />
            </div>}
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white bg-black/35 backdrop-blur-sm">
            <CatIcon className="w-3 h-3" />
            {categoryMeta?.label ?? category}
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="px-4 pb-3 -mt-8 relative">
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-2">
            <div className="w-16 h-16 rounded-2xl border-4 border-white overflow-hidden shrink-0 shadow-sm"
              style={{ backgroundColor: themeColor }}>
              {logoUrl
                ? <NextImage src={logoUrl} alt={`${bizName}'s logo`} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                    {bizName.charAt(0)}
                  </div>}
            </div>
            {business?.id && (
              <SharedBookmarkButton
                targetId={business.id}
                targetType="showroom"
                itemData={{ title: bizName }}
                className="w-8 h-8 rounded-full border border-border/40 bg-card/80 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-95 transition-all"
              />
            )}
          </div>
          <div className="flex gap-2 mb-1">
            <Button size="sm" variant="outline" className="rounded-full h-8 text-xs"
              onClick={() => handleMessage(profile!.user_id, bizName)} disabled={messaging}>
              <MessageSquare className="w-3 h-3 mr-1" />
              {messaging ? '...' : 'Message'}
            </Button>
            <Link href={`/profile/${profile!.user_id}?view=business`}>
              <Button size="sm" className="rounded-full h-8 text-xs text-white"
                style={{ backgroundColor: themeColor }}>
                Visit <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-2 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-base font-bold" style={{ color: themeColor }}>{bizName}</h3>
            {profile!.is_verified && (
              <VerifiedBadge type={profile!.verification_type} size="sm" />
            )}
          </div>
          {heroSection?.subtitle && (
            <p className="text-xs text-muted-foreground italic line-clamp-1">{heroSection.subtitle}</p>
          )}
          {biz.business_description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{biz.business_description as string}</p>
          )}
          {biz.business_address && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" /> {biz.business_address as string}
            </p>
          )}

          {allBusinesses.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
              {allBusinesses.map(b => (
                <button key={b.id} onClick={() => setSelectedBizId(b.id)}
                  className={`text-[10px] font-medium whitespace-nowrap shrink-0 px-2 py-0.5 rounded-full transition-all ${
                    b.id === selectedBizId ? 'text-white' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  }`}
                  style={b.id === selectedBizId ? { backgroundColor: (b.business_theme_color as string | undefined) ?? '#2563EB' } : {}}>
                  {b.business_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category-specific content */}
      <div className="px-4 pb-4">
        <CategoryContent
          biz={biz}
          sections={sections}
          products={products}
          themeColor={themeColor}
          profileUserId={profile!.user_id}
          onBuyService={(svcItem) => {
            const priceStr = svcItem.price ?? '';
            const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
            setPurchaseModal({
              item: {
                title: svcItem.name ?? svcItem.title ?? 'Service',
                description: svcItem.description ?? svcItem.desc,
                price: priceNum,
                currency: 'ETB',
              },
              seller: {
                user_id: profile!.user_id,
                business_name: bizName,
                display_name: profile!.display_name,
              },
            });
          }}
          onBuyProduct={(product) => {
            setPurchaseModal({
              item: {
                id: product.id,
                title: product.title ?? 'Product',
                price: product.price,
                currency: product.currency ?? 'ETB',
                images: product.images,
              },
              seller: {
                user_id: profile!.user_id,
                business_name: bizName,
                display_name: profile!.display_name,
              },
            });
          }}
        />
      </div>

      {/* Purchase modal */}
      {purchaseModal && (
        <PurchaseModal
          item={purchaseModal.item}
          seller={purchaseModal.seller}
          buyer={currentUser ? { id: currentUser.id as string } : undefined}
          onClose={() => setPurchaseModal(null)}
        />
      )}
    </div>
  );
}
