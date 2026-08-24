'use client';
import Link from 'next/link';
import Image from 'next/image';
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import client from "@/api/client";
import { entities } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { useTranslation } from 'react-i18next';

import { MapPin, ShoppingBag, ClipboardList, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import ProfilePeek from "@/components/profile/ProfilePeek";
import ErrorBoundary from '@/components/ErrorBoundary';

// Leaflet modules — assigned after dynamic import inside loadLeaflet()
// We CANNOT use require() or static import because Turbopack processes CSS imports at build time
// Instead we use dynamic import() which is truly deferred
let MapContainer: any, TileLayer: any, Marker: any, Circle: any;
let MarkerClusterGroup: any;
let L: any;
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
  MarkerClusterGroup = (cluster as any).default ?? cluster;
  L = leaflet.default;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
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

const DEFAULT_CENTER = [9.005401, 38.763611];
const DEFAULT_RADIUS = 20;

/** DivIcon with a colored pin + name label chip floating above */
function makeLabeledIcon(label, color = "blue") {
  const pinUrls = {
    gold:  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
    red:   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    blue:  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    green: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  };
  const accentColors = { gold:"#D4AF37", red:"#e53e3e", blue:"#3b82f6", green:"#22c55e" };
  const accent = accentColors[color] || "#3b82f6";
  const truncated = label && label.length > 20 ? label.slice(0, 18) + "…" : (label || "");

  const bubbleHtml = `<div style="position:absolute;bottom:49px;left:50%;transform:translateX(-50%);background:#fff;color:#111;font-size:11px;font-weight:700;font-family:system-ui,sans-serif;white-space:nowrap;padding:5px 10px;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,0.25);pointer-events:none;line-height:1.4;border:1.5px solid ${accent};z-index:2;">${truncated}<div style="position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:9px solid ${accent};"></div><div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #fff;"></div></div>`;

  const pinHtml = `<img loading="lazy" src="${pinUrls[color]}" width="25" height="41" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);z-index:1;" />`;

  if (!L) return undefined;
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;width:120px;height:41px;overflow:visible;margin-left:-47px;">${bubbleHtml}${pinHtml}</div>`,
    iconSize:   [120, 41],
    iconAnchor: [60, 41],
  });
}

