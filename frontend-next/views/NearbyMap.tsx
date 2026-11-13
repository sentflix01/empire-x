'use client';
import DistanceRange from '@/components/ui/DistanceRange';
import { HEX, Z } from '@/lib/colorTokens';
import Link from 'next/link';
import { markerLabelHtml } from "@/lib/mapLabel";
import Image from 'next/image';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import client from "@/api/client";
import { entities, type Post, type UserProfile } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";

import { MapPin, ShoppingBag, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import ProfilePeek from "@/components/profile/ProfilePeek";
import ErrorBoundary from '@/components/ErrorBoundary';
import UserIdentity from '@/components/ui/UserIdentity';
import type * as Leaflet from "leaflet";
import type * as ReactLeaflet from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";

import { firstImage } from "@/lib/spotlightTiles";
import { formatAmount } from "@/lib/money";
import { resolveMediaUrl } from "@/lib/media";

// Leaflet modules — assigned after dynamic import inside loadLeaflet()
// We CANNOT use require() or static import because Turbopack processes CSS imports at build time
// Instead we use dynamic import() which is truly deferred
let MapContainer: typeof ReactLeaflet.MapContainer | undefined;
let TileLayer: typeof ReactLeaflet.TileLayer | undefined;
let Marker: typeof ReactLeaflet.Marker | undefined;
let Circle: typeof ReactLeaflet.Circle | undefined;
let MarkerClusterGroup: React.ComponentType<{ chunkedLoading?: boolean; maxClusterRadius?: number; showCoverageOnHover?: boolean; children?: React.ReactNode }> | undefined;
let L: typeof Leaflet | undefined;
let leafletLoaded = false;

async function loadLeaflet() {
  if (typeof window === 'undefined') return;
  if (leafletLoaded && MapContainer && TileLayer && Marker && Circle && MarkerClusterGroup && L) return;
  leafletLoaded = true;
  try {

  // Inject CSS via link tags (avoids Turbopack CSS factory issue — no require/import of CSS)
  const addCSS = (href: string) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };
  addCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  addCSS('https://unpkg.com/react-leaflet-cluster@2.1.0/lib/index.css');

  const [rl, leaflet, cluster] = await Promise.all([
    import("react-leaflet"),
    import("leaflet"),
    import("react-leaflet-cluster"),
  ]);

  MapContainer = rl.MapContainer;
  TileLayer = rl.TileLayer;
  Marker = rl.Marker;
  Circle = rl.Circle;
  // react-leaflet-cluster default export is the MarkerClusterGroup component
  MarkerClusterGroup = ((cluster as { default?: unknown }).default ?? cluster) as typeof MarkerClusterGroup;
  const leafletLib = leaflet.default;
  L = leafletLib;

    delete (leafletLib.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
  leafletLib.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
  } catch (error) {
    leafletLoaded = false;
    MapContainer = TileLayer = Marker = Circle = MarkerClusterGroup = L = undefined;
    throw error;
  }
}

const DEFAULT_CENTER: [number, number] = [9.005401, 38.763611];
const DEFAULT_RADIUS = 20;

/** DivIcon with a colored pin + name label chip floating above */
type PinColor = "gold" | "red" | "blue" | "green";

function makeLabeledIcon(label: string, color: PinColor = "blue") {
  const pinUrls = {
    // "gold" marks businesses: violet, the business identity colour (F-046).
    gold:  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
    red:   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    blue:  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    green: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  };
  const accentColors: Record<PinColor, string> = { gold: HEX.brandSecondary, red: HEX.destructive, blue: HEX.primary, green: HEX.success };
  const accent = accentColors[color] || HEX.primary;
  // Escaped: names come from the database and this HTML is set with innerHTML (audit F-057).
  const truncated = markerLabelHtml(label);

  const bubbleHtml = `<div style="position:absolute;bottom:49px;left:50%;transform:translateX(-50%);background:#fff;color:${HEX.inverse};font-size:11px;font-weight:700;font-family:system-ui,sans-serif;white-space:nowrap;padding:5px 10px;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,0.25);pointer-events:none;line-height:1.4;border:1.5px solid ${accent};z-index:2;">${truncated}<div style="position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:9px solid ${accent};"></div><div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #fff;"></div></div>`;

  const pinHtml = `<img loading="lazy" src="${pinUrls[color]}" alt="" width="25" height="41" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);z-index:1;" />`;

  if (!L) return undefined;
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;width:120px;height:41px;overflow:visible;margin-left:-47px;">${bubbleHtml}${pinHtml}</div>`,
    iconSize:   [120, 41],
    iconAnchor: [60, 41],
  });
}

