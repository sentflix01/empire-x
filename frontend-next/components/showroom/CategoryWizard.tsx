'use client';
/**
 * CategoryWizard.tsx
 *
 * 3-step wizard for creating a new showroom:
 *   Step 1 — Find your business category (search or browse all 20)
 *   Step 2 — Choose your specific subcategory
 *   Step 3 — Name your business + pick a color
 *
 * Design goal: Any business owner in the world finds their category
 * in under 10 seconds, and has a named showroom in under 2 minutes.
 */
import React, { useState, useMemo } from 'react';
import {
  Search, ChevronRight, ChevronLeft, Check, Palette, Building2,
  ArrowRight, Loader2, X,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BUSINESS_CATEGORIES, searchCategories, type BusinessCategory } from '@/lib/showroomTaxonomy';

// ── Brand color options ───────────────────────────────────────────────────────
const BRAND_COLORS = [
  { label: 'Ocean Blue',    value: '#2563eb' },
  { label: 'Royal Purple',  value: '#7c3aed' },
  { label: 'Emerald Green', value: '#10b981' },
  { label: 'Sunset Orange', value: '#f97316' },
  { label: 'Rose Pink',     value: '#ec4899' },
  { label: 'Gold',          value: '#d97706' },
  { label: 'Sky Blue',      value: '#0ea5e9' },
  { label: 'Crimson Red',   value: '#dc2626' },
  { label: 'Dark Teal',     value: '#0f766e' },
  { label: 'Midnight',      value: '#1e293b' },
];

