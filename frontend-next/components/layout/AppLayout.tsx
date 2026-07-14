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
  PanelLeftClose, PanelLeftOpen, Menu, X, Gift, LogOut,
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
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

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
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
    { path: "/feed", icon: Home, label: t('nav.home') },
    { path: "/explore", icon: TrendingUp, label: t('nav.explore') },
    { path: "/marketplace", icon: ShoppingBag, label: t('nav.marketplace') },
    { path: "/tasks", icon: ClipboardList, label: t('nav.tasks') },
    { path: "/messages", icon: MessageCircle, label: t('nav.messages') },
    { path: "/profile", icon: User, label: t('nav.profile') },
  ];

  const extraNavItems = [
    { path: "/showrooms", icon: Crown, label: t('nav.showrooms') },
    { path: "/events", icon: CalendarDays, label: t('nav.events') },
    { path: "/jobs", icon: Briefcase, label: t('nav.jobs') },
    { path: "/courses", icon: GraduationCap, label: t('nav.courses') },
  ];

  const accountItems = [
    { path: "/orders", icon: Package, label: t('nav.orders') },
    { path: "/cart", icon: ShoppingCart, label: "Cart", badge: cart.count > 0 ? cart.count : null },
    { path: "/wallet", icon: Wallet, label: t('nav.wallet') },
    { path: "/referral", icon: Gift, label: "Referral" },
    { path: "/coupons", icon: Tag, label: "My Coupons" },
    { path: "/analytics", icon: BarChart3, label: "Analytics" },
  ];

  const isActive = (path) => {
    if (path === "/feed") return pathname === "/feed" || pathname === "/";
    return pathname.startsWith(path);
  };

  const NavLink = ({ path, icon: Icon, label, badge }) => (
    <Link
      href={path}
      title={sidebarCollapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-xl transition-all text-sm font-medium group relative
        ${sidebarCollapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2"}
        ${isActive(path)
          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
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

          {/* Desktop Search — centered */}
          <form
            className="hidden md:flex flex-1 max-w-lg"
            onSubmit={e => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input[name="q"]') as HTMLInputElement;
              const q = input?.value?.trim();
              if (q) { input.value = ''; router.push(`/search?q=${encodeURIComponent(q)}`); }
            }}
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                name="q"
                type="search"
                enterKeyHint="search"
                placeholder={t('common.searchPlaceholder')}
                className="w-full pl-9 pr-4 bg-secondary/50 border-0 focus:outline-none focus:ring-1 focus:ring-amber-500/30 rounded-full h-9 text-sm"
              />
            </div>
          </form>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Mobile search toggle */}
            <button onClick={() => setSearchOpen(v => !v)} className="md:hidden p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Search">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
            {/* Cart */}
            <Link href="/cart" className="relative p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Cart">
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              {cart.count > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cart.count > 9 ? "9+" : cart.count}
                </span>
              )}
            </Link>
            {/* Bookmarks — hidden on mobile to prevent header overflow */}
            <Link href="/bookmarks" className="hidden sm:flex p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Bookmarks">
              <Bookmark className="w-5 h-5 text-muted-foreground" />
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
            <button onClick={toggleLanguage} className="p-2 rounded-full hover:bg-secondary transition-colors text-xs font-bold text-muted-foreground" aria-label="Toggle language" title="Switch English / አማርኛ">
              <Languages className="w-5 h-5" />
              <span className="sr-only">{currentLang}</span>
            </button>
            {/* Avatar */}
            <Link href="/profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {user?.full_name?.charAt(0) || "E"}
            </Link>
          </div>
        </div>

        {/* Mobile Search bar */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3">
            <form
              className="relative"
              onSubmit={e => {
                e.preventDefault();
                const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement)?.value?.trim();
                if (q) { setSearchOpen(false); router.push(`/search?q=${encodeURIComponent(q)}`); }
              }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                name="q"
                type="search"
                enterKeyHint="search"
                placeholder="Search..."
                autoFocus
                className="w-full pl-9 pr-4 bg-secondary/50 border border-border/50 rounded-full h-10 text-sm outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </form>
          </div>
        )}
      </header>

      {/* ── Mobile Drawer ── */}
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/65 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      {/* Drawer panel */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-[80] w-72 bg-white text-slate-950 border-r border-slate-200 shadow-2xl shadow-slate-950/30 flex flex-col md:hidden transition-transform duration-300 dark:bg-slate-950 dark:text-white dark:border-slate-800 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 shrink-0 dark:border-slate-800">
          <Link href="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2">
            <Image
              src="/brand/empire-x-logo.png"
              alt="Empire X"
              width={32}
              height={32}
              className="w-8 h-8 rounded-xl object-cover shadow-sm"
            />
            <span className="font-display text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Empire X</span>
          </Link>
          <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors" aria-label="Close menu">
            <X className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer nav items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {/* Main nav */}
          {mainNavItems.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  isActive(item.path)
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="my-2 border-t border-border/50" />

          {/* Create Showroom */}
          <Link href="/showroom/create" onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-sm shadow-blue-600/20 hover:from-blue-700 hover:to-purple-700 transition-all">
            <Plus className="w-4 h-4 shrink-0" />
            <span>{t('common.createShowroom')}</span>
          </Link>

          {/* Showroom Studio */}
          <Link href="/showroom/templates" onClick={() => setDrawerOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
              isActive('/showroom/templates')
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <Crown className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{t('common.showroomStudio')}</span>
          </Link>

          <div className="my-2 border-t border-border/50" />

          {/* Discover */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">{t('common.discover')}</p>
          {extraNavItems.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  isActive(item.path)
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="my-2 border-t border-border/50" />

          {/* My Account */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">{t('common.myAccount')}</p>
          {accountItems.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  isActive(item.path)
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <>
              <div className="my-2 border-t border-border/50" />
              <Link href="/admin" onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all text-sm font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Admin Panel</span>
              </Link>
            </>
          )}

          <div className="h-4" />
        </div>

        {/* Drawer footer — user info + logout */}
        <div className="border-t border-border px-3 py-3 shrink-0">
          <Link href="/profile" onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 rounded-xl hover:bg-secondary p-2 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {user?.full_name?.charAt(0) || "E"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.full_name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
          </Link>
          <button
            onClick={() => { setDrawerOpen(false); logout(); }}
            className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground text-sm font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </div>

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
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{t('common.discover')}</p>
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
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{t('common.myAccount')}</p>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${accountOpen ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            )}
            {(sidebarCollapsed || accountOpen) && <div id="sidebar-account-section">{accountItems.map(item => <NavLink key={item.path} {...item} />)}</div>}

            {user?.role === "admin" && (
              <>
                <div className="my-2 border-t border-border/50" />
                <NavLink path="/admin" icon={ShieldAlert} label={t('common.adminPanel')} />
              </>
            )}
            <div className="h-2" />
          </div>

          {/* User info pinned at bottom */}
          <div className="border-t border-border px-2 py-3 shrink-0">
            <Link
              href="/profile"
              title={sidebarCollapsed ? (user?.full_name || "Profile") : undefined}
              className={`relative flex items-center gap-2 rounded-xl hover:bg-secondary p-2 transition-colors group
                ${sidebarCollapsed ? "justify-center" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {user?.full_name?.charAt(0) || "E"}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{user?.full_name || "User"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email || ""}</p>
                </div>
              )}
              {sidebarCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  {user?.full_name || "Profile"}
                </span>
              )}
            </Link>
            {/* Logout button */}
            <button
              onClick={() => logout()}
              title={sidebarCollapsed ? "Log out" : undefined}
              className={`relative mt-1 w-full flex items-center gap-2 rounded-xl hover:bg-destructive/10 hover:text-destructive p-2 transition-colors text-muted-foreground group
                ${sidebarCollapsed ? "justify-center" : ""}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span className="text-xs font-medium">Log out</span>}
              {sidebarCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  Log out
                </span>
              )}
            </button>
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

      {/* ── Mobile Bottom Nav ── */}
      {!isShowroomBuilder && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-50"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center justify-around h-16 px-2">
            {mainNavItems.slice(0, 4).map(({ path, icon: Icon, label }) => (
              <Link key={path} href={path} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-[56px] ${isActive(path) ? "text-amber-600" : "text-muted-foreground"}`}>
                <Icon className={`w-5 h-5 ${isActive(path) ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            ))}
            {/* More button — opens full drawer */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all text-muted-foreground hover:text-foreground min-w-[56px]"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t('common.more')}</span>
            </button>
          </div>
        </nav>
      )}

      {/* Push notification permission banner */}
      <PushPermissionBanner />

    </div>
  );
}


