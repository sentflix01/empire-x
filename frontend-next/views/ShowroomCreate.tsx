'use client';
import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/lib/AuthContext";
import { entities } from "@/api/entities";
import { useTranslation } from 'react-i18next';

import {
  ArrowLeft, Monitor, Tablet, Smartphone, Moon, Sun,
  RotateCcw, RotateCw, Save, CheckCircle,
  ChevronUp, ChevronDown, Crown, PenLine, Eye,
  Download, Copy, Layers, Menu,
} from "lucide-react";
import { toast } from "sonner";
import {
  SECTION_TYPES, CATEGORY_DEFAULT_SECTIONS, COLOR_PRESETS,
  getSectionType,
} from "@/lib/builderSections";
import { getShowroomTemplateSample } from "@/lib/showroomTemplateSamples";
import BuilderForm from "@/components/showroom/BuilderForm";
import BuilderPreview from "@/components/showroom/BuilderPreview";
import ErrorBoundary from '@/components/ErrorBoundary';

const FONT_OPTIONS = ["Inter", "Playfair Display", "Space Grotesk"];

// FA icon map — exactly from use 1.html SECTION_TYPES
const FA_ICONS: Record<string, string> = {
  hero:        "fa-house",
  about:       "fa-circle-info",
  features:    "fa-star",
  items:       "fa-list",
  gallery:     "fa-images",
  testimonials:"fa-comments",
  team:        "fa-users",
  faq:         "fa-circle-question",
  pricing:     "fa-tags",
  services:    "fa-concierge-bell",
  portfolio:   "fa-briefcase",
  stats:       "fa-chart-bar",
  cta:         "fa-bullhorn",
  video:       "fa-video",
  map:         "fa-map",
  process:     "fa-route",
  caseStudies: "fa-file-alt",
  partners:    "fa-handshake",
  awards:      "fa-medal",
  resources:   "fa-file-download",
  careers:     "fa-briefcase",
  booking:     "fa-calendar-check",
  industries:  "fa-industry",
  contact:     "fa-envelope",
  social:      "fa-share-nodes",
  newsletter:  "fa-newspaper",
};

const SECTION_GROUPS = [
  {
    title: "Header",
    desc: "First impression and top-page actions",
    icon: "fa-window-maximize",
    keys: ["hero", "cta", "video"],
  },
  {
    title: "Body",
    desc: "Main content, products, proof, and details",
    icon: "fa-layer-group",
    keys: [
      "about", "features", "items", "gallery", "testimonials", "team", "faq", "pricing",
      "services", "portfolio", "stats", "process", "caseStudies", "partners", "awards",
      "resources", "careers", "booking", "industries",
    ],
  },
  {
    title: "Footer",
    desc: "Contact, location, social links, and signup",
    icon: "fa-shoe-prints",
    keys: ["map", "contact", "social", "newsletter"],
  },
];

