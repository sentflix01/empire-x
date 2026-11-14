'use client'
import React, { useState, useEffect, useCallback } from "react";
import { getSectionType } from "@/lib/builderSections";
import { Plus, X, Database } from "lucide-react";
import ExternalDataSourcePanel from "./ExternalDataSourcePanel";
import FieldMapperPanel, { FieldDef } from "./FieldMapperPanel";
import DataSourceStatusPanel from "./DataSourceStatusPanel";
import type { ExternalDataSource } from "../../types/externalApi";
import { apiFetch } from '@/lib/api/client';
import ProductPicker from "./ProductPicker";
import PhotoField from "./PhotoField";
import HoursField from "./HoursField";
import { Switch } from "@/components/ui/switch";
import type { BuilderField, SectionType } from "@/lib/builderSections";
import { checkField, fieldRule, normaliseUrl } from "@/lib/builderFieldRules";

// 16 px text on phones: iOS Safari zooms the page into any smaller field on focus.
const inputClass = "w-full text-base sm:text-sm px-3 py-2 min-h-11 rounded-xl border border-border/60 bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-primary aria-[invalid=true]:border-destructive aria-[invalid=true]:focus:ring-destructive";

/**
 * A text or long-text field with the server's rules applied as you type
 * (lib/builderFieldRules.ts): the right phone keyboard, a length limit with a
 * counter where it is tight, and a plain message under a wrong phone, email
 * or link, shown once the owner leaves the field.
 */
function TextInput({ id, fieldKey, label, value, onChange, placeholder, multiline = false, rows = 3 }: {
  id: string; fieldKey: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number;
}) {
  const rule = fieldRule(fieldKey, label);
  const [touched, setTouched] = useState(false);
  const problem = touched ? checkField(rule, value) : null;
  const msgId = `${id}-problem`;
  const countId = `${id}-count`;
  const describedBy = [problem ? msgId : null, rule.counter ? countId : null].filter(Boolean).join(" ") || undefined;
  const onBlur = () => {
    setTouched(true);
    if (rule.kind === "url") { const tidy = normaliseUrl(value); if (tidy !== value) onChange(tidy); }
  };
  const common = {
    id, value, placeholder, maxLength: rule.maxLength,
    "aria-invalid": problem ? true : undefined,
    "aria-describedby": describedBy,
    onBlur,
  };
  return (
    <>
      {multiline
        ? <textarea {...common} onChange={e => onChange(e.target.value)} rows={rows} className={`${inputClass} resize-y`} />
        : <input {...common} type={rule.inputType} inputMode={rule.inputMode} autoComplete={rule.autoComplete ?? "off"}
            spellCheck={rule.kind === "text" ? undefined : false}
            onChange={e => onChange(e.target.value)} className={inputClass} />}
      {(problem || rule.counter) && (
        <div className="mt-1 flex items-start gap-2 text-[11px]">
          {problem && <p id={msgId} className="flex-1 text-destructive">{problem}</p>}
          {rule.counter && (
            <p id={countId} className={`ml-auto shrink-0 tabular-nums ${value.length >= rule.maxLength ? "text-destructive" : "text-muted-foreground"}`}>
              {value.length} / {rule.maxLength}
            </p>
          )}
        </div>
      )}
    </>
  );
}

