'use client';
/**
 * ShowroomWizard — unified "Showroom Studio" flow.
 *
 * Merges the old Category & Template picker (/showroom/templates) and the
 * Sample Preview page (/showroom/samples) into ONE three-step wizard:
 *   1. Category  — pick a business category (BUILDER_CATEGORY_META)
 *   2. Template  — pick one of 300 templates (or start from scratch),
 *                  with inline live Starter/Premium sample previews
 *   3. Customize — the existing showroom builder (ShowroomCreate)
 *
 * Business domain → gold/amber accent styling throughout.
 * Deep-link contract preserved: ?category=, ?template=&category=&sample=
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, ArrowLeft, ArrowRight, Search, X, Check, Plus,
  Store, Heart, UtensilsCrossed, HardHat, Truck, GraduationCap,
  Briefcase, Sprout, Hotel, Sparkles, Monitor, Smartphone, PenLine,
} from "lucide-react";
import { BUILDER_CATEGORY_META, BUILDER_TEMPLATES } from "@/lib/builderSections";
import { getShowroomTemplateSamples } from "@/lib/showroomTemplateSamples";
import BuilderPreview from "@/components/showroom/BuilderPreview";
import ShowroomCreate from "@/views/ShowroomCreate";
import ErrorBoundary from '@/components/ErrorBoundary';

const GOLD = "#b8860b";

// Lucide icon mapping for categories (same names as BUILDER_CATEGORY_META.icon)
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Store, Heart, UtensilsCrossed, HardHat, Truck,
  GraduationCap, Briefcase, Sprout, Hotel, Sparkles,
};

const CATEGORIES = BUILDER_CATEGORY_META.map(meta => ({
  ...meta,
  Icon: ICON_MAP[meta.icon] ?? Store,
  templates: BUILDER_TEMPLATES[meta.cat] || [],
}));

const TOTAL_TEMPLATES = CATEGORIES.reduce((s, c) => s + c.templates.length, 0);

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const titleCase = (value = "") =>
  value.replace(/-/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase());

interface WizardTemplate {
  id: string;
  name: string;
  category: string;
}

/* ── Mini skeleton preview inside template cards ─────────────────────────── */
function TemplateMiniPane({ premium }: { premium: boolean }) {
  return (
    <div
      className={`relative h-16 overflow-hidden rounded-lg border p-1.5 ${
        premium
          ? "border-amber-300/70 bg-gradient-to-br from-amber-500/90 to-amber-700/90"
          : "border-amber-200/70 bg-gradient-to-br from-amber-300/70 to-amber-500/60"
      }`}
    >
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 18% 34%, white 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
      <div className="relative flex items-center justify-between">
        <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide" style={{ color: GOLD }}>
          {premium ? "Premium" : "Starter"}
        </span>
        {premium && <Crown className="h-2.5 w-2.5 text-white/90" />}
      </div>
      <div className="relative mt-1.5 space-y-1">
        <div className="h-1.5 w-2/3 rounded-full bg-white/80" />
        <div className="grid grid-cols-3 gap-1">
          <div className="h-5 rounded bg-white/70" />
          <div className="h-5 rounded bg-white/50" />
          <div className="h-5 rounded bg-white/35" />
        </div>
      </div>
    </div>
  );
}

function WizardTemplateCard({ template, selected, onSelect }: {
  template: WizardTemplate; selected: boolean; onSelect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onSelect()}
      className={`relative cursor-pointer overflow-hidden rounded-xl border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-card ${
        selected
          ? "border-amber-500 shadow-md ring-2 ring-amber-500/70"
          : "border-border/50 hover:border-amber-300"
      }`}
    >
      <div className="grid gap-1.5 p-1.5">
        <TemplateMiniPane premium={false} />
        <TemplateMiniPane premium />
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow"
          >
            <Check className="h-3 w-3 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-2">
        <p className="truncate text-xs font-semibold leading-tight">{template.name}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {t("showroomWizard.samplesReady", { count: 2 })}
        </p>
      </div>
    </div>
  );
}

