'use client';
import React, { useState, useEffect, useCallback } from "react";
import { entities } from "@/api/entities";
import client from "@/api/client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Home, Search, MessageCircle, ShoppingBag, ClipboardList, Bell, User,
  Plus, Crown, TrendingUp, Briefcase, GraduationCap, CalendarDays,
  Bookmark, Wallet, Moon, Sun, Languages, ShoppingCart, MapPin, Tag,
  Package, ShieldAlert, BarChart3, Store, Flame, Users, Zap, ChevronDown,
  PanelLeftClose, PanelLeftOpen, Menu, X, Gift, LogOut, Lock, Shield,
  ArrowLeft,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { toggleLanguage, getCurrentLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { toast } from "sonner";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import { useRealMode } from "@/lib/RealModeContext";
// AccountSettings popup replaced by /settings navigation

/* ── Right Panel — shortcuts, trending, suggestions ── */
function RightPanel({ user }: { user: { full_name?: string; email?: string; role?: string } | null }) {
  const quickLinks = [
    { path: "/showrooms",  icon: Store,     label: "Showrooms",    color: "#2563EB" },
    { path: "/events",     icon: CalendarDays, label: "Events",    color: "#10B981" },
    { path: "/jobs",       icon: Briefcase, label: "Jobs",          color: "#3B82F6" },
    { path: "/courses",    icon: GraduationCap, label: "Courses",  color: "#8B5CF6" },
    { path: "/marketplace",icon: ShoppingBag, label: "Marketplace",color: "#EC4899" },
    { path: "/tasks",      icon: Zap,       label: "Tasks",         color: "#06B6D4" },
    { path: "/bookmarks",  icon: Bookmark,  label: "Bookmarks",     color: "#6B7280" },
    { path: "/wallet",     icon: Wallet,    label: "Wallet",        color: "#F97316" },
  ];

  return (
    <>
      {/* Quick links */}
      <div className="bg-card dark:bg-card rounded-2xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold">Quick Links</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {quickLinks.map(item => {
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
      <div className="rounded-2xl border border-blue-200/70 bg-white p-4 shadow-sm dark:border-blue-500/25 dark:bg-slate-950">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wide dark:text-blue-300">Sponsored</span>
          <span className="text-[10px] text-muted-foreground">Ad</span>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-3 mb-3 shadow-md shadow-blue-600/20">
          <p className="text-white font-bold text-sm">Empire X Pro</p>
          <p className="text-white/85 text-xs mt-1 leading-relaxed">Boost your business visibility to 10,000+ users.</p>
        </div>
        <Link href="/analytics" className="block text-center py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20 transition-colors">
          Promote Now
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
            href="/showroom/templates"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold transition-all"
          >
            <Crown className="w-3.5 h-3.5" />
            Browse Templates
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
          {["#AddisAbaba","#EthiopianBusiness","#EmpireX","#HabeshaLife","#EthioTech"].map((tag, i) => (
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
          Empire X · Privacy · Terms · About · Advertising
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2025 Empire X. All rights reserved.</p>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === 'am' ? 'አማ' : 'EN';
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, authChecked, isLoadingAuth, logout } = useAuth();
  const { realMode, toggleRealMode } = useRealMode();
  const tr = (key: string) => String(t(key));
  const displayName = typeof user?.full_name === 'string' ? user.full_name : 'User';
  const userEmail = typeof user?.email === 'string' ? user.email : '';
  const userInitial = displayName.charAt(0) || 'E';
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [homeTabsOpen, setHomeTabsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userProfile, setUserProfile] = useState<{ avatar_url?: string; cover_url?: string } | null>(null);
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
    setHomeTabsOpen(false);
  }, [pathname]);

  // Redirect to /login when auth has resolved and user is not authenticated
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.push("/login");
    }
  }, [authChecked, isAuthenticated, router]);

  // Once user is available: check profile, set up socket, load unread count
  useEffect(() => {
    if (!user) return;
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

  const mainNavItems = [
    { path: "/feed", icon: Home, label: tr('nav.home') },
    { path: "/explore", icon: TrendingUp, label: tr('nav.explore') },
    { path: "/friends", icon: Users, label: tr('nav.friends') },
    { path: "/businesses", icon: Store, label: tr('nav.businesses') },
    { path: "/marketplace", icon: ShoppingBag, label: tr('nav.marketplace') },
    { path: "/tasks", icon: ClipboardList, label: tr('nav.tasks') },
    { path: "/messages", icon: MessageCircle, label: tr('nav.messages') },
    { path: "/profile", icon: User, label: tr('nav.profile') },
  ];

  const extraNavItems = [
    { path: "/showrooms", icon: Crown, label: tr('nav.showrooms') },
    { path: "/events", icon: CalendarDays, label: tr('nav.events') },
    { path: "/jobs", icon: Briefcase, label: tr('nav.jobs') },
    { path: "/courses", icon: GraduationCap, label: tr('nav.courses') },
  ];

  const accountItems = [
    { path: "/orders", icon: Package, label: tr('nav.orders') },
    { path: "/cart", icon: ShoppingCart, label: "Cart", badge: cart.count > 0 ? cart.count : null },
    { path: "/wallet", icon: Wallet, label: tr('nav.wallet') },
    { path: "/referral", icon: Gift, label: "Referral" },
    { path: "/coupons", icon: Tag, label: "My Coupons" },
    { path: "/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/account", icon: Lock, label: "Account Settings" },
    { path: "/privacy", icon: Shield, label: "Privacy" },
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
          ? "bg-primary/10 text-primary dark:bg-primary/20"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!sidebarCollapsed && <span className="truncate">{label}</span>}
      {!sidebarCollapsed && badge ? (
        <span className="ml-auto w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      {/* Badge dot in collapsed mode */}
      {sidebarCollapsed && badge ? (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
      ) : null}
      {/* Tooltip in collapsed mode */}
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
          <Link href="/" className={`flex items-center gap-2 shrink-0 transition-all w-8 ${sidebarCollapsed ? "md:w-8" : "md:w-44"}`}>
            <Image
              src="/brand/empire-x-logo.png"
              alt="Empire X"
              width={32}
              height={32}
              className="w-8 h-8 rounded-xl object-cover shadow-sm"
              priority
            />
            {!sidebarCollapsed && (
              <span className="hidden md:inline font-display text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                Empire X
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
            {/* Cart */}
            <Link href="/cart" className="relative p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Cart">
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              {cart.count > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cart.count > 9 ? "9+" : cart.count}
                </span>
              )}
            </Link>
            {/* Notifications */}
            <Link href="/notifications" className="relative p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Notifications">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            {/* Real/Demo mode toggle — visible on all sizes */}
            <button
              onClick={toggleRealMode}
              title={realMode ? 'Real users only — click to show all' : 'Showing all (demo+real) — click for real only'}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all ${
                realMode
                  ? 'bg-green-500 text-white border-green-500 shadow-sm shadow-green-500/30'
                  : 'bg-secondary text-muted-foreground border-border/50 hover:bg-secondary/80'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${realMode ? 'bg-white' : 'bg-amber-500'}`} />
              {realMode ? 'Real' : 'Demo'}
            </button>
            {/* Dark mode */}
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Toggle dark mode">
              {!mounted ? (
                <span className="block w-5 h-5 rounded-full bg-muted-foreground/20" aria-hidden />
              ) : theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            {/* Language */}
            <button onClick={toggleLanguage} className="p-2 rounded-full hover:bg-secondary transition-colors flex items-center justify-center" aria-label="Toggle language" title="Switch English / አማርኛ">
              <Languages className="w-5 h-5 text-muted-foreground" />
            </button>
            {/* Avatar */}
            <Link href="/profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm font-semibold shrink-0 overflow-hidden ml-1">
              {user?.full_name?.charAt(0) || "E"}
            </Link>
          </div>
        </div>

      </header>

      {/* ── Body: sidebar + main + right panel ── */}
      <div className="flex flex-1 w-full">

        {/* ── Left Sidebar (desktop only) ── */}
        <nav className={`hidden md:flex fixed left-0 top-14 bottom-0 bg-background border-r border-border flex-col z-40 transition-all duration-200
          ${sidebarCollapsed ? "w-14" : "w-52"}`}>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5 scrollbar-thin">
            {mainNavItems.map(item => <NavLink key={item.path} {...item} />)}

            <div className="my-2 border-t border-border/50" />

            {/* Create Showroom */}
            <Link
              href="/showroom/create"
              title={sidebarCollapsed ? t('common.createShowroom') : undefined}
              className={`relative flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm shadow-blue-600/20 group
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

            <div className="my-2 border-t border-border/50" />

            {/* Discover — collapsible group (hidden when sidebar is icon-only) */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setDiscoverOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-1 group"
                aria-expanded={discoverOpen}
                aria-controls="sidebar-discover-section"
              >
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{tr('common.discover')}</p>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${discoverOpen ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            )}
            {(sidebarCollapsed || discoverOpen) && <div id="sidebar-discover-section">{extraNavItems.map(item => <NavLink key={item.path} {...item} />)}</div>}

            <div className="my-2 border-t border-border/50" />

            {/* My Account — collapsible group */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setAccountOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-1 group"
                aria-expanded={accountOpen}
                aria-controls="sidebar-account-section"
              >
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{tr('common.myAccount')}</p>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${accountOpen ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            )}
            {(sidebarCollapsed || accountOpen) && <div id="sidebar-account-section">{accountItems.map(item => <NavLink key={item.path} {...item} />)}</div>}

            {user?.role === "admin" && (
              <>
                <div className="my-2 border-t border-border/50" />
                <NavLink path="/admin" icon={ShieldAlert} label={tr('common.adminPanel')} />
              </>
            )}
            <div className="h-2" />
          </div>

          {/* Sidebar footer — profile card + logout */}
          <div className="border-t border-border px-2 py-3 shrink-0">
            {sidebarCollapsed ? (
              <div className="relative flex justify-center group">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm cursor-default">
                  {userProfile?.avatar_url
                    ? <img src={userProfile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                    : userInitial}
                </div>
                <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  {displayName}
                </span>
              </div>
            ) : (
              <>
                {/* Profile card with mini cover */}
                <div className="rounded-xl overflow-hidden border border-border mb-1.5">
                  {/* Mini cover */}
                  <div className="h-10 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                    {userProfile?.cover_url && (
                      <img src={userProfile.cover_url} alt="" className="w-full h-full object-cover absolute inset-0" />
                    )}
                  </div>
                  <div className="bg-card px-2 pb-2 flex items-end gap-2 -mt-4">
                    <div className="w-9 h-9 rounded-lg ring-2 ring-card overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {userProfile?.avatar_url
                        ? <img src={userProfile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                        : userInitial}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-xs font-semibold truncate text-foreground">{displayName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground text-sm font-medium"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Log out</span>
                </button>
              </>
            )}
          </div>
        </nav>

        {/* ── Main content ── */}
        <main className={`flex-1 min-w-0 transition-all duration-200
          ${sidebarCollapsed ? "md:ml-14" : "md:ml-52"}
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
      {!isShowroomBuilder && (
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
              <div className="fixed inset-y-0 left-0 z-[80] md:hidden bg-card w-[84vw] max-w-sm flex flex-col shadow-2xl">

                {/* ── Cover photo — fills top, no padding ── */}
                <div className="relative h-36 shrink-0 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700">
                  {userProfile?.cover_url && (
                    <img src={userProfile.cover_url} alt="" className="w-full h-full object-cover absolute inset-0" />
                  )}
                  {/* Back / close button — top-left */}
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center backdrop-blur-sm transition-colors"
                    aria-label="Close menu"
                  >
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* ── Avatar overlapping cover ── */}
                <div className="px-4 -mt-10 pb-3 flex items-end justify-between shrink-0">
                  <Link href="/profile" onClick={() => setDrawerOpen(false)}>
                    <div className="w-16 h-16 rounded-2xl ring-4 ring-card overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {userProfile?.avatar_url
                        ? <img src={userProfile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                        : userInitial}
                    </div>
                  </Link>
                  <Link href="/profile/edit" onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors">
                    <User className="w-3 h-3" /> Edit Profile
                  </Link>
                </div>

                {/* Name + email + account settings */}
                <div className="px-4 pb-2 shrink-0">
                  <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate mb-2">{userEmail}</p>
                  <Link href="/account" onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs font-semibold ${isActive('/account') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                    <Lock className="w-3.5 h-3.5 shrink-0" /> Account Settings
                  </Link>
                </div>

                <div className="mx-4 border-t border-border" />

                {/* ── Scrollable nav list ── */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
                  {mainNavItems.map(({ path, icon: Icon, label }) => (
                    <Link key={path} href={path} onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive(path) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                      <Icon className="w-4 h-4 shrink-0" /><span>{label}</span>
                    </Link>
                  ))}

                  <div className="my-2 border-t border-border" />
                  <Link href="/showroom/create" onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-sm">
                    <Plus className="w-4 h-4 shrink-0" /><span>{tr('common.createShowroom')}</span>
                  </Link>
                  <Link href="/showroom/templates" onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive('/showroom/templates') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                    <Crown className="w-4 h-4 shrink-0 text-amber-500" /><span>{tr('common.showroomStudio')}</span>
                  </Link>

                  <div className="my-2 border-t border-border" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pt-1 pb-0.5">{tr('common.discover')}</p>
                  {extraNavItems.map(({ path, icon: Icon, label }) => (
                    <Link key={path} href={path} onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive(path) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                      <Icon className="w-4 h-4 shrink-0" /><span>{label}</span>
                    </Link>
                  ))}

                  <div className="my-2 border-t border-border" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pt-1 pb-0.5">{tr('common.myAccount')}</p>
                  {accountItems.filter(i => i.path !== '/account').map(({ path, icon: Icon, label, badge }) => (
                    <Link key={path} href={path} onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive(path) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badge && <span className="w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{badge > 9 ? '9+' : badge}</span>}
                    </Link>
                  ))}
                  <div className="h-4" />
                </div>

                {/* ── Footer: admin panel (if admin) + logout side by side ── */}
                <div className="border-t border-border px-3 py-3 shrink-0 flex items-center gap-2"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                  {user?.role === 'admin' && (
                    <Link href="/admin" onClick={() => setDrawerOpen(false)}
                      className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-sm font-medium">
                      <ShieldAlert className="w-4 h-4 shrink-0" /><span>Admin</span>
                    </Link>
                  )}
                  <button onClick={() => { setDrawerOpen(false); logout(); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground text-sm font-medium ${user?.role === 'admin' ? '' : 'flex-1'}`}>
                    <LogOut className="w-4 h-4 shrink-0" /><span>Log out</span>
                  </button>
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
              <Link href="/friends" className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${isActive('/friends') ? 'text-amber-600' : 'text-muted-foreground'}`}>
                <Users className={`w-5 h-5 ${isActive('/friends') ? 'stroke-[2.5]' : ''}`} /><span className="text-[10px] font-medium">Friends</span>
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


