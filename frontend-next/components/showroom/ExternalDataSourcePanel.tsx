'use client'
import React, { useState, useRef, useEffect } from 'react';
import { ExternalDataSource } from '../../types/externalApi';
import { apiFetch } from '@/api/client';

interface Props {
  showroomId: string;
  sectionKey: string;
  sectionLabel: string;
  existingSource?: ExternalDataSource;
  onSaved?: (source: ExternalDataSource) => void;
  onDeleted?: () => void;
}

type AuthMethod = 'none' | 'bearer_token' | 'api_key_header' | 'api_key_query';

const AUTH_METHOD_LABELS: Record<AuthMethod, string> = {
  none: 'No Authentication',
  bearer_token: 'Bearer Token',
  api_key_header: 'API Key (Header)',
  api_key_query: 'API Key (Query Param)',
};

export default function ExternalDataSourcePanel({
  showroomId,
  sectionKey,
  sectionLabel,
  existingSource,
  onSaved,
  onDeleted,
}: Props) {
  const apiBase = `/api/showrooms/${showroomId}/external-sources`;

  // ── Form state ────────────────────────────────────────────────────────────
  const [isEnabled, setIsEnabled] = useState<boolean>(existingSource?.is_enabled ?? true);
  const [url, setUrl] = useState<string>(existingSource?.url ?? '');
  const [authMethod, setAuthMethod] = useState<AuthMethod>(existingSource?.auth_method ?? 'none');
  const [credential, setCredential] = useState<string>('');
  const [headerName, setHeaderName] = useState<string>(existingSource?.header_name ?? '');
  const [queryParam, setQueryParam] = useState<string>(existingSource?.query_param ?? '');
  // TTL stored in minutes in the UI; default 5 min = 300 s
  const [ttlMinutes, setTtlMinutes] = useState<number>(
    existingSource ? Math.round(existingSource.ttl_seconds / 60) : 5
  );

  // ── UI state ──────────────────────────────────────────────────────────────
  const [urlError, setUrlError] = useState<string>('');
  const [ttlError, setTtlError] = useState<string>('');
  const [credentialError, setCredentialError] = useState<string>('');
  const [serverError, setServerError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Track whether the credential input is rendered and accessible
  const credentialRef = useRef<HTMLInputElement | null>(null);
  // Track the previous auth method so we can detect when credential field just appeared
  const prevAuthMethod = useRef<AuthMethod>(authMethod);

  // Sync form state when existingSource changes (e.g. after a successful save returns
  // the server-persisted record, or when the parent swaps which source is being edited).
  useEffect(() => {
    if (existingSource) {
      setIsEnabled(existingSource.is_enabled);
      setUrl(existingSource.url);
      setAuthMethod(existingSource.auth_method);
      setHeaderName(existingSource.header_name ?? '');
      setQueryParam(existingSource.query_param ?? '');
      setTtlMinutes(Math.round(existingSource.ttl_seconds / 60));
      // Never pre-fill the credential — the server never sends it
      setCredential('');
      // Clear any stale errors that belong to the previous state
      setUrlError('');
      setTtlError('');
      setCredentialError('');
      setServerError('');
    }
  }, [existingSource?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When auth method changes away from 'none', clear any stale credential errors
  useEffect(() => {
    if (prevAuthMethod.current === 'none' && authMethod !== 'none') {
      setCredentialError('');
    }
    prevAuthMethod.current = authMethod;
  }, [authMethod]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Enforce HTTPS prefix client-side. */
  function handleUrlChange(value: string) {
    setUrl(value);
    if (value.trim() && !value.trim().startsWith('https://')) {
      setUrlError('URL must start with https://');
    } else {
      setUrlError('');
    }
  }

  function handleTtlChange(raw: string) {
    const parsed = parseInt(raw, 10);
    setTtlMinutes(isNaN(parsed) ? 0 : parsed);
    if (isNaN(parsed) || parsed < 1 || parsed > 1440) {
      setTtlError('TTL must be between 1 and 1440 minutes');
    } else {
      setTtlError('');
    }
  }

  /** Returns true if the credential input is currently rendered in the DOM and accessible. */
  function isCredentialFieldRendered(): boolean {
    return credentialRef.current !== null;
  }

  function validate(): boolean {
    let valid = true;

    // URL validation
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setUrlError('URL is required');
      valid = false;
    } else if (!trimmedUrl.startsWith('https://')) {
      setUrlError('URL must start with https://');
      valid = false;
    }

    // TTL validation
    if (!ttlMinutes || ttlMinutes < 1 || ttlMinutes > 1440) {
      setTtlError('TTL must be between 1 and 1440 minutes');
      valid = false;
    }

    // Credential validation: required when auth method !== 'none'
    if (authMethod !== 'none') {
      if (!isCredentialFieldRendered()) {
        // Field not yet in the DOM — block save
        setCredentialError('Please enter the credential before saving');
        valid = false;
      } else if (!credential.trim() && !existingSource) {
        // New source: credential required
        setCredentialError('Credential is required for the selected auth method');
        valid = false;
      }
    }

    return valid;
  }

  async function handleSave() {
    setServerError('');
    setCredentialError('');
    if (!validate()) return;

    const body: Record<string, unknown> = {
      section_key: sectionKey,
      url: url.trim(),
      auth_method: authMethod,
      ttl_seconds: ttlMinutes * 60,
      is_enabled: isEnabled,
    };

    // Only include credential if user has typed one
    if (authMethod !== 'none' && credential.trim()) {
      body.credential = credential.trim();
    }

    if (authMethod === 'api_key_header' && headerName.trim()) {
      body.header_name = headerName.trim();
    }

    if (authMethod === 'api_key_query' && queryParam.trim()) {
      body.query_param = queryParam.trim();
    }

    setIsSaving(true);
    try {
      const res = await apiFetch(
        existingSource ? `${apiBase}/${existingSource.id}` : apiBase,
        {
          method: existingSource ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (res.status === 422) {
        const json = await res.json().catch(() => ({}));
        setServerError(json.detail || json.error || 'Validation failed');
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setServerError(json.error === 'upgrade_required'
          ? 'External data sources need the Pro plan ($12/month). Upgrade under Business › Subscription.'
          : json.error || `Request failed (${res.status})`);
        return;
      }

      const saved: ExternalDataSource = await res.json();
      // Clear the credential input — server never returns the value anyway
      setCredential('');
      onSaved?.(saved);
    } catch {
      setServerError('Network error — please try again');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleEnabled() {
    if (!existingSource) return;
    setIsTogglingEnabled(true);
    try {
      const res = await apiFetch(`${apiBase}/${existingSource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !isEnabled }),
      });
      if (res.ok) {
        setIsEnabled(prev => !prev);
      }
    } catch {
      // silent — toggle returns to previous state visually
    } finally {
      setIsTogglingEnabled(false);
    }
  }

  async function handleDelete() {
    if (!existingSource) return;
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      const res = await apiFetch(`${apiBase}/${existingSource.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDeleted?.();
      } else {
        const json = await res.json().catch(() => ({}));
        setServerError(json.error || `Delete failed (${res.status})`);
      }
    } catch {
      setServerError('Network error — please try again');
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const needsCredential = authMethod !== 'none';
  const isEditMode = !!existingSource;

  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-card dark:bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30 bg-amber-50/50 dark:bg-amber-950/20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
            External Data Source
          </span>
          <span className="text-[10px] text-muted-foreground">{sectionLabel}</span>
        </div>

        {/* Enable / Disable toggle — only meaningful when source already exists */}
        {isEditMode && (
          <button
            type="button"
            onClick={handleToggleEnabled}
            disabled={isTogglingEnabled}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 disabled:opacity-50 ${
              isEnabled ? 'bg-amber-500' : 'bg-muted'
            }`}
            aria-label={isEnabled ? 'Disable external source' : 'Enable external source'}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                isEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        )}

        {/* Inline toggle for new (unsaved) sources */}
        {!isEditMode && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-[10px] text-muted-foreground">Enable on save</span>
            <button
              type="button"
              onClick={() => setIsEnabled(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${
                isEnabled ? 'bg-amber-500' : 'bg-muted'
              }`}
              aria-label={isEnabled ? 'Will be enabled' : 'Will be disabled'}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  isEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </label>
        )}
      </div>

      {/* Form body */}
      <div className="p-3 space-y-3">

        {/* URL input */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            API URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="https://api.example.com/data"
            className={`w-full text-xs px-2.5 py-2 rounded-xl border bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 ${
              urlError ? 'border-red-400' : 'border-border/60'
            }`}
          />
          {urlError && (
            <p className="text-[10px] text-red-500 mt-0.5">{urlError}</p>
          )}
        </div>

        {/* Auth method */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            Authentication Method
          </label>
          <select
            value={authMethod}
            onChange={e => setAuthMethod(e.target.value as AuthMethod)}
            className="w-full text-xs px-2.5 py-2 rounded-xl border border-border/60 bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            {(Object.keys(AUTH_METHOD_LABELS) as AuthMethod[]).map(method => (
              <option key={method} value={method}>
                {AUTH_METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </div>

        {/* Credential input — rendered only when auth method !== 'none' */}
        {needsCredential && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {authMethod === 'bearer_token' ? 'Bearer Token' : 'API Key'}{' '}
              {isEditMode && (
                <span className="font-normal text-muted-foreground/70">(leave blank to keep existing)</span>
              )}
              {!isEditMode && <span className="text-red-500">*</span>}
            </label>
            <input
              ref={credentialRef}
              type="password"
              value={credential}
              onChange={e => {
                setCredential(e.target.value);
                if (credentialError) setCredentialError('');
              }}
              placeholder={isEditMode ? '••••••••' : 'Enter credential'}
              autoComplete="new-password"
              className={`w-full text-xs px-2.5 py-2 rounded-xl border bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                credentialError ? 'border-red-400' : 'border-border/60'
              }`}
            />
            {credentialError && (
              <p className="text-[10px] text-red-500 mt-0.5">{credentialError}</p>
            )}
          </div>
        )}

        {/* Header name — only for api_key_header */}
        {authMethod === 'api_key_header' && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Header Name
            </label>
            <input
              type="text"
              value={headerName}
              onChange={e => setHeaderName(e.target.value)}
              placeholder="X-API-Key"
              className="w-full text-xs px-2.5 py-2 rounded-xl border border-border/60 bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
        )}

        {/* Query param name — only for api_key_query */}
        {authMethod === 'api_key_query' && (
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Query Parameter Name
            </label>
            <input
              type="text"
              value={queryParam}
              onChange={e => setQueryParam(e.target.value)}
              placeholder="api_key"
              className="w-full text-xs px-2.5 py-2 rounded-xl border border-border/60 bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
        )}

        {/* TTL */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            Cache TTL (minutes)
          </label>
          <input
            type="number"
            value={ttlMinutes}
            min={1}
            max={1440}
            onChange={e => handleTtlChange(e.target.value)}
            className={`w-full text-xs px-2.5 py-2 rounded-xl border bg-card dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400 ${
              ttlError ? 'border-red-400' : 'border-border/60'
            }`}
          />
          {ttlError ? (
            <p className="text-[10px] text-red-500 mt-0.5">{ttlError}</p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              1–1440 minutes · currently {ttlMinutes * 60} seconds
            </p>
          )}
        </div>

        {/* Server-side error */}
        {serverError && (
          <div className="px-2.5 py-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-600">
            {serverError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : isEditMode ? 'Update Source' : 'Save Source'}
          </button>

          {isEditMode && !showDeleteConfirm && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-red-300 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 space-y-2">
            <p className="text-[11px] text-red-700 font-medium">
              Delete this external source? This also removes all field mappings and health records for this section.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:bg-secondary/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
