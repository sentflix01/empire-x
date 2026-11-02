'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { entities } from '@/api/entities';
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
  testimonials?: Array<{ quote?: string; author?: string; role?: string }>;
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
}

export function BusinessFeedCard({ biz, ownerName, ownerAvatarUrl, ownerIsVerified, viewer, onMessage, ownerTickerText, ownerTickerType }: BusinessFeedCardProps) {
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
                className="w-14 h-14 rounded-xl border-4 border-white bg-white flex items-center justify-center hover:border-amber-400/60 transition-all shadow-sm overflow-hidden"
                aria-label={`Show QR code for ${bizName}`}
                title="Scan to open this business profile"
              >
                <QRCodeSVG
                  value={qrUrl}
                  size={46}
                  level="L"
                  includeMargin={false}
                  style={{ display: 'block' }}
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
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
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
                        <h3 className="font-bold text-sm text-center text-slate-800 leading-tight px-2">{bizName}</h3>
                        {biz.business_address && (
                          <p className="text-xs text-slate-400 text-center mt-0.5">{biz.business_address as string}</p>
                        )}
                      </div>
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
                style={{ backgroundColor: color }}>
                Visit <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
        {/* Fixed rows (name, owner, tagline, address) so every card is the same height. */}
        <h3 className="mt-2 h-6 truncate font-display text-base font-bold leading-6" style={{ color }} title={bizName}>{bizName}</h3>
        {/* Owner identity */}
        <div className="h-5">
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
                style={{ backgroundColor: color }}>
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
        </div>
        <p className="h-4 truncate text-xs leading-4 text-muted-foreground">
          {heroSection?.subtitle || (biz.business_description as string | undefined) || ''}
        </p>
        <p className="mt-1 flex h-4 items-center gap-1 text-xs leading-4 text-muted-foreground">
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

  // ── Purchase modal state for single-profile mode ───────────────────
  const [singlePurchaseModal, setSinglePurchaseModal] = useState<{
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
      const showroomItems = publishedShowrooms.map((showroom) => showroomToFeedBusiness(showroom) as Business);
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
      // Batch-fetch owner display names so each card shows who runs the business
      const combined = [...showroomItems, ...businessItems];
      const uniqueOwnerIds = [...new Set(combined.map(b => b.owner_id as string).filter(Boolean))];
      if (uniqueOwnerIds.length > 0) {
        const profileResults = await Promise.allSettled(
          uniqueOwnerIds.map(id =>
            entities.UserProfile.filter({ user_id: id }, 'created_at', 1)
              .then((rows: unknown[]) => ({ id, p: (rows[0] as Profile | undefined) ?? null }))
              .catch(() => ({ id, p: null }))
          )
        );
        const map: Record<string, { display_name?: string; avatar_url?: string; is_verified?: boolean; is_seed?: boolean; ticker_text?: string; ticker_type?: string }> = {};
        for (const result of profileResults) {
          if (result.status === 'fulfilled' && result.value.p) {
            const p = result.value.p;
            map[result.value.id] = {
              display_name: p.display_name,
              avatar_url: Array.isArray(p.avatar_url) ? (p.avatar_url[0] ?? '') : p.avatar_url,
              is_verified: p.is_verified,
              is_seed: (p as any).is_seed === true,
              ticker_text: (p as any).ticker_text || undefined,
              ticker_type: (p as any).ticker_type || undefined,
            };
          }
        }
        setOwnerProfiles(map);
      }
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
          const ownerId = biz.owner_id as string || '';
          const op = ownerProfiles[ownerId];
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
            />
          );
        })}
      </div>
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
              onClick={() => handleMessage({ businessId: business?.id ?? null, userId: profile!.user_id })} disabled={chat.busy}>
              <MessageSquare className="w-3 h-3 mr-1" />
              {chat.busy ? '...' : 'Message'}
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
