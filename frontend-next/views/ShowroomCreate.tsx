'use client';
import React, { useState, useEffect, useEffectEvent, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from "@/lib/AuthContext";
import { entities } from "@/api/entities";
import { apiFetch } from "@/api/client";
import { useTranslation } from 'react-i18next';

import { ArrowLeft, Check, CheckCircle, Eye, Layers, PenLine, RotateCcw, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { SECTION_TYPES, CATEGORY_DEFAULT_SECTIONS, getSectionType } from "@/lib/builderSections";
import SectionsPanel from "@/components/showroom/studio/SectionsPanel";
import SeeThroughPanel from "@/components/showroom/studio/SeeThroughPanel";
import { MoreMenu, StyleMenu, type PreviewMode } from "@/components/showroom/studio/StudioMenus";
import { useStudioLayout } from "@/hooks/useStudioLayout";
import { useDragResize } from "@/hooks/useDragResize";
import { parseShowroomSections, serializeShowroomSections } from "@/lib/showroomSectionsCodec";
import { getShowroomTemplateSample } from "@/lib/showroomTemplateSamples";
import BuilderForm from "@/components/showroom/BuilderForm";
import { validateBuilderForm } from "@/lib/builderValidation";
import type { ValidationError } from "@/lib/builderValidation";
import BuilderPreview from "@/components/showroom/BuilderPreview";
import ErrorBoundary from '@/components/ErrorBoundary';
import { VisibilitySelect, asVisibility, type BusinessVisibility } from '@/components/business/VisibilityChoice';
import PublishBusinessDialog, { type NewBusiness } from '@/components/showroom/PublishBusinessDialog';
import { getBusinessCategoryForBuilder } from '@/lib/showroomCategoryMapping';
import { getSectionPlanRequirement } from '@/lib/sectionPlanRequirement';
import FeedSpotlightPanel from '@/components/showroom/studio/FeedSpotlightPanel';
import FeedSpotlightPreview from '@/components/showroom/studio/FeedSpotlightPreview';
import { spotlightSectionIds as spotlightSectionIdsFrom } from '@/lib/spotlightSections';

// ── Phone sheet constants (module-level — shared, never recreated) ────────────
/** Distance from viewport top the sheet cannot go above — equals app header h-14. */
const PHONE_SHEET_MIN_TOP = 56;
const PHONE_EDITOR_TOP_KEY  = 'nb_studio_phone_editor_top';
const PHONE_SECTION_TOP_KEY = 'nb_studio_phone_section_top';

function readSheetTop(key: string): number | null {
  // Null means "not yet measured" — initialised on first mount.
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
}

function saveSheetTop(key: string, v: number) {
  try { localStorage.setItem(key, String(Math.round(v))); } catch { /* ok */ }
}

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
  if (!templateName) {
    return Object.fromEntries(SECTION_TYPES.flatMap(section => section.fields.map(field => [
      field.key,
      field.type === "repeater" ? [] : field.type === "color" ? "#b8860b" : "",
    ])));
  }
  return getSmartDefaults(templateName, category);
}

function getDefaultSections(templateName: string, category: string, sampleId = ""): string[] {
  if (sampleId) return getShowroomTemplateSample(templateName, category, sampleId).activeSections;
  return CATEGORY_DEFAULT_SECTIONS[category] || ["hero", "services", "testimonials", "contact", "social"];
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
  const addSectionsParam = searchParams.get("add") || "";
  const templateName = templateParam.replace(/-/g, " ");

  const { user } = useAuth();
  const draftKey = `nodbusiness_builder_draft:${user?.id ?? "guest"}:${user?.is_demo ? "demo" : "real"}`;
  const serverDraftKey = `${draftKey}:server_id`;
  const [loadedDraftKey, setLoadedDraftKey] = useState("");
  const [serverDraftId, setServerDraftId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  // The published site being edited, once fetched. The initialization effect
  // below applies it, so a later reset (e.g. when the signed-in user finishes
  // loading) can never replace the real site with template defaults (F-H5).
  const [editSnapshot, setEditSnapshot] = useState<{ sections: string[]; fields: Record<string, unknown> } | null>(null);
  const [businesses, setBusinesses] = useState<Array<{ id: string; business_name: string; visibility: BusinessVisibility }>>([]);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  // 'loading' until the owner's Business profiles are known; 'failed' leaves the check to the API.
  const [businessesState, setBusinessesState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [businessDialog, setBusinessDialog] = useState<'create' | 'choose' | null>(null);
  const [saving, setSaving] = useState(false);
  /** Validation errors from the most recent publish attempt. Cleared on any field change. */
  const [publishErrors, setPublishErrors] = useState<ValidationError[]>([]);
  const [darkBuilder, setDarkBuilder] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const studioRef = useRef<HTMLDivElement>(null);
  const layout = useStudioLayout(studioRef);
  // Phone: Edit or Preview fills the screen; Sections slides up over the preview.
  const [mobileTab, setMobileTab] = useState<"content"|"preview">("content");
  const [sectionsOpen, setSectionsOpen] = useState(false);
  // Tablet: the left column shows Sections or Edit, the preview stays on the right.
  const [tabletPane, setTabletPane] = useState<"sections"|"content">("content");
  const [fullPreview, setFullPreview] = useState(false);
  // Feed Spotlight config
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightMode, setSpotlightMode] = useState<'single' | 'carousel' | 'off' | null>(null);
  const [spotlightSectionIds, setSpotlightSectionIds] = useState<string[]>([]);
  const [spotlightCarouselCount, setSpotlightCarouselCount] = useState(1);
  const [spotlightSaving, setSpotlightSaving] = useState(false);
  // Separate "live" state updated immediately on every panel interaction
  // so FeedSpotlightPreview reacts without waiting for the server round-trip.
  const [liveSpotlightMode, setLiveSpotlightMode] = useState<'single' | 'carousel' | 'off' | null>(null);
  const [liveSpotlightIds, setLiveSpotlightIds] = useState<string[]>([]);
  // Every change bumps version; the auto-save marks the version it wrote.
  const [version, setVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  // Desktop resizable panels — sections sidebar, editor pane widths (pixels)
  const sectionsDrag = useDragResize({ initial: 288, min: 160, max: 480, storageKey: 'nb_studio_sections_w' });
  const editorDrag   = useDragResize({ initial: 420, min: 200, max: 900, storageKey: 'nb_studio_editor_w' });
  // Tablet resizable left pane
  const tabletDrag   = useDragResize({ initial: 360, min: 200, max: 600, storageKey: 'nb_studio_tablet_w' });

  // ── Phone: draggable bottom-sheets (editor + sections) ────────────────────
  // topPx: distance from viewport top to the sheet's top edge (px).
  // Persisted to localStorage; falls back to 50%/35% of window on first visit.
  const phoneTabBarRef  = useRef<HTMLDivElement>(null);
  const [editorTopPx, setEditorTopPx]   = useState<number | null>(() => readSheetTop(PHONE_EDITOR_TOP_KEY));
  const [sectTopPx,   setSectTopPx]     = useState<number | null>(() => readSheetTop(PHONE_SECTION_TOP_KEY));
  const [phoneDraggingEditor, setPhoneDraggingEditor] = useState(false);
  const [phoneDraggingSectn,  setPhoneDraggingSectn]  = useState(false);
  const phoneStartY   = useRef(0);
  const phoneStartTop = useRef(0);

  // First render: if no persisted value, compute from window height.
  useEffect(() => {
    if (editorTopPx !== null && sectTopPx !== null) return;
    const viewH = window.innerHeight;
    if (editorTopPx === null) setEditorTopPx(Math.round(viewH * 0.5));
    if (sectTopPx   === null) setSectTopPx(Math.round(viewH * 0.35));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeSections, setActiveSections] = useState<string[]>(
    getDefaultSections(templateName, categoryParam, sampleParam)
  );
  const sectionPlanRequirement = getSectionPlanRequirement(activeSections);
  const [formData, setFormData] = useState<Record<string, any>>(
    getDefaultFormData(templateName, categoryParam, sampleParam)
  );

  useEffect(() => {
    if (!user?.id || user.is_demo) return;
    let cancelled = false;
    entities.Business.filter({ owner_id: user.id }, '-created_at', 100)
      .then((owned) => {
        if (cancelled) return;
        const choices = owned.map((business: any) => ({ id: String(business.id), business_name: String(business.business_name || 'Business'), visibility: asVisibility(business.visibility) }));
        setBusinesses(choices);
        setBusinessesState('loaded');
        if (choices.length === 1) setSelectedBusinessId(choices[0].id);
      })
      .catch(() => { if (!cancelled) { setBusinessesState('failed'); toast.error('Could not load your Business profiles.'); } });
    return () => { cancelled = true; };
  }, [user?.id, user?.is_demo]);

  // Doctor fix deep-link: append recommended sections once the site has loaded
  useEffect(() => {
    if (!addSectionsParam || loadedDraftKey !== draftKey) return;
    const wanted = addSectionsParam.split(",").map((x) => x.trim()).filter(Boolean);
    if (!wanted.length) return;
    setActiveSections((prev: string[]) => [...prev, ...wanted.filter((w) => !prev.includes(w))]);
  }, [addSectionsParam, loadedDraftKey, draftKey]);
  // BUG[2]: edit mode - load an existing showroom into the builder
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/showrooms/${editId}`, { credentials: "include" });
        if (!res.ok) throw new Error('We could not load this site for editing.');
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.business_id === 'string') setSelectedBusinessId(data.business_id);
        setEditingStatus(typeof data.status === 'string' ? data.status : null);
        const { keys: sectionKeys, fields: sectionFields } = parseShowroomSections(data.sections);
        setEditSnapshot({
          sections: sectionKeys,
          fields: {
            ...Object.fromEntries(Object.entries(data).filter(([key, v]) => key !== 'sections' && v !== null && v !== undefined && typeof v !== 'object')),
            ...(data.description ? { subtitle: data.description } : {}),
            ...sectionFields,
          },
        });
        // Load spotlight config from existing showroom
        setSpotlightMode(data.spotlight_mode ?? null);
        setSpotlightSectionIds(spotlightSectionIdsFrom(data.spotlight_section_ids));
        setSpotlightCarouselCount(typeof data.spotlight_carousel_count === 'number' ? data.spotlight_carousel_count : 1);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'We could not load this site for editing.');
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);
  // Undo/redo stacks
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  useEffect(() => {
    const defaultData = getDefaultFormData(templateName, categoryParam, sampleParam);
    const defaultSections = getDefaultSections(templateName, categoryParam, sampleParam);
    setLoadedDraftKey("");
    if (editId) {
      // Wait for the published site; never show or save defaults in its place.
      if (!editSnapshot) return;
      setFormData({ ...defaultData, ...editSnapshot.fields });
      setActiveSections(editSnapshot.sections.length ? editSnapshot.sections : defaultSections);
      setLoadedDraftKey(draftKey);
      return;
    }
    setFormData(defaultData);
    setActiveSections(defaultSections);
    if (!templateParam && !categoryParam && !sampleParam) {
      try {
        const draft = localStorage.getItem(draftKey);
        if (draft) {
          const parsed = JSON.parse(draft);
          const createdAt = Number(parsed.createdAt) || Date.now();
          if (Date.now() - createdAt >= 3 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(draftKey);
            const expiredId = localStorage.getItem(`${draftKey}:server_id`);
            localStorage.removeItem(`${draftKey}:server_id`);
            if (expiredId && !user?.is_demo) void apiFetch(`/api/showrooms/${expiredId}`, { method: 'DELETE', credentials: 'include' });
            toast.info('This saved draft expired after three days. Start a new website when you are ready.');
          } else {
            if (!parsed.createdAt) localStorage.setItem(draftKey, JSON.stringify({ ...parsed, createdAt }));
            if (parsed.formData) setFormData({ ...defaultData, ...parsed.formData });
            if (parsed.activeSections) setActiveSections(parsed.activeSections);
            if (typeof parsed.businessId === 'string') setSelectedBusinessId(parsed.businessId);
            setServerDraftId(localStorage.getItem(`${draftKey}:server_id`));
          }
        }
      } catch {}
    }
    setLoadedDraftKey(draftKey);
  }, [draftKey, templateName, templateParam, categoryParam, sampleParam, editId, editSnapshot, user?.is_demo]);

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
    if (loadedDraftKey !== draftKey) return;
    const timer = setTimeout(() => {
      let createdAt = Date.now();
      let businessId = selectedBusinessId;
      try {
        const previous = JSON.parse(localStorage.getItem(draftKey) ?? '{}');
        createdAt = Number(previous.createdAt) || createdAt;
        businessId ||= typeof previous.businessId === 'string' ? previous.businessId : '';
      } catch { /* start a new local draft */ }
      localStorage.setItem(draftKey, JSON.stringify({ formData, activeSections, createdAt, businessId }));
      setSavedVersion(version);
    }, 1500);
    return () => clearTimeout(timer);
  }, [draftKey, loadedDraftKey, formData, activeSections, selectedBusinessId, version]);

  const lastEdit = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const pushUndo = (fieldKey = "") => {
    const now = Date.now();
    const last = lastEdit.current;
    lastEdit.current = { key: fieldKey, at: now };
    setVersion(v => v + 1);
    if (fieldKey && last.key === fieldKey && now - last.at < 1000) return;
    setUndoStack(prev => [...prev.slice(-29), { formData, activeSections }]);
    setRedoStack([]);
  };

  const undo = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, { formData, activeSections }]);
    setFormData(prev.formData);
    setActiveSections(prev.activeSections);
    setUndoStack(u => u.slice(0, -1));
    lastEdit.current = { key: "", at: 0 };
    setVersion(v => v + 1);
  };

  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, { formData, activeSections }]);
    setFormData(next.formData);
    setActiveSections(next.activeSections);
    setRedoStack(r => r.slice(0, -1));
    lastEdit.current = { key: "", at: 0 };
    setVersion(v => v + 1);
  };

  const updateField = (key: string, value: any) => {
    pushUndo(key);
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear publish errors when the user edits any field — the banner disappears immediately.
    if (publishErrors.length > 0) setPublishErrors([]);
  };

  // Style choices are saved with the top section, so the published site uses them too.
  const fontFamily = typeof formData.siteFont === "string" && formData.siteFont ? formData.siteFont : "Inter";
  const showWhatsapp = formData.whatsappButton !== false;
  const setFontFamily = (font: string) => updateField("siteFont", font);
  const setShowWhatsapp = (on: boolean) => updateField("whatsappButton", on);

  const updateColors = (c1: string, c2: string) => {
    pushUndo();
    setFormData(prev => ({ ...prev, heroBg: c1, heroBg2: c2 }));
  };

  const toggleSection = (key: string) => {
    pushUndo();
    setActiveSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
    if (publishErrors.length > 0) setPublishErrors([]);
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

  const buildShowroomPayload = (status: 'draft' | 'published') => {
    const title = String(formData.title ?? '').trim();
    const sections = serializeShowroomSections(activeSections, formData);
    return {
      title,
      description: formData.subtitle || '',
      slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      category: categoryParam || 'business',
      sections: JSON.stringify(sections),
      ...(selectedBusinessId ? { business_id: selectedBusinessId } : {}),
      status,
    };
  };

  const handleSaveDraft = async (): Promise<string | null> => {
    const title = String(formData.title ?? '').trim();
    const createdAt = (() => {
      try { return Number(JSON.parse(localStorage.getItem(draftKey) ?? '{}').createdAt) || Date.now(); }
      catch { return Date.now(); }
    })();
    localStorage.setItem(draftKey, JSON.stringify({ formData, activeSections, createdAt, businessId: selectedBusinessId }));

    // Demo workspaces remain isolated and temporary. Real-account site drafts
    // are stored on the server so expiry applies across browsers and devices.
    if (user && !user.is_demo && title && (!editId || editingStatus === 'draft')) {
      setSaving(true);
      try {
        const targetId = editId || serverDraftId;
        const payload = buildShowroomPayload('draft');
        const saved = targetId
          ? await entities.Showroom.update(targetId, payload)
          : await entities.Showroom.create(payload);
        const id = String(saved.id);
        localStorage.setItem(serverDraftKey, id);
        setServerDraftId(id);
        toast.success('Draft saved. It will be kept for three days.');
        return id;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not save this draft to your account.');
        return null;
      } finally { setSaving(false); }
    }
    toast.success('Draft saved on this device. Add a website title to save it to your account.');
    return null;
  };

  // Open the Feed Spotlight panel. If a server draft or existing showroom
  // already exists, open immediately. Otherwise auto-save the draft first
  // so spotlight config has a showroom to attach to — never block the user.
  const openFeedSpotlight = async () => {
    if (serverDraftId || editId) {
      // Mirror the persisted values so the preview starts correct on open.
      setLiveSpotlightMode(spotlightMode);
      setLiveSpotlightIds(spotlightSectionIds);
      setSpotlightOpen(true);
      return;
    }
    setSpotlightSaving(true);
    const id = await handleSaveDraft();
    setSpotlightSaving(false);
    if (id) {
      setLiveSpotlightMode(spotlightMode);
      setLiveSpotlightIds(spotlightSectionIds);
      setSpotlightOpen(true);
    } else {
      // Demo users or users without a title: open in preview-only mode.
      // The panel works without a showroomId — it just can't persist settings.
      setLiveSpotlightMode(spotlightMode);
      setLiveSpotlightIds(spotlightSectionIds);
      setSpotlightOpen(true);
    }
  };

  const completion = (() => {
    const keys = [...new Set(activeSections.flatMap(key => getSectionType(key)?.fields.map(field => field.key) ?? []))];
    if (!keys.length) return 0;
    const filled = keys.filter(key => {
      const v = formData[key];
      return Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && String(v).trim().length > 0;
    }).length;
    return Math.round((filled / keys.length) * 100);
  })();

  const onKeyboardShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "s") { event.preventDefault(); handleSaveDraft(); }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === "z") { event.preventDefault(); undo(); }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "z") { event.preventDefault(); redo(); }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyboardShortcut);
    return () => window.removeEventListener("keydown", onKeyboardShortcut);
  }, []);

  // Applies to the whole business (site, products and announcements) right away.
  const changeVisibility = async (visibility: BusinessVisibility) => {
    if (!selectedBusinessId) return;
    setSavingVisibility(true);
    try {
      await entities.Business.update(selectedBusinessId, { visibility });
      setBusinesses(list => list.map(b => (b.id === selectedBusinessId ? { ...b, visibility } : b)));
      toast.success(visibility === 'private' ? 'Only signed-in users can now view this business.' : 'Anyone can now view this business.');
    } catch {
      toast.error('Could not change who can view this business.');
    } finally {
      setSavingVisibility(false);
    }
  };

  // Creates the owner's first Business profile from the publish step, then publishes into it.
  const createBusinessAndPublish = async (business: NewBusiness) => {
    if (!user) return;
    setSaving(true);
    try {
      const created = await entities.Business.create({ ...business, owner_id: user.id }) as { id: string; business_name?: string };
      const profiles = await entities.UserProfile.filter({ user_id: user.id }).catch(() => []);
      if (profiles.length > 0) await entities.UserProfile.update(profiles[0].id, { has_business_profile: true }).catch(() => undefined);
      setBusinesses(list => [...list, { id: String(created.id), business_name: created.business_name ?? business.business_name, visibility: business.visibility }]);
      setSelectedBusinessId(String(created.id));
      setBusinessDialog(null);
      toast.success('Business profile created.');
      await handlePublish(String(created.id));
    } catch (error) {
      const body = error as { error?: string; message?: string } | null;
      toast.error(body?.message || body?.error || 'Could not create your Business profile. Try again.');
      setSaving(false);
    }
  };

  const handlePublish = async (businessIdOverride?: string) => {
    if (!user) { toast.error("Please log in"); return; }
    if (editId && loadedDraftKey !== draftKey) { toast.error("Your site is still loading. Try again in a moment."); return; }

    // ── Full client-side validation before hitting the API ──────────────────
    const errors = validateBuilderForm(activeSections, formData);
    if (errors.length > 0) {
      setPublishErrors(errors);
      // Scroll to the first invalid field in the editor
      const firstId = errors[0].fieldId;
      setTimeout(() => {
        const el = document.getElementById(firstId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
      }, 50);
      toast.error(`Fix ${errors.length} ${errors.length === 1 ? 'issue' : 'issues'} before publishing.`);
      return;
    }
    setPublishErrors([]);

    const title = String(formData.title ?? "").trim();
    const businessId = businessIdOverride ?? selectedBusinessId;
    // Every live site belongs to a Business profile: create or choose it here
    // rather than failing and sending the owner out of Studio.
    if (!user.is_demo && !businessId && businessesState === 'loaded') {
      if (businesses.length === 0) { setBusinessDialog('create'); return; }
      if (businesses.length > 1) { setBusinessDialog('choose'); return; }
    }
    setSaving(true);
    // Keep an up-to-date local copy before any billing redirect or API error.
    localStorage.setItem(draftKey, JSON.stringify({ formData, activeSections }));
    try {
      const sections = activeSections.map(key => {
        const sec = getSectionType(key);
        if (!sec) return null;
        const data: Record<string, any> = { type: key };
        sec.fields.forEach(f => { if (formData[f.key] !== undefined) data[f.key] = formData[f.key]; });
        return data;
      }).filter(Boolean);

      const showroomData = {
        owner_id: user.id,
        ...(businessId ? { business_id: businessId } : {}),
        title,
        description: formData.subtitle || "",
        slug: title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        category: categoryParam || "business",
        sections: JSON.stringify(sections),
        status: "published",
      };
      const showroom = editId
        ? await entities.Showroom.update(editId, showroomData)
        : await entities.Showroom.create(showroomData);
      localStorage.removeItem(draftKey);
      toast.success("Your showroom is live and visible in the Business feed.");
      router.push(`/showrooms/${showroom.id}`);
    } catch (error) {
      // The API client rejects with the response body itself (see api/client.ts).
      type PublishError = { error?: string; message?: string; businessId?: string; draftId?: string; requiredTier?: 'normal' | 'premium' | 'pro' };
      const apiError = error as PublishError & { response?: { data?: PublishError } };
      const details: PublishError | undefined = apiError.response?.data ?? apiError;
      if (details?.error === 'subscription_required' && details.businessId) {
        const query = new URLSearchParams({ businessId: details.businessId });
        if (details.draftId) query.set('draftId', details.draftId);
        if (details.requiredTier) query.set('requiredTier', details.requiredTier);
        router.push(`/business/subscription?${query.toString()}`);
        setSaving(false);
        return;
      }
      if (details?.error === 'business_profile_required') {
        setBusinessDialog('create');
        setSaving(false);
        return;
      }
      if (details?.error === 'business_selection_required' && businesses.length > 1) {
        setBusinessDialog('choose');
        setSaving(false);
        return;
      }
      const message = details?.message ?? apiError.message ?? "Please try again.";
      toast.error(`Could not publish your showroom. ${message}`);
    }
    setSaving(false);
  };

  const loadDraft = () => {
    const draft = localStorage.getItem(draftKey);
    if (!draft) { toast.error("No saved draft on this device yet."); return; }
    try {
      const p = JSON.parse(draft);
      pushUndo();
      if (p.formData) setFormData(prev => ({ ...prev, ...p.formData }));
      if (p.activeSections) setActiveSections(p.activeSections);
      toast.success("Draft loaded");
    } catch { toast.error("Could not load the saved draft."); }
  };

  const clearDraft = () => {
    pushUndo();
    localStorage.removeItem(draftKey);
    setFormData(getDefaultFormData(templateName, categoryParam, sampleParam));
    setActiveSections(getDefaultSections(templateName, categoryParam, sampleParam));
    toast.success("Draft cleared. Tap Undo to bring it back.");
  };

  useEffect(() => {
    if (!fullPreview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullPreview(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullPreview]);

  const siteName = String(formData.title ?? "").trim() || templateName || "Your website";
  const saved = version === savedVersion;
  const toolBtn = `flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-30 ${darkBuilder ? "text-slate-300 hover:bg-slate-700" : "text-muted-foreground hover:bg-secondary"}`;

  const businessControls = !user?.is_demo && (businesses.length > 1 || selectedBusinessId) ? (
    <>
      {businesses.length > 1 && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Business for this website</span>
          <select aria-label="Business profile for this website" value={selectedBusinessId}
            onChange={event => setSelectedBusinessId(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
            <option value="">Choose business</option>
            {businesses.map(business => <option key={business.id} value={business.id}>{business.business_name}</option>)}
          </select>
        </label>
      )}
      {selectedBusinessId && (
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium">Who can see it</span>
          <VisibilitySelect
            value={businesses.find(b => b.id === selectedBusinessId)?.visibility ?? 'public'}
            disabled={savingVisibility}
            onChange={changeVisibility}
          />
        </label>
      )}
    </>
  ) : undefined;

  const sectionsPanel = (
    <SectionsPanel
      activeSections={activeSections}
      onToggle={toggleSection}
      onMove={moveSection}
      completion={completion}
      plan={sectionPlanRequirement}
      dark={darkBuilder}
    />
  );

  // On phone the bottom tab bar already names the active pane, so the panel
  // header rows inside editor/preview are redundant and waste vertical space.
  const isPhone = layout === "phone";

  const editor = (
    <div className={`flex h-full min-h-0 flex-col ${darkBuilder ? "bg-slate-800" : "bg-card"}`}>
      {!isPhone && (
        <div className={`flex shrink-0 items-center gap-1.5 border-b px-3 py-2 ${darkBuilder ? "border-slate-700" : "border-border/60"}`}>
          <PenLine className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
          <p className="text-sm font-bold">Your words and photos</p>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        <BuilderForm activeSections={activeSections} formData={formData} onChange={updateField} validationErrors={publishErrors} />
      </div>
    </div>
  );

  const preview = (
    <div className={`flex h-full min-h-0 flex-col ${darkBuilder ? "bg-slate-900" : "bg-secondary"}`}>
      {!isPhone && (
        <div className={`flex shrink-0 items-center gap-1.5 border-b px-3 py-2 ${darkBuilder ? "border-slate-700 bg-slate-800" : "border-border/60 bg-card"}`}>
          <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <p className="flex-1 text-sm font-bold">Live preview</p>
          <span className="text-xs text-muted-foreground">{previewMode === "mobile" ? "Phone" : previewMode === "tablet" ? "Tablet" : "Computer"}</span>
        </div>
      )}
      {/* On phone: no padding wrapper — let BuilderPreview fill edge-to-edge */}
      <div className={`min-h-0 flex-1 overflow-auto ${isPhone ? "" : "p-2"}`}>
        <BuilderPreview
          formData={formData}
          activeSections={activeSections}
          mode={previewMode}
          showWhatsapp={showWhatsapp}
          fontFamily={fontFamily}
          businessId={selectedBusinessId || null}
          compact={isPhone}
        />
      </div>
    </div>
  );

  const paneTab = (active: boolean) => `flex min-h-11 flex-1 items-center justify-center gap-1.5 text-sm font-semibold
    ${active ? (darkBuilder ? "text-amber-300 bg-slate-700/60" : "text-amber-700 bg-amber-50") : (darkBuilder ? "text-slate-400" : "text-muted-foreground hover:text-foreground")}`;

  // ── Phone sheet drag — stable callbacks (useCallback so refs never change) ─
  // Each drag creates a closure over refs only (not over state), so there is
  // no risk of stale listeners or duplicate registrations across re-renders.
  const makeSheetMove = useCallback((
    setTop: React.Dispatch<React.SetStateAction<number | null>>,
    storageKey: string,
  ) => (e: PointerEvent) => {
    const tabH   = phoneTabBarRef.current?.offsetHeight ?? 44;
    const viewH  = window.innerHeight;
    const maxTop = viewH - tabH - 60;
    const next   = Math.max(PHONE_SHEET_MIN_TOP, Math.min(maxTop, phoneStartTop.current + (e.clientY - phoneStartY.current)));
    setTop(next);
    saveSheetTop(storageKey, next);
  }, []);

  const onEditorDragDown = useCallback((e: React.PointerEvent<HTMLDivElement>, currentTop: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    phoneStartY.current   = e.clientY;
    phoneStartTop.current = currentTop;
    setPhoneDraggingEditor(true);
    document.body.style.cursor     = 'row-resize';
    document.body.style.userSelect = 'none';
    (e.target as Element).setPointerCapture(e.pointerId);
    const onMove = makeSheetMove(setEditorTopPx, PHONE_EDITOR_TOP_KEY);
    const onUp   = (ev: PointerEvent) => {
      setPhoneDraggingEditor(false);
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      (ev.target as Element)?.releasePointerCapture?.(ev.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  }, [makeSheetMove]);

  const onSectDragDown = useCallback((e: React.PointerEvent<HTMLDivElement>, currentTop: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    phoneStartY.current   = e.clientY;
    phoneStartTop.current = currentTop;
    setPhoneDraggingSectn(true);
    document.body.style.cursor     = 'row-resize';
    document.body.style.userSelect = 'none';
    (e.target as Element).setPointerCapture(e.pointerId);
    const onMove = makeSheetMove(setSectTopPx, PHONE_SECTION_TOP_KEY);
    const onUp   = (ev: PointerEvent) => {
      setPhoneDraggingSectn(false);
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      (ev.target as Element)?.releasePointerCapture?.(ev.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  }, [makeSheetMove]);
  return (
    <div ref={studioRef} className={`flex flex-col h-full min-h-0 overflow-hidden ${darkBuilder ? "bg-slate-900 text-slate-100" : "bg-amber-50/30"}`}>

      {/* ── Top bar: always fits, Publish always visible ── */}
      <div className={`flex h-14 shrink-0 items-center gap-1 border-b px-2 sm:gap-1.5 sm:px-3 ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-card border-border/60"}`}>
        <button type="button" onClick={() => (onBack ? onBack() : router.push("/showroom/templates"))}
          aria-label={onBack ? t("showroomWizard.back") : "Back to templates"} className={toolBtn}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{siteName}</p>
          <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground" aria-live="polite">
            {saved ? <><Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />Saved on this device</> : "Saving…"}
          </p>
        </div>
        <button type="button" onClick={undo} disabled={!undoStack.length} aria-label="Undo" className={toolBtn}>
          <RotateCcw className="h-4 w-4" />
        </button>
        <button type="button" onClick={redo} disabled={!redoStack.length} aria-label="Redo" className={`${toolBtn} max-[379px]:hidden`}>
          <RotateCw className="h-4 w-4" />
        </button>
        <StyleMenu
          colors={[String(formData.heroBg ?? ""), String(formData.heroBg2 ?? "")]}
          onColors={updateColors}
          font={fontFamily} onFont={setFontFamily}
          darkEditor={darkBuilder} onDarkEditor={setDarkBuilder}
          whatsapp={showWhatsapp} onWhatsapp={setShowWhatsapp}
          previewMode={previewMode} onPreviewMode={setPreviewMode}
        />
        <MoreMenu
          businessControls={businessControls}
          onLoad={loadDraft}
          onClear={clearDraft}
          onFullPreview={() => setFullPreview(true)}
          onFeedSpotlight={() => { void openFeedSpotlight(); }}
        />
        <button
          type="button"
          onClick={() => { void handlePublish(); }}
          disabled={saving}
          aria-label="Publish site"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 text-sm font-bold text-white shadow-sm hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 sm:px-4"
        >
          <CheckCircle className="h-4 w-4 max-[379px]:hidden" aria-hidden="true" />
          {saving ? "Publishing…" : "Publish"}
        </button>
      </div>

      <PublishBusinessDialog
        open={businessDialog !== null}
        mode={businessDialog ?? 'create'}
        businesses={businesses}
        defaultName={String(formData.title ?? '').trim()}
        defaultCategory={getBusinessCategoryForBuilder(categoryParam)}
        busy={saving}
        onOpenChange={(open) => { if (!open) setBusinessDialog(null); }}
        onCreate={(business) => { void createBusinessAndPublish(business); }}
        onChoose={(id) => { setSelectedBusinessId(id); setBusinessDialog(null); void handlePublish(id); }}
      />

      {fullPreview && (
        <div role="dialog" aria-modal="true" aria-label="Full-screen preview" className="fixed inset-0 z-[120] flex flex-col bg-secondary">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
            <p className="flex-1 truncate text-sm font-bold">Preview: {siteName}</p>
            <button type="button" autoFocus onClick={() => setFullPreview(false)} aria-label="Close preview"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <BuilderPreview formData={formData} activeSections={activeSections} mode={previewMode} showWhatsapp={showWhatsapp} fontFamily={fontFamily} businessId={selectedBusinessId || null} />
          </div>
        </div>
      )}

      {/* ── Body: one layout per screen size ── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {layout === "desktop" && (
          <>
            {/* ── Sections sidebar (resizable) ── */}
            <aside
              aria-label="Sections"
              style={{ width: sectionsDrag.size }}
              className={`flex shrink-0 flex-col border-r ${darkBuilder ? "border-slate-700" : "border-border/60"}`}
            >
              {sectionsPanel}
            </aside>

            {/* ── Drag handle: sections ↔ editor ── */}
            <div
              role="separator"
              aria-label="Resize sections panel"
              aria-orientation="vertical"
              onPointerDown={sectionsDrag.onPointerDown}
              onDoubleClick={sectionsDrag.onDoubleClick}
              className={`group relative z-10 flex w-1.5 shrink-0 cursor-col-resize select-none items-center justify-center
                ${sectionsDrag.isDragging ? "bg-amber-400" : "bg-transparent hover:bg-amber-300/60"}
                transition-colors duration-150`}
            >
              {/* Visual grip dots */}
              <span aria-hidden="true" className="flex flex-col gap-[3px] opacity-0 group-hover:opacity-60 transition-opacity">
                {[0,1,2,3,4].map((i) => (
                  <span key={i} className="h-1 w-1 rounded-full bg-current" />
                ))}
              </span>
            </div>

            {/* ── Editor pane (resizable) ── */}
            <div
              style={{ width: editorDrag.size }}
              className="flex shrink-0 min-h-0 flex-col overflow-hidden"
            >
              {editor}
            </div>

            {/* ── Drag handle: editor ↔ preview ── */}
            <div
              role="separator"
              aria-label="Resize editor panel"
              aria-orientation="vertical"
              onPointerDown={editorDrag.onPointerDown}
              onDoubleClick={editorDrag.onDoubleClick}
              className={`group relative z-10 flex w-1.5 shrink-0 cursor-col-resize select-none items-center justify-center
                ${editorDrag.isDragging ? "bg-amber-400" : "bg-transparent hover:bg-amber-300/60"}
                transition-colors duration-150`}
            >
              <span aria-hidden="true" className="flex flex-col gap-[3px] opacity-0 group-hover:opacity-60 transition-opacity">
                {[0,1,2,3,4].map((i) => (
                  <span key={i} className="h-1 w-1 rounded-full bg-current" />
                ))}
              </span>
            </div>

            {/* ── Live preview (fills remaining space) ── */}
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              {preview}
            </div>
          </>
        )}

        {layout === "tablet" && (
          <>
            {/* ── Left pane: Sections or Edit (resizable) ── */}
            <div
              style={{ width: tabletDrag.size }}
              className={`flex shrink-0 flex-col border-r ${darkBuilder ? "border-slate-700" : "border-border/60"}`}
            >
              <div role="tablist" aria-label="Studio panels" className={`flex shrink-0 border-b ${darkBuilder ? "border-slate-700 bg-slate-800" : "border-border/60 bg-card"}`}>
                <button type="button" role="tab" aria-selected={tabletPane === "sections"} onClick={() => setTabletPane("sections")} className={paneTab(tabletPane === "sections")}>
                  <Layers className="h-4 w-4" aria-hidden="true" />Sections · {activeSections.length}
                </button>
                <button type="button" role="tab" aria-selected={tabletPane === "content"} onClick={() => setTabletPane("content")} className={paneTab(tabletPane === "content")}>
                  <PenLine className="h-4 w-4" aria-hidden="true" />Edit
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">{tabletPane === "sections" ? sectionsPanel : editor}</div>
            </div>

            {/* ── Drag handle: left pane ↔ preview ── */}
            <div
              role="separator"
              aria-label="Resize panel"
              aria-orientation="vertical"
              onPointerDown={tabletDrag.onPointerDown}
              onDoubleClick={tabletDrag.onDoubleClick}
              className={`group relative z-10 flex w-1.5 shrink-0 cursor-col-resize select-none items-center justify-center
                ${tabletDrag.isDragging ? "bg-amber-400" : "bg-transparent hover:bg-amber-300/60"}
                transition-colors duration-150`}
            >
              <span aria-hidden="true" className="flex flex-col gap-[3px] opacity-0 group-hover:opacity-60 transition-opacity">
                {[0,1,2,3,4].map((i) => (
                  <span key={i} className="h-1 w-1 rounded-full bg-current" />
                ))}
              </span>
            </div>

            {/* ── Preview (fills remaining space) ── */}
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{preview}</div>
          </>
        )}

        {layout === "phone" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Preview fills the body area */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {preview}
            </div>

            {/* ── Bottom tab bar ── */}
            <div
              ref={phoneTabBarRef}
              role="tablist"
              aria-label="Studio panels"
              className={`relative z-40 flex shrink-0 border-t safe-bottom
                ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-card border-border/60"}`}
            >
              <button type="button" role="tab" aria-selected={sectionsOpen} onClick={() => setSectionsOpen(v => !v)} className={paneTab(sectionsOpen)}>
                <Layers className="h-4 w-4" aria-hidden="true" />Sections
                <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold leading-4 text-white">{activeSections.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={!sectionsOpen && mobileTab === "content"} onClick={() => { setSectionsOpen(false); setMobileTab("content"); }} className={paneTab(!sectionsOpen && mobileTab === "content")}>
                <PenLine className="h-4 w-4" aria-hidden="true" />Edit
              </button>
              <button type="button" role="tab" aria-selected={!sectionsOpen && mobileTab === "preview"} onClick={() => { setSectionsOpen(false); setMobileTab("preview"); }} className={paneTab(!sectionsOpen && mobileTab === "preview")}>
                <Eye className="h-4 w-4" aria-hidden="true" />Preview
              </button>
            </div>

            {/* ── Editor sheet — fixed, draggable up to app header ── */}
            {mobileTab === "content" && !sectionsOpen && editorTopPx !== null && (() => {
              const tabH  = phoneTabBarRef.current?.offsetHeight ?? 44;
              const topPx = editorTopPx;
              const isMax = topPx <= PHONE_SHEET_MIN_TOP + 4;
              return (
                <div
                  className={`fixed inset-x-0 z-30 flex flex-col shadow-2xl border-t
                    ${isMax ? '' : 'rounded-t-2xl'}
                    ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-card border-border/60"}`}
                  style={{ top: topPx, bottom: tabH }}
                >
                  {/* Drag handle */}
                  <div
                    role="separator"
                    aria-label="Drag to resize editor"
                    aria-orientation="horizontal"
                    onPointerDown={(e) => onEditorDragDown(e, topPx)}
                    onDoubleClick={() => {
                      const v = Math.round(window.innerHeight * 0.5);
                      setEditorTopPx(v);
                      saveSheetTop(PHONE_EDITOR_TOP_KEY, v);
                    }}
                    className={`flex h-10 w-full shrink-0 cursor-row-resize select-none flex-col items-center justify-center gap-1
                      ${isMax ? '' : 'rounded-t-2xl'}
                      ${phoneDraggingEditor ? "bg-amber-400/20" : "hover:bg-secondary/60 active:bg-amber-400/20"}
                      transition-colors touch-none`}
                  >
                    <span aria-hidden="true" className={`block h-1.5 w-12 rounded-full transition-colors ${phoneDraggingEditor ? "bg-amber-500" : "bg-muted-foreground/40"}`} />
                    <span aria-hidden="true" className="flex gap-1">
                      {[0,1,2].map(i => <span key={i} className={`h-1 w-1 rounded-full ${phoneDraggingEditor ? "bg-amber-400" : "bg-muted-foreground/25"}`} />)}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{editor}</div>
                </div>
              );
            })()}

            {/* ── Sections sheet — fixed, draggable up to app header ── */}
            {sectionsOpen && sectTopPx !== null && (() => {
              const tabH  = phoneTabBarRef.current?.offsetHeight ?? 44;
              const topPx = sectTopPx;
              const isMax = topPx <= PHONE_SHEET_MIN_TOP + 4;
              return (
                <SeeThroughPanel
                  open={sectionsOpen}
                  title="Sections"
                  onClose={() => setSectionsOpen(false)}
                  topPx={topPx}
                  tabBarH={tabH}
                  isMax={isMax}
                  isDragging={phoneDraggingSectn}
                  onDragHandleDown={(e) => onSectDragDown(e, topPx)}
                  onDragHandleDoubleTap={() => {
                    const v = Math.round(window.innerHeight * 0.35);
                    setSectTopPx(v);
                    saveSheetTop(PHONE_SECTION_TOP_KEY, v);
                  }}
                >
                  {sectionsPanel}
                </SeeThroughPanel>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Feed Spotlight overlay ──────────────────────────────────────────
           Layout: fixed full-screen overlay split into two halves.
           Top half (auto-height, scrollable): panel settings.
           Bottom half (remaining space): live business card preview.
           Works in demo mode (showroomId='') — settings are preview-only. ── */}
      {spotlightOpen && (
        <div className="absolute inset-0 z-60 flex flex-col bg-card">
          {/* Settings panel — shrinks to content, scrolls if needed */}
          <div className="shrink-0 overflow-y-auto border-b border-border max-h-[55%]">
            <FeedSpotlightPanel
              showroomId={serverDraftId || editId}
              activeSections={activeSections}
              initialMode={spotlightMode}
              initialSectionIds={spotlightSectionIds}
              initialCarouselCount={spotlightCarouselCount}
              themeColor={String(formData.heroBg ?? '#2563EB')}
              onClose={() => setSpotlightOpen(false)}
              onSaved={(mode, ids, count) => {
                setSpotlightMode(mode);
                setSpotlightSectionIds(ids);
                setSpotlightCarouselCount(count);
                // Keep live state in sync with the persisted state.
                setLiveSpotlightMode(mode);
                setLiveSpotlightIds(ids);
              }}
              onPreviewChange={(mode, ids) => {
                setLiveSpotlightMode(mode);
                setLiveSpotlightIds(ids);
              }}
            />
          </div>
          {/* Live preview — fills remaining space, always visible */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
            <FeedSpotlightPreview
              sections={serializeShowroomSections(activeSections, formData) as Array<Record<string, any>>}
              spotlightMode={liveSpotlightMode}
              spotlightSectionIds={liveSpotlightIds}
              themeColor={String(formData.heroBg ?? '#2563EB')}
              businessName={String(formData.title ?? 'Your Business')}
              ownerId={String(user?.id ?? '')}
              businessId={selectedBusinessId ?? null}
            />
          </div>
        </div>
      )}
      {/* Draft auto-save spinner (shown while saving before opening panel) */}
      {spotlightSaving && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-card/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p className="text-sm font-medium text-muted-foreground">Saving draft…</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShowroomCreatePage(props: ShowroomCreateProps) {
  return <ErrorBoundary><ShowroomCreate {...props} /></ErrorBoundary>;
}
