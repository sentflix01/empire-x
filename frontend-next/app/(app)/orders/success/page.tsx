'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import client from '@/api/client';
import { CheckCircle, Package, Loader2, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderSummary {
  id: string;
  product_title: string;
  total_price: number;
  currency: string;
  quantity: number;
  status: string;
}

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      // No session id — still show success (e.g. direct nav) but skip lookup
      setLoading(false);
      return;
    }

    // Fetch orders tied to this Stripe session
    client.get(`/api/orders/session/${encodeURIComponent(sessionId)}`)
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data ? [r.data] : [];
        setOrders(data);
      })
      .catch(() => setError('Could not load order details — your order was placed.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      <h1 className="font-display text-3xl font-bold mb-2">Payment Confirmed!</h1>
      <p className="text-muted-foreground mb-8">
        Your order has been placed and the seller has been notified.
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : error ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 mb-6">
          <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
        </div>
      ) : orders.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 p-5 mb-8 text-left space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Order Summary</h2>
          {orders.map(order => (
            <div key={order.id} className="flex items-start justify-between gap-3 py-2 border-b border-border/30 last:border-0">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{order.product_title}</p>
                  <p className="text-xs text-muted-foreground">Qty: {order.quantity}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-amber-600 shrink-0">
                {Number(order.total_price).toLocaleString()} {order.currency || 'USD'}
              </p>
            </div>
          ))}
          {orders.length > 1 && (
            <div className="flex justify-between pt-1 font-bold text-base">
              <span>Total</span>
              <span className="text-amber-600">
                {orders.reduce((s, o) => s + Number(o.total_price), 0).toLocaleString()} {orders[0]?.currency || 'USD'}
              </span>
            </div>
          )}
        </div>
      ) : null}

      {/* What happens next */}
      <div className="bg-secondary/40 rounded-2xl p-5 mb-8 text-left">
        <h3 className="font-semibold text-sm mb-3">What happens next?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            The seller has been notified of your order and payment.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            They will contact you to arrange delivery.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            Track your order status on the <strong>Orders</strong> page.
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/orders" className="flex-1">
          <Button className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-semibold">
            <Package className="w-4 h-4 mr-2" />
            View My Orders <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
        <Link href="/marketplace" className="flex-1">
          <Button variant="outline" className="w-full h-11 rounded-full">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
