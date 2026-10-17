'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, EyeOff, Globe } from 'lucide-react';
import client from '@/api/client';
import { entities } from '@/api/entities';
import { parseShowroomSections } from '@/lib/showroomSectionsCodec';
import { getSectionPlanRequirement } from '@/lib/sectionPlanRequirement';
import { getBuilderCategoryQuery } from '@/lib/showroomCategoryMapping';

interface Site { id: string; title?: string; status?: string; business_id?: string | null; sections?: unknown; expires_at?: string | null; updated_at?: string }
interface Subscription { tier?: string; status?: string; current_period_end?: string | null }

export type WebsiteStatus =
  | { kind: 'live' }
  | { kind: 'no_site' }
  | { kind: 'draft'; site: Site; paid: boolean; requiredTier: string; requiredLabel: string; requiredPrice: number }
  | { kind: 'hidden'; site: Site; endedOn: string | null };

/**
 * Why the owner's business is or isn't visible to customers and in feeds.
 * A website shows in feeds only when it is published and the business has a
 * paid (or free trial) period running (paid publishing, decision §4).
 */
export function websiteStatus(sites: Site[], businessId: string, sub: Subscription | null, now = Date.now()): WebsiteStatus {
  const mine = sites.filter((s) => String(s.business_id ?? '') === businessId);
  const byRecent = (a: Site, b: Site) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''));
  const end = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const paid = Boolean(sub && sub.tier && sub.tier !== 'freemium' && end && end > now);
  const published = mine.filter((s) => s.status === 'published').sort(byRecent)[0];
  if (published) return paid ? { kind: 'live' } : { kind: 'hidden', site: published, endedOn: sub?.current_period_end ?? null };
  const draft = mine.filter((s) => s.status === 'draft' && (!s.expires_at || new Date(s.expires_at).getTime() > now)).sort(byRecent)[0];
  if (draft) {
    const need = getSectionPlanRequirement(parseShowroomSections(draft.sections).keys);
    return { kind: 'draft', site: draft, paid, requiredTier: need.tier, requiredLabel: need.label, requiredPrice: need.price };
  }
  return { kind: 'no_site' };
}

const formatDay = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '';

/**
 * Owner-only notice above the business page: "your website is a draft",
 * "hidden because the plan ended" or "no website yet", with the one action
 * that fixes it. Nothing is shown while the website is live.
 */
export default function WebsiteStatusBanner({ businessId, ownerId, businessCategory }: { businessId: string; ownerId: string; businessCategory?: string }) {
  const [status, setStatus] = useState<WebsiteStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      entities.Showroom.filter({ owner_id: ownerId }, '-updated_at', 50).catch(() => null),
      client.get('/api/subscriptions/my', { params: { businessId } }).then((r) => r.data as Subscription).catch(() => null),
    ]).then(([sites, sub]) => {
      if (cancelled || !sites) return; // Unknown: say nothing rather than something wrong.
      setStatus(websiteStatus(sites as unknown as Site[], businessId, sub));
    });
    return () => { cancelled = true; };
  }, [businessId, ownerId]);

  if (!status || status.kind === 'live') return null;

  const planHref = (extra: Record<string, string> = {}) =>
    `/business/subscription?${new URLSearchParams({ businessId, ...extra }).toString()}`;
  const category = businessCategory ? getBuilderCategoryQuery(businessCategory) : '';

  let tone = 'border-amber-300/60 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100';
  let Icon = AlertTriangle;
  let title: string;
  let body: string;
  let action: { href: string; label: string };

  if (status.kind === 'draft') {
    title = `"${status.site.title || 'Your website'}" is a draft: customers can't see it yet`;
    body = status.paid
      ? `Your plan is active. Publish it to put it online and in your followers' and the Business feed.`
      : `Publishing needs the ${status.requiredLabel} plan (${status.requiredPrice.toLocaleString()} ETB/month). Your website goes live and appears in feeds as soon as it is paid.`;
    if (status.site.expires_at) body += ` Unpublished drafts are deleted on ${formatDay(status.site.expires_at)}.`;
    action = status.paid
      ? { href: `/showroom/create?edit=${encodeURIComponent(status.site.id)}`, label: 'Publish' }
      : { href: planHref({ draftId: status.site.id, requiredTier: status.requiredTier }), label: 'Publish' };
  } else if (status.kind === 'hidden') {
    tone = 'border-red-300/60 bg-red-50 text-red-950 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100';
    Icon = EyeOff;
    title = 'Your website is hidden from customers';
    body = `${status.endedOn ? `Your plan ended on ${formatDay(status.endedOn)}. ` : 'There is no active plan. '}Renew to make it visible again and show it in feeds.`;
    action = { href: planHref(), label: 'Renew plan' };
  } else {
    tone = 'border-border bg-secondary/60 text-foreground';
    Icon = Globe;
    title = 'Your business has no website yet';
    body = 'Build one in Showroom Studio. Once it is published it appears in your followers\' and the Business feed.';
    action = { href: category ? `/showroom/create?category=${category}` : '/showroom/create', label: 'Build website' };
  }

  return (
    <div role="status" className={`mb-3 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${tone}`}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs opacity-90">{body}</p>
        <p className="mt-1 text-[11px] opacity-70">Only you see this message.</p>
      </div>
      <Link href={action.href} className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
        {action.label}
      </Link>
    </div>
  );
}

