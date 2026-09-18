'use client';
import OpsCopilot from '@/components/devops/OpsCopilot';
/**
 * DevOps.tsx — Nodbusiness Developer Operations Hub
 *
 * Sections:
 *  1. System Health   — live service status from /health endpoint
 *  2. Strategy Board  — version tracker aligned with docs/strategy
 *  3. Kanban Board    — bugs / features / tasks with severity + CRUD
 *  4. Project Summary — completed / in-progress / roadmap table
 *  5. Changelog       — recent deployments and milestones
 *
 * Access: all authenticated users (read). Admin: full CRUD.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import client from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Activity, AlertTriangle, BarChart3, Ban, BookOpen, Bug, CheckCircle2, ChevronDown,
  ChevronUp, CircleDot, ClipboardList, Clock, Code2, Database, Eye, FileText, Flag,
  Bot, GitBranch, Globe, KanbanSquare, ListChecks, Loader2, Map, Pencil,
  Plus, RefreshCw, Rocket, Search, Server, ShieldAlert, Sparkles, Tag, Terminal,
  Trash2, TrendingUp, User, Users, Wifi, WifiOff, X, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import ErrorBoundary from '@/components/ErrorBoundary';

// ── Types ─────────────────────────────────────────────────────────────────────
type Kind     = 'bug' | 'feature' | 'task';
type Status   = 'open' | 'in_progress' | 'blocked' | 'done' | 'planned' | 'implemented';
type Severity = 'urgent' | 'warning' | 'attention' | 'cross_check';
type VersionStatus = 'not_started' | 'in_progress' | 'completed' | 'paused';

interface DevOpsItem {
  id: string; kind: Kind; title: string; description?: string | null;
  severity?: Severity | null; status: Status; tags?: string[] | null;
  assigned_to?: string | null; created_by?: string | null;
  created_by_name?: string | null; created_at: string; updated_at: string;
  resolved_at?: string | null;
}

interface HealthData {
  status: string; timestamp: string; version: string;
  services: { database: string; redis: string; ai: string; email: string; storage: string };
}

interface FormState {
  kind: Kind; title: string; description: string;
  severity: Severity | ''; status: Status; tags: string; assigned_to: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SEVERITY_META: Record<Severity, { label: string; dot: string; text: string; chip: string; bar: string }> = {
  urgent:      { label: 'Urgent',      dot: 'bg-red-500',    text: 'text-red-500',    chip: 'bg-red-500/10 text-red-500 border-red-500/30',        bar: 'bg-red-500'    },
  warning:     { label: 'Warning',     dot: 'bg-orange-500', text: 'text-orange-500', chip: 'bg-orange-500/10 text-orange-500 border-orange-500/30', bar: 'bg-orange-500' },
  attention:   { label: 'Attention',   dot: 'bg-yellow-400', text: 'text-yellow-500', chip: 'bg-yellow-400/10 text-yellow-500 border-yellow-400/40', bar: 'bg-yellow-400' },
  cross_check: { label: 'Cross-check', dot: 'bg-blue-500',   text: 'text-blue-500',   chip: 'bg-blue-500/10 text-blue-500 border-blue-500/30',      bar: 'bg-blue-500'   },
};
const SEVERITY_ORDER: Severity[] = ['urgent', 'warning', 'attention', 'cross_check'];

const STATUS_META: Record<Status, { label: string; icon: React.ComponentType<{ className?: string }>; accent: string; headBg: string }> = {
  open:        { label: 'Open',        icon: CircleDot,    accent: 'text-sky-400',     headBg: 'bg-sky-500/10'     },
  in_progress: { label: 'In Progress', icon: Activity,     accent: 'text-amber-500',   headBg: 'bg-amber-500/10'   },
  blocked:     { label: 'Blocked',     icon: Ban,          accent: 'text-red-500',     headBg: 'bg-red-500/10'     },
  planned:     { label: 'Planned',     icon: ListChecks,   accent: 'text-violet-500',  headBg: 'bg-violet-500/10'  },
  done:        { label: 'Done',        icon: CheckCircle2, accent: 'text-emerald-500', headBg: 'bg-emerald-500/10' },
  implemented: { label: 'Implemented', icon: Rocket,       accent: 'text-teal-400',    headBg: 'bg-teal-500/10'    },
};
const COLUMN_ORDER: Status[] = ['open', 'in_progress', 'blocked', 'planned', 'done', 'implemented'];

const KIND_META: Record<Kind, { label: string; icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  bug:     { label: 'Bug',     icon: Bug,          tint: 'text-red-400 bg-red-500/10'      },
  feature: { label: 'Feature', icon: Sparkles,     tint: 'text-violet-400 bg-violet-500/10' },
  task:    { label: 'Task',    icon: ClipboardList, tint: 'text-sky-400 bg-sky-500/10'      },
};
const STATUSES_FOR_KIND: Record<Kind, Status[]> = {
  bug:     ['open', 'in_progress', 'blocked', 'done'],
  task:    ['open', 'in_progress', 'blocked', 'done'],
  feature: ['open', 'in_progress', 'blocked', 'planned', 'implemented'],
};
const EMPTY_FORM: FormState = { kind: 'bug', title: '', description: '', severity: '', status: 'open', tags: '', assigned_to: '' };

// ── Strategy versions ─────────────────────────────────────────────────────────
interface StrategyVersion {
  version: string; label: string; theme: string; status: VersionStatus;
  description: string; sections: string[];
}

const STRATEGY_VERSIONS: StrategyVersion[] = [
  { version: 'v1.0', label: 'Foundation',            theme: 'Skeleton Quality',         status: 'not_started', description: 'Empty states, loading skeletons, error states, mobile polish', sections: ['Loading States','Empty States','Error States','Mobile Responsive','Typography'] },
  { version: 'v1.1', label: 'Onboarding & Auth',     theme: 'First Impression',         status: 'not_started', description: 'Registration flow, OTP UX, onboarding wizard, profile setup',    sections: ['Registration','OTP Verification','Onboarding Wizard','Profile Setup','Session UX'] },
  { version: 'v1.2', label: 'Feed & Social',         theme: 'Core Loop',                status: 'not_started', description: 'Feed quality, post composer, stories, likes, hashtags',          sections: ['Feed Layout','Post Composer','Post Interactions','Stories','Hashtags','Follow System'] },
  { version: 'v1.3', label: 'Marketplace',           theme: 'Commerce',                 status: 'not_started', description: 'Product listings, search/filter, cart, checkout, orders',        sections: ['Product Listing','Product Detail','Search & Filters','Cart & Checkout','Order Management','Reviews'] },
  { version: 'v1.4', label: 'Showrooms',             theme: 'Business Identity',        status: 'not_started', description: 'Showroom builder, public page, SEO, analytics',                 sections: ['Builder UX','Section Types','Public Page','SEO & Sharing','External Sources'] },
  { version: 'v1.5', label: 'Tasks & Gigs',          theme: 'Service Economy',          status: 'not_started', description: 'Task board, creation wizard, bidding, map view, completion',    sections: ['Task Board','Task Creation','Bidding System','Map View','Completion & Payment'] },
  { version: 'v1.6', label: 'Messaging',             theme: 'Real-time Communication', status: 'not_started', description: 'Chat UX, read receipts, presence, groups, media sharing',       sections: ['Conversation List','Chat Room','Message States','Groups & Channels','Media Sharing','Presence'] },
  { version: 'v1.7', label: 'Discover',              theme: 'Content Discovery',        status: 'not_started', description: 'Global search, explore, nearby map, suggestions',               sections: ['Global Search','Explore & Trending','Nearby Map','People Suggestions','Hashtag Pages'] },
  { version: 'v1.8', label: 'Jobs / Events / Courses', theme: 'Community Value',       status: 'not_started', description: 'Job board, events with ticketing, course player with progress',  sections: ['Job Board','Job Applications','Events','Event Creation','Courses','Lesson Player'] },
  { version: 'v1.9', label: 'Wallet & Payments',     theme: 'Money Flow',              status: 'not_started', description: 'Wallet dashboard, top-up, withdrawal, Stripe, Chapa, referral', sections: ['Wallet Dashboard','Top-up Flow','Withdrawal','Transactions','Stripe','Chapa','Referral'] },
  { version: 'v2.0', label: 'Performance & PWA',     theme: 'Speed & Installability',  status: 'not_started', description: 'Core Web Vitals, image optimization, PWA manifest, offline',    sections: ['Core Web Vitals','Image Optimization','Code Splitting','PWA Manifest','Service Worker'] },
  { version: 'v2.1', label: 'Accessibility & i18n',  theme: 'Inclusion',               status: 'not_started', description: 'WCAG 2.1 AA, keyboard nav, screen reader, Amharic translation',  sections: ['WCAG Audit','Keyboard Nav','Screen Reader','Color Contrast','Amharic Translation'] },
  { version: 'v2.2', label: 'Admin & Analytics',     theme: 'Platform Health',         status: 'not_started', description: 'Admin dashboard, moderation, feature flags, seller analytics',  sections: ['Admin Dashboard','User Management','Content Moderation','Feature Flags','Seller Analytics'] },
  { version: 'v2.3', label: 'AI & Intelligence',     theme: 'Smart Features',          status: 'not_started', description: 'AI assistant, product descriptions, feed ranking, smart search', sections: ['AI Assistant','AI Descriptions','Feed Ranking','Smart Search','Business Insights'] },
  { version: 'v2.4', label: 'Developer Platform',    theme: 'Open Infrastructure',     status: 'not_started', description: 'Public API keys, webhooks, OAuth 2.0, embed widget, integration marketplace', sections: ['API Keys','Webhook System','OAuth 2.0','Embed Widget','Developer Dashboard','API Docs','Integration Marketplace'] },
  { version: 'v3.0', label: 'Scale & Growth',        theme: 'Expansion',               status: 'not_started', description: 'Mobile app, multi-country, monetization, microservices',         sections: ['Mobile App','Multi-Country','Monetization','Partner APIs','Microservices','Community Groups'] },
];

const VERSION_STATUS_META: Record<VersionStatus, { label: string; color: string; dot: string }> = {
  not_started: { label: 'Not Started', color: 'text-muted-foreground border-border/50 bg-transparent', dot: 'bg-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'text-amber-500 border-amber-500/30 bg-amber-500/10',   dot: 'bg-amber-500 animate-pulse' },
  completed:   { label: 'Completed',   color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10', dot: 'bg-emerald-500' },
  paused:      { label: 'Paused',      color: 'text-slate-400 border-slate-400/30 bg-slate-400/10',   dot: 'bg-slate-400' },
};

// ── Changelog data ────────────────────────────────────────────────────────────
const CHANGELOG = [
  { date: 'Aug 2026', tag: 'v0.9', label: 'Production Ready', color: 'emerald', items: ['252 backend tests passing','TypeScript 0 errors','Stripe + Chapa fully integrated','Real-time chat via Socket.IO','28 DB migrations applied','CI/CD pipeline active'] },
  { date: 'Jul 2026', tag: 'v0.8', label: 'Feature Complete', color: 'blue',    items: ['Showroom builder with 25+ section types','External API integration for showrooms','Wallet system with ETB balance','Push notifications via Web Push API','AI product description generator','Admin panel with moderation'] },
  { date: 'Jun 2026', tag: 'v0.7', label: 'Commerce Layer',   color: 'violet',  items: ['Shopping cart + Stripe checkout','Order management + delivery tracking','Product variants (size/color)','Return requests + refund flow','Coupon system with percentage/fixed discounts','Price alerts on wishlisted items'] },
  { date: 'May 2026', tag: 'v0.6', label: 'Social & Comms',  color: 'amber',   items: ['Real-time DMs + group conversations','Story (24h hexagonal) with viewer','Hashtags + trending content','Friends/follow system','Polls in posts','Notification system with WebSocket'] },
  { date: 'Apr 2026', tag: 'v0.5', label: 'Auth & Profiles', color: 'rose',    items: ['Email + OTP registration','Google OAuth integration','JWT + HttpOnly refresh token','Business + personal profile types','Verification badges (blue/gold/purple)','Feature flag system'] },
];

// ── Project summary data ───────────────────────────────────────────────────────
const COMPLETED_DATA = [
  { category: 'Authentication', feature: 'Email + OTP Registration',      description: 'User registers with email, receives OTP, verifies to activate account' },
  { category: 'Authentication', feature: 'Google Sign-In (OAuth)',        description: 'One-tap Google login/register via Google Identity Services' },
  { category: 'Authentication', feature: 'JWT Auth + Refresh',            description: 'Access tokens stored in memory, auto-refresh via HttpOnly cookie' },
  { category: 'Profile',        feature: 'Personal + Business Profile',   description: 'Full name, avatar, cover, bio, headline, location, theme color, sections' },
  { category: 'Profile',        feature: 'Verification Badges',           description: 'Blue verified, gold business, purple creator, official badges' },
  { category: 'Feed',           feature: 'Post Creation (5 types)',       description: 'Text, image, poll, event, product-promo post types' },
  { category: 'Feed',           feature: 'Like / Comment / Reply',        description: 'Nested comments, real-time like counts' },
  { category: 'Feed',           feature: 'Stories (Hexagonal 24hr)',      description: '24-hour hex stories with media upload and viewer' },
  { category: 'Feed',           feature: 'Post Bookmarking',              description: 'Bookmark any post — Zustand slice with optimistic UI' },
  { category: 'Marketplace',    feature: 'Product Listings',              description: 'Create, edit, delete products with images, price, category, condition' },
  { category: 'Marketplace',    feature: 'Shopping Cart',                 description: 'Add/remove items, quantity, Stripe + Chapa checkout flow' },
  { category: 'Marketplace',    feature: 'Price Alerts',                  description: 'Set target price on wishlisted items, notified on drop' },
  { category: 'Marketplace',    feature: 'Product Variants',              description: 'Size/color variants with individual stock and price override' },
  { category: 'Payments',       feature: 'Stripe Integration',           description: 'Card + wallet checkout, webhook, refund flow' },
  { category: 'Payments',       feature: 'Chapa Integration (ETB)',      description: 'Telebirr/CBE Birr payments, sandbox + live mode' },
  { category: 'Payments',       feature: 'Wallet System',                description: 'ETB wallet — top-up, withdrawal, transaction history' },
  { category: 'Showrooms',      feature: 'Showroom Builder',             description: 'No-code mini-website builder: 25+ section types, themes, templates' },
  { category: 'Showrooms',      feature: 'External API Sources',         description: 'Connect live REST APIs to showroom sections with field mapping' },
  { category: 'Showrooms',      feature: 'Showroom Publish + QR Code',  description: 'Publish showroom, generate QR code, slug-based public URL' },
  { category: 'Tasks',          feature: 'Task Board + Bidding',         description: 'Post tasks, receive bids, accept, track completion' },
  { category: 'Tasks',          feature: 'Task Calendar View',           description: 'Calendar view of tasks by deadline' },
  { category: 'Messaging',      feature: 'Real-time Chat (Socket.IO)',   description: 'DMs, groups, channels — typing indicators, presence, edit/delete' },
  { category: 'Messaging',      feature: 'Message Translations',         description: 'Auto-translate messages to user language' },
  { category: 'Notifications',  feature: 'Push + In-app Notifications',  description: 'Web Push API, bell icon with unread count, real-time feed' },
  { category: 'Social',         feature: 'Friends / Follow System',      description: 'Send/accept friend requests, follow users, mutual connections' },
  { category: 'Social',         feature: 'Hashtag Pages',                description: 'Click hashtags → all posts with that tag' },
  { category: 'Events',         feature: 'Event Creation + Listings',    description: 'Title, description, location, start/end, ticket price' },
  { category: 'Jobs',           feature: 'Job Board + Applications',     description: 'Post jobs, apply flow, status tracking' },
  { category: 'Courses',        feature: 'Course Listings + Enrollment', description: 'List, browse, enroll, track progress' },
  { category: 'Admin',          feature: 'Admin Dashboard',              description: 'User management, content moderation, analytics overview' },
  { category: 'Admin',          feature: 'Developer Ops Board',          description: 'Kanban board for bugs, features, tasks with severity + strategy' },
  { category: 'AI',             feature: 'AI Assistant (3 providers)',   description: 'OpenAI / Gemini / Anthropic — switchable via env var' },
  { category: 'AI',             feature: 'AI Description Generator',    description: 'Auto-generate product/job/showroom descriptions' },
  { category: 'Maps',           feature: 'Nearby Map (Leaflet)',         description: 'Pin clustering, profile peek, product/task map view' },
  { category: 'DevOps', feature: 'CI/CD (GitHub Actions)', description: 'Lint, typecheck, test, deploy to Vercel + Render on push to main' },
  { category: 'DevOps',         feature: 'Feature Flag System',         description: 'Env vars + Redis real-time updates + % rollout per user' },
  { category: 'UI/UX',          feature: 'Dark / Light Mode',           description: 'Full theme support with system preference detection' },
  { category: 'UI/UX',          feature: 'i18n (English + Amharic)',    description: 'react-i18next — language detection + user preference' },
  { category: 'UI/UX',          feature: 'Responsive Layout',           description: 'Desktop sidebar + mobile bottom nav + mobile drawer' },
];

const INPROGRESS_DATA = [
  { category: 'Foundation',    feature: 'Loading States (Skeletons)',        description: 'Every data-fetching page needs skeleton loaders — v1.0' },
  { category: 'Foundation',    feature: 'Empty States',                      description: 'Every list page needs illustrated empty state + CTA — v1.0' },
  { category: 'Foundation',    feature: 'Error States',                      description: 'Every API call needs inline error + retry — v1.0' },
  { category: 'Foundation',    feature: 'Mobile Polish (375px)',             description: 'All pages tested at 375px, tap targets ≥44px — v1.0' },
  { category: 'Feed',          feature: 'Cursor-based Pagination',          description: 'Replace offset with cursor pagination for stable infinite scroll — v1.2' },
  { category: 'Marketplace',   feature: 'Product Detail Polish',            description: 'Image gallery, variant selector, related products — v1.3' },
  { category: 'Showrooms',     feature: 'Public Page SSR + SEO',            description: 'Convert to Next.js ISR, add generateMetadata, OG image — v1.4' },
  { category: 'Analytics',     feature: 'Seller Analytics Dashboard',       description: 'Revenue charts, top products, order metrics — v2.2' },
];

const ROADMAP_DATA = [
  { category: 'Auth',          feature: 'Phone Number OTP (Global)',          description: 'Register/login with phone via SMS — supports all country codes',     priority: 'High'   },
  { category: 'Auth',          feature: 'Biometric Login (WebAuthn)',        description: 'Face ID / Touch ID on supported devices',                     priority: 'Medium' },
  { category: 'Payments',      feature: 'Telebirr Direct Integration',      description: "Direct API with Ethiopia's dominant mobile money platform",    priority: 'High'   },
  { category: 'Payments',      feature: 'M-Pesa (East Africa)',             description: 'Integration for Kenya, Tanzania, Uganda users',                priority: 'Medium' },
  { category: 'Feed',          feature: 'Short-form Video Posts',           description: 'Upload and play videos in feed (Reels/TikTok style)',           priority: 'High'   },
  { category: 'Feed',          feature: 'Live Streaming',                   description: 'Real-time video broadcasting with tipping',                    priority: 'Medium' },
  { category: 'Marketplace',   feature: 'Escrow Payments',                  description: 'Hold payment until buyer confirms delivery',                   priority: 'High'   },
  { category: 'Social',        feature: 'Community Groups',                 description: 'Create/join public or private groups with feeds',              priority: 'High'   },
  { category: 'Tasks',         feature: 'Payment Escrow on Tasks',          description: 'Release payment only after task marked complete',              priority: 'High'   },
  { category: 'Showrooms',     feature: 'Custom Domain Mapping',            description: 'Map mybrand.com to showroom',                                  priority: 'Medium' },
  { category: 'Messaging',     feature: 'Voice Messages',                   description: 'Record and send voice notes in chats',                        priority: 'Medium' },
  { category: 'Mobile',        feature: 'React Native App (Expo)',          description: 'iOS + Android app sharing business logic with web',            priority: 'High'   },
  { category: 'AI',            feature: 'Personalized Feed Ranking',        description: 'Relevance-scored feed (feature-flagged, % rollout)',           priority: 'High'   },
  { category: 'AI',            feature: 'Smart Semantic Search',            description: 'Typo tolerance + semantic matching across all entities',      priority: 'High'   },
  { category: 'Performance',   feature: 'Core Web Vitals Green',            description: 'LCP <2.5s, INP <200ms, CLS <0.1 on all key pages',           priority: 'High'   },
  { category: 'PWA',           feature: 'Installable PWA',                  description: 'Add to home screen, splash screen, offline support',           priority: 'High'   },
  { category: 'i18n',          feature: 'Full Amharic Translation',         description: 'All UI strings in Amharic, reviewed by native speaker',       priority: 'High'   },
  { category: 'Scale',         feature: 'Multi-country (KES, NGN)',         description: 'Kenya + Nigeria expansion with local payment gateways',        priority: 'Medium' },
  { category: 'Monetization',  feature: 'Promoted Posts + Subscriptions',  description: 'Paid boosting, Pro/Business tiers, course revenue share',      priority: 'Medium' },
  { category: 'DevOps',        feature: 'E2E Test Suite (Playwright)',      description: 'Cover all critical user journeys with automated E2E tests',    priority: 'High'   },
];

// ── Small helpers ─────────────────────────────────────────────────────────────
function Label({ text }: { text: string }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{text}</p>;
}

function SeverityChip({ severity }: { severity?: Severity | null }) {
  if (!severity) return null;
  const m = SEVERITY_META[severity];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-mono uppercase tracking-wider text-[9px] px-1.5 py-px ${m.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot} ${severity === 'urgent' ? 'animate-pulse' : ''}`} />
      {m.label}
    </span>
  );
}

function ServiceDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    connected: 'bg-emerald-500', ok: 'bg-emerald-500',
    error: 'bg-red-500', disconnected: 'bg-red-500',
    'not configured': 'bg-gray-400', misconfigured: 'bg-orange-500',
    local: 'bg-yellow-400', console: 'bg-gray-400',
  };
  const color = map[status] ?? 'bg-gray-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

// ── Section 1: System Health Panel ───────────────────────────────────────────
function SystemHealth() {
  const [health, setHealth]     = useState<HealthData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [open, setOpen]         = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/health');
      setHealth(data);
      setLastRefresh(new Date());
    } catch {
      setHealth(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000); // auto-refresh every 30s
    return () => clearInterval(t);
  }, [refresh]);

  const isOk = health?.status === 'ok';

  return (
    <div className="mb-4 bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); } }}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors cursor-pointer"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isOk ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
          <Server className={`w-4 h-4 ${isOk ? 'text-emerald-500' : 'text-red-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">System Health</p>
            {!loading && health && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase ${isOk ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' : 'text-red-500 border-red-500/30 bg-red-500/10'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                {health.status}
              </span>
            )}
            {!loading && health && (
              <span className="text-[10px] text-muted-foreground font-mono">v{health.version}</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            Last checked {formatDistanceToNow(lastRefresh, { addSuffix: true })} · auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); refresh(); }}
          className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {open && (
        <div className="border-t border-border/50 p-4">
          {loading && !health ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !health ? (
            <div className="flex items-center gap-2 text-sm text-red-500 py-2">
              <WifiOff className="w-4 h-4" /> Cannot reach backend — check Render deployment
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Database',  icon: Database, value: health.services.database, hint: 'Neon PostgreSQL' },
                { label: 'Redis',     icon: Zap,      value: health.services.redis,    hint: 'Upstash Redis' },
                { label: 'AI',        icon: Sparkles, value: health.services.ai,       hint: 'Provider' },
                { label: 'Email',     icon: Globe,    value: health.services.email,    hint: 'Resend / SMTP' },
                { label: 'Storage',   icon: Server,   value: health.services.storage,  hint: 'R2 / Supabase' },
              ].map(({ label, icon: Icon, value, hint }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <ServiceDot status={value} />
                      <p className="text-xs font-semibold truncate">{label}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{value}</p>
                    <p className="text-[9px] text-muted-foreground/60">{hint}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section 6: Knowledge Base ─────────────────────────────────────────────────
// Reads docs/strategy, implementation plan, and notes via /api/docs endpoints
// and renders them as an interactive, searchable knowledge hub.

interface StrategyVersionDoc {
  version: string; label: string; theme: string; goal: string;
  sections: { key: string; label: string; progress: { total: number; done: number; pct: number }; hasTasks: boolean; hasAudit: boolean }[];
  progress: { total: number; done: number; pct: number };
  readmePath: string;
}

interface ImplSpec {
  key: string; label: string; files: string[];
  progress: { total: number; done: number; pct: number };
  hasRequirements: boolean; hasDesign: boolean; hasTasks: boolean; hasBugfix: boolean;
  path: string;
}

interface NoteDoc {
  file: string; title: string; sections: string[]; path: string;
}

interface OverallProgress {
  total: number; done: number; remaining: number; pct: number;
  byVersion: Record<string, { total: number; done: number; pct: number }>;
}

// ── Docs Library types (full docs/ folder browser) ───────────────────────────
interface DocFile {
  name: string; path: string; title: string; summary: string;
}

interface DocLibraryFolder {
  folder: string; label: string; icon: string; color: string;
  fileCount: number; files: DocFile[];
}

interface DocSearchResult {
  path: string; title: string; excerpt: string; folder: string;
}

// Maps a folder color name to Tailwind classes (header bg + text)
const FOLDER_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-500',    border: 'border-blue-500/20'    },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-500',  border: 'border-violet-500/20'  },
  sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-500',     border: 'border-sky-500/20'     },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  pink:    { bg: 'bg-pink-500/10',    text: 'text-pink-500',    border: 'border-pink-500/20'    },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-500',   border: 'border-amber-500/20'   },
  green:   { bg: 'bg-green-500/10',   text: 'text-green-500',   border: 'border-green-500/20'   },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-500',     border: 'border-red-500/20'     },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-500',    border: 'border-cyan-500/20'    },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-500/20'   },
  yellow:  { bg: 'bg-yellow-500/10',  text: 'text-yellow-500',  border: 'border-yellow-500/20'  },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-500',  border: 'border-orange-500/20'  },
  teal:    { bg: 'bg-teal-500/10',    text: 'text-teal-500',    border: 'border-teal-500/20'    },
};

function ProgressBar({ pct, color = 'bg-primary' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Docs Library Sub-component ────────────────────────────────────────────────
// Full browseable library of every docs/ folder — finance, compliance,
// trust-safety, support, people, brand, legal, architecture, backend, etc.
// Engineers can read any document without leaving the DevOps panel.
function DocsLibrary({ onOpenFile, externalSearch }: { onOpenFile: (path: string) => void; externalSearch: string }) {
  const [folders,       setFolders]       = useState<DocLibraryFolder[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [searchResults, setSearchResults] = useState<DocSearchResult[] | null>(null);
  const [searching,     setSearching]     = useState(false);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);

  useEffect(() => {
    client.get('/api/docs/library')
      .then(r => setFolders(r.data))
      .catch(() => toast.error('Could not load docs library'))
      .finally(() => setLoading(false));
  }, []);

  // Full-text search with debounce — driven by externalSearch prop
  useEffect(() => {
    if (!externalSearch || externalSearch.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await client.get(`/api/docs/search?q=${encodeURIComponent(externalSearch)}`);
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [externalSearch]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Search results view ──────────────────────────────────────────────────────
  if (externalSearch.length >= 2) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1 pb-1">
          {searching
            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            : <Search className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">
            {searching ? 'Searching all docs…' : searchResults
              ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${externalSearch}"`
              : ''}
          </span>
        </div>
        {searchResults?.length === 0 && !searching && (
          <p className="text-center text-sm text-muted-foreground py-6">No documents match "{externalSearch}"</p>
        )}
        {searchResults?.map(r => (
          <div key={r.path}
            onClick={() => onOpenFile(r.path)}
            className="group flex items-start gap-3 p-3 rounded-xl border border-border/40 cursor-pointer hover:bg-secondary/20 transition-colors">
            <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">{r.title}</p>
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-full border border-border/30">
                  docs/{r.folder}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.excerpt}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Folder grid view ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Folder tiles */}
      {folders.map(f => {
        const isExp = expandedFolder === f.folder;
        const colors = FOLDER_COLOR_MAP[f.color] ?? FOLDER_COLOR_MAP['slate'];
        return (
          <div key={f.folder} className="rounded-xl border border-border/40 overflow-hidden">
            {/* Folder header */}
            <button
              onClick={() => setExpandedFolder(isExp ? null : f.folder)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-left">
              <span className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0 text-base`}>
                {f.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {f.fileCount} document{f.fileCount !== 1 ? 's' : ''} · docs/{f.folder === '_root' ? '' : f.folder}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                  {f.fileCount}
                </span>
                {isExp
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </button>

            {/* File list */}
            {isExp && (
              <div className="border-t border-border/30 bg-secondary/10 divide-y divide-border/20">
                {f.files.map(file => (
                  <button
                    key={file.path}
                    onClick={() => onOpenFile(file.path)}
                    className="w-full flex items-start gap-3 px-5 py-2.5 hover:bg-secondary/30 transition-colors text-left group">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold group-hover:text-primary transition-colors truncate">{file.title}</p>
                      {file.summary && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{file.summary}</p>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Read →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KnowledgeBase() {
  const [tab,         setTab]         = useState<'strategy' | 'impl' | 'notes' | 'library'>('strategy');
  const [open,        setOpen]        = useState(true);
  const [versions,    setVersions]    = useState<StrategyVersionDoc[]>([]);
  const [impls,       setImpls]       = useState<ImplSpec[]>([]);
  const [notes,       setNotes]       = useState<NoteDoc[]>([]);
  const [progress,    setProgress]    = useState<OverallProgress | null>(null);
  const [loading,     setLoading]     = useState(true);
  // Library-tab search lives at KnowledgeBase level so the search bar is always visible
  const [libSearch,   setLibSearch]   = useState('');
  const [search,      setSearch]      = useState('');
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<{ path: string; content: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      client.get('/api/docs/strategy/versions').then(r => r.data).catch(() => []),
      client.get('/api/docs/implementation').then(r => r.data).catch(() => []),
      client.get('/api/docs/notes').then(r => r.data).catch(() => []),
      client.get('/api/docs/progress').then(r => r.data).catch(() => null),
    ]).then(([v, i, n, p]) => {
      setVersions(v); setImpls(i); setNotes(n); setProgress(p);
    }).finally(() => setLoading(false));
  }, []);

  async function openFile(filePath: string) {
    setFileLoading(true);
    setFileContent(null);
    try {
      const { data } = await client.get(`/api/docs/file?path=${encodeURIComponent(filePath)}`);
      setFileContent(data);
    } catch { toast.error('Could not read file'); }
    setFileLoading(false);
  }

  const filteredVersions = versions.filter(v =>
    !search || v.label.toLowerCase().includes(search.toLowerCase()) ||
    v.theme.toLowerCase().includes(search.toLowerCase()) ||
    v.sections.some(s => s.label.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredImpls = impls.filter(i =>
    !search || i.label.toLowerCase().includes(search.toLowerCase())
  );
  const filteredNotes = notes.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.sections.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const PROGRESS_COLOR = (pct: number) =>
    pct === 0 ? 'bg-muted-foreground/30' : pct < 25 ? 'bg-red-500' : pct < 75 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="mb-4 bg-card border border-border/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); } }}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors cursor-pointer">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">Knowledge Base</p>
            <span className="text-[10px] font-mono text-muted-foreground">
              {versions.length} strategy versions · {impls.length} specs · {notes.length} notes
            </span>
            {progress && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-500">
                {progress.done}/{progress.total} tasks · {progress.pct}% complete
              </span>
            )}
          </div>
          {progress && (
            <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden w-full max-w-xs">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all" style={{ width: `${progress.pct}%` }} />
            </div>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {open && (
        <div className="border-t border-border/50">
          {/* Search + tab bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/30">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search docs, specs, notes..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/30 border border-border/40 rounded-full outline-none focus:ring-1 focus:ring-primary" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="w-3 h-3" /></button>}
            </div>
            {(['strategy','impl','notes','library'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  tab === t ? 'bg-foreground text-background' : 'bg-secondary/30 text-muted-foreground hover:text-foreground border border-border/40'
                }`}>
                {t === 'strategy' ? `📋 Strategy (${versions.length})`
                  : t === 'impl'    ? `⚙️ Specs (${impls.length})`
                  : t === 'notes'   ? `📝 Notes (${notes.length})`
                  :                   `🗂️ Docs Library`}
              </button>
            ))}
            {/* Library tab: show inline search bar when active */}
            {tab === 'library' && (
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={libSearch}
                  onChange={e => setLibSearch(e.target.value)}
                  placeholder="Search all docs (finance, compliance, legal…)"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/30 border border-border/40 rounded-full outline-none focus:ring-1 focus:ring-primary"
                />
                {libSearch && (
                  <button onClick={() => setLibSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {loading && tab !== 'library' ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">

              {/* ── Strategy Versions ───────────────────────────────────── */}
              {tab === 'strategy' && filteredVersions.map(v => {
                const isExp = expanded === v.version;
                return (
                  <div key={v.version} className="rounded-xl border border-border/40 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                      onClick={() => setExpanded(isExp ? null : v.version)}>
                      <span className="shrink-0 w-14 text-center font-mono text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-lg py-1">{v.version}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{v.label}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">{v.theme}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <ProgressBar pct={v.progress.pct} color={PROGRESS_COLOR(v.progress.pct)} />
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {v.progress.done}/{v.progress.total} tasks · {v.progress.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={e => { e.stopPropagation(); openFile(v.readmePath); }}
                          className="text-[10px] text-blue-500 hover:underline px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors">
                          README
                        </button>
                        {isExp ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </div>

                    {isExp && (
                      <div className="border-t border-border/30 bg-secondary/10 px-4 pb-4 pt-3">
                        {v.goal && <p className="text-xs text-muted-foreground mb-3 italic">"{v.goal}"</p>}
                        <div className="space-y-1.5">
                          {v.sections.map(sec => (
                            <div key={sec.key} className="flex items-center gap-3 p-2.5 rounded-xl bg-card/50 border border-border/30">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{sec.label}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <ProgressBar pct={sec.progress.pct} color={PROGRESS_COLOR(sec.progress.pct)} />
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{sec.progress.done}/{sec.progress.total}</span>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {sec.hasAudit && (
                                  <button onClick={() => openFile(`docs/strategy/${v.version}/${sec.key}/audit.md`)}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors">audit</button>
                                )}
                                {sec.hasTasks && (
                                  <button onClick={() => openFile(`docs/strategy/${v.version}/${sec.key}/tasks.md`)}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors">tasks</button>
                                )}
                              </div>
                            </div>
                          ))}
                          {v.sections.length === 0 && (
                            <p className="text-[11px] text-muted-foreground italic">No detailed sections yet — only README available.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Implementation Specs ────────────────────────────────── */}
              {tab === 'impl' && filteredImpls.map(spec => {
                const isExp = expanded === spec.key;
                return (
                  <div key={spec.key} className="rounded-xl border border-border/40 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                      onClick={() => setExpanded(isExp ? null : spec.key)}>
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-4 h-4 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{spec.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <ProgressBar pct={spec.progress.pct} color={PROGRESS_COLOR(spec.progress.pct)} />
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{spec.progress.done}/{spec.progress.total} · {spec.progress.pct}%</span>
                        </div>
                      </div>
                      {isExp ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    </div>
                    {isExp && (
                      <div className="border-t border-border/30 bg-secondary/10 px-4 pb-3 pt-2">
                        <div className="flex gap-2 flex-wrap">
                          {spec.hasRequirements && (
                            <button onClick={() => openFile(`${spec.path}/requirements.md`)}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Requirements
                            </button>
                          )}
                          {spec.hasDesign && (
                            <button onClick={() => openFile(`${spec.path}/design.md`)}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20 hover:bg-violet-500/20 transition-colors flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Design
                            </button>
                          )}
                          {spec.hasTasks && (
                            <button onClick={() => openFile(`${spec.path}/tasks.md`)}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Tasks
                            </button>
                          )}
                          {spec.hasBugfix && (
                            <button onClick={() => openFile(`${spec.path}/bugfix.md`)}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1">
                              <Bug className="w-3 h-3" /> Bugfix
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Notes ──────────────────────────────────────────────── */}
              {tab === 'notes' && filteredNotes.map(note => {
                const isExp = expanded === note.file;
                return (
                  <div key={note.file} className="rounded-xl border border-border/40 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                      onClick={() => setExpanded(isExp ? null : note.file)}>
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{note.title}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{note.path}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={e => { e.stopPropagation(); openFile(note.path); }}
                          className="text-[10px] text-blue-500 hover:underline px-2 py-1 rounded-lg hover:bg-blue-500/10">
                          Read
                        </button>
                        {isExp ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </div>
                    {isExp && note.sections.length > 0 && (
                      <div className="border-t border-border/30 bg-secondary/10 px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {note.sections.map(sec => (
                            <span key={sec} className="text-[10px] px-2 py-1 bg-secondary rounded-full text-muted-foreground border border-border/30">{sec}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty state */}
              {((tab === 'strategy' && filteredVersions.length === 0) ||
                (tab === 'impl'     && filteredImpls.length === 0)    ||
                (tab === 'notes'    && filteredNotes.length === 0)) && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {search ? `No results for "${search}"` : 'No items found'}
                </p>
              )}

              {/* ── Docs Library ─────────────────────────────────────────── */}
              {tab === 'library' && (
                <DocsLibrary onOpenFile={openFile} externalSearch={libSearch} />
              )}
            </div>
          )}
        </div>
      )}

      {/* File viewer modal */}
      {(fileContent || fileLoading) && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setFileContent(null)}>
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 shrink-0">
              <FileText className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-mono text-muted-foreground flex-1 truncate">{fileContent?.path ?? '...'}</p>
              <button onClick={() => setFileContent(null)} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Modal body — rendered markdown as pre */}
            <div className="flex-1 overflow-y-auto p-5">
              {fileLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">{fileContent?.content}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live Error Feed ───────────────────────────────────────────────────────────
// Shows every error captured by errorCollector.js in real time.
// Auto-polls every 15 seconds. Admins can resolve errors or convert to tickets.

interface ErrorEvent {
  id: string;
  level: 'critical' | 'error' | 'warn' | 'info';
  source: 'server' | 'route' | 'client' | 'manual';
  message: string;
  name: string | null;
  stack: string | null;
  code: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  user_id: string | null;
  request_id: string | null;
  context: Record<string, unknown>;
  occurrence: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by_name: string | null;
  resolution_note: string | null;
  devops_item_id: string | null;
  devops_item_title: string | null;
  devops_item_status: string | null;
}

interface ErrorStats {
  total: number; unresolved: number; critical: number;
  errors: number; warnings: number; last_hour: number; last_24h: number;
  server: number; route: number; client: number;
}

const ERROR_LEVEL_META = {
  critical: { label: 'Critical', dot: 'bg-red-600',    text: 'text-red-500',    chip: 'bg-red-500/15 text-red-500 border-red-500/30',         pulse: true  },
  error:    { label: 'Error',    dot: 'bg-red-500',    text: 'text-red-400',    chip: 'bg-red-400/10 text-red-400 border-red-400/20',          pulse: false },
  warn:     { label: 'Warning',  dot: 'bg-amber-400',  text: 'text-amber-500',  chip: 'bg-amber-400/10 text-amber-500 border-amber-400/20',    pulse: false },
  info:     { label: 'Info',     dot: 'bg-blue-400',   text: 'text-blue-400',   chip: 'bg-blue-400/10 text-blue-400 border-blue-400/20',       pulse: false },
};

const ERROR_SOURCE_META = {
  server: { label: 'Server crash', icon: '💥', chip: 'bg-red-500/10 text-red-400 border-red-400/20' },
  route:  { label: 'API route',    icon: '⚙️',  chip: 'bg-violet-500/10 text-violet-400 border-violet-400/20' },
  client: { label: 'Frontend',     icon: '🖥️',  chip: 'bg-cyan-500/10 text-cyan-400 border-cyan-400/20' },
  manual: { label: 'Manual',       icon: '🔧',  chip: 'bg-slate-500/10 text-slate-400 border-slate-400/20' },
};

// ── Section 1b: Ops Alerts & Telemetry (admin health-summary) ──────────────
function OpsAlerts() {
  const [ops, setOps]       = useState<any>(null);
  const [tel, setTel]       = useState<any>(null);
  const [open, setOpen]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    try {
      const [a, t] = await Promise.all([
        client.get('/api/devops/health-summary').catch(() => null),
        client.get('/api/devops/telemetry?hours=24&limit=12').catch(() => null),
      ]);
      if (a?.data) setOps(a.data);
      if (t?.data) setTel(t.data);
      setLastRefresh(new Date());
    } catch { /* non-admin or offline */ }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  if (!ops) return null; // non-admin / not configured — render nothing
  const sevColor: Record<string, string> = {
    SEV1: 'bg-red-500/10 text-red-500 border-red-500/30',
    SEV2: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    SEV3: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  };
  const statusColor = ops.status === 'critical' ? 'text-red-500 border-red-500/30 bg-red-500/10'
    : ops.status === 'degraded' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10'
    : 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';

  return (
    <div className="mb-4 bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div
        role="button" tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); } }}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors cursor-pointer"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ops.status === 'healthy' ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
          <Activity className={`w-4 h-4 ${ops.status === 'healthy' ? 'text-emerald-500' : 'text-amber-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Ops Alerts & Telemetry</p>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase ${statusColor}`}>
              {ops.status}
            </span>
            {(ops.alerts || []).length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-secondary/60">{(ops.alerts || []).length} alert(s)</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            errors/hr {ops.inputs?.errorsLastHour ?? 0} · payments 24h {ops.inputs?.paymentAttempts24h ?? 0} · checked {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </p>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/50 p-4 space-y-4">
          {(ops.alerts || []).length > 0 && (
            <div className="space-y-2">
              {ops.alerts.map((a: { key: string; severity: string; message: string }) => (
                <div key={a.key} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${sevColor[a.severity] || 'bg-secondary/40'}`}>
                  <span className="font-mono font-bold shrink-0">{a.severity}</span>
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          )}
          {(ops.alerts || []).length === 0 && (
            <p className="text-xs text-emerald-500 flex items-center gap-1.5">✓ No alerts — all thresholds within targets</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl bg-secondary/30 border border-border/30 p-2.5">
              <p className="text-[9px] uppercase text-muted-foreground">Errors / hr</p>
              <p className="text-sm font-bold font-mono">{ops.inputs?.errorsLastHour ?? 0}</p>
            </div>
            <div className="rounded-xl bg-secondary/30 border border-border/30 p-2.5">
              <p className="text-[9px] uppercase text-muted-foreground">Payments 24h</p>
              <p className="text-sm font-bold font-mono">{ops.inputs?.paymentAttempts24h ?? 0}</p>
            </div>
            <div className="rounded-xl bg-secondary/30 border border-border/30 p-2.5">
              <p className="text-[9px] uppercase text-muted-foreground">Last backup</p>
              <p className="text-[11px] font-mono truncate">{ops.inputs?.lastBackupAt ? new Date(ops.inputs.lastBackupAt).toLocaleString() : '—'}</p>
            </div>
            <div className="rounded-xl bg-secondary/30 border border-border/30 p-2.5">
              <p className="text-[9px] uppercase text-muted-foreground">Redis</p>
              <p className="text-sm font-bold font-mono">{ops.inputs?.redisConfigured ? 'up' : 'down'}</p>
            </div>
          </div>

          {(tel?.counts || []).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Telemetry (24h)</p>
              <div className="flex flex-wrap gap-1.5">
                {tel.counts.slice(0, 10).map((c: { type: string; count: number; errors: number }) => (
                  <span key={c.type} className="text-[10px] font-mono px-2 py-0.5 rounded-lg border border-border/40 bg-secondary/40">
                    {c.type} × {c.count}{Number(c.errors) > 0 ? ` ⚠${c.errors}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Task Log (implementation reports) ───────────────────────────────────────
function TaskLogPanel() {
  const [data, setData]       = useState<{ available: boolean; reports: Array<{file:string;date:string;short:string;title:string}>; index: string | null } | null>(null);
  const [openFile, setOpenFile] = useState<{ file: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await client.get('/api/devops/log-report'); setData(data); }
    catch { setData({ available: false, reports: [], index: null }); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openReport = async (file: string) => {
    try { const { data } = await client.get(`/api/devops/log-report/${file}`); setOpenFile(data); }
    catch { /* non-fatal */ }
  };

  return (
    <div className="mb-4 bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30 bg-secondary/10">
        <FileText className="w-4 h-4 text-violet-500" />
        <p className="text-sm font-semibold">Implementation Log</p>
        <span className="text-[10px] font-mono text-muted-foreground">{data?.reports.length ?? 0} task reports · auto-generated per merge</span>
      </div>
      <div className="p-4 space-y-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {data && !data.available && (
          <p className="text-xs text-muted-foreground">Implementation log not present in this deployment (docs/ folder not bundled). Available in the repository and local runs.</p>
        )}
        {data?.available && data.reports.map((r) => (
          <button key={r.file} onClick={() => openReport(r.file)}
            className="w-full text-left flex items-center gap-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 px-3 py-2 transition-colors">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">{r.date}</span>
            <span className="text-xs flex-1 truncate capitalize">{r.title || r.file}</span>
            <span className="text-[10px] font-mono text-violet-400 shrink-0">{r.short}</span>
          </button>
        ))}
        {openFile && (
          <div className="rounded-xl border border-border/50 bg-background p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono text-muted-foreground">{openFile.file}</p>
              <button onClick={() => setOpenFile(null)} className="text-[10px] text-muted-foreground hover:text-foreground">close</button>
            </div>
            <pre className="text-[10px] font-mono whitespace-pre-wrap max-h-80 overflow-auto">{openFile.content}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveErrors({ isAdmin }: { isAdmin: boolean }) {
  const [open,        setOpen]        = useState(true);
  const [errors,      setErrors]      = useState<ErrorEvent[]>([]);
  const [stats,       setStats]       = useState<ErrorStats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [search,      setSearch]      = useState('');
  const [resolving,   setResolving]   = useState<string | null>(null);
  const [converting,  setConverting]  = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const lastPollRef = React.useRef<string>(new Date().toISOString());

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [levelFilter, showResolved]);

  // Auto-poll every 15 seconds for new errors
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const params = new URLSearchParams({
          resolved: showResolved ? 'true' : 'false',
          since: lastPollRef.current,
          limit: '50',
        });
        if (levelFilter) params.set('level', levelFilter);
        const { data: newErrors } = await client.get(`/api/devops/errors?${params}`);
        if (newErrors.length > 0) {
          setErrors(prev => {
            // Merge new errors: update existing (by id) or prepend new ones
            const existingIds = new Set(prev.map((e: ErrorEvent) => e.id));
            const fresh = newErrors.filter((e: ErrorEvent) => !existingIds.has(e.id));
            const updated = prev.map((e: ErrorEvent) => {
              const match = newErrors.find((n: ErrorEvent) => n.id === e.id);
              return match || e;
            });
            return [...fresh, ...updated];
          });
          // Refresh stats too
          const { data: s } = await client.get('/api/devops/errors/stats');
          setStats(s);
          lastPollRef.current = new Date().toISOString();
        }
      } catch { /* silent poll failure */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [levelFilter, showResolved]);

  async function fetchAll() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        resolved: showResolved ? 'true' : 'false',
        limit: '100',
      });
      if (levelFilter) params.set('level', levelFilter);
      const [{ data: ev }, { data: st }] = await Promise.all([
        client.get(`/api/devops/errors?${params}`),
        client.get('/api/devops/errors/stats'),
      ]);
      setErrors(ev);
      setStats(st);
      lastPollRef.current = new Date().toISOString();
    } catch {
      // Table not created yet — show empty state
      setErrors([]);
    } finally {
      setLoading(false);
    }
  }

  async function resolve(id: string) {
    setResolving(id);
    try {
      await client.patch(`/api/devops/errors/${id}/resolve`);
      setErrors(prev => prev.filter(e => e.id !== id));
      setStats(prev => prev ? { ...prev, unresolved: Math.max(0, prev.unresolved - 1) } : prev);
      toast.success('Error marked as resolved');
    } catch {
      toast.error('Failed to resolve error');
    } finally {
      setResolving(null);
    }
  }

  async function resolveAll() {
    try {
      const { data } = await client.patch('/api/devops/errors/resolve-all', levelFilter ? { level: levelFilter } : {});
      toast.success(`Resolved ${data.resolved} errors`);
      fetchAll();
    } catch {
      toast.error('Failed to bulk resolve');
    }
  }

  async function convertToTicket(id: string) {
    setConverting(id);
    try {
      const { data } = await client.post(`/api/devops/errors/${id}/to-ticket`);
      toast.success(`Bug ticket created: "${data.ticket.title.slice(0, 50)}…"`);
      setErrors(prev => prev.map(e => e.id === id ? { ...e, devops_item_id: data.ticket.id, devops_item_title: data.ticket.title, devops_item_status: data.ticket.status } : e));
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setConverting(null);
    }
  }

  const filtered = errors.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.message.toLowerCase().includes(q) || (e.path || '').toLowerCase().includes(q) || (e.name || '').toLowerCase().includes(q);
  });

  const unresolved = stats?.unresolved ?? 0;
  const hasUrgent  = (stats?.critical ?? 0) > 0;

  return (
    <div className={`mb-4 bg-card border rounded-2xl overflow-hidden ${hasUrgent ? 'border-red-500/40' : 'border-border/50'}`}>
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); } }}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors cursor-pointer">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${hasUrgent ? 'bg-red-500/20' : 'bg-gradient-to-br from-red-600 to-orange-600'}`}>
          {hasUrgent
            ? <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" /></span>
            : <AlertTriangle className="w-4 h-4 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">Live Error Feed</p>
            {unresolved > 0 && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold ${hasUrgent ? 'bg-red-500/15 text-red-500 border-red-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`}>
                {unresolved} unresolved
              </span>
            )}
            {stats && (
              <>
                {(stats.critical > 0) && <span className="text-[10px] font-mono bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded-full">💥 {stats.critical} critical</span>}
                {(stats.last_hour > 0) && <span className="text-[10px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-full">⚡ {stats.last_hour} last hour</span>}
                {unresolved === 0 && <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">✅ All clear</span>}
              </>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Auto-refreshes every 15 seconds · captures server, API, and client errors</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={e => { e.stopPropagation(); fetchAll(); }}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-border/50">
          {/* Stats bar */}
          {stats && (
            <div className="flex flex-wrap gap-2 px-4 py-2.5 bg-secondary/10 border-b border-border/30">
              {[
                { label: 'Total',    val: stats.unresolved, color: 'text-foreground' },
                { label: 'Critical', val: stats.critical,   color: 'text-red-500'    },
                { label: 'Errors',   val: stats.errors,     color: 'text-red-400'    },
                { label: 'Warnings', val: stats.warnings,   color: 'text-amber-500'  },
                { label: '24h',      val: stats.last_24h,   color: 'text-muted-foreground' },
                { label: 'Server',   val: stats.server,     color: 'text-violet-400' },
                { label: 'API',      val: stats.route,      color: 'text-violet-400' },
                { label: 'Frontend', val: stats.client,     color: 'text-cyan-400'   },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-bold ${color}`}>{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/30">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search errors, paths…"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/30 border border-border/40 rounded-full outline-none focus:ring-1 focus:ring-primary" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="w-3 h-3" /></button>}
            </div>

            {/* Level filter */}
            {(['', 'critical', 'error', 'warn', 'info'] as const).map(l => (
              <button key={l} onClick={() => setLevelFilter(l)}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  levelFilter === l ? 'bg-foreground text-background' : 'bg-secondary/30 text-muted-foreground hover:text-foreground border border-border/40'
                }`}>
                {l === '' ? 'All' : l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}

            {/* Toggle resolved */}
            <button onClick={() => setShowResolved(v => !v)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                showResolved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-secondary/30 text-muted-foreground border-border/40 hover:text-foreground'
              }`}>
              {showResolved ? '✅ Resolved' : 'Show resolved'}
            </button>

            {/* Resolve all (admin) */}
            {isAdmin && filtered.filter(e => !e.resolved).length > 0 && (
              <button onClick={resolveAll}
                className="ml-auto px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                Resolve all
              </button>
            )}
          </div>

          {/* Error list */}
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-sm font-medium">No errors found</p>
              <p className="text-xs">{search ? `No match for "${search}"` : showResolved ? 'No resolved errors' : 'All systems running clean'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20 max-h-[700px] overflow-y-auto">
              {filtered.map(evt => {
                const isExp  = expanded === evt.id;
                const lMeta  = ERROR_LEVEL_META[evt.level]  || ERROR_LEVEL_META.error;
                const sMeta  = ERROR_SOURCE_META[evt.source] || ERROR_SOURCE_META.route;

                return (
                  <div key={evt.id} className={`${evt.level === 'critical' ? 'bg-red-500/5' : ''}`}>
                    {/* Row */}
                    <div className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/10 transition-colors"
                      onClick={() => setExpanded(isExp ? null : evt.id)}>

                      {/* Level dot */}
                      <div className="mt-1 shrink-0">
                        {lMeta.pulse
                          ? <span className="relative flex h-2.5 w-2.5">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${lMeta.dot} opacity-60`} />
                              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${lMeta.dot}`} />
                            </span>
                          : <span className={`inline-block w-2.5 h-2.5 rounded-full ${lMeta.dot}`} />}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          {/* Error name */}
                          <span className={`text-[10px] font-mono font-bold ${lMeta.text}`}>
                            {evt.name || 'Error'}
                          </span>
                          {/* Source badge */}
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${sMeta.chip}`}>
                            {sMeta.icon} {sMeta.label}
                          </span>
                          {/* Occurrence badge */}
                          {evt.occurrence > 1 && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/30">
                              ×{evt.occurrence}
                            </span>
                          )}
                          {/* Linked ticket */}
                          {evt.devops_item_id && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-400/20">
                              🎫 Ticket
                            </span>
                          )}
                        </div>

                        {/* Message */}
                        <p className="text-xs font-medium mt-0.5 truncate">{evt.message}</p>

                        {/* Path + time */}
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {evt.path && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {evt.method} {evt.path}
                              {evt.status_code && ` → ${evt.status_code}`}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(evt.last_seen_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {isAdmin && !evt.resolved && !evt.devops_item_id && (
                          <button
                            onClick={() => convertToTicket(evt.id)}
                            disabled={converting === evt.id}
                            className="text-[10px] px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-400/20 hover:bg-violet-500/20 transition-colors flex items-center gap-1"
                            title="Convert to bug ticket">
                            {converting === evt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bug className="w-3 h-3" />}
                            Ticket
                          </button>
                        )}
                        {isAdmin && !evt.resolved && (
                          <button
                            onClick={() => resolve(evt.id)}
                            disabled={resolving === evt.id}
                            className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                            title="Mark resolved">
                            {resolving === evt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Resolve
                          </button>
                        )}
                        {isExp ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExp && (
                      <div className="border-t border-border/20 bg-secondary/10 px-5 py-3 space-y-3">
                        {/* Metadata grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: 'Level',       val: evt.level },
                            { label: 'Source',      val: evt.source },
                            { label: 'Occurrences', val: String(evt.occurrence) },
                            { label: 'Status code', val: evt.status_code ? String(evt.status_code) : '—' },
                            { label: 'First seen',  val: new Date(evt.first_seen_at).toLocaleString() },
                            { label: 'Last seen',   val: new Date(evt.last_seen_at).toLocaleString() },
                            { label: 'Request ID',  val: evt.request_id || '—' },
                            { label: 'Error code',  val: evt.code || '—' },
                          ].map(({ label, val }) => (
                            <div key={label} className="bg-card/60 border border-border/30 rounded-lg p-2">
                              <p className="text-[9px] text-muted-foreground font-mono uppercase">{label}</p>
                              <p className="text-[10px] font-mono text-foreground mt-0.5 truncate">{val}</p>
                            </div>
                          ))}
                        </div>

                        {/* Stack trace */}
                        {evt.stack && (
                          <div>
                            <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">Stack Trace</p>
                            <pre className="text-[10px] font-mono text-foreground/70 bg-black/30 border border-border/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed">
                              {evt.stack}
                            </pre>
                          </div>
                        )}

                        {/* Context */}
                        {evt.context && Object.keys(evt.context).length > 0 && (
                          <div>
                            <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">Context</p>
                            <pre className="text-[10px] font-mono text-foreground/70 bg-black/30 border border-border/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(evt.context, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Linked ticket info */}
                        {evt.devops_item_title && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-500/5 border border-violet-500/20">
                            <Bug className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-muted-foreground">Linked ticket</p>
                              <p className="text-xs font-medium text-violet-400 truncate">{evt.devops_item_title}</p>
                            </div>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-400/20 shrink-0">
                              {evt.devops_item_status}
                            </span>
                          </div>
                        )}

                        {/* Resolved info */}
                        {evt.resolved && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <p className="text-xs text-emerald-500">
                              Resolved {evt.resolved_at ? formatDistanceToNow(new Date(evt.resolved_at), { addSuffix: true }) : ''} by {evt.resolved_by_name || 'admin'}
                              {evt.resolution_note ? ` — ${evt.resolution_note}` : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section 2: Strategy Version Board ────────────────────────────────────────
function StrategyBoard() {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, VersionStatus>>(() =>
    Object.fromEntries(STRATEGY_VERSIONS.map(v => [v.version, v.status as VersionStatus]))
  );
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [savingVersion,   setSavingVersion]   = useState<string | null>(null);

  // Load persisted statuses from backend
  useEffect(() => {
    client.get('/api/devops/versions').then(({ data }) => {
      setStatuses(prev => ({ ...prev, ...data }));
    }).catch(() => {}).finally(() => setLoadingVersions(false));
  }, []);

  async function updateVersionStatus(version: string, status: VersionStatus) {
    // Optimistic update
    setStatuses(prev => ({ ...prev, [version]: status }));
    setSavingVersion(version);
    try {
      await client.put(`/api/devops/versions/${version}`, { status });
    } catch {
      toast.error('Failed to save version status');
    }
    setSavingVersion(null);
  }

  const completed  = Object.values(statuses).filter(s => s === 'completed').length;
  const inProgress = Object.values(statuses).filter(s => s === 'in_progress').length;
  const pct = Math.round((completed / STRATEGY_VERSIONS.length) * 100);

  return (
    <div className="mb-4 bg-card border border-border/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0">
          <Map className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Development Strategy</p>
            <span className="text-[10px] font-mono text-muted-foreground">{completed}/{STRATEGY_VERSIONS.length} versions · {pct}% complete</span>
            {inProgress > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{inProgress} active
              </span>
            )}
          </div>
          {/* Overall progress bar */}
          <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden w-full max-w-xs">
            <div className="h-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border/50 p-4 space-y-2">
          {loadingVersions ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : STRATEGY_VERSIONS.map((v) => {
            const st     = statuses[v.version];
            const smeta  = VERSION_STATUS_META[st];
            const isOpen = expanded === v.version;
            return (
              <div key={v.version} className="rounded-xl border border-border/40 overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : v.version)}
                >
                  {/* Version badge */}
                  <span className="shrink-0 w-12 text-center font-mono text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-lg py-1">
                    {v.version}
                  </span>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{v.label}</p>
                      <span className="text-[10px] text-muted-foreground font-mono">{v.theme}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{v.description}</p>
                  </div>
                  {/* Status badge */}
                  <select
                    value={st}
                    onChange={(e) => { e.stopPropagation(); updateVersionStatus(v.version, e.target.value as VersionStatus); }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={savingVersion === v.version}
                    className={`shrink-0 text-[10px] font-mono font-semibold border rounded-full px-2 py-1 cursor-pointer outline-none bg-transparent ${smeta.color} disabled:opacity-50`}
                  >
                    {(['not_started','in_progress','completed','paused'] as VersionStatus[]).map(s => (
                      <option key={s} value={s} className="bg-background text-foreground">{VERSION_STATUS_META[s].label}</option>
                    ))}
                  </select>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/30 bg-secondary/10">
                    <p className="text-xs text-muted-foreground mb-3">{v.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {v.sections.map(s => (
                        <span key={s} className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                          <BookOpen className="w-2.5 h-2.5" />{s}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] text-muted-foreground font-mono">
                      📁 docs/strategy/{v.version}-{v.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/README.md
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section 3: Changelog ─────────────────────────────────────────────────────
function Changelog() {
  const [open, setOpen] = useState(false);
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    blue:    'bg-blue-500/15 text-blue-500 border-blue-500/30',
    violet:  'bg-violet-500/15 text-violet-500 border-violet-500/30',
    amber:   'bg-amber-500/15 text-amber-500 border-amber-500/30',
    rose:    'bg-rose-500/15 text-rose-500 border-rose-500/30',
  };
  const dotMap: Record<string, string> = {
    emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500',
    amber: 'bg-amber-500', rose: 'bg-rose-500',
  };

  return (
    <div className="mb-4 bg-card border border-border/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shrink-0">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Changelog</p>
          <p className="text-[10px] text-muted-foreground font-mono">{CHANGELOG.length} releases · current v{CHANGELOG[0].tag}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border/50 p-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border/50" />
            <div className="space-y-6">
              {CHANGELOG.map((entry, i) => (
                <div key={entry.tag} className="relative flex gap-4">
                  {/* Dot */}
                  <div className={`relative shrink-0 w-9 h-9 rounded-full border-2 border-background flex items-center justify-center ${dotMap[entry.color]} shadow-sm`}>
                    <span className="text-white text-[9px] font-bold font-mono">{entry.tag}</span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${colorMap[entry.color]}`}>
                        {entry.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">{entry.date}</span>
                    </div>
                    <ul className="space-y-1">
                      {entry.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section 4: Project Summary Table ────────────────────────────────────────
type TabKey = 'completed' | 'inprogress' | 'roadmap';
const SUMMARY_TABS: { key: TabKey; label: string; count: number }[] = [
  { key: 'completed',  label: '✅ Completed',   count: COMPLETED_DATA.length  },
  { key: 'inprogress', label: '🔄 In Progress', count: INPROGRESS_DATA.length },
  { key: 'roadmap',    label: '🗺️ Roadmap',     count: ROADMAP_DATA.length    },
];

function ProjectSummaryTable() {
  const [open, setOpen] = useState(false);
  const [tab,  setTab]  = useState<TabKey>('completed');

  return (
    <div className="mb-4 bg-card border border-border/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shrink-0">
          <ListChecks className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Project Summary</p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {COMPLETED_DATA.length} completed · {INPROGRESS_DATA.length} in progress · {ROADMAP_DATA.length} roadmap items
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border/50">
          {/* Tabs */}
          <div className="flex gap-2 p-3 pb-0">
            {SUMMARY_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  tab === t.key
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label} <span className="opacity-60 font-mono">({t.count})</span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto p-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="pb-2 pr-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-28">Category</th>
                  <th className="pb-2 pr-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Feature</th>
                  <th className="pb-2 pr-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Description</th>
                  {tab === 'roadmap' && (
                    <th className="pb-2 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-16">Priority</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {tab === 'completed' && COMPLETED_DATA.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-secondary/20' : ''}>
                    <td className="py-1.5 pr-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{row.category}</td>
                    <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{row.feature}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground leading-relaxed">{row.description}</td>
                  </tr>
                ))}
                {tab === 'inprogress' && INPROGRESS_DATA.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-secondary/20' : ''}>
                    <td className="py-1.5 pr-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{row.category}</td>
                    <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{row.feature}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground leading-relaxed">{row.description}</td>
                  </tr>
                ))}
                {tab === 'roadmap' && ROADMAP_DATA.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-secondary/20' : ''}>
                    <td className="py-1.5 pr-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{row.category}</td>
                    <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{row.feature}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground leading-relaxed">{row.description}</td>
                    <td className="py-1.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                        row.priority === 'High'
                          ? 'bg-red-500/10 text-red-500 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      }`}>
                        {row.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Kanban Card ──────────────────────────────────────────────────────────────
function OpsCard({ item, isAdmin, busy, onEdit, onDelete, onMove }: {
  item: DevOpsItem; isAdmin: boolean; busy: boolean;
  onEdit: () => void; onDelete: () => void; onMove: (s: Status) => void;
}) {
  const km = KIND_META[item.kind];
  const KIcon = km.icon;
  const allowed = STATUSES_FOR_KIND[item.kind].filter(s => s !== item.status);

  return (
    <div className={`group relative rounded-xl border bg-background/70 p-3 space-y-2 transition-all hover:shadow-md hover:border-border ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Severity bar */}
      {item.severity && (
        <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${SEVERITY_META[item.severity].bar}`} />
      )}
      <div className="pl-1.5">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <span className={`shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${km.tint}`}>
            <KIcon className="w-3 h-3" />{km.label}
          </span>
          <p className="flex-1 text-[13px] font-semibold leading-snug min-w-0">{item.title}</p>
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0 mt-0.5" />}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags.slice(0, 4).map(t => (
              <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-secondary border border-border/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                <Tag className="w-2 h-2" />{t}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
          <SeverityChip severity={item.severity} />
          {item.assigned_to && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <User className="w-2.5 h-2.5" />{item.assigned_to}
            </span>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
          </span>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {allowed.map(s => {
              const sm = STATUS_META[s];
              const SI = sm.icon;
              return (
                <button key={s} onClick={() => onMove(s)}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium hover:bg-secondary transition-colors ${sm.accent}`}
                  title={`Move to ${sm.label}`}
                >
                  <SI className="w-3 h-3" />
                  <span className="hidden sm:inline">{sm.label}</span>
                </button>
              );
            })}
            <button onClick={onDelete} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-500/10 transition-colors ml-auto">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main DevOps Component ─────────────────────────────────────────────────────
function DevOps() {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';
  const [booted,  setBooted]  = useState(false);
  const [items,   setItems]   = useState<DevOpsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search,         setSearch]         = useState('');
  const [kindFilter,     setKindFilter]     = useState<Kind | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter,   setStatusFilter]   = useState<Status | 'all'>('all');

  // Modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing,    setEditing]    = useState<DevOpsItem | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState<DevOpsItem | null>(null);
  const [busyId,     setBusyId]     = useState<string | null>(null);

  // Active section tab
  const [activeSection, setActiveSection] = useState<'kanban' | 'errors' | 'strategy' | 'health' | 'changelog' | 'copilot' | 'log' | 'summary' | 'kb'>('kanban');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/api/devops');
      setItems(data);
    } catch { toast.error('Failed to load ops board'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    setBooted(true);
    load();
  }, [load]);

  // Derived stats
  const severityCounts = useMemo(() => {
    const active = items.filter(i => !['done', 'implemented'].includes(i.status));
    return SEVERITY_ORDER.reduce((acc, s) => { acc[s] = active.filter(i => i.severity === s).length; return acc; }, {} as Record<Severity, number>);
  }, [items]);

  const statusCounts = useMemo(() =>
    COLUMN_ORDER.reduce((acc, s) => { acc[s] = items.filter(i => i.status === s).length; return acc; }, {} as Record<Status, number>),
  [items]);

  const openBugs  = useMemo(() => items.filter(i => i.kind === 'bug' && !['done','implemented'].includes(i.status)).length, [items]);
  const urgentCnt = useMemo(() => items.filter(i => i.severity === 'urgent' && !['done','implemented'].includes(i.status)).length, [items]);

  // Filtered items
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (kindFilter !== 'all'     && i.kind !== kindFilter)         return false;
      if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
      if (statusFilter !== 'all'   && i.status !== statusFilter)     return false;
      if (!q) return true;
      return i.title.toLowerCase().includes(q) ||
             (i.description ?? '').toLowerCase().includes(q) ||
             (i.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
             (i.assigned_to ?? '').toLowerCase().includes(q);
    });
  }, [items, search, kindFilter, severityFilter, statusFilter]);

  const columns = statusFilter === 'all' ? COLUMN_ORDER : [statusFilter];

  // Mutations
  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setEditorOpen(true); }
  function openEdit(item: DevOpsItem) {
    setEditing(item);
    setForm({ kind: item.kind, title: item.title, description: item.description ?? '', severity: item.severity ?? '', status: item.status, tags: (item.tags ?? []).join(', '), assigned_to: item.assigned_to ?? '' });
    setEditorOpen(true);
  }

  async function saveItem() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const payload = {
      kind: form.kind, title: form.title.trim(),
      description: form.description.trim() || null,
      severity: form.severity || null, status: form.status,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      assigned_to: form.assigned_to.trim() || null,
    };
    try {
      if (editing) { await client.put(`/api/devops/${editing.id}`, payload); toast.success('Item updated'); }
      else         { await client.post('/api/devops', payload); toast.success('Item created'); }
      setEditorOpen(false);
      await load();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save item');
    }
    setSaving(false);
  }

  async function moveStatus(item: DevOpsItem, status: Status) {
    setBusyId(item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i));
    try { await client.put(`/api/devops/${item.id}`, { status }); await load(); }
    catch { toast.error('Failed to move item'); await load(); }
    setBusyId(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try { await client.delete(`/api/devops/${deleting.id}`); toast.success('Deleted'); setDeleting(null); await load(); }
    catch { toast.error('Failed to delete item'); }
    setBusyId(null);
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  if (!booted) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  // Section nav tabs
  const SECTION_TABS = [
    { key: 'kanban'   as const, label: 'Kanban Board',    icon: KanbanSquare },
  { key: 'copilot'  as const, label: 'AI Copilot',      icon: Bot },
  { key: 'log'      as const, label: 'Task Log',       icon: FileText },
    { key: 'errors'   as const, label: 'Live Errors',     icon: AlertTriangle },
    { key: 'strategy' as const, label: 'Strategy',        icon: Map          },
    { key: 'kb'       as const, label: 'Knowledge Base',  icon: BookOpen     },
    { key: 'health'   as const, label: 'System Health',   icon: Server       },
    { key: 'changelog'as const, label: 'Changelog',       icon: GitBranch    },
    { key: 'summary'  as const, label: 'Project Summary', icon: ListChecks   },
  ];

  return (
    <div className="min-h-screen bg-background max-w-[1500px] mx-auto px-3 md:px-6 pb-24">

      {/* ══ Header ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-3 pt-5 pb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Terminal className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight">Developer Ops</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-emerald-500">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-500" />
              </span>
              live
            </span>
            {urgentCnt > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-mono text-red-500">
                🚨 {urgentCnt} urgent
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono tracking-wide">
            nodbusiness · {items.length} tracked items · {openBugs} open bugs · v{CHANGELOG[0].tag}
          </p>
        </div>
        <div className="flex-1" />
        {!isAdmin && <Badge variant="outline" className="gap-1.5 text-muted-foreground border-border/60"><Eye className="w-3.5 h-3.5" /> Read-only</Badge>}
        {isAdmin && (
          <Button onClick={openCreate} className="rounded-full h-9 px-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-600/20 font-semibold text-sm">
            <Plus className="w-4 h-4 mr-1.5" /> New Item
          </Button>
        )}
      </div>

      {/* ══ Admin quick-links bar ══════════════════════════════════════════ */}
      {isAdmin && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs font-semibold text-amber-600">Admin Panel</p>
          <div className="flex gap-2 ml-2 overflow-x-auto scrollbar-hide">
            {[
              { label: 'Overview',    href: '/admin',           icon: BarChart3    },
              { label: 'Users',       href: '/admin?tab=users', icon: Users        },
              { label: 'Reports',     href: '/admin?tab=reports',icon: AlertTriangle},
              { label: 'Flags',       href: '/admin?tab=flags', icon: Flag         },
              { label: 'Platform',    href: '/admin?tab=platform',icon: Server     },
            ].map(({ label, href, icon: Icon }) => (
              <Link key={label} href={href}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-amber-400/40 transition-all">
                <Icon className="w-3 h-3" />{label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ══ Quick-stats row ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {[
          { label: 'Total Items',   value: items.length,                                 icon: ClipboardList, color: 'text-blue-500',    bg: 'bg-blue-500/10'    },
          { label: 'Open Bugs',     value: openBugs,                                     icon: Bug,           color: 'text-red-500',     bg: 'bg-red-500/10'     },
          { label: 'In Progress',   value: statusCounts['in_progress'] ?? 0,             icon: Activity,      color: 'text-amber-500',   bg: 'bg-amber-500/10'   },
          { label: 'Resolved',      value: (statusCounts['done'] ?? 0) + (statusCounts['implemented'] ?? 0), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-4">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══ Section navigation tabs ══════════════════════════════════════════ */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-4">
        {SECTION_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold border transition-all
              ${activeSection === key
                ? 'bg-foreground text-background border-foreground shadow-sm'
                : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ══ Section: Kanban ══════════════════════════════════════════════════ */}
      {activeSection === 'copilot'  && <OpsCopilot />}
        {activeSection === 'log'     && <TaskLogPanel />}
        {activeSection === 'kanban' && (
        <>
          {/* Severity telemetry rail */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
            {SEVERITY_ORDER.map(s => {
              const m = SEVERITY_META[s];
              const active = severityFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(active ? 'all' : s)}
                  className={`relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all
                    ${active ? 'shadow-md border-current' : 'border-border/50 hover:border-border bg-card'}`}
                  style={active ? { borderColor: 'color-mix(in srgb, currentColor 45%, transparent)' } : undefined}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.bar}`} />
                  <div className="flex items-center justify-between pl-2">
                    <div>
                      <p className={`text-[10px] font-mono uppercase tracking-widest ${m.text}`}>{m.label}</p>
                      <p className="text-2xl font-bold tabular-nums leading-tight">{severityCounts[s]}</p>
                      <p className="text-[10px] text-muted-foreground">active items</p>
                    </div>
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${m.chip} border`}>
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Status strip */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-3">
            <button
              onClick={() => setStatusFilter('all')}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all
                ${statusFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'}`}
            >
              All <span className="font-mono opacity-70">{items.length}</span>
            </button>
            {COLUMN_ORDER.map(s => {
              const m = STATUS_META[s];
              const Icon = m.icon;
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(active ? 'all' : s)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all
                    ${active ? 'bg-foreground text-background border-foreground' : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? '' : m.accent}`} />
                  {m.label} <span className="font-mono opacity-70">{statusCounts[s]}</span>
                </button>
              );
            })}
          </div>

          {/* Search + kind filter */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, tags, assignee…" className="pl-10 rounded-full bg-card" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              {(['all','bug','feature','task'] as const).map(k => {
                const active = kindFilter === k;
                const Icon = k === 'all' ? null : KIND_META[k].icon;
                return (
                  <button
                    key={k}
                    onClick={() => setKindFilter(k)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold border transition-all capitalize
                      ${active ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'}`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {k === 'all' ? 'All kinds' : `${k}s`}
                  </button>
                );
              })}
            </div>
            {(search || kindFilter !== 'all' || severityFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setKindFilter('all'); setSeverityFilter('all'); setStatusFilter('all'); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Kanban columns */}
          {loading ? (
            <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 items-start snap-x snap-mandatory">
              {columns.map(status => {
                const meta = STATUS_META[status];
                const Icon = meta.icon;
                const cards = filtered
                  .filter(i => i.status === status)
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                return (
                  <div key={status} className="w-[290px] shrink-0 rounded-2xl border border-border/50 bg-card overflow-hidden snap-start">
                    <div className={`flex items-center gap-2 px-3.5 py-3 ${meta.headBg} border-b border-border/40`}>
                      <Icon className={`w-4 h-4 ${meta.accent}`} />
                      <span className="text-sm font-semibold">{meta.label}</span>
                      <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground bg-background/60 border border-border/40 rounded-full px-2 py-0.5">{cards.length}</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[120px]">
                      {cards.length === 0 && (
                        <div className="text-center text-[11px] text-muted-foreground/60 font-mono py-8 border border-dashed border-border/40 rounded-xl">empty</div>
                      )}
                      {cards.map(item => (
                        <OpsCard
                          key={item.id} item={item} isAdmin={isAdmin} busy={busyId === item.id}
                          onEdit={() => openEdit(item)} onDelete={() => setDeleting(item)}
                          onMove={s => moveStatus(item, s)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ Other sections ══════════════════════════════════════════════════ */}
      {activeSection === 'errors'    && <LiveErrors isAdmin={isAdmin} />}
      {activeSection === 'strategy'  && <StrategyBoard />}
      {activeSection === 'kb'        && <KnowledgeBase />}
      {activeSection === 'health'    && <><SystemHealth /><OpsAlerts /></>}
      {activeSection === 'changelog' && <Changelog     />}
      {activeSection === 'summary'   && <ProjectSummaryTable />}

      {/* ══ Create / Edit dialog ════════════════════════════════════════════ */}
      <Dialog open={editorOpen} onOpenChange={o => !saving && setEditorOpen(o)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border shadow-2xl" style={{ backgroundColor: 'hsl(var(--card))' }}>
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2">
              {editing ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editing ? 'Edit Item' : 'New Ops Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Kind selector */}
            <div>
              <Label text="Kind" />
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(KIND_META) as Kind[]).map(k => {
                  const m = KIND_META[k]; const Icon = m.icon; const active = form.kind === k;
                  return (
                    <button key={k} onClick={() => {
                      const allowed = STATUSES_FOR_KIND[k];
                      setForm(f => ({ ...f, kind: k, status: allowed.includes(f.status) ? f.status : 'open' }));
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all
                      ${active ? 'border-primary bg-primary/10 text-foreground shadow-sm' : 'border-border/60 text-muted-foreground hover:border-border'}`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.tint}`}><Icon className="w-4 h-4" /></span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div><Label text="Title" /><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Short, actionable summary…" /></div>
            <div><Label text="Description" /><Textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Context, repro steps, links…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="Severity" />
                <select value={form.severity} onChange={e => set('severity', e.target.value as Severity | '')}
                  className="w-full rounded-lg border border-border/60 bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                  <option value="">None</option>
                  {SEVERITY_ORDER.map(s => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}
                </select>
              </div>
              <div>
                <Label text="Status" />
                <select value={form.status} onChange={e => set('status', e.target.value as Status)}
                  className="w-full rounded-lg border border-border/60 bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                  {STATUSES_FOR_KIND[form.kind].map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </div>
            </div>
            <div><Label text="Tags (comma-separated)" /><Input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="auth, mobile, performance…" /></div>
            <div><Label text="Assigned to" /><Input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Username or name…" /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving} className="flex-1">Cancel</Button>
              <Button onClick={saveItem} disabled={saving} className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 text-white">
                {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving…</> : (editing ? 'Save Changes' : 'Create Item')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Delete confirm dialog ════════════════════════════════════════════ */}
      <Dialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm bg-card border border-border shadow-2xl" style={{ backgroundColor: 'hsl(var(--card))' }}>
          <DialogHeader className=""><DialogTitle className="flex items-center gap-2 text-red-500"><Trash2 className="w-4 h-4" /> Delete Item</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">Delete <span className="font-semibold text-foreground">"{deleting?.title}"</span>? This cannot be undone.</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleting(null)} className="flex-1">Cancel</Button>
            <Button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
              {busyId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DevOpsPage() {
  return (
    <ErrorBoundary>
      <DevOps />
    </ErrorBoundary>
  );
}
