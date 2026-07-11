'use client';
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";

import {
  ArrowLeft, TrendingUp, ShoppingBag, Eye, Users, BarChart3, Heart,
  Store, Plus, Pencil, Activity, DollarSign, Package, Download, FileSpreadsheet
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import moment from "moment";
import { useTranslation } from 'react-i18next';
import BusinessSwitcher from "@/components/analytics/BusinessSwitcher";
import StatCard from "@/components/analytics/StatCard";
import { downloadCSV, buildAnalyticsReport } from "@/lib/exportReport";
import { toast } from "@/components/ui/use-toast";

const CHART_COLORS = ["#D4AF37", "#3B82F6", "#8B5CF6", "#06B6D4", "#F97316", "#EC4899", "#10B981", "#EF4444"];

export default function BusinessAnalytics() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const selectedBizId = searchParams.get("business");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const me = await auth.me();
      const [profiles, bizList] = await Promise.all([
        entities.UserProfile.filter({ user_id: me.id }).catch(() => []),
        entities.Business.filter({ owner_id: me.id }, "-created_at", 50).catch(() => [])
      ]);
      if (profiles.length > 0) setProfile(profiles[0]);
      setBusinesses(bizList);
      await loadData(me.id, bizList);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadData = async (userId, bizList) => {
    const bizId = searchParams.get("business");
    const productFilter = bizId ? { seller_id: userId, business_id: bizId } : { seller_id: userId };
    const [ords, prods, allLikes] = await Promise.all([
      entities.Order.filter({ seller_id: userId }, "-created_at", 300).catch(() => []),
      entities.Product.filter(productFilter, "-created_at", 200).catch(() => []),
      entities.Like.filter({ target_type: "product" }, "-created_at", 500).catch(() => [])
    ]);
    setOrders(ords);
    setProducts(prods);
    setLikes(allLikes);
  };

  // Reload data when switching business
  useEffect(() => {
    if (profile) {
      const bizId = searchParams.get("business");
      const productFilter = bizId ? { seller_id: profile.user_id, business_id: bizId } : { seller_id: profile.user_id };
      Promise.all([
        entities.Order.filter({ seller_id: profile.user_id }, "-created_at", 300).catch(() => []),
        entities.Product.filter(productFilter, "-created_at", 200).catch(() => []),
        entities.Like.filter({ target_type: "product" }, "-created_at", 500).catch(() => [])
      ]).then(([ords, prods, allLikes]) => {
        setOrders(ords);
        setProducts(prods);
        setLikes(allLikes);
      });
    }
  }, [searchParams]);

  const handleSelectBusiness = (id) => {
    if (id) router.push(`/business/analytics?business=${id}`);
    else router.push('/business/analytics');
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  const selectedBusiness = businesses.find(b => b.id === selectedBizId);
  const themeColor = selectedBusiness?.business_theme_color || profile?.business_theme_color || "#D4AF37";
  const bizName = selectedBusiness?.business_name || "All Businesses";

  // Compute stats
  const bizProductIds = selectedBusiness ? products.map(p => p.id) : null;
  const filteredOrders = selectedBusiness ? orders.filter(o => bizProductIds?.includes(o.product_id)) : orders;
  const totalSales = filteredOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalViews = products.reduce((sum, p) => sum + (p.view_count || 0), 0);
  const totalLikes = products.reduce((sum, p) => sum + likes.filter(l => l.target_id === p.id).length, 0);
  const totalEngagement = totalViews + totalLikes + filteredOrders.length;
  const completedOrders = filteredOrders.filter(o => o.status === "completed" || o.status === "paid");
  const conversionRate = totalViews > 0 ? ((completedOrders.length / totalViews) * 100).toFixed(1) : 0;

  // Sales by day (last 7 days)
  const salesData = [];
  for (let i = 6; i >= 0; i--) {
    const day = moment().subtract(i, "days");
    const dayOrders = filteredOrders.filter(o => moment(o.created_at).isSame(day, "day"));
    salesData.push({
      day: day.format("ddd"),
      sales: dayOrders.reduce((sum, o) => sum + (o.total_price || 0), 0),
      orders: dayOrders.length,
    });
  }

  // Engagement trend (last 7 days) — views + likes + orders by day
  const engagementData = [];
  for (let i = 6; i >= 0; i--) {
    const day = moment().subtract(i, "days");
    const dayLikes = likes.filter(l => {
      if (bizProductIds && !bizProductIds.includes(l.target_id)) return false;
      return moment(l.created_at).isSame(day, "day");
    }).length;
    const dayOrders = filteredOrders.filter(o => moment(o.created_at).isSame(day, "day")).length;
    engagementData.push({
      day: day.format("ddd"),
      engagement: dayLikes + dayOrders,
      likes: dayLikes,
      orders: dayOrders,
    });
  }

  // Product views data (top 6 products)
  const productViewsData = products
    .slice()
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 6)
    .map(p => ({
      name: p.title?.length > 12 ? p.title.substring(0, 12) + "…" : p.title,
      views: p.view_count || 0,
      likes: likes.filter(l => l.target_id === p.id).length,
    }));

  // Sales by status (pie)
  const statusBreakdown = ["pending", "paid", "processing", "completed", "cancelled"].map(s => ({
    name: s,
    value: filteredOrders.filter(o => o.status === s).length,
  })).filter(s => s.value > 0);

  const stats = [
    { label: t('business.revenue'), value: `${totalSales.toLocaleString()} ETB`, icon: DollarSign, color: "text-green-600 bg-green-50" },
    { label: t('nav.orders'), value: filteredOrders.length, icon: ShoppingBag, color: "text-amber-600 bg-amber-50" },
    { label: t('business.overview'), value: totalViews, icon: Eye, color: "text-blue-600 bg-blue-50" },
    { label: t('business.overview'), value: totalEngagement, icon: Activity, color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <Link href="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Link>

        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Business Analytics</h1>
            <p className="text-sm text-muted-foreground">Monitor growth across your businesses</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                const report = buildAnalyticsReport({
                  bizName, stats: { totalSales, totalOrders: filteredOrders.length, totalViews, totalLikes, totalEngagement },
                  salesData, engagementData, products, likes, orders: filteredOrders, conversionRate
                });
                downloadCSV(`${bizName.replace(/\s+/g, "_")}_analytics_${moment().format("YYYYMMDD")}.csv`, report);
              }}
            >
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button
              size="sm"
              className="rounded-full bg-green-600 hover:bg-green-700"
              onClick={() => {
                toast({
                  title: "Google Sheets Export",
                  description: "Direct Google Sheets export requires a Builder+ plan. Use Export CSV to download your report, then import it into Google Sheets.",
                });
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Google Sheets
            </Button>
          </div>
        </div>

        {/* Business Switcher */}
        <div className="mb-6">
          <BusinessSwitcher
            businesses={businesses}
            selectedId={selectedBizId}
            onSelect={handleSelectBusiness}
          />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-2xl border border-border/50 p-3 text-center">
            <Heart className="w-4 h-4 text-rose-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{totalLikes}</p>
            <p className="text-[10px] text-muted-foreground">Product Likes</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-3 text-center">
            <Package className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{products.length}</p>
            <p className="text-[10px] text-muted-foreground">Products</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-3 text-center">
            <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{conversionRate}%</p>
            <p className="text-[10px] text-muted-foreground">Conversion</p>
          </div>
        </div>

        {/* Sales Chart */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Sales Performance — Last 7 Days
          </h3>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No sales data yet</p>
              <p className="text-xs text-muted-foreground mt-1">Sales will appear here once you receive orders</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e5e5", fontSize: "12px" }}
                  formatter={(value, name) => name === "sales" ? [`${value.toLocaleString()} ETB`, "Revenue"] : [value, t('nav.orders')]}
                  cursor={{ fill: themeColor + "10" }}
                />
                <Bar dataKey="sales" fill={themeColor} radius={[6, 6, 0, 0]} name="sales" />
                <Bar dataKey="orders" fill={themeColor + "60"} radius={[6, 6, 0, 0]} name="orders" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Engagement Trend */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Engagement Trend
          </h3>
          {totalEngagement === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No engagement data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={engagementData}>
                <defs>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={themeColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={themeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e5e5", fontSize: "12px" }} />
                <Area type="monotone" dataKey="engagement" stroke={themeColor} strokeWidth={2} fill="url(#engGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Product Views Chart */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4" /> Product View Counts
          </h3>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No products yet</p>
              <Link href="/products/create" className="text-xs text-amber-600 hover:underline mt-2 inline-block">Add your first product →</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productViewsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e5e5", fontSize: "12px" }}
                  formatter={(value, name) => name === "views" ? [value, "Views"] : [value, "Likes"]}
                  cursor={{ fill: themeColor + "10" }}
                />
                <Bar dataKey="views" fill={themeColor} radius={[0, 6, 6, 0]} name="views" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order Status Breakdown */}
        {filteredOrders.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
            <h3 className="font-semibold text-sm mb-4">Order Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {statusBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e5e5", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Product Performance List */}
        <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
          <h3 className="font-semibold text-sm mb-4">Product Performance</h3>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No products yet</p>
          ) : (
            <div className="space-y-2">
              {products.slice(0, 8).map(p => {
                const productLikes = likes.filter(l => l.target_id === p.id).length;
                const productOrders = filteredOrders.filter(o => o.product_id === p.id).length;
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {p.view_count || 0}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {productLikes}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" /> {productOrders}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                      </div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-sm font-bold text-amber-600">{(p.price || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{p.stock || 0} stock</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        {filteredOrders.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
            <h3 className="font-semibold text-sm mb-4">Recent Orders</h3>
            <div className="space-y-2">
              {filteredOrders.slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{o.product_title}</p>
                    <p className="text-xs text-muted-foreground">{o.buyer_name} • {moment(o.created_at).fromNow()}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <p className="text-sm font-bold text-amber-600">{(o.total_price || 0).toLocaleString()}</p>
                    <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Management */}
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Store className="w-4 h-4" /> Manage Businesses
            </h3>
            <Link href="/business/create">
              <Button size="sm" className="rounded-full h-7 text-xs bg-gradient-to-r from-amber-500 to-amber-600">
                <Plus className="w-3 h-3 mr-1" /> Add Business
              </Button>
            </Link>
          </div>
          {businesses.length === 0 ? (
            <div className="text-center py-8">
              <Store className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">You haven't created any businesses yet</p>
              <Link href="/business/create">
                <Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
                  <Plus className="w-3 h-3 mr-1" /> Create Your First Business
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {businesses.map(b => {
                const bizProds = products.filter(p => p.business_id === b.id);
                const bizViews = bizProds.reduce((sum, p) => sum + (p.view_count || 0), 0);
                return (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-amber-300 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: b.business_theme_color || "#D4AF37" }}>
                      {b.business_name?.charAt(0) || "B"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.business_name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">{b.business_category}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="w-3 h-3" /> {bizProds.length}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {bizViews}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleSelectBusiness(b.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${b.id === selectedBizId ? "bg-amber-100 text-amber-700" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}
                      >
                        {b.id === selectedBizId ? t('common.view') : t('common.view')}
                      </button>
                      <Link href={`/business/edit?id=${b.id}`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
}



