import React, { useState, useEffect } from 'react';
import { entities } from '@/api/entities';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, ShoppingBag, MapPin, MessageSquare, ArrowRight, Clock,
  UtensilsCrossed, Briefcase, HeartPulse, Palette, CalendarDays,
  Home as HomeIcon, GraduationCap, LucideProps,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findOrCreateConversation } from '@/lib/messaging';
import { getCategoryByValue } from '@/lib/businessTemplates';
import VerifiedBadge, { VerificationType } from '@/components/ui/VerifiedBadge';

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
function ServicesList({ title, items, themeColor }: { title?: string; items?: SectionItem[]; themeColor: string }) {
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
              <span className="text-xs font-bold shrink-0" style={{ color: themeColor }}>{item.price}</span>
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

function ProductsGrid({ products, themeColor, profileUserId }: { products: Product[]; themeColor: string; profileUserId: string }) {
  if (!products.length) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Products</p>
        <Link to={`/profile/${profileUserId}?view=business`} className="text-xs font-medium" style={{ color: themeColor }}>
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {products.slice(0, 4).map(p => {
          const imgs = parseImages(p.images);
          return (
            <Link to={`/products/${p.id}`} key={p.id}
              className="rounded-lg border border-border/40 overflow-hidden hover:shadow-sm transition-all">
              <div className="aspect-square bg-secondary/20">
                {imgs[0]
                  ? <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover" />
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
            <Link to={`/products/${p.id}`} key={p.id}
              className="rounded-lg border border-border/40 overflow-hidden hover:shadow-sm transition-all">
              <div className="aspect-video bg-secondary/20">
                {imgs[0]
                  ? <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover" />
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
}

function CategoryContent({ biz, sections, products, themeColor, profileUserId }: CategoryContentProps) {
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
            <ServicesList title={servicesSection!.title ?? 'Menu Highlights'} items={servicesSection!.items} themeColor={themeColor} />
          )}
          <HoursPreview hours={hours} />
        </div>
      );
    case 'shop':
      return (
        <div className="space-y-2.5">
          {products.length > 0
            ? <ProductsGrid products={products} themeColor={themeColor} profileUserId={profileUserId} />
            : <FeatureChips items={featuresSection?.items} themeColor={themeColor} />}
        </div>
      );
    case 'service':
      return (
        <div className="space-y-2.5">
          {(servicesSection?.items?.length ?? 0) > 0
            ? <ServicesList title={servicesSection!.title ?? 'Services'} items={servicesSection!.items} themeColor={themeColor} />
            : <FeatureChips items={featuresSection?.items} themeColor={themeColor} />}
        </div>
      );
    case 'health':
      return (
        <div className="space-y-2.5">
          {(servicesSection?.items?.length ?? 0) > 0 && (
            <ServicesList title={servicesSection!.title ?? 'Services'} items={servicesSection!.items} themeColor={themeColor} />
          )}
          <HoursPreview hours={hours} />
        </div>
      );
    case 'course': {
      const coursesSec = get('courses') ?? servicesSection;
      return (
        <div className="space-y-2.5">
          {(coursesSec?.items?.length ?? 0) > 0
            ? <ServicesList title="Programs" items={coursesSec!.items} themeColor={themeColor} />
            : <FeatureChips items={featuresSection?.items} themeColor={themeColor} />}
        </div>
      );
    }
    case 'event':
      return (
        <div className="space-y-2.5">
          {(servicesSection?.items?.length ?? 0) > 0 && (
            <ServicesList title={servicesSection!.title ?? 'Packages'} items={servicesSection!.items} themeColor={themeColor} />
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
            ? <ServicesList title={servicesSection!.title} items={servicesSection!.items} themeColor={themeColor} />
            : <SectionChips sections={sections} themeColor={themeColor} />}
        </div>
      );
    default:
      return <SectionChips sections={sections} themeColor={themeColor} />;
  }
}

/* ── Main export ─────────────────────────────────────────────────── */
interface BusinessShowroomFeedProps {
  profile: Profile;
  currentUser?: User | null;
  businesses?: Business[];
}

export default function BusinessShowroomFeed({ profile, currentUser, businesses: propBusinesses }: BusinessShowroomFeedProps) {
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.user_id) return;
    if (propBusinesses !== undefined) {
      setAllBusinesses(propBusinesses ?? []);
      if ((propBusinesses?.length ?? 0) > 0) setSelectedBizId(propBusinesses![0].id);
      setLoading(false);
    } else {
      loadData();
    }
  }, [profile?.user_id, propBusinesses]);

  const loadData = async () => {
    setLoading(true);
    try {
      const businesses: Business[] = (await entities.Business.filter({ owner_id: profile.user_id })) as Business[];
      setAllBusinesses(businesses ?? []);
      if (businesses.length > 0) setSelectedBizId(businesses[0].id);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedBizId) return;
    const biz = allBusinesses.find(b => b.id === selectedBizId);
    const filter = biz
      ? { business_id: biz.id, status: 'active' }
      : { seller_id: profile.user_id, status: 'active' };
    entities.Product.filter(filter, '-created_at', 4)
      .then((p) => setProducts(p as unknown as Product[]))
      .catch(() => setProducts([]));
  }, [selectedBizId]);

  const handleMessage = async () => {
    if (!currentUser || messaging) return;
    setMessaging(true);
    try {
      const biz = allBusinesses.find(b => b.id === selectedBizId);
      const conv = await findOrCreateConversation(
        currentUser,
        profile.user_id,
        biz?.business_name ?? profile.display_name
      );
      if (conv) navigate(`/messages/${conv.id}`);
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

  const business = allBusinesses.find(b => b.id === selectedBizId) ?? null;
  const biz: Business | Profile = business ?? profile;
  const bizName = (biz.business_name as string | undefined) ?? profile.display_name ?? 'Business';
  const themeColor = (biz.business_theme_color as string | undefined) ?? '#D4AF37';
  const sections = parseSections(biz.business_sections as string | undefined);
  const hasBusiness = allBusinesses.length > 0 || profile.has_business_profile || biz.business_description;
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
          ? <img src={coverUrl} alt="" className="w-full h-full object-cover" />
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
          <div className="w-16 h-16 rounded-2xl border-4 border-white overflow-hidden shrink-0 shadow-sm"
            style={{ backgroundColor: themeColor }}>
            {logoUrl
              ? <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                  {bizName.charAt(0)}
                </div>}
          </div>
          <div className="flex gap-2 mb-1">
            <Button size="sm" variant="outline" className="rounded-full h-8 text-xs"
              onClick={handleMessage} disabled={messaging}>
              <MessageSquare className="w-3 h-3 mr-1" />
              {messaging ? '...' : 'Message'}
            </Button>
            <Link to={`/profile/${profile.user_id}?view=business`}>
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
            {profile.is_verified && (
              <VerifiedBadge type={profile.verification_type} size="sm" />
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
                  style={b.id === selectedBizId ? { backgroundColor: (b.business_theme_color as string | undefined) ?? '#D4AF37' } : {}}>
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
          profileUserId={profile.user_id}
        />
      </div>
    </div>
  );
}
