'use client';
/**
 * Studio's live preview. It renders the sections through the same
 * SectionRenderer as the published site (views/ShowroomView.tsx), with the
 * same added contact block and footer, so what owners see is what visitors
 * get. Buttons that would start an order explain themselves instead.
 */
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import BrandLogo from "@/components/brand/BrandLogo";
import { entities } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { serializeShowroomSections } from "@/lib/showroomSectionsCodec";
import { siteFontFamily } from "@/lib/siteFonts";
import SectionRenderer, { firstProductsIndex, isCatalogueSection, resolveCtaTarget } from "@/components/showroom/SectionRenderer";

interface Props {
  formData: Record<string, any>;
  activeSections: string[];
  mode: "desktop" | "tablet" | "mobile";
  showWhatsapp: boolean;
  fontFamily: string;
  /** The business this site belongs to (How to pay me, Live location). */
  businessId?: string | null;
}

/** Same default as a published site without its own theme colour. */
const THEME = "#D4AF37";

export default function BuilderPreview({ formData: d, activeSections, mode, showWhatsapp, fontFamily, businessId = null }: Props) {
  const { user } = useAuth();
  const sections = useMemo(() => serializeShowroomSections(activeSections, d) as Array<Record<string, any>>, [activeSections, d]);
  const wantsCatalogue = sections.some(s => isCatalogueSection(s.type));
  const [products, setProducts] = useState<Array<Record<string, any>>>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  // The owner's real active products, as visitors will see them.
  useEffect(() => {
    if (!wantsCatalogue || !user?.id) return;
    let cancelled = false;
    entities.Product.filterPage({ seller_id: user.id, status: "active" }, "-created_at", 24)
      .then(({ items }) => { if (!cancelled) setProducts(items); })
      .catch(() => { if (!cancelled) setProducts([]); });
    return () => { cancelled = true; };
  }, [wantsCatalogue, user?.id]);

  const categories = useMemo(() => [...new Set(products.map(p => String(p.category || "").trim()).filter(Boolean))].sort(), [products]);
  const shown = products.filter(p =>
    (!category || p.category === category) &&
    (!search.trim() || `${p.title} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())));

  const title = String(d.title || "").trim() || "Your business";
  const profile = { business_name: title, business_description: d.subtitle || "", display_name: title };
  const ctaTarget = resolveCtaTarget(sections);
  const productsIdx = firstProductsIndex(sections);
  const explain = () => toast.info("On your published website this opens the order form for visitors.");
  const whatsapp = String(d.whatsapp || "").replace(/\D/g, "");
  const maxW = mode === "mobile" ? "375px" : mode === "tablet" ? "768px" : "100%";

  return (
    <div style={{ background: "#e8ecf1", borderRadius: 12, padding: 10, height: "100%", overflow: "auto" }}>
      <div style={{ background: "#d4d4d4", padding: "5px 8px", display: "flex", alignItems: "center", gap: 4, borderRadius: "8px 8px 0 0", maxWidth: maxW, margin: "0 auto" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e74c3c", display: "inline-block" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f39c12", display: "inline-block" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#27ae60", display: "inline-block" }} />
        <span style={{ flex: 1, background: "#fff", borderRadius: 8, padding: "2px 8px", fontSize: 10, color: "#888", textAlign: "center", marginLeft: 4 }}>
          nodbusiness.vercel.app/showroom/{title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "your-site"}
        </span>
      </div>
      <div className="relative bg-card text-foreground" style={{ fontFamily: siteFontFamily(fontFamily), borderRadius: "0 0 8px 8px", overflow: "hidden", maxWidth: maxW, margin: "0 auto", minHeight: 200, boxShadow: "0 2px 16px rgba(0,0,0,.1)" }}>
        {sections.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Add a section from Sections to see your page here.</p>
        ) : sections.map((section, i) => (
          <SectionRenderer
            key={`${section.type}-${i}`}
            section={section}
            sectionIndex={i}
            products={isCatalogueSection(section.type) ? shown : []}
            productSearch={search}
            productCategory={category}
            productCategories={categories}
            onProductSearchChange={setSearch}
            onProductCategoryChange={setCategory}
            themeColor={THEME}
            profile={profile}
            showProductLinks={false}
            onBuy={explain}
            onGetQuote={explain}
            ctaTarget={ctaTarget}
            isPrimaryProducts={i === productsIdx}
            businessId={businessId}
            preview
          />
        ))}
        {sections.length > 0 && !sections.some(s => s.type === "contact") && (
          <SectionRenderer section={{ type: "contact", title: "Get in Touch" }} sectionIndex={sections.length} themeColor={THEME} profile={profile} preview />
        )}
        {showWhatsapp && whatsapp && (
          <div className="flex justify-end px-3 py-2">
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25d366] text-white shadow-md">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" /></svg>
            </span>
          </div>
        )}
        <div className="px-5 py-6 bg-secondary text-center">
          <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">© {new Date().getFullYear()} {title}. Powered by <BrandLogo className="w-3.5 h-3.5" /> Nodbusiness</p>
        </div>
      </div>
    </div>
  );
}