// Smart category-aware default form data — ported from use 1.html
function getSmartDefaults(templateName: string, category: string): Record<string, any> {
  const base = {
    title: templateName || "My Business",
    subtitle: `Welcome to ${templateName || "our business"}`,
    cta: "Contact Us",
    heroBg: "#b8860b", heroBg2: "#d4a843",
    aboutTitle: "About Us", aboutDesc: "",
    galleryTitle: "Gallery", galleryImages: [],
    testTitle: "What People Say", testimonials: [],
    teamTitle: "Our Team", members: [],
    faqTitle: "Frequently Asked Questions", faqs: [],
    featTitle: "Why Choose Us", features: [],
    statsTitle: "By the Numbers", stats: [],
    pricingTitle: "Pricing", plans: [],
    portTitle: "Our Work", portfolio: [],
    newsTitle: "Stay Updated", newsDesc: "Subscribe to our newsletter", newsBtn: "Subscribe",
    vidTitle: "Watch Our Story", vidUrl: "", vidDesc: "",
    mapTitle: "Find Us", mapUrl: "", address: "",
    ctaTitle: "Ready to Get Started?", ctaDesc: "Contact us today", ctaBtn: "Contact Us", ctaBg: "#b8860b",
    bookingTitle: "Book an Appointment", bookingDesc: "Schedule your session", bookingBtn: "Book Now",
    processTitle: "How It Works", processSteps: [],
    caseTitle: "Success Stories", caseStudies: [],
    partnersTitle: "Our Partners", partners: [],
    awardsTitle: "Awards & Recognition", awards: [],
    resourcesTitle: "Resources", resources: [],
    careersTitle: "Join Our Team", careers: [],
    industriesTitle: "Industries We Serve", industries: [],
    location: "", phone: "", email: "", hours: "Mon–Sat 9AM–6PM",
    whatsapp: "", facebook: "", instagram: "", telegram: "",
    youtube: "", tiktok: "", twitter: "", linkedin: "",
  };

  // Category-aware item defaults (from use 1.html getSmartDefaults)
  const cat = category || "";
  if (cat.includes("Food") || cat.includes("Beverage"))
    return { ...base, heroBg:"#f39c12", heroBg2:"#d68910", itemsTitle:"Our Menu",
      items:[{name:"Signature Dish",desc:"Delicious & fresh",price:"ETB 250",icon:"fa-utensils"},{name:"Special Drink",desc:"Refreshing",price:"ETB 80",icon:"fa-mug-hot"},{name:"Dessert",desc:"Sweet treat",price:"ETB 120",icon:"fa-ice-cream"}], servTitle:"Our Services", services:[] };
  if (cat.includes("Health") || cat.includes("Medical"))
    return { ...base, heroBg:"#27ae60", heroBg2:"#1e8449", itemsTitle:"Our Services",
      items:[{name:"Consultation",desc:"Expert medical advice",price:"ETB 500",icon:"fa-stethoscope"},{name:"Treatment",desc:"Personalized care",price:"ETB 1,200",icon:"fa-heart-pulse"},{name:"Follow-up",desc:"Ongoing support",price:"ETB 300",icon:"fa-calendar-check"}], servTitle:"Our Services", services:[] };
  if (cat.includes("Beauty") || cat.includes("Personal"))
    return { ...base, heroBg:"#ff6f91", heroBg2:"#e91e7a", itemsTitle:"Our Services",
      items:[{name:"Haircut",desc:"Stylish cut",price:"ETB 300",icon:"fa-scissors"},{name:"Color Treatment",desc:"Premium coloring",price:"ETB 800",icon:"fa-paint-brush"},{name:"Facial",desc:"Deep cleanse",price:"ETB 600",icon:"fa-spa"}], servTitle:"Our Services", services:[] };
  if (cat.includes("Construction") || cat.includes("Trade"))
    return { ...base, heroBg:"#8e44ad", heroBg2:"#6c3483", itemsTitle:"Our Work",
      items:[{name:"Consultation",desc:"Expert advice",price:"Free",icon:"fa-hard-hat"},{name:"Residential",desc:"Full construction",price:"Get Quote",icon:"fa-house"},{name:"Commercial",desc:"Business builds",price:"Get Quote",icon:"fa-building"}], servTitle:"Our Services", services:[] };
  if (cat.includes("Education"))
    return { ...base, heroBg:"#1abc9c", heroBg2:"#148f77", itemsTitle:"Our Programs",
      items:[{name:"Beginner Course",desc:"Start your journey",price:"ETB 500/mo",icon:"fa-book"},{name:"Advanced Program",desc:"Level up skills",price:"ETB 900/mo",icon:"fa-graduation-cap"},{name:"Workshop",desc:"Intensive 1-day",price:"ETB 300",icon:"fa-chalkboard-teacher"}], servTitle:"Our Services", services:[] };
  if (cat.includes("Transport") || cat.includes("Logistics"))
    return { ...base, heroBg:"#2980b9", heroBg2:"#1f618d", itemsTitle:"Our Services",
      items:[{name:"Standard Delivery",desc:"Same-day delivery",price:"ETB 50",icon:"fa-truck"},{name:"Express",desc:"2-hour delivery",price:"ETB 120",icon:"fa-rocket"},{name:"Bulk",desc:"Large orders",price:"Get Quote",icon:"fa-boxes-stacked"}], servTitle:"Our Services", services:[] };
  if (cat.includes("Professional"))
    return { ...base, heroBg:"#d4a017", heroBg2:"#b8860b", itemsTitle:"Our Services",
      items:[{name:"Consultation",desc:"Expert advice",price:"ETB 800",icon:"fa-briefcase"},{name:"Full Service",desc:"End-to-end support",price:"ETB 3,500",icon:"fa-handshake"},{name:"Retainer",desc:"Monthly support",price:"ETB 5,000/mo",icon:"fa-calendar"}], servTitle:"Our Services", services:[] };
  if (cat.includes("Agriculture"))
    return { ...base, heroBg:"#2e7d32", heroBg2:"#1b5e20", itemsTitle:"Our Products",
      items:[{name:"Fresh Produce",desc:"Farm fresh",price:"ETB 50/kg",icon:"fa-leaf"},{name:"Organic Bundle",desc:"Weekly box",price:"ETB 350",icon:"fa-seedling"},{name:"Wholesale",desc:"Bulk orders",price:"Get Quote",icon:"fa-truck"}], servTitle:"Our Services", services:[] };
  if (cat.includes("Hospitality") || cat.includes("Tourism"))
    return { ...base, heroBg:"#e91e63", heroBg2:"#c2185b", itemsTitle:"Our Packages",
      items:[{name:"City Tour",desc:"Half-day city highlights",price:"ETB 800",icon:"fa-map"},{name:"Day Trip",desc:"Full-day experience",price:"ETB 1,500",icon:"fa-camera"},{name:"Package Tour",desc:"3-day adventure",price:"ETB 5,000",icon:"fa-plane"}], servTitle:"Our Services", services:[] };
  // Business & Commerce default
  return { ...base, itemsTitle:"Our Products", servTitle:"Our Services",
    items:[{name:"Product One",desc:"Quality item",price:"ETB 500",icon:"fa-box"},{name:"Product Two",desc:"Premium option",price:"ETB 900",icon:"fa-star"},{name:"Product Three",desc:"Best value",price:"ETB 1,200",icon:"fa-gem"}], services:[] };
}

function getDefaultFormData(templateName: string, category: string, sampleId = ""): Record<string, any> {
  if (sampleId) return getShowroomTemplateSample(templateName, category, sampleId).formData;
  return getSmartDefaults(templateName, category);
}

function getDefaultSections(templateName: string, category: string, sampleId = ""): string[] {
  if (sampleId) return getShowroomTemplateSample(templateName, category, sampleId).activeSections;
  return CATEGORY_DEFAULT_SECTIONS[category] || ["hero", "services", "testimonials", "contact", "social"];
}