/** Hover card — replaces name bubble on mouseover */
interface HoverCardData {
  ownerId?: string;
  view: "personal" | "business";
  name?: string;
  category?: string | null;
  distanceKm?: number;
  x: number;
  y: number;
}

interface SelectedMarker { ownerId: string; view: "personal" | "business" }

/** A product from GET /api/maps/nearby (backend routes/maps.ts). NUMERIC columns arrive as decimal strings. */
interface NearbyProduct {
  id: string;
  seller_id: string;
  title?: string | null;
  price?: number | string | null;
  currency?: string | null;
  images?: unknown;
  category?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  distance_km: number;
}

/** Hover position: the pin's screen rectangle, or the pointer when it cannot be found. */
function pinPosition(e: LeafletMouseEvent): { x: number; y: number } {
  const target = e.originalEvent.target as Element | null;
  const rect = target?.closest?.(".leaflet-marker-icon")?.getBoundingClientRect();
  return { x: rect ? rect.left + rect.width / 2 : e.originalEvent.clientX, y: rect ? rect.top : e.originalEvent.clientY };
}

function MarkerHoverCard({ data, onClose: _onClose }: { data: HoverCardData & { ownerId: string }; onClose: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      entities.UserProfile.filter({ user_id: data.ownerId }).catch(() => [] as UserProfile[]),
      entities.Post.filter({ author_id: data.ownerId }, "-created_at", 3).catch(() => [] as Post[]),
    ]).then(([profiles, userPosts]) => {
      if (cancelled) return;
      if (profiles.length) setProfile(profiles[0]);
      setPosts(userPosts);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [data.ownerId]);

  const cardW = 230;
  const left = Math.min(Math.max(data.x - cardW / 2, 8), window.innerWidth - cardW - 8);
  // icon container is 41px tall; pin tip is at the bottom = data.y + 41
  const pinTipY = data.y + 41;
  const top = Math.max(pinTipY - 12 - 200, 8);
  const accentColor = data.view === "business" ? HEX.brandSecondary : HEX.primary;

  return createPortal(
    <div style={{ position:"fixed", left, top, width: cardW, zIndex: Z.overlay, pointerEvents:"none" }}>
      <motion.div
        initial={{ y:8, scale:0.95 }}
        animate={{ y:0, scale:1 }}
        exit={{ y:4, scale:0.95 }}
        transition={{ duration:0.08 }}
        style={{ position:"relative", backgroundColor:"hsl(var(--card))", opacity:1 }}
        className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-visible"
      >
        <div style={{ height:3, background:accentColor, borderRadius:"12px 12px 0 0" }} />

        <div className="px-3 pt-2.5 pb-2">
          <UserIdentity
            size="sm"
            displayName={data.name ?? '?'}
            avatarUrl={resolveMediaUrl(profile?.avatar_url)}
            businessName={data.category ?? null}
            subtitle={
              data.distanceKm != null
                ? data.distanceKm < 1
                  ? `${Math.round(data.distanceKm * 1000)}m away`
                  : `${data.distanceKm.toFixed(1)} km away`
                : undefined
            }
          />
        </div>

        {loading ? (
          <div className="px-3 pb-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-3 h-3 rounded-full animate-spin"
              style={{ border:`2px solid ${accentColor}33`, borderTopColor:accentColor }} />
            Loading feed…
          </div>
        ) : posts.length > 0 ? (
          <div className="border-t border-border/40 px-3 py-2 space-y-1">
            {posts.slice(0, 2).map((p) => (
              <p key={p.id} className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                {p.content?.slice(0, 80)}{(p.content?.length ?? 0) > 80 ? "…" : ""}
              </p>
            ))}
          </div>
        ) : (
          <div className="px-3 pb-3 text-[10px] text-muted-foreground">No posts yet</div>
        )}

        <div className="px-3 pb-2 text-[9px] text-center text-muted-foreground">
          Double-click to open full profile
        </div>

        {/* Tail border */}
        <div style={{ position:"absolute", bottom:-9, left:"50%", transform:"translateX(-50%)",
          width:0, height:0, borderLeft:"9px solid transparent", borderRight:"9px solid transparent",
          borderTop:"9px solid hsl(var(--border))" }} />
        {/* Tail fill */}
        <div style={{ position:"absolute", bottom:-7, left:"50%", transform:"translateX(-50%)",
          width:0, height:0, borderLeft:"8px solid transparent", borderRight:"8px solid transparent",
          borderTop:"8px solid hsl(var(--card))" }} />
      </motion.div>
    </div>,
    document.body
  );
}

