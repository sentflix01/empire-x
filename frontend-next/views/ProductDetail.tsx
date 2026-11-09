'use client';
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReviewsSection from "@/components/product/ReviewsSection";
import client from "@/api/client";
import { useAuth } from "@/lib/AuthContext";

import { ArrowLeft, Heart, ShoppingCart, MapPin, Star, Shield, MessageCircle, Bell, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/CartContext";
import ShareButton from "@/components/ui/ShareButton";
import PurchaseModal from "@/components/checkout/PurchaseModal";
import { toast } from "sonner";
import ErrorBoundary from '@/components/ErrorBoundary';
import SignInRequired, { isSignInRequired } from '@/components/auth/SignInRequired';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import { useStartChat } from '@/lib/messaging';

function ProductDetail() {
  const params = useParams();
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = typeof idParam === 'string' ? idParam : '';
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();
  const chat = useStartChat();
  const userId = user?.id;
  const [product, setProduct] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [alertTarget, setAlertTarget] = useState("");
  const [alertInput, setAlertInput] = useState("");
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState<any>(null);
  const [signInRequired, setSignInRequired] = useState(false);
  const productRequestId = useRef(0);

  const loadProduct = useCallback(async () => {
    const requestId = ++productRequestId.current;
    setLoading(true);
    setProduct(null);
    setSignInRequired(false);
    setSeller(null);
    setWishlisted(false);
    setAlertActive(false);
    setAlertTarget("");
    try {
      const p = await client.get(`/api/products/${id}`).then(r => r.data).catch((err) => { if (isSignInRequired(err)) throw err; return null; })
        || await import("@/api/entities").then(m => m.entities.Product.get(id));
      if (requestId !== productRequestId.current) return;
      setProduct(p);
      // Show the product now; the seller card fills in when it arrives.
      // Wishlist and price-alert state load in the signed-in effect below, and
      // the server counts the view when it serves GET /api/products/:id.
      setLoading(false);
      if (p?.seller_id) {
        import("@/api/entities")
          .then(({ entities: entitiesApi }) => entitiesApi.UserProfile.filter({ user_id: p.seller_id }))
          .then(profiles => { if (requestId === productRequestId.current && profiles.length) setSeller(profiles[0]); })
          .catch(() => { /* seller details can be retried by reloading the product */ });
      }
    } catch (err) {
      // Otherwise surfaced by the empty product state.
      if (requestId === productRequestId.current) setSignInRequired(isSignInRequired(err));
    }
    if (requestId === productRequestId.current) setLoading(false);
  }, [id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Re-check wishlist when user logs in
  useEffect(() => {
    if (!userId || !id) return;
    client.get(`/api/wishlists/check/${id}`)
      .then(r => setWishlisted(r.data.wishlisted))
      .catch(() => {});
    client.get("/api/wishlists/price-alerts")
      .then(r => {
        const existing = r.data.find((a: any) => a.product_id === id);
        if (existing) { setAlertActive(true); setAlertTarget(String(existing.target_price)); }
      })
      .catch(() => {});
  }, [id, userId]);

  const handleWishlist = async () => {    setWishlistLoading(true);
    try {
      if (wishlisted) {
        await client.delete(`/api/wishlists/${id}`);
        setWishlisted(false);
        toast.success("Removed from wishlist");
      } else {
        await client.post("/api/wishlists", { product_id: id });
        setWishlisted(true);
        toast.success("Added to wishlist! ❤️");
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to update wishlist"));
    }
    setWishlistLoading(false);
  };

  const handleSetAlert = async () => {
    const price = parseFloat(alertInput);
    if (!alertInput || isNaN(price) || price <= 0) { toast.error("Enter a valid target price"); return; }
    setAlertSaving(true);
    try {
      await client.post("/api/wishlists/price-alerts", { product_id: id, target_price: price });
      setAlertActive(true);
      setAlertTarget(String(price));
      setShowAlertForm(false);
      setAlertInput("");
      toast.success(`🔔 Alert set! We'll notify you when price drops to ${price.toLocaleString()} ${product?.currency || "USD"}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to set alert"));
    }
    setAlertSaving(false);
  };

  const handleRemoveAlert = async () => {
    try {
      await client.delete(`/api/wishlists/price-alerts/${id}`);
      setAlertActive(false); setAlertTarget(""); setShowAlertForm(false);
      toast.success("Price alert removed");
    } catch { toast.error("Failed to remove alert"); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!product && signInRequired) return <SignInRequired />;
  if (!product) return <div className="text-center py-20"><p>Product not found</p></div>;

  const images: string[] = (() => {
    try {
      const parsed = typeof product.images === "string" ? JSON.parse(product.images) : product.images;
      if (Array.isArray(parsed)) return parsed.filter((image): image is string => typeof image === "string" && image.length > 0);
      return typeof parsed === "string" && parsed.length > 0 ? [parsed] : [];
    } catch {
      return typeof product.images === "string" && product.images.length > 0 ? [product.images] : [];
    }
  })();
  const inStock = product.stock === null || product.stock > 0;

  return (
    <div data-page-guide="product-title" className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {user?.id === product.seller_id && (
        <div className="flex justify-end mb-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => router.push(`/products/edit?id=${encodeURIComponent(product.id)}`)}>Edit Product</Button>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        {/* Image Gallery */}
        <div className="aspect-square bg-secondary/30 relative overflow-hidden">
          {images.length > 0 ? (
            <Image src={images[selectedImage]} alt={product.title} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-6xl">🛍️</div>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Badge className="text-base px-4 py-1.5 bg-black/70 text-white border-0">Out of Stock</Badge>
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto">
            {images.map((img, i) => (
              <button key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all relative ${i === selectedImage ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                <Image src={img} alt={`${product.title} thumbnail`} fill className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}

        {/* Details */}
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold leading-tight">{product.title}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {product.category && <Badge variant="secondary">{product.category}</Badge>}
                {product.condition && <Badge variant="outline" className="text-xs">{product.condition}</Badge>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-primary">{product.price?.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{product.currency || "ETB"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className={`font-medium ${inStock ? "text-success" : "text-destructive"}`}>
              {inStock ? (product.stock ? `${product.stock} in stock` : "In stock") : "Out of stock"}
            </span>
            {product.view_count > 0 && <span>{product.view_count} views</span>}
            {Number(product.average_rating) > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-rating fill-rating" />
                {Number(product.average_rating).toFixed(1)}
                {product.review_count > 0 && (
                  <span className="text-muted-foreground ml-0.5">({product.review_count})</span>
                )}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {product.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" /> {product.location}
            </div>
          )}

          {seller && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30">
              <Link href={`/profile/${product.seller_id}`} className="flex flex-1 min-w-0 items-center gap-3 rounded-lg hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {seller.display_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{seller.display_name}</p>
                  <p className="text-xs text-muted-foreground">{seller.headline || "Seller on Nodbusiness"}</p>
                </div>
              </Link>
              {String(user?.id) !== String(product.seller_id) && (
                // Opens the chat with the business, with this product's card at the top.
                <Button type="button" size="sm" variant="outline" className="rounded-full min-h-9 shrink-0" disabled={chat.busy}
                  onClick={() => void chat.start({
                    businessId: product.business_id ?? null,
                    userId: product.seller_id,
                    context: product.business_id ? { kind: 'product', id: product.id } : undefined,
                  })}>
                  <MessageCircle className="w-4 h-4 mr-1" aria-hidden="true" />Message seller
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-success" /> Pay the seller directly</div>
          </div>

          <div className="flex gap-2 pt-1">
            {user?.id !== product.seller_id && (
              <Button onClick={() => setPurchaseItem(product)} disabled={!inStock}
                className="flex-1 h-11 rounded-full bg-brand-secondary hover:bg-brand-secondary/90 font-semibold">
                <Zap className="w-4 h-4 mr-2" /> Buy Now
              </Button>
            )}
            {user && (
              <Button onClick={() => addItem(product.id)} disabled={!inStock} variant="outline"
                className="flex-1 h-11 rounded-full border-primary/30 text-primary hover:bg-primary-subtle font-semibold">
                <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
              </Button>
            )}
            <Button variant="outline" size="icon"
              className={`h-11 w-11 rounded-full transition-colors ${wishlisted ? "text-destructive border-destructive/30 bg-destructive-subtle" : ""}`}
              onClick={handleWishlist} disabled={wishlistLoading}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={wishlisted}>
              <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} aria-hidden="true" />
            </Button>
            <ShareButton title={product.title} text={product.description?.slice(0, 100)} url={typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_APP_URL || ''}/products/${id}`} size="md" label="Share" />
          </div>

          {/* Price Alert */}
          {user && user.id !== product.seller_id && (
            <div className="pt-1">
              {alertActive ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-subtle border border-primary/30">
                  <Bell className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-primary flex-1">
                    Alert active — notifying you when price drops to <strong>{parseFloat(alertTarget).toLocaleString()} {product.currency || "ETB"}</strong>
                  </p>
                  <button onClick={handleRemoveAlert} className="text-xs text-warning hover:text-destructive font-medium transition-colors">Remove</button>
                </div>
              ) : showAlertForm ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/40 border border-border/50">
                  <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="number"
                    value={alertInput}
                    onChange={e => setAlertInput(e.target.value)}
                    placeholder={`Target price (${product.currency || "ETB"})`}
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    onKeyDown={e => { if (e.key === "Enter") handleSetAlert(); }}
                    autoFocus
                  />
                  <button onClick={handleSetAlert} disabled={alertSaving}
                    className="text-xs font-semibold text-primary hover:text-primary disabled:opacity-50 transition-colors">
                    {alertSaving ? "Saving…" : "Set"}
                  </button>
                  <button onClick={() => { setShowAlertForm(false); setAlertInput(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowAlertForm(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Bell className="w-3.5 h-3.5" /> Set price drop alert
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ReviewsSection productId={id} currentUser={user?.id ? { id: user.id } : null} />

      {/* Purchase modal — same pattern as BusinessProfile */}
      {purchaseItem && (
        <PurchaseModal
          item={purchaseItem}
          seller={{
            user_id: product.seller_id,
            display_name: seller?.display_name,
            business_name: seller?.business_name,
          }}
          buyer={user ?? undefined}
          onClose={() => setPurchaseItem(null)}
        />
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  return <ErrorBoundary><ProductDetail /></ErrorBoundary>;
}
