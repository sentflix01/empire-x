/**
 * BusinessSpotlight: one fixed-height strip of small cards for the chosen
 * selling section. More cards than fit slide sideways (arrows, dots, swipe);
 * several chosen sections switch with labels in the same frame; a business
 * with nothing to show keeps the same size with its description.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http, apiFetch: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/feed', useSearchParams: () => new URLSearchParams() }));

import BusinessSpotlight, { SPOTLIGHT_HEIGHT } from '@/components/feed/BusinessSpotlight';
import { spotlightTiles, firstImage } from '@/lib/spotlightTiles';

const services = { type: 'services', servTitle: 'Our services', services: [{ name: 'Haircut', price: '300 ETB', desc: 'Classic cut' }] };
const gallery = { type: 'gallery', galleryTitle: 'Our work', galleryImages: [{ url: 'https://img.example/1.jpg', caption: 'Fade' }] };
const about = { type: 'about', aboutTitle: 'Our story', aboutDesc: 'Family barbers since 1998.', aboutImage: 'https://img.example/a.jpg' };
const contact = { type: 'contact', location: 'Bole' };

const heightOf = (el: Element | null) => (el as HTMLElement | null)?.style.height;

beforeEach(() => { http.get.mockReset(); });

describe('BusinessSpotlight', () => {
  it('shows the best selling section as small cards in a fixed-height strip, never the contact block', () => {
    render(<BusinessSpotlight sections={[contact, services]} themeColor="#2563eb" ownerId="o1" eager onBuy={() => {}} />);
    const strip = screen.getByLabelText('Spotlight: Services');
    expect(heightOf(strip)).toBe(`${SPOTLIGHT_HEIGHT}px`);
    expect(within(strip).getByText('Haircut')).toBeTruthy();
    expect(within(strip).getByText('300 ETB')).toBeTruthy();
    expect(within(strip).getByRole('button', { name: 'Order Haircut' })).toBeTruthy();
    expect(screen.queryByText('Bole')).toBeNull();
  });

  it('keeps the same size with the description when the owner turned it off', () => {
    render(<BusinessSpotlight sections={[services]} spotlightMode="off" themeColor="#2563eb" ownerId="o1" eager
      profile={{ business_description: 'Best cuts in Bole.' }} visitHref="/showroom/cuts" />);
    const empty = screen.getByLabelText('About this business');
    expect(heightOf(empty)).toBe(`${SPOTLIGHT_HEIGHT}px`);
    expect(screen.getByText('Best cuts in Bole.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Visit the business/ }).getAttribute('href')).toBe('/showroom/cuts');
    expect(screen.queryByText('Haircut')).toBeNull();
  });

  it('switches between chosen sections with labels inside the same frame', () => {
    render(<BusinessSpotlight sections={[gallery, services]} spotlightMode="carousel" spotlightSectionIds={['gallery', 'services']}
      themeColor="#2563eb" ownerId="o1" eager />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Services', 'Gallery']); // services outranks gallery
    expect(screen.getByText('Haircut')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Gallery' }));
    expect(screen.getByRole('tab', { name: 'Gallery' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByAltText('Fade')).toBeTruthy();
    expect(heightOf(screen.getByLabelText('Spotlight: Gallery'))).toBe(`${SPOTLIGHT_HEIGHT}px`);
  });

  it('shows About as one wide card with its picture and text', () => {
    render(<BusinessSpotlight sections={[about]} themeColor="#2563eb" ownerId="o1" eager />);
    expect(screen.getByText('Our story')).toBeTruthy();
    expect(screen.getByText('Family barbers since 1998.')).toBeTruthy();
  });

  it('shows the business products for a catalogue section, with View for the owner', async () => {
    http.get.mockResolvedValue({ data: { products: [{ id: 'p1', title: 'Yirgacheffe 1kg', price: 650, currency: 'ETB', status: 'active', images: '["https://img.example/c.jpg"]' }] } });
    render(<BusinessSpotlight sections={[{ type: 'products', title: 'Shop' }, services]} themeColor="#2563eb" ownerId="o1" businessId="b1" eager isOwner />);
    await waitFor(() => expect(screen.getByText('Yirgacheffe 1kg')).toBeTruthy());
    expect(screen.getByText('650 ETB')).toBeTruthy();
    expect(http.get).toHaveBeenCalledWith('/api/products', { params: { status: 'active', limit: 12, business_id: 'b1' } });
    expect(screen.queryByRole('button', { name: /Order/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'View Yirgacheffe 1kg' }).getAttribute('href')).toBe('/products/p1');
  });

  it('falls back to the next section when the business has no products', async () => {
    http.get.mockResolvedValue({ data: { products: [] } });
    render(<BusinessSpotlight sections={[{ type: 'products', title: 'Shop' }, services]} themeColor="#2563eb" ownerId="o1" eager />);
    await waitFor(() => expect(screen.getByText('Haircut')).toBeTruthy());
  });

  it('keeps the same height while products load', () => {
    http.get.mockReturnValue(new Promise(() => {}));
    const { container } = render(<BusinessSpotlight sections={[{ type: 'products' }]} themeColor="#2563eb" ownerId="o1" eager />);
    expect(heightOf(container.querySelector('section'))).toBe(`${SPOTLIGHT_HEIGHT}px`);
  });
});

describe('sliding', () => {
  const many = { type: 'services', services: Array.from({ length: 8 }, (_, i) => ({ name: `Service ${i + 1}`, price: `${(i + 1) * 100} ETB` })) };
  const restore: Array<() => void> = [];
  const fake = (prop: 'clientWidth' | 'scrollWidth', value: number) => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get() { return this.tagName === 'UL' ? value : 0; } });
    restore.push(() => { if (original) Object.defineProperty(HTMLElement.prototype, prop, original); });
  };
  afterEach(() => { while (restore.length) restore.pop()!(); });

  it('pages with arrows and dots when there are more cards than fit', () => {
    fake('clientWidth', 300);
    fake('scrollWidth', 1100); // 4 pages
    const scrollTo = vi.fn();
    HTMLElement.prototype.scrollTo = scrollTo as unknown as typeof HTMLElement.prototype.scrollTo;
    render(<BusinessSpotlight sections={[many]} themeColor="#2563eb" ownerId="o1" eager />);
    expect(screen.queryByRole('button', { name: 'Previous Services' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Page \d of 4$/ })).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'More Services' }));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: expect.any(String) });
    expect(screen.getByRole('button', { name: 'Page 2 of 4' }).getAttribute('aria-current')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Page 4 of 4' }));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 900, behavior: expect.any(String) });
    expect(screen.queryByRole('button', { name: 'More Services' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Previous Services' })).toBeTruthy();
  });

  it('shows no arrows or dots when everything fits', () => {
    fake('clientWidth', 300);
    fake('scrollWidth', 300);
    render(<BusinessSpotlight sections={[services]} themeColor="#2563eb" ownerId="o1" eager />);
    expect(screen.queryByRole('button', { name: /More|Previous|Page/ })).toBeNull();
  });
});

describe('spotlightTiles', () => {
  it('turns every selling section type into cards', () => {
    expect(spotlightTiles({ type: 'menu', dishes: [{ name: 'Tibs', price: '450', photo: 'https://img.example/t.jpg' }] })[0])
      .toMatchObject({ kind: 'item', title: 'Tibs', price: '450', image: 'https://img.example/t.jpg', action: 'Order' });
    expect(spotlightTiles({ type: 'pricing', plans: [{ name: 'Gold', price: '900', period: '/mo', features: 'A, B' }] })[0])
      .toMatchObject({ title: 'Gold', price: '900/mo', subtitle: 'A · B' });
    expect(spotlightTiles({ type: 'event_schedule', events: [{ title: 'Tasting', date: 'Sat 2 Nov', price: '200' }] })[0])
      .toMatchObject({ title: 'Tasting', subtitle: 'Sat 2 Nov', action: 'Book' });
    expect(spotlightTiles({ type: 'offer', offerTitle: '20% off', offerDesc: 'This week' })[0]).toMatchObject({ kind: 'wide', title: '20% off' });
    expect(spotlightTiles({ type: 'portfolio', portfolio: [{ title: 'Logo', image: 'https://img.example/l.jpg' }] })[0]).toMatchObject({ kind: 'picture' });
    expect(spotlightTiles({ type: 'services', services: [{ name: 'Audit', price: 'Get Quote' }] })[0]).toMatchObject({ action: 'Get quote', buy: null });
    expect(spotlightTiles({ type: 'hero' })).toEqual([]);
  });

  it('reads a product picture from any stored shape', () => {
    expect(firstImage('["https://a/1.jpg","https://a/2.jpg"]')).toBe('https://a/1.jpg');
    expect(firstImage(['https://a/3.jpg'])).toBe('https://a/3.jpg');
    expect(firstImage('https://a/4.jpg')).toBe('https://a/4.jpg');
    expect(firstImage('')).toBeUndefined();
  });
});
