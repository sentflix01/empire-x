/**
 * BusinessSpotlight renders the chosen section with the site's own renderer
 * (same size and layout as on the site), plays several as a carousel, and
 * shows the business's real products for catalogue sections.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http, apiFetch: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/feed', useSearchParams: () => new URLSearchParams() }));

import BusinessSpotlight from '@/components/feed/BusinessSpotlight';

const services = { type: 'services', servTitle: 'Our services', services: [{ name: 'Haircut', price: '300 ETB', desc: 'Classic cut' }] };
const gallery = { type: 'gallery', galleryTitle: 'Our work', galleryImages: [{ url: 'https://img.example/1.jpg', caption: 'Fade' }] };
const contact = { type: 'contact', location: 'Bole' };

beforeEach(() => { http.get.mockReset(); });

describe('BusinessSpotlight', () => {
  it('shows the best selling section as the site renders it, not the contact block', () => {
    render(<BusinessSpotlight sections={[contact, services]} themeColor="#2563eb" ownerId="o1" eager />);
    expect(screen.getByText('Our services')).toBeTruthy();
    expect(screen.getByText('Haircut')).toBeTruthy();
    expect(screen.getByLabelText('Spotlight: Services')).toBeTruthy();
  });

  it('renders nothing when the owner turned it off', () => {
    const { container } = render(<BusinessSpotlight sections={[services]} spotlightMode="off" themeColor="#2563eb" ownerId="o1" eager />);
    expect(container.querySelector('section')).toBeNull();
  });

  it('plays chosen sections as a carousel the visitor can move through', () => {
    render(<BusinessSpotlight sections={[gallery, services]} spotlightMode="carousel" spotlightSectionIds={['gallery', 'services']}
      themeColor="#2563eb" ownerId="o1" eager />);
    expect(screen.getByText('Our services')).toBeTruthy(); // services outranks gallery
    fireEvent.click(screen.getByRole('button', { name: 'Next spotlight section' }));
    expect(screen.getByText('Our work')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show Gallery' }).getAttribute('aria-current')).toBe('true');
  });

  it('shows the business products for a catalogue section', async () => {
    http.get.mockResolvedValue({ data: { products: [{ id: 'p1', title: 'Yirgacheffe 1kg', price: 650, currency: 'ETB', status: 'active', images: '[]' }] } });
    render(<BusinessSpotlight sections={[{ type: 'products', title: 'Shop' }, services]} themeColor="#2563eb" ownerId="o1" businessId="b1" eager />);
    await waitFor(() => expect(screen.getByText('Yirgacheffe 1kg')).toBeTruthy());
    expect(http.get).toHaveBeenCalledWith('/api/products', { params: { status: 'active', limit: 4, business_id: 'b1' } });
  });

  it('falls back to the next section when the business has no products', async () => {
    http.get.mockResolvedValue({ data: { products: [] } });
    render(<BusinessSpotlight sections={[{ type: 'products', title: 'Shop' }, services]} themeColor="#2563eb" ownerId="o1" eager />);
    await waitFor(() => expect(screen.getByText('Our services')).toBeTruthy());
  });
});

describe('BusinessSpotlight fallback', () => {
  it('shows the business products when no section has anything to show', async () => {
    http.get.mockResolvedValue({ data: { products: [{ id: 'p9', title: 'Yirgacheffe Coffee 1kg', price: 650, currency: 'ETB', status: 'active', images: '[]' }] } });
    render(<BusinessSpotlight sections={[{ type: 'hero' }, { type: 'items', items: [] }, { type: 'contact' }]} spotlightMode="single" spotlightSectionIds={['hero']}
      themeColor="#2563eb" ownerId="o1" businessId="b1" eager />);
    await waitFor(() => expect(screen.getByText('Yirgacheffe Coffee 1kg')).toBeTruthy());
  });

  it('does not look up products when a section already has content', () => {
    render(<BusinessSpotlight sections={[services]} themeColor="#2563eb" ownerId="o1" eager />);
    expect(http.get).not.toHaveBeenCalled();
  });
});