/** Hover card — replaces name bubble on mouseover */
function MarkerHoverCard({ data, onClose }) {
  const [posts, setPosts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      entities.UserProfile.filter({ user_id: data.ownerId }).catch(() => []),
      entities.Post.filter({ author_id: data.ownerId }, "-created_at", 3).catch(() => []),
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
  const accentColor = data.view === "business" ? "#D4AF37" : "#3b82f6";

  return createPortal(
    <div style={{ position:"fixed", left, top, width: cardW, zIndex:999, pointerEvents:"none" }}>
      <motion.div
        initial={{ y:8, scale:0.95 }}
        animate={{ y:0, scale:1 }}
        exit={{ y:4, scale:0.95 }}
        transition={{ duration:0.08 }}
        style={{ position:"relative", backgroundColor:"hsl(var(--card))", opacity:1 }}
        className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-visible"
      >
        <div style={{ height:3, background:accentColor, borderRadius:"12px 12px 0 0" }} />

        <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-2">
          <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
            style={{ background:`linear-gradient(135deg, ${accentColor}cc, ${accentColor})` }}>
            {profile?.avatar_url
              ? <Image src={profile.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
              : (data.name?.charAt(0) ?? "?")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate leading-tight">{data.name}</p>
            {data.category && <p className="text-[10px] text-muted-foreground truncate">{data.category}</p>}
            {data.distanceKm != null && (
              <p className="text-[10px] font-semibold" style={{ color:accentColor }}>
                📍 {data.distanceKm < 1 ? `${Math.round(data.distanceKm*1000)}m` : `${data.distanceKm.toFixed(1)} km`} away
              </p>
            )}
          </div>
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
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [leafletReady, setLeafletReady] = useState(false);
  const [location, setLocation]     = useState(null);
  const [tasks, setTasks]           = useState([]);
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [locating, setLocating]     = useState(false);
  const [tab, setTab]               = useState("tasks");
  const [radiusKm, setRadiusKm]     = useState(DEFAULT_RADIUS);

  // selectedMarker drives the ProfilePeek modal
  // { ownerId: string; view: "personal" | "business" }
  const [selectedMarker, setSelectedMarker] = useState(null);

  // hoverCard driven by mouseover
  const [hoverCard, setHoverCard] = useState(null);
  const hoverTimeout = useRef(null);

  const mapRef = useRef(null);

  // Load Leaflet async — only runs client-side, sets leafletReady when done
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => { if (!cancelled) setLeafletReady(true); })
      .catch(() => { if (!cancelled) toast.error("Map failed to load. Check your connection and try again."); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    handleLocate();
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported in this browser");
      setLocation({ lat: DEFAULT_CENTER[0], lon: DEFAULT_CENTER[1] });
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
  };

  const fetchNearby = async (coords, radius = radiusKm) => {
    setLoading(true);
    try {
      const [taskRes, productRes] = await Promise.all([
        client.get("/api/maps/nearby/tasks",    { params: { lat: coords.lat, lon: coords.lon, radius_km: radius } }),
        client.get("/api/maps/nearby/products", { params: { lat: coords.lat, lon: coords.lon, radius_km: radius } }),
      ]);
      setTasks(taskRes.data || []);
      setProducts(productRes.data || []);
    } catch {
      toast.error("Failed to load nearby items");
    }
    setLoading(false);
  };

  const center = location ? [location.lat, location.lon] : DEFAULT_CENTER;

  const openMarker = (ownerId, view = "business") => {
    setSelectedMarker({ ownerId, view });
  };

  // Loading fallback while Leaflet is being loaded
  const MapLoadingFallback = () => (
    <div className="w-full h-full flex items-center justify-center bg-secondary/30">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-amber-500" />
          <div>
            <h1 className="font-display text-2xl font-bold">Nearby</h1>
            <p className="text-xs text-muted-foreground">Tasks and products near you</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={radiusKm}
            onChange={e => {
              const r = Number(e.target.value);
              setRadiusKm(r);
              if (location) fetchNearby(location, r);
            }}
            className="text-sm border border-border/50 rounded-full px-3 py-1.5 bg-card outline-none"
          >
            {[5, 10, 20, 50, 100].map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
          <Button
            size="sm"
            onClick={handleLocate}
            disabled={locating}
            className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            <span className="ml-1.5 hidden sm:inline">Locate Me</span>
          </Button>
        </div>
      </div>

      {/* Map */}
      <div
        className="rounded-2xl overflow-hidden border border-border/50 shadow-sm mb-4 relative"
        style={{ height: "380px" }}
      >
        {/* Hint badge */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
          <span
            className="flex items-center gap-1.5 px-3 py-1 bg-card text-card-foreground border border-border text-[11px] font-medium rounded-full shadow-lg whitespace-nowrap"
            style={{ backgroundColor:"hsl(var(--card))", opacity:1 }}
          >
            <span className="text-amber-400">👆</span> Hover pin to preview · Double-click to open profile
          </span>
        </div>

        {!leafletReady ? (
          <MapLoadingFallback />
        ) : (
          <MapContainer
            center={center}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
            doubleClickZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Gold pin — your location — labeled with your name */}
            {location && (
              <>
                <Marker
                  position={[location.lat, location.lon]}
                  icon={makeLabeledIcon(currentUser?.full_name ?? "You", "gold")}
                  eventHandlers={{
                    mouseover: (e) => {
                      const rect = e.originalEvent.target?.closest?.(".leaflet-marker-icon")?.getBoundingClientRect();
                      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                      setHoverCard({
                        ownerId: currentUser?.id,
                        view: "personal",
                        name: currentUser?.full_name ?? "You",
                        x: rect ? rect.left + rect.width / 2 : e.originalEvent.clientX,
                        y: rect ? rect.top : e.originalEvent.clientY,
                      });
                    },
                    mouseout: () => { setHoverCard(null); },
                    dblclick: (e) => {
                      e.originalEvent?.stopPropagation?.();
                      setHoverCard(null);
                      if (currentUser?.id) openMarker(currentUser.id, "personal");
                    },
                  }}
                />
                <Circle
                  center={[location.lat, location.lon]}
                  radius={radiusKm * 1000}
                  pathOptions={{
                    color: "#D4AF37",
                    fillColor: "#D4AF37",
                    fillOpacity: 0.07,
                    weight: 1.5,
                    dashArray: "6",
                  }}
                />
              </>
            )}

            {/* Task and product markers — clustered when many pins overlap */}
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={50}
              showCoverageOnHover={false}
            >
            {/* Task markers — labeled with task title */}
            {tasks.filter(t => t.latitude && t.longitude).map(t => (
              <Marker
                key={t.id}
                position={[t.latitude, t.longitude]}
                icon={makeLabeledIcon(t.title ?? "Task", "blue")}
                eventHandlers={{
                  mouseover: (e) => {
                    const rect = e.originalEvent.target?.closest?.(".leaflet-marker-icon")?.getBoundingClientRect();
                    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                    setHoverCard({
                      ownerId: t.requester_id,
                      view: "personal",
                      name: t.title ?? "Task",
                      category: t.task_type,
                      distanceKm: t.distance_km,
                      x: rect ? rect.left + rect.width / 2 : e.originalEvent.clientX,
                      y: rect ? rect.top : e.originalEvent.clientY,
                    });
                  },
                  mouseout: () => { setHoverCard(null); },
                  dblclick: (e) => {
                    e.originalEvent?.stopPropagation?.();
                    setHoverCard(null);
                    openMarker(t.requester_id, "personal");
                  },
                }}
              />
            ))}

            {/* Product markers — labeled with product title */}
            {products.filter(p => p.latitude && p.longitude).map(p => (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                icon={makeLabeledIcon(p.title ?? "Product", "blue")}
                eventHandlers={{
                  mouseover: (e) => {
                    const rect = e.originalEvent.target?.closest?.(".leaflet-marker-icon")?.getBoundingClientRect();
                    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                    setHoverCard({
                      ownerId: p.seller_id,
                      view: "business",
                      name: p.title ?? "Product",
                      category: p.category,
                      distanceKm: p.distance_km,
                      x: rect ? rect.left + rect.width / 2 : e.originalEvent.clientX,
                      y: rect ? rect.top : e.originalEvent.clientY,
                    });
                  },
                  mouseout: () => { setHoverCard(null); },
                  dblclick: (e) => {
                    e.originalEvent?.stopPropagation?.();
                    setHoverCard(null);
                    openMarker(p.seller_id, "business");
                  },
                }}
              />
            ))}
            </MarkerClusterGroup>
          </MapContainer>
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
          <MarkerHoverCard data={hoverCard} onClose={() => setHoverCard(null)} />
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-4">
        <button
          onClick={() => setTab("tasks")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "tasks" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" /> Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setTab("products")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "products" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Products ({products.length})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : tab === "tasks" ? (
        tasks.length === 0 ? (
          <EmptyState icon={ClipboardList} message={`No tasks within ${radiusKm} km`} />
        ) : (
          <div className="space-y-2">
            {tasks.map(t => (
              <button
                key={t.id}
                onDoubleClick={() => openMarker(t.requester_id, "personal")}
                className="w-full text-left flex items-center justify-between bg-card rounded-xl border border-border/50 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.task_type} · <MapPin className="w-3 h-3 inline" /> {t.distance_km?.toFixed(1)} km away
                    </p>
                  </div>
                </div>
                <p className="font-bold text-amber-600 shrink-0 ml-2">
                  {t.offered_payment?.toLocaleString()} {t.currency || 'USD'}
                </p>
              </button>
            ))}
          </div>
        )
      ) : (
        products.length === 0 ? (
          <EmptyState icon={ShoppingBag} message={`No products within ${radiusKm} km`} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => {
              const imgs = (() => { try { return JSON.parse(p.images || "[]"); } catch { return []; } })();
              return (
                <div
                  key={p.id}
                  onDoubleClick={() => openMarker(p.seller_id, "business")}
                  className="bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <Link href={`/products/${p.id}`} onClick={e => e.stopPropagation()}>
                    <div className="aspect-square bg-secondary/20 overflow-hidden relative">
                      {imgs[0]
                        ? <Image src={imgs[0]} alt={p.title} fill className="object-cover" unoptimized />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-muted-foreground/20" /></div>
                      }
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate">{p.title}</p>
                      <p className="text-xs text-amber-600 font-bold mt-0.5">{p.price?.toLocaleString()} {p.currency}</p>
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

function EmptyState({ icon: Icon, message }) {
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
