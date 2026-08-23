'use client'
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { entities } from "@/api/entities";
import client from "@/api/client";
import { createNotification } from "@/lib/notifications";
import { X, ShoppingBag, Check, Loader2, Tag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface CouponData {
  valid: boolean;
  discount: number;
  coupon: { code: string };
}

interface PurchaseModalProps {
  item: {
    id?: string;
    title: string;
    description?: string;
    price?: number;
    currency?: string;
    images?: string;
    product_type?: string;
  };
  seller: {
    user_id: string;
    business_name?: string;
    display_name?: string;
  };
  buyer?: {
    id?: string;
    full_name?: string;
    email?: string;
  };
  onClose: () => void;
  onPurchased?: () => void;
}

export default function PurchaseModal({ item, seller, buyer, onClose, onPurchased }: PurchaseModalProps) {
  const [step, setStep] = useState("details"); // details | checkout | success | chapa_pending
  const [quantity, setQuantity] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [chapaTxRef, setChapaTxRef] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<CouponData | null>(null); // { valid, coupon, discount }
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Poll for Chapa payment confirmation after redirect back to app
  useEffect(() => {
    if (step !== "chapa_pending" || !chapaTxRef) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await client.get(`/api/orders/chapa/status/${chapaTxRef}`);
        if (data.status === "paid") {
          clearInterval(interval);
          setStep("success");
          onPurchased?.();
        } else if (data.status === "payment_failed") {
          clearInterval(interval);
          toast.error("Payment failed. Please try again.");
          setStep("checkout");
        }
      } catch {}
      if (attempts >= 20) clearInterval(interval); // stop after ~60s
    }, 3000);
    return () => clearInterval(interval);
  }, [step, chapaTxRef]);

  const parseImages = (img: string | null | undefined): string[] => { try { return JSON.parse(img || "[]"); } catch { return img ? [img] : []; } };
  const images = parseImages(item.images);
  const unitPrice = item.price || 0;
  const subtotal = unitPrice * quantity;
  const discount = couponData?.discount || 0;
  const totalPrice = Math.max(0, subtotal - discount);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const { data } = await client.post("/api/coupons/validate", {
        code: couponCode.trim(),
        seller_id: seller.user_id,
        order_total: subtotal,
      });
      setCouponData(data);
      toast.success(`Coupon applied! You save ${data.discount.toLocaleString()} ${item.currency || "USD"}`);
    } catch (e) {
      setCouponData(null);
      toast.error(e?.response?.data?.error || "Invalid coupon code");
    }
    setValidatingCoupon(false);
  };

  const handleCheckout = async () => {
    setProcessing(true);
    await entities.Order.create({
      buyer_id: buyer?.id || "",
      seller_id: seller.user_id,
      product_id: item.id || "",
      product_title: item.title,
      product_type: item.product_type || "product",
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      currency: item.currency || "USD",
      status: "pending",
      buyer_name: orderInfo.name || buyer?.full_name || "",
      buyer_phone: orderInfo.phone,
      buyer_email: orderInfo.email,
      delivery_address: orderInfo.address,
      notes: orderInfo.notes,
    });
    await createNotification(
      seller.user_id,
      "order",
      `New order: ${item.title}`,
      `${orderInfo.name || buyer?.full_name || "A buyer"} ordered ${quantity}× ${item.title} for ${totalPrice.toLocaleString()} ${item.currency || "USD"}.`,
      "/profile"
    );
    setProcessing(false);
    setStep("success");
    onPurchased?.();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" style={{ backgroundColor: 'hsl(var(--card))' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 border-b border-border/50 px-5 py-3 flex items-center justify-between z-10" style={{ backgroundColor: 'hsl(var(--card))' }}>
          <h2 className="font-display text-base font-bold">
            {step === "success" ? "Order Placed!" : "Checkout"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        {/* Product Details Step */}
        {step === "details" && (
          <div className="p-5 space-y-4">
            {/* Product */}
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-xl bg-secondary/20 overflow-hidden shrink-0">
                {images[0] ? <img src={images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><ShoppingBag className="w-6 h-6" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{item.title}</h3>
                {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                <p className="text-amber-600 font-bold text-lg mt-1">{unitPrice.toLocaleString()} <span className="text-xs font-normal">{item.currency || "USD"}</span></p>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <Label className="text-sm">Quantity</Label>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-lg font-medium hover:bg-secondary">−</button>
                <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-lg font-medium hover:bg-secondary">+</button>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <span className="text-sm font-medium">Total</span>
              <span className="text-xl font-bold text-amber-600">{totalPrice.toLocaleString()} {item.currency || "USD"}</span>
            </div>

            <Button onClick={() => setStep("checkout")} className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
              Continue to Checkout
            </Button>
          </div>
        )}

        {/* Checkout Step */}
        {step === "checkout" && (
          <div className="p-5 space-y-4">
            <div className="flex gap-3 p-3 rounded-xl bg-secondary/20">
              <div className="w-12 h-12 rounded-lg bg-secondary/30 overflow-hidden shrink-0">
                {images[0] ? <img src={images[0]} alt="" className="w-full h-full object-cover" /> : <ShoppingBag className="w-5 h-5 text-muted-foreground/30 m-auto mt-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">{quantity} × {unitPrice.toLocaleString()} {item.currency || "USD"}</p>
              </div>
              <p className="text-sm font-bold text-amber-600">{totalPrice.toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Full Name</Label>
                <Input value={orderInfo.name} onChange={e => setOrderInfo({...orderInfo, name: e.target.value})} placeholder="Your name" className="mt-1 h-10" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Phone</Label>
                  <Input value={orderInfo.phone} onChange={e => setOrderInfo({...orderInfo, phone: e.target.value})} placeholder="+1 234 567 8900" className="mt-1 h-10" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={orderInfo.email} onChange={e => setOrderInfo({...orderInfo, email: e.target.value})} placeholder="you@email.com" className="mt-1 h-10" />
                </div>
              </div>
              <div>
                <Label>Delivery Address</Label>
                <Input value={orderInfo.address} onChange={e => setOrderInfo({...orderInfo, address: e.target.value})} placeholder="Street, City, Area" className="mt-1 h-10" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input value={orderInfo.notes} onChange={e => setOrderInfo({...orderInfo, notes: e.target.value})} placeholder="Size, color, special instructions..." className="mt-1 h-10" />
              </div>
              {/* Coupon Code */}
              <div>
                <Label className="flex items-center gap-1"><Tag className="w-3.5 h-3.5 text-amber-500" /> Coupon Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); }}
                    placeholder="Enter code (e.g. SAVE20)"
                    className="h-10 font-mono tracking-widest"
                  />
                  <Button variant="outline" className="h-10 rounded-xl shrink-0" onClick={validateCoupon} disabled={validatingCoupon || !couponCode.trim()}>
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
                {couponData?.valid && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Coupon applied — you save {couponData.discount.toLocaleString()} {item.currency || "USD"}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              {discount > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{subtotal.toLocaleString()} {item.currency || "USD"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">Discount ({couponData.coupon.code})</span>
                    <span className="text-green-600">−{discount.toLocaleString()} {item.currency || "USD"}</span>
                  </div>
                  <div className="border-t border-amber-200 pt-1" />
                </>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Total Amount</p>
                <p className="text-xl font-bold text-amber-600">{totalPrice.toLocaleString()} {item.currency || "USD"}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">💳 Pay with Chapa (ETB) or Stripe (cards, wallets & local methods) — or place a COD order</p>

            <div className="grid grid-cols-1 gap-2">
              {/* ── Chapa — primary ETB payment ── */}
              <Button
                disabled={processing || !orderInfo.name || !orderInfo.phone}
                className="w-full h-11 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
                onClick={async () => {
                  setProcessing(true);
                  try {
                    const { data } = await client.post("/api/orders/checkout/chapa", {
                      product_id:       item.id,
                      product_title:    item.title,
                      unit_price:       unitPrice,
                      quantity,
                      seller_id:        seller.user_id,
                      buyer_name:       orderInfo.name || buyer?.full_name || "",
                      buyer_email:      orderInfo.email || buyer?.email || "",
                      buyer_phone:      orderInfo.phone || "",
                      delivery_address: orderInfo.address,
                      notes:            orderInfo.notes,
                      coupon_discount:  discount,
                    });
                    if (data?.checkout_url) {
                      setChapaTxRef(data.tx_ref);
                      // Open Chapa in a new tab so modal stays open for polling
                      window.open(data.checkout_url, '_blank', 'width=500,height=700,noopener');
                      setStep("chapa_pending");
                    } else {
                      toast.error("Chapa checkout unavailable — use Place Order instead");
                    }
                  } catch (e) {
                    toast.error(e?.response?.data?.error || "Chapa payment unavailable. Use COD or add CHAPA_SECRET_KEY.");
                  }
                  setProcessing(false);
                }}
              >
                {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opening Chapa...</> : `🇪🇹 Pay with Chapa • ${totalPrice.toLocaleString()} ETB`}
              </Button>

              {/* ── Stripe — hosted checkout with all payment methods ── */}
              <Button
                disabled={processing || !orderInfo.name || !orderInfo.phone}
                className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-semibold shadow-sm"
                onClick={async () => {
                  setProcessing(true);
                  try {
                    // Prices are recomputed server-side from the DB — we only
                    // send identifiers, quantity and the coupon code.
                    const { data } = await client.post("/api/orders/checkout/session", {
                      product_id:       item.id,
                      quantity,
                      coupon_code:      couponData?.valid ? couponCode.trim() : undefined,
                      buyer_name:       orderInfo.name || buyer?.full_name || "",
                      buyer_email:      orderInfo.email || buyer?.email || "",
                      buyer_phone:      orderInfo.phone || "",
                      delivery_address: orderInfo.address,
                      notes:            orderInfo.notes,
                    });
                    if (data?.url) {
                      const conv = data.display?.converted;
                      if (conv) {
                        toast.info(`You'll be charged ${conv.total.toLocaleString()} ${conv.currency} ≈ ${data.display.total.toLocaleString()} ETB`);
                      }
                      window.location.href = data.url; // Stripe handles success/cancel redirects
                      return; // keep spinner up while redirecting
                    }
                    toast.error("Stripe checkout unavailable — use Chapa or Place Order instead");
                  } catch (e: any) {
                    toast.error(e?.response?.data?.error || "Stripe unavailable. Use Chapa or Place Order.");
                  }
                  setProcessing(false);
                }}
              >
                {processing
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opening secure checkout...</>
                  : `💳 Pay with Card & Wallets • ${totalPrice.toLocaleString()} ${item.currency || "USD"}`}
              </Button>
              <Button onClick={handleCheckout} disabled={processing || !orderInfo.name || !orderInfo.phone} className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Placing Order...</> : `Place Order (COD) • ${totalPrice.toLocaleString()} ${item.currency || "USD"}`}
              </Button>
            </div>
          </div>
        )}

        {/* Chapa Pending Step */}
        {step === "chapa_pending" && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">Waiting for Payment</h3>
              <p className="text-sm text-muted-foreground mt-1">Complete your payment in the Chapa window. This page will update automatically.</p>
            </div>
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-left space-y-1">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-bold text-green-700">{totalPrice.toLocaleString()} ETB</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Product</span><span className="font-medium">{item.title}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs text-muted-foreground">{chapaTxRef}</span></div>
            </div>
            <p className="text-xs text-muted-foreground">Checking payment status every 3 seconds...</p>
            <Button variant="outline" className="w-full rounded-full" onClick={() => setStep("checkout")}>
              ← Go back
            </Button>
          </div>
        )}

        {/* Success Step */}
        {step === "success" && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">Order Placed Successfully!</h3>
              <p className="text-sm text-muted-foreground mt-1">The seller has been notified and will contact you shortly to arrange payment and delivery.</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 text-left">
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Product</span><span className="font-medium">{item.title}</span></div>
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Quantity</span><span className="font-medium">{quantity}</span></div>
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Seller</span><span className="font-medium">{seller.business_name || seller.display_name}</span></div>
              <div className="flex justify-between text-sm pt-2 border-t border-border/30 mt-2"><span className="font-medium">Total</span><span className="font-bold text-amber-600">{totalPrice.toLocaleString()} {item.currency || "USD"}</span></div>
            </div>
            <Button onClick={onClose} className="w-full h-11 rounded-full">Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}
