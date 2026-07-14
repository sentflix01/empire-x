import React from "react";
import { Check } from "lucide-react";

/**
 * Reusable card for selecting a business website template.
 * Shows a mini visual preview of the layout structure.
 *
 * @param {object} template - the template object (id, name, desc, sections)
 * @param {boolean} selected - whether this template is currently selected
 * @param {function} onSelect - called when the card is clicked
 */
export default function TemplateCard({ template, selected, onSelect }) {
  // Build a mini wireframe preview from section types
  const sectionDots = template.sections.map((s, i) => {
    const t = s.type;
    if (t === "hero") return { h: "h-10", w: "w-full", label: "Hero" };
    if (t === "products" || t === "featured_products" || t === "courses" || t === "menu") return { h: "h-6", w: "w-full", label: "Grid", grid: true };
    if (t === "gallery") return { h: "h-6", w: "w-full", label: "Gallery", grid: true };
    if (t === "features" || t === "process") return { h: "h-5", w: "w-full", label: "Steps", row: true };
    if (t === "testimonials") return { h: "h-4", w: "w-3/4", label: "Quote" };
    if (t === "faq") return { h: "h-4", w: "w-5/6", label: "FAQ" };
    if (t === "contact") return { h: "h-6", w: "w-full", label: "Contact", dark: true };
    if (t === "about" || t === "story") return { h: "h-4", w: "w-2/3", label: "Text" };
    if (t === "instructor" || t === "team") return { h: "h-8", w: "w-full", label: "Profile", circle: true };
    if (t === "hours") return { h: "h-4", w: "w-1/2", label: "Hours" };
    return { h: "h-4", w: "w-full", label: "Section" };
  });

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
        selected ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300" : "border-border hover:border-amber-300 hover:bg-secondary/30"
      }`}
    >
      {/* Mini wireframe preview */}
      <div className="w-16 h-20 rounded-lg bg-secondary/40 border border-border/50 p-1.5 flex flex-col gap-1 shrink-0 overflow-hidden">
        {sectionDots.slice(0, 6).map((dot, i) => (
          <div key={i} className="flex gap-0.5 items-center" style={{ height: dot.h.includes("10") ? "40%" : "auto" }}>
            {dot.grid ? (
              <>
                <div className={`flex-1 ${dot.h} rounded-sm ${dot.dark ? "bg-amber-400/60" : "bg-amber-300/50"}`} />
                <div className={`flex-1 ${dot.h} rounded-sm ${dot.dark ? "bg-amber-400/60" : "bg-amber-300/50"}`} />
              </>
            ) : dot.circle ? (
              <div className="w-4 h-4 rounded-full bg-amber-400/50 mx-auto" />
            ) : dot.row ? (
              <>
                <div className={`flex-1 ${dot.h} rounded-sm bg-muted-foreground/20`} />
                <div className={`flex-1 ${dot.h} rounded-sm bg-muted-foreground/20`} />
                <div className={`flex-1 ${dot.h} rounded-sm bg-muted-foreground/20`} />
              </>
            ) : (
              <div className={`${dot.h} ${dot.w} rounded-sm ${dot.dark ? "bg-gray-700/60" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Template info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold truncate">{template.name}</p>
          {selected && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.desc}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">{template.sections.length} sections</p>
      </div>
    </button>
  );
}
