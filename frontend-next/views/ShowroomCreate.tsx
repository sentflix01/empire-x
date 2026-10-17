'use client';
import React, { useState, useEffect, useEffectEvent, useRef } from "react";
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
import { parseShowroomSections, serializeShowroomSections } from "@/lib/showroomSectionsCodec";
import { getShowroomTemplateSample } from "@/lib/showroomTemplateSamples";
import BuilderForm from "@/components/showroom/BuilderForm";
import BuilderPreview from "@/components/showroom/BuilderPreview";
import ErrorBoundary from '@/components/ErrorBoundary';
import { VisibilitySelect, asVisibility, type BusinessVisibility } from '@/components/business/VisibilityChoice';
import PublishBusinessDialog, { type NewBusiness } from '@/components/showroom/PublishBusinessDialog';
import { getBusinessCategoryForBuilder } from '@/lib/showroomCategoryMapping';
import { getSectionPlanRequirement } from '@/lib/sectionPlanRequirement';

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
  const [darkBuilder, setDarkBuilder] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [fontFamily, setFontFamily] = useState("Inter");
  const studioRef = useRef<HTMLDivElement>(null);
  const layout = useStudioLayout(studioRef);
  // Phone: Edit or Preview fills the screen; Sections slides up over the preview.
  const [mobileTab, setMobileTab] = useState<"content"|"preview">("content");
  const [sectionsOpen, setSectionsOpen] = useState(false);
  // Tablet: the left column shows Sections or Edit, the preview stays on the right.
  const [tabletPane, setTabletPane] = useState<"sections"|"content">("content");
  const [fullPreview, setFullPreview] = useState(false);
  // Every change bumps version; the auto-save marks the version it wrote.
  const [version, setVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  // Layout modes for right column on desktop: row-normal, row-reverse, col-normal, col-reverse
  const [rightLayout, setRightLayout] = useState<"row"|"row-rev"|"col"|"col-rev">("col");
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
  };

  const updateColors = (c1: string, c2: string) => {
    pushUndo();
    setFormData(prev => ({ ...prev, heroBg: c1, heroBg2: c2 }));
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

  const handleSaveDraft = async () => {
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
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not save this draft to your account.');
      } finally { setSaving(false); }
      return;
    }
    toast.success('Draft saved on this device. Add a website title to save it to your account.');
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
    const title = String(formData.title ?? "").trim();
    if (!title) { toast.error("Add your business name in the Hero section"); return; }
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

  const editor = (
    <div className={`flex h-full min-h-0 flex-col ${darkBuilder ? "bg-slate-800" : "bg-card"}`}>
      <div className={`flex shrink-0 items-center gap-1.5 border-b px-3 py-2 ${darkBuilder ? "border-slate-700" : "border-border/60"}`}>
        <PenLine className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
        <p className="text-sm font-bold">Your words and photos</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        <BuilderForm activeSections={activeSections} formData={formData} onChange={updateField} />
      </div>
    </div>
  );

  const preview = (
    <div className={`flex h-full min-h-0 flex-col ${darkBuilder ? "bg-slate-900" : "bg-secondary"}`}>
      <div className={`flex shrink-0 items-center gap-1.5 border-b px-3 py-2 ${darkBuilder ? "border-slate-700 bg-slate-800" : "border-border/60 bg-card"}`}>
        <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <p className="flex-1 text-sm font-bold">Live preview</p>
        <span className="text-xs text-muted-foreground">{previewMode === "mobile" ? "Phone" : previewMode === "tablet" ? "Tablet" : "Computer"}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <BuilderPreview formData={formData} activeSections={activeSections} mode={previewMode} showWhatsapp={showWhatsapp} fontFamily={fontFamily} />
      </div>
    </div>
  );

  const paneTab = (active: boolean) => `flex min-h-11 flex-1 items-center justify-center gap-1.5 text-sm font-semibold
    ${active ? (darkBuilder ? "text-amber-300 bg-slate-700/60" : "text-amber-700 bg-amber-50") : (darkBuilder ? "text-slate-400" : "text-muted-foreground hover:text-foreground")}`;

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
          onSave={() => { void handleSaveDraft(); }}
          onLoad={loadDraft}
          onClear={clearDraft}
          onFullPreview={() => setFullPreview(true)}
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
            <BuilderPreview formData={formData} activeSections={activeSections} mode={previewMode} showWhatsapp={showWhatsapp} fontFamily={fontFamily} />
          </div>
        </div>
      )}

      {/* ── Body: one layout per screen size ── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {layout === "desktop" && (
          <>
            <aside aria-label="Sections" className={`flex w-72 shrink-0 flex-col border-r ${darkBuilder ? "border-slate-700" : "border-border/60"}`}>
              {sectionsPanel}
            </aside>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className={`flex shrink-0 items-center gap-1 border-b px-2 py-1.5 ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-card border-border/60"}`}>
                <span className="mr-1 text-xs font-medium text-muted-foreground">Layout:</span>
                {([["col", "Words on top, preview below"], ["col-rev", "Preview on top, words below"], ["row", "Words left, preview right"], ["row-rev", "Preview left, words right"]] as const).map(([mode, label]) => (
                  <button key={mode} type="button" onClick={() => setRightLayout(mode)} aria-label={label} title={label} aria-pressed={rightLayout === mode}
                    className={`rounded p-1.5 transition-colors ${rightLayout === mode ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      {mode.startsWith("col")
                        ? <><rect x="1" y="1" width="14" height="6" rx="1.5" fill="currentColor" opacity={mode === "col" ? 0.9 : 0.4}/><rect x="1" y="9" width="14" height="6" rx="1.5" fill="currentColor" opacity={mode === "col" ? 0.4 : 0.9}/></>
                        : <><rect x="1" y="1" width="6" height="14" rx="1.5" fill="currentColor" opacity={mode === "row" ? 0.9 : 0.4}/><rect x="9" y="1" width="6" height="14" rx="1.5" fill="currentColor" opacity={mode === "row" ? 0.4 : 0.9}/></>}
                    </svg>
                  </button>
                ))}
              </div>
              <div className={`flex min-h-0 flex-1 overflow-hidden ${
                rightLayout === "col" ? "flex-col" : rightLayout === "col-rev" ? "flex-col-reverse" : rightLayout === "row" ? "flex-row" : "flex-row-reverse"}`}>
                <div className={`min-h-0 overflow-hidden ${rightLayout.startsWith("col") ? "h-1/2 border-b" : "w-1/2 border-r"} ${darkBuilder ? "border-slate-700" : "border-border/60"}`}>
                  {editor}
                </div>
                <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{preview}</div>
              </div>
            </div>
          </>
        )}

        {layout === "tablet" && (
          <>
            <div className={`flex w-[min(26rem,50%)] shrink-0 flex-col border-r ${darkBuilder ? "border-slate-700" : "border-border/60"}`}>
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
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{preview}</div>
          </>
        )}

        {layout === "phone" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {mobileTab === "content" && !sectionsOpen ? editor : preview}
              <SeeThroughPanel open={sectionsOpen} title="Sections" onClose={() => setSectionsOpen(false)}>
                {sectionsPanel}
              </SeeThroughPanel>
            </div>
            <div role="tablist" aria-label="Studio panels" className={`flex shrink-0 border-t safe-bottom ${darkBuilder ? "bg-slate-800 border-slate-700" : "bg-card border-border/60"}`}>
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
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShowroomCreatePage(props: ShowroomCreateProps) {
  return <ErrorBoundary><ShowroomCreate {...props} /></ErrorBoundary>;
}