/* ── Draft Dropdown — Save / Load / Clear / Undo / Redo in a compact popover ── */
function DraftDropdown({ darkBuilder, onSave, onLoad, onClear, onUndo, onRedo, canUndo, canRedo }: {
  darkBuilder: boolean;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const btnBase = `w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors text-left`;
  const btnStyle = darkBuilder
    ? `${btnBase} text-slate-200 hover:bg-slate-600`
    : `${btnBase} text-foreground hover:bg-secondary/60`;
  const btnDisabled = `${btnBase} opacity-30 cursor-not-allowed`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-[7px] rounded-lg border text-[11px] font-semibold transition-colors
          ${darkBuilder ? "border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600" : "border-border/60 bg-white text-foreground hover:bg-secondary/50"}`}
      >
        <span className="flex items-center gap-1.5">
          <i className="fa-solid fa-floppy-disk" style={{ color: "#b8860b", fontSize: 12 }} />
          Actions
        </span>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 9, opacity: 0.6 }} />
      </button>

      {open && (
        <div className={`absolute bottom-full left-0 right-0 mb-1.5 rounded-xl border shadow-lg overflow-hidden z-50
          ${darkBuilder ? "bg-slate-800 border-slate-600" : "bg-white border-border/60"}`}>

          {/* Draft actions */}
          <div className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${darkBuilder ? "text-slate-500" : "text-muted-foreground"}`}>Draft</div>
          <button onClick={() => { onSave(); setOpen(false); }} className={btnStyle}>
            <i className="fa-solid fa-floppy-disk" style={{ color: "#b8860b", fontSize: 12 }} />
            Save Draft <kbd className={`ml-auto text-[9px] px-1 py-0.5 rounded ${darkBuilder ? "bg-slate-700 border-slate-600 text-slate-400" : "bg-secondary border-border text-muted-foreground"}`}>Ctrl+S</kbd>
          </button>
          <button onClick={() => { onLoad(); setOpen(false); }} className={btnStyle}>
            <i className="fa-solid fa-folder-open" style={{ color: "#f39c12", fontSize: 12 }} />
            Load Draft
          </button>
          <button
            onClick={() => { onClear(); setOpen(false); }}
            className={`${btnBase} ${darkBuilder ? "text-red-300 hover:bg-slate-600" : "text-red-500 hover:bg-red-50"}`}
          >
            <i className="fa-solid fa-trash-can" style={{ fontSize: 12 }} />
            Clear Draft
          </button>

          {/* Divider */}
          <div className={`mx-2 my-1 border-t ${darkBuilder ? "border-slate-700" : "border-border/50"}`} />

          {/* Undo / Redo */}
          <div className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${darkBuilder ? "text-slate-500" : "text-muted-foreground"}`}>History</div>
          <button onClick={() => { if (canUndo) { onUndo(); setOpen(false); } }} className={canUndo ? btnStyle : btnDisabled} disabled={!canUndo}>
            <i className="fa-solid fa-rotate-left" style={{ fontSize: 11 }} />
            Undo <kbd className={`ml-auto text-[9px] px-1 py-0.5 rounded ${darkBuilder ? "bg-slate-700 border-slate-600 text-slate-400" : "bg-secondary border-border text-muted-foreground"}`}>Ctrl+Z</kbd>
          </button>
          <button onClick={() => { if (canRedo) { onRedo(); setOpen(false); } }} className={canRedo ? btnStyle : btnDisabled} disabled={!canRedo}>
            <i className="fa-solid fa-rotate-right" style={{ fontSize: 11 }} />
            Redo
          </button>

          {/* Divider */}
          <div className={`mx-2 my-1 border-t ${darkBuilder ? "border-slate-700" : "border-border/50"}`} />

          {/* Export */}
          <div className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${darkBuilder ? "text-slate-500" : "text-muted-foreground"}`}>Export</div>
          <button onClick={() => { setOpen(false); }} className={btnStyle} id="draft-export-trigger">
            <i className="fa-solid fa-file-export" style={{ color: "#2563eb", fontSize: 12 }} />
            Export HTML <kbd className={`ml-auto text-[9px] px-1 py-0.5 rounded ${darkBuilder ? "bg-slate-700 border-slate-600 text-slate-400" : "bg-secondary border-border text-muted-foreground"}`}>Ctrl+E</kbd>
          </button>
        </div>
      )}
    </div>
  );
}

export interface ShowroomCreateProps {
  /** Wizard overrides — take precedence over URL search params */
  templateParamOverride?: string;
  categoryParamOverride?: string;
  sampleParamOverride?: string;
  /** Back navigation handler (wizard step 2). Falls back to /showroom/templates. */
  onBack?: () => void;
}

