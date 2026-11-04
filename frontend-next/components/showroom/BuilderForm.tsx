'use client'
import React, { useState, useEffect, useCallback } from "react";
import { getSectionType } from "@/lib/builderSections";
import { AlertCircle, Plus, X, Database } from "lucide-react";
import ExternalDataSourcePanel from "./ExternalDataSourcePanel";
import FieldMapperPanel, { FieldDef } from "./FieldMapperPanel";
import DataSourceStatusPanel from "./DataSourceStatusPanel";
import type { ExternalDataSource } from "../../types/externalApi";
import { apiFetch } from '@/api/client';
import ProductPicker from "./ProductPicker";
import PhotoField from "./PhotoField";
import HoursField from "./HoursField";
import { Switch } from "@/components/ui/switch";
import type { BuilderField, SectionType } from "@/lib/builderSections";
import type { ValidationError } from "@/lib/builderValidation";
import { errorFieldIds } from "@/lib/builderValidation";

// ── Shared styles ────────────────────────────────────────────────────────────
const inputBase = "w-full text-sm px-3 py-2 rounded-xl border bg-card dark:bg-background focus:outline-none focus:ring-2 transition-colors";
const inputNormal  = `${inputBase} border-border/60 focus:ring-amber-400/50`;
const inputInvalid = `${inputBase} border-red-400 focus:ring-red-400/50 bg-red-50/40 dark:bg-red-500/5`;

// ── Required asterisk ────────────────────────────────────────────────────────
function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-red-500 font-bold">*</span>
  );
}

// ── Inline field error message ───────────────────────────────────────────────
function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
      <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

// ── Single field control ─────────────────────────────────────────────────────
function FieldControl({
  id, field, value, onChange, hasError, errorMessage,
}: {
  id: string;
  field: BuilderField;
  value: unknown;
  onChange: (v: unknown) => void;
  hasError?: boolean;
  errorMessage?: string;
}) {
  if (field.type === "hidden") return null;

  if (field.type === "toggle") {
    const on = value === true || value === "true";
    return (
      <label htmlFor={id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span className="font-medium">
          {field.label}
          {field.required && <RequiredMark />}
        </span>
        <Switch id={id} checked={on} onCheckedChange={(v: boolean) => onChange(v)} />
      </label>
    );
  }

  const inputCls = hasError ? `${inputInvalid} min-h-11` : `${inputNormal} min-h-11`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
        {field.label}
        {field.required && <RequiredMark />}
      </label>
      {field.type === "image" ? (
        <PhotoField id={id} label={field.label} value={String(value || "")} onChange={onChange} />
      ) : field.type === "hours" ? (
        <HoursField id={id} value={value} onChange={onChange} />
      ) : field.type === "date" ? (
        <input
          type="date"
          id={id}
          value={String(value || "")}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      ) : field.type === "color" ? (
        <input
          type="color"
          id={id}
          value={String(value || "#2563EB")}
          onChange={e => onChange(e.target.value)}
          className="h-11 w-16 rounded-lg border border-border/60"
        />
      ) : field.type === "textarea" ? (
        <textarea
          id={id}
          value={String(value || "")}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`${hasError ? inputInvalid : inputNormal} resize-none`}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      ) : (
        <input
          type="text"
          id={id}
          value={String(value || "")}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputCls}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      )}
      {hasError && errorMessage && (
        <span id={`${id}-error`}>
          <FieldError message={errorMessage} />
        </span>
      )}
      {!hasError && field.hint && (
        <p className="mt-1 text-[11px] text-muted-foreground">{field.hint}</p>
      )}
    </div>
  );
}

