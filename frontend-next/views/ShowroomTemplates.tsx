'use client'
import { useRouter } from 'next/navigation';
import React, { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';

import { motion, AnimatePresence } from "framer-motion";
import { Crown, ChevronDown, Check, ArrowLeft, Search, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BUILDER_CATEGORY_META,
  BUILDER_TEMPLATES,
} from "@/lib/builderSections";
import { getShowroomTemplateSamples } from "@/lib/showroomTemplateSamples";
import { useTranslation } from 'react-i18next';

// Lucide icon mapping for categories
import {
  Store, Heart, UtensilsCrossed, HardHat, Truck,
  GraduationCap, Briefcase, Sprout, Hotel, Sparkles as SpaIcon,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Store, Heart, UtensilsCrossed,
  HardHat: HardHat,
  Truck, GraduationCap, Briefcase, Sprout, Hotel,
  Sparkles: SpaIcon,
};

// Build all categories with templates
const ALL_CATEGORIES = BUILDER_CATEGORY_META.map(meta => ({
  ...meta,
  Icon: ICON_MAP[meta.icon] ?? Store,
  templates: (BUILDER_TEMPLATES[meta.cat] || []).map((name) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    category: meta.cat,
    color: meta.color,
  })),
}));

const TOTAL_TEMPLATES = ALL_CATEGORIES.reduce((s, c) => s + c.templates.length, 0);

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function getPreviewAccent(template: any) {
  const name = template.name.toLowerCase();
  const category = template.category.toLowerCase();
  if (name.includes("import") || name.includes("export") || name.includes("logistics") || name.includes("courier")) return "#2563EB";
  if (name.includes("fashion") || name.includes("beauty") || name.includes("cosmetic") || category.includes("beauty")) return "#EC4899";
  if (name.includes("pharmacy") || name.includes("clinic") || name.includes("medical") || category.includes("health")) return "#10B981";
  if (name.includes("restaurant") || name.includes("coffee") || name.includes("bakery") || category.includes("food")) return "#F59E0B";
  if (name.includes("real estate") || name.includes("construction") || name.includes("hardware")) return "#7C3AED";
  if (name.includes("school") || name.includes("academy") || name.includes("training") || category.includes("education")) return "#06B6D4";
  return template.color || "#2563EB";
}

function getPreviewKind(template: any) {
  const name = template.name.toLowerCase();
  const category = template.category.toLowerCase();
  if (name.includes("import") || name.includes("export") || category.includes("transport")) return "logistics";
  if (name.includes("fashion") || name.includes("shop") || name.includes("store") || name.includes("supermarket") || name.includes("pharmacy")) return "commerce";
  if (name.includes("restaurant") || name.includes("coffee") || name.includes("bakery") || category.includes("food")) return "menu";
  if (name.includes("clinic") || name.includes("health") || name.includes("gym") || category.includes("health")) return "service";
  if (category.includes("education")) return "course";
  if (category.includes("construction") || category.includes("professional")) return "portfolio";
  if (category.includes("hospitality")) return "gallery";
  return "business";
}

