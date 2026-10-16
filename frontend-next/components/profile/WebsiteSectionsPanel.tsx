'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Save, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { entities } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import BuilderForm from '@/components/showroom/BuilderForm';
import BrandLogo from '@/components/brand/BrandLogo';
import { parseShowroomSections, serializeShowroomSections } from '@/lib/showroomSectionsCodec';
import { getBuilderCategoryQuery } from '@/lib/showroomCategoryMapping';

interface Site {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  sections?: unknown;
  business_id?: string | null;
  updated_at?: string;
}

interface Props {
  /** The profile's business category, used to start a new site in Studio. */
  businessCategory?: string;
}

const studioCreateHref = (category?: string) => {
  const q = category ? getBuilderCategoryQuery(category) : '';
  return q ? `/showroom/create?category=${q}` : '/showroom/create';
};

/**
 * "Your website" on the business profile editor. Once a site is published,
 * every section the owner chose is edited and saved here, straight to that
 * published site. Adding, removing or reordering sections stays in Studio.
 */
export default function WebsiteSectionsPanel({ businessCategory }: Props) {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [keys, setKeys] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [savedFields, setSavedFields] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    // Promise.resolve keeps a synchronous failure from breaking the whole profile editor.
    Promise.resolve().then(() => entities.Showroom.filter({ owner_id: user.id }, '-updated_at', 50))
      .then((rows) => { if (!cancelled) setSites(rows as unknown as Site[]); })
      .catch(() => { if (!cancelled) { setLoadError(true); setSites([]); } });
    return () => { cancelled = true; };
  }, [user?.id]);

  const published = useMemo(() => (sites ?? []).filter((s) => s.status === 'published'), [sites]);
  const draft = useMemo(() => (sites ?? []).find((s) => s.status === 'draft'), [sites]);
  const site = published.find((s) => s.id === siteId) ?? published[0];

  // Load the chosen site's sections into the editor.
  useEffect(() => {
    if (!site) return;
    const parsed = parseShowroomSections(site.sections);
    setSiteId(site.id);
    setKeys(parsed.keys);
    setFields(parsed.fields);
    setSavedFields(parsed.fields);
  }, [site]);

  const dirty = useMemo(() => JSON.stringify(fields) !== JSON.stringify(savedFields), [fields, savedFields]);
  const onChange = useCallback((key: string, value: unknown) => setFields((prev) => ({ ...prev, [key]: value })), []);

  const save = async () => {
    if (!site || !dirty || saving) return;
    setSaving(true);
    try {
      const sections = JSON.stringify(serializeShowroomSections(keys, fields));
      // The hero's name and tagline are also the site's title and description,
      // as in Studio. The slug is left alone so shared links keep working.
      const changes: Record<string, unknown> = { sections };
      const title = typeof fields.title === 'string' ? fields.title.trim() : '';
      if (title && fields.title !== savedFields.title) changes.title = title;
      if (fields.subtitle !== savedFields.subtitle) changes.description = typeof fields.subtitle === 'string' ? fields.subtitle : '';
      const updated = await entities.Showroom.update(site.id, changes) as unknown as Site | null;
      setSites((prev) => (prev ?? []).map((s) => (s.id === site.id ? { ...s, ...(updated ?? {}), sections } : s)));
      setSavedFields(fields);
      toast.success('Website updated');
    } catch (err) {
      // The API client rejects with the response body, e.g. { error, message } for a plan limit (402).
      const body = err as { message?: string; error?: string } | null;
      toast.error(body?.message || body?.error || 'Could not update your website. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user?.id || sites === null) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your website…
      </div>
    );
  }

  if (!site) {
    return (
      <div className="rounded-xl border border-border bg-secondary/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <BrandLogo className="h-4 w-4" /> {draft ? 'Your website is a draft' : 'No published website yet'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {loadError
                ? 'We could not load your website. Refresh to try again.'
                : draft
                  ? 'Finish and publish it in Showroom Studio. Once it is live, you can edit its sections here.'
                  : 'Build your website in Showroom Studio. Once it is published, you can edit its sections here.'}
            </p>
          </div>
          <Link
            href={draft ? `/showroom/create?edit=${draft.id}` : studioCreateHref(businessCategory)}
            className="inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {draft ? 'Continue in Studio' : 'Build your website'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{site.title || 'Your website'}</p>
          <p className="text-xs text-muted-foreground">
            <span className="mr-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Published</span>
            {keys.length} section{keys.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {published.length > 1 && (
            <label className="text-xs text-muted-foreground">
              <span className="sr-only">Website to edit</span>
              <select
                value={site.id}
                onChange={(e) => {
                  if (dirty && !window.confirm('Discard your unsaved changes?')) return;
                  setSiteId(e.target.value);
                }}
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
              >
                {published.map((s) => <option key={s.id} value={s.id}>{s.title || 'Untitled website'}</option>)}
              </select>
            </label>
          )}
          <Link href={`/showrooms/${site.id}`} className="inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium text-foreground hover:bg-secondary">
            View site <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {keys.length ? (
        <div className="max-h-[32rem] overflow-y-auto rounded-xl border border-border/60 p-2">
          <BuilderForm activeSections={keys} formData={fields as Record<string, any>} onChange={onChange} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">This website has no sections yet. Add them in Showroom Studio.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/showroom/create?edit=${site.id}`} className="text-xs font-medium text-primary hover:underline">
          Add, remove or reorder sections in Studio
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFields(savedFields)}
            disabled={!dirty || saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Discard
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
            Save website
          </button>
        </div>
      </div>
    </div>
  );
}
