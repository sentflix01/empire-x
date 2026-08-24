// @ts-nocheck
'use client';
/**
 * Admin.tsx — Nodbusiness Platform Operations Hub
 *
 * Tabs:
 *  1. Overview      — key platform metrics + revenue chart + quick actions
 *  2. Users         — search, ban, promote, delete users
 *  3. Content       — posts + products moderation
 *  4. Orders        — order list with status overview
 *  5. Reports       — reported content queue
 *  6. Verification  — grant/revoke verified badges
 *  7. Feature Flags — live feature flag toggles (no redeploy)
 *  8. Platform      — live system health + DB pool + queue status
 *
 * Every section pulls from real API endpoints.
 * Feature flags and system health sync with the DevOps page.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import client from '@/api/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Activity, AlertTriangle, BadgeCheck, BarChart3, Bug, CheckCircle2,
  ClipboardList, Clock, Code2, Database, Eye, FileText, Flag, Globe,
  KanbanSquare, Loader2, Map, Package, RefreshCw, Search, Server,
  ShieldAlert, ShoppingBag, Sparkles, Terminal, Trash2, TrendingUp,
  Users, X, XCircle, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import ErrorBoundary from '@/components/ErrorBoundary';

// ── Tab definition ────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',   label: 'Overview',      icon: BarChart3,    color: 'text-amber-500'   },
  { key: 'users',      label: 'Users',         icon: Users,        color: 'text-blue-500'    },
  { key: 'content',    label: 'Content',       icon: FileText,     color: 'text-violet-500'  },
  { key: 'orders',     label: 'Orders',        icon: Package,      color: 'text-emerald-500' },
  { key: 'reports',    label: 'Reports',       icon: AlertTriangle,color: 'text-red-500'     },
  { key: 'verify',     label: 'Verification',  icon: BadgeCheck,   color: 'text-blue-500'    },
  { key: 'flags',      label: 'Feature Flags', icon: Flag,         color: 'text-orange-500'  },
  { key: 'platform',   label: 'Platform',      icon: Server,       color: 'text-teal-500'    },
] as const;
type TabKey = typeof TABS[number]['key'];

// ── Verification badge types ───────────────────────────────────────────────────
const VERIFY_TYPES = [
  { value: 'personal', label: 'Personal', color: '#3B82F6', desc: 'Public figure / notable person' },
  { value: 'business', label: 'Business', color: '#F97316', desc: 'Verified business or brand'    },
  { value: 'creator',  label: 'Creator',  color: '#8B5CF6', desc: 'Content creator / influencer'  },
  { value: 'official', label: 'Official', color: '#D4AF37', desc: 'Nodbusiness official account'     },
];

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    connected: 'bg-emerald-500', ok: 'bg-emerald-500',
    error: 'bg-red-500',         disconnected: 'bg-red-500',
    'not configured': 'bg-gray-400', misconfigured: 'bg-orange-500',
    local: 'bg-yellow-400',       console: 'bg-gray-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] ?? 'bg-gray-400'}`} />;
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, icon: Icon, color, bg, trend }: {
  label: string; value: number | string; icon: React.ComponentType<any>;
  color: string; bg: string; trend?: { value: number; up: boolean };
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {trend !== undefined && (
        <p className={`text-[10px] font-mono mt-1 ${trend.up ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend.up ? '↑' : '↓'} {Math.abs(trend.value)}% vs last month
        </p>
      )}
    </div>
  );
}

// ── Quick links to DevOps ─────────────────────────────────────────────────────
function DevOpsQuickLinks() {
  return (
    <div className="bg-gradient-to-br from-blue-600/10 to-violet-600/10 border border-blue-500/20 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <KanbanSquare className="w-4 h-4 text-blue-500" />
        <p className="text-sm font-semibold">Developer Operations</p>
        <Link href="/admin/devops" className="ml-auto text-xs text-blue-500 hover:underline flex items-center gap-1">
          Open DevOps Board <Code2 className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Kanban Board',    href: '/admin/devops',           icon: KanbanSquare, desc: 'Bugs & features'  },
          { label: 'Strategy',        href: '/admin/devops',           icon: Map,          desc: 'Version roadmap'  },
          { label: 'System Health',   href: '/admin/devops',           icon: Server,       desc: 'Live services'    },
          { label: 'Changelog',       href: '/admin/devops',           icon: Activity,     desc: 'Release history'  },
        ].map(({ label, href, icon: Icon, desc }) => (
          <Link key={label} href={href}
            className="flex flex-col gap-1 p-3 rounded-xl bg-card/60 border border-border/40 hover:border-blue-400/40 hover:bg-secondary/30 transition-all group">
            <Icon className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-semibold">{label}</p>
            <p className="text-[10px] text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Platform Health Panel (synced with DevOps) ───────────────────────────────
function PlatformPanel() {
  const [health, setHealth]   = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [devops,  setDevops]  = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [h, d] = await Promise.all([
        client.get('/health').then(r => r.data),
        client.get('/api/devops/stats').then(r => r.data).catch(() => null),
      ]);
      setHealth(h);
      setDevops(d);
      try {
        const m = await client.get('/metrics').then(r => r.data);
        setMetrics(m);
      } catch { /* metrics needs admin */ }
    } catch { setHealth(null); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Platform Health</h2>
        <button onClick={refresh} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !health ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-sm text-red-500 flex items-center gap-2">
          <XCircle className="w-4 h-4" /> Cannot reach backend. Check Railway deployment.
        </div>
      ) : (
        <>
          {/* Service status grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Database', icon: Database, value: health.services?.database ?? 'unknown', hint: 'Neon PostgreSQL' },
              { label: 'Redis',    icon: Zap,      value: health.services?.redis    ?? 'unknown', hint: 'Upstash Redis'  },
              { label: 'AI',       icon: Sparkles, value: health.services?.ai       ?? 'unknown', hint: 'Provider'       },
              { label: 'Email',    icon: Globe,    value: health.services?.email    ?? 'unknown', hint: 'Resend / SMTP'  },
              { label: 'Storage',  icon: Server,   value: health.services?.storage  ?? 'unknown', hint: 'R2 / Supabase'  },
            ].map(({ label, icon: Icon, value, hint }) => (
              <div key={label} className="bg-card border border-border/50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={value} />
                    <p className="text-xs font-semibold">{label}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{value}</p>
                  <p className="text-[9px] text-muted-foreground/60">{hint}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Overall status */}
          <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
            health.status === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}>
            {health.status === 'ok'
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            }
            <div>
              <p className={`text-sm font-semibold ${health.status === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                Platform {health.status === 'ok' ? 'Operational' : 'Degraded'}
              </p>
              <p className="text-xs text-muted-foreground">
                v{health.version} · Last checked {formatDistanceToNow(new Date(), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* DB pool metrics */}
          {metrics?.db && (
            <div className="bg-card border border-border/50 rounded-2xl p-4">
              <p className="text-xs font-semibold mb-3 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-blue-500" /> Database Connection Pool
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total',   value: metrics.db.totalCount   ?? 0 },
                  { label: 'Idle',    value: metrics.db.idleCount    ?? 0 },
                  { label: 'Waiting', value: metrics.db.waitingCount ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-3 bg-secondary/30 rounded-xl">
                    <p className="text-2xl font-bold tabular-nums">{value}</p>
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DevOps board stats */}
          {devops && (
            <div className="bg-card border border-border/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold flex items-center gap-2">
                  <KanbanSquare className="w-3.5 h-3.5 text-violet-500" /> DevOps Board
                </p>
                <Link href="/admin/devops" className="text-xs text-blue-500 hover:underline">Open board →</Link>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: 'Open',        value: devops.open        ?? 0, color: 'text-sky-500'     },
                  { label: 'In Progress', value: devops.in_progress ?? 0, color: 'text-amber-500'   },
                  { label: 'Blocked',     value: devops.blocked     ?? 0, color: 'text-red-500'     },
                  { label: 'Planned',     value: devops.planned     ?? 0, color: 'text-violet-500'  },
                  { label: 'Done',        value: devops.done        ?? 0, color: 'text-emerald-500' },
                  { label: 'Open Bugs',   value: devops.open_bugs   ?? 0, color: 'text-red-500'     },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-2 bg-secondary/20 rounded-xl">
                    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              {devops.urgent > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{devops.urgent} urgent item{devops.urgent > 1 ? 's' : ''} need immediate attention</span>
                  <Link href="/admin/devops" className="ml-auto font-semibold hover:underline">View →</Link>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Feature Flags Panel ──────────────────────────────────────────────────────
function FeatureFlagsPanel() {
  const [flags,   setFlags]   = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);

  useEffect(() => {
    client.get('/api/flags').then(r => setFlags(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function toggle(name: string, current: boolean) {
    setSaving(name);
    try {
      await client.put(`/api/flags/${name}`, { enabled: !current });
      setFlags(prev => ({ ...prev, [name]: { ...prev[name], effective: !current } }));
      toast.success(`${name} ${!current ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update flag'); }
    setSaving(null);
  }

  const GROUPS: Record<string, string[]> = {
    'Payments':     ['chapa_payments', 'stripe_payments'],
    'AI':           ['ai_description_gen', 'ai_chat'],
    'Features':     ['delivery_tracking', 'return_requests', 'invoice_generator', 'low_stock_alerts'],
    'Maps':         ['map_clustering', 'nearby_product_search', 'profile_peek'],
    'Experimental': ['personalized_feed', 'video_posts', 'promoted_posts', 'community_groups', 'swipe_feed', 'virtual_gifts', 'live_streaming', 'two_factor_auth', 'business_hours'],
  };

  const FLAG_COLORS: Record<string, string> = {
    chapa_payments: 'text-emerald-500', stripe_payments: 'text-blue-500',
    ai_description_gen: 'text-violet-500', ai_chat: 'text-violet-500',
    personalized_feed: 'text-amber-500', video_posts: 'text-orange-500',
    live_streaming: 'text-red-500', two_factor_auth: 'text-cyan-500',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Feature Flags</h2>
          <p className="text-xs text-muted-foreground">Toggle features live — no redeployment needed.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        Object.entries(GROUPS).map(([group, names]) => (
          <div key={group} className="bg-card border border-border/50 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/30 bg-secondary/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group}</p>
            </div>
            {names.map(name => {
              const flag = flags[name];
              if (!flag) return null;
              const enabled = flag.effective ?? false;
              const isSaving = saving === name;
              return (
                <div key={name} className="flex items-center justify-between px-4 py-3 border-b border-border/20 last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium font-mono ${FLAG_COLORS[name] ?? 'text-foreground'}`}>{name}</p>
                      {flag.env_override !== null && (
                        <span className="text-[9px] font-mono bg-amber-500/15 text-amber-600 border border-amber-500/30 px-1.5 py-0.5 rounded-full">ENV OVERRIDE</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{flag.description}</p>
                    {flag.rollout < 100 && flag.rollout > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{flag.rollout}% rollout</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggle(name, enabled)}
                    disabled={isSaving || flag.env_override !== null}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${
                      enabled ? 'bg-emerald-500' : 'bg-secondary border border-border'
                    } ${flag.env_override !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isSaving
                      ? <Loader2 className="w-3 h-3 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                      : <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

// ── Main Admin Component ──────────────────────────────────────────────────────
function Admin() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab,          setTab]          = useState<TabKey>('overview');
  const [stats,        setStats]        = useState<any>({});
  const [users,        setUsers]        = useState<any[]>([]);
  const [verifications,setVerifications] = useState<any[]>([]);
  const [posts,        setPosts]        = useState<any[]>([]);
  const [products,     setProducts]     = useState<any[]>([]);
  const [orders,       setOrders]       = useState<any[]>([]);
  const [reports,      setReports]      = useState<any[]>([]);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [orderStats,   setOrderStats]   = useState<any[]>([]);
  const [topSellers,   setTopSellers]   = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  // Search / filter
  const [userSearch,  setUserSearch]  = useState('');
  const [vSearch,     setVSearch]     = useState('');
  const [vFilter,     setVFilter]     = useState('all');
  const [orderFilter, setOrderFilter] = useState('all');

  // Modal / confirm states
  const [verifyModal,   setVerifyModal]   = useState<any>(null);
  const [verifyType,    setVerifyType]    = useState('personal');
  const [verifyNote,    setVerifyNote]    = useState('');
  const [saving,        setSaving]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [banTarget,     setBanTarget]     = useState<string | null>(null);
  const [banReason,     setBanReason]     = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, v, po, pr, o, r, rc] = await Promise.all([
        client.get('/api/admin/stats').then(r => r.data).catch(() => ({})),
        client.get('/api/admin/users').then(r => r.data).catch(() => []),
        client.get('/api/admin/verifications').then(r => r.data).catch(() => []),
        client.get('/api/admin/posts').then(r => r.data).catch(() => []),
        client.get('/api/admin/products').then(r => r.data).catch(() => []),
        client.get('/api/admin/orders').then(r => r.data).catch(() => []),
        client.get('/api/admin/reports').then(r => r.data).catch(() => []),
        client.get('/api/admin/stats/revenue').then(r => r.data).catch(() => ({ daily: [], order_stats: [], top_sellers: [] })),
      ]);
      setStats(s); setUsers(u); setVerifications(v);
      setPosts(po); setProducts(pr); setOrders(o); setReports(r);
      setRevenueChart(rc.daily || []);
      setOrderStats(rc.order_stats || []);
      setTopSellers(rc.top_sellers || []);
    } catch { toast.error('Failed to load admin data'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') { router.push('/'); return; }
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadVerifications = useCallback(async () => {
    const url = vFilter === 'all' ? '/api/admin/verifications' : `/api/admin/verifications?status=${vFilter}`;
    const v = await client.get(url).then(r => r.data).catch(() => []);
    setVerifications(v);
  }, [vFilter]);

  useEffect(() => { if (tab === 'verify') loadVerifications(); }, [tab, vFilter]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const grantVerification = async () => {
    if (!verifyModal) return;
    setSaving(true);
    try {
      await client.post(`/api/admin/verifications/${verifyModal.id}`, { verification_type: verifyType, verification_note: verifyNote });
      toast.success('Verification granted');
      setVerifyModal(null); setVerifyNote('');
      loadVerifications();
    } catch { toast.error('Failed to grant verification'); }
    setSaving(false);
  };

  const revokeVerification = async (userId: string) => {
    if (confirmRevoke !== userId) { setConfirmRevoke(userId); return; }
    setConfirmRevoke(null);
    try {
      await client.delete(`/api/admin/verifications/${userId}`);
      toast.success('Verification revoked');
      loadVerifications();
    } catch { toast.error('Failed to revoke'); }
  };

  const deleteUser = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    setConfirmDelete(null);
    try {
      await client.delete(`/api/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('User deleted');
    } catch { toast.error('Failed to delete user'); }
  };

  const banUser = async (id: string, isBanned: boolean) => {
    if (isBanned) {
      try {
        await client.post(`/api/admin/users/${id}/unban`);
        setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: false } : u));
        toast.success('User unbanned');
      } catch { toast.error('Failed to unban user'); }
    } else {
      setBanTarget(id); setBanReason('');
    }
  };

  const confirmBan = async () => {
    if (!banTarget) return;
    try {
      await client.post(`/api/admin/users/${banTarget}/ban`, { reason: banReason || null });
      setUsers(prev => prev.map(u => u.id === banTarget ? { ...u, is_banned: true } : u));
      toast.success('User banned');
    } catch { toast.error('Failed to ban user'); }
    setBanTarget(null); setBanReason('');
  };

  const setRole = async (id: string, role: string) => {
    await client.put(`/api/admin/users/${id}/role`, { role });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    toast.success(`Role updated to ${role}`);
  };

  const deletePost    = async (id: string) => { await client.delete(`/api/admin/posts/${id}`);    setPosts(prev    => prev.filter(p => p.id !== id)); };
  const deleteProduct = async (id: string) => { await client.delete(`/api/admin/products/${id}`); setProducts(prev => prev.filter(p => p.id !== id)); };
  const resolveReport = async (id: string, status: string) => { await client.put(`/api/admin/reports/${id}`, { status }); setReports(prev => prev.filter(r => r.id !== id)); };

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredVer = verifications.filter(u =>
    !vSearch || u.email?.toLowerCase().includes(vSearch.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(vSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(vSearch.toLowerCase())
  );
  const filteredOrders = orders.filter(o =>
    orderFilter === 'all' || o.status === orderFilter
  );

  // ── Donut data for order status ────────────────────────────────────────────
  const ORDER_COLORS = { paid: '#10b981', processing: '#f59e0b', completed: '#3b82f6', cancelled: '#ef4444', pending: '#6b7280' };
  const orderDonut = Object.entries(
    orders.reduce((acc: any, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading platform data...</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="max-w-6xl mx-auto pb-24">

        {/* ══ Header ═══════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-3 mb-5 pt-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {users.length} users · {products.length} products · {orders.length} orders · {reports.length} open reports
            </p>
          </div>
          <div className="flex-1" />
          <button onClick={loadAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-full px-3 py-1.5 transition-all hover:bg-secondary/30">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <a href="/admin/devops" className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 border border-blue-500/30 bg-blue-500/10 rounded-full px-3 py-1.5 hover:bg-blue-500/20 transition-all">
            <Terminal className="w-3 h-3" /> DevOps
          </a>
        </div>

        {/* ══ Tab navigation ═══════════════════════════════════════════════ */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-5">
          {TABS.map(({ key, label, icon: Icon, color }) => {
            const badge = key === 'reports' ? reports.length : key === 'flags' ? 0 : 0;
            return (
              <button key={key} onClick={() => setTab(key)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold border transition-all
                  ${tab === key
                    ? 'bg-foreground text-background border-foreground shadow-sm'
                    : 'bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-border'}`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab === key ? '' : color}`} />
                {label}
                {badge > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ══ Overview ═════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <DevOpsQuickLinks />

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard label="Total Users"    value={stats.users          ?? 0} icon={Users}       color="text-blue-600"    bg="bg-blue-50 dark:bg-blue-500/10" />
              <MetricCard label="New Today"      value={stats.new_users_today ?? 0} icon={BadgeCheck}  color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-500/10" />
              <MetricCard label="Posts"          value={stats.posts          ?? 0} icon={FileText}    color="text-amber-600"   bg="bg-amber-50 dark:bg-amber-500/10" />
              <MetricCard label="Products"       value={stats.products       ?? 0} icon={ShoppingBag} color="text-violet-600"  bg="bg-violet-50 dark:bg-violet-500/10" />
              <MetricCard label="Orders (Paid)"  value={stats.orders_paid    ?? 0} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-500/10" />
              <MetricCard label="Orders Pending" value={stats.orders_pending ?? 0} icon={Clock}       color="text-orange-600"  bg="bg-orange-50 dark:bg-orange-500/10" />
              <MetricCard label="Open Reports"   value={reports.length}            icon={AlertTriangle} color="text-red-600"   bg="bg-red-50 dark:bg-red-500/10" />
              <MetricCard label="Banned Users"   value={stats.banned_users   ?? 0} icon={ShieldAlert} color="text-red-600"    bg="bg-red-50 dark:bg-red-500/10" />
            </div>

            {/* Revenue cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
                <p className="text-xs text-white/70 font-medium mb-1">Total Revenue</p>
                <p className="text-3xl font-bold tabular-nums">{(stats.revenue_total ?? 0).toLocaleString()}</p>
                <p className="text-xs text-white/70 mt-1">All paid orders</p>
              </div>
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-white">
                <p className="text-xs text-white/70 font-medium mb-1">Revenue — 30 Days</p>
                <p className="text-3xl font-bold tabular-nums">{(stats.revenue_last_30d ?? 0).toLocaleString()}</p>
                <p className="text-xs text-white/70 mt-1">Last month</p>
              </div>
            </div>

            {/* Revenue chart */}
            {revenueChart.length > 0 && (
              <div className="bg-card border border-border/50 rounded-2xl p-5">
                <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" /> Revenue — Last 30 Days
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revenueChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} width={48} tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
                    <Tooltip formatter={(v: any, n: string) => [Number(v).toLocaleString(), n === 'revenue' ? 'Revenue' : 'Orders']} />
                    <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Orders donut + top sellers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orderDonut.length > 0 && (
                <div className="bg-card border border-border/50 rounded-2xl p-5">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-500" /> Orders by Status
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={orderDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {orderDonut.map((entry: any) => (
                          <Cell key={entry.name} fill={(ORDER_COLORS as any)[entry.name] ?? '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {topSellers.length > 0 && (
                <div className="bg-card border border-border/50 rounded-2xl p-5">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-violet-500" /> Top Sellers — 30 Days
                  </p>
                  <div className="space-y-2.5">
                    {topSellers.slice(0, 5).map((s: any, i: number) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{s.full_name || s.email}</p>
                          <p className="text-[10px] text-muted-foreground">{s.order_count} orders</p>
                        </div>
                        <p className="text-xs font-bold text-amber-600">{Number(s.revenue).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ Users ════════════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by email or name..." className="pl-10 rounded-full" />
            </div>
            <p className="text-xs text-muted-foreground">{filteredUsers.length} users</p>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              {filteredUsers.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">No users found</p>
              )}
              {filteredUsers.map((u: any) => (
                <div key={u.id} className={`flex items-center justify-between p-4 border-b border-border/20 last:border-0 ${u.is_banned ? 'opacity-60 bg-red-500/5' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{u.full_name || 'No name'}</p>
                      {u.is_banned && <span className="text-[10px] bg-red-500/15 text-red-500 border border-red-500/30 px-1.5 py-0.5 rounded-full font-mono">BANNED</span>}
                      {u.is_verified && <span className="text-[10px] bg-blue-500/15 text-blue-500 border border-blue-500/30 px-1.5 py-0.5 rounded-full">✓</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] font-mono">{u.role}</Badge>
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2 flex-wrap justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => setRole(u.id, u.role === 'admin' ? 'user' : 'admin')}>
                      {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                    </Button>
                    <Button size="sm" variant="ghost"
                      className={`h-7 text-xs rounded-full px-2 ${u.is_banned ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                      onClick={() => banUser(u.id, u.is_banned)}>
                      {u.is_banned ? 'Unban' : 'Ban'}
                    </Button>
                    <Button size="sm" variant="ghost"
                      className={`h-7 text-xs rounded-full px-2 ${confirmDelete === u.id ? 'bg-red-600 text-white hover:bg-red-700' : 'text-destructive hover:bg-red-50'}`}
                      onClick={() => deleteUser(u.id)} title="Delete user">
                      {confirmDelete === u.id ? 'Confirm?' : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {/* Inline ban reason panel */}
            {banTarget && (
              <div className="bg-card border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-600">Ban user: {users.find(u => u.id === banTarget)?.email}</p>
                <Input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason for ban (optional)..." className="h-9" />
                <div className="flex gap-2">
                  <Button onClick={confirmBan} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full h-9 text-sm">Confirm Ban</Button>
                  <Button onClick={() => { setBanTarget(null); setBanReason(''); }} variant="outline" className="flex-1 rounded-full h-9 text-sm">Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ Content (Posts + Products) ═══════════════════════════════════ */}
        {tab === 'content' && (
          <div className="space-y-4">
            {/* Posts */}
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500" /> Recent Posts ({posts.length})</p>
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                {posts.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No posts</p>}
                {posts.slice(0, 30).map((p: any) => (
                  <div key={p.id} className="flex items-start justify-between p-4 border-b border-border/20 last:border-0 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{p.content}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {p.author_name} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })} · {p.like_count} likes
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => deletePost(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            {/* Products */}
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-violet-500" /> Products ({products.length})</p>
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                {products.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No products</p>}
                {products.slice(0, 30).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-4 border-b border-border/20 last:border-0 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground">{p.price?.toLocaleString()} {p.currency} · <span className={p.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground'}>{p.status}</span></p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => deleteProduct(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ Orders ═══════════════════════════════════════════════════════ */}
        {tab === 'orders' && (
          <div className="space-y-3">
            <div className="flex gap-1.5 flex-wrap">
              {['all','pending','paid','processing','completed','cancelled'].map(f => (
                <button key={f} onClick={() => setOrderFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                    orderFilter === f ? 'bg-foreground text-background' : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
                  }`}>{f} {f === 'all' ? `(${orders.length})` : `(${orders.filter(o => o.status === f).length})`}
                </button>
              ))}
            </div>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              {filteredOrders.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No orders</p>}
              {filteredOrders.map((o: any) => (
                <div key={o.id} className="flex items-center gap-3 p-4 border-b border-border/20 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{o.product_title}</p>
                    <p className="text-[11px] text-muted-foreground">{o.total_price?.toLocaleString()} {o.currency} · {o.buyer_name || o.buyer_email}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}</p>
                  </div>
                  <span className={`text-[10px] font-semibold font-mono px-2 py-1 rounded-full border shrink-0 ${
                    o.status === 'completed' ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' :
                    o.status === 'paid'       ? 'text-blue-600 bg-blue-500/10 border-blue-500/30'       :
                    o.status === 'processing' ? 'text-amber-600 bg-amber-500/10 border-amber-500/30'   :
                    o.status === 'cancelled'  ? 'text-red-600 bg-red-500/10 border-red-500/30'          :
                    'text-muted-foreground bg-secondary border-border/30'
                  }`}>{o.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Reports ══════════════════════════════════════════════════════ */}
        {tab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-medium">All clear!</p>
                <p className="text-xs text-muted-foreground">No pending reports.</p>
              </div>
            ) : reports.map((r: any) => (
              <div key={r.id} className="bg-card border border-border/50 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Report: {r.target_type}</p>
                      <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full">{r.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Reason: <span className="font-medium text-foreground">{r.reason}</span></p>
                    {r.details && <p className="text-xs text-muted-foreground mt-0.5">{r.details}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">Reporter: {r.reporter_email} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => resolveReport(r.id, 'resolved')}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs rounded-full" onClick={() => resolveReport(r.id, 'dismissed')}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ Verification ═════════════════════════════════════════════════ */}
        {tab === 'verify' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={vSearch} onChange={e => setVSearch(e.target.value)} placeholder="Search users..." className="pl-9 rounded-full" />
              </div>
              {['all','verified','unverified'].map(f => (
                <button key={f} onClick={() => setVFilter(f)}
                  className={`px-3 py-2 rounded-full text-xs font-medium capitalize transition-all ${
                    vFilter === f ? 'bg-amber-500 text-white' : 'bg-card border border-border/50 text-muted-foreground'
                  }`}>{f}
                </button>
              ))}
            </div>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              {filteredVer.length === 0 && <p className="text-center py-10 text-sm text-muted-foreground">No users found</p>}
              {filteredVer.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-4 border-b border-border/20 last:border-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
                    {u.avatar_url ? <img loading="lazy" src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.display_name?.[0] ?? u.full_name?.[0] ?? '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{u.display_name || u.full_name}</p>
                      {u.is_verified && <VerifiedBadge type={u.verification_type} size="sm" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.follower_count > 0 && <p className="text-[10px] text-muted-foreground">{u.follower_count.toLocaleString()} followers</p>}
                  </div>
                  <div className="shrink-0">
                    {u.is_verified ? (
                      <Button size="sm" variant="outline"
                        className={`h-7 text-xs rounded-full ${confirmRevoke === u.id ? 'bg-red-600 text-white border-red-600' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                        onClick={() => revokeVerification(u.id)}>
                        <X className="w-3 h-3 mr-1" /> {confirmRevoke === u.id ? 'Confirm?' : 'Revoke'}
                      </Button>
                    ) : (
                      <Button size="sm" className="h-7 text-xs rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => { setVerifyModal(u); setVerifyType('personal'); setVerifyNote(''); }}>
                        <BadgeCheck className="w-3 h-3 mr-1" /> Verify
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Feature Flags ════════════════════════════════════════════════ */}
        {tab === 'flags' && <FeatureFlagsPanel />}

        {/* ══ Platform ═════════════════════════════════════════════════════ */}
        {tab === 'platform' && <PlatformPanel />}
      </div>

      {/* ══ Verify Modal ═════════════════════════════════════════════════ */}
      {verifyModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={() => setVerifyModal(null)}>
          <div className="bg-card rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Grant Verification</h3>
              <button onClick={() => setVerifyModal(null)} className="p-1.5 rounded-full hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {verifyModal.display_name?.[0] ?? verifyModal.full_name?.[0] ?? '?'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold">{verifyModal.display_name || verifyModal.full_name}</p>
                  <VerifiedBadge type={verifyType} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground">{verifyModal.email}</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Badge Type</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {VERIFY_TYPES.map(vt => (
                <button key={vt.value} onClick={() => setVerifyType(vt.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                    verifyType === vt.value ? 'border-2 shadow-sm' : 'border-border/60 hover:border-border'
                  }`}
                  style={verifyType === vt.value ? { borderColor: vt.color, backgroundColor: vt.color + '10' } : {}}>
                  <VerifiedBadge type={vt.value} size="sm" />
                  <div>
                    <p className="text-xs font-semibold">{vt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{vt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Internal Note (optional)</p>
            <Input value={verifyNote} onChange={e => setVerifyNote(e.target.value)} placeholder="e.g. Verified business with 10k+ customers" className="mb-4 h-10" />
            <Button onClick={grantVerification} disabled={saving} className="w-full h-11 rounded-full text-white font-semibold"
              style={{ backgroundColor: VERIFY_TYPES.find(v => v.value === verifyType)?.color ?? '#3b82f6' }}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : `Grant ${VERIFY_TYPES.find(v => v.value === verifyType)?.label} Badge`}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminPage() {
  return (
    <ErrorBoundary>
      <Admin />
    </ErrorBoundary>
  );
}
