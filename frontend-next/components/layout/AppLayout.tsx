'use client';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import client from "@/api/client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Home, Search, MessageCircle, ShoppingBag, ClipboardList, Bell, User,
  Crown, TrendingUp, Briefcase, GraduationCap, CalendarDays,
  Bookmark, Wallet, Moon, Sun, Languages, ShoppingCart, Tag,
  Package, ShieldAlert, BarChart3, Store, Flame, Users, Zap, ChevronDown,
  PanelLeftClose, PanelLeftOpen, Menu, X, Gift, LogOut, Lock,
  ArrowLeft, KanbanSquare, Settings, FileText, ClipboardCheck,
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
import { useProfileView } from "@/lib/ProfileViewContext";
import { BUILDER_CATEGORY_META, BUILDER_TEMPLATES } from "@/lib/builderSections";
import { PeopleYouMayKnow } from "@/components/suggestions/PeopleYouMayKnow";
// AccountSettings popup replaced by /settings navigation

const STUDIO_CATEGORY_COUNT = BUILDER_CATEGORY_META.length;
const STUDIO_TEMPLATE_COUNT = BUILDER_CATEGORY_META.reduce(
  (sum, meta) => sum + (BUILDER_TEMPLATES[meta.cat]?.length || 0), 0
);

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

  return (
    <>
      {/* People You May Know — only for authenticated users */}
      {user && <PeopleYouMayKnow />}

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
      <div className="rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-primary uppercase tracking-wide">Sponsored</span>
          <span className="text-[10px] text-muted-foreground">Ad</span>
        </div>
        <div className="rounded-xl bg-nodbusiness-gradient p-3 mb-3 shadow-md shadow-primary/20">
          <p className="text-white font-bold text-sm">Nodbusiness Pro</p>
          <p className="text-white/85 text-xs mt-1 leading-relaxed">Boost your business visibility to 10,000+ users.</p>
        </div>
        <Link href="/analytics" className="block text-center py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm shadow-primary/20 transition-colors">
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
              <p className="text-white/75 text-[10px]">{STUDIO_TEMPLATE_COUNT} templates · {STUDIO_CATEGORY_COUNT} categories</p>
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
            href="/showroom/create"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold transition-all"
          >
            <Crown className="w-3.5 h-3.5" />
            Open Studio
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
          {["#GlobalBusiness","#Nodbusiness","#Entrepreneur","#SmallBusiness","#StartupLife"].map((tag, i) => (
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
        <p className="text-[10px] text-muted-foreground mt-1">© 2025 Nodbusiness. All rights reserved.</p>
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
  const { activeView, setActiveView, accentTokens, isPersonal } = useProfileView();
  const tr = (key: string) => String(t(key));
  const displayName = typeof user?.full_name === 'string' ? user.full_name : 'User';
  const userEmail = typeof user?.email === 'string' ? user.email : '';
  const userInitial = displayName.charAt(0) || 'E';
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadTasks, setUnreadTasks] = useState(0);
  const [unreadFollows, setUnreadFollows] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [homeTabsOpen, setHomeTabsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      s.on("new_notification", (notif: any) => {
        if (notif.type === 'message') {
          // Don't badge if already on the messages page
          if (!window.location.pathname.startsWith('/messages')) {
            setUnreadMessages(c => c + 1);
          }
        } else if (notif.type === 'task' || notif.type === 'task_assigned' || notif.type === 'task_completed') {
          if (!window.location.pathname.startsWith('/tasks')) {
            setUnreadTasks(c => c + 1);
          }
        } else if (notif.type === 'follow' || notif.type === 'friend_request' || notif.type === 'connection') {
          if (!window.location.pathname.startsWith('/friends')) {
            setUnreadFollows(c => c + 1);
          }
        } else {
          setUnreadCount(c => c + 1);
        }
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
      const { data } = await client.get('/api/notifications?limit=100');
      const notifications = Array.isArray(data) ? data : [];
      const unread = notifications.filter((notif: any) => !notif.is_read);
      setUnreadMessages(unread.filter((n: any) => n.type === 'message').length);
      setUnreadTasks(unread.filter((n: any) => ['task', 'task_assigned', 'task_completed'].includes(n.type)).length);
      setUnreadFollows(unread.filter((n: any) => ['follow', 'friend_request', 'connection'].includes(n.type)).length);
      setUnreadCount(unread.filter((n: any) =>
        !['message', 'task', 'task_assigned', 'task_completed', 'follow', 'friend_request', 'connection'].includes(n.type)
      ).length);
    } catch {}
  };

  // Clear badge + mark notifications read when user navigates to relevant section
  useEffect(() => {
    if (pathname.startsWith('/messages')) {
      setUnreadMessages(0);
      client.post('/api/notifications/mark-read', { type: 'message' }).catch(() => {});
    }
    if (pathname.startsWith('/tasks')) {
      setUnreadTasks(0);
      client.post('/api/notifications/mark-read', { type: 'task' }).catch(() => {});
    }
    if (pathname.startsWith('/friends')) {
      setUnreadFollows(0);
      client.post('/api/notifications/mark-read', { type: 'follow' }).catch(() => {});
    }
    if (pathname.startsWith('/notifications')) {
      setUnreadCount(0);
    }
  }, [pathname]);

  const mainNavItems = [
    { path: "/feed", icon: Home, label: tr('nav.home') },
    { path: "/explore", icon: TrendingUp, label: tr('nav.explore') },
    { path: "/friends", icon: Users, label: tr('nav.friends'), badge: unreadFollows > 0 ? unreadFollows : null },
    { path: "/businesses", icon: Store, label: tr('nav.businesses') },
    { path: "/marketplace", icon: ShoppingBag, label: tr('nav.marketplace') },
    { path: "/tasks", icon: ClipboardList, label: tr('nav.tasks'), badge: unreadTasks > 0 ? unreadTasks : null },
    { path: "/messages", icon: MessageCircle, label: tr('nav.messages'), badge: unreadMessages > 0 ? unreadMessages : null },
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
          ? accentTokens.activeNavClass
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!sidebarCollapsed && <span className="truncate">{label}</span>}
      {!sidebarCollapsed && badge ? (
        <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 px-1">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      {sidebarCollapsed && badge ? (
        <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
          {badge > 9 ? "9+" : badge}
        </span>
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
      {/* ── Header — fixed so it never scrolls away on any device/browser ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-background border-b border-border shrink-0 h-14">
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
          <Link href="/" className={`flex items-center shrink-0 transition-all ${sidebarCollapsed ? "md:w-8" : "md:w-44"}`}>
            {sidebarCollapsed ? (
              <Image
                src="/brand/nodbusiness-icon.svg"
                alt="Nodbusiness"
                width={32}
                height={32}
                className="w-8 h-8 rounded-xl object-cover shadow-sm"
                priority
              />
            ) : (
              <Image
                src="/brand/nodbusiness-logo.svg"
                alt="Nodbusiness"
                width={176}
                height={27}
                className="h-7 w-auto"
                priority
              />
            )}
          </Link>

          {/* Desktop Search — inline expand, pushes icons right. NO overlay popup */}
          <div className={`hidden md:flex items-center transition-all duration-200 ${searchOpen ? 'flex-1 max-w-lg' : 'flex-1 max-w-sm'}`}>
            <form
              className="relative w-full"
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
                placeholder={tr('common.searchPlaceholder')}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setSearchOpen(false)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); (e.target as HTMLInputElement).blur(); } }}
                className="w-full pl-9 pr-4 bg-secondary border border-border rounded-full h-9 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-background transition-all"
              />
            </form>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Mobile search — solid full-width overlay covering entire top bar */}
            {searchOpen && (
              <div className="md:hidden fixed inset-x-0 top-0 z-[200] h-14 flex items-center px-3 gap-2 shadow-xl"
                style={{ backgroundColor: 'hsl(var(--background))' }}>
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
                      aria-label="Search"
                      onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); }}
                      className="w-full pl-9 pr-4 h-10 rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 border border-primary/30 transition-all"
                      style={{ backgroundColor: 'hsl(var(--secondary))' }} />
                  </div>
                </form>
                <button onClick={() => setSearchOpen(false)}
                  className="p-2 rounded-full transition-colors shrink-0 text-foreground"
                  aria-label="Close search"
                  style={{ backgroundColor: 'hsl(var(--secondary))' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            {/* Mobile search icon */}
            {!searchOpen && (
              <button onClick={() => setSearchOpen(true)} className="md:hidden p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Search">
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {/* Bookmarks */}
            <Link href="/bookmarks" className="relative p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Bookmarks">
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
            {/* Real/Demo mode toggle — MOVED TO SETTINGS */}
            {/* Dark mode — MOVED TO SETTINGS */}
            {/* Language — MOVED TO SETTINGS */}
            {/* Avatar */}
            <Link href="/profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0 overflow-hidden ml-1">
              {userProfile?.avatar_url
                ? <Image src={userProfile.avatar_url} alt={displayName} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                : (user?.full_name?.charAt(0) || "E")}
            </Link>
          </div>
        </div>

      </header>

      {/* ── Body: sidebar + main + right panel (pt-14 offsets the fixed header) ── */}
      <div className="flex flex-1 w-full pt-14">

        {/* ── Left Sidebar (desktop only) ── */}
        <nav className={`hidden md:flex fixed left-0 top-14 bottom-0 bg-card border-r border-border flex-col z-40 transition-all duration-200
          ${sidebarCollapsed ? "w-14" : "w-56"}`}>

          {/* ── Profile header — matches mobile drawer ── */}
          {!sidebarCollapsed && (
            <div className="shrink-0">
              {/* Cover + avatar */}
              <div className="relative h-20 bg-gradient-to-r from-blue-700 to-violet-700">
                {userProfile?.cover_url && (
                  <Image src={userProfile.cover_url} alt="" fill className="object-cover" unoptimized />
                )}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent" />
                {/* Avatar overlapping cover */}
                <Link href="/profile"
                  className="absolute -bottom-5 left-4 w-10 h-10 rounded-xl ring-2 ring-card overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0">
                  {userProfile?.avatar_url
                    ? <Image src={userProfile.avatar_url} alt={displayName} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                    : userInitial}
                </Link>
              </div>
              {/* Name + email row */}
              <div className="pt-7 pb-2 px-4 border-b border-border/40">
                <p className="text-xs font-bold truncate text-foreground leading-tight">{displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>
          )}

          {/* ── Collapsed avatar ── */}
          {sidebarCollapsed && (
            <div className="shrink-0 flex justify-center pt-3 pb-2 border-b border-border/40">
              <Link href="/profile" className="relative group">
                <div className="w-9 h-9 rounded-xl ring-2 ring-border overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {userProfile?.avatar_url
                    ? <Image src={userProfile.avatar_url} alt={displayName} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                    : userInitial}
                </div>
                <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  {displayName}
                </span>
              </Link>
            </div>
          )}

          {/* ── Nav links ── */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-0.5 scrollbar-thin">
            {mainNavItems.map((item, idx) => (
              <React.Fragment key={item.path}>
                <NavLink {...item} />
                {/* Personal / Business toggle — sits right below Home nav item */}
                {item.path === "/feed" && !sidebarCollapsed && (
                  <div className="flex items-center gap-1 px-3 py-1">
                    <button
                      onClick={() => { setActiveView('personal'); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: isPersonal ? accentTokens.primary : 'hsl(var(--secondary))',
                        color: isPersonal ? '#fff' : 'hsl(var(--muted-foreground))',
                      }}
                    >
                      <User className="w-3 h-3" /> Personal
                    </button>
                    <button
                      onClick={() => { setActiveView('business'); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: !isPersonal ? accentTokens.primary : 'hsl(var(--secondary))',
                        color: !isPersonal ? '#fff' : 'hsl(var(--muted-foreground))',
                      }}
                    >
                      <Store className="w-3 h-3" /> Business
                    </button>
                  </div>
                )}
                {item.path === "/feed" && sidebarCollapsed && (
                  <button
                    onClick={() => setActiveView(activeView === 'personal' ? 'business' : 'personal')}
                    title={`Switch to ${activeView === 'personal' ? 'Business' : 'Personal'}`}
                    className="flex justify-center w-full py-1.5 mx-1 rounded-lg transition-colors relative group"
                    style={{ backgroundColor: 'hsl(var(--secondary))' }}
                  >
                    {isPersonal
                      ? <User className="w-4 h-4" style={{ color: accentTokens.primary }} />
                      : <Store className="w-4 h-4" style={{ color: accentTokens.primary }} />}
                    <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                      {activeView === 'personal' ? 'Switch to Business' : 'Switch to Personal'}
                    </span>
                  </button>
                )}
              </React.Fragment>
            ))}

            <div className="my-2 border-t border-border/40" />

            {/* Showroom Studio — single gold entry into the unified wizard */}
            <Link
              href="/showroom/create"
              title={sidebarCollapsed ? t('common.showroomStudio') : undefined}
              className={`relative flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-semibold transition-all shadow-sm group
                ${sidebarCollapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2"}
                ${isActive('/showroom/create') ? 'ring-2 ring-amber-400/70 ring-offset-1 ring-offset-background' : ''}`}
            >
              <Crown className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>{t('common.showroomStudio')}</span>}
              {sidebarCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  {t('common.showroomStudio')}
                </span>
              )}
            </Link>

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

            {/* My Account */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setAccountOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-1 group"
                aria-expanded={accountOpen}
              >
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{tr('common.myAccount')}</p>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${accountOpen ? 'rotate-0' : '-rotate-90'}`} />
              </button>
            )}
            {(sidebarCollapsed || accountOpen) && accountItems.map(item => <NavLink key={item.path} {...item} />)}

            {user?.role === "admin" && (
              <>
                <div className="my-2 border-t border-border/40" />
                <NavLink path="/admin" icon={ShieldAlert} label={tr('common.adminPanel')} />
                <NavLink path="/admin/devops" icon={KanbanSquare} label="Dev Ops" />
            <NavLink path="/scorecard" icon={ClipboardCheck} label="Scorecard" />
              </>
            )}
            <div className="h-4" />
          </div>

          {/* ── Sidebar footer — Settings ── */}
          <div className="border-t border-border px-2 py-2 shrink-0">
            <button
              onClick={() => setSettingsOpen(true)}
              title={sidebarCollapsed ? "Settings" : undefined}
              className={`w-full flex items-center gap-2.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground text-sm font-medium
                ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"}`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Settings</span>}
            </button>
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
                <div className="relative h-40 shrink-0 bg-nodbusiness-gradient">
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
                  <Link href="/profile" onClick={() => setDrawerOpen(false)}
                    className="absolute bottom-3 left-4 w-16 h-16 rounded-2xl ring-3 ring-white/70 overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                    {userProfile?.avatar_url
                      ? <Image src={userProfile.avatar_url} alt={displayName} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                      : userInitial}
                  </Link>

                  {/* Name + email — bottom-right of cover, overlaid on gradient */}
                  <div className="absolute bottom-3 left-24 right-3 min-w-0">
                    <p className="text-sm font-bold text-white truncate leading-tight drop-shadow-sm">{displayName}</p>
                    <p className="text-[11px] text-white/80 truncate drop-shadow-sm">{userEmail}</p>
                  </div>
                </div>

                {/* Account Settings — pinned below cover, white bg */}
                <div className="px-3 pt-2 pb-1 bg-white dark:bg-card shrink-0">
                  <Link href="/account" onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive('/account') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-foreground'}`}>
                    <Lock className="w-4 h-4 shrink-0" /><span>Account Settings</span>
                  </Link>
                  <div className="mt-1 border-t border-gray-100 dark:border-border" />
                </div>

                {/* ── Scrollable nav list — solid white ── */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 bg-white dark:bg-card">
                  {/* Mobile drawer nav links — with red badges */}
                  {mainNavItems.map(({ path, icon: Icon, label, badge }) => (
                    <React.Fragment key={path}>
                      <Link href={path} onClick={() => setDrawerOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive(path) ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground'}`}>
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{label}</span>
                        {badge ? (
                          <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                            {badge > 9 ? '9+' : badge}
                          </span>
                        ) : null}
                      </Link>
                      {/* Personal / Business toggle — right below Home nav item */}
                      {path === "/feed" && (
                        <div className="flex items-center gap-2 px-3 py-1">
                          <button
                            onClick={() => { setActiveView('personal'); setDrawerOpen(false); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{
                              backgroundColor: isPersonal ? accentTokens.primary : 'hsl(var(--secondary))',
                              color: isPersonal ? '#fff' : 'hsl(var(--muted-foreground))',
                            }}
                          >
                            <User className="w-3 h-3" /> Personal
                          </button>
                          <button
                            onClick={() => { setActiveView('business'); setDrawerOpen(false); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{
                              backgroundColor: !isPersonal ? accentTokens.primary : 'hsl(var(--secondary))',
                              color: !isPersonal ? '#fff' : 'hsl(var(--muted-foreground))',
                            }}
                          >
                            <Store className="w-3 h-3" /> Business
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  ))}

                  <div className="my-2 border-t border-gray-100 dark:border-border" />
                  <Link href="/showroom/create" onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-semibold shadow-sm">
                    <Crown className="w-4 h-4 shrink-0" /><span>{tr('common.showroomStudio')}</span>
                  </Link>

                  <div className="my-2 border-t border-gray-100 dark:border-border" />
                  <button
                    onClick={() => setDiscoverOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 pt-1 pb-0.5 group"
                  >
                    <p className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{tr('common.discover')}</p>
                    <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-muted-foreground transition-transform duration-200 ${discoverOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                  {discoverOpen && extraNavItems.map(({ path, icon: Icon, label }) => (
                    <Link key={path} href={path} onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive(path) ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground'}`}>
                      <Icon className="w-4 h-4 shrink-0" /><span>{label}</span>
                    </Link>
                  ))}

                  <div className="my-2 border-t border-gray-100 dark:border-border" />
                  <button
                    onClick={() => setAccountOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 pt-1 pb-0.5 group"
                  >
                    <p className="text-[10px] font-bold text-gray-400 dark:text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">{tr('common.myAccount')}</p>
                    <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-muted-foreground transition-transform duration-200 ${accountOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                  {accountOpen && accountItems.filter(i => i.path !== '/account').map(({ path, icon: Icon, label, badge }) => (
                    <Link key={path} href={path} onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive(path) ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground'}`}>
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badge && <span className="w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{badge > 9 ? '9+' : badge}</span>}
                    </Link>
                  ))}
                  <div className="h-4" />
                </div>

                {/* ── Footer: admin panel (if admin) + logout side by side — solid white ── */}
                <div className="border-t border-gray-100 dark:border-border px-3 py-3 shrink-0 flex items-center gap-2 bg-white dark:bg-card"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                  {user?.role === 'admin' && (
                    <Link href="/admin" onClick={() => setDrawerOpen(false)}
                      className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground transition-colors text-sm font-medium">
                      <ShieldAlert className="w-4 h-4 shrink-0" /><span>Admin</span>
                    </Link>
                  )}
                  {user?.role === 'admin' && (
                    <Link href="/admin/devops" onClick={() => setDrawerOpen(false)}
                      className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary hover:text-gray-900 dark:hover:text-foreground transition-colors text-sm font-medium">
                      <KanbanSquare className="w-4 h-4 shrink-0" /><span>Dev Ops</span>
                    </Link>
                  )}
                  {/* Settings — opens popup (logout is inside settings) */}
                  <button onClick={() => { setDrawerOpen(false); setSettingsOpen(true); }}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-secondary transition-colors text-gray-600 dark:text-muted-foreground text-sm font-medium">
                    <Settings className="w-4 h-4 shrink-0" /><span>Settings</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Home sub-tabs tray — REMOVED as per user request */}

          <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', backgroundColor: 'hsl(var(--background))' }}>
            <div className="flex items-center h-16 px-1">
              {/* More — LEFT */}
              <button onClick={() => { setDrawerOpen(v => !v); }}
                className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${drawerOpen ? 'text-primary' : 'text-muted-foreground'}`}>
                <Menu className="w-5 h-5" /><span className="text-[10px] font-medium">More</span>
              </button>
              <Link href="/explore" className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${isActive('/explore') ? 'text-primary' : 'text-muted-foreground'}`}>
                <TrendingUp className={`w-5 h-5 ${isActive('/explore') ? 'stroke-[2.5]' : ''}`} /><span className="text-[10px] font-medium">Explore</span>
              </Link>
              {/* Messages with unread badge */}
              <Link href="/messages" className={`relative flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${isActive('/messages') ? 'text-primary' : 'text-muted-foreground'}`}>
                <span className="relative">
                  <MessageCircle className={`w-5 h-5 ${isActive('/messages') ? 'stroke-[2.5]' : ''}`} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">Messages</span>
              </Link>
              <Link href="/friends" className={`relative flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${isActive('/friends') ? 'text-primary' : 'text-muted-foreground'}`}>
                <span className="relative">
                  <Users className={`w-5 h-5 ${isActive('/friends') ? 'stroke-[2.5]' : ''}`} />
                  {unreadFollows > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unreadFollows > 9 ? '9+' : unreadFollows}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">Friends</span>
              </Link>
              {/* Home — RIGHT */}
              <Link href="/feed" className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${isActive('/feed') ? 'text-primary' : 'text-muted-foreground'}`}>
                <Home className={`w-5 h-5 ${isActive('/feed') ? 'stroke-[2.5]' : ''}`} /><span className="text-[10px] font-medium">Home</span>
              </Link>
            </div>
          </nav>
        </>
      )}

      {/* Push notification permission banner */}
      <PushPermissionBanner />

      {/* ── Settings Popup Menu (VS Code style) ── */}
      {settingsOpen && (
        <>
          {/* Invisible backdrop to close on outside click */}
          <div className="fixed inset-0 z-[90]" onClick={() => setSettingsOpen(false)} />
          {/* Popup — anchors above the Settings button in the sidebar footer */}
          <div
            className="fixed z-[100] bottom-14 left-2 w-64 rounded-xl shadow-2xl overflow-hidden border border-border"
            style={{ backgroundColor: 'hsl(var(--card))', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
          >

            {/* Section divider label */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Settings</p>
            </div>

            {/* Theme */}
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-foreground text-left hover:bg-secondary">
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                : <Moon className="w-4 h-4 text-muted-foreground shrink-0" />}
              <span className="font-medium flex-1">Theme</span>
              <span className="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>

            {/* Language */}
            <button onClick={() => { toggleLanguage(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-foreground text-left hover:bg-secondary">
              <Languages className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium flex-1">Language</span>
              <span className="text-xs font-bold text-muted-foreground">{i18n.language === 'am' ? 'አማ' : 'EN'}</span>
            </button>

            {/* Real / Demo toggle */}
            <button onClick={toggleRealMode}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-foreground text-left hover:bg-secondary">
              <span className={`w-4 h-4 rounded-full shrink-0 border-2 ${realMode ? 'bg-green-500 border-green-500' : 'bg-amber-500 border-amber-500'}`} />
              <span className="font-medium flex-1">{realMode ? 'Real Users' : 'Demo Mode'}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${realMode ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {realMode ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Divider */}
            <div className="border-t border-border my-1" />

            {/* Log out */}
            <button onClick={() => { setSettingsOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-destructive/10 text-red-500 transition-colors text-left">
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="font-medium">Log out</span>
            </button>

            <div className="pb-1" />
          </div>
        </>
      )}

    </div>
  );
}


