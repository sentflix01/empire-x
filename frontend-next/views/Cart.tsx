'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { useState } from "react";
import { useCart } from "@/lib/CartContext";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function Cart() {
  const { t } = useTranslation();
  const { cart, updateQty, removeItem, clearCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const router = useRouter();

  const { items = [], total = 0 } = cart;

  const handleCheckout = () => {
    if (!items.length) return;
    toast.info("Checkout: opening each product page to complete orders.");
    router.push(`/products/${items[0].product_id}`);
  };

  return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-amber-500" />
            <div>
              <h1 className="font-display text-2xl font-bold">{t('cart.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('cart.itemCount', { count: items.length })}</p>
            </div>
          </div>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> {t('cart.clearAll')}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border/50">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">{t('cart.empty')}</h3>
            <p className="text-sm text-muted-foreground mb-6">{t('cart.emptySubtitle')}</p>
            <Link href="/marketplace">
              <Button className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                {t('cart.browseMarketplace')} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Cart Items */}
            {items.map(item => {
              const imgs = (() => { try { return JSON.parse(item.images || "[]"); } catch { return []; } })();
              const lineTotal = parseFloat(item.price) * item.quantity;
              return (
                <div key={item.id} className="bg-card rounded-2xl border border-border/50 p-4 flex gap-4">
                  {/* Thumbnail */}
                  <Link href={`/products/${item.product_id}`} className="w-20 h-20 rounded-xl overflow-hidden bg-secondary/30 shrink-0">
                    {imgs[0] ? (
                      <img src={imgs[0]} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-muted-foreground/30" /></div>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.product_id}`} className="font-semibold text-sm truncate block hover:underline">{item.title}</Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{parseFloat(item.price).toLocaleString()} {item.currency || "ETB"} each</p>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => item.quantity > 1 ? updateQty(item.id, item.quantity - 1) : removeItem(item.id)}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button onClick={() => removeItem(item.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Line total */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-amber-600">{lineTotal.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{item.currency || "ETB"}</p>
                  </div>
                </div>
              );
            })}

            {/* Order Summary */}
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h2 className="font-semibold mb-3">{t('cart.orderSummary')}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('cart.subtotal', { count: items.length })}</span>
                  <span>{total.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('cart.delivery')}</span>
                  <span className="text-green-600">{t('cart.deliveryNote')}</span>
                </div>
                <div className="border-t border-border/50 pt-2 mt-2 flex justify-between font-bold text-base">
                  <span>{t('cart.total')}</span>
                  <span className="text-amber-600">{total.toLocaleString()} ETB</span>
                </div>
              </div>
              <Button onClick={handleCheckout}
                className="w-full mt-4 h-12 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-semibold">
                {checkingOut ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('cart.checkout', { total: total.toLocaleString() })} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">{t('cart.payNote')}</p>
            </div>
          </div>
        )}
      </div>
  );
}