// ── Dynamic icon resolver ─────────────────────────────────────────────────────
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!Icon) return <Building2 className={className} />;
  return <Icon className={className} />;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface CategoryWizardProps {
  onComplete: (data: {
    categoryKey: string;
    subcategory: string;
    name: string;
    tagline: string;
    color: string;
  }) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CategoryWizard({ onComplete, onCancel, isSubmitting }: CategoryWizardProps) {
  const [step,        setStep]        = useState<1 | 2 | 3>(1);
  const [query,       setQuery]       = useState('');
  const [category,    setCategory]    = useState<BusinessCategory | null>(null);
  const [subcategory, setSubcategory] = useState('');
  const [name,        setName]        = useState('');
  const [tagline,     setTagline]     = useState('');
  const [color,       setColor]       = useState('');
  const [customColor, setCustomColor] = useState('');

  // Search results
  const results = useMemo(() =>
    query.trim() ? searchCategories(query) : BUSINESS_CATEGORIES,
  [query]);

  // Suggest name/color when category is selected
  function pickCategory(cat: BusinessCategory) {
    setCategory(cat);
    setSubcategory('');
    if (!color) setColor(cat.suggestedColor);
    setStep(2);
    setQuery('');
  }

  function pickSubcategory(sub: string) {
    setSubcategory(sub);
    setStep(3);
    // Pre-fill name with sample if user hasn't typed one yet
    if (!name) setName('');
  }

  function handleSubmit() {
    if (!category || !name.trim()) return;
    onComplete({
      categoryKey: category.key,
      subcategory: subcategory || category.subcategories[0],
      name: name.trim(),
      tagline: tagline.trim(),
      color: customColor || color || category.suggestedColor,
    });
  }

  const effectiveColor = customColor || color || category?.suggestedColor || '#2563eb';
  const canSubmit      = category && name.trim().length >= 2;

  // ── Step progress indicator ───────────────────────────────────────────────
  function StepDot({ n }: { n: 1 | 2 | 3 }) {
    const done    = step > n;
    const current = step === n;
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium transition-all
        ${current ? 'text-foreground' : done ? 'text-emerald-500' : 'text-muted-foreground'}`}
      >
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all
          ${current ? 'border-primary bg-primary text-primary-foreground'
                    : done ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-border text-muted-foreground'}`}
        >
          {done ? <Check className="w-3 h-3" /> : n}
        </div>
        <span className="hidden sm:inline">
          {n === 1 ? 'Category' : n === 2 ? 'Type' : 'Details'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[85vh] bg-card rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${effectiveColor}20`, color: effectiveColor }}>
          <Building2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold">Create Your Showroom</h2>
          <p className="text-xs text-muted-foreground">Your business website, ready in minutes</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30 shrink-0">
        <StepDot n={1} />
        <div className={`flex-1 h-px transition-colors ${step > 1 ? 'bg-emerald-500' : 'bg-border'}`} />
        <StepDot n={2} />
        <div className={`flex-1 h-px transition-colors ${step > 2 ? 'bg-emerald-500' : 'bg-border'}`} />
        <StepDot n={3} />
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto">

        {/* ══ STEP 1: Choose Category ══════════════════════════════════════ */}
        {step === 1 && (
          <div className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-1">What kind of business do you have?</h3>
              <p className="text-xs text-muted-foreground">Type keywords or browse all categories below.</p>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. coffee, clinic, construction, farming..."
                className="pl-10 rounded-xl text-base"
                autoFocus
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results */}
            {query && results.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No match for "{query}". Try different keywords or browse below.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {results.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => pickCategory(cat)}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-secondary/30 text-left transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${cat.suggestedColor}18` }}>
                    {cat.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{cat.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{cat.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ STEP 2: Choose Subcategory ═══════════════════════════════════ */}
        {step === 2 && category && (
          <div className="p-5">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>

            <div className="flex items-center gap-3 mb-5 p-3.5 rounded-xl border border-border/50 bg-secondary/20">
              <span className="text-2xl">{category.emoji}</span>
              <div>
                <p className="text-sm font-semibold">{category.label}</p>
                <p className="text-[11px] text-muted-foreground">{category.description}</p>
              </div>
            </div>

            <h3 className="text-sm font-semibold mb-1">What type specifically?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              This helps us set up the right sections for you.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {category.subcategories.map(sub => (
                <button
                  key={sub}
                  onClick={() => pickSubcategory(sub)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all
                    ${subcategory === sub
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/50 hover:border-primary/40 hover:bg-secondary/30 text-muted-foreground hover:text-foreground'}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: subcategory === sub ? effectiveColor : 'hsl(var(--muted-foreground))' }} />
                  {sub}
                </button>
              ))}
              <button
                onClick={() => pickSubcategory('Other')}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-border/50 hover:border-primary/40 text-left text-sm text-muted-foreground hover:text-foreground transition-all"
              >
                <span className="w-2 h-2 rounded-full border border-muted-foreground shrink-0" />
                Other / Not listed
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Name & Color ══════════════════════════════════════════ */}
        {step === 3 && category && (
          <div className="p-5">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>

            {/* Preview */}
            <div className="mb-5 rounded-xl overflow-hidden border border-border/50">
              <div className="h-12 w-full" style={{ backgroundColor: effectiveColor, opacity: 0.9 }} />
              <div className="px-4 py-3 bg-secondary/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: effectiveColor }}>
                    {name.trim()[0]?.toUpperCase() || category.emoji}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{name.trim() || 'Your Business Name'}</p>
                    <p className="text-[10px] text-muted-foreground">{tagline || category.sampleTagline}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Business name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Business Name *
                </label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={category.sampleName}
                  maxLength={80}
                  className="text-base rounded-xl"
                  autoFocus
                />
                <p className="text-[10px] text-muted-foreground mt-1">{name.length}/80</p>
              </div>

              {/* Tagline */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Tagline <span className="normal-case font-normal">(optional)</span>
                </label>
                <Input
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  placeholder={category.sampleTagline}
                  maxLength={120}
                  className="text-base rounded-xl"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Brand Color
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {BRAND_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => { setColor(c.value); setCustomColor(''); }}
                      title={c.label}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        (customColor || color) === c.value ? 'border-white shadow-lg scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  {/* Custom color */}
                  <label title="Custom color" className="w-8 h-8 rounded-full border-2 border-border/50 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden">
                    <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="color"
                      value={customColor || color || '#2563eb'}
                      onChange={e => { setCustomColor(e.target.value); setColor(''); }}
                      className="opacity-0 absolute w-0 h-0"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Selected: <span className="font-mono">{effectiveColor}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border/50 shrink-0 flex items-center gap-3">
        {step === 3 ? (
          <>
            <div className="flex-1 min-w-0">
              {!name.trim() && (
                <p className="text-xs text-red-500">Please enter your business name to continue.</p>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="rounded-full px-6 font-semibold text-white"
              style={canSubmit ? { background: `linear-gradient(135deg, ${effectiveColor}, ${effectiveColor}cc)` } : undefined}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
              ) : (
                <>Create Showroom <ArrowRight className="w-4 h-4 ml-1.5" /></>
              )}
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {step === 1
              ? `Browse ${BUSINESS_CATEGORIES.length} categories or search above`
              : `${category?.subcategories.length} options for ${category?.label}`}
          </p>
        )}
      </div>
    </div>
  );
}
