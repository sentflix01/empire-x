'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import client from "@/api/client";
import {
  Search as SearchIcon, Users, ShoppingBag, Crown, ClipboardList,
  FileText, Loader2, Mic, MicOff, MapPin, SlidersHorizontal,
  ArrowUpDown, Calendar, DollarSign, X, ChevronDown, Briefcase,
  CalendarDays, TrendingUp, Navigation, Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { DemoBadge } from "@/components/profile/DemoBadge";
import moment from "moment";
import { useTranslation } from "react-i18next";

// ── Category tabs ────────────────────────────────────────────────────────────
const TABS = [
  { key: "all",       label: "All",        Icon: SearchIcon },
  { key: "users",     label: "People",     Icon: Users },
  { key: "products",  label: "Products",   Icon: ShoppingBag },
  { key: "showrooms", label: "Showrooms",  Icon: Crown },
  { key: "tasks",     label: "Tasks",      Icon: ClipboardList },
  { key: "posts",     label: "Posts",      Icon: FileText },
  { key: "jobs",      label: "Jobs",       Icon: Briefcase },
  { key: "events",    label: "Events",     Icon: CalendarDays },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Most Relevant" },
  { value: "recent",    label: "Most Recent" },
  { value: "distance",  label: "Nearest First" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc","label": "Price: High → Low" },
];

const RADIUS_OPTIONS = [
  { value: "",     label: "Anywhere" },
  { value: "1",    label: "Within 1 km" },
  { value: "5",    label: "Within 5 km" },
  { value: "10",   label: "Within 10 km" },
  { value: "25",   label: "Within 25 km" },
  { value: "50",   label: "Within 50 km" },
  { value: "100",  label: "Within 100 km" },
];

// ── Distance badge ────────────────────────────────────────────────────────────
function DistanceBadge({ km }: { km?: number | null }) {
  if (km == null) return null;
  const label = km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-cyan-700 bg-cyan-50 border border-cyan-200/60 px-1.5 py-0.5 rounded-full shrink-0">
      <Navigation className="w-2.5 h-2.5" /> {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Search() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const TABS = [
    { key: "all",       label: t('search.all'),        Icon: SearchIcon },
    { key: "users",     label: t('search.people'),     Icon: Users },
    { key: "products",  label: t('search.products'),   Icon: ShoppingBag },
    { key: "showrooms", label: t('search.showrooms'),  Icon: Crown },
    { key: "tasks",     label: t('nav.tasks'),         Icon: ClipboardList },
    { key: "posts",     label: t('search.posts'),      Icon: FileText },
    { key: "jobs",      label: t('nav.jobs'),          Icon: Briefcase },
    { key: "events",    label: t('nav.events'),        Icon: CalendarDays },
  ];

  const [query, setQuery]       = useState(searchParams.get("q") || "");
  const [tab, setTab]           = useState("all");
  const [results, setResults]   = useState<Record<string, any[]>>({});
  const [loading, setLoading]   = useState(false);
  const [listening, setListening] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Filters
  const [sort, setSort]           = useState("relevance");
  const [radius, setRadius]       = useState("");
  const [priceMin, setPriceMin]   = useState("");
  const [priceMax, setPriceMax]   = useState("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");

  // Location
  const [userLat, setUserLat]     = useState<number | null>(null);
  const [userLon, setUserLon]     = useState<number | null>(null);
  const [locStatus, setLocStatus] = useState<"idle"|"loading"|"ok"|"denied">("idle");
  const locRequested = useRef(false);

  const debouncedQuery = useDebounce(query, 380);

  // Request geolocation when distance sort or radius filter is active
  useEffect(() => {
    const needsLoc = sort === "distance" || radius !== "";
    if (needsLoc && !locRequested.current) {
      locRequested.current = true;
      requestLocation();
    }
  }, [sort, radius]);

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocStatus("denied"); return; }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLat(pos.coords.latitude);
        setUserLon(pos.coords.longitude);
        setLocStatus("ok");
      },
      () => {
        // Fallback to Addis Ababa centre
        setUserLat(9.0192);
        setUserLon(38.7525);
        setLocStatus("ok");
        toast.info(t('search.defaultLocation'));
      },
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults({}); return; }
    doSearch();
  }, [debouncedQuery, tab, sort, radius, priceMin, priceMax, dateFrom, dateTo, userLat, userLon]);

  // Reset all section expanded states when query changes
  useEffect(() => {
    setExpandedSections({});
  }, [debouncedQuery]);

  // Reset all section expanded states when tab changes
  useEffect(() => {
    setExpandedSections({});
  }, [tab]);
  const doSearch = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { q: debouncedQuery, type: tab, sort, limit: "20" };
      if (radius)   params.radius_km = radius;
      if (priceMin) params.price_min = priceMin;
      if (priceMax) params.price_max = priceMax;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      if (userLat != null) params.lat = String(userLat);
      if (userLon != null) params.lon = String(userLon);
      const res = await client.get("/api/search", { params });
      setResults(res.data);
    } catch { setResults({}); }
    setLoading(false);
  };

  const handleVoiceSearch = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.info(t('search.voiceNotSupported')); return; }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1;
    setListening(true);
    r.start();
    r.onresult = (e) => { setQuery(e.results[0][0].transcript); setListening(false); };
    r.onerror  = () => { setListening(false); toast.error(t('search.audioError')); };
    r.onend    = () => setListening(false);
  };

  const clearFilters = () => {
    setSort("relevance"); setRadius(""); setPriceMin(""); setPriceMax("");
    setDateFrom(""); setDateTo("");
  };

  const hasActiveFilters = sort !== "relevance" || radius !== "" || priceMin !== "" || priceMax !== "" || dateFrom !== "" || dateTo !== "";
  const totalResults = Object.values(results).reduce((s, a) => s + (a?.length || 0), 0);

  const tabHasResults = (key: string) => {
    if (key === "all") return totalResults > 0;
    return (results[key]?.length || 0) > 0;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-4">{t('search.title')}</h1>
        <div className="relative mb-3">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t('search.placeholder')} className="pl-9 pr-24 rounded-full h-11" autoFocus />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button onClick={handleVoiceSearch}
              className={`p-1.5 rounded-full transition-colors ${listening ? "text-red-500 animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
              title="Voice search">
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setFiltersOpen(v => !v)}
              title="Filters"
              className={`p-1.5 rounded-full transition-colors relative ${filtersOpen || hasActiveFilters ? "text-amber-600 bg-amber-50" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-500 rounded-full" />}
            </button>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {filtersOpen && (
          <div className="bg-card border border-border/50 rounded-2xl p-4 mb-3 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">{t('search.filters')}</span>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> {t('search.clearAll')}
                </button>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">{t('search.sortBy')}</label>
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setSort(opt.value); if (opt.value === "distance" && !locRequested.current) requestLocation(); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${sort === opt.value ? "bg-amber-500 text-white border-amber-500" : "border-border/50 text-muted-foreground hover:bg-secondary"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {t('search.distance')}</span>
              </label>
              {locStatus === "loading" && <p className="text-xs text-muted-foreground">{t('search.detectingLocation')}</p>}
              {locStatus === "ok" && userLat && <p className="text-xs text-green-600 mb-1.5">{t('search.locationDetected')}</p>}
              <div className="flex flex-wrap gap-1.5">
                {RADIUS_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setRadius(opt.value); if (opt.value && !locRequested.current) requestLocation(); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${radius === opt.value ? "bg-amber-500 text-white border-amber-500" : "border-border/50 text-muted-foreground hover:bg-secondary"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {(tab === "all" || tab === "products") && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {t('search.priceRange')}</span>
                </label>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="h-8 text-xs" />
                  <span className="text-muted-foreground text-xs">—</span>
                  <Input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            )}
            {(tab === "posts" || tab === "events" || tab === "jobs" || tab === "all") && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('search.datePosted')}</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1">{t('search.from')}</p>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1">{t('search.to')}</p>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Category tabs ── */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {TABS.map(tabItem => {
            const Icon = tabItem.Icon;
            const count = tabItem.key === "all" ? totalResults : (results[tabItem.key]?.length || 0);
            return (
              <button key={tabItem.key} onClick={() => setTab(tabItem.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 ${tab === tabItem.key ? "bg-amber-500 text-white" : "bg-card border border-border/50 text-muted-foreground hover:bg-secondary"}`}>
                <Icon className="w-3.5 h-3.5" />
                {tabItem.label}
                {query.length > 1 && count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === tabItem.key ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {query.length < 2 && (
          <div className="text-center py-16">
            <SearchIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t('search.typeToSearch')}</p>
          </div>
        )}
        {query.length > 1 && !loading && totalResults === 0 && (
          <div className="text-center py-16">
            <SearchIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-semibold">{t('search.noResults', { query })}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('search.noResultsSubtitle')}</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-sm text-amber-600 hover:underline">{t('search.clearFilters')}</button>
            )}
          </div>
        )}

        {/* ── Results sections ── */}

        {results.users?.length > 0 && (tab === "all" || tab === "users") && (
          <CollapsibleSection title={t('search.people')} icon={Users} count={results.users.length} sectionKey="users" expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
            {results.users.map(u => (
              <Link key={u.id} href={`/profile/${u.user_id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden">
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.display_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium truncate">{u.display_name}</p>
                    {u.is_verified && <span className="text-blue-500 text-xs">✓</span>}
                    {u.is_seed && <DemoBadge />}
                    <DistanceBadge km={u.distance_km} />
                  </div>
                  {u.headline && <p className="text-xs text-muted-foreground truncate">{u.headline}</p>}
                  {u.location && <p className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{u.location}</p>}
                </div>
              </Link>
            ))}
          </CollapsibleSection>
        )}

        {results.products?.length > 0 && (tab === "all" || tab === "products") && (
          <CollapsibleSection title={t('search.products')} icon={ShoppingBag} count={results.products.length} sectionKey="products" expandedSections={expandedSections} setExpandedSections={setExpandedSections} itemCount={results.products.length}>
            <div className="grid grid-cols-2 gap-3 p-3">
              {(expandedSections["products"] ? results.products : results.products.slice(0, 5)).map(p => {
                const imgs = (() => { try { return JSON.parse(p.images || "[]"); } catch { return []; } })();
                return (
                  <Link key={p.id} href={`/products/${p.id}`}
                    className="rounded-xl border border-border/40 overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="aspect-square bg-secondary/30">
                      {imgs[0] && <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-xs font-medium truncate">{p.title}</p>
                      <p className="text-xs text-amber-600 font-bold">{p.price?.toLocaleString()} {p.currency}</p>
                      <DistanceBadge km={p.distance_km} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {results.showrooms?.length > 0 && (tab === "all" || tab === "showrooms") && (
          <CollapsibleSection title={t('search.showrooms')} icon={Crown} count={results.showrooms.length} sectionKey="showrooms" expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
            {results.showrooms.map(s => (
              <Link key={s.id} href={`/showrooms/${s.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {s.logo_url ? <img src={s.logo_url} alt="" className="w-full h-full object-cover rounded-xl" /> : <Crown className="w-5 h-5 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <DistanceBadge km={s.distance_km} />
                  </div>
                  <p className="text-xs text-muted-foreground">{s.category} · {s.view_count} views</p>
                </div>
              </Link>
            ))}
          </CollapsibleSection>
        )}

        {results.tasks?.length > 0 && (tab === "all" || tab === "tasks") && (
          <CollapsibleSection title={t('nav.tasks')} icon={ClipboardList} count={results.tasks.length} sectionKey="tasks" expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
            {results.tasks.map(t => (
              <Link key={t.id} href="/tasks"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <p className="text-xs text-muted-foreground">{t.task_type}</p>
                    {t.location && <p className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{t.location}</p>}
                    <DistanceBadge km={t.distance_km} />
                  </div>
                </div>
                <p className="text-sm font-bold text-amber-600 shrink-0">{t.offered_payment?.toLocaleString()} {t.currency}</p>
              </Link>
            ))}
          </CollapsibleSection>
        )}

        {results.posts?.length > 0 && (tab === "all" || tab === "posts") && (
          <CollapsibleSection title={t('search.posts')} icon={FileText} count={results.posts.length} sectionKey="posts" expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
            {results.posts.map(p => (
              <div key={p.id} className="p-3 rounded-xl hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {p.author_avatar ? <img src={p.author_avatar} alt="" className="w-full h-full object-cover rounded-full" /> : p.author_name?.charAt(0)}
                  </div>
                  <p className="text-xs font-medium">{p.author_name}</p>
                  <p className="text-[10px] text-muted-foreground ml-auto">{moment(p.created_at).fromNow()}</p>
                </div>
                <p className="text-sm line-clamp-2">{p.content}</p>
                <p className="text-xs text-muted-foreground mt-1">❤️ {p.like_count} · 💬 {p.comment_count}</p>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {results.jobs?.length > 0 && tab === "jobs" && (
          <CollapsibleSection title={t('nav.jobs')} icon={Briefcase} count={results.jobs.length} sectionKey="jobs" expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
            {results.jobs.map(j => (
              <Link key={j.id} href="/jobs"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium truncate">{j.title}</p>
                    <DistanceBadge km={j.distance_km} />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <Badge variant="outline" className="text-[10px] py-0">{j.job_type?.replace("_"," ")}</Badge>
                    {j.location && <p className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{j.location}</p>}
                    {j.is_remote && <Badge variant="outline" className="text-[10px] py-0 text-green-600">{t('search.remote')}</Badge>}
                  </div>
                  {(j.salary_min || j.salary_max) && (
                    <p className="text-xs text-amber-600 font-medium mt-0.5">
                      {j.salary_min?.toLocaleString()} – {j.salary_max?.toLocaleString()} {j.currency}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </CollapsibleSection>
        )}

        {results.events?.length > 0 && tab === "events" && (
          <CollapsibleSection title={t('nav.events')} icon={CalendarDays} count={results.events.length} sectionKey="events" expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
            {results.events.map(e => (
              <Link key={e.id} href="/events"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {e.cover_image ? <img src={e.cover_image} alt="" className="w-full h-full object-cover rounded-xl" /> : <CalendarDays className="w-5 h-5 text-emerald-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <DistanceBadge km={e.distance_km} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs text-muted-foreground">{moment(e.start_at).format("MMM D, YYYY")}</p>
                    {e.is_online ? <Badge variant="outline" className="text-[10px] py-0 text-blue-600">{t('search.online')}</Badge>
                      : e.location && <p className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{e.location}</p>}
                  </div>
                  {e.ticket_price > 0 && <p className="text-xs text-amber-600 font-medium">{e.ticket_price?.toLocaleString()} {e.currency}</p>}
                </div>
              </Link>
            ))}
          </CollapsibleSection>
        )}

      </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function CollapsibleSection({
  title,
  icon: Icon,
  count,
  sectionKey,
  expandedSections,
  setExpandedSections,
  children,
  itemCount,
}: {
  title: string;
  icon: any;
  count: number;
  sectionKey: string;
  expandedSections: Record<string, boolean>;
  setExpandedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  children: React.ReactNode;
  /** Override item count for sections where children don't map 1:1 to items (e.g. grid wrappers) */
  itemCount?: number;
}) {
  const isExpanded = !!expandedSections[sectionKey];
  const items = React.Children.toArray(children);
  // When itemCount is provided (e.g. grid sections), use it for show-more logic
  const effectiveCount = itemCount ?? items.length;
  const visibleItems = (itemCount == null && !isExpanded) ? items.slice(0, 5) : items;
  const hiddenCount = effectiveCount - 5;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      <div className="bg-card dark:bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
        {visibleItems}
      </div>
      {!isExpanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, [sectionKey]: true }))}
          className="mt-1.5 w-full text-xs font-medium text-amber-600 hover:text-amber-700 py-2 rounded-xl hover:bg-amber-50 transition-colors"
        >
          Show {hiddenCount} more
        </button>
      )}
      {isExpanded && (
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, [sectionKey]: false }))}
          className="mt-1.5 w-full text-xs font-medium text-muted-foreground hover:text-foreground py-2 rounded-xl hover:bg-secondary transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}


