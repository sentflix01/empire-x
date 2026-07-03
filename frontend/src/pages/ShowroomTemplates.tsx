// @ts-nocheck
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, ChevronDown, Check, ArrowLeft, Search, Sparkles, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BUILDER_CATEGORY_META,
  BUILDER_TEMPLATES,
  CATEGORY_DEFAULT_SECTIONS,
} from "@/lib/builderSections";

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
  templates: (BUILDER_TEMPLATES[meta.cat] || []).map((name, i) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    category: meta.cat,
    color: meta.color,
  })),
}));

const TOTAL_TEMPLATES = ALL_CATEGORIES.reduce((s, c) => s + c.templates.length, 0);

// Mini skeleton preview per category color
function TemplateCard({ template, selected, onSelect }: { template: any; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onSelect()}
      className={`relative bg-white dark:bg-card rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${selected ? "ring-2 border-amber-400 shadow-md" : "border-border/50 hover:border-amber-300"}`}
      style={selected ? { "--tw-ring-color": template.color } as any : {}}
    >
      {/* Color header */}
      <div className="h-16 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${template.color}cc, ${template.color}66)` }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
        <div className="absolute bottom-2 left-3 right-3 space-y-1">
          <div className="h-2 bg-white/70 rounded-full w-3/5" />
          <div className="h-1.5 bg-white/50 rounded-full w-2/5" />
        </div>
      </div>

      {/* Checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow"
            style={{ backgroundColor: template.color }}
          >
            <Check className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-2">
        <p className="text-xs font-semibold leading-tight truncate">{template.name}</p>
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
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 px-4 pb-4 pt-2">
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
  const navigate = useNavigate();
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
    navigate(`/showroom/create?template=${selected.id}&category=${encodeURIComponent(selected.category)}`);
  };

  return (
    <div className="pb-24">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
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
          onClick={() => navigate("/showroom/create")}
          className="w-full flex items-center gap-3 px-4 py-3 mb-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Start from a blank canvas</p>
            <p className="text-xs text-amber-600">Build your showroom from scratch</p>
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
      <div className="fixed bottom-0 left-0 right-0 md:left-14 lg:left-52 z-50 bg-card border-t border-border/50 shadow-xl px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key="sel" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: selected.color + "22" }}>
                  <Crown className="w-3.5 h-3.5" style={{ color: selected.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Selected:</p>
                  <p className="text-sm font-semibold truncate">{selected.name}</p>
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
            className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shrink-0 gap-1.5 disabled:opacity-50"
          >
            Continue →
          </Button>
        </div>
      </div>
    </div>
  );
}
