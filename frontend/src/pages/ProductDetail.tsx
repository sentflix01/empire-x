// @ts-nocheck
import React, { useState, useEffect } from "react";
import ReviewsSection from "@/components/product/ReviewsSection";
import client from "@/api/client";
import { auth } from "@/api/auth";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, Share2, ShoppingCart, MapPin, Star, Truck, Shield, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/CartContext";
import ShareButton from "@/components/ui/ShareButton";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const p = await client.get(`/api/products/${id}`).then(r => r.data).catch(() => null)
        || await import("@/api/entities").then(m => m.entities.Product.get(id));
      setProduct(p);
      // Check wishlist
      try {
        const me = await auth.me();
        setUser(me);
        const { data } = await client.get(`/api/wishlists/check/${id}`);
        setWishlisted(data.wishlisted);
      } catch {}
      // Load seller profile
      if (p?.seller_id) {
        try {
          const { default: entities_m } = await import("@/api/entities");
          const profiles = await entities_m.entities.UserProfile.filter({ user_id: p.seller_id });
          if (profiles.length) setSeller(profiles[0]);
        } catch {}
      }
      // Increment view count
      if (p?.id) {
        import("@/api/entities").then(m => m.entities.Product.update(p.id, { view_count: (p.view_count || 0) + 1 })).catch(() => {});
      }
    } catch {}
    setLoading(false);
  };

  const handleWishlist = async () => {
    setWishlistLoading(true);
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
      toast.error(e?.response?.data?.error || "Failed to update wishlist");
    }
    setWishlistLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
  if (!product) return <div className="text-center py-20"><p>Product not found</p></div>;

  const images = (() => { try { return JSON.parse(product.images); } catch { return product.images ? [product.images] : []; } })();
  const inStock = product.stock === null || product.stock > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {user?.id === product.seller_id && (
        <div className="flex justify-end mb-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate(`/products/edit/${product.id}`)}>Edit Product</Button>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        {/* Image Gallery */}
        <div className="aspect-square bg-secondary/30 relative overflow-hidden">
          {images.length > 0 ? (
            <img src={images[selectedImage]} alt={product.title} className="w-full h-full object-cover" />
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
              <button key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${i === selectedImage ? "border-amber-500" : "border-transparent opacity-60 hover:opacity-100"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
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
              <p className="text-2xl font-bold text-amber-600">{product.price?.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{product.currency || "ETB"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className={`font-medium ${inStock ? "text-green-600" : "text-red-500"}`}>
              {inStock ? (product.stock ? `${product.stock} in stock` : "In stock") : "Out of stock"}
            </span>
            {product.view_count > 0 && <span>{product.view_count} views</span>}
            {product.average_rating > 0 && (
              <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {product.average_rating?.toFixed(1)}</span>
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
            <Link to={`/profile/${product.seller_id}`} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {seller.display_name?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{seller.display_name}</p>
                <p className="text-xs text-muted-foreground">{seller.headline || "Seller on Empire X"}</p>
              </div>
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
            </Link>
          )}

          <div className="flex gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-green-500" /> Buyer protected</div>
            <div className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-blue-500" /> Delivery available</div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={() => addToCart(product.id)} disabled={!inStock}
              className="flex-1 h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-semibold">
              <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
            </Button>
            <Button variant="outline" size="icon"
              className={`h-11 w-11 rounded-full transition-colors ${wishlisted ? "text-red-500 border-red-200 bg-red-50" : ""}`}
              onClick={handleWishlist} disabled={wishlistLoading}>
              <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
            </Button>
            <ShareButton title={product.title} text={product.description?.slice(0, 100)} url={window.location.href} size="md" />
          </div>
        </div>
      </div>

      <ReviewsSection productId={id} currentUser={user} />
    </div>
  );
}

