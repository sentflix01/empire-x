'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { entities } from '@/lib/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

import {
  Store, ShoppingBag, MapPin, MessageSquare, ArrowRight,
  UtensilsCrossed, Briefcase, HeartPulse, Palette, CalendarDays,
  Home as HomeIcon, GraduationCap, LucideProps,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStartChat } from '@/lib/messaging';
import { getCategoryByValue } from '@/lib/businessTemplates';
import VerifiedBadge, { VerificationType } from '@/components/ui/VerifiedBadge';
import PurchaseModal from '@/components/checkout/PurchaseModal';
import SharedBookmarkButton from '@/components/ui/BookmarkButton';
import BusinessSpotlight from './BusinessSpotlight';
import TickerBar from './TickerBar';
import { businessToFeedBusiness, showroomToFeedBusiness } from '@/lib/feedBusiness';
import { useTranslation } from 'react-i18next';
import { RatingSummary } from '@/components/ui/Stars';
import DistanceRange from '@/components/ui/DistanceRange';
import { fetchBusinessFeed, type BusinessFeedSort, type FeedRelationship } from '@/lib/api/feed';
import { useViewerLocation, type ViewerLocation } from '@/hooks/useViewerLocation';
import { DemoBadge } from '@/components/profile/DemoBadge';
import { themeTextStyle, fillForWhiteText } from '@/lib/contrast';
import { BRAND } from '@/lib/brandAssets';

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
  // Additional fields accessed by spotlight auto-pick logic
  dishes?: SectionItem[];
  services?: SectionItem[];
  events?: Array<{ title?: string; date?: string; price?: string; seats?: string; product_id?: string }>;
  plans?: Array<{ name?: string; price?: string; period?: string; features?: string; product_id?: string }>;
  features?: Array<{ name?: string; desc?: string }>;
  stats?: Array<{ number?: string; label?: string }>;
  galleryImages?: Array<{ url?: string; caption?: string }>;
  [key: string]: unknown;
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
  spotlight_mode?: string | null;
  spotlight_section_ids?: string;
  spotlight_carousel_count?: number;
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
const parseSections = (v?: string): Section[] => {
  try { return JSON.parse(v ?? '[]'); } catch { return []; }
};

type CatIconType = React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>;

const CAT_ICONS: Record<string, CatIconType> = {
  restaurant: UtensilsCrossed, shop: ShoppingBag, service: Briefcase,
  health: HeartPulse, portfolio: Palette, event: CalendarDays,
  realestate: HomeIcon, course: GraduationCap, other: Store,
};

/* ── Sub-components ──────────────────────────────────────────────── */
/* ── BusinessFeedCard (extracted per-card component for feed mode) ── */
export interface BusinessFeedCardProps {
  biz: Business;
  ownerName?: string | null;
  ownerAvatarUrl?: string | null;
  ownerIsVerified?: boolean;
  ownerIsSeed?: boolean;
  /** Profile-level ticker — fallback when no feed_ticker builder section is set */
  ownerTickerText?: string | null;
  ownerTickerType?: string | null;
  viewer?: { id?: string } | null;
  onMessage?: (ownerId: string, bizName: string) => void;
  /** Distance from the viewer, rounded to 0.5 km by the server; null without a map pin. */
  distanceKm?: number | null;
  /** 'friend' = the viewer and the owner follow each other; 'following' = only the viewer follows. */
  relationship?: FeedRelationship;
  /** Average stars from verified customers (business_reviews) and how many reviewed. */
  ratingAvg?: number | null;
  ratingCount?: number;
}