function ShowroomCreate({
  templateParamOverride,
  categoryParamOverride,
  sampleParamOverride,
  onBack,
}: ShowroomCreateProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateParam = templateParamOverride ?? (searchParams.get("template") || "");
  const categoryParam = categoryParamOverride ?? (searchParams.get("category") || "");
  const sampleParam = sampleParamOverride ?? (searchParams.get("sample") || "");
  const editId = searchParams.get("edit") || "";
  const templateName = templateParam.replace(/-/g, " ");

  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [darkBuilder, setDarkBuilder] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop"|"tablet"|"mobile">("desktop");
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [fontFamily, setFontFamily] = useState("Inter");
  // Mobile/tablet tab: which panel is visible on small screens
  const [mobileTab, setMobileTab] = useState<"sections"|"content"|"preview">("content");
  // Sidebar drawer open on tablet (md screens)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Layout modes for right column on desktop: row-normal, row-reverse, col-normal, col-reverse
  const [rightLayout, setRightLayout] = useState<"row"|"row-rev"|"col"|"col-rev">("col");
  const [activeSections, setActiveSections] = useState<string[]>(
    getDefaultSections(templateName, categoryParam, sampleParam)
  );
  const [formData, setFormData] = useState<Record<string, any>>(
    getDefaultFormData(templateName, categoryParam, sampleParam)
  );

  // BUG[2]: edit mode - load an existing showroom into the builder
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/showrooms/${editId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        let sections = data.sections;
        if (typeof sections === 'string') { try { sections = JSON.parse(sections); } catch { sections = undefined; } }
        if (Array.isArray(sections) && sections.length) setActiveSections(sections);
        setFormData((prev: Record<string, unknown>) => ({
          ...prev,
          ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')),
          ...(sections && typeof sections === 'object' && !Array.isArray(sections) ? (sections as Record<string, unknown>) : {}),
        }));
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [editId]);
  // Undo/redo stacks
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  useEffect(() => {
    // Try to restore draft
    const draft = localStorage.getItem("nodbusiness_builder_draft");
    if (draft && !templateParam && !categoryParam && !sampleParam) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.formData) setFormData(prev => ({ ...prev, ...parsed.formData }));
        if (parsed.activeSections) setActiveSections(parsed.activeSections);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const syncPreviewMode = () => {
      if (query.matches) setPreviewMode("mobile");
    };
    syncPreviewMode();
    query.addEventListener("change", syncPreviewMode);
    return () => query.removeEventListener("change", syncPreviewMode);
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("nodbusiness_builder_draft", JSON.stringify({ formData, activeSections }));
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData, activeSections]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSaveDraft(); }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "e") { e.preventDefault(); handleExport(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [formData, activeSections, undoStack, redoStack]);

  const pushUndo = () => {
    setUndoStack(prev => [...prev.slice(-19), { formData, activeSections }]);
    setRedoStack([]);
  };

  const undo = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, { formData, activeSections }]);
    setFormData(prev.formData);
    setActiveSections(prev.activeSections);
    setUndoStack(u => u.slice(0, -1));
  };

  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, { formData, activeSections }]);
    setFormData(next.formData);
    setActiveSections(next.activeSections);
    setRedoStack(r => r.slice(0, -1));
  };

  const updateField = (key: string, value: any) => {
    pushUndo();
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (key: string) => {
    pushUndo();
    setActiveSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const moveSection = (key: string, dir: number) => {
    pushUndo();
    setActiveSections(prev => {
      const i = prev.indexOf(key);
      if (i === -1) return prev;
      const ni = i + dir;
      if (ni < 0 || ni >= prev.length) return prev;
      const a = [...prev];
      [a[i], a[ni]] = [a[ni], a[i]];
      return a;
    });
  };

  const duplicateSection = (key: string) => {
    pushUndo();
    setActiveSections(prev => {
      const i = prev.indexOf(key);
      if (i === -1) return prev;
      const a = [...prev];
      a.splice(i + 1, 0, key + "_copy_" + Date.now());
      return a;
    });
  };

  const handleSaveDraft = () => {
    localStorage.setItem("nodbusiness_builder_draft", JSON.stringify({ formData, activeSections }));
    toast.success("Draft saved ✅");
  };

  const completion = Math.round((Object.values(formData).filter(v => v && (Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0)).length / Object.keys(formData).length) * 100);

  // ── Export HTML (ported from use 1.html getExportHTML) ──────────────────────
  const getExportHTML = () => {
    const d = formData;
    const font = fontFamily;
    let html = "";
    const e = (s: any) => !s ? "" : String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    activeSections.forEach(key => {
      if (key==="hero") html+=`<header class="hero" style="background:linear-gradient(135deg,${d.heroBg||"#333"},${d.heroBg2||"#555"})"><h1>${e(d.title)}</h1><p>${e(d.subtitle)}</p>${d.cta?`<a class="btn-cta" href="#">${e(d.cta)}</a>`:""}</header>`;
      else if (key==="about") html+=`<section class="section"><h2>${e(d.aboutTitle)}</h2><p>${e(d.aboutDesc)}</p></section>`;
      else if (key==="items") html+=`<section class="section"><h2>${e(d.itemsTitle)}</h2><div class="grid">${(d.items||[]).map((it:any)=>`<div class="card"><i class="fa-solid ${it.icon||"fa-box"} card-icon"></i><h4>${e(it.name)}</h4><p>${e(it.desc)}</p><p class="price">${e(it.price)}</p></div>`).join("")}</div></section>`;
      else if (key==="gallery") html+=`<section class="section"><h2>${e(d.galleryTitle)}</h2><div class="grid gallery">${(d.galleryImages||[]).map((img:any)=>`<div><img src="${e(img.url||"https://placehold.co/300x200")}" alt="${e(img.caption)}"><p>${e(img.caption)}</p></div>`).join("")}</div></section>`;
      else if (key==="testimonials") html+=`<section class="section bg-light"><h2>${e(d.testTitle)}</h2><div class="testimonials">${(d.testimonials||[]).map((t:any)=>`<blockquote><p>${e(t.quote)}</p><footer>— ${e(t.author)}${t.role?`, ${e(t.role)}`:""}</footer></blockquote>`).join("")}</div></section>`;
      else if (key==="team") html+=`<section class="section"><h2>${e(d.teamTitle)}</h2><div class="grid">${(d.members||[]).map((m:any)=>`<div class="card team-card"><img src="${e(m.image||"https://placehold.co/100")}" alt="${e(m.name)}"><h4>${e(m.name)}</h4><p class="role">${e(m.role)}</p></div>`).join("")}</div></section>`;
      else if (key==="faq") html+=`<section class="section"><h2>${e(d.faqTitle)}</h2>${(d.faqs||[]).map((f:any)=>`<div class="faq-item"><h4 class="faq-q">${e(f.question)}</h4><p class="faq-a">${e(f.answer)}</p></div>`).join("")}</section>`;
      else if (key==="pricing") html+=`<section class="section bg-light"><h2>${e(d.pricingTitle)}</h2><div class="grid pricing">${(d.plans||[]).map((p:any)=>`<div class="card price-card${p.name?.toLowerCase().includes("pro")?" featured":""}"><h4>${e(p.name)}</h4><p class="price-large">${e(p.price)}<small>${e(p.period)}</small></p><ul>${(p.features||"").split(",").map((f:string)=>`<li>${f.trim()}</li>`).join("")}</ul><a href="#" class="btn-cta">Choose</a></div>`).join("")}</div></section>`;
      else if (key==="features") html+=`<section class="section"><h2>${e(d.featTitle)}</h2><div class="grid">${(d.features||[]).map((f:any)=>`<div class="card"><i class="fa-solid ${f.icon||"fa-star"} card-icon"></i><h4>${e(f.name)}</h4><p>${e(f.desc)}</p></div>`).join("")}</div></section>`;
      else if (key==="services") html+=`<section class="section bg-light"><h2>${e(d.servTitle)}</h2><div class="grid">${(d.services||[]).map((s:any)=>`<div class="card"><i class="fa-solid ${s.icon||"fa-cog"} card-icon"></i><h4>${e(s.name)}</h4><p>${e(s.desc)}</p></div>`).join("")}</div></section>`;
      else if (key==="portfolio") html+=`<section class="section"><h2>${e(d.portTitle)}</h2><div class="grid">${(d.portfolio||[]).map((p:any)=>`<div class="card"><img src="${e(p.image||"https://placehold.co/300x200/eee/999?text=Project")}" alt="${e(p.title)}" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover;margin-bottom:8px"><h4>${e(p.title)}</h4><p class="role">${e(p.client)}</p></div>`).join("")}</div></section>`;
      else if (key==="stats") html+=`<section class="section bg-light"><h2>${e(d.statsTitle)}</h2><div class="grid">${(d.stats||[]).map((st:any)=>`<div class="card"><i class="fa-solid ${st.icon||"fa-rocket"} card-icon"></i><div class="stat-num">${e(st.number)}</div><p>${e(st.label)}</p></div>`).join("")}</div></section>`;
      else if (key==="cta") html+=`<section style="background:${d.ctaBg||"#b8860b"};padding:40px 20px;text-align:center;color:#fff"><h2 style="color:#fff">${e(d.ctaTitle)}</h2><p>${e(d.ctaDesc)}</p><a href="#" class="btn-cta" style="background:#fff;color:${d.ctaBg||"#b8860b"}">${e(d.ctaBtn||"Contact Us")}</a></section>`;
      else if (key==="video") html+=`<section class="section"><h2>${e(d.vidTitle)}</h2>${d.vidUrl?`<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px"><iframe src="${e(d.vidUrl.replace("watch?v=","embed/").replace("youtu.be/","youtube.com/embed/"))}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe></div>`:""}<p style="text-align:center">${e(d.vidDesc)}</p></section>`;
      else if (key==="map") html+=`<section class="section"><h2>${e(d.mapTitle)}</h2>${d.mapUrl?`<div style="height:300px;border-radius:12px;overflow:hidden"><iframe src="${e(d.mapUrl)}" width="100%" height="100%" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`:`<div style="background:#e8ecf1;height:200px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#888;font-size:2rem">📍</div>`}<p style="text-align:center;color:#888;margin-top:8px">${e(d.address)}</p></section>`;
      else if (key==="process") html+=`<section class="section bg-light"><h2>${e(d.processTitle)}</h2><div class="grid">${(d.processSteps||[]).map((step:any,i:number)=>`<div class="card"><div style="width:28px;height:28px;background:#b8860b;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;margin:0 auto 8px">${i+1}</div><h4>${e(step.title)}</h4><p>${e(step.desc)}</p></div>`).join("")}</div></section>`;
      else if (key==="contact") html+=`<footer style="background:#1e1b16;color:#fff;padding:30px 20px;text-align:center"><h2 style="color:#fff">Contact</h2><p>📍 ${e(d.location)}</p><p>📞 ${e(d.phone)}</p>${d.email?`<p>✉️ ${e(d.email)}</p>`:""}</footer>`;
      else if (key==="social") html+=`<div style="display:flex;gap:16px;justify-content:center;padding:20px;background:#fff;font-size:22px">${d.facebook?`<a href="${e(d.facebook)}" style="color:#1877f2"><i class="fa-brands fa-facebook"></i></a>`:""}${d.instagram?`<a href="${e(d.instagram)}" style="color:#e4405f"><i class="fa-brands fa-instagram"></i></a>`:""}${d.youtube?`<a href="${e(d.youtube)}" style="color:#ff0000"><i class="fa-brands fa-youtube"></i></a>`:""}${d.telegram?`<a href="${e(d.telegram)}" style="color:#26a5e4"><i class="fa-brands fa-telegram"></i></a>`:""}${d.whatsapp?`<a href="https://wa.me/${d.whatsapp.replace(/\D/g,"")}" style="color:#25d366"><i class="fa-brands fa-whatsapp"></i></a>`:""}</div>`;
      else if (key==="newsletter") html+=`<section class="section" style="text-align:center;background:#faf8f4"><h2>${e(d.newsTitle)}</h2><p>${e(d.newsDesc)}</p><div style="display:flex;gap:8px;justify-content:center"><input type="email" placeholder="Your email" style="padding:10px 16px;border:1px solid #ddd;border-radius:25px;font-size:14px;width:250px"><button style="padding:10px 24px;background:#b8860b;color:#fff;border:none;border-radius:25px;font-weight:600;cursor:pointer">${e(d.newsBtn)}</button></div></section>`;
      else if (key==="booking") html+=`<section class="section" style="text-align:center;background:#faf8f4"><h2>${e(d.bookingTitle)}</h2><p>${e(d.bookingDesc)}</p><a href="#contact" class="btn-cta">${e(d.bookingBtn||"Book Now")}</a></section>`;
      else if (key==="caseStudies") html+=`<section class="section"><h2>${e(d.caseTitle)}</h2>${(d.caseStudies||[]).map((item:any)=>`<div style="border-left:4px solid #b8860b;padding:16px;margin-bottom:12px;background:#fff;border-radius:8px;border:1px solid #eee"><h4>${e(item.title)}</h4><p>${e(item.summary)}</p>${item.result?`<p style="color:#27ae60;font-weight:600">✅ ${e(item.result)}</p>`:""}</div>`).join("")}</section>`;
      else if (key==="partners") html+=`<section class="section bg-light"><h2>${e(d.partnersTitle)}</h2><div class="grid">${(d.partners||[]).map((p:any)=>`<div class="card"><img src="${e(p.logo||"https://placehold.co/160x80/eee/999?text=Partner")}" alt="${e(p.name)}" style="max-width:160px;max-height:80px;object-fit:contain;margin-bottom:8px"><h4>${e(p.name)}</h4></div>`).join("")}</div></section>`;
      else if (key==="awards") html+=`<section class="section"><h2>${e(d.awardsTitle)}</h2>${(d.awards||[]).map((a:any)=>`<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #eee"><i class="fa-solid fa-medal" style="color:#b8860b;font-size:1.4rem"></i><div><strong>${e(a.title)}</strong><p style="color:#888;margin:4px 0 0">${e(a.detail)}</p></div></div>`).join("")}</section>`;
      else if (key==="careers") html+=`<section class="section"><h2>${e(d.careersTitle)}</h2>${(d.careers||[]).map((c:any)=>`<div style="background:#fff;border-radius:8px;padding:20px;margin-bottom:10px;border:1px solid #eee;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><h4 style="margin:0 0 4px">${e(c.title)}</h4><p style="color:#888;margin:0">${e(c.location)} · ${e(c.type)}</p><a href="#" class="btn-cta" style="padding:6px 18px;font-size:13px">Apply Now</a></div>`).join("")}</section>`;
      else if (key==="industries") html+=`<section class="section bg-light"><h2>${e(d.industriesTitle)}</h2><div class="grid">${(d.industries||[]).map((ind:any)=>`<div class="card"><h4>${e(ind.name)}</h4><p>${e(ind.desc)}</p></div>`).join("")}</div></section>`;
      else if (key==="resources") html+=`<section class="section bg-light"><h2>${e(d.resourcesTitle)}</h2>${(d.resources||[]).map((r:any)=>`<div style="display:flex;gap:12px;background:#fff;border-radius:8px;padding:16px;margin-bottom:8px;border:1px solid #eee"><i class="fa-solid fa-file-arrow-down" style="color:#b8860b;font-size:1.2rem"></i><div><strong>${e(r.title)}</strong><p style="color:#888;font-size:.9rem;margin:4px 0">${e(r.desc)}</p>${r.link?`<a href="${e(r.link)}" style="color:#b8860b;font-weight:600">Download →</a>`:""}</div></div>`).join("")}</section>`;
    });
    if (showWhatsapp && d.whatsapp) html+=`<a href="https://wa.me/${d.whatsapp.replace(/\D/g,"")}" style="position:fixed;bottom:24px;right:24px;background:#25d366;color:#fff;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 4px 16px rgba(37,211,102,.3);z-index:1000;text-decoration:none" target="_blank"><i class="fa-brands fa-whatsapp"></i></a>`;
    const CSS = `body{font-family:'${font}',sans-serif;margin:0;background:#faf8f4;color:#1e1b16;line-height:1.6}.hero{color:#fff;text-align:center;padding:60px 20px}.hero h1{font-size:2.2rem;margin-bottom:8px}.btn-cta{display:inline-block;background:#fff;color:#333;padding:10px 28px;border-radius:30px;text-decoration:none;font-weight:600;margin-top:12px}.section{max-width:1000px;margin:0 auto;padding:50px 20px}.section h2{font-size:1.8rem;margin-bottom:20px;text-align:center}.bg-light{background:#fffcf8}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px}.card{background:#fff;border-radius:12px;padding:20px;text-align:center;border:1px solid #eee}.card-icon{font-size:28px;color:#b8860b;margin-bottom:8px}.price{color:#b8860b;font-weight:700;font-size:1.1rem}.testimonials blockquote{border-left:4px solid #b8860b;padding-left:16px;margin:16px 0;font-style:italic}.faq-q{font-weight:600}.price-large{font-size:2rem;font-weight:700;color:#b8860b;margin:12px 0}.stat-num{font-size:2rem;font-weight:700;color:#b8860b}.role{color:#b8860b;font-weight:600}.featured{border-color:#b8860b!important}.gallery img{width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover}@media(max-width:768px){.grid{grid-template-columns:1fr}}`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${e(d.title)}</title><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"><link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600;700;800&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>${html}</body></html>`;
  };

  const handleExport = () => {
    const blob = new Blob([getExportHTML()], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (formData.title || "website").replace(/\s/g, "-").toLowerCase() + ".html";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Website exported! 📥");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getExportHTML())
      .then(() => toast.success("Code copied! 📋"))
      .catch(() => toast.error("Copy failed"));
  };

  const handleOpenPreview = () => {
    const win = window.open("", "_blank");
    if (win) { win.document.write(getExportHTML()); win.document.close(); }
  };

  const handlePublish = async () => {
    if (!user) { toast.error("Please log in"); return; }
    if (!formData.title) { toast.error("Add a business name in the Hero section"); return; }
    setSaving(true);
    try {
      const sections = activeSections.map(key => {
        const sec = getSectionType(key);
        if (!sec) return null;
        const data: Record<string, any> = { type: key };
        sec.fields.forEach(f => { if (formData[f.key] !== undefined) data[f.key] = formData[f.key]; });
        return data;
      }).filter(Boolean);

      const showroom = await entities.Showroom.create({
        owner_id: user.id,
        title: formData.title,
        description: formData.subtitle || "",
        slug: formData.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        category: categoryParam || "business",
        sections: JSON.stringify(sections),
        status: "published",
      });
      localStorage.removeItem("nodbusiness_builder_draft");
      toast.success("Showroom published! 🎉");
      router.push(`/showrooms/${showroom.id}`);
    } catch (e) {
      toast.error("Failed to publish. Please try again.");
    }
    setSaving(false);
  };

  /* ── Reusable sections panel content (used both in sidebar and mobile tab) ── */
  const SectionsPanelContent = () => (
    <>
      {/* Header */}
      <div className={`px-3 py-2.5 border-b shrink-0 flex items-center gap-2
        ${darkBuilder ? "border-slate-700 bg-slate-900/60" : "border-border/40 bg-white"}`}>
        <i className="fa-solid fa-drafting-compass" style={{ color: "#b8860b", fontSize: 13 }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>Sections ({activeSections.length})</span>
      </div>

      {/* Section list — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {SECTION_GROUPS.map(group => {
          const sections = group.keys
            .map(key => SECTION_TYPES.find(sec => sec.key === key))
            .filter(Boolean);
          const activeCount = sections.filter(sec => activeSections.includes(sec.key)).length;
          return (
            <div key={group.title} className={`border-b last:border-b-0 ${darkBuilder ? "border-slate-700/60" : "border-border/30"}`}>
              <div className={`sticky top-0 z-10 px-3 py-2 border-b
                ${darkBuilder ? "border-slate-700 bg-slate-900" : "border-border/30 bg-slate-50"}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                    ${darkBuilder ? "bg-blue-500/15" : "bg-blue-50"}`}>
                    <i className={`fa-solid ${group.icon}`} style={{ color: "#2563EB", fontSize: 12 }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-bold ${darkBuilder ? "text-slate-100" : "text-slate-900"}`}>{group.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                        ${activeCount ? "bg-blue-600 text-white" : darkBuilder ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"}`}>
                        {activeCount}/{sections.length}
                      </span>
                    </div>
                    <p className={`text-[10px] leading-tight truncate ${darkBuilder ? "text-slate-400" : "text-slate-500"}`}>{group.desc}</p>
                  </div>
                </div>
              </div>

              {sections.map(sec => {
                const isActive = activeSections.includes(sec.key);
                const idx = activeSections.indexOf(sec.key);
                const tier = sec.tier;
                const faIcon = FA_ICONS[sec.key] ?? "fa-circle";
                return (
                  <div key={sec.key}
                    className={`flex items-center gap-1.5 px-3 py-[7px] border-b last:border-b-0 group
                      ${darkBuilder ? "border-slate-700/40 hover:bg-slate-700/30" : "border-border/15 hover:bg-secondary/50"}
                      ${isActive ? (darkBuilder ? "bg-blue-500/10" : "bg-blue-50/70") : ""}`}
                  >
                    <label className="flex items-center gap-[6px] cursor-pointer flex-1 min-w-0">
                      <input type="checkbox" checked={isActive} onChange={() => toggleSection(sec.key)}
                        className="w-[14px] h-[14px] shrink-0 cursor-pointer accent-blue-600" />
                      <i className={`fa-solid ${faIcon} shrink-0`}
                        style={{ width: 14, textAlign: "center", fontSize: 11,
                          color: isActive ? "#2563EB" : darkBuilder ? "#94a3b8" : "#6b7280" }} />
                      <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400,
                        color: isActive ? (darkBuilder ? "#93c5fd" : "#1e40af") : darkBuilder ? "#94a3b8" : "#374151",
                        lineHeight: 1.3 }} className="truncate">{sec.label}</span>
                      {tier === "premium" && (
                        <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:9,fontWeight:700,
                          padding:"2px 7px",borderRadius:10,background:"#eff6ff",color:"#2563EB",
                          border:"1px solid #bfdbfe",whiteSpace:"nowrap",flexShrink:0 }}>
                          <i className="fa-solid fa-crown" style={{ fontSize: 7 }} /> Premium
                        </span>
                      )}
                      {tier === "pro" && (
                        <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:9,fontWeight:700,
                          padding:"2px 7px",borderRadius:10,background:"#ede9ff",color:"#6434dc",
                          border:"1px solid #c4b5fd",whiteSpace:"nowrap",flexShrink:0 }}>
                          <i className="fa-solid fa-bolt" style={{ fontSize: 7 }} /> Pro+
                        </span>
                      )}
                    </label>
                    {isActive && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => moveSection(sec.key, -1)} disabled={idx === 0} title="Move up"
                          className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold disabled:opacity-20 transition-colors
                            ${darkBuilder ? "text-slate-400 hover:text-blue-300 hover:bg-slate-600" : "text-gray-400 hover:text-blue-700 hover:bg-blue-50"}`}>↑</button>
                        <button onClick={() => moveSection(sec.key, 1)} disabled={idx === activeSections.length - 1} title="Move down"
                          className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold disabled:opacity-20 transition-colors
                            ${darkBuilder ? "text-slate-400 hover:text-blue-300 hover:bg-slate-600" : "text-gray-400 hover:text-blue-700 hover:bg-blue-50"}`}>↓</button>
                        <button onClick={() => toggleSection(sec.key)} title="Remove section"
                          className={`w-5 h-5 flex items-center justify-center rounded text-[10px] transition-colors
                            ${darkBuilder ? "text-slate-500 hover:text-red-400 hover:bg-slate-600" : "text-gray-300 hover:text-red-500 hover:bg-red-50"}`}>✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer — single "Actions" button replaces all footer rows, giving sections maximum height */}
      <div className={`shrink-0 border-t px-3 py-2
        ${darkBuilder ? "border-slate-700 bg-slate-900/50" : "border-border/40 bg-white"}`}>
        <DraftDropdown
          darkBuilder={darkBuilder}
          onSave={handleSaveDraft}
          onUndo={undo}
          onRedo={redo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onLoad={() => {
            const draft = localStorage.getItem("nodbusiness_builder_draft");
            if (!draft) { toast.error("No draft found"); return; }
            try {
              const p = JSON.parse(draft);
              if (p.formData) setFormData(prev => ({ ...prev, ...p.formData }));
              if (p.activeSections) setActiveSections(p.activeSections);
              toast.success("Draft loaded");
            } catch { toast.error("Failed to load draft"); }
          }}
          onClear={() => {
            localStorage.removeItem("nodbusiness_builder_draft");
            setFormData(getDefaultFormData(templateName, categoryParam, sampleParam));
            setActiveSections(getDefaultSections(templateName, categoryParam, sampleParam));
            toast.success("Draft cleared");
          }}
        />
      </div>
    </>
  );

  return (
    <div className={`flex flex-col h-full min-h-0 overflow-hidden ${darkBuilder ? "bg-slate-900" : "bg-amber-50/30"}`}>

      {/* ── Top toolbar ── */}
      <div className={`shrink-0 flex items-center gap-2 px-3 h-12 border-b ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-white border-border/50"} overflow-x-auto`}>

        {/* Mobile: hamburger to open sections drawer */}
        <button onClick={() => setSidebarOpen(v => !v)}
          className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors shrink-0">
          <Menu className="w-4 h-4" />
        </button>

        {/* Back */}
        <button onClick={() => (onBack ? onBack() : router.push("/showroom/templates"))} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">{onBack ? t("showroomWizard.back") : "Templates"}</span>
        </button>
        <div className="w-px h-5 bg-border/50 shrink-0" />

        {/* Template info */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold truncate max-w-[120px]">{templateParam.replace(/-/g, " ") || "Custom Builder"}</span>
          <span className="text-[10px] text-amber-600 font-medium">{completion}%</span>
          <div className="w-16 h-1.5 bg-border/50 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${completion}%` }} />
          </div>
        </div>

        <div className="flex-1" />

        {/* Color presets — hide on xs, show from sm */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {COLOR_PRESETS.map(([c1, c2], i) => (
            <button
              key={i}
              onClick={() => { updateField("heroBg", c1); updateField("heroBg2", c2); }}
              style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
              className="w-4 h-4 rounded-full border border-white/30 hover:scale-125 transition-transform"
              title={`Color ${i + 1}`}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-border/50 shrink-0" />

        {/* Font — hidden on xs */}
        <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
          className="hidden sm:block text-[11px] px-2 py-1 rounded-lg border border-border/60 bg-white dark:bg-slate-700 focus:outline-none shrink-0">
          {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Preview modes — hidden on xs, shown from sm */}
        <div className="hidden sm:flex gap-0.5 shrink-0">
          {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as any[]).map(([m, Icon]) => (
            <button key={m} onClick={() => setPreviewMode(m)}
              className={`p-1.5 rounded-lg transition-colors ${previewMode === m ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Undo / Redo */}
        <button onClick={undo} disabled={!undoStack.length} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button onClick={redo} disabled={!redoStack.length} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors">
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* WhatsApp toggle */}
        <button onClick={() => setShowWhatsapp(v => !v)}
          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${showWhatsapp ? "bg-green-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}
          title="WhatsApp float button">
          💬
        </button>

        {/* Dark mode */}
        <button onClick={() => setDarkBuilder(v => !v)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
          {darkBuilder ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Save draft — hidden on xs */}
        <button onClick={handleSaveDraft} className="hidden sm:block p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors" title="Save draft (Ctrl+S)">
          <Save className="w-3.5 h-3.5" />
        </button>

        {/* Export HTML — hidden on xs */}
        <button onClick={handleExport} className="hidden sm:block p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors" title="Export HTML (Ctrl+E)">
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* Copy code — hidden on xs */}
        <button onClick={handleCopyCode} className="hidden sm:block p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors" title="Copy HTML code">
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Open preview — hidden on xs */}
        <button onClick={handleOpenPreview} className="hidden sm:block p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors" title="Open in new tab">
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Publish */}
        <button
          onClick={handlePublish}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition-all shrink-0"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          {saving ? "Publishing..." : "Publish"}
        </button>
      </div>

      {/* ── Responsive body: drawer on mobile/tablet, sidebar on desktop ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Mobile/tablet drawer overlay (visible only on < lg) */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-[90] flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className={`relative z-[100] w-72 max-w-[85vw] flex flex-col border-r shadow-2xl
              ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-white border-border/50"}`}>
              <SectionsPanelContent />
            </div>
          </div>
        )}

        {/* Desktop sidebar — hidden on mobile/tablet */}
        <div className={`hidden lg:flex w-64 shrink-0 flex-col border-r overflow-hidden
          ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-white border-border/50"}`}>
          <SectionsPanelContent />
        </div>

        {/* RIGHT: responsive Content + Preview area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Desktop layout control bar — hidden on mobile/tablet */}
          <div className={`hidden lg:flex shrink-0 items-center gap-1 px-2 py-1.5 border-b
            ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-white border-border/40"}`}>
            <span className="text-[10px] text-muted-foreground font-medium mr-1">Layout:</span>
            <button onClick={() => setRightLayout("col")} title="Content top, Preview bottom"
              className={`p-1 rounded transition-colors ${rightLayout === "col" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="14" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
                <rect x="1" y="9" width="14" height="6" rx="1.5" fill="currentColor" opacity="0.4"/>
              </svg>
            </button>
            <button onClick={() => setRightLayout("col-rev")} title="Preview top, Content bottom"
              className={`p-1 rounded transition-colors ${rightLayout === "col-rev" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="14" height="6" rx="1.5" fill="currentColor" opacity="0.4"/>
                <rect x="1" y="9" width="14" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
              </svg>
            </button>
            <button onClick={() => setRightLayout("row")} title="Content left, Preview right"
              className={`p-1 rounded transition-colors ${rightLayout === "row" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.9"/>
                <rect x="9" y="1" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.4"/>
              </svg>
            </button>
            <button onClick={() => setRightLayout("row-rev")} title="Preview left, Content right"
              className={`p-1 rounded transition-colors ${rightLayout === "row-rev" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.4"/>
                <rect x="9" y="1" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.9"/>
              </svg>
            </button>
            <span className="ml-1 text-[10px] text-muted-foreground">
              {rightLayout === "col" ? "↕ Normal" : rightLayout === "col-rev" ? "↕ Reversed" : rightLayout === "row" ? "↔ Normal" : "↔ Reversed"}
            </span>
          </div>

          {/* ── MOBILE / TABLET: single-panel view with bottom tab bar (< lg) ── */}
          <div className="lg:hidden flex-1 flex flex-col min-h-0 overflow-hidden">
            {mobileTab === "sections" && (
              <div className={`flex-1 flex flex-col overflow-hidden ${darkBuilder ? "bg-slate-800" : "bg-white"}`}>
                <SectionsPanelContent />
              </div>
            )}
            {mobileTab === "content" && (
              <div className={`flex-1 flex flex-col overflow-hidden ${darkBuilder ? "bg-slate-800" : "bg-white"}`}>
                <div className={`px-3 py-2 border-b shrink-0 ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-amber-50/60 border-border/40"} flex items-center gap-1.5`}>
                  <PenLine className="w-3 h-3 text-amber-600" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Content Editor</p>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2">
                  <BuilderForm activeSections={activeSections} formData={formData} onChange={updateField} />
                </div>
              </div>
            )}
            {mobileTab === "preview" && (
              <div className={`flex-1 flex flex-col overflow-hidden ${darkBuilder ? "bg-slate-900" : "bg-secondary"}`}>
                <div className={`px-3 py-2 border-b shrink-0 ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-white border-border/40"} flex items-center gap-1.5`}>
                  <Eye className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-1">Live Preview</p>
                  <div className="flex gap-0.5">
                    {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as any[]).map(([m, Icon]) => (
                      <button key={m} onClick={() => setPreviewMode(m)}
                        className={`p-1 rounded transition-colors ${previewMode === m ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
                        <Icon className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  <BuilderPreview formData={formData} activeSections={activeSections} mode={previewMode} showWhatsapp={showWhatsapp} fontFamily={fontFamily} />
                </div>
              </div>
            )}
            {/* Bottom tab bar */}
            <div className={`shrink-0 flex border-t ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-white border-border/40"}`}>
              {([["sections", Layers, "Sections"], ["content", PenLine, "Edit"], ["preview", Eye, "Preview"]] as any[]).map(([tab, Icon, label]) => (
                <button key={tab} onClick={() => setMobileTab(tab)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors
                    ${mobileTab === tab
                      ? (darkBuilder ? "text-amber-400 bg-slate-700/50" : "text-amber-600 bg-amber-50")
                      : (darkBuilder ? "text-slate-400 hover:text-slate-200" : "text-muted-foreground hover:text-foreground")}`}>
                  <Icon className="w-4 h-4" />
                  {label}
                  {tab === "sections" && (
                    <span className={`text-[9px] font-bold px-1.5 rounded-full leading-4
                      ${mobileTab === tab ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"}`}>
                      {activeSections.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── DESKTOP: configurable Content + Preview panels (lg+) ── */}
          <div className={`hidden lg:flex flex-1 min-h-0 overflow-hidden ${
            rightLayout === "col"     ? "flex-col"         :
            rightLayout === "col-rev" ? "flex-col-reverse" :
            rightLayout === "row"     ? "flex-row"         : "flex-row-reverse"
          }`}>

            {/* Content Editor */}
            <div className={`flex flex-col overflow-hidden border-amber-200/40 ${
              rightLayout === "col" || rightLayout === "col-rev"
                ? "border-b flex-none h-1/2"
                : "border-r flex-none w-1/2"
            } ${darkBuilder ? "border-slate-700" : ""}`}>
              <div className={`px-3 py-1.5 border-b shrink-0 ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-amber-50/60 border-border/40"} flex items-center gap-1.5`}>
                <PenLine className="w-3 h-3 text-amber-600" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Content Editor</p>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-2">
                <BuilderForm
                  activeSections={activeSections}
                  formData={formData}
                  onChange={updateField}
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className={`flex flex-col overflow-hidden flex-1 ${darkBuilder ? "bg-slate-900" : "bg-secondary"}`}>
              <div className={`px-3 py-1.5 border-b shrink-0 ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-white border-border/40"} flex items-center gap-1.5`}>
                <Eye className="w-3 h-3 text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-1">Live Preview</p>
                <span className="text-[10px] text-muted-foreground capitalize">{previewMode}</span>
              </div>
              <div className="flex-1 overflow-auto p-2">
                <BuilderPreview
                  formData={formData}
                  activeSections={activeSections}
                  mode={previewMode}
                  showWhatsapp={showWhatsapp}
                  fontFamily={fontFamily}
                />
              </div>
            </div>

          </div>{/* end desktop panels */}
        </div>{/* end right area */}
      </div>{/* end body */}
    </div>
  );
}

export default function ShowroomCreatePage(props: ShowroomCreateProps) {
  return <ErrorBoundary><ShowroomCreate {...props} /></ErrorBoundary>;
}