function SampleMiniPreview({ template, sampleId }: { template: any; sampleId: "starter" | "premium" }) {
  const accent = getPreviewAccent(template);
  const kind = getPreviewKind(template);
  const premium = sampleId === "premium";
  const bg = `linear-gradient(135deg, ${rgba(accent, premium ? 0.95 : 0.78)}, ${premium ? "#7C3AED" : rgba(accent, 0.42)})`;
  const cardBg = premium ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.78)";

  return (
    <div className="relative h-20 overflow-hidden rounded-lg border border-white/60 p-1.5 shadow-sm" style={{ background: bg }}>
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 18% 34%, white 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
      <div className="relative flex items-center justify-between gap-1">
        <span className="rounded-full bg-white/85 px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ color: accent }}>
          {premium ? "Premium" : "Starter"}
        </span>
        {premium && <span className="h-2 w-2 rounded-full bg-emerald-300 shadow" />}
      </div>

      {kind === "commerce" && (
        <div className="relative mt-2 grid grid-cols-3 gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-9 rounded-md p-1" style={{ background: cardBg }}>
              <div className="mb-1 h-3 rounded-sm" style={{ backgroundColor: rgba(accent, 0.22) }} />
              <div className="h-1 rounded-full bg-slate-300" />
              {premium && <div className="mt-1 h-1 w-2/3 rounded-full bg-slate-200" />}
            </div>
          ))}
        </div>
      )}

      {kind === "logistics" && (
        <div className="relative mt-2 space-y-1.5">
          <div className="flex items-center gap-1">
            <div className="h-7 w-9 rounded-md" style={{ background: cardBg }} />
            <div className="h-1 flex-1 rounded-full bg-white/70" />
            <div className="h-5 w-5 rounded-full bg-white/85" />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="h-3 rounded bg-white/50" />
            <div className="h-3 rounded bg-white/65" />
            <div className="h-3 rounded bg-white/40" />
          </div>
        </div>
      )}

      {kind === "menu" && (
        <div className="relative mt-2 grid grid-cols-[1.1fr_0.9fr] gap-1.5">
          <div className="h-10 rounded-md p-1" style={{ background: cardBg }}>
            <div className="h-2 w-3/4 rounded-full bg-slate-300" />
            <div className="mt-1 h-1.5 w-1/2 rounded-full bg-slate-200" />
            <div className="mt-1 h-1.5 w-2/3 rounded-full" style={{ backgroundColor: rgba(accent, 0.35) }} />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="rounded-md bg-white/70" />
            <div className="rounded-md bg-white/50" />
          </div>
        </div>
      )}

      {kind === "service" && (
        <div className="relative mt-2 space-y-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-1 rounded-md px-1 py-0.5" style={{ background: cardBg }}>
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: rgba(accent, 0.35) }} />
              <div className="h-1.5 flex-1 rounded-full bg-slate-300" />
            </div>
          ))}
        </div>
      )}

      {kind === "course" && (
        <div className="relative mt-2 grid grid-cols-[0.8fr_1.2fr] gap-1.5">
          <div className="h-10 rounded-md" style={{ background: cardBg }} />
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-white/75" />
            <div className="h-2 w-4/5 rounded-full bg-white/50" />
            <div className="h-4 rounded-md bg-white/35" />
          </div>
        </div>
      )}

      {kind === "portfolio" && (
        <div className="relative mt-2 grid grid-cols-2 gap-1">
          <div className="h-10 rounded-md" style={{ background: cardBg }} />
          <div className="grid gap-1">
            <div className="rounded-md bg-white/65" />
            <div className="rounded-md bg-white/40" />
          </div>
        </div>
      )}

      {(kind === "gallery" || kind === "business") && (
        <div className="relative mt-2">
          <div className="h-3 w-2/3 rounded-full bg-white/70" />
          <div className="mt-2 grid grid-cols-3 gap-1">
            <div className="h-7 rounded-md" style={{ background: cardBg }} />
            <div className="h-7 rounded-md bg-white/55" />
            <div className="h-7 rounded-md bg-white/35" />
          </div>
        </div>
      )}
    </div>
  );
}