export function BusinessFeedCard({ biz, ownerName, ownerAvatarUrl, ownerIsVerified, ownerIsSeed, viewer, onMessage, ownerTickerText, ownerTickerType, distanceKm, relationship, ratingAvg, ratingCount }: BusinessFeedCardProps) {
  const { t } = useTranslation();
  const [qrOpen, setQrOpen] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{
    item: { id?: string; title: string; description?: string; price?: number; currency?: string; images?: string };
    seller: { user_id: string; business_name?: string; display_name?: string };
  } | null>(null);

  const color      = (biz.business_theme_color as string) || '#2563EB';
  const bizName    = (biz.business_name as string)        || 'Business';
  const category   = (biz.business_category as string)    || 'other';
  const CatIcon    = CAT_ICONS[category] ?? Store;
  const sections   = parseSections(biz.business_sections as string | undefined);
  const heroSection= sections.find(s => s.type === 'hero');
  const logoUrl    = biz.business_logo_url as string | undefined;
  const coverUrl   = biz.business_cover_url as string | undefined;
  const ownerId    = biz.owner_id as string || '';
  const showroomSlug = typeof biz.showroom_slug === 'string' ? biz.showroom_slug : '';
  const showroomId = typeof biz.showroom_id === 'string' ? biz.showroom_id : '';
  // Products are linked to the business: a showroom card carries business_id, a business card is the business.
  const businessIdForCard = typeof biz.business_id === 'string' && biz.business_id
    ? biz.business_id
    : (!biz.showroom_slug && typeof biz.id === 'string' ? biz.id : null);
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

  // "Message" opens the business chat (shown as the business), with the site as context.
  const chat = useStartChat();
  const handleMessage = () => {
    if (onMessage) { onMessage(ownerId, bizName); return; }
    void chat.start({
      businessId: businessIdForCard,
      userId: ownerId,
      context: showroomId ? { kind: 'showroom', id: showroomId } : undefined,
    });
  };

  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-sm">
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
        {typeof distanceKm === 'number' && (
          <span data-testid="biz-distance" className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {distanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} {t('feed.kmAway', 'km away')}
          </span>
        )}
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
            {/* QR code button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setQrOpen(v => !v)}
                className="w-14 h-14 rounded-xl border-4 border-white bg-white flex items-center justify-center hover:border-primary/60 transition-all shadow-sm overflow-hidden"
                aria-label={`Show QR code for ${bizName}`}
                title="Scan to open this business profile"
              >
                <QRCodeSVG
                  value={qrUrl}
                  size={46}
                  level="L"
                  includeMargin={false}
                  style={{ display: 'block' }}
                  aria-hidden="true"
                />
              </button>
              {qrOpen && (
                <>
                  <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
                    onClick={() => setQrOpen(false)}
                  >
                    <div
                      className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-xs w-full animate-in fade-in zoom-in-95 duration-200"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setQrOpen(false)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        type="button"
                        aria-label="Close QR code"
                      >
                        ✕
                      </button>
                      <div className="flex flex-col items-center mb-4">
                        <div className="w-14 h-14 rounded-xl border-2 overflow-hidden mb-2 shadow-sm" style={{ borderColor: color, backgroundColor: color }}>
                          {logoUrl
                            ? <NextImage src={logoUrl} alt={bizName} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                            : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">{bizName.charAt(0)}</div>}
                        </div>
                        <h3 className="font-bold text-sm text-center text-foreground leading-tight px-2">{bizName}</h3>
                        {biz.business_address && (
                          <p className="text-xs text-muted-foreground text-center mt-0.5">{biz.business_address as string}</p>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <div className="p-3 bg-white rounded-2xl border border-border shadow-inner">
                          <QRCodeSVG
                            value={qrUrl}
                            size={220}
                            level="H"
                            includeMargin
                            imageSettings={{
                              src: BRAND.icon,
                              height: 36,
                              width: 36,
                              excavate: true,
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-3 px-4">
                        Scan with your phone camera to open this business showroom — no account needed
                      </p>
                      <Link
                        href={visitPath}
                        className="mt-3 flex items-center justify-center gap-2 w-full h-9 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{ backgroundColor: fillForWhiteText(color) }}
                        onClick={() => setQrOpen(false)}
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
          <div className="flex shrink-0 gap-1.5 mb-1">
            {viewer && ownerId && ownerId !== viewer.id && (
              <Button size="sm" variant="outline" className="rounded-full h-7 px-2.5 text-xs"
                onClick={handleMessage} disabled={chat.busy} aria-label={`Message ${bizName}`}>
                {/* Icon only on small phones so the row fits inside the card. */}
                <MessageSquare className="w-3 h-3 min-[400px]:mr-1" aria-hidden="true" /><span className="hidden min-[400px]:inline">Message</span>
              </Button>
            )}
            <Link href={visitPath}>
              <Button size="sm" className="rounded-full h-7 text-xs text-white"
                style={{ backgroundColor: fillForWhiteText(color) }}>
                Visit <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
        {/* Fixed rows (name, owner, tagline, address) so every card is the same height. */}
        <h3 className="biz-text mt-2 h-6 truncate font-display text-base font-bold leading-6" style={{ ...themeTextStyle(color) }} title={bizName}>{bizName}</h3>
        {/* Owner identity */}
        <div className="flex h-5 items-center">
        {ownerName && (
          <Link
            href={`/profile/${ownerId}`}
            className="flex items-center gap-1 mt-0.5 group w-fit"
            onClick={e => e.stopPropagation()}
          >
            {ownerAvatarUrl ? (
              <NextImage
                src={ownerAvatarUrl}
                alt={ownerName}
                width={16}
                height={16}
                className="w-4 h-4 rounded-full object-cover shrink-0"
                unoptimized
              />
            ) : (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ backgroundColor: fillForWhiteText(color) }}>
                {ownerName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[140px]">
              {ownerName}
            </span>
            {ownerIsVerified && (
              <VerifiedBadge type="personal" size="sm" />
            )}
          </Link>
        )}
        {relationship && (
          <span data-testid="biz-relationship" className={`ml-1 inline-flex h-4 items-center rounded-full px-1.5 text-[10px] font-bold leading-none ${relationship === 'friend' ? 'bg-brand-secondary-subtle text-brand-secondary-subtle-foreground' : 'bg-primary-subtle text-primary-subtle-foreground'}`}>
            {relationship === 'friend' ? t('feed.friend', 'Friend') : t('feed.following', 'Following')}
          </span>
        )}
        {ownerIsSeed && <span className="ml-1 inline-flex align-middle"><DemoBadge /></span>}
        </div>
        <p className="h-4 truncate text-xs leading-4 text-muted-foreground">
          {heroSection?.subtitle || (biz.business_description as string | undefined) || ''}
        </p>
        <p className="mt-1 flex h-4 items-center gap-1 text-xs leading-4 text-muted-foreground">
          <RatingSummary average={ratingAvg} count={ratingCount} className="shrink-0 mr-1" />
          {biz.business_address && (<>
            <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{biz.business_address as string}</span>
          </>)}
        </p>
      </div>

      {/* Spotlight: a fixed-height sliding strip of one selling section (lib/spotlight.ts) */}
      <BusinessSpotlight
        visitHref={visitPath}
        sections={sections as unknown as Array<Record<string, any>>}
        spotlightMode={(biz.spotlight_mode as string | null | undefined) ?? null}
        spotlightSectionIds={biz.spotlight_section_ids}
        themeColor={color}
        ownerId={ownerId}
        businessId={businessIdForCard}
        showroomId={showroomId || null}
        profile={{ ...biz, business_name: bizName, display_name: bizName }}
        isOwner={!!viewer?.id && viewer.id === ownerId}
        onBuy={(item) => setPurchaseModal({
          item: item as { id?: string; title: string; description?: string; price?: number; currency?: string; images?: string },
          seller: { user_id: ownerId, business_name: bizName },
        })}
      />

      {/* Feed announcement ticker — sources checked in priority order:
           1. feed_ticker builder section (set in Showroom Studio)
           2. profile-level ticker_text (set in ProfileEdit)
           3. contact section phone/email inside the showroom sections (auto-generated) */}
      {(() => {
        // Source 1: explicit feed_ticker builder section
        const tickerSection = sections.find((s: Record<string, any>) => s.type === 'feed_ticker');
        if (tickerSection?.tickerText) {
          return (
            <TickerBar
              text={String(tickerSection.tickerText)}
              type={tickerSection.tickerType ? String(tickerSection.tickerType) : 'auto'}
            />
          );
        }

        // Source 2: profile-level ticker_text (set in ProfileEdit)
        if (ownerTickerText && ownerTickerType !== 'none') {
          return <TickerBar text={ownerTickerText} type={ownerTickerType || 'auto'} />;
        }

        // Source 3: auto-generate from the contact section inside the showroom sections
        // This shows for ALL businesses that have a contact section — no user action needed
        const contactSection = sections.find((s: Record<string, any>) => s.type === 'contact');
        if (contactSection) {
          const phone   = (contactSection.phone   as string | undefined)?.trim();
          const email   = (contactSection.email   as string | undefined)?.trim();
          const address = (contactSection.location as string | undefined)?.trim();
          const autoText = phone
            ? `📞 ${phone}  ·  ${bizName}`
            : email
            ? `✉️ ${email}  ·  ${bizName}`
            : address
            ? `📍 ${address}  ·  ${bizName}`
            : null;
          if (autoText) return <TickerBar text={autoText} type="contact" />;
        }

        // Source 4: fallback to business-level contact fields on the biz object itself
        const bizPhone   = (biz.business_contact_phone as string | undefined)?.trim();
        const bizEmail   = (biz.business_contact_email as string | undefined)?.trim();
        const bizAddress = (biz.business_address       as string | undefined)?.trim();
        const fallback = bizPhone
          ? `📞 ${bizPhone}  ·  ${bizName}`
          : bizEmail
          ? `✉️ ${bizEmail}  ·  ${bizName}`
          : bizAddress
          ? `📍 ${bizAddress}  ·  ${bizName}`
          : null;
        if (fallback) return <TickerBar text={fallback} type="contact" />;

        return null;
      })()}

      {/* Inline PurchaseModal */}
      {purchaseModal && (
        <PurchaseModal
          item={purchaseModal.item}
          seller={purchaseModal.seller}
          buyer={viewer ? { id: viewer.id as string } : undefined}
          showroomId={showroomId || undefined}
          businessId={businessIdForCard}
          onClose={() => setPurchaseModal(null)}
        />
      )}

    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────── */
interface BusinessShowroomFeedProps {
  profile?: Profile;
  currentUser?: User | null;
  businesses?: Business[];
}


/** "Near you" / "Newest" for the Business feed. */
function FeedSortSwitch({ sort, locating, onChange }: { sort: BusinessFeedSort; locating: boolean; onChange: (sort: BusinessFeedSort) => void }) {
  const { t } = useTranslation();
  const option = (value: BusinessFeedSort, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      aria-pressed={sort === value}
      onClick={() => onChange(value)}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${sort === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
    >
      {icon}{label}
    </button>
  );
  return (
    <div className="mb-3 flex items-center gap-2" role="group" aria-label={t('feed.sortBusinesses', 'Sort businesses')}>
      {option('nearest', t('feed.nearYou', 'Near you'), locating ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : <MapPin className="h-3.5 w-3.5" aria-hidden="true" />)}
      {option('recent', t('feed.newest', 'Newest'), null)}
    </div>
  );
}

/** Loads the next page when it scrolls into view (same pattern as the Personal feed). */
function LoadMoreSentinel({ onVisible, loading }: { onVisible: () => void; loading: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) onVisible(); }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible]);
  return (
    <div ref={ref} className="flex justify-center py-4" aria-hidden={!loading}>
      {loading && <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />}
    </div>
  );
}

