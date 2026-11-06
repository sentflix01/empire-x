/**
 * lib/sandboxPage.ts — safe values for the fake-Chapa sandbox pages
 * (development only; the pages answer 404 in production). Audit F-020: a
 * return_url from the query string was decoded into an inline script.
 */
import { getPrimaryFrontendUrl } from './frontendUrl';

/** The URL when it is on our frontend (exactly, or under it); otherwise the frontend root. */
export function safeFrontendReturn(raw: unknown): string {
  const frontend = getPrimaryFrontendUrl();
  let value = '';
  try { value = typeof raw === 'string' ? decodeURIComponent(raw) : ''; } catch { value = ''; }
  return value === frontend || value.startsWith(`${frontend}/`) ? value : frontend;
}

/** The URL when it starts with `prefix`; otherwise ''. */
export function urlUnder(raw: unknown, prefix: string): string {
  let value = '';
  try { value = typeof raw === 'string' ? decodeURIComponent(raw) : ''; } catch { value = ''; }
  return value.startsWith(prefix) ? value : '';
}

/** A JavaScript string literal that cannot close the <script> element. */
export function scriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