function NearbyMap() {
  const { user: currentUser } = useAuth();
  const [leafletReady, setLeafletReady] = useState(false);
  const [location, setLocation]     = useState<{ lat: number; lon: number } | null>(null);
  const [products, setProducts]     = useState<NearbyProduct[]>([]);
  const [loading, setLoading]       = useState(false);
  const [locating, setLocating]     = useState(false);
  const [radiusKm, setRadiusKm]     = useState(DEFAULT_RADIUS);

  // selectedMarker drives the ProfilePeek modal
  // { ownerId: string; view: "personal" | "business" }
  const [selectedMarker, setSelectedMarker] = useState<SelectedMarker | null>(null);

  // hoverCard driven by mouseover
  const [hoverCard, setHoverCard] = useState<HoverCardData | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapRef = useRef<Leaflet.Map | null>(null);

  // Load Leaflet async — only runs client-side, sets leafletReady when done
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => { if (!cancelled) setLeafletReady(true); })
      .catch(() => { if (!cancelled) toast.error("Map failed to load. Check your connection and try again."); });
    return () => { cancelled = true; };
  }, []);

  const fetchNearby = useCallback(async (coords: { lat: number; lon: number }, radius = radiusKm) => {
    setLoading(true);
    try {
      const productRes = await client.get("/api/maps/nearby", { params: { lat: coords.lat, lon: coords.lon, radius: radius, type: 'products' } });
      setProducts(productRes.data?.products || []);
    } catch {
      toast.error("Failed to load nearby items");
    }
    setLoading(false);
  }, [radiusKm]);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported in this browser");
      const coords = { lat: DEFAULT_CENTER[0], lon: DEFAULT_CENTER[1] };
      setLocation(coords);
      // Still list products around the default centre (this used to stop here, so the list stayed empty).
      fetchNearby(coords);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocation(coords);
        setLocating(false);
        fetchNearby(coords);
        toast.success("Location found!");
      },
      () => {
        setLocating(false);
        const coords = { lat: DEFAULT_CENTER[0], lon: DEFAULT_CENTER[1] };
        setLocation(coords);
        fetchNearby(coords);
        toast.info("Unable to detect location. Please enable location access.");
      },
      { timeout: 8000 }
    );
  }, [fetchNearby]);

  useEffect(() => {
    handleLocate();
  }, [handleLocate]);

  const center: [number, number] = location ? [location.lat, location.lon] : DEFAULT_CENTER;

  const openMarker = (ownerId: string, view: SelectedMarker["view"] = "business") => {
    setSelectedMarker({ ownerId, view });
  };

  // The map parts, once Leaflet has loaded (local names keep the narrowing inside callbacks).
  const map = leafletReady && MapContainer && TileLayer && Marker && Circle && MarkerClusterGroup
    ? { MapContainer, TileLayer, Marker, Circle, MarkerClusterGroup }
    : null;

  // Loading fallback while Leaflet is being loaded
  const MapLoadingFallback = () => (
    <div className="w-full h-full flex items-center justify-center bg-secondary/30">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold">Nearby</h1>
            <p className="text-xs text-muted-foreground">Local products near you</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleLocate}
            disabled={locating}
            className="rounded-full bg-primary hover:bg-primary/90"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            <span className="ml-1.5 hidden sm:inline">Locate Me</span>
          </Button>
        </div>
      </div>

      {/* How far to look: chosen freely, not from a fixed list */}
      <DistanceRange id="nearby-distance" value={radiusKm} className="mb-4 rounded-2xl border border-border/50 bg-card p-3"
        onChange={(km) => { const r = km ?? DEFAULT_RADIUS; setRadiusKm(r); if (location) fetchNearby(location, r); }} />

      {/* Map */}
      <div
        className="rounded-2xl overflow-hidden border border-border/50 shadow-sm mb-4 relative"
        style={{ height: "380px" }}
      >
        {/* Hint badge */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-raised pointer-events-none">
          <span
            className="flex items-center gap-1.5 px-3 py-1 bg-card text-card-foreground border border-border text-[11px] font-medium rounded-full shadow-lg whitespace-nowrap"
            style={{ backgroundColor:"hsl(var(--card))", opacity:1 }}
          >
            <span className="text-primary">👆</span> Hover pin to preview · Double-click to open profile
          </span>
        </div>

        {!map ? (
          <MapLoadingFallback />
        ) : (
          <map.MapContainer
            className="isolate"
            center={center}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
            doubleClickZoom={false}
          >
            <map.TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Gold pin — your location — labeled with your name */}
            {location && (
              <>
                <map.Marker
                  position={[location.lat, location.lon]}
                  icon={makeLabeledIcon(currentUser?.full_name ?? "You", "gold")}
                  eventHandlers={{
                    mouseover: (e: LeafletMouseEvent) => {
                      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                      setHoverCard({
                        ownerId: currentUser?.id,
                        view: "personal",
                        name: currentUser?.full_name ?? "You",
                        ...pinPosition(e),
                      });
                    },
                    mouseout: () => { setHoverCard(null); },
                    dblclick: (e: LeafletMouseEvent) => {
                      e.originalEvent?.stopPropagation?.();
                      setHoverCard(null);
                      if (currentUser?.id) openMarker(currentUser.id, "personal");
                    },
                  }}
                />
                <map.Circle
                  center={[location.lat, location.lon]}
                  radius={radiusKm * 1000}
                  pathOptions={{
                    color: HEX.primary,
                    fillColor: HEX.primary,
                    fillOpacity: 0.07,
                    weight: 1.5,
                    dashArray: "6",
                  }}
                />
              </>
            )}

            {/* Product markers — clustered when many pins overlap */}
            <map.MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={50}
              showCoverageOnHover={false}
            >
            {/* Product markers — labeled with product title */}
            {products.filter(p => p.latitude != null && p.longitude != null).map(p => (
              <map.Marker
                key={p.id}
                position={[Number(p.latitude), Number(p.longitude)]}
                icon={makeLabeledIcon(p.title ?? "Product", "blue")}
                eventHandlers={{
                  mouseover: (e: LeafletMouseEvent) => {
                    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                    setHoverCard({
                      ownerId: p.seller_id,
                      view: "business",
                      name: p.title ?? "Product",
                      category: p.category,
                      distanceKm: p.distance_km,
                      ...pinPosition(e),
                    });
                  },
                  mouseout: () => { setHoverCard(null); },
                  dblclick: (e: LeafletMouseEvent) => {
                    e.originalEvent?.stopPropagation?.();
                    setHoverCard(null);
                    openMarker(p.seller_id, "business");
                  },
                }}
              />
            ))}
            </map.MarkerClusterGroup>
          </map.MapContainer>
        )}
      </div>

      {/* ProfilePeek modal — double-click */}
      <AnimatePresence>
        {selectedMarker && (
          <ProfilePeek
            key={selectedMarker.ownerId}
            authorId={selectedMarker.ownerId}
            initialView={selectedMarker.view}
            onClose={() => setSelectedMarker(null)}
          />
        )}
      </AnimatePresence>

      {/* Hover card — mouseover */}
      <AnimatePresence>
        {hoverCard && hoverCard.ownerId && (
          <MarkerHoverCard data={{ ...hoverCard, ownerId: hoverCard.ownerId }} onClose={() => setHoverCard(null)} />
        )}
      </AnimatePresence>

      <div className="mb-4 rounded-xl border border-border/50 bg-card px-4 py-2 text-sm text-muted-foreground">{products.length} nearby products</div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        products.length === 0 ? (
          <EmptyState icon={ShoppingBag} message={`No products within ${radiusKm} km`} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => {
              const image = firstImage(p.images);
              return (
                <div
                  key={p.id}
                  onDoubleClick={() => openMarker(p.seller_id, "business")}
                  className="bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <Link href={`/products/${p.id}`} onClick={e => e.stopPropagation()}>
                    <div className="aspect-square bg-secondary/20 overflow-hidden relative">
                      {image
                        ? <Image src={image} alt={p.title ?? "Product"} fill className="object-cover" unoptimized />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-muted-foreground/20" /></div>
                      }
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate">{p.title}</p>
                      <p className="text-xs text-primary font-bold mt-0.5">{formatAmount(p.price)} {p.currency}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />{p.distance_km?.toFixed(1)} km
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
      <Icon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">Try increasing the radius or moving to a different area</p>
    </div>
  );
}

export default function NearbyMapPage() {
  return <ErrorBoundary><NearbyMap /></ErrorBoundary>;
}