/**
 * The feed's load error. "Check your connection" only when no answer came back;
 * a server error (for example a Demo database that is briefly unavailable) is
 * not the visitor's connection.
 */
export function feedLoadErrorMessage(err: unknown): string {
  const status = err && typeof err === 'object' ? (err as { status?: unknown }).status : undefined;
  return typeof status === 'number'
    ? 'Business profiles could not be loaded right now. Please try again in a moment.'
    : 'We could not load business profiles. Check your connection and try again.';
}

export default function BusinessShowroomFeed({ profile, currentUser, businesses: propBusinesses }: BusinessShowroomFeedProps) {
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  const [feedBusinesses, setFeedBusinesses] = useState<Business[]>([]); // global feed mode
  const [feedError, setFeedError] = useState('');
  // Profile mode: the owner's published sites carry the sections and spotlight settings.
  const [ownerShowrooms, setOwnerShowrooms] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  // Owner display names for feed-mode cards — keyed by owner_id
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, {
    display_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
    is_seed?: boolean;
    ticker_text?: string;
    ticker_type?: string;
  }>>({});
  const { user: signedInUser } = useAuth();
  const viewer = currentUser ?? signedInUser;
  const { t } = useTranslation();

  // ── Purchase modal state for single-profile mode ───────────────────
  const [singlePurchaseModal, setSinglePurchaseModal] = useState<{
    item: { id?: string; title: string; description?: string; price?: number; currency?: string; images?: string };
    seller: { user_id: string; business_name?: string; display_name?: string };
  } | null>(null);

  // ── Global feed mode (no profile prop) ────────────────────────────
  const isFeedMode = !profile;

  // Business feed: built on the server, nearest first when the viewer allows location.
  const [feedSort, setFeedSort] = useState<BusinessFeedSort>('recent');
  const [feedMeta, setFeedMeta] = useState<Record<string, { distance_km: number | null; relationship: FeedRelationship; rating_avg: number | null; rating_count: number }>>({});
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { request: requestLocation, status: locationStatus } = useViewerLocation();
  const pointRef = React.useRef<ViewerLocation | null>(null);
  // How far "Near you" looks; null = no limit. The viewer moves it freely.
  const [feedRadius, setFeedRadius] = useState<number | null>(null);
  const radiusRef = React.useRef<number | null>(null);

  const loadFeedPage = useCallback(async (sort: BusinessFeedSort, offset: number) => {
    const point = sort === 'nearest' ? pointRef.current : null;
    const page = await fetchBusinessFeed({ sort, offset, lat: point?.lat, lon: point?.lon, radiusKm: radiusRef.current });
    const cards: Business[] = [];
    const meta: Record<string, { distance_km: number | null; relationship: FeedRelationship; rating_avg: number | null; rating_count: number }> = {};
    for (const item of page.items) {
      const card = (item.type === 'showroom' ? showroomToFeedBusiness(item.record) : item.record) as Business;
      cards.push(card);
      meta[String(card.id)] = { distance_km: item.distance_km, relationship: item.relationship, rating_avg: item.rating_avg ?? null, rating_count: item.rating_count ?? 0 };
    }
    const owners: typeof ownerProfiles = {};
    for (const [id, o] of Object.entries(page.owners)) {
      owners[id] = {
        display_name: o.display_name ?? undefined,
        avatar_url: o.avatar_url ?? undefined,
        is_verified: o.is_verified,
        is_seed: o.is_seed,
        ticker_text: o.ticker_text ?? undefined,
        ticker_type: o.ticker_type ?? undefined,
      };
    }
    return { cards, meta, owners, next: page.next_offset };
  }, []);

  const loadFeedBusinesses = useCallback(async (sort: BusinessFeedSort = feedSort) => {
    setLoading(true);
    setFeedError('');
    try {
      const { cards, meta, owners, next } = await loadFeedPage(sort, 0);
      setFeedBusinesses(cards);
      setFeedMeta(meta);
      setOwnerProfiles(owners);
      setNextOffset(next);
    } catch (err) {
      setFeedBusinesses([]);
      setFeedError(feedLoadErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [feedSort, loadFeedPage]);

  const loadMoreFeed = useCallback(async () => {
    if (nextOffset === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const { cards, meta, owners, next } = await loadFeedPage(feedSort, nextOffset);
      setFeedBusinesses((prev) => [...prev, ...cards.filter((c) => !prev.some((p) => p.id === c.id))]);
      setFeedMeta((prev) => ({ ...prev, ...meta }));
      setOwnerProfiles((prev) => ({ ...prev, ...owners }));
      setNextOffset(next);
    } catch { /* keep what is shown; the sentinel retries on the next scroll */ }
    finally { setLoadingMore(false); }
  }, [feedSort, loadFeedPage, loadingMore, nextOffset]);

  const chooseSort = useCallback(async (sort: BusinessFeedSort) => {
    if (sort === 'nearest' && !pointRef.current) pointRef.current = await requestLocation();
    setFeedSort(sort);
    void loadFeedBusinesses(sort);
  }, [loadFeedBusinesses, requestLocation]);

  const chooseRadius = useCallback((km: number | null) => {
    radiusRef.current = km;
    setFeedRadius(km);
    void loadFeedBusinesses('nearest');
  }, [loadFeedBusinesses]);

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
      let cancelled = false;
      (async () => {
        let granted = false;
        try {
          const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
          granted = perm?.state === 'granted';
        } catch { /* older browsers: start with Newest */ }
        if (cancelled) return;
        if (granted) await chooseSort('nearest');
        else void loadFeedBusinesses('recent');
      })();
      return () => { cancelled = true; };
    }
    if (!profile?.user_id) return;
    if (propBusinesses !== undefined) {
      setAllBusinesses(propBusinesses ?? []);
      if ((propBusinesses?.length ?? 0) > 0) setSelectedBizId(propBusinesses![0].id);
      setLoading(false);
    } else {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the first feed load runs once; sort changes reload through chooseSort
  }, [isFeedMode, profile?.user_id, propBusinesses, loadData]);

  useEffect(() => {
    if (isFeedMode || !profile?.user_id) return;
    let cancelled = false;
    (entities.Showroom.filter({ owner_id: profile.user_id, status: 'published' }, '-created_at', 20) as Promise<Array<Record<string, any>>>)
      .then((rows) => { if (!cancelled) setOwnerShowrooms((rows ?? []).filter((r) => r.status === 'published')); })
      .catch(() => { if (!cancelled) setOwnerShowrooms([]); });
    return () => { cancelled = true; };
  }, [isFeedMode, profile?.user_id]);

  const chat = useStartChat();
  const handleMessage = (target: { businessId?: string | null; userId?: string | null }) => {
    void chat.start({ businessId: target.businessId, userId: target.userId });
  };

  // Sort and distance stay on screen while the feed reloads or is empty, so the
  // viewer can always look farther.
  const feedControls = isFeedMode ? (
    <>
      <FeedSortSwitch sort={feedSort} locating={locationStatus === 'locating'} onChange={chooseSort} />
      {feedSort === 'nearest' && (
        <DistanceRange id="feed-distance" value={feedRadius} onChange={chooseRadius} allowAnywhere defaultKm={10} className="mb-3 rounded-2xl border border-border/50 bg-card p-3" />
      )}
      {feedSort === 'nearest' && locationStatus === 'fallback' && (
        <p className="mb-3 text-xs text-muted-foreground" role="status">{t('feed.defaultLocation', 'We could not get your location, so distances are from central Addis Ababa.')}</p>
      )}
    </>
  ) : null;

  if (loading) {
    return (
      <>
        {feedControls}
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </>
    );
  }

  // ── Global feed mode — render a scrollable list of business cards ──
  if (isFeedMode) {
    const buildPath = signedInUser ? '/showroom/create' : '/register';
    if (feedBusinesses.length === 0) {
      return (
        <>
        {feedControls}
        <div className="text-center py-10 px-4">
          {feedError ? (
            <>
              <p role="alert" className="text-sm font-medium text-destructive">{feedError}</p>
              <button type="button" onClick={() => void loadFeedBusinesses()} className="mt-3 text-sm font-semibold text-primary hover:underline">Try again</button>
            </>
          ) : feedSort === 'nearest' && feedRadius !== null ? (
            <p data-testid="feed-none-in-range" className="text-sm font-medium text-muted-foreground">
              {t('feed.noneWithin', 'No businesses within')} {feedRadius} km. {t('feed.lookFarther', 'Move the distance up to look farther.')}
            </p>
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
        </>
      );
    }
    return (
    <>
      {feedControls}
      <div className="space-y-4">
        {feedBusinesses.map((biz) => {
          const ownerId = biz.owner_id as string || '';
          const op = ownerProfiles[ownerId];
          const meta = feedMeta[String(biz.id)];
          return (
            <BusinessFeedCard
              key={biz.id}
              biz={biz}
              ownerName={op?.display_name}
              ownerAvatarUrl={op?.avatar_url}
              ownerIsVerified={op?.is_verified}
              ownerIsSeed={op?.is_seed}
              ownerTickerText={op?.ticker_text ?? null}
              ownerTickerType={op?.ticker_type ?? null}
              viewer={viewer}
              distanceKm={meta?.distance_km ?? null}
              relationship={meta?.relationship ?? null}
              ratingAvg={meta?.rating_avg ?? null}
              ratingCount={meta?.rating_count ?? 0}
            />
          );
        })}
      </div>
      {nextOffset !== null && <LoadMoreSentinel onVisible={loadMoreFeed} loading={loadingMore} />}
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
              style={{ backgroundColor: fillForWhiteText(themeColor) }}>
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
              onClick={() => handleMessage({ businessId: business?.id ?? null, userId: profile!.user_id })} disabled={chat.busy}>
              <MessageSquare className="w-3 h-3 mr-1" />
              {chat.busy ? '...' : 'Message'}
            </Button>
            <Link href={`/profile/${profile!.user_id}?view=business`}>
              <Button size="sm" className="rounded-full h-8 text-xs text-white"
                style={{ backgroundColor: fillForWhiteText(themeColor) }}>
                Visit <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-2 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="biz-text font-display text-base font-bold" style={{ ...themeTextStyle(themeColor) }}>{bizName}</h3>
            {profile!.is_verified && (
              <VerifiedBadge type={profile!.verification_type} size="sm" />
            )}
          </div>
          {heroSection?.subtitle && (
            <p className="text-xs text-muted-foreground italic line-clamp-1">{heroSection.subtitle}</p>
          )}
          {typeof biz.business_description === 'string' && biz.business_description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{biz.business_description}</p>
          )}
          {typeof biz.business_address === 'string' && biz.business_address && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" /> {biz.business_address}
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

      {/* Spotlight: the same one-section showcase as on the feed card (lib/spotlight.ts) */}
      {(() => {
        const card = business ? businessToFeedBusiness(business, ownerShowrooms) : null;
        const cardSections = card ? parseSections(card.business_sections as string | undefined) : sections;
        const cardShowroomId = card && typeof card.showroom_id === 'string' ? card.showroom_id : null;
        return (
          <BusinessSpotlight
            visitHref={`/profile/${profile!.user_id}?view=business`}
            sections={cardSections as unknown as Array<Record<string, any>>}
            spotlightMode={(card?.spotlight_mode as string | null | undefined) ?? null}
            spotlightSectionIds={card?.spotlight_section_ids}
            themeColor={themeColor}
            ownerId={profile!.user_id}
            businessId={business?.id ?? null}
            showroomId={cardShowroomId}
            profile={{ ...(card ?? biz), business_name: bizName, display_name: bizName }}
            isOwner={!!viewer?.id && viewer.id === profile!.user_id}
            onBuy={(item) => setSinglePurchaseModal({
              item: item as { id?: string; title: string; description?: string; price?: number; currency?: string; images?: string },
              seller: { user_id: profile!.user_id, business_name: bizName, display_name: profile!.display_name },
            })}
          />
        );
      })()}

      {/* Purchase modal */}
      {singlePurchaseModal && (
        <PurchaseModal
          item={singlePurchaseModal.item}
          seller={singlePurchaseModal.seller}
          buyer={currentUser ? { id: currentUser.id as string } : undefined}
          businessId={business?.id ?? null}
          onClose={() => setSinglePurchaseModal(null)}
        />
      )}
    </div>
  );

}