// ── Section card header ──────────────────────────────────────────────────────
function SectionHeader({ sec, hasErrors }: { sec: SectionType; hasErrors?: boolean }) {
  return (
    <div className={`border-b px-3 py-2.5 ${
      hasErrors
        ? 'border-red-200 bg-red-50/70 dark:border-red-500/30 dark:bg-red-500/10'
        : 'border-border/30 bg-amber-50/50 dark:bg-amber-500/5'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold ${hasErrors ? 'text-red-700 dark:text-red-300' : 'text-amber-800 dark:text-amber-200'}`}>
          {sec.label}
        </span>
        {hasErrors && (
          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            Needs attention
          </span>
        )}
        {!hasErrors && sec.tier !== "freemium" && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${sec.tier === "pro" ? "bg-violet-500" : "bg-amber-500"}`}>
            {sec.tier === "pro" ? "Pro" : "Premium"}
          </span>
        )}
      </div>
      {sec.purpose && (
        <p className={`mt-0.5 text-xs ${hasErrors ? 'text-red-600/80 dark:text-red-400/80' : 'text-muted-foreground'}`}>
          {sec.purpose}
        </p>
      )}
    </div>
  );
}

// ── Repeater field ───────────────────────────────────────────────────────────
function RepeaterField({
  field, value, onChange, invalidFieldIds,
}: {
  field: BuilderField;
  value: unknown;
  onChange: (v: unknown) => void;
  invalidFieldIds?: Set<string>;
}) {
  const items = (Array.isArray(value) ? value : []) as Record<string, unknown>[];

  const add = () => {
    const item: Record<string, string> = {};
    field.itemFields?.forEach(f => { item[f.key] = ""; });
    onChange([...items, item]);
  };

  const remove = (idx: number) => {
    const next = [...items];
    next.splice(idx, 1);
    onChange(next);
  };

  const update = (idx: number, key: string, val: unknown) => {
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
            className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors"
            aria-label={`Remove ${field.label} ${idx + 1}`}
          >
            <X className="w-3 h-3" />
          </button>
          <div className="pr-9 space-y-2">
            {field.itemFields?.map(sub => {
              const subId = `${field.key}-${idx}-${sub.key}`;
              const hasSubError = invalidFieldIds?.has(subId) ?? false;
              return (
                <div key={sub.key}>
                  <label htmlFor={subId} className="text-xs font-semibold text-muted-foreground block mb-0.5">
                    {sub.label}
                    {sub.required && <RequiredMark />}
                  </label>
                  {sub.type === "product" ? (
                    <ProductPicker
                      id={subId}
                      value={String(item[sub.key] || "")}
                      onChange={productId => update(idx, sub.key, productId)}
                    />
                  ) : sub.type === "image" ? (
                    <PhotoField
                      id={subId}
                      label={sub.label}
                      value={String(item[sub.key] || "")}
                      onChange={url => update(idx, sub.key, url)}
                    />
                  ) : sub.type === "textarea" ? (
                    <textarea
                      value={String(item[sub.key] || "")}
                      id={subId}
                      onChange={e => update(idx, sub.key, e.target.value)}
                      placeholder={sub.placeholder}
                      rows={2}
                      aria-invalid={hasSubError}
                      className={`${hasSubError ? inputInvalid : inputNormal} resize-none`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(item[sub.key] || "")}
                      id={subId}
                      onChange={e => update(idx, sub.key, e.target.value)}
                      placeholder={sub.placeholder}
                      aria-invalid={hasSubError}
                      className={hasSubError ? `${inputInvalid} min-h-11` : `${inputNormal} min-h-11`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full min-h-11 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add {field.label.replace(/s$/, "").toLowerCase()}
      </button>
    </div>
  );
}

// ── Section fields ───────────────────────────────────────────────────────────
function SectionFields({
  sec, secKey, formData, onChange, hideRepeater = false, validationErrors,
}: {
  sec: SectionType;
  secKey: string;
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  hideRepeater?: boolean;
  validationErrors?: ValidationError[];
}) {
  const invalidIds = validationErrors ? errorFieldIds(validationErrors) : new Set<string>();

  // Build a map of fieldId → error message for quick lookup
  const errorMap = new Map<string, string>();
  validationErrors?.forEach(e => errorMap.set(e.fieldId, e.message));

  return (
    <>
      {sec.fields.map(field => {
        if (field.type === "repeater") {
          if (hideRepeater) return null;
          const repeaterError = validationErrors?.find(e => e.fieldKey === field.key && e.itemIndex === undefined);
          return (
            <div key={field.key}>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                {field.label}
                {field.required && <RequiredMark />}
              </p>
              {repeaterError && <FieldError message={repeaterError.message} />}
              <RepeaterField
                field={field}
                value={formData[field.key]}
                onChange={val => onChange(field.key, val)}
                invalidFieldIds={invalidIds}
              />
            </div>
          );
        }

        const fieldId = `builder-${secKey}-${field.key}`;
        const hasError = invalidIds.has(fieldId);
        return (
          <FieldControl
            key={field.key}
            id={fieldId}
            field={field}
            value={formData[field.key]}
            onChange={v => onChange(field.key, v)}
            hasError={hasError}
            errorMessage={errorMap.get(fieldId)}
          />
        );
      })}
    </>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  activeSections: string[];
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  /** Optional — only available for saved/existing showrooms */
  showroomId?: string;
  /**
   * Validation errors from the most recent publish attempt.
   * Pass an empty array (or omit) when the form has not been submitted yet.
   */
  validationErrors?: ValidationError[];
}

type BuilderTab = "content" | "data-sources";

// ── Section with external data source ───────────────────────────────────────
function SectionWithExternalSource({
  secKey, showroomId, formData, onChange, validationErrors,
}: {
  secKey: string;
  showroomId: string;
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  validationErrors?: ValidationError[];
}) {
  const sec = getSectionType(secKey);
  const [source, setSource] = useState<ExternalDataSource | undefined>(undefined);
  const [loadingSource, setLoadingSource] = useState<boolean>(true);

  const loadSource = useCallback(async () => {
    if (!sec) return;
    setLoadingSource(true);
    try {
      const res = await apiFetch(`/api/showrooms/${showroomId}/external-sources`, { credentials: "include" });
      if (!res.ok) return;
      const sources: ExternalDataSource[] = await res.json();
      setSource(sources.find(s => s.section_key === secKey));
    } catch { /* render without source */ }
    finally { setLoadingSource(false); }
  }, [showroomId, secKey, sec]);

  useEffect(() => { loadSource(); }, [loadSource]);

  if (!sec) return null;

  const repeaterField = sec.fields.find(f => f.type === "repeater");
  const isSourceEnabled = source?.is_enabled ?? false;
  const hasActiveSource = !!source;
  const sectionItemFields: FieldDef[] = repeaterField?.itemFields?.map(f => ({ key: f.key, label: f.label })) ?? [];
  const sectionErrors = validationErrors?.filter(e => e.sectionKey === secKey);
  const hasErrors = (sectionErrors?.length ?? 0) > 0;

  return (
    <div className={`bg-card dark:bg-card rounded-2xl border overflow-hidden ${hasErrors ? 'border-red-300 dark:border-red-500/40' : 'border-border/50'}`}>
      <SectionHeader sec={sec} hasErrors={hasErrors} />
      <div className="p-3 space-y-3">
        <SectionFields
          sec={sec}
          secKey={secKey}
          formData={formData}
          onChange={onChange}
          hideRepeater={hasActiveSource && isSourceEnabled}
          validationErrors={sectionErrors}
        />
        {hasActiveSource && !isSourceEnabled && repeaterField && (
          <p className="text-[10px] text-muted-foreground italic px-1">
            External source disabled — showing manual data above.
            {(!formData[repeaterField.key] || (formData[repeaterField.key] as unknown[]).length === 0) &&
              " (No manual data entered; section will appear empty.)"}
          </p>
        )}
      </div>
      {!loadingSource && (
        <div className="px-3 pb-3">
          <ExternalDataSourcePanel
            showroomId={showroomId}
            sectionKey={secKey}
            sectionLabel={sec.label}
            existingSource={source}
            onSaved={setSource}
            onDeleted={() => setSource(undefined)}
          />
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

// ── Validation error summary banner ─────────────────────────────────────────
function ValidationSummary({ errors }: { errors: ValidationError[] }) {
  if (errors.length === 0) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10"
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-300">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        Fix {errors.length} {errors.length === 1 ? 'issue' : 'issues'} before publishing
      </p>
      <ul className="mt-2 space-y-1 pl-1">
        {errors.map((err, i) => (
          <li key={i} className="text-xs text-red-600 dark:text-red-400">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById(err.fieldId);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.focus({ preventScroll: true });
              }}
              className="text-left underline underline-offset-2 hover:text-red-800 dark:hover:text-red-200 transition-colors"
            >
              <span className="font-medium">{err.sectionLabel}:</span> {err.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main BuilderForm export ──────────────────────────────────────────────────
export default function BuilderForm({ activeSections, formData, onChange, showroomId, validationErrors = [] }: Props) {
  const [activeTab, setActiveTab] = useState<BuilderTab>("content");

  if (activeSections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
        <p className="text-sm">Add a section from Sections to start.</p>
      </div>
    );
  }

  const sectionErrorMap = new Map<string, ValidationError[]>();
  validationErrors.forEach(e => {
    const list = sectionErrorMap.get(e.sectionKey) ?? [];
    list.push(e);
    sectionErrorMap.set(e.sectionKey, list);
  });

  return (
    <div className="space-y-0">
      {showroomId && (
        <div className="flex border-b border-border/40 mb-3 sticky top-0 bg-background z-10">
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "content"
                ? "text-amber-700 border-b-2 border-amber-500"
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
                ? "text-amber-700 border-b-2 border-amber-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Database className="w-3 h-3" />
            Data Sources
          </button>
        </div>
      )}

      {activeTab === "data-sources" && showroomId && (
        <DataSourceStatusPanel showroomId={showroomId} />
      )}

      {(activeTab === "content" || !showroomId) && (
        <div className="space-y-3 pb-6">
          {/* Validation summary — appears at the top of the form on publish attempt */}
          <ValidationSummary errors={validationErrors} />

          {activeSections.map(secKey => {
            const sec = getSectionType(secKey);
            if (!sec) return null;
            const sectionErrors = sectionErrorMap.get(secKey);
            const hasErrors = (sectionErrors?.length ?? 0) > 0;
            const hasRepeater = sec.fields.some(f => f.type === "repeater");

            if (hasRepeater && showroomId) {
              return (
                <SectionWithExternalSource
                  key={secKey}
                  secKey={secKey}
                  showroomId={showroomId}
                  formData={formData}
                  onChange={onChange}
                  validationErrors={sectionErrors}
                />
              );
            }

            return (
              <div
                key={secKey}
                className={`bg-card dark:bg-card rounded-2xl border overflow-hidden
                  ${hasErrors ? 'border-red-300 dark:border-red-500/40' : 'border-border/50'}`}
              >
                <SectionHeader sec={sec} hasErrors={hasErrors} />
                <div className="p-3 space-y-3">
                  <SectionFields
                    sec={sec}
                    secKey={secKey}
                    formData={formData}
                    onChange={onChange}
                    validationErrors={sectionErrors}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
