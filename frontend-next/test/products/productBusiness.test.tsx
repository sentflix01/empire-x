/**
 * Listing a product attaches it to the seller's business, so buyers see its
 * payment details (audit FUNC-03): a seller with several businesses picks
 * one, and the seller is warned when buyers cannot pay yet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'seller-1' } }) }));
const products = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), get: vi.fn() }));
const businesses = vi.hoisted(() => ({ filter: vi.fn() }));
vi.mock('@/api/entities', () => ({ entities: { Product: products, Business: businesses } }));
const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({}), useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: nav.push, back: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/components/ui/ImageUpload', () => ({ default: () => <div /> }));
vi.mock('@/components/products/BarcodeScanner', () => ({ default: () => null }));
// Radix Select portals can't be driven in jsdom: a native select stands in.
vi.mock('@/components/ui/select', () => {
  const Ctx = React.createContext<{ value: string; onValueChange?: (v: string) => void }>({ value: '' });
  return {
    Select: ({ value, onValueChange, children }: { value: string; onValueChange?: (v: string) => void; children: React.ReactNode }) =>
      <Ctx.Provider value={{ value, onValueChange }}>{children}</Ctx.Provider>,
    SelectTrigger: ({ id }: { id?: string }) => {
      const ctx = React.useContext(Ctx);
      return id ? <select id={id} value={ctx.value} onChange={(e) => ctx.onValueChange?.(e.target.value)}><option value="">Choose</option><option value="biz-a">Shop A</option><option value="biz-b">Shop B</option></select> : null;
    },
    SelectValue: () => null, SelectContent: () => null, SelectItem: () => null,
  };
});

import ProductCreate from '@/views/ProductCreate';

function fillRequired() {
  fireEvent.change(screen.getByPlaceholderText('Product name'), { target: { value: 'Yirgacheffe 1kg' } });
  const [price] = screen.getAllByRole('spinbutton');
  fireEvent.change(price, { target: { value: '650' } });
}

beforeEach(() => {
  for (const fn of [...Object.values(products), ...Object.values(toast), businesses.filter, nav.push]) fn.mockReset();
});

describe('listing a product for a business', () => {
  it('sends the seller\'s only business and confirms when buyers can pay', async () => {
    businesses.filter.mockResolvedValue([{ id: 'biz-a', business_name: 'Shop A' }]);
    products.create.mockResolvedValue({ id: 'p1', business_id: 'biz-a', payment_ready: true });
    render(<ProductCreate />);
    await waitFor(() => expect(businesses.filter).toHaveBeenCalledWith({ owner_id: 'seller-1' }, 'created_at', 50));
    expect(screen.queryByLabelText('Sold by')).toBeNull();

    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Publish Product' }));
    await waitFor(() => expect(products.create).toHaveBeenCalledWith(expect.objectContaining({ business_id: 'biz-a' })));
    expect(toast.success).toHaveBeenCalledWith('Product listed');
  });

  it('asks a seller with several businesses to choose one', async () => {
    businesses.filter.mockResolvedValue([{ id: 'biz-a', business_name: 'Shop A' }, { id: 'biz-b', business_name: 'Shop B' }]);
    products.create.mockResolvedValue({ id: 'p2', business_id: 'biz-b', payment_ready: true });
    render(<ProductCreate />);
    const picker = await screen.findByLabelText('Sold by');

    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Publish Product' }));
    expect(toast.error).toHaveBeenCalledWith('Choose which business sells this product.');
    expect(products.create).not.toHaveBeenCalled();

    fireEvent.change(picker, { target: { value: 'biz-b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish Product' }));
    await waitFor(() => expect(products.create).toHaveBeenCalledWith(expect.objectContaining({ business_id: 'biz-b' })));
  });

  it('warns the seller when buyers cannot pay yet and links to payment methods', async () => {
    businesses.filter.mockResolvedValue([{ id: 'biz-a', business_name: 'Shop A' }]);
    products.create.mockResolvedValue({ id: 'p3', business_id: 'biz-a', selling_business_id: 'biz-a', payment_ready: false, checkout_blocker: 'no_payment_method' });
    render(<ProductCreate />);
    await waitFor(() => expect(businesses.filter).toHaveBeenCalled());

    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Publish Product' }));
    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    const [title, options] = toast.warning.mock.calls[0];
    expect(title).toBe("Product listed, but buyers can't order it yet");
    expect(options.action.label).toBe('Add payment method');
    options.action.onClick();
    expect(nav.push).toHaveBeenCalledWith('/business/edit?id=biz-a');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('sends a seller without a paid plan to the plans page', async () => {
    businesses.filter.mockResolvedValue([{ id: 'biz-a', business_name: 'Shop A' }]);
    products.create.mockResolvedValue({ id: 'p4', business_id: 'biz-a', selling_business_id: 'biz-a', payment_ready: false, checkout_blocker: 'no_plan' });
    render(<ProductCreate />);
    await waitFor(() => expect(businesses.filter).toHaveBeenCalled());

    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Publish Product' }));
    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    const [, options] = toast.warning.mock.calls[0];
    expect(options.description).toMatch(/needs an active plan/);
    options.action.onClick();
    expect(nav.push).toHaveBeenCalledWith('/business/subscription');
  });
});
