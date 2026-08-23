'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, FlaskConical, Save, Loader2, ChevronDown, ChevronUp, ClipboardPaste } from 'lucide-react';
import { FieldMapping } from '../../types/externalApi';
import { computePreview } from '../../lib/externalMappingPreview';

export interface FieldDef {
  key: string;
  label: string;
}

interface Props {
  showroomId: string;
  sectionKey: string;
  sourceId: string;
  sectionItemFields: FieldDef[];
}

/** Row state — tracks the current source_path input and any saved mapping id */
interface MappingRow {
  targetField: string;
  label: string;
  sourcePath: string;
  mappingId: string | null; // null = not yet saved
}

export default function FieldMapperPanel({
  showroomId,
  sectionKey,
  sourceId,
  sectionItemFields,
}: Props) {
  const buildEmptyRows = useCallback(
    () =>
      sectionItemFields.map((f) => ({
        targetField: f.key,
        label: f.label,
        sourcePath: '',
        mappingId: null,
      })),
    [sectionItemFields]
  );

  const [rows, setRows] = useState<MappingRow[]>(buildEmptyRows);

  // Keys detected from the sample response
  const [sampleKeys, setSampleKeys] = useState<string[]>([]);
  const [sampleKeysOpen, setSampleKeysOpen] = useState(false);

  // ── Live preview (Patent 4 embodiment): paste a sample response and see each
  // mapping resolve in real time — no request needed.
  const [pasteOpen, setPasteOpen] = useState(false);
  const [rawSample, setRawSample] = useState('');
  const preview = useMemo(
    () => computePreview(rawSample, rows),
    [rawSample, rows]
  );

  // UI state
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // --- Load existing mappings on mount / when sourceId changes ---
  const loadMappings = useCallback(async () => {
    // Reset rows to empty first so stale paths from a previous source don't linger
    setRows(buildEmptyRows());
    try {
      const res = await fetch(
        `/api/showrooms/${showroomId}/external-sources/${sourceId}/mappings`,
        { credentials: 'include' }
      );
      if (!res.ok) return;
      const data: FieldMapping[] = await res.json();
      setRows((prev) =>
        prev.map((row) => {
          const existing = data.find((m) => m.target_field === row.targetField);
          if (existing) {
            return { ...row, sourcePath: existing.source_path, mappingId: existing.id };
          }
          return row;
        })
      );
    } catch {
      // silently ignore — user can still interact
    }
  }, [showroomId, sourceId, buildEmptyRows]);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  // --- Test & Map Fields ---
  const handleTest = async () => {
    setTesting(true);
    setTestError(null);
    setSampleKeys([]);
    try {
      const res = await fetch(`/api/proxy/${showroomId}/${sectionKey}`);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        const body = contentType.includes('application/json') ? await res.json() : {};
        setTestError(body.error || `Request failed with status ${res.status}`);
        return;
      }
      const body = await res.json();
      // Detect top-level keys from first element if array, or from object
      let sample: unknown = body;
      if (Array.isArray(body) && body.length > 0) {
        sample = body[0];
      } else if (
        !Array.isArray(body) &&
        typeof body === 'object' &&
        body !== null
      ) {
        // Unwrap single-key array wrapper (e.g. { items: [...] })
        const keys = Object.keys(body as object);
        if (
          keys.length === 1 &&
          Array.isArray((body as Record<string, unknown>)[keys[0]])
        ) {
          const arr = (body as Record<string, unknown>)[keys[0]] as unknown[];
          sample = arr.length > 0 ? arr[0] : body;
        }
      }
      if (typeof sample === 'object' && sample !== null) {
        setSampleKeys(Object.keys(sample as object));
        setSampleKeysOpen(true);
      } else {
        setTestError('Response has no detectable keys.');
      }
    } catch {
      setTestError('Network error — could not reach the proxy endpoint.');
    } finally {
      setTesting(false);
    }
  };

  // --- Update a row's source path ---
  const updateSourcePath = (targetField: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.targetField === targetField ? { ...row, sourcePath: value } : row
      )
    );
  };

  // --- Save Mappings ---
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const filledRows = rows.filter((r) => r.sourcePath.trim() !== '');

    if (filledRows.length === 0) {
      setSaveError('Enter at least one source path before saving.');
      setSaving(false);
      return;
    }

    try {
      const results = await Promise.all(
        filledRows.map((row) =>
          fetch(
            `/api/showrooms/${showroomId}/external-sources/${sourceId}/mappings`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                source_path: row.sourcePath.trim(),
                target_field: row.targetField,
              }),
            }
          ).then(async (res) => {
            const data = await res.json();
            return { ok: res.ok, data, targetField: row.targetField };
          })
        )
      );

      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        setSaveError(`${failed.length} mapping(s) failed to save. Please try again.`);
        return;
      }

      // Update mappingIds from the server response
      setRows((prev) =>
        prev.map((row) => {
          const result = results.find((r) => r.targetField === row.targetField);
          if (result?.ok && result.data?.id) {
            return { ...row, mappingId: result.data.id };
          }
          return row;
        })
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Network error — mappings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  // --- Delete a single mapping ---
  const handleDelete = async (targetField: string, mappingId: string) => {
    setDeletingId(mappingId);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/showrooms/${showroomId}/external-sources/${sourceId}/mappings/${mappingId}`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (res.ok) {
        setRows((prev) =>
          prev.map((row) =>
            row.targetField === targetField
              ? { ...row, sourcePath: '', mappingId: null }
              : row
          )
        );
      } else {
        setDeleteError('Could not delete mapping. Please try again.');
      }
    } catch {
      setDeleteError('Network error — mapping could not be deleted.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card dark:bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30 bg-amber-50/50">
        <span className="text-xs font-bold text-amber-700">Field Mappings</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Test button + detected keys */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FlaskConical className="w-3.5 h-3.5" />
            )}
            Test &amp; Map Fields
          </button>

          {testError && (
            <p className="text-[11px] text-red-500 font-medium">{testError}</p>
          )}

          {sampleKeys.length > 0 && (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setSampleKeysOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-secondary/40 transition-colors"
              >
                <span>Detected keys ({sampleKeys.length})</span>
                {sampleKeysOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {sampleKeysOpen && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5 border-t border-border/30 pt-2">
                  {sampleKeys.map((k) => (
                    <span
                      key={k}
                      className="text-[10px] font-mono bg-secondary/60 text-foreground px-2 py-0.5 rounded-lg border border-border/40"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Paste-sample live preview */}
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setPasteOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-secondary/40 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ClipboardPaste className="w-3.5 h-3.5" />
              Preview with a sample response (optional)
            </span>
            {pasteOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {pasteOpen && (
            <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-2">
              <textarea
                value={rawSample}
                onChange={(e) => setRawSample(e.target.value)}
                rows={5}
                spellCheck={false}
                placeholder={'Paste one sample response here, e.g.\n[{"name": "Widget", "price": 10}]\nor\n{"items": [{"title": "Hat"}]}'}
                className="w-full text-[11px] font-mono px-2.5 py-2 rounded-lg border border-border/60 bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 resize-y"
              />
              {preview.parseError && (
                <p className="text-[11px] text-red-500 font-medium">{preview.parseError}</p>
              )}
              {!preview.parseError && rawSample.trim() && preview.mappedSample && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                    Live mapped result
                  </p>
                  <pre className="text-[10px] font-mono bg-secondary/60 rounded-lg p-2 overflow-auto max-h-40 border border-border/40">
                    {JSON.stringify(preview.mappedSample, null, 2)}
                  </pre>
                </div>
              )}
              {!preview.parseError && rawSample.trim() && !preview.mappedSample && (
                <p className="text-[11px] text-muted-foreground">
                  Type a source path below to see it resolve against this sample.
                </p>
              )}
              {preview.detectedKeys.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {preview.detectedKeys.map((k) => (
                    <span
                      key={k}
                      className="text-[10px] font-mono bg-secondary/60 text-foreground px-2 py-0.5 rounded-lg border border-border/40 cursor-pointer hover:bg-secondary"
                      onClick={() => {
                        // Clicking a detected key fills the first empty row — quick mapping.
                        const empty = rows.find((r) => !r.sourcePath.trim());
                        if (empty) updateSourcePath(empty.targetField, k);
                      }}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mapping rows */}
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.targetField}
              className="flex items-center gap-2 p-2.5 bg-secondary/40 rounded-xl border border-border/50"
            >
              {/* Target field label */}
              <span className="text-[11px] font-semibold text-muted-foreground w-28 shrink-0 truncate">
                {row.label}
              </span>

              {/* Source path input */}
              <input
                type="text"
                value={row.sourcePath}
                onChange={(e) => updateSourcePath(row.targetField, e.target.value)}
                placeholder="dot.notation.path"
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
              />

              {/* Live resolved value from the pasted sample (if any) */}
              {rawSample.trim() && !preview.parseError && (
                <span
                  title={preview.values[row.targetField] || 'No match in sample'}
                  className={`text-[10px] font-mono max-w-[7rem] truncate px-2 py-0.5 rounded-lg border shrink-0 ${
                    row.sourcePath.trim() && preview.values[row.targetField]
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : row.sourcePath.trim()
                        ? 'bg-red-50 text-red-500 border-red-200'
                        : 'bg-secondary/60 text-muted-foreground border-border/40'
                  }`}
                >
                  {row.sourcePath.trim()
                    ? preview.values[row.targetField] || 'no match'
                    : '—'}
                </span>
              )}

              {/* Delete button — only shown when a mapping has been saved */}
              {row.mappingId && (
                <button
                  type="button"
                  onClick={() => handleDelete(row.targetField, row.mappingId!)}
                  disabled={deletingId === row.mappingId}
                  aria-label={`Delete mapping for ${row.label}`}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {deletingId === row.mappingId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Save button + feedback */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Mappings
          </button>

          {saveError && (
            <p className="text-[11px] text-red-500 font-medium">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-[11px] text-green-600 font-medium">Mappings saved.</p>
          )}
          {deleteError && (
            <p className="text-[11px] text-red-500 font-medium">{deleteError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