/** One section field: write, add a photo, switch on/off. Hidden fields are set elsewhere (e.g. Style). */
function FieldControl({ id, field, value, onChange }: { id: string; field: BuilderField; value: any; onChange: (v: any) => void }) {
  if (field.type === "hidden") return null;
  if (field.type === "toggle") {
    const on = value === true || value === "true";
    return (
      <label htmlFor={id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span className="font-medium">{field.label}</span>
        <Switch id={id} checked={on} onCheckedChange={(v: boolean) => onChange(v)} />
      </label>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">{field.label}</label>
      {field.type === "image" ? (
        <PhotoField id={id} label={field.label} value={value || ""} onChange={onChange} />
      ) : field.type === "hours" ? (
        <HoursField id={id} value={value} onChange={onChange} />
      ) : field.type === "date" ? (
        <input type="date" id={id} value={value || ""} onChange={e => onChange(e.target.value)} className={`${inputClass} min-h-11`} />
      ) : field.type === "color" ? (
        <input type="color" id={id} value={value || "#2563EB"} onChange={e => onChange(e.target.value)} className="h-11 w-16 rounded-lg border border-border/60" />
      ) : field.type === "textarea" ? (
        <TextInput id={id} fieldKey={field.key} label={field.label} value={String(value ?? "")} onChange={onChange} placeholder={field.placeholder} multiline />
      ) : (
        <TextInput id={id} fieldKey={field.key} label={field.label} value={String(value ?? "")} onChange={onChange} placeholder={field.placeholder} />
      )}
      {field.hint && <p className="mt-1 text-[11px] text-muted-foreground">{field.hint}</p>}
    </div>
  );
}

/** Section card header: plain name, plan badge, and what the section does. */
function SectionHeader({ sec }: { sec: SectionType }) {
  return (
    <div className="border-b border-border/30 bg-primary-subtle/50 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-primary-subtle-foreground">{sec.label}</span>
        {sec.tier !== "freemium" && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${sec.tier === "pro" ? "bg-brand-secondary" : "bg-primary"}`}>
            {sec.tier === "pro" ? "Pro" : "Premium"}
          </span>
        )}
      </div>
      {sec.purpose && <p className="mt-0.5 text-xs text-muted-foreground">{sec.purpose}</p>}
    </div>
  );
}

/** A section's fields: repeaters as lists, everything else through FieldControl. */
function SectionFields({ sec, secKey, formData, onChange, hideRepeater = false }: {
  sec: SectionType; secKey: string; formData: Record<string, any>; onChange: (key: string, value: any) => void; hideRepeater?: boolean;
}) {
  return (
    <>
      {sec.fields.map(field => field.type === "repeater" ? (
        hideRepeater ? null : (
          <div key={field.key}>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{field.label}</p>
            <RepeaterField field={field} value={formData[field.key]} onChange={(val: any) => onChange(field.key, val)} />
          </div>
        )
      ) : (
        <FieldControl key={field.key} id={`builder-${secKey}-${field.key}`} field={field} value={formData[field.key]} onChange={(v) => onChange(field.key, v)} />
      ))}
    </>
  );
}

interface Props {
  activeSections: string[];
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
  /** Optional — only available for saved/existing showrooms */
  showroomId?: string;
}

/** Tab identifiers for the builder top-level tabs */
type BuilderTab = "content" | "data-sources";

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
            className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-destructive-subtle text-destructive flex items-center justify-center hover:bg-destructive-subtle transition-colors"
            aria-label={`Remove ${field.label} ${idx + 1}`}
          >
            <X className="w-3 h-3" />
          </button>
          <div className="pr-9 space-y-2">
            {field.itemFields.map((sub: any) => (
              <div key={sub.key}>
                <label htmlFor={`${field.key}-${idx}-${sub.key}`} className="text-xs font-semibold text-muted-foreground block mb-0.5">{sub.label}</label>
                {sub.type === "product" ? (
                  <ProductPicker
                    id={`${field.key}-${idx}-${sub.key}`}
                    value={item[sub.key] || ""}
                    onChange={(productId) => update(idx, sub.key, productId)}
                  />
                ) : sub.type === "image" ? (
                  <PhotoField
                    id={`${field.key}-${idx}-${sub.key}`}
                    label={sub.label}
                    value={item[sub.key] || ""}
                    onChange={(url) => update(idx, sub.key, url)}
                  />
                ) : sub.type === "textarea" ? (
                  <TextInput id={`${field.key}-${idx}-${sub.key}`} fieldKey={sub.key} label={sub.label} value={String(item[sub.key] ?? "")}
                    onChange={(v) => update(idx, sub.key, v)} placeholder={sub.placeholder} multiline rows={2} />
                ) : (
                  <TextInput id={`${field.key}-${idx}-${sub.key}`} fieldKey={sub.key} label={sub.label} value={String(item[sub.key] ?? "")}
                    onChange={(v) => update(idx, sub.key, v)} placeholder={sub.placeholder} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full min-h-11 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary-subtle transition-colors"
      >
        <Plus className="w-4 h-4" /> Add {field.label.replace(/s$/, "").toLowerCase()}
      </button>
    </div>
  );
}

/**
 * SectionWithExternalSource
 *
 * Wraps a single section's manual fields with the ExternalDataSourcePanel
 * and FieldMapperPanel for repeater sections (Requirement 1.1, 10.4).
 *
 * - When a source is disabled: renders manual formData for the section
 *   (falls back to empty if formData has no items — Requirement 10.4).
 * - ExternalDataSourcePanel renders below the manual fields (Requirement 1.1).
 * - FieldMapperPanel renders only after a source has been saved (Requirement 3.1).
 */
function SectionWithExternalSource({
  secKey,
  showroomId,
  formData,
  onChange,
}: {
  secKey: string;
  showroomId: string;
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const sec = getSectionType(secKey);

  // Hooks must be called unconditionally — before any early returns
  // Track the saved ExternalDataSource for this section
  const [source, setSource] = useState<ExternalDataSource | undefined>(undefined);
  const [loadingSource, setLoadingSource] = useState<boolean>(true);

  // Load existing source on mount
  const loadSource = useCallback(async () => {
    if (!sec) return;
    setLoadingSource(true);
    try {
      const res = await apiFetch(
        `/api/showrooms/${showroomId}/external-sources`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const sources: ExternalDataSource[] = await res.json();
      const found = sources.find(s => s.section_key === secKey);
      setSource(found);
    } catch {
      // silently ignore — panel still renders without existing source
    } finally {
      setLoadingSource(false);
    }
  }, [showroomId, secKey, sec]);

  useEffect(() => {
    loadSource();
  }, [loadSource]);

  // Early return after all hooks — safe to return null here
  if (!sec) return null;

  // Find the repeater field for this section (there is at most one per section)
  const repeaterField = sec.fields.find(f => f.type === "repeater");

  const handleSourceSaved = (saved: ExternalDataSource) => {
    setSource(saved);
  };

  const handleSourceDeleted = () => {
    setSource(undefined);
  };

  // Determine the repeater field value to display.
  // When source is disabled: use manual formData (Requirement 10.4).
  // When source is enabled (or no source): render the field normally.
  const isSourceEnabled = source?.is_enabled ?? false;
  const hasActiveSource = !!source;

  // Build itemFields for FieldMapperPanel
  const sectionItemFields: FieldDef[] = repeaterField?.itemFields?.map(f => ({
    key: f.key,
    label: f.label,
  })) ?? [];

  return (
    <div className="bg-card dark:bg-card rounded-2xl border border-border/50 overflow-hidden">
      <SectionHeader sec={sec} />

      {/* Manual fields; an enabled external source replaces the list (Requirement 10.4). */}
      <div className="p-3 space-y-3">
        <SectionFields sec={sec} secKey={secKey} formData={formData} onChange={onChange} hideRepeater={hasActiveSource && isSourceEnabled} />

        {/* Disabled source indicator: show which section's data is being used */}
        {hasActiveSource && !isSourceEnabled && repeaterField && (
          <p className="text-[10px] text-muted-foreground italic px-1">
            External source disabled — showing manual data above.
            {(!formData[repeaterField.key] || (formData[repeaterField.key] as any[]).length === 0) &&
              " (No manual data entered; section will appear empty.)"}
          </p>
        )}
      </div>

      {/* ExternalDataSourcePanel — rendered below manual fields for repeater sections */}
      {!loadingSource && (
        <div className="px-3 pb-3">
          <ExternalDataSourcePanel
            showroomId={showroomId}
            sectionKey={secKey}
            sectionLabel={sec.label}
            existingSource={source}
            onSaved={handleSourceSaved}
            onDeleted={handleSourceDeleted}
          />

          {/* FieldMapperPanel — only rendered after a source has been saved */}
          {source && sectionItemFields.length > 0 && (
            <div className="mt-3">
              <FieldMapperPanel
                showroomId={showroomId}
                sectionKey={secKey}
                sourceId={source.id}
                sectionItemFields={sectionItemFields}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BuilderForm({ activeSections, formData, onChange, showroomId }: Props) {
  const [activeTab, setActiveTab] = useState<BuilderTab>("content");

  if (activeSections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
        <p className="text-sm">Add a section from Sections to start.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Tab bar — only show when showroomId is available (i.e. saved showroom) */}
      {showroomId && (
        <div className="flex border-b border-border/40 mb-3 sticky top-0 bg-background z-10">
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "content"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Content
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("data-sources")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "data-sources"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Database className="w-3 h-3" />
            Data Sources
          </button>
        </div>
      )}

      {/* ── Data Sources tab ── */}
      {activeTab === "data-sources" && showroomId && (
        <DataSourceStatusPanel showroomId={showroomId} />
      )}

      {/* ── Content tab (always shown when no showroomId; default active tab with showroomId) ── */}
      {(activeTab === "content" || !showroomId) && (
        <div className="space-y-3 pb-6">
          {activeSections.map(secKey => {
            const sec = getSectionType(secKey);
            if (!sec) return null;

            // Check if this section has a repeater field — if so and showroomId is
            // available, use the enhanced SectionWithExternalSource wrapper
            const hasRepeater = sec.fields.some(f => f.type === "repeater");

            if (hasRepeater && showroomId) {
              return (
                <SectionWithExternalSource
                  key={secKey}
                  secKey={secKey}
                  showroomId={showroomId}
                  formData={formData}
                  onChange={onChange}
                />
              );
            }

            // Non-repeater sections (or no showroomId) — render original layout
            return (
              <div key={secKey} className="bg-card dark:bg-card rounded-2xl border border-border/50 overflow-hidden">
                <SectionHeader sec={sec} />
                <div className="p-3 space-y-3">
                  <SectionFields sec={sec} secKey={secKey} formData={formData} onChange={onChange} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
