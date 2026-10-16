/**
 * Who may view a business and its site, products and announcement posts.
 *
 * - A business whose subscription lapsed is hidden from everyone but its owner
 *   (businessSubscriptionPolicy.hiddenFromPublic).
 * - A 'private' business is visible to signed-in users only. Guests get
 *   401 SIGN_IN_REQUIRED for direct reads and never see it in lists, feeds,
 *   search, the sitemap or link previews.
 * - Personal content (posts other than business announcements, stories and
 *   personal profiles) needs sign-in.
 * See docs/decisions/platform-model-decisions.md §2 and §7.
 */
import type { Request, Response, NextFunction } from 'express';
import type { BusinessSubscriptionAccess } from './businessSubscriptionPolicy';

export type BusinessVisibility = 'public' | 'private';
export const BUSINESS_VISIBILITIES: readonly BusinessVisibility[] = ['public', 'private'];

export type ViewGate = 'ok' | 'not_found' | 'sign_in';

export const SIGN_IN_REQUIRED = 'SIGN_IN_REQUIRED';

export function isBusinessVisibility(value: unknown): value is BusinessVisibility {
  return typeof value === 'string' && (BUSINESS_VISIBILITIES as readonly string[]).includes(value);
}

/** Decides what a viewer may see of a business. Owners and admins always see it. */
export function businessViewGate(access: BusinessSubscriptionAccess | null, req: Request): ViewGate {
  const viewer = req.user;
  if (access && viewer && (access.ownerId === viewer.id || viewer.role === 'admin')) return 'ok';
  if (!access || access.hiddenFromPublic) return 'not_found';
  if (access.visibility === 'private' && !req.user) return 'sign_in';
  return 'ok';
}

/** Sends the response for a blocked gate. Returns true when the caller must stop. */
export function rejectViewGate(res: Response, gate: ViewGate, notFoundMessage = 'Not found'): boolean {
  if (gate === 'ok') return false;
  if (gate === 'sign_in') {
    res.status(401).json({ error: 'Sign in to view this business.', code: SIGN_IN_REQUIRED });
  } else {
    res.status(404).json({ error: notFoundMessage });
  }
  return true;
}

/**
 * SQL that is true unless the business at `businessIdExpr` is private.
 * Rows without a business stay visible. Use it for anonymous list queries.
 */
export function notPrivateBusinessSql(businessIdExpr: string): string {
  return `NOT EXISTS (SELECT 1 FROM businesses vis_b WHERE vis_b.id = ${businessIdExpr} AND vis_b.visibility = 'private')`;
}

/** SQL for a product (alias `p`) whose business is not private, directly or through its site. */
export function productNotPrivateSql(alias = 'p'): string {
  return `${notPrivateBusinessSql(`${alias}.business_id`)} AND ${notPrivateBusinessSql(
    `(SELECT vis_s.business_id FROM showrooms vis_s WHERE vis_s.id = ${alias}.showroom_id)`,
  )}`;
}

/**
 * SQL that is true for a post (alias) unless it announces a site that is no
 * longer live: unpublished, expired, or hidden because its subscription lapsed.
 */
export function announcementLiveSql(alias = 'p'): string {
  return `(${alias}.showroom_id IS NULL OR EXISTS (
    SELECT 1 FROM showrooms ann_s
     WHERE ann_s.id = ${alias}.showroom_id AND ann_s.status = 'published'
       AND (ann_s.expires_at IS NULL OR ann_s.expires_at > NOW())
       AND (ann_s.business_id IS NULL OR EXISTS (
         SELECT 1 FROM business_subscriptions ann_sub
          WHERE ann_sub.business_id = ann_s.business_id AND ann_sub.tier <> 'freemium'
            AND ann_sub.current_period_end > NOW() - INTERVAL '24 hours'))))`;
}

/** SQL for posts a guest may see: announcements of live sites of public businesses. */
export function guestPostSql(alias = 'p'): string {
  return `(${alias}.showroom_id IS NOT NULL AND ${announcementLiveSql(alias)} AND ${notPrivateBusinessSql(
    `(SELECT g_s.business_id FROM showrooms g_s WHERE g_s.id = ${alias}.showroom_id)`,
  )})`;
}

/** Rejects anonymous requests for personal content. */
export function requireSignInForPersonal(req: Request, res: Response, next: NextFunction): void {
  if (req.user) { next(); return; }
  res.status(401).json({ error: 'Sign in to see personal posts and profiles.', code: SIGN_IN_REQUIRED });
}
