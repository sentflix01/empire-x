// @ts-nocheck
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import { ShoppingBag, Package, Clock, CheckCircle, XCircle, Truck, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import moment from "moment";
import { generateInvoice } from "@/lib/generateInvoice";

const STATUS_CONFIG = {
  pending:    { label: "Pending",    icon: Clock,        color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  paid:       { label: "Paid",       icon: CheckCircle,  color: "text-green-600 bg-green-50 border-green-200" },
  processing: { label: "Processing", icon: Package,      color: "text-blue-600 bg-blue-50 border-blue-200" },
  completed:  { label: "Completed",  icon: CheckCircle,  color: "text-gray-600 bg-gray-50 border-gray-200" },
  cancelled:  { label: "Cancelled",  icon: XCircle,      color: "text-red-600 bg-red-50 border-red-200" },
};

export default function Orders() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("selling"); // selling | buying

  useEffect(() => {
    auth.me().then(u => { setUser(u); loadOrders(u, "selling"); }).catch(() => {});
  }, []);

  const loadOrders = async (u, mode) => {
    setLoading(true);
    try {
      const filter = mode === "selling" ? { seller_id: u.id } : { buyer_id: u.id };
      const data = await entities.Order.filter(filter, "-created_at", 100);
      setOrders(data);
    } catch {}
    setLoading(false);
  };

  const switchTab = (t) => {
    setTab(t);
    if (user) loadOrders(user, t);
  };

  const updateStatus = async (orderId, status) => {
    await entities.Order.update(orderId, { status });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const NEXT_STATUS = { pending: "processing", processing: "completed" };

  return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag className="w-6 h-6 text-amber-500" />
          <h1 className="font-display text-2xl font-bold">Orders</h1>
        </div>

        <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-5">
          {["selling", "buying"].map(t => (
            <button key={t} onClick={() => switchTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
              {t === "selling" ? "My Sales" : "My Purchases"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{tab === "selling" ? "No sales yet" : "No purchases yet"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const next = NEXT_STATUS[order.status];
              return (
                <div key={order.id} className="bg-card rounded-2xl border border-border/50 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{order.product_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tab === "selling" ? `Buyer: ${order.buyer_name || "Unknown"}` : `Seller: ${order.seller_id?.slice(0, 8)}...`}
                      </p>
                      <p className="text-xs text-muted-foreground">{moment(order.created_at).fromNow()}</p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="font-bold text-amber-600">{order.total_price?.toLocaleString()} {order.currency}</p>
                      <p className="text-xs text-muted-foreground">Qty: {order.quantity}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                      <Icon className="w-3 h-3 mr-1" />{cfg.label}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {order.status === "completed" && (
                        <button
                          onClick={() => generateInvoice(order)}
                          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 rounded-full hover:bg-amber-50 transition-colors"
                        >
                          <FileDown className="w-3 h-3" /> Invoice
                        </button>
                      )}
                      {tab === "selling" && next && (
                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => updateStatus(order.id, next)}>
                          Mark as {next === "processing" ? "Processing" : "Completed"}
                        </Button>
                      )}
                      {order.status === "pending" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs rounded-full text-destructive" onClick={() => updateStatus(order.id, "cancelled")}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                  {order.delivery_address && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Truck className="w-3 h-3" />{order.delivery_address}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}


