'use client';
import { HEX, Z } from '@/lib/colorTokens';
import SafeImage from '@/components/ui/SafeImage';
import { formatPersonDistance } from '@/lib/personDistance';
import { markerLabelHtml } from "@/lib/mapLabel";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { entities } from "@/api/entities";
import client from "@/api/client";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Search, Navigation, Loader2, ShoppingBag } from "lucide-react";
import ProfilePeek from "@/components/profile/ProfilePeek";
import { toast } from "sonner";
import DistanceRange from "@/components/ui/DistanceRange";
import type { MapSearchPerson, MapSearchProduct, MapSearchResult, MapSearchState } from "@/types/map-search";
import { getMapSearchDisplayState } from "@/types/map-search";
import { BUSINESS_CATEGORIES } from "@/lib/businessTemplates";
import { themeTextStyle } from '@/lib/contrast';
import type * as Leaflet from "leaflet";
import type * as ReactLeaflet from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import { firstImage } from "@/lib/spotlightTiles";
import { formatAmount } from "@/lib/money";

// Leaflet modules — assigned after dynamic import inside useEffect
// We CANNOT use require() or static import because Turbopack processes CSS imports at build time
// Instead we use dynamic import() which is truly deferred
let MapContainer: typeof ReactLeaflet.MapContainer | undefined;
let TileLayer: typeof ReactLeaflet.TileLayer | undefined;
let Marker: typeof ReactLeaflet.Marker | undefined;
let Circle: typeof ReactLeaflet.Circle | undefined;
let useMap: typeof ReactLeaflet.useMap | undefined;
let MarkerClusterGroup: React.ComponentType<{ chunkedLoading?: boolean; maxClusterRadius?: number; showCoverageOnHover?: boolean; children?: React.ReactNode }> | undefined;
let L: typeof Leaflet | undefined;
let leafletLoaded = false;

async function loadLeaflet() {
  if (typeof window === "undefined") return;
  if (leafletLoaded && MapContainer && TileLayer && Marker && Circle && MarkerClusterGroup && L) return;
  leafletLoaded = true;
  try {

  // Inject Leaflet CSS via link tags (avoids Turbopack CSS factory issue)
  const addCSS = (href: string) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  };
  addCSS("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");

  const [rl, leaflet] = await Promise.all([
    import("react-leaflet"),
    import("leaflet"),
  ]);

  MapContainer = rl.MapContainer;
  TileLayer = rl.TileLayer;
  Marker = rl.Marker;
  Circle = rl.Circle;
  useMap = rl.useMap;
  MarkerClusterGroup = function MarkerGroup({ children }: { children?: React.ReactNode }) { return <>{children}</>; };
  const leafletLib = leaflet.default;
  L = leafletLib;

  // Fix default marker icons
    delete (leafletLib.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
  leafletLib.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  } catch (error) {
    leafletLoaded = false;
    MapContainer = TileLayer = Marker = Circle = MarkerClusterGroup = L = undefined;
    throw error;
  }
}

