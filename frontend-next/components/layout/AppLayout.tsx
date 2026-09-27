'use client';
import React, { useState, useEffect, useCallback } from "react";
import { entities } from "@/api/entities";
import client from "@/api/client";
import { auth } from "@/api/auth";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Home, Search, MessageCircle, ShoppingBag, ClipboardList, Bell, User, UserRound,
  Plus, Crown, TrendingUp, Briefcase, GraduationCap, CalendarDays,
  Bookmark, Wallet, Moon, Sun, Languages, ShoppingCart, MapPin, Tag,
  Package, ShieldAlert, BarChart3, Store, Flame, Users, Zap, ChevronDown,
  PanelLeftClose, PanelLeftOpen, Menu, X, Gift, LogOut, Lock, Shield,
  ArrowLeft, Coins, Settings, FlaskConical, Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { toggleLanguage, getCurrentLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { connectSocket, disconnectSocket, resetSocket, getSocket } from "@/lib/socket";
import { toast } from "sonner";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import DemoEnvironmentBanner from "@/components/layout/DemoEnvironmentBanner";
import { useRealMode } from "@/lib/RealModeContext";
import { useProfileView } from "@/lib/ProfileViewContext";
import { useAppStore } from "@/store";
import { isGuestBrowsablePath } from "@/lib/publicPaths";
// AccountSettings popup replaced by /settings navigation

/* ── Right Panel — shortcuts, trending, suggestions ── */
function RightPanel({ user }: { user: { full_name?: string; email?: string; role?: string } | null }) {
  const quickLinks = [
    { path: "/showrooms",  icon: Store,        label: "Showrooms",   color: "#2563EB" },
    { path: "/events",     icon: CalendarDays, label: "Events",      color: "#2563EB" },
    { path: "/jobs",       icon: Briefcase,    label: "Jobs",        color: "#2563EB" },
    { path: "/courses",    icon: GraduationCap,label: "Courses",     color: "#7c3aed" },
    { path: "/marketplace",icon: ShoppingBag,  label: "Marketplace", color: "#7c3aed" },
    { path: "/tasks",      icon: Zap,          label: "Tasks",       color: "#2563EB" },
    { path: "/bookmarks",  icon: Bookmark,     label: "Bookmarks",   color: "#6B7280" },
    { path: "/wallet",     icon: Wallet,       label: "Wallet",      color: "#f59e0b" },
  ];
  const visibleQuickLinks = user
    ? quickLinks
    : quickLinks.filter(item => item.path !== '/bookmarks' && item.path !== '/wallet');

  return (
    <>
      {/* Quick links */}
      <div className="bg-card dark:bg-card rounded-2xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold">Quick Links</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {visibleQuickLinks.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-secondary transition-all text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + "18" }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sponsored / Promo */}
      <div className="rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-primary uppercase tracking-wide">Sponsored</span>
          <span className="text-[10px] text-muted-foreground">Ad</span>
        </div>
        <div className="rounded-xl bg-empire-gradient p-3 mb-3 shadow-md shadow-primary/20">
          <p className="text-white font-bold text-sm">Nodbusiness Pro</p>
          <p className="text-white/85 text-xs mt-1 leading-relaxed">Boost your business visibility to 10,000+ users.</p>
        </div>
        <Link href={user ? "/analytics" : "/register"} className="block text-center py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm shadow-primary/20 transition-colors">
          {user ? 'Promote Now' : 'Join Free'}
        </Link>
      </div>

      {/* Showroom Studio */}
      <div className="bg-card dark:bg-card rounded-2xl border border-border/50 overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Showroom Studio</p>
              <p className="text-white/75 text-[10px]">27 templates · 9 categories</p>
            </div>
          </div>
        </div>
        {/* Template previews — 3 mini skeleton cards */}
        <div className="grid grid-cols-3 gap-1.5 p-3">
          {[
            { label: "Shop",    color: "from-orange-100 to-amber-100" },
            { label: "Blog",    color: "from-blue-100 to-cyan-100" },
            { label: "Agency",  color: "from-purple-100 to-violet-100" },
          ].map(t => (
            <div key={t.label} className={`rounded-lg overflow-hidden bg-gradient-to-br ${t.color} aspect-[3/2] flex flex-col gap-0.5 p-1.5`}>
              <div className="h-2 bg-white/60 rounded-sm w-full" />
              <div className="h-1 bg-white/40 rounded-sm w-3/4" />
              <div className="grid grid-cols-2 gap-0.5 flex-1 mt-0.5">
                <div className="bg-white/50 rounded-sm" />
                <div className="bg-white/50 rounded-sm" />
              </div>
              <p className="text-[8px] font-semibold text-center text-gray-500 mt-0.5">{t.label}</p>
            </div>
          ))}
        </div>
        <div className="px-3 pb-3">
          <Link
            href={user ? "/showroom/templates" : "/register"}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold transition-all"
          >
            <Crown className="w-3.5 h-3.5" />
            {user ? 'Browse Templates' : 'Create an account to build'}
          </Link>
        </div>
      </div>

      {/* Trending topics */}
      <div className="bg-card dark:bg-card rounded-2xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold">Trending</span>
        </div>
        <div className="space-y-2">
          {["#AddisAbaba","#EthiopianBusiness","#Nodbusiness","#HabeshaLife","#EthioTech"].map((tag, i) => (
            <Link key={tag} href={`/hashtag/${tag.slice(1)}`} className="flex items-center justify-between hover:bg-secondary px-2 py-1.5 rounded-lg transition-all group">
              <div>
                <p className="text-xs font-semibold group-hover:text-amber-600 transition-colors">{tag}</p>
                <p className="text-[10px] text-muted-foreground">{[234, 189, 156, 132, 98][i]} posts</p>
              </div>
              <Flame className="w-3.5 h-3.5 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
        <Link href="/explore" className="block text-center mt-2 text-xs text-amber-600 hover:underline font-medium">
          See all trending →
        </Link>
      </div>

      {/* Footer links */}
      <div className="px-2">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Nodbusiness · Privacy · Terms · About · Advertising
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2026 Nodbusiness. All rights reserved.</p>
      </div>
    </>
  );
}

/* ── ViewTogglePill — Personal | Business sub-row pill ── */
function ViewTogglePill({
  value,
  onChange,
}: {
  value: 'personal' | 'business';
  onChange: (v: 'personal' | 'business') => void;
}) {
  return (
    <div className="mx-2 mt-0.5 mb-1 flex items-center bg-secondary/60 rounded-full p-0.5 ring-1 ring-border/40">
      <button
        onClick={() => onChange('personal')}
        aria-pressed={value === 'personal'}
        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all"
        style={value === 'personal'
          ? { background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: 'white', boxShadow: '0 1px 8px rgba(59,130,246,0.35)' }
          : {}}
      >
        <User className="w-2.5 h-2.5 shrink-0" />
        <span className={value === 'personal' ? 'text-white' : 'text-muted-foreground'}>Personal</span>
      </button>
      <button
        onClick={() => onChange('business')}
        aria-pressed={value === 'business'}
        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all"
        style={value === 'business'
          ? { background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: 'white', boxShadow: '0 1px 8px rgba(245,158,11,0.35)' }
          : {}}
      >
        <Store className="w-2.5 h-2.5 shrink-0" />
        <span className={value === 'business' ? 'text-white' : 'text-muted-foreground'}>Business</span>
      </button>
    </div>
  );
}

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === 'am' ? 'አማ' : 'EN';
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, authChecked, isLoadingAuth, logout } = useAuth();
  const hasSignedInUser = authChecked && isAuthenticated && Boolean(user);
  const { realMode, toggleRealMode } = useRealMode();
  const { homeFeedMode, setHomeFeedMode, profileViewMode, setProfileViewMode } = useProfileView();

  const tr = (key: string) => String(t(key));
  const displayName = typeof user?.full_name === 'string' ? user.full_name : (hasSignedInUser ? 'Account' : 'Guest');
  const userEmail = typeof user?.email === 'string' ? user.email : '';
  const userInitial = typeof user?.full_name === 'string' ? (user.full_name.charAt(0) || 'U') : 'G';
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerSettingsOpen, setDrawerSettingsOpen] = useState(false);
  const [homeTabsOpen, setHomeTabsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userProfile, setUserProfile] = useState<{ avatar_url?: string; cover_url?: string } | null>(null);
  const [switchingEnvironment, setSwitchingEnvironment] = useState(false);
  const { cart } = useCart();
  const isShowroomBuilder = pathname === "/showroom/create";
  const isImmersiveRoute = isShowroomBuilder || pathname.startsWith("/messages/");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-collapse sidebar when viewport < 1024px (lg breakpoint)
  useEffect(() => {
    const check = () => setSidebarCollapsed(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close drawer and home tabs on route change
  useEffect(() => {
    setDrawerOpen(false);
    setDrawerSettingsOpen(false);
    setHomeTabsOpen(false);
  }, [pathname]);

  // Redirect to /login when auth has resolved and user is not authenticated.
  // Guest-browsable paths (feed, marketplace, showrooms, etc.) are exempt —
  // guests see content read-only with sign-up prompts on write actions.
  // /choose-mode is also exempt — that page handles its own auth check.
  useEffect(() => {
    if (
      authChecked &&
      !isAuthenticated &&
      !isGuestBrowsablePath(pathname) &&
      !pathname.startsWith('/choose-mode')
    ) {
      const returnUrl = pathname !== '/login' ? pathname : '/feed';
      router.push(`/login?return=${encodeURIComponent(returnUrl)}`);
    }
  }, [authChecked, isAuthenticated, router, pathname]);

  // Once user is available: check profile, set up socket, load unread count, hydrate bookmarks
  const hydrateBookmarks = useAppStore(s => s.hydrate);
  useEffect(() => {
    if (!user) return;
    // Hydrate bookmark state so bookmark buttons show correct saved state immediately
    hydrateBookmarks();
    entities.UserProfile.filter({ user_id: user.id }).then(profiles => {
      if (profiles.length === 0 && pathname !== "/onboarding") {
        router.push("/onboarding");
        return;
      }
      loadUnreadCount(user);
      connectSocket();
      const s = getSocket();
      s.on("new_notification", (notif) => {
        setUnreadCount(c => c + 1);
        toast(notif.title, {
          description: notif.body || undefined,
          duration: 5000,
          action: notif.link
            ? { label: "View", onClick: () => { window.location.href = notif.link; } }
            : undefined,
        });
      });
    });

    // Warm backend cache in background — don't await, don't block
    client.get('/api/trending/warm').catch(() => {});
    client.get('/api/trending').catch(() => {});
    client.get('/api/posts?limit=10').catch(() => {});
    // Load user profile for avatar/cover in drawer
    client.get(`/api/profiles?user_id=${user.id}&limit=1`).then(r => {
      const profiles = Array.isArray(r.data) ? r.data : [];
      if (profiles[0]) {
        const p = profiles[0];
        const av = Array.isArray(p.avatar_url) ? p.avatar_url[0] : p.avatar_url;
        const cv = Array.isArray(p.cover_url) ? p.cover_url[0] : p.cover_url;
        setUserProfile({ avatar_url: av || '', cover_url: cv || '' });
      }
    }).catch(() => {});

    return () => {
      disconnectSocket();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Keep a fallback poll every 5 minutes in case socket drops
    const interval = setInterval(() => loadUnreadCount(user), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const loadUnreadCount = async (_u?: any) => {
    try {
      // Use direct client call — backend uses req.user.id from JWT, not a query param
      const { data } = await client.get('/api/notifications?limit=60');
      const notifications = Array.isArray(data) ? data : [];
      setUnreadCount(notifications.filter((notif: any) => !notif.is_read).length);
    } catch {}
  };

  const enterDemoEnvironment = async () => {
    if (switchingEnvironment) return;
    setSwitchingEnvironment(true);
    try {
      await auth.setOnboardingMode('demo');
      await auth.loginDemo();
      window.location.assign('/feed');
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(e.response?.data?.error || e.message || 'Demo sandbox is temporarily unavailable.');
      setSwitchingEnvironment(false);
    }
  };

  const mainNavItems = [
    { path: "/feed", icon: Home, label: tr('nav.home') },
    { path: "/explore", icon: TrendingUp, label: tr('nav.explore') },
    { path: "/friends", icon: Users, label: tr('nav.friends') },
    { path: "/businesses", icon: Store, label: tr('nav.businesses') },
    { path: "/marketplace", icon: ShoppingBag, label: tr('nav.marketplace') },
    { path: "/tasks", icon: ClipboardList, label: tr('nav.tasks') },
    { path: "/mewacho", icon: Coins, label: 'Mewacho' },
    { path: "/messages", icon: MessageCircle, label: tr('nav.messages') },
    { path: "/profile", icon: User, label: tr('nav.profile') },
  ];
  const visibleMainNavItems = hasSignedInUser
    ? mainNavItems
    : mainNavItems.filter(item => isGuestBrowsablePath(item.path));

  const extraNavItems = [
    { path: "/showrooms", icon: Crown, label: tr('nav.showrooms') },
    { path: "/events", icon: CalendarDays, label: tr('nav.events') },
    { path: "/jobs", icon: Briefcase, label: tr('nav.jobs') },
    { path: "/courses", icon: GraduationCap, label: tr('nav.courses') },
  ];

  const accountItems = [
    { path: "/orders",   icon: Package,     label: tr('nav.orders') },
    { path: "/cart",     icon: ShoppingCart, label: "Cart", badge: cart.count > 0 ? cart.count : null },
    { path: "/wallet",   icon: Wallet,       label: tr('nav.wallet') },
    { path: "/referral", icon: Gift,         label: "Referral" },
    { path: "/coupons",  icon: Tag,          label: "My Coupons" },
    { path: "/privacy",  icon: Shield,       label: "Privacy" },
  ];

  const isActive = (path: string) => {
    if (path === "/feed") return pathname === "/feed" || pathname === "/";
    return pathname.startsWith(path);
  };

  const NavLink = ({ path, icon: Icon, label, badge }: { path: string; icon: any; label: string; badge?: number | null }) => (
    <Link
      href={path}
      title={sidebarCollapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-xl transition-all text-sm font-medium group relative
        ${sidebarCollapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2"}
        ${isActive(path)
          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!sidebarCollapsed && <span className="truncate">{label}</span>}
      {!sidebarCollapsed && badge ? (
        <span className="ml-auto w-5 h-5 bg-[#f59e0b] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      {sidebarCollapsed && badge ? (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#f59e0b] rounded-full" />
      ) : null}
      {sidebarCollapsed && (
        <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
          {label}
        </span>
      )}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="w-full px-4 h-14 flex items-center gap-3">
          {/* Sidebar toggle button — desktop only */}
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="hidden md:flex p-2 rounded-xl hover:bg-secondary transition-colors shrink-0"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed
              ? <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
              : <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {/* Logo */}
          <Link href={hasSignedInUser ? "/" : "/landing"} aria-label={hasSignedInUser ? "Go to home" : "Back to Nodbusiness landing page"} className={`flex items-center gap-2 shrink-0 transition-all w-8 ${sidebarCollapsed ? "md:w-8" : "md:w-44"}`}>
            <Image
              src="/brand/nodbusiness-icon.svg"
              alt="Nodbusiness"
              width={32}
              height={32}
              className="w-8 h-8 rounded-xl object-cover shadow-sm"
            />
            {!sidebarCollapsed && (
              <span className="hidden md:inline font-display text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                Nodbusiness
              </span>
            )}
          </Link>

          {/* Desktop Search — expands overlay on focus */}
          <div className="hidden md:flex flex-1 max-w-sm relative">
            {searchOpen ? (
              /* Expanded overlay mode — covers right icons */
              <div className="absolute right-0 top-1/2 -translate-y-1/2 z-50" style={{ width: 'calc(100% + 280px)' }}>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement)?.value?.trim();
                    if (q) { setSearchOpen(false); router.push(`/search?q=${encodeURIComponent(q)}`); }
                  }}
                  className="relative"
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                  <input
                    name="q"
                    type="search"
                    autoFocus
                    enterKeyHint="search"
                    placeholder={tr('common.searchPlaceholder')}
                    className="w-full pl-9 pr-10 bg-background border border-border rounded-full h-9 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 shadow-md transition-all"
                    onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); }}
                  />
                  <button type="button" onClick={() => setSearchOpen(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 w-full pl-9 pr-4 bg-secondary border border-border rounded-full h-9 text-sm text-muted-foreground hover:bg-secondary/80 hover:border-border/80 transition-all relative"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                {tr('common.searchPlaceholder')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Mobile search — full-width overlay when open */}
            {searchOpen && (
              <div className="fixed inset-x-0 top-0 z-[200] h-14 bg-background border-b border-border flex items-center px-3 gap-2 shadow-lg">
                <form className="flex-1"
                  onSubmit={e => {
                    e.preventDefault();
                    const q = (e.currentTarget.elements.namedItem('mq') as HTMLInputElement)?.value?.trim();
                    if (q) { setSearchOpen(false); router.push(`/search?q=${encodeURIComponent(q)}`); }
                  }}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                    <input name="mq" type="search" autoFocus enterKeyHint="search"
                      placeholder="Search people, products, tasks..."
                      onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); }}
                      className="w-full pl-9 pr-4 h-10 bg-secondary border border-border rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all" />
                  </div>
                </form>
                <button onClick={() => setSearchOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors shrink-0 text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            {/* Mobile search icon (hidden when overlay is open) */}
            {!searchOpen && (
              <button onClick={() => setSearchOpen(true)} className="md:hidden p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Search">
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {hasSignedInUser ? (
              <>
                <Link href="/cart" className="relative p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Cart">
                  <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                  {cart.count > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cart.count > 9 ? "9+" : cart.count}</span>}
                </Link>
                <Link href="/notifications" className="relative p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Notifications">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </Link>
                <Link href="/bookmarks" className="p-2 rounded-full hover:bg-secondary transition-colors flex items-center justify-center" aria-label="Bookmarks">
                  <Bookmark className="w-5 h-5 text-muted-foreground" />
                </Link>
                <Link href="/profile" aria-label={`Profile: ${displayName}`} className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm font-semibold shrink-0 overflow-hidden ml-1">
                  {userProfile?.avatar_url
                    ? <Image src={userProfile.avatar_url} alt={displayName} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                    : userInitial}
                </Link>
              </>
            ) : (
              <>
                <Link href={`/login?return=${encodeURIComponent(pathname)}`} className="inline-flex h-9 items-center justify-center rounded-xl px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3 sm:text-sm">Sign in</Link>
                <Link href="/register" className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:px-3 sm:text-sm">Join</Link>
                {authChecked && <span title="Browsing as guest" aria-label="Guest session" className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                </span>}
              </>
            )}
          </div>
        </div>

      </header>

      {/* Demo banner — Track 1: shared test account or user who chose demo mode.
          Track 2 (future): full sandbox session detected via demo_session cookie.
          is_demo=true  → always Track 1 (built-in demo/seed account).
          onboarding_mode='demo' + !is_demo → real user who chose demo mode in /choose-mode. */}
      {(user?.is_demo === true || user?.onboarding_mode === 'demo') && (
        <DemoEnvironmentBanner track={1} />
      )}

      {/* ── Body: sidebar + main + right panel ── */}
      <div className="flex flex-1 w-full">

        {/* ── Left Sidebar (desktop only) ── */}
        <nav className={`hidden md:flex fixed left-0 top-14 bottom-0 bg-card border-r border-border flex-col z-40 transition-all duration-200
          ${sidebarCollapsed ? "w-14" : "w-56"}`}>

          {/* ── Profile header — matches mobile drawer ── */}
          {!sidebarCollapsed && (
            <div className="shrink-0">
              {/* Cover + avatar */}
              <div className="relative h-20 bg-empire-gradient">
                {userProfile?.cover_url && (
                  <Image src={userProfile.cover_url} alt="" fill className="object-cover" unoptimized />
                )}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent" />
                {/* Avatar overlapping cover */}
                {hasSignedInUser ? (
                  <Link href="/profile" aria-label={`Profile: ${displayName}`} className="absolute -bottom-5 left-4 w-10 h-10 rounded-xl ring-2 ring-card overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0">
                    {userProfile?.avatar_url
                      ? <Image src={userProfile.avatar_url} alt={displayName} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      : userInitial}
                  </Link>
                ) : (
                  <div aria-label="Guest session" title="Browsing as guest" className="absolute -bottom-5 left-4 w-10 h-10 rounded-xl ring-2 ring-card overflow-hidden bg-slate-500 flex items-center justify-center text-white shadow-lg shrink-0">
                    <UserRound className="h-5 w-5" />
                  </div>
                )}
              </div>
              {/* Name + email row */}
              <div className="pt-7 pb-2 px-4 border-b border-border/40">
                <p className="text-xs font-bold truncate text-foreground leading-tight">{displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{hasSignedInUser ? userEmail : 'Read-only guest access'}</p>
              </div>
            </div>
          )}

          {/* ── Collapsed avatar ── */}
          {sidebarCollapsed && (
            <div className="shrink-0 flex justify-center pt-3 pb-2 border-b border-border/40">
              {hasSignedInUser ? <Link href="/profile" aria-label={`Profile: ${displayName}`} className="relative group">
                <div className="w-9 h-9 rounded-xl ring-2 ring-border overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                  {userProfile?.avatar_url
                    ? <Image src={userProfile.avatar_url} alt={displayName} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                    : userInitial}
                </div>
                <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  {displayName}
                </span>
              </Link> : (
                <div title="Browsing as guest" aria-label="Guest session" className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-border bg-secondary text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                </div>
              )}
            </div>
          )}

          {/* ── Nav links ── */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-0.5 scrollbar-thin">
            {visibleMainNavItems.map(item => (
              <React.Fragment key={item.path}>
                <NavLink {...item} />
                {/* Personal | Business pill — under Home, only when Home is active */}
                {item.path === '/feed' && !sidebarCollapsed && isActive('/feed') && (
                  <ViewTogglePill
                    value={homeFeedMode}
                    onChange={(v) => { if (v !== homeFeedMode) setHomeFeedMode(v); }}
                  />
                )}
                {/* Personal | Business pill — under Profile, only when Profile is active */}
                {item.path === '/profile' && !sidebarCollapsed && isActive('/profile') && (
                  <ViewTogglePill
                    value={profileViewMode}
                    onChange={(v) => {
                      if (v === profileViewMode) return;
                      setProfileViewMode(v);
                      // Only push if not already on profile — avoids re-triggering useSearchParams
                      if (!pathname.startsWith('/profile')) {
                        router.push(`/profile?view=${v}`);
                      }
                    }}
                  />
                )}
              </React.Fragment>
            ))}

            <div className="my-2 border-t border-border/40" />

            {hasSignedInUser && <>
            {/* Create Showroom */}
            <Link
              href="/showroom/create"
              title={sidebarCollapsed ? t('common.createShowroom') : undefined}
              className={`relative flex items-center gap-3 rounded-xl bg-empire-gradient text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm group
                ${sidebarCollapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2"}`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>{t('common.createShowroom')}</span>}
              {sidebarCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  {t('common.createShowroom')}
                </span>
              )}
            </Link>

            {/* Showroom Studio */}
            <Link
              href="/showroom/templates"
              title={sidebarCollapsed ? t('common.showroomStudio') : undefined}
              className={`relative flex items-center gap-3 rounded-xl transition-all text-sm font-medium group
                ${sidebarCollapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2"}
                ${isActive('/showroom/templates') ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
            >
              <Crown className="w-4 h-4 shrink-0 text-amber-500" />
              {!sidebarCollapsed && <span>{t('common.showroomStudio')}</span>}
              {sidebarCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  {t('common.showroomStudio')}
                </span>
              )}
            </Link>
            </>}

            <div className="my-2 border-t border-border/40" />

            {/* Discover */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setDiscoverOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-1 group"
                aria-expanded={discoverOpen}
              >
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{tr('common.discover')}</p>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${discoverOpen ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            )}
            {(sidebarCollapsed || discoverOpen) && extraNavItems.map(item => <NavLink key={item.path} {...item} />)}

            <div className="my-2 border-t border-border/40" />

            {!hasSignedInUser && !sidebarCollapsed && (
              <div className="mx-1 my-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-950/20">
                <p className="text-xs font-bold text-foreground">Browsing as a guest</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Sign in or join to save your activity.</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/login?return=${encodeURIComponent(pathname)}`} className="flex-1 rounded-lg border border-border bg-background px-2 py-2 text-center text-xs font-semibold text-foreground hover:bg-secondary">Sign in</Link>
                  <Link href="/register" className="flex-1 rounded-lg bg-primary px-2 py-2 text-center text-xs font-semibold text-primary-foreground hover:bg-primary/90">Join free</Link>
                </div>
                <Link href="/landing" className="mt-2 block rounded-lg px-2 py-1.5 text-center text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground">Back to landing page</Link>
              </div>
            )}

            {/* My Account */}
            {hasSignedInUser && !sidebarCollapsed && (
              <button
                onClick={() => setAccountOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-1 group"
                aria-expanded={accountOpen}
              >
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{tr('common.myAccount')}</p>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${accountOpen ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            )}
            {hasSignedInUser && (sidebarCollapsed || accountOpen) && accountItems.map(item => <NavLink key={item.path} {...item} />)}

            <div className="h-4" />
          </div>

          {/* ── Sidebar footer — settings + logout ── */}
          <div className="border-t border-border px-2 py-2 shrink-0 relative">
            {/* Settings popup panel — appears above footer (or to the right when collapsed) */}
            {settingsOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                <div
                  className="absolute z-50 border border-border rounded-2xl shadow-2xl overflow-hidden"
                  style={{
                    backgroundColor: 'hsl(var(--card))',
                    ...(sidebarCollapsed
                      ? { bottom: 0, left: '100%', marginLeft: '8px', width: '220px' }
                      : { bottom: '100%', left: '8px', right: '8px', marginBottom: '8px' }),
                  }}
                >
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Settings</p>
                  </div>

                  {/* Language */}
                  <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Languages className="w-4 h-4 shrink-0" />
                      <span>Language</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground bg-secondary border border-border rounded-full px-2 py-0.5">
                      {i18n.language === 'am' ? 'አማ' : 'EN'}
                    </span>
                  </button>

                  {/* Theme */}
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      {mounted && theme === 'dark'
                        ? <Sun className="w-4 h-4 shrink-0 text-amber-400" />
                        : <Moon className="w-4 h-4 shrink-0" />}
                      <span>Theme</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground bg-secondary border border-border rounded-full px-2 py-0.5">
                      {mounted ? (theme === 'dark' ? 'Dark' : 'Light') : '…'}
                    </span>
                  </button>

                  {hasSignedInUser && <>
                  {/* Content filter; the verified cookie controls the environment. */}
                  {user?.is_demo !== true && <button
                    onClick={toggleRealMode}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${realMode ? 'border-green-500 bg-green-500' : 'border-amber-500 bg-amber-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </span>
                      <span>Content filter</span>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${realMode ? 'bg-green-500/10 text-green-600 border border-green-500/30' : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'}`}>
                      {realMode ? 'Real accounts only' : 'All accounts'}
                    </span>
                  </button>}

                  {user?.is_demo !== true && <button onClick={() => void enterDemoEnvironment()} disabled={switchingEnvironment}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-950/40">
                    {switchingEnvironment ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                    <span>{switchingEnvironment ? 'Opening demo…' : 'Explore demo sandbox'}</span>
                  </button>}

                  <div className="mx-3 my-1 border-t border-border/40" />

                  {/* Account Settings */}
                  <Link
                    href="/account"
                    onClick={() => setSettingsOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary transition-colors text-sm text-muted-foreground"
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Account Settings</span>
                  </Link>

                  {/* Analytics */}
                  <Link
                    href="/analytics"
                    onClick={() => setSettingsOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary transition-colors text-sm text-muted-foreground"
                  >
                    <BarChart3 className="w-4 h-4 shrink-0" />
                    <span>Analytics</span>
                  </Link>

                  {/* Admin Panel — admin only */}
                  {user?.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setSettingsOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary transition-colors text-sm text-muted-foreground"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                  </>}

                  <div className="h-1" />
                </div>
              </>
            )}

            <div className={`flex items-center ${sidebarCollapsed ? 'flex-col gap-1' : 'gap-1'}`}>
              {/* Settings button */}
              <button
                onClick={() => setSettingsOpen(v => !v)}
                title={sidebarCollapsed ? "Settings" : undefined}
                aria-label="Settings"
                className={`relative flex items-center gap-2.5 rounded-xl transition-colors text-sm font-medium group
                  ${settingsOpen ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}
                  ${sidebarCollapsed ? 'justify-center px-0 py-2.5 flex-1 w-full' : 'px-3 py-2 flex-1'}`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>Settings</span>}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                    Settings
                  </span>
                )}
              </button>

              {hasSignedInUser ? (
                <button
                  onClick={() => { resetSocket(); logout(); }}
                  title={sidebarCollapsed ? "Log out" : undefined}
                  aria-label="Log out"
                  className={`flex items-center gap-2.5 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground text-sm font-medium ${sidebarCollapsed ? 'justify-center px-0 py-2.5 flex-1 w-full' : 'px-3 py-2 flex-1'}`}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Log out</span>}
                </button>
              ) : (
                <>
                  <Link href={`/login?return=${encodeURIComponent(pathname)}`} title={sidebarCollapsed ? 'Sign in' : undefined} aria-label="Sign in" className={`flex items-center gap-2.5 rounded-xl text-muted-foreground text-sm font-medium hover:bg-secondary hover:text-foreground ${sidebarCollapsed ? 'justify-center px-0 py-2.5 flex-1 w-full' : 'px-3 py-2 flex-1'}`}>
                    <User className="w-4 h-4 shrink-0" />{!sidebarCollapsed && <span>Sign in</span>}
                  </Link>
                  {!sidebarCollapsed && <Link href="/register" className="rounded-xl bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90">Join free</Link>}
                </>
              )}
            </div>
          </div>
        </nav>

        {/* ── Main content ── */}
        <main className={`flex-1 min-w-0 transition-all duration-200
          ${sidebarCollapsed ? "md:ml-14" : "md:ml-56"}
          xl:mr-72
          ${isImmersiveRoute
            ? 'overflow-hidden'
            : 'px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-4'}`}>
          {isLoadingAuth ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            children
          )}
        </main>

        {/* ── Right Panel (xl screens only, like Facebook) ── */}
        <aside className="hidden xl:flex fixed right-0 top-14 bottom-0 w-72 flex-col gap-4 px-4 py-4 overflow-y-auto border-l border-border bg-background">
          <RightPanel user={user} />
        </aside>
      </div>

      {/* ── Mobile Bottom Nav + More Sheet ── */}
      {!isShowroomBuilder && !isImmersiveRoute && (
        <>
          {/* ── Mobile Side Drawer — full height, slides from left ── */}
          {drawerOpen && (
            <>
              {/* Backdrop — click to close */}
              <div
                className="fixed inset-0 z-[70] bg-black/50 md:hidden"
                onClick={() => setDrawerOpen(false)}
              />
              {/* Panel — full height, same width as screen minus a handle strip */}
              <div className="fixed inset-y-0 left-0 z-[80] md:hidden bg-white dark:bg-card w-[84vw] max-w-sm flex flex-col shadow-2xl">

                {/* ── Cover photo + avatar inside it — full width, no side padding ── */}
                <div className="relative h-40 shrink-0 bg-empire-gradient">
                  {userProfile?.cover_url && (
                    <Image src={userProfile.cover_url} alt="" fill className="object-cover" unoptimized />
                  )}
                  {/* Dark gradient at bottom so avatar stands out */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

                  {/* Back button — top-left */}
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center backdrop-blur-sm transition-colors z-10"
                    aria-label="Close menu"
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>

                  {/* Avatar — bottom-left, INSIDE the cover area */}
                  {hasSignedInUser ? (
                    <Link href="/profile" onClick={() => setDrawerOpen(false)}
                      className="absolute bottom-3 left-4 w-16 h-16 rounded-2xl ring-3 ring-white/70 overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                      {userProfile?.avatar_url
                        ? <Image src={userProfile.avatar_url} alt={displayName} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                        : userInitial}
                    </Link>
                  ) : (
                    <div aria-label="Guest session" className="absolute bottom-3 left-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500 text-white shadow-xl">
                      <UserRound className="h-8 w-8" />
                    </div>
                  )}

                  {/* Name + email — bottom-right of cover, overlaid on gradient */}
                  <div className="absolute bottom-3 left-24 right-3 min-w-0">
                    <p className="text-sm font-bold text-white truncate leading-tight drop-shadow-sm">{displayName}</p>
                    <p className="text-[11px] text-white/80 truncate drop-shadow-sm">{userEmail}</p>
                  </div>
                </div>

                {/* ── Scrollable nav list ── */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 bg-white dark:bg-card">

                  {/* Main nav items */}
                  {visibleMainNavItems.map(({ path, icon: Icon, label }) => (
                    <React.Fragment key={path}>
                      <Link href={path} onClick={() => setDrawerOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive(path) ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground'}`}>
                        <Icon className="w-4 h-4 shrink-0" /><span>{label}</span>
                      </Link>
                      {/* Personal | Business pill — under Home in drawer */}
                      {path === '/feed' && isActive('/feed') && (
                        <ViewTogglePill
                          value={homeFeedMode}
                          onChange={(v) => { if (v !== homeFeedMode) setHomeFeedMode(v); }}
                        />
                      )}
                      {/* Personal | Business pill — under Profile in drawer */}
                      {path === '/profile' && isActive('/profile') && (
                        <ViewTogglePill
                          value={profileViewMode}
                          onChange={(v) => {
                            if (v === profileViewMode) return;
                            setProfileViewMode(v);
                            setDrawerOpen(false);
                            if (!pathname.startsWith('/profile')) {
                              router.push(`/profile?view=${v}`);
                            }
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}

                  {/* Create Showroom + Studio */}
                  {hasSignedInUser && <>
                  <div className="my-2 border-t border-gray-100 dark:border-border" />
                  <Link href="/showroom/create" onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-sm">
                    <Plus className="w-4 h-4 shrink-0" /><span>{tr('common.createShowroom')}</span>
                  </Link>
                  <Link href="/showroom/templates" onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive('/showroom/templates') ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground'}`}>
                    <Crown className="w-4 h-4 shrink-0 text-amber-500" /><span>{tr('common.showroomStudio')}</span>
                  </Link>
                  </>}

                  {/* DISCOVER — collapsible, matches desktop */}
                  {hasSignedInUser ? <>
                  <div className="my-2 border-t border-gray-100 dark:border-border" />
                  <button
                    onClick={() => setDiscoverOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-1 group"
                  >
                    <p className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{tr('common.discover')}</p>
                    <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${discoverOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                  {discoverOpen && extraNavItems.map(({ path, icon: Icon, label }) => (
                    <Link key={path} href={path} onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive(path) ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground'}`}>
                      <Icon className="w-4 h-4 shrink-0" /><span>{label}</span>
                    </Link>
                  ))}

                  {/* MY ACCOUNT — collapsible, matches desktop */}
                  <div className="my-2 border-t border-gray-100 dark:border-border" />
                  <button
                    onClick={() => setAccountOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-1 group"
                  >
                    <p className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{tr('common.myAccount')}</p>
                    <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${accountOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                  {accountOpen && accountItems.map(({ path, icon: Icon, label, badge }) => (
                    <Link key={path} href={path} onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive(path) ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground'}`}>
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badge && <span className="w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{badge > 9 ? '9+' : badge}</span>}
                    </Link>
                  ))}
                  </> : (
                    <div className="my-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-950/20">
                      <p className="text-xs font-bold text-foreground">Browsing as a guest</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Sign in or join to save your activity.</p>
                      <div className="mt-3 flex gap-2">
                        <Link href={`/login?return=${encodeURIComponent(pathname)}`} onClick={() => setDrawerOpen(false)} className="flex-1 rounded-lg border border-border bg-background px-2 py-2 text-center text-xs font-semibold">Sign in</Link>
                        <Link href="/register" onClick={() => setDrawerOpen(false)} className="flex-1 rounded-lg bg-primary px-2 py-2 text-center text-xs font-semibold text-primary-foreground">Join free</Link>
                      </div>
                      <Link href="/landing" onClick={() => setDrawerOpen(false)} className="mt-2 block rounded-lg px-2 py-1.5 text-center text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground">Back to landing page</Link>
                    </div>
                  )}

                  {/* SETTINGS inline section removed — now in popup above footer */}

                  <div className="h-4" />
                </div>

                {/* ── Footer: Settings popup + Log out side by side ── */}
                <div className="border-t border-gray-100 dark:border-border px-3 py-3 shrink-0 flex items-center gap-1 bg-white dark:bg-card relative"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>

                  {/* Settings popup — appears above footer, same style as desktop */}
                  {drawerSettingsOpen && (
                    <>
                      {/* Backdrop */}
                      <div className="fixed inset-0 z-40" onClick={() => setDrawerSettingsOpen(false)} />
                      <div
                        className="absolute bottom-full left-3 right-3 mb-2 z-50 rounded-2xl shadow-2xl border border-border overflow-hidden"
                        style={{ backgroundColor: 'hsl(var(--card))', isolation: 'isolate' }}
                      >
                        <div className="px-3 pt-3 pb-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Settings</p>
                        </div>

                        {/* Language */}
                        <button onClick={toggleLanguage}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-sm">
                          <div className="flex items-center gap-2.5 text-muted-foreground">
                            <Languages className="w-4 h-4 shrink-0" /><span>Language</span>
                          </div>
                          <span className="text-xs font-semibold text-foreground bg-secondary border border-border rounded-full px-2 py-0.5">
                            {i18n.language === 'am' ? 'አማ' : 'EN'}
                          </span>
                        </button>

                        {/* Theme */}
                        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-sm">
                          <div className="flex items-center gap-2.5 text-muted-foreground">
                            {mounted && theme === 'dark'
                              ? <Sun className="w-4 h-4 shrink-0 text-amber-400" />
                              : <Moon className="w-4 h-4 shrink-0" />}
                            <span>Theme</span>
                          </div>
                          <span className="text-xs font-semibold text-foreground bg-secondary border border-border rounded-full px-2 py-0.5">
                            {mounted ? (theme === 'dark' ? 'Dark' : 'Light') : '…'}
                          </span>
                        </button>

                        {hasSignedInUser && <>
                        {/* Content filter; the verified cookie controls the environment. */}
                        {user?.is_demo !== true && <button onClick={toggleRealMode}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-sm">
                          <div className="flex items-center gap-2.5 text-muted-foreground">
                            <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${realMode ? 'border-green-500 bg-green-500' : 'border-amber-500 bg-amber-500'}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            </span>
                            <span>Content filter</span>
                          </div>
                          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${realMode ? 'bg-green-500/10 text-green-600 border border-green-500/30' : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'}`}>
                            {realMode ? 'Real accounts only' : 'All accounts'}
                          </span>
                        </button>}

                        {user?.is_demo !== true && <button onClick={() => void enterDemoEnvironment()} disabled={switchingEnvironment}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-950/40">
                          {switchingEnvironment ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                          <span>{switchingEnvironment ? 'Opening demo…' : 'Explore demo sandbox'}</span>
                        </button>}

                        <div className="mx-3 my-1 border-t border-border/40" />

                        {/* Account Settings */}
                        <Link href="/account" onClick={() => setDrawerSettingsOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary transition-colors text-sm text-muted-foreground">
                          <Lock className="w-4 h-4 shrink-0" /><span>Account Settings</span>
                        </Link>

                        {/* Analytics */}
                        <Link href="/analytics" onClick={() => setDrawerSettingsOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary transition-colors text-sm text-muted-foreground">
                          <BarChart3 className="w-4 h-4 shrink-0" /><span>Analytics</span>
                        </Link>

                        {/* Admin Panel — admin only */}
                        {user?.role === 'admin' && (
                          <Link href="/admin" onClick={() => setDrawerSettingsOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary transition-colors text-sm text-muted-foreground">
                            <ShieldAlert className="w-4 h-4 shrink-0" /><span>Admin Panel</span>
                          </Link>
                        )}
                        </>}

                        <div className="h-1" />
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => setDrawerSettingsOpen(v => !v)}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${drawerSettingsOpen ? 'bg-secondary text-foreground' : 'text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground'}`}>
                    <Settings className="w-4 h-4 shrink-0" /><span>Settings</span>
                  </button>
                  {hasSignedInUser ? <button onClick={() => { setDrawerOpen(false); resetSocket(); logout(); }}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-destructive/10 hover:text-red-600 dark:hover:text-destructive transition-colors text-gray-600 dark:text-muted-foreground text-sm font-medium">
                    <LogOut className="w-4 h-4 shrink-0" /><span>Log out</span>
                  </button> : <Link href={`/login?return=${encodeURIComponent(pathname)}`} onClick={() => setDrawerOpen(false)} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"><User className="h-4 w-4" /><span>Sign in</span></Link>}
                </div>
              </div>
            </>
          )}

          {/* Home sub-tabs tray — REMOVED as per user request */}

          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-xl border-t border-border z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-center h-16 px-1">
              {/* More — LEFT */}
              <button onClick={() => { setDrawerOpen(v => !v); }}
                className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${drawerOpen ? 'text-amber-600' : 'text-muted-foreground'}`}>
                <Menu className="w-5 h-5" /><span className="text-[10px] font-medium">More</span>
              </button>
              <Link href="/explore" className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${isActive('/explore') ? 'text-amber-600' : 'text-muted-foreground'}`}>
                <TrendingUp className={`w-5 h-5 ${isActive('/explore') ? 'stroke-[2.5]' : ''}`} /><span className="text-[10px] font-medium">Explore</span>
              </Link>
              <Link href={hasSignedInUser ? '/friends' : '/marketplace'} className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${isActive(hasSignedInUser ? '/friends' : '/marketplace') ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {hasSignedInUser ? <Users className={`w-5 h-5 ${isActive('/friends') ? 'stroke-[2.5]' : ''}`} /> : <Store className="w-5 h-5" />}<span className="text-[10px] font-medium">{hasSignedInUser ? 'Friends' : 'Marketplace'}</span>
              </Link>
              <Link href="/businesses" className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${isActive('/businesses') ? 'text-amber-600' : 'text-muted-foreground'}`}>
                <Store className={`w-5 h-5 ${isActive('/businesses') ? 'stroke-[2.5]' : ''}`} /><span className="text-[10px] font-medium">Businesses</span>
              </Link>
              {/* Home — RIGHT, plain link, no chevron */}
              <Link href="/feed" className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${isActive('/feed') ? 'text-amber-600' : 'text-muted-foreground'}`}>
                <Home className={`w-5 h-5 ${isActive('/feed') ? 'stroke-[2.5]' : ''}`} /><span className="text-[10px] font-medium">Home</span>
              </Link>
            </div>
          </nav>
        </>
      )}

      {/* Push notification permission banner */}
      <PushPermissionBanner />

    </div>
  );
}
