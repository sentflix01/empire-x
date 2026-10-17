'use client'
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { entities } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import client from "@/api/client";
import {
  ShoppingBag, Package, Clock, CheckCircle, XCircle,
  Truck, FileDown, RotateCcw, MapPin, ChevronDown, ChevronUp,
  Plus, AlertCircle, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fromNow } from "@/lib/date";
import { useTranslation } from 'react-i18next';
import { generateInvoice } from "@/lib/generateInvoice";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import ErrorBoundary from '@/components/ErrorBoundary';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import RequestPricing from '@/components/orders/RequestPricing';

const STATUS_CONFIG = {
  pending:    { label: "Pending",    icon: Clock,        color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  paid:       { label: "Paid",       icon: CheckCircle,  color: "text-green-600 bg-green-50 border-green-200" },
  processing: { label: "Processing", icon: Package,      color: "text-blue-600 bg-blue-50 border-blue-200" },
  completed:  { label: "Completed",  icon: CheckCircle,  color: "text-gray-600 bg-gray-50 border-gray-200" },
  cancelled:  { label: "Cancelled",  icon: XCircle,      color: "text-red-600 bg-red-50 border-red-200" },
  // Direct payment (buyer pays the seller; only the seller confirms)
  requested:        { label: "Request: price to confirm", icon: Clock, color: "text-amber-700 bg-amber-50 border-amber-200" },
  awaiting_payment: { label: "Awaiting payment", icon: Clock,       color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  payment_reported: { label: "Payment reported", icon: Clock,       color: "text-amber-700 bg-amber-50 border-amber-200" },
  expired:          { label: "Expired",          icon: XCircle,     color: "text-gray-600 bg-gray-50 border-gray-200" },
  confirmed:        { label: "Confirmed",        icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200" },
  shipped:          { label: "Shipped",          icon: Package,     color: "text-blue-600 bg-blue-50 border-blue-200" },
  delivered:        { label: "Delivered",        icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200" },
};

// Seller next steps, matching the backend SELLER_TRANSITIONS.
const NEXT_STATUS: Record<string, string> = { pending: "confirmed", paid: "processing", confirmed: "processing", processing: "shipped", shipped: "delivered" };
const NEXT_LABEL: Record<string, string> = { confirmed: "Confirm order", processing: "Mark as processing", shipped: "Mark as shipped", delivered: "Mark as delivered", completed: "Mark as completed" };

const DELIVERY_STEPS = ["Packed", "Picked Up", "In Transit", "Out for Delivery", "Delivered"];

const RETURN_REASONS = [
  "Wrong item received",
  "Item damaged or defective",
  "Item not as described",
  "Changed my mind",
  "Duplicate order",
  "Other",
];

/* ── Delivery Timeline ──────────────────────────────────────────────────── */
function DeliveryTimeline({ orderId, isSeller }: { orderId: string; isSeller: boolean }) {
  const { t } = useTranslation();
  const [updates, setUpdates]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [status, setStatus]       = useState("Packed");
  const [note, setNote]           = useState("");
  const [location, setLocation]   = useState("");
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    client.get(`/api/delivery/${orderId}`)
      .then(r => setUpdates(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const addUpdate = async () => {
    setSaving(true);
    try {
      const { data } = await client.post(`/api/delivery/${orderId}`, { status, note, location });
      setUpdates(prev => [...prev, data]);
      setNote(""); setLocation(""); setAdding(false);
    } catch {
      toast.error("Failed to add delivery update");
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex justify-center py-4">
      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
    </div>
  );

  const latestStatus = updates[updates.length - 1]?.status;
  const latestIdx    = DELIVERY_STEPS.indexOf(latestStatus ?? "");

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
        <Truck className="w-3.5 h-3.5" /> Delivery Tracking
      </p>

      {/* Progress steps */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="absolute left-0 right-0 top-3 h-0.5 bg-border/40" />
        <div
          className="absolute left-0 top-3 h-0.5 bg-amber-500 transition-all"
          style={{ width: latestIdx >= 0 ? `${(latestIdx / (DELIVERY_STEPS.length - 1)) * 100}%` : "0%" }}
        />
        {DELIVERY_STEPS.map((step, i) => {
          const done = i <= latestIdx;
          return (
            <div key={step} className="relative flex flex-col items-center gap-1 z-10">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${done ? "bg-amber-500 text-white" : "bg-border/40 text-muted-foreground"}`}>
                {done ? "✓" : i + 1}
              </div>
              <span className="text-[9px] text-muted-foreground whitespace-nowrap hidden sm:block">{step}</span>
            </div>
          );
        })}
      </div>

      {/* Timeline entries */}
      {updates.length > 0 && (
        <div className="space-y-2 mb-3">
          {updates.map((u, i) => (
            <div key={u.id} className="flex gap-2.5 items-start">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${i === updates.length - 1 ? "bg-amber-500" : "bg-border"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{u.status}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{fromNow(u.created_at)}</span>
                </div>
                {u.note && <p className="text-[11px] text-muted-foreground">{u.note}</p>}
                {u.location && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />{u.location}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {updates.length === 0 && (
        <p className="text-xs text-muted-foreground mb-3">No delivery updates yet.</p>
      )}

      {/* Seller: add update */}
      {isSeller && latestStatus !== "Delivered" && (
        <>
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add update
            </button>
          ) : (
            <div className="space-y-2 mt-2">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full text-xs border border-border/50 rounded-lg px-2.5 py-1.5 bg-card outline-none focus:ring-1 focus:ring-amber-400/40"
              >
                {DELIVERY_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                placeholder="Note (optional)"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full text-xs border border-border/50 rounded-lg px-2.5 py-1.5 bg-card outline-none focus:ring-1 focus:ring-amber-400/40"
              />
              <input
                placeholder="Location (optional)"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full text-xs border border-border/50 rounded-lg px-2.5 py-1.5 bg-card outline-none focus:ring-1 focus:ring-amber-400/40"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addUpdate} disabled={saving}
                  className="h-7 text-xs rounded-full bg-blue-600 hover:bg-blue-700 text-white">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : t('orders.save')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}
                  className="h-7 text-xs rounded-full">Cancel</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Return Request Form ─────────────────────────────────────────────────── */
function ReturnRequestForm({ order, onSubmitted }: { order: any; onSubmitted: () => void }) {
  const { t } = useTranslation();
  const [reason, setReason]   = useState(RETURN_REASONS[0]);
  const [details, setDetails] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      await client.post("/api/returns", { order_id: order.id, reason, details });
      onSubmitted();
    } catch (err: any) {
      setError(apiErrorMessage(err, "Failed to submit request"));
    }
    setSaving(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <RotateCcw className="w-3.5 h-3.5" /> Request Return / Refund
      </p>
      <select
        value={reason}
        onChange={e => setReason(e.target.value)}
        className="w-full text-xs border border-border/50 rounded-lg px-2.5 py-1.5 bg-card outline-none focus:ring-1 focus:ring-amber-400/40"
      >
        {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <textarea
        placeholder="Additional details (optional)…"
        value={details}
        onChange={e => setDetails(e.target.value)}
        rows={2}
        className="w-full text-xs border border-border/50 rounded-lg px-2.5 py-1.5 bg-card outline-none focus:ring-1 focus:ring-amber-400/40 resize-none"
      />
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={saving}
          className="h-7 text-xs rounded-full bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : t('orders.submitRequest')}
        </Button>
      </div>
    </div>
  );
}

/* ── Return Status Badge ────────────────────────────────────────────────── */
function ReturnBadge({ orderId, isSeller }: { orderId: string; isSeller: boolean }) {
  const [returns, setReturns] = useState<any[]>([]);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    client.get(`/api/returns?role=${isSeller ? "seller" : "buyer"}`)
      .then(r => {
        const mine = (r.data || []).filter((rr: any) => rr.order_id === orderId);
        if (active) setReturns(mine);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [orderId, isSeller]);

  if (!loaded || returns.length === 0) return null;
  const latest = returns[0];

  const returnStatusColors: Record<string, string> = {
    pending:  "text-yellow-700 bg-yellow-50 border-yellow-200",
    approved: "text-green-700 bg-green-50 border-green-200",
    refunded: "text-green-700 bg-green-50 border-green-200",
    rejected: "text-red-700 bg-red-50 border-red-200",
  };

  return (
    <Badge variant="outline" className={`text-[10px] ${returnStatusColors[latest.status] ?? ""}`}>
      <RotateCcw className="w-2.5 h-2.5 mr-1" />
      Return: {latest.status}
    </Badge>
  );
}

/* ── Seller: approve/reject return ─────────────────────────────────────── */
function SellerReturnActions({ orderId, onActioned }: { orderId: string; onActioned: () => void }) {
  const [returns, setReturns]         = useState<any[]>([]);
  const [loaded, setLoaded]           = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    client.get(`/api/returns?role=seller`)
      .then(r => {
        if (active) setReturns((r.data || []).filter((rr: any) => rr.order_id === orderId && rr.status === "pending"));
      })
      .catch(() => {})
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [orderId]);

  if (!loaded || returns.length === 0) return null;
  const rr = returns[0];

  const act = async (status: "approved" | "rejected") => {
    setSaving(true);
    try {
      await client.put(`/api/returns/${rr.id}`, {
        status,
        refund_amount: status === "approved" ? parseFloat(refundAmount) || rr.total_price : undefined,
      });
      onActioned();
    } catch { toast.error("Failed to update return status"); }
    setSaving(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
        <AlertCircle className="w-3.5 h-3.5" /> Pending Return Request
      </p>
      <p className="text-xs text-muted-foreground mb-1">Reason: <span className="font-medium text-foreground">{rr.reason}</span></p>
      {rr.details && <p className="text-xs text-muted-foreground mb-2">{rr.details}</p>}
      <input
        type="number"
        placeholder={`Agreed refund to arrange manually (max ${rr.total_price} ${rr.currency || "USD"})`}
        value={refundAmount}
        onChange={e => setRefundAmount(e.target.value)}
        className="w-full text-xs border border-border/50 rounded-lg px-2.5 py-1.5 bg-card outline-none focus:ring-1 focus:ring-amber-400/40 mb-2"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => act("approved")} disabled={saving}
          className="h-7 text-xs rounded-full bg-green-600 hover:bg-green-700 text-white">
          Approve Return
        </Button>
        <Button size="sm" onClick={() => act("rejected")} disabled={saving}
          variant="destructive" className="h-7 text-xs rounded-full">
          Reject
        </Button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Approval records the agreed amount. Buyer and seller arrange payment separately.</p>
    </div>
  );
}

/* ── Main Orders Page ────────────────────────────────────────────────────── */
function Orders() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab]         = useState("selling");
  const userId = user?.id;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showReturn, setShowReturn] = useState<Record<string, boolean>>({});
  // Map of user_id → display_name for orders counterparty
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userId) loadOrders({ id: userId }, "selling");
  }, [userId]);

  const loadOrders = async (u, mode) => {
    setLoading(true);
    setLoadError('');
    try {
      const filter = mode === "selling" ? { seller_id: u.id } : { buyer_id: u.id };
      const data = await entities.Order.filter(filter, "-created_at", 100);
      setOrders(Array.isArray(data) ? data : (data as any)?.orders ?? []);
      // Resolve counterparty names (seller names for buying tab, buyer names already in order)
      if (data.length > 0) {
        const ids = [...new Set(data.map(o => mode === "selling" ? o.buyer_id : o.seller_id).filter(Boolean))];
        if (ids.length) {
          try {
            const res = await Promise.all(ids.map(uid =>
              client.get(`/api/profiles?user_id=${uid}&limit=1`).then(r => ({
                id: uid,
                name: Array.isArray(r.data) && r.data[0] ? (r.data[0].display_name || r.data[0].business_name || '') : ''
              })).catch(() => ({ id: uid, name: '' }))
            ));
            const map: Record<string, string> = {};
            res.forEach(r => { if (r.name) map[r.id as string] = r.name; });
            setNameMap(map);
          } catch { /* silenced */ }
        }
      }
    } catch (err: any) {
      setLoadError(err?.error || err?.message || 'Failed to load orders');
    }
    setLoading(false);
  };

  const switchTab = (mode) => {
    setTab(mode);
    if (user) loadOrders(user, mode);
  };

  const updateStatus = async (orderId, status) => {
    try {
      await entities.Order.update(orderId, { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err: any) {
      toast.error(err?.error ?? "Could not update the order");
    }
  };

  // Direct payment actions (/api/direct-orders).
  const directAction = async (orderId: string, action: "confirm-payment" | "reject-payment" | "report-payment") => {
    try {
      const { data } = await client.post(`/api/direct-orders/${orderId}/${action}`, {});
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...data.order } : o));
      toast.success(action === "confirm-payment" ? "Payment confirmed" : action === "reject-payment" ? "Buyer told the payment has not arrived" : "The seller has been told you paid");
    } catch (err: any) {
      toast.error(err?.error ?? "Could not update the payment");
    }
  };

  const viewReceipt = async (orderId: string) => {
    try {
      const { data } = await client.get(`/api/direct-orders/${orderId}/receipt`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err?.error ?? "Could not open the receipt");
    }
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleReturn = (id) => setShowReturn(prev => ({ ...prev, [id]: !prev[id] }));

  const isSelling = tab === "selling";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="w-6 h-6 text-amber-500" />
        <h1 className="font-display text-2xl font-bold">Orders</h1>
      </div>

      <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-5">
        {/* Loop var is `mode` — `t` would shadow the translation function */}
        {["selling", "buying"].map(mode => (
          <button key={mode} onClick={() => switchTab(mode)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab === mode ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
            {mode === "selling" ? t('orders.mySales') : t('orders.myPurchases')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="text-center py-12 rounded-2xl border border-destructive/20 bg-destructive/5">
          <p className="text-sm text-destructive font-medium">{loadError}</p>
          <button onClick={() => user && loadOrders(user, tab)} className="mt-3 text-xs text-amber-600 hover:underline font-medium">Retry</button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{isSelling ? t('orders.noSales') : t('orders.noPurchases')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const cfg  = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            // A guest buyer has no account to confirm delivery, so the seller completes it.
            const next = NEXT_STATUS[order.status] ?? (order.status === "delivered" && !order.buyer_id ? "completed" : undefined);
            const isExpanded = !!expanded[order.id];
            const canReturn  = !isSelling && ["completed", "paid"].includes(order.status);

            return (
              <div key={order.id} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                {/* Order header — always visible */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Product thumbnail */}
                      {order.product_id && (
                        <Link href={`/products/${order.product_id}`} className="shrink-0">
                          <div className="w-14 h-14 rounded-xl bg-secondary/30 overflow-hidden relative">
                            {order.product_images ? (
                              <Image
                                src={(() => { try { const imgs = JSON.parse(order.product_images); return Array.isArray(imgs) ? imgs[0] : imgs; } catch { return order.product_images; } })()}
                                alt={order.product_title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                        </Link>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{order.product_title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isSelling
                            ? `Buyer: ${order.buyer_name || nameMap[order.buyer_id] || "Unknown"}`
                            : `Seller: ${nameMap[order.seller_id] || order.seller_name || order.seller_id?.slice(0, 8) + '…'}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{fromNow(order.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      {order.status === "requested"
                        ? <p className="text-sm font-semibold text-amber-600">{order.listed_price_text ? `Listed: ${order.listed_price_text}` : "Price to confirm"}</p>
                        : <p className="font-bold text-amber-600">{order.total_price?.toLocaleString()} {order.currency}</p>}
                      <p className="text-xs text-muted-foreground">Qty: {order.quantity}</p>
                    </div>
                  </div>

                  {/* Status row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                      <Icon className="w-3 h-3 mr-1" />{cfg.label}
                    </Badge>

                    <ReturnBadge orderId={order.id} isSeller={isSelling} />

                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                      {/* Invoice */}
                      {order.status === "completed" && (
                        <button
                          onClick={() => { void generateInvoice(order); }}
                          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 rounded-full hover:bg-amber-50 transition-colors"
                        >
                          <FileDown className="w-3 h-3" /> Invoice
                        </button>
                      )}

                      {/* Seller: advance status */}
                      {isSelling && next && (
                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-full"
                          onClick={() => updateStatus(order.id, next)}>
                          {NEXT_LABEL[next] ?? next}
                        </Button>
                      )}

                      {/* Request to order: the seller sets the price or declines; the buyer waits */}
                      {isSelling && order.status === "requested" && (
                        <RequestPricing order={order} onUpdated={(updated) => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...updated } : o))} />
                      )}
                      {!isSelling && order.status === "requested" && (
                        <span className="text-xs text-muted-foreground">Waiting for the seller&apos;s price</span>
                      )}

                      {/* Direct payment: seller confirms; buyer reports */}
                      {isSelling && ["awaiting_payment", "payment_reported"].includes(order.status) && (
                        <Button size="sm" className="h-7 text-xs rounded-full" onClick={() => directAction(order.id, "confirm-payment")}>
                          Confirm payment received
                        </Button>
                      )}
                      {isSelling && order.status === "payment_reported" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => directAction(order.id, "reject-payment")}>
                          Not received
                        </Button>
                      )}
                      {order.has_receipt && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs rounded-full" onClick={() => viewReceipt(order.id)}>
                          View receipt
                        </Button>
                      )}
                      {!isSelling && order.status === "awaiting_payment" && (
                        <Button size="sm" className="h-7 text-xs rounded-full" onClick={() => directAction(order.id, "report-payment")}>
                          I&apos;ve paid
                        </Button>
                      )}

                      {/* Cancel */}
                      {(["pending", "awaiting_payment"].includes(order.status) || (isSelling && order.status === "payment_reported")) && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs rounded-full text-destructive"
                          onClick={() => updateStatus(order.id, "cancelled")}>
                          Cancel
                        </Button>
                      )}

                      {/* Buyer: return */}
                      {canReturn && (
                        <button
                          onClick={() => toggleReturn(order.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-full hover:bg-secondary transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Return
                        </button>
                      )}

                      {/* Expand tracking / details */}
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="p-1 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Delivery address */}
                  {order.delivery_address && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Truck className="w-3 h-3" />{order.delivery_address}
                    </p>
                  )}
                  {/* Direct payment: what the buyer reported, and how to reach a guest buyer */}
                  {order.payment_reference && (
                    <p className="text-xs text-muted-foreground mt-1">Payment reference: <span className="font-mono">{order.payment_reference}</span></p>
                  )}
                  {isSelling && (order.buyer_phone || order.buyer_email) && (
                    <p className="text-xs text-muted-foreground mt-1">Contact: {[order.buyer_phone, order.buyer_email].filter(Boolean).join(" · ")}</p>
                  )}
                </div>

                {/* Expanded section: Delivery Timeline + Return actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden px-4 pb-4"
                    >
                      {/* Delivery tracking */}
                      <DeliveryTimeline orderId={order.id} isSeller={isSelling} />

                      {/* Seller: return action panel */}
                      {isSelling && (
                        <SellerReturnActions orderId={order.id} onActioned={() => loadOrders(user, tab)} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Inline return form for buyer */}
                <AnimatePresence>
                  {showReturn[order.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden px-4 pb-4"
                    >
                      <ReturnRequestForm
                        order={order}
                        onSubmitted={() => {
                          toggleReturn(order.id);
                          loadOrders(user, tab);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { DeliveryTimeline };

export default function OrdersPage() {
  return <ErrorBoundary><Orders /></ErrorBoundary>;
}
