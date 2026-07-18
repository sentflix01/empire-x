// @ts-nocheck
'use client'
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { auth } from "@/api/auth";
import client from "@/api/client";

import {
  Users, ShoppingBag, FileText, ClipboardList, ShieldAlert,
  Trash2, CheckCircle, Crown, BarChart3, BadgeCheck, X, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import moment from "moment";
import { useTranslation } from 'react-i18next';

const TABS = ["overview", "users", "verification", "posts", "products", "orders", "reports"];

const VERIFY_TYPES = [
  { value: "personal",  label: "Personal",  color: "#3B82F6", desc: "Public figure / notable person" },
  { value: "business",  label: "Business",  color: "#F97316", desc: "Verified business or brand" },
  { value: "creator",   label: "Creator",   color: "#8B5CF6", desc: "Content creator / influencer" },
  { value: "official",  label: "Official",  color: "#D4AF37", desc: "Empire X official account" },
];

function Admin() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vSearch, setVSearch] = useState("");
  const [vFilter, setVFilter] = useState("all");
  const [verifyModal, setVerifyModal] = useState(null); // user to verify
  const [verifyType, setVerifyType] = useState("personal");
  const [verifyNote, setVerifyNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    auth.me().then(u => {
      if (u.role !== "admin") { router.push("/"); return; }
      loadAll();
    }).catch(() => router.push("/login"));
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, u, v, po, pr, o, r] = await Promise.all([
        client.get("/api/admin/stats").then(r => r.data),
        client.get("/api/admin/users").then(r => r.data),
        client.get("/api/admin/verifications").then(r => r.data),
        client.get("/api/admin/posts").then(r => r.data),
        client.get("/api/admin/products").then(r => r.data),
        client.get("/api/admin/orders").then(r => r.data),
        client.get("/api/admin/reports").then(r => r.data),
      ]);
      setStats(s); setUsers(u); setVerifications(v);
      setPosts(po); setProducts(pr); setOrders(o); setReports(r);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadVerifications = async () => {
    const url = vFilter === "all"
      ? "/api/admin/verifications"
      : `/api/admin/verifications?status=${vFilter}`;
    const v = await client.get(url).then(r => r.data);
    setVerifications(v);
  };

  const grantVerification = async () => {
    if (!verifyModal) return;
    setSaving(true);
    try {
      await client.post(`/api/admin/verifications/${verifyModal.id}`, {
        verification_type: verifyType,
        verification_note: verifyNote,
      });
      setVerifyModal(null);
      setVerifyNote("");
      await loadVerifications();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const revokeVerification = async (userId) => {
    if (!confirm("Revoke verification badge from this user?")) return;
    await client.delete(`/api/admin/verifications/${userId}`);
    await loadVerifications();
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user permanently?")) return;
    await client.delete(`/api/admin/users/${id}`);
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const deletePost = async (id) => {
    await client.delete(`/api/admin/posts/${id}`);
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const deleteProduct = async (id) => {
    await client.delete(`/api/admin/products/${id}`);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const setRole = async (id, role) => {
    await client.put(`/api/admin/users/${id}/role`, { role });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const resolveReport = async (id, status) => {
    await client.put(`/api/admin/reports/${id}`, { status });
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const filteredUsers = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVer = verifications.filter(u =>
    !vSearch || u.email?.toLowerCase().includes(vSearch.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(vSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(vSearch.toLowerCase())
  );

  const verifiedCount = verifications.filter(u => u.is_verified).length;

  return (
    <>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="w-6 h-6 text-amber-500" />
          <h1 className="font-display text-2xl font-bold">Admin Panel</h1>
          <Badge variant="outline" className="text-amber-600 border-amber-300">Admin Only</Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === "verification") loadVerifications(); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-all ${
                tab === t ? "bg-amber-500 text-white" : "bg-card border border-border/50 text-muted-foreground hover:bg-secondary"
              }`}>
              {t === "verification" ? "✓ Verification" : t}
              {t === "reports" && reports.length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5">{reports.length}</span>
              )}
              {t === "verification" && verifiedCount > 0 && (
                <span className="ml-1.5 bg-blue-500 text-white text-[10px] rounded-full px-1.5">{verifiedCount}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Overview ── */}
            {tab === "overview" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: t('admin.totalUsers'),       value: stats.users,        icon: Users,       color: "text-blue-600 bg-blue-50" },
                  { label: "Verified Users",     value: verifiedCount,      icon: BadgeCheck,  color: "text-green-600 bg-green-50" },
                  { label: t('admin.posts'),              value: stats.posts,        icon: FileText,    color: "text-amber-600 bg-amber-50" },
                  { label: t('admin.products'),           value: stats.products,     icon: ShoppingBag, color: "text-purple-600 bg-purple-50" },
                  { label: t('admin.orders'),             value: stats.orders,       icon: BarChart3,   color: "text-orange-600 bg-orange-50" },
                  { label: t('admin.reports'),    value: reports.length,     icon: ShieldAlert, color: "text-red-600 bg-red-50" },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="bg-card rounded-2xl border border-border/50 p-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold">{(s.value ?? 0).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                    </div>
                  );
                })}

                {/* Verification breakdown */}
                <div className="col-span-2 md:col-span-3 bg-card rounded-2xl border border-border/50 p-5">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-blue-500" /> Verified Accounts by Type
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {VERIFY_TYPES.map(vt => {
                      const count = verifications.filter(u => u.is_verified && u.verification_type === vt.value).length;
                      return (
                        <div key={vt.value} className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ borderColor: vt.color + "40", backgroundColor: vt.color + "08" }}>
                          <VerifiedBadge type={vt.value} size="sm" />
                          <span className="text-xs font-medium">{vt.label}</span>
                          <span className="text-xs font-bold" style={{ color: vt.color }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Verification Management ── */}
            {tab === "verification" && (
              <div className="space-y-4">
                {/* Filter + search */}
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={vSearch} onChange={e => setVSearch(e.target.value)} placeholder="Search users..." className="pl-9 rounded-full" />
                  </div>
                  {["all", "verified", "unverified"].map(f => (
                    <button key={f} onClick={() => { setVFilter(f); }} className={`px-3 py-2 rounded-full text-xs font-medium capitalize transition-all ${vFilter === f ? "bg-amber-500 text-white" : "bg-card border border-border/50 text-muted-foreground"}`}>
                      {f}
                    </button>
                  ))}
                </div>

                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                  {filteredVer.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-sm">No users found</div>
                  )}
                  {filteredVer.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 border-b border-border/30 last:border-0 gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          : (u.display_name?.charAt(0) ?? u.full_name?.charAt(0) ?? "?")}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">{u.display_name || u.full_name}</p>
                          {u.is_verified && <VerifiedBadge type={u.verification_type} size="sm" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {u.is_verified && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: VERIFY_TYPES.find(v => v.value === u.verification_type)?.color ?? "#3b82f6" }}>
                              {u.verification_type}
                            </span>
                          )}
                          {u.follower_count > 0 && (
                            <span className="text-[10px] text-muted-foreground">{u.follower_count} followers</span>
                          )}
                          {u.verification_note && (
                            <span className="text-[10px] text-muted-foreground italic">{u.verification_note}</span>
                          )}
                          {u.verified_at && (
                            <span className="text-[10px] text-muted-foreground">Since {moment(u.verified_at).format("MMM YYYY")}</span>
                          )}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1.5 shrink-0">
                        {u.is_verified ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs rounded-full text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => revokeVerification(u.id)}>
                            <X className="w-3 h-3 mr-1" /> Revoke
                          </Button>
                        ) : (
                          <Button size="sm" className="h-7 text-xs rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={() => { setVerifyModal(u); setVerifyType("personal"); setVerifyNote(""); }}>
                            <BadgeCheck className="w-3 h-3 mr-1" /> Verify
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Users ── */}
            {tab === "users" && (
              <div className="space-y-3">
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email or name..." className="rounded-full" />
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                  {filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 border-b border-border/30 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name || "No name"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                          {u.is_verified && <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-200">✓ verified</Badge>}
                          <span className="text-[10px] text-muted-foreground">{moment(u.created_at).fromNow()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {u.role === "user" ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => setRole(u.id, "admin")}>Make Admin</Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => setRole(u.id, "user")}>Remove Admin</Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteUser(u.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Posts ── */}
            {tab === "posts" && (
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                {posts.map(p => (
                  <div key={p.id} className="flex items-start justify-between p-4 border-b border-border/30 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">{p.author_name} · {moment(p.created_at).fromNow()} · {p.like_count} likes</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0 ml-2" onClick={() => deletePost(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Products ── */}
            {tab === "products" && (
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 border-b border-border/30 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.price?.toLocaleString()} {p.currency} · {p.status}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteProduct(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Orders ── */}
            {tab === "orders" && (
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                {orders.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-4 border-b border-border/30 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.product_title}</p>
                      <p className="text-xs text-muted-foreground">{o.total_price?.toLocaleString()} {o.currency} · {o.buyer_name}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{o.status}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* ── Reports ── */}
            {tab === "reports" && (
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No pending reports</div>
                ) : reports.map(r => (
                  <div key={r.id} className="bg-card rounded-2xl border border-border/50 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">Report: {r.target_type}</p>
                        <p className="text-xs text-muted-foreground">Reason: {r.reason}</p>
                        {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Reporter: {r.reporter_email} · {moment(r.created_at).fromNow()}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-red-500">{r.status}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs rounded-full bg-green-600 hover:bg-green-700" onClick={() => resolveReport(r.id, "resolved")}>Resolve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => resolveReport(r.id, "dismissed")}>Dismiss</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Verify Modal ── */}
      {verifyModal && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={() => setVerifyModal(null)}>
          <div className="bg-card rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Grant Verification</h3>
              <button onClick={() => setVerifyModal(null)} className="p-1.5 rounded-full hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {verifyModal.display_name?.charAt(0) ?? verifyModal.full_name?.charAt(0) ?? "?"}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold">{verifyModal.display_name || verifyModal.full_name}</p>
                  <VerifiedBadge type={verifyType} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground">{verifyModal.email}</p>
              </div>
            </div>

            {/* Badge type selector */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Badge Type</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {VERIFY_TYPES.map(vt => (
                <button key={vt.value} onClick={() => setVerifyType(vt.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${verifyType === vt.value ? "border-2 shadow-sm" : "border-border/60 hover:border-border"}`}
                  style={verifyType === vt.value ? { borderColor: vt.color, backgroundColor: vt.color + "0c" } : {}}>
                  <VerifiedBadge type={vt.value} size="sm" />
                  <div>
                    <p className="text-xs font-semibold">{vt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{vt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Note */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Internal Note (optional)</p>
            <Input
              value={verifyNote}
              onChange={e => setVerifyNote(e.target.value)}
              placeholder="e.g. Popular Ethiopian entrepreneur with 50k+ followers"
              className="mb-4 h-10"
            />

            {/* Action */}
            <Button
              onClick={grantVerification}
              disabled={saving}
              className="w-full h-11 rounded-full text-white font-semibold"
              style={{ backgroundColor: VERIFY_TYPES.find(v => v.value === verifyType)?.color ?? "#3b82f6" }}
            >
              {saving ? t('common.loading') : `Grant ${VERIFY_TYPES.find(v => v.value === verifyType)?.label} Badge`}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}


export default Admin;
