/**
 * The business profile page shows the owner's published Studio site for that
 * business, and falls back to the category template's sample sections only
 * when there is no published site.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { productFilter, orderFilter, showroomFilter, purchaseProps } = vi.hoisted(() => ({
  productFilter: vi.fn(),
  orderFilter: vi.fn(),
  showroomFilter: vi.fn(),
  purchaseProps: [] as Record<string, unknown>[],
}));

vi.mock('@/api/entities', () => ({
  entities: {
    Product: { filter: productFilter },
    Order: { filter: orderFilter },
    Showroom: { filter: showroomFilter },
  },
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/messaging', () => ({ findOrCreateConversation: vi.fn() }));
vi.mock('@/components/checkout/PurchaseModal', () => ({
  default: (props: Record<string, unknown>) => {
    purchaseProps.push(props);
    return <div data-testid="purchase-modal" />;
  },
}));

import BusinessProfile, { pickPublishedSite } from '@/components/profile/BusinessProfile';

const templateSections = JSON.stringify([
  { type: 'services', title: 'Template Services', items: [{ name: 'Electronics Appliances Standard', price: 'From $16' }] },
]);
const siteSections = JSON.stringify([
  { type: 'services', servTitle: 'Studio Services', services: [{ name: 'Phone Repair', desc: 'Same day', price: '500 ETB' }] },
]);

const profile = { user_id: 'owner-1', display_name: 'Abebe', business_sections: templateSections };
const business = { id: 'biz-1', business_name: 'Abebe Electronics', owner_id: 'owner-1' };
const site = {
  id: 'site-2', owner_id: 'owner-1', business_id: 'biz-1', status: 'published', slug: 'abebe-electronics',
  title: 'Abebe Electronics', sections: siteSections, updated_at: '2026-10-16T10:00:00Z',
};

beforeEach(() => {
  productFilter.mockReset().mockResolvedValue([]);
  orderFilter.mockReset().mockResolvedValue([]);
  showroomFilter.mockReset().mockResolvedValue([]);
  purchaseProps.length = 0;
});

describe('pickPublishedSite', () => {
  it('picks the most recently updated published site of that business', () => {
    const sites = [
      { id: 'a', business_id: 'biz-1', status: 'published', updated_at: '2026-10-01T00:00:00Z' },
      { id: 'b', business_id: 'biz-1', status: 'published', updated_at: '2026-10-10T00:00:00Z' },
      { id: 'c', business_id: 'biz-2', status: 'published', updated_at: '2026-10-15T00:00:00Z' },
      { id: 'd', business_id: 'biz-1', status: 'draft', updated_at: '2026-10-16T00:00:00Z' },
    ];
    expect(pickPublishedSite(sites, 'biz-1')?.id).toBe('b');
    expect(pickPublishedSite(sites, 'biz-3')).toBeNull();
    expect(pickPublishedSite(sites, undefined)).toBeNull();
  });
});

describe('BusinessProfile', () => {
  it("shows the business's published Studio site and buys through it", async () => {
    showroomFilter.mockResolvedValue([
      { ...site, id: 'site-1', business_id: 'biz-other', updated_at: '2026-10-17T00:00:00Z' },
      site,
    ]);
    render(<BusinessProfile profile={profile} business={business} user={null} isOwner={false} />);

    expect(await screen.findByText('Phone Repair')).toBeInTheDocument();
    expect(screen.queryByText('Electronics Appliances Standard')).not.toBeInTheDocument();
    expect(showroomFilter).toHaveBeenCalledWith({ owner_id: 'owner-1', status: 'published' }, '-updated_at', 50);

    fireEvent.click(screen.getAllByRole('button', { name: '500 ETB' })[0]);
    await waitFor(() => expect(screen.getByTestId('purchase-modal')).toBeInTheDocument());
    const props = purchaseProps.at(-1)!;
    expect(props.showroomId).toBe('site-2');
    expect(props.businessId).toBe('biz-1');
    expect((props.seller as { user_id: string }).user_id).toBe('owner-1');
    expect((props.item as { title: string }).title).toBe('Phone Repair');
  });

  it('links the owner to edit the Studio site', async () => {
    showroomFilter.mockResolvedValue([site]);
    render(<BusinessProfile profile={profile} business={business} user={{ id: 'owner-1' }} isOwner />);

    await screen.findByText('Phone Repair');
    expect(screen.getByRole('link', { name: /Edit/ }).getAttribute('href')).toBe('/showroom/create?edit=site-2');
    expect(screen.getByRole('link', { name: /View site/ }).getAttribute('href')).toBe('/showroom/abebe-electronics');
  });

  it('falls back to the template sections when there is no published site', async () => {
    showroomFilter.mockResolvedValue([{ ...site, status: 'draft' }]);
    render(<BusinessProfile profile={profile} business={business} user={null} isOwner={false} />);

    expect(await screen.findByText('Electronics Appliances Standard')).toBeInTheDocument();
    expect(screen.queryByText('Phone Repair')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'From $16' })[0]);
    await waitFor(() => expect(screen.getByTestId('purchase-modal')).toBeInTheDocument());
    const props = purchaseProps.at(-1)!;
    expect(props.showroomId).toBeUndefined();
    expect(props.businessId).toBe('biz-1');
  });

  it('falls back to the template sections when the site lookup fails', async () => {
    showroomFilter.mockRejectedValue(new Error('423'));
    render(<BusinessProfile profile={profile} business={business} user={null} isOwner={false} />);
    expect(await screen.findByText('Electronics Appliances Standard')).toBeInTheDocument();
  });
});
