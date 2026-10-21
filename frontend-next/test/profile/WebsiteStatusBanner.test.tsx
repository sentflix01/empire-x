/**
 * The owner's "why isn't my business visible?" banner: draft (pay to publish),
 * hidden (plan ended), no website, or nothing when the site is live.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const api = vi.hoisted(() => ({ showrooms: vi.fn(), get: vi.fn() }));
vi.mock('@/api/entities', () => ({ entities: { Showroom: { filter: api.showrooms } } }));
vi.mock('@/api/client', () => ({ default: { get: api.get } }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import WebsiteStatusBanner, { websiteStatus } from '@/components/profile/WebsiteStatusBanner';

const BIZ = 'biz-1';
const now = new Date('2026-10-17T12:00:00Z').getTime();
// expires_at is intentionally set far in the future so the draft is never
// considered expired regardless of when the test suite runs.
const later = '2030-12-31T23:59:59Z';
const draft = { id: 'site-1', title: 'Accounting Tax', status: 'draft', business_id: BIZ, sections: JSON.stringify([{ type: 'hero' }, { type: 'contact' }]), expires_at: later };
const paid = { tier: 'normal', status: 'active', current_period_end: '2026-11-17T00:00:00Z' };

describe('websiteStatus', () => {
  it('is live when a published site has a paid period', () => {
    expect(websiteStatus([{ ...draft, status: 'published' }], BIZ, paid, now)).toEqual({ kind: 'live' });
  });
  it('is hidden when the published site has no paid period', () => {
    expect(websiteStatus([{ ...draft, status: 'published' }], BIZ, { tier: 'normal', current_period_end: '2026-10-01T00:00:00Z' }, now)).toMatchObject({ kind: 'hidden', endedOn: '2026-10-01T00:00:00Z' });
  });
  it('is a draft with the plan its sections need', () => {
    expect(websiteStatus([draft], BIZ, null, now)).toMatchObject({ kind: 'draft', paid: false, requiredTier: 'normal', requiredPrice: 100 });
  });
  it('ignores other businesses and expired drafts', () => {
    expect(websiteStatus([{ ...draft, business_id: 'other' }, { ...draft, id: 'old', expires_at: '2026-10-01T00:00:00Z' }], BIZ, null, now)).toEqual({ kind: 'no_site' });
  });
});

describe('WebsiteStatusBanner', () => {
  beforeEach(() => { api.showrooms.mockReset(); api.get.mockReset(); });

  it('sends an unpaid draft to the plan page, which publishes it after payment', async () => {
    api.showrooms.mockResolvedValue([draft]);
    api.get.mockResolvedValue({ data: { tier: 'freemium', status: 'unsubscribed', current_period_end: null } });
    render(<WebsiteStatusBanner businessId={BIZ} ownerId="owner-1" />);
    expect(await screen.findByText(/is a draft: customers can't see it yet/)).toBeTruthy();
    expect(screen.getByText(/needs the Normal plan \(100 ETB\/month\)/)).toBeTruthy();
    const href = screen.getByRole('link', { name: 'Publish' }).getAttribute('href')!;
    expect(href).toContain('/business/subscription?');
    expect(href).toContain('draftId=site-1');
    expect(href).toContain('requiredTier=normal');
  });

  it('sends a draft with an active plan straight to Studio to publish', async () => {
    api.showrooms.mockResolvedValue([draft]);
    api.get.mockResolvedValue({ data: paid });
    render(<WebsiteStatusBanner businessId={BIZ} ownerId="owner-1" />);
    expect((await screen.findByRole('link', { name: 'Publish' })).getAttribute('href')).toBe('/showroom/create?edit=site-1');
  });

  it('offers Renew when the site is hidden', async () => {
    api.showrooms.mockResolvedValue([{ ...draft, status: 'published' }]);
    api.get.mockResolvedValue({ data: { tier: 'normal', current_period_end: '2020-01-01T00:00:00Z' } });
    render(<WebsiteStatusBanner businessId={BIZ} ownerId="owner-1" />);
    expect(await screen.findByText('Your website is hidden from customers')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Renew plan' }).getAttribute('href')).toBe(`/business/subscription?businessId=${BIZ}`);
  });

  it('shows nothing while the site is live, or when the status is unknown', async () => {
    api.showrooms.mockResolvedValue([{ ...draft, status: 'published' }]);
    api.get.mockResolvedValue({ data: { tier: 'normal', current_period_end: '2999-01-01T00:00:00Z' } });
    const { container, unmount } = render(<WebsiteStatusBanner businessId={BIZ} ownerId="owner-1" />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(container.textContent).toBe('');
    unmount();
    api.showrooms.mockRejectedValue(new Error('down'));
    const second = render(<WebsiteStatusBanner businessId={BIZ} ownerId="owner-1" />);
    await waitFor(() => expect(api.showrooms).toHaveBeenCalledTimes(2));
    expect(second.container.textContent).toBe('');
  });
});
