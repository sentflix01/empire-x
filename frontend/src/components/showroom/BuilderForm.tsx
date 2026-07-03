// @ts-nocheck
import React from "react";
import { SECTION_TYPES, getSectionType } from "@/lib/builderSections";
import { Plus, X } from "lucide-react";

interface Props {
  activeSections: string[];
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

function RepeaterField({ field, value, onChange }: any) {
  const items: any[] = value || [];

  const add = () => {
    const item: Record<string, string> = {};
    field.itemFields.forEach((f: any) => { item[f.key] = ""; });
    onChange([...items, item]);
  };

  const remove = (idx: number) => {
    const next = [...items]; next.splice(idx, 1); onChange(next);
  };

  const update = (idx: number, key: string, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="relative p-2.5 bg-secondary/40 rounded-xl border border-border/50 space-y-2">
          <button
            type="button"
            onClick={() => remove(idx)}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="pr-6 space-y-1.5">
            {field.itemFields.map((sub: any) => (
              <div key={sub.key}>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">{sub.label}</label>
                {sub.type === "textarea" ? (
                  <textarea
                    value={item[sub.key] || ""}
                    onChange={e => update(idx, sub.key, e.target.value)}
                    placeholder={sub.placeholder}
                    rows={2}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-card dark:bg-background resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                ) : (
                  <input
                    type="text"
                    value={item[sub.key] || ""}
                    onChange={e => update(idx, sub.key, e.target.value)}
                    placeholder={sub.placeholder}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed border-amber-300 text-amber-700 text-xs font-medium hover:bg-amber-50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add {field.label.replace(/s$/, "")}
      </button>
    </div>
  );
}

export default function BuilderForm({ activeSections, formData, onChange }: Props) {
  if (activeSections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
        <p className="text-sm">Enable sections from the left panel</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      {activeSections.map(secKey => {
        const sec = getSectionType(secKey);
        if (!sec) return null;
        return (
          <div key={secKey} className="bg-card dark:bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30 bg-amber-50/50">
              <span className="text-xs font-bold text-amber-700">{sec.label}</span>
              {sec.tier !== "freemium" && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${sec.tier === "pro" ? "bg-violet-500" : "bg-amber-500"}`}>
                  {sec.tier === "pro" ? "Pro+" : "Premium"}
                </span>
              )}
            </div>
            <div className="p-3 space-y-2.5">
              {sec.fields.map(field => (
                <div key={field.key}>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">{field.label}</label>
                  {field.type === "repeater" ? (
                    <RepeaterField
                      field={field}
                      value={formData[field.key]}
                      onChange={(val: any) => onChange(field.key, val)}
                    />
                  ) : field.type === "color" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData[field.key] || "#b8860b"}
                        onChange={e => onChange(field.key, e.target.value)}
                        className="w-9 h-9 rounded-lg border border-border/60 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData[field.key] || "#b8860b"}
                        onChange={e => onChange(field.key, e.target.value)}
                        className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400"
                        placeholder="#b8860b"
                      />
                    </div>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={formData[field.key] || ""}
                      onChange={e => onChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-border/60 bg-card dark:bg-background resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[field.key] || ""}
                      onChange={e => onChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full text-xs px-2.5 py-2 rounded-xl border border-border/60 bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