function makeLabeledIcon(label: string, color: "gold" | "red" | "blue" | "green" = "blue") {
  const pinUrls: Record<string, string> = {
    // "gold" marks businesses: violet, the business identity colour (F-046).
    gold:  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
    red:   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    blue:  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    green: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  };
  const accentColors: Record<string, string> = {
    gold: HEX.brandSecondary, red: HEX.destructive, blue: HEX.primary, green: HEX.success,
  };
  const accent = accentColors[color];
  // Escaped: names come from the database and this HTML is set with innerHTML (audit F-057).
  const truncated = markerLabelHtml(label);

  const bubbleHtml = `
    <div style="
      position:absolute;bottom:49px;left:50%;transform:translateX(-50%);
      background:#fff;color:${HEX.inverse};font-size:11px;font-weight:700;
      font-family:system-ui,sans-serif;white-space:nowrap;padding:5px 10px;
      border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,0.25);
      pointer-events:none;line-height:1.4;border:1.5px solid ${accent};z-index:2;
    ">
      ${truncated}
      <div style="position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);
        width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;
        border-top:9px solid ${accent};"></div>
      <div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);
        width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;
        border-top:8px solid #fff;"></div>
    </div>`;

  const pinHtml = `
    <img loading="lazy" src="${pinUrls[color]}" alt="" width="25" height="41"
      style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);z-index:1;" />`;

  if (!L) return undefined;
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;width:120px;height:41px;overflow:visible;margin-left:-47px;">
      ${bubbleHtml}${pinHtml}</div>`,
    iconSize:   [120, 41],
    iconAnchor: [60, 41],
  });
}

type MatchedProduct = MapSearchProduct;

type SearchBusiness = MapSearchResult["businesses"][number];
type NearbyPerson = MapSearchPerson;

/** Hover position: the pin's screen rectangle, or the pointer when it cannot be found. */
function pinPosition(e: LeafletMouseEvent): { x: number; y: number } {
  const target = e.originalEvent.target as Element | null;
  const rect = target?.closest?.(".leaflet-marker-icon")?.getBoundingClientRect();
  return { x: rect ? rect.left + rect.width / 2 : e.originalEvent.clientX, y: rect ? rect.top : e.originalEvent.clientY };
}

interface HoverData {
  ownerId: string;
  view: "personal" | "business";
  name: string;
  category?: string | null;
  avatarUrl?: string | null;
  distanceKm?: number;
  matchedProducts?: MatchedProduct[];
  x: number;
  y: number;
}

function MarkerHoverCard({ data }: { data: HoverData }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
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
  const pinTipY = data.y + 41;
  const top = Math.max(pinTipY - 12 - 200, 8);

  const accentColor =
    data.view === "business" ? HEX.brandSecondary :
    data.view === "personal" ? HEX.primary : HEX.success;

  return createPortal(
    <div style={{ position: "fixed", left, top, width: cardW, zIndex: Z.overlay, pointerEvents: "none" }}>
      <motion.div
        initial={{ y: 8, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 4, scale: 0.95 }}
        transition={{ duration: 0.08 }}
        style={{ position: "relative", backgroundColor: "hsl(var(--card))", opacity: 1 }}
        className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-visible"
      >
        <div style={{ height: 3, background: accentColor, borderRadius: "12px 12px 0 0" }} />
        <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-2">
          <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
            style={{ background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor})` }}>
            {profile?.avatar_url
              ? <SafeImage fill={false} width={800} height={600} loading="lazy" src={profile.avatar_url} alt={`${data.name || 'User'}'s avatar`} className="w-full h-full object-cover" />
              : (data.name?.charAt(0) ?? "?")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate leading-tight">{data.name}</p>
            {data.category && <p className="text-[10px] text-muted-foreground truncate">{data.category}</p>}
            {data.distanceKm != null && (
              <p className="biz-text text-[10px] font-semibold" style={{ ...themeTextStyle(accentColor) }}>
                📍 {data.distanceKm < 1 ? `${Math.round(data.distanceKm * 1000)}m` : `${data.distanceKm.toFixed(1)} km`} away
              </p>
            )}
          </div>
        </div>
        {data.matchedProducts && data.matchedProducts.length > 0 && (
          <div className="px-3 pb-2 flex gap-1.5 overflow-hidden">
            {data.matchedProducts.slice(0, 3).map((p: any) => {
              const imgs = (() => { try { return JSON.parse(p.images || "[]"); } catch { return []; } })();
              return (
                <div key={p.id} className="flex-1 bg-secondary/40 rounded-lg p-1.5 min-w-0">
                  {imgs[0] && <SafeImage fill={false} width={800} height={600} loading="lazy" src={imgs[0]} alt={p.title || 'Product image'} className="w-full h-8 object-cover rounded mb-1" />}
                  <p className="text-[9px] font-medium truncate">{p.title}</p>
                  <p className="biz-text text-[9px] font-bold" style={{ ...themeTextStyle(accentColor) }}>{p.price?.toLocaleString()} ETB</p>
                </div>
              );
            })}
          </div>
        )}
        {loading ? (
          <div className="px-3 pb-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-3 h-3 border border-t-primary rounded-full animate-spin"
              style={{ borderColor: `${accentColor}44`, borderTopColor: accentColor }} />
            Loading feed…
          </div>
        ) : posts.length > 0 ? (
          <div className="border-t border-border/40 px-3 py-2 space-y-1">
            {posts.slice(0, 2).map((p: any) => (
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
        <div style={{ position:"absolute",bottom:-8,left:"50%",transform:"translateX(-50%)",
          width:0,height:0,borderLeft:"9px solid transparent",borderRight:"9px solid transparent",
          borderTop:"9px solid hsl(var(--border))" }} />
        <div style={{ position:"absolute",bottom:-6,left:"50%",transform:"translateX(-50%)",
          width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",
          borderTop:"8px solid hsl(var(--card))" }} />
      </motion.div>
    </div>,
    document.body
  );
}

function MapFlyTo({ center, zoom }: { center: [number, number]; zoom?: number }) {
  // Rendered only inside the loaded map, so react-leaflet's useMap is set.
  const map = useMap!();
  const [lat, lng] = center;
  useEffect(() => {
    map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.8 });
  }, [map, center, zoom, lat, lng]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [9.005401, 38.763611];
const NEARBY_CATEGORIES: { value: string; label: string; icon?: any }[] = [
  { value: "", label: "All" },
  ...BUSINESS_CATEGORIES.map(category => ({ value: category.value, label: category.label, icon: category.icon })),
];

// Search result business card
export function SearchResultBusinessCard({ business, query, onOpenProfile }: { business: SearchBusiness; query: string; onOpenProfile: () => void }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
          {business.business_name?.charAt(0) || business.display_name?.charAt(0) || "B"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{business.business_name || business.display_name}</p>
          <p className="text-xs text-muted-foreground">{business.business_category}</p>
        </div>
        {business.distance_km != null && (
          <div className="flex items-center gap-1 shrink-0">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {business.distance_km < 1 ? `${Math.round(business.distance_km * 1000)}m` : `${business.distance_km.toFixed(1)} km`}
            </span>
          </div>
        )}
      </div>
      {business.matched_products && business.matched_products.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Has {business.matched_products.length} match{business.matched_products.length !== 1 ? "es" : ""} for "{query}"
          </p>
          <div className="grid grid-cols-2 gap-2">
            {business.matched_products.slice(0, 4).map((p) => {
              const image = firstImage(p.images);
              return (
                <div key={p.id} className="flex items-center gap-2 bg-secondary/40 rounded-xl p-2">
                  <div className="w-9 h-9 rounded-lg bg-secondary/60 overflow-hidden shrink-0">
                    {image
                      ? <SafeImage fill={false} width={800} height={600} loading="lazy" src={image} alt={p.title ?? ""} className="w-full h-full object-cover" />
                      : <ShoppingBag className="w-4 h-4 text-muted-foreground/30 m-auto mt-2.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">{p.title}</p>
                    <p className="text-[11px] text-primary font-bold">{formatAmount(p.price)} {p.currency || "ETB"}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {business.matched_products.length > 4 && (
            <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
              +{business.matched_products.length - 4} more products
            </p>
          )}
        </div>
      )}
      <div className="px-4 pb-4">
        <button type="button" onClick={onOpenProfile} className="text-xs font-semibold text-primary hover:underline">
          View business profile
        </button>
      </div>
    </div>
  );
}

// Nearby person card for people search results
function NearbyPersonCard({ person, onOpenProfile }: { person: NearbyPerson; onOpenProfile: () => void }) {
  const accentColor = HEX.success;
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-success flex items-center justify-center text-white font-bold text-sm">
          {person.avatar_url
            ? <SafeImage fill={false} width={800} height={600} loading="lazy" src={person.avatar_url} alt="" className="w-full h-full object-cover" />
            : (person.display_name?.charAt(0) ?? "U")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{person.display_name}</p>
          {person.headline && <p className="text-xs text-muted-foreground truncate">{person.headline}</p>}
          {formatPersonDistance(person.distance_km) && (
            <p className="biz-text text-xs font-semibold" style={{ ...themeTextStyle(accentColor) }}>
              📍 {formatPersonDistance(person.distance_km)}
            </p>
          )}
        </div>
        <button
          onClick={onOpenProfile}
          className="px-3 py-1.5 rounded-full bg-success text-white text-xs font-semibold hover:bg-success/90 transition-colors shrink-0"
        >
          View
        </button>
      </div>
    </div>
  );
}

export interface HomeMapTabProps {
  user: any;
}

export default function HomeMapTab({ user }: HomeMapTabProps) {
  const [leafletReady, setLeafletReady] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbyRadius, setNearbyRadius] = useState(10);
  const [nearbyCategory, setNearbyCategory] = useState("");
  const locationRequested = useRef(false);

  const [searchState, setSearchState] = useState<MapSearchState>({
    query: "",
    results: null,
    loading: false,
    searchType: null,
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [locating, setLocating] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedMarker, setSelectedMarker] = useState<{ ownerId: string; view: "personal" | "business" } | null>(null);
  const [hoverCard, setHoverCard] = useState<HoverData | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Leaflet async — only runs client-side, sets leafletReady when done
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => { if (!cancelled) setLeafletReady(true); })
      .catch(() => { if (!cancelled) setNearbyError("Map failed to load. Check your connection and try again."); });
    return () => { cancelled = true; };
  }, []);

  const requestLocation = useCallback(() => {
    setNearbyError(null);
    setLocating(true);
    if (!navigator.geolocation) {
      setNearbyError("Location not supported by your browser.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter([loc.lat, loc.lon]);
        setLocating(false);
        toast.success("Location found!");
      },
      () => {
        const loc = { lat: 9.0192, lon: 38.7525 };
        setUserLocation(loc);
        setMapCenter([loc.lat, loc.lon]);
        setLocating(false);
        setNearbyError("Unable to detect location. Please enable location access.");
      },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (!locationRequested.current) {
      locationRequested.current = true;
      requestLocation();
    }
  }, [requestLocation]);

  const handleProductSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchState({ query: "", results: null, loading: false, searchType: null });
      return;
    }
    if (!userLocation) { toast.error("Enable location first to search nearby."); return; }

    setSearchState({ query: trimmed, results: null, loading: true, searchType: null });
    const isPeopleSearch = /^@|^(people|person|user|profile|find person)\b/i.test(trimmed);
    try {
      if (isPeopleSearch) {
        const cleanQ = trimmed.replace(/^@/, "").trim();
        const res = await client.get("/api/search", {
          params: { q: cleanQ, type: "users", lat: userLocation.lat, lon: userLocation.lon, radius_km: nearbyRadius, limit: 30 },
        });
        const users = Array.isArray(res.data?.users) ? res.data.users : [];
        const nextResults: MapSearchResult = {
          businesses: [],
          geo_products: [],
          products_matched: [],
          total_matches: users.length,
          users,
          searchType: "people",
        };
        // People are listed with a rounded distance only; they get no map pins.
        setSearchState({ query: trimmed, results: nextResults, loading: false, searchType: "people" });
      } else {
        const res = await client.get("/api/maps/nearby/product-search", {
          params: { lat: userLocation.lat, lon: userLocation.lon, q: trimmed, radius_km: nearbyRadius, category: nearbyCategory },
        });
        const nextResults: MapSearchResult = { ...res.data, searchType: "place" };
        setSearchState({ query: trimmed, results: nextResults, loading: false, searchType: "place" });
        if (res.data?.businesses?.length > 0) {
          const first = res.data.businesses[0];
          if (first.latitude && first.longitude) setMapCenter([parseFloat(first.latitude), parseFloat(first.longitude)]);
        } else if (res.data?.geo_products?.length > 0) {
          const first = res.data.geo_products[0];
          setMapCenter([parseFloat(first.latitude), parseFloat(first.longitude)]);
        }
      }
    } catch {
      toast.error("Search failed. Try again.");
      setSearchState({ query: trimmed, results: null, loading: false, searchType: null });
    }
  }, [userLocation, nearbyRadius, nearbyCategory]);

  // A new distance re-runs the open search once it has taken effect (the old
  // buttons searched straight away, still with the previous distance).
  const searchedRadius = useRef(nearbyRadius);
  useEffect(() => {
    if (searchedRadius.current === nearbyRadius) return;
    searchedRadius.current = nearbyRadius;
    if (searchState.results && searchState.query) void handleProductSearch(searchState.query);
  }, [nearbyRadius, handleProductSearch, searchState.results, searchState.query]);

  const clearSearch = () => {
    setSearchState({ query: "", results: null, loading: false, searchType: null });
    if (searchInputRef.current) searchInputRef.current.value = "";
  };

  const searchQuery = searchState.query;
  const searchLoading = searchState.loading;
  const searchResults = searchState.results;

  // The map parts, once Leaflet has loaded (local names keep the narrowing inside callbacks).
  const map = leafletReady && MapContainer && TileLayer && Marker && Circle && MarkerClusterGroup
    ? { MapContainer, TileLayer, Marker, Circle, MarkerClusterGroup }
    : null;
  const display = getMapSearchDisplayState(searchState);
  const mapBizMarkers = searchResults?.searchType === "place" ? searchResults.businesses : [];
  const mapProductMarkers = searchResults?.searchType === "place" ? (searchResults.geo_products ?? []) : [];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="nearby"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-3"
      >
        {/* ── Search bar ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search product, shop, pharmacy, shoes…"
            value={searchQuery}
            onChange={e => setSearchState(prev => ({ ...prev, query: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") handleProductSearch(searchQuery); }}
            className="w-full pl-9 pr-20 py-2.5 rounded-full border border-border/60 bg-card text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button onClick={clearSearch} className="p-1 rounded-full hover:bg-secondary text-muted-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => handleProductSearch(searchQuery)}
              disabled={searchLoading}
              className="px-3 py-1 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-full transition-colors disabled:opacity-60"
            >
              {searchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Go"}
            </button>
          </div>
        </div>

        {/* ── Radius + Re-locate row ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <DistanceRange id="map-distance" value={nearbyRadius} onChange={(km) => setNearbyRadius(km ?? 10)} className="min-w-0 flex-1 basis-56" />
          <button
            onClick={requestLocation}
            disabled={locating}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/50 text-xs font-medium text-muted-foreground hover:bg-secondary transition-all"
          >
            {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
            Locate me
          </button>
        </div>

        {/* ── Category chips (only when not in search mode) ── */}
        {!searchResults && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {NEARBY_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setNearbyCategory(cat.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    nearbyCategory === cat.value ? "bg-primary text-white" : "bg-card border border-border/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {nearbyError && (
          <p className="text-xs text-muted-foreground px-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {nearbyError}
          </p>
        )}

        {/* ── Embedded Map ── */}
        <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm relative" style={{ height: "340px" }}>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-raised pointer-events-none">
            <span
              className="flex items-center gap-1.5 px-3 py-1 bg-card text-card-foreground border border-border text-[11px] font-medium rounded-full shadow-lg whitespace-nowrap"
              style={{ backgroundColor: "hsl(var(--card))", opacity: 1 }}
            >
              <span className="text-primary">👆</span> Hover pin to preview · Double-click to open profile
            </span>
          </div>

          {!map ? (
            <div className="w-full h-full flex items-center justify-center bg-secondary/30">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <map.MapContainer
            className="isolate"
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            doubleClickZoom={false}
          >
            <map.TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFlyTo center={mapCenter} zoom={display.shouldShowResults ? 14 : 13} />

            {userLocation && user && (
              <>
                <map.Marker
                  position={[userLocation.lat, userLocation.lon]}
                  icon={makeLabeledIcon(user.full_name ?? "You", "gold")}
                  eventHandlers={{
                    mouseover: (e: LeafletMouseEvent) => {
                      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                      setHoverCard({ ownerId: user.id, view: "personal", name: user.full_name ?? "You", ...pinPosition(e) });
                    },
                    mouseout: () => { setHoverCard(null); },
                    dblclick: (e: LeafletMouseEvent) => {
                      e.originalEvent?.stopPropagation?.();
                      setHoverCard(null);
                      setSelectedMarker({ ownerId: user.id, view: "personal" });
                    },
                  }}
                />
                <map.Circle
                  center={[userLocation.lat, userLocation.lon]}
                  radius={nearbyRadius * 1000}
                  pathOptions={{ color: HEX.primary, fillColor: HEX.primary, fillOpacity: 0.06, weight: 1.5, dashArray: "6" }}
                />
              </>
            )}

            <map.MarkerClusterGroup chunkedLoading maxClusterRadius={50} showCoverageOnHover={false}>
              {mapBizMarkers.filter(b => b.latitude && b.longitude).map(b => (
                <map.Marker
                  key={b.id}
                  position={[Number(b.latitude), Number(b.longitude)]}
                  icon={makeLabeledIcon(b.business_name || b.display_name || "Business", display.shouldShowResults ? "red" : "blue")}
                  eventHandlers={{
                    mouseover: (e: LeafletMouseEvent) => {
                      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                      setHoverCard({ ownerId: b.owner_id, view: "business",
                        name: b.business_name || b.display_name || "Business", category: b.business_category,
                        avatarUrl: b.avatar_url, distanceKm: b.distance_km, matchedProducts: b.matched_products, ...pinPosition(e) });
                    },
                    mouseout: () => { setHoverCard(null); },
                    dblclick: (e: LeafletMouseEvent) => {
                      e.originalEvent?.stopPropagation?.();
                      setHoverCard(null);
                      setSelectedMarker({ ownerId: b.owner_id, view: "business" });
                    },
                  }}
                />
              ))}
              {mapProductMarkers.filter(p => p.latitude && p.longitude).map(p => (
                <map.Marker
                  key={`prod-${p.id}`}
                  position={[Number(p.latitude), Number(p.longitude)]}
                  icon={makeLabeledIcon(p.title ?? "Product", display.shouldShowResults ? "blue" : "blue")}
                  eventHandlers={{
                    mouseover: (e: LeafletMouseEvent) => {
                      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                      setHoverCard({ ownerId: p.seller_id, view: "business", name: p.title ?? "Product",
                        category: p.category, distanceKm: p.distance_km, ...pinPosition(e) });
                    },
                    mouseout: () => { setHoverCard(null); },
                    dblclick: (e: LeafletMouseEvent) => {
                      e.originalEvent?.stopPropagation?.();
                      setHoverCard(null);
                      setSelectedMarker({ ownerId: p.seller_id, view: "business" });
                    },
                  }}
                />
              ))}
            </map.MarkerClusterGroup>
          </map.MapContainer>
          )}
        </div>

        {/* ProfilePeek modal */}
        {selectedMarker && (
          <ProfilePeek
            key={selectedMarker.ownerId}
            authorId={selectedMarker.ownerId}
            initialView={selectedMarker.view}
            onClose={() => setSelectedMarker(null)}
          />
        )}

        {/* Hover card */}
        <AnimatePresence>
          {hoverCard && <MarkerHoverCard data={hoverCard} />}
        </AnimatePresence>

        {/* ── Search Results Summary ── */}
        {display.shouldShowResults && searchResults && (
          <div className="bg-primary-subtle border border-primary/30 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary-subtle-foreground">
                  "{searchQuery.replace(/^@/, "")}" within {nearbyRadius} km
                </p>
                <p className="text-xs text-primary mt-0.5">
                  {searchResults.searchType === "people"
                    ? searchResults.total_matches > 0
                      ? `${searchResults.total_matches} person${searchResults.total_matches !== 1 ? "s" : ""} found nearby`
                      : "No people found in this area"
                    : searchResults.businesses.length > 0
                      ? `${searchResults.businesses.length} business${searchResults.businesses.length !== 1 ? "es" : ""} carry this · ${searchResults.total_matches} product match${searchResults.total_matches !== 1 ? "es" : ""}`
                      : `No nearby businesses found within ${nearbyRadius} km`}
                </p>
              </div>
              <button onClick={clearSearch} className="text-primary hover:text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Search Loading ── */}
        {searchLoading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Finding "{searchQuery}" within {nearbyRadius} km…</p>
          </div>
        )}

        {/* ── Search Results List ── */}
        {display.shouldShowResults && searchResults && !searchLoading && (
          <div className="space-y-3">
            {searchResults.searchType === "people" ? (
              (searchResults.users ?? []).length === 0 ? (
                <div className="text-center py-10 bg-card rounded-2xl border border-border/50">
                  <MapPin className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <h3 className="font-semibold text-base">No people found nearby</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    No users within {nearbyRadius} km match "{searchQuery.replace(/^@/, "")}". Try a wider radius.
                  </p>
                </div>
              ) : (
                (searchResults.users ?? []).map(u => (
                  <NearbyPersonCard
                    key={u.user_id}
                    person={u}
                    onOpenProfile={() => setSelectedMarker({ ownerId: u.user_id, view: "personal" })}
                  />
                ))
              )
            ) : (
              searchResults.businesses.length === 0 ? (
                <div className="text-center py-10 bg-card rounded-2xl border border-border/50">
                  <MapPin className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <h3 className="font-semibold text-base">No results nearby</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    No businesses within {nearbyRadius} km have "{searchQuery}". Try a wider radius.
                  </p>
                </div>
              ) : (
                searchResults.businesses.map(biz => (
                  <SearchResultBusinessCard
                    key={biz.id}
                    business={biz}
                    query={searchQuery}
                    onOpenProfile={() => setSelectedMarker({ ownerId: biz.owner_id, view: "business" })}
                  />
                ))
              )
            )}
          </div>
        )}

        {/* ── Default state when no search has been performed ── */}
        {display.shouldShowEmptyState && (
          <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
            <MapPin className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold">Search to see products on the map</h3>
            <p className="text-sm text-muted-foreground mt-1">Enter a product name or store name and press Go to find nearby matches.</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