// Mini sample previews per template
function TemplateCard({ template, selected, onSelect }: { template: any; selected: boolean; onSelect: () => void }) {
  const samples = getShowroomTemplateSamples(template.name, template.category);
  const accent = getPreviewAccent(template);
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onSelect()}
      className={`relative bg-white dark:bg-card rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${selected ? "ring-2 border-blue-400 shadow-md" : "border-border/50 hover:border-blue-300"}`}
      style={selected ? { "--tw-ring-color": accent } as any : {}}
    >
      <div className="grid gap-1.5 p-1.5">
        {samples.map(sample => (
          <SampleMiniPreview key={sample.id} template={template} sampleId={sample.id} />
        ))}
      </div>

      {/* Checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow"
            style={{ backgroundColor: accent }}
          >
            <Check className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-2">
        <p className="text-xs font-semibold leading-tight truncate">{template.name}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{samples.length} samples ready</p>
      </div>
    </div>
  );
}

function CategoryAccordion({ cat, isOpen, onToggle, selected, onSelect }: any) {
  const { Icon, cat: catName, color, templates } = cat;
  const hasSelection = selected && templates.some((t: any) => t.id === selected.id);

  return (
    <div className={`border-b border-border/30 last:border-0 ${hasSelection ? "bg-amber-50/40 dark:bg-amber-900/10" : ""}`}>
      <button
        onClick={() => onToggle(catName)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isOpen ? "bg-amber-50 dark:bg-amber-900/20" : "hover:bg-secondary/40"}`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isOpen ? "text-white" : "bg-secondary text-muted-foreground"}`}
          style={{ backgroundColor: isOpen ? color : undefined }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: isOpen ? "#fff" : color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isOpen ? "text-amber-700 dark:text-amber-400" : ""}`}>{catName}</p>
          {hasSelection
            ? <p className="text-xs font-medium truncate" style={{ color }}>✓ {selected.name}</p>
            : <p className="text-xs text-muted-foreground">{templates.length} templates</p>
          }
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasSelection && (
            <span className="text-[10px] text-white px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color }}>
              Selected
            </span>
          )}
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className={`w-4 h-4 ${isOpen ? "text-amber-500" : "text-muted-foreground"}`} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 px-4 pb-4 pt-2">
              {templates.map((t: any) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selected?.id === t.id}
                  onSelect={() => onSelect(t)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ShowroomTemplates() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<string[]>([ALL_CATEGORIES[0].cat]);
  const [selected, setSelected] = useState<any>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_CATEGORIES;
    const q = search.toLowerCase();
    return ALL_CATEGORIES.map(cat => ({
      ...cat,
      templates: cat.templates.filter((t: any) =>
        t.name.toLowerCase().includes(q) || cat.cat.toLowerCase().includes(q)
      ),
    })).filter(c => c.templates.length > 0);
  }, [search]);

  const totalFiltered = filtered.reduce((s, c) => s + c.templates.length, 0);
  const isSearching = search.trim().length > 0;
  const visibleOpen = isSearching ? filtered.map(c => c.cat) : openCats;

  const toggleCat = (cat: string) => {
    if (isSearching) return;
    setOpenCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleSelect = (t: any) => setSelected((prev: any) => prev?.id === t.id ? null : t);

  const handleContinue = () => {
    if (!selected) return;
    router.push(`/showroom/samples?template=${selected.id}&category=${encodeURIComponent(selected.category)}`);
  };

  return (
    <div className="pb-24">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" /> Showroom Studio
            </h1>
            <p className="text-xs text-muted-foreground">{TOTAL_TEMPLATES} templates · {ALL_CATEGORIES.length} categories</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">{TOTAL_TEMPLATES} templates</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-24 py-2.5 rounded-full bg-secondary border-0 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {isSearching && (
            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{totalFiltered} found</span>
          )}
          {isSearching && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Blank canvas */}
        <button
          onClick={() => router.push("/showroom/create")}
          className="w-full flex items-center gap-3 px-4 py-3 mb-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors text-left dark:border-blue-500/45 dark:bg-blue-500/12 dark:hover:bg-blue-500/18"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/25">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Start from a blank canvas</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">Build your showroom from scratch</p>
          </div>
        </button>

        {/* Category accordions */}
        <div className="bg-white dark:bg-card rounded-2xl border border-border/50 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Crown className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No templates match "{search}"</p>
            </div>
          ) : filtered.map(cat => (
            <CategoryAccordion
              key={cat.cat}
              cat={cat}
              isOpen={visibleOpen.includes(cat.cat)}
              onToggle={toggleCat}
              selected={selected}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-16 left-0 right-0 md:bottom-0 md:left-14 lg:left-52 z-50 bg-white border-t border-slate-200 shadow-2xl shadow-slate-950/15 px-4 py-3 dark:bg-slate-950 dark:border-slate-800">
        <div className="max-w-3xl mx-auto flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key="sel" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: selected.color + "22" }}>
                  <Crown className="w-3.5 h-3.5" style={{ color: selected.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Selected:</p>
                  <p className="text-sm font-semibold truncate">{selected.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">Preview Starter and Premium before customizing.</p>
                </div>
              </motion.div>
            ) : (
              <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground flex-1">
                Select a template to continue
              </motion.p>
            )}
          </AnimatePresence>
          <Button
            onClick={handleContinue}
            disabled={!selected}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 text-white font-bold gap-1.5 shadow-lg shadow-blue-600/20 disabled:opacity-50 hover:from-blue-700 hover:to-purple-700 sm:w-auto sm:rounded-full"
          >
            Preview Samples →
          </Button>
        </div>
      </div>
    </div>
  );
}