/* ── Stepper header ──────────────────────────────────────────────────────── */
function WizardStepper({ step, canGoTo, onGoTo, labels }: {
  step: number;
  canGoTo: (n: number) => boolean;
  onGoTo: (n: number) => void;
  labels: string[];
}) {
  return (
    <div className="flex items-center">
      {[1, 2, 3].map((n, i) => {
        const state = n < step ? "done" : n === step ? "active" : "todo";
        const clickable = canGoTo(n) && n !== step;
        return (
          <React.Fragment key={n}>
            {i > 0 && (
              <div className={`mx-1.5 h-0.5 flex-1 rounded-full transition-colors sm:mx-2 ${n <= step ? "bg-amber-500" : "bg-border"}`} />
            )}
            <button
              type="button"
              onClick={() => clickable && onGoTo(n)}
              disabled={!clickable}
              className={`flex shrink-0 items-center gap-1.5 ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  state === "done"
                    ? "bg-amber-500 text-white"
                    : state === "active"
                      ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30 ring-4 ring-amber-500/15"
                      : "border border-border bg-card text-muted-foreground"
                }`}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span
                className={`hidden text-xs font-semibold sm:block ${
                  state === "active" ? "text-amber-600 dark:text-amber-400" : state === "done" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {labels[i]}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Main wizard ─────────────────────────────────────────────────────────── */
function ShowroomWizard() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramCategory = searchParams.get("category") || "";
  const paramTemplate = searchParams.get("template") || "";
  const paramSample = searchParams.get("sample") || "";
  const paramStep = Number(searchParams.get("step") || "0");

  const matchCategory = (raw: string) => {
    if (!raw) return "";
    const decoded = raw.replace(/-/g, " ").toLowerCase();
    return CATEGORIES.find(c => c.cat.toLowerCase() === decoded)?.cat || "";
  };

  const initCategory = matchCategory(paramCategory);
  const initStep =
    paramSample && paramTemplate ? 3
      : paramStep === 3 ? 3
        : paramStep === 2 ? (initCategory ? 2 : 1)
          : paramTemplate && initCategory ? 2
            : 1;

  const [step, setStep] = useState(initStep);
  const [category, setCategory] = useState(initCategory);
  const [templateId, setTemplateId] = useState(paramTemplate);
  const [sampleSel, setSampleSel] = useState(paramSample);
  const [search, setSearch] = useState("");
  const [previewMode, setPreviewMode] = useState<"mobile" | "tablet">("tablet");

  const scrollRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setPreviewMode(query.matches ? "tablet" : "mobile");
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /* Reconcile state when the URL changes externally (browser back/forward) */
  useEffect(() => {
    const urlCat = paramCategory
      ? CATEGORIES.find(c => c.cat.toLowerCase() === paramCategory.replace(/-/g, " ").toLowerCase())?.cat || ""
      : "";
    const urlStep =
      paramSample && paramTemplate ? 3
        : paramStep === 3 ? 3
          : paramStep === 2 ? (urlCat ? 2 : 1)
            : paramTemplate && urlCat ? 2
              : 1;
    if (urlStep !== step || urlCat !== category || paramTemplate !== templateId || paramSample !== sampleSel) {
      setStep(urlStep);
      setCategory(urlCat);
      setTemplateId(paramTemplate);
      setSampleSel(paramSample);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => {
    if (templateId) previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [templateId]);

  /* Keep the URL deep-linkable as the user progresses */
  const syncUrl = (opts: { step: number; category?: string; template?: string; sample?: string }) => {
    const p = new URLSearchParams();
    if (opts.step > 1) p.set("step", String(opts.step));
    if (opts.category) p.set("category", opts.category);
    if (opts.template) p.set("template", opts.template);
    if (opts.sample) p.set("sample", opts.sample);
    const qs = p.toString();
    router.replace(qs ? `/showroom/create?${qs}` : "/showroom/create", { scroll: false });
  };

  const pickCategory = (cat: string) => {
    setCategory(cat);
    setTemplateId("");
    setSampleSel("");
    setStep(2);
    syncUrl({ step: 2, category: cat });
  };

  const changeCategory = () => {
    setStep(1);
    syncUrl({ step: 1, category });
  };

  const pickTemplate = (id: string) => {
    const next = templateId === id ? "" : id;
    setTemplateId(next);
    setSampleSel("");
    syncUrl({ step: 2, category, template: next || undefined });
  };

  const startFromScratch = () => {
    setTemplateId("");
    setSampleSel("");
    setStep(3);
    syncUrl({ step: 3, category });
  };

  const customizeSample = (sampleId: string) => {
    setSampleSel(sampleId);
    setStep(3);
    syncUrl({ step: 3, category, template: templateId, sample: sampleId });
  };

  const goToStep = (n: number) => {
    if (n === 1) { changeCategory(); return; }
    if (n === 2 && category) {
      setStep(2);
      syncUrl({ step: 2, category, template: templateId || undefined });
    }
  };

  const canGoTo = (n: number) => n < step || (n === 2 && !!category && step === 3);

  const activeCat = CATEGORIES.find(c => c.cat === category);

  const templates: WizardTemplate[] = useMemo(() => {
    if (!activeCat) return [];
    const q = search.trim().toLowerCase();
    return activeCat.templates
      .map(name => ({ id: slugify(name), name, category: activeCat.cat }))
      .filter(tpl => !q || tpl.name.toLowerCase().includes(q));
  }, [activeCat, search]);

  const samples = useMemo(
    () => (templateId && activeCat ? getShowroomTemplateSamples(titleCase(templateId), activeCat.cat) : []),
    [templateId, activeCat]
  );

  const stepLabels = [
    t("showroomWizard.stepCategory"),
    t("showroomWizard.stepTemplate"),
    t("showroomWizard.stepCustomize"),
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-amber-50/30 dark:bg-slate-950">
      {/* ── Stepper header ── */}
      <div className="shrink-0 border-b border-amber-200/60 bg-white/95 backdrop-blur dark:border-amber-900/40 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-5">
          <div className="hidden items-center gap-2 md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm shadow-amber-500/30">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-tight">{t("showroomWizard.title")}</p>
              <p className="text-[10px] text-muted-foreground">
                {t("showroomWizard.counts", { templates: TOTAL_TEMPLATES, categories: CATEGORIES.length })}
              </p>
            </div>
          </div>
          <div className="hidden h-8 w-px bg-border md:block" />
          <div className="min-w-0 flex-1">
            <WizardStepper step={step} canGoTo={canGoTo} onGoTo={goToStep} labels={stepLabels} />
          </div>
          {/* Mobile step indicator */}
          <span className="text-xs font-bold text-amber-600 md:hidden">{step}/3</span>
        </div>
      </div>

      {/* ── Steps 1 & 2: scrollable content ── */}
      {step < 3 && (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ══ STEP 1 — CATEGORY ══ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="mx-auto max-w-5xl px-4 py-8"
              >
                <div className="mb-6">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-600">
                    {t("showroomWizard.stepCategory")} — 1/3
                  </p>
                  <h1 className="font-display text-2xl font-bold tracking-normal">{t("showroomWizard.step1Title")}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t("showroomWizard.step1Desc")}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {CATEGORIES.map((cat, i) => {
                    const selected = category === cat.cat;
                    return (
                      <motion.button
                        key={cat.cat}
                        type="button"
                        onClick={() => pickCategory(cat.cat)}
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.25 }}
                        className={`group relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/10 ${
                          selected
                            ? "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-md shadow-amber-500/15 ring-2 ring-amber-500/60 dark:from-amber-900/25 dark:to-amber-900/10"
                            : "border-border/60 bg-white hover:border-amber-300 dark:bg-card"
                        }`}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${cat.color}1a` }}
                        >
                          <cat.Icon className="h-5 w-5" style={{ color: cat.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-snug">{cat.cat}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {t("showroomWizard.templatesIn", { count: cat.templates.length })}
                          </p>
                        </div>
                        {selected && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow">
                            <Check className="h-3 w-3 text-white" />
                          </span>
                        )}
                        <span className={`absolute bottom-3 right-3 transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-60"}`}>
                          <ArrowRight className="h-4 w-4 text-amber-600" />
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ══ STEP 2 — TEMPLATE ══ */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="mx-auto max-w-5xl px-4 py-8 pb-16"
              >
                {/* Category summary row */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={changeCategory}
                    className="flex items-center gap-1.5 rounded-full border border-border/60 bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-amber-300 hover:text-foreground dark:bg-card"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("showroomWizard.back")}
                  </button>
                  {activeCat && (
                    <div className="flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 py-1.5 pl-2 pr-3 dark:bg-amber-900/20">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: `${activeCat.color}1f` }}>
                        <activeCat.Icon className="h-3.5 w-3.5" style={{ color: activeCat.color }} />
                      </span>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300">{activeCat.cat}</span>
                      <button type="button" onClick={changeCategory} className="text-[11px] font-semibold text-amber-600 underline-offset-2 hover:underline">
                        {t("showroomWizard.changeCategory")}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-5">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-600">
                    {t("showroomWizard.stepTemplate")} — 2/3
                  </p>
                  <h1 className="font-display text-2xl font-bold tracking-normal">{t("showroomWizard.step2Title")}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t("showroomWizard.step2Desc")}</p>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t("showroomWizard.searchPlaceholder")}
                    className="w-full rounded-full border border-transparent bg-secondary py-2.5 pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-muted-foreground/20">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* Start from scratch — blank canvas */}
                <button
                  type="button"
                  onClick={startFromScratch}
                  className="mb-4 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-amber-400/70 bg-amber-50/60 p-4 text-left transition-all hover:border-amber-500 hover:bg-amber-50 hover:shadow-md hover:shadow-amber-500/10 dark:border-amber-600/50 dark:bg-amber-900/15 dark:hover:bg-amber-900/25"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm shadow-amber-500/30">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{t("showroomWizard.startFromScratch")}</p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/70">{t("showroomWizard.startFromScratchDesc")}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-amber-600" />
                </button>

                {/* Template grid */}
                {templates.length === 0 ? (
                  <div className="py-14 text-center text-muted-foreground">
                    <Crown className="mx-auto mb-3 h-10 w-10 opacity-20" />
                    <p className="text-sm">{t("showroomWizard.noResults", { search })}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {templates.map(tpl => (
                      <WizardTemplateCard
                        key={tpl.id}
                        template={tpl}
                        selected={templateId === tpl.id}
                        onSelect={() => pickTemplate(tpl.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Inline live sample preview (replaces old /showroom/samples page) */}
                <div ref={previewRef} className="scroll-mt-4">
                  <AnimatePresence>
                    {templateId && samples.length > 0 && (
                      <motion.div
                        key={templateId}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-8"
                      >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h2 className="font-display flex items-center gap-2 text-lg font-bold">
                              <PenLine className="h-4 w-4 text-amber-600" />
                              {t("showroomWizard.livePreview")} — {titleCase(templateId)}
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">{t("showroomWizard.previewHint")}</p>
                          </div>
                          <div className="flex gap-1 rounded-full border border-border/60 bg-white p-1 dark:bg-card">
                            {([["tablet", Monitor], ["mobile", Smartphone]] as const).map(([m, Icon]) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setPreviewMode(m)}
                                className={`rounded-full p-1.5 transition-colors ${previewMode === m ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white" : "text-muted-foreground hover:bg-secondary"}`}
                                aria-label={m}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                          {samples.map(sample => (
                            <section key={sample.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                              <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    {sample.id === "premium"
                                      ? <Crown className="h-4 w-4 text-amber-500" />
                                      : <Monitor className="h-4 w-4 text-amber-600" />}
                                    <h3 className="text-base font-bold">{sample.name}</h3>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">{sample.desc}</p>
                                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                                    {t("showroomWizard.sectionsIncluded", { count: sample.activeSections.length })}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => customizeSample(sample.id)}
                                  className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-xs font-bold text-white shadow-md shadow-amber-500/25 transition-all hover:from-amber-600 hover:to-amber-700 sm:h-9 sm:w-auto"
                                >
                                  <PenLine className="h-3.5 w-3.5" />
                                  {sample.id === "premium" ? t("showroomWizard.customizePremium") : t("showroomWizard.customizeStarter")}
                                </button>
                              </div>
                              <div className="h-[420px] bg-slate-100 p-2 dark:bg-slate-900 md:h-[520px] md:p-3">
                                <BuilderPreview
                                  formData={sample.formData}
                                  activeSections={sample.activeSections}
                                  mode={previewMode}
                                  showWhatsapp
                                  fontFamily="Inter"
                                />
                              </div>
                            </section>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── STEP 3 — CUSTOMIZE: existing builder, prefilled ── */}
      {step === 3 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <ShowroomCreate
            key={`${templateId}|${category}|${sampleSel}`}
            templateParamOverride={templateId}
            categoryParamOverride={category}
            sampleParamOverride={sampleSel}
            onBack={() => {
              setStep(2);
              syncUrl({ step: 2, category, template: templateId || undefined });
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function ShowroomWizardPage() {
  return <ErrorBoundary><ShowroomWizard /></ErrorBoundary>;
}
