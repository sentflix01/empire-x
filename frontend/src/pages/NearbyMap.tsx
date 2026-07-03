// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import client from "@/api/client";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { Link } from "react-router-dom";
import { MapPin, ShoppingBag, ClipboardList, Navigation, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet default marker icon broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const goldIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const DEFAULT_CENTER = [9.005401, 38.763611]; // Addis Ababa
const DEFAULT_RADIUS = 20;

export default function NearbyMap() {
  const [location, setLocation] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [tab, setTab] = useState("tasks");
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS);
  const mapRef = useRef(null);

  useEffect(() => {
    // Try to get location on mount
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
        // Fall back to Addis Ababa centre
        const coords = { lat: DEFAULT_CENTER[0], lon: DEFAULT_CENTER[1] };
        setLocation(coords);
        fetchNearby(coords);
        toast.info("Using Addis Ababa as default location");
      },
      { timeout: 8000 }
    );
  };

  const fetchNearby = async (coords, radius = radiusKm) => {
    setLoading(true);
    try {
      const [taskRes, productRes] = await Promise.all([
        client.get("/api/maps/nearby/tasks", { params: { lat: coords.lat, lon: coords.lon, radius_km: radius } }),
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
              onChange={e => { setRadiusKm(Number(e.target.value)); if (location) fetchNearby(location, Number(e.target.value)); }}
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
        <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm mb-4" style={{ height: "380px" }}>
          <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} ref={mapRef}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* User location */}
            {location && (
              <>
                <Marker position={[location.lat, location.lon]} icon={goldIcon}>
                  <Popup>📍 You are here</Popup>
                </Marker>
                <Circle
                  center={[location.lat, location.lon]}
                  radius={radiusKm * 1000}
                  pathOptions={{ color: "#D4AF37", fillColor: "#D4AF37", fillOpacity: 0.07, weight: 1.5, dashArray: "6" }}
                />
              </>
            )}
            {/* Task markers */}
            {tasks.filter(t => t.latitude && t.longitude).map(t => (
              <Marker key={t.id} position={[t.latitude, t.longitude]} icon={blueIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.task_type} · {t.distance_km?.toFixed(1)} km</p>
                    <p className="text-amber-600 font-bold mt-1">{t.offered_payment?.toLocaleString()} ETB</p>
                  </div>
                </Popup>
              </Marker>
            ))}
            {/* Product markers */}
            {products.filter(p => p.latitude && p.longitude).map(p => (
              <Marker key={p.id} position={[p.latitude, p.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.category} · {p.distance_km?.toFixed(1)} km</p>
                    <p className="text-amber-600 font-bold mt-1">{p.price?.toLocaleString()} {p.currency}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-4">
          <button onClick={() => setTab("tasks")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === "tasks" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
            <ClipboardList className="w-3.5 h-3.5" /> Tasks ({tasks.length})
          </button>
          <button onClick={() => setTab("products")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === "products" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
            <ShoppingBag className="w-3.5 h-3.5" /> Products ({products.length})
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : tab === "tasks" ? (
          tasks.length === 0 ? (
            <EmptyState icon={ClipboardList} message={`No tasks within ${radiusKm} km`} />
          ) : (
            <div className="space-y-2">
              {tasks.map(t => (
                <Link key={t.id} to="/tasks" className="flex items-center justify-between bg-card rounded-xl border border-border/50 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.task_type} · <MapPin className="w-3 h-3 inline" /> {t.distance_km?.toFixed(1)} km away</p>
                    </div>
                  </div>
                  <p className="font-bold text-amber-600 shrink-0 ml-2">{t.offered_payment?.toLocaleString()} ETB</p>
                </Link>
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
                  <Link key={p.id} to={`/products/${p.id}`} className="bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="aspect-square bg-secondary/20 overflow-hidden">
                      {imgs[0] ? <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-muted-foreground/20" /></div>}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate">{p.title}</p>
                      <p className="text-xs text-amber-600 font-bold mt-0.5">{p.price?.toLocaleString()} {p.currency}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{p.distance_km?.toFixed(1)} km</p>
                    </div>
                  </Link>
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


