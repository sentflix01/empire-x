/**
 * The Buy view: it covers the whole screen (rendered into <body>, not the
 * page column), and website items that are not catalogue products are
 * requested, with the seller setting the price.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/api/client', () => ({ default: client }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import PurchaseModal from '@/components/checkout/PurchaseModal';

const seller = { user_id: 'seller-1', business_name: 'Electronics Appliances' };
const accounts = [{ id: 'a1', method: 'mobile_money', provider_name: 'telebirr', account_name: 'Shop', account_number: '0911', instructions: null }];

function fillContact() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Abebe' } });
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+251911223344' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'abebe@example.test' } });
}

describe('PurchaseModal', () => {
  beforeEach(() => { client.get.mockReset(); client.post.mockReset(); document.body.style.overflow = ''; });

  it('opens over the whole screen, outside the page that opened it', async () => {
    client.get.mockResolvedValue({ data: { business: null, payment_accounts: [] } });
    const { container } = render(
      <div style={{ transform: 'scale(1)' }}>
        <PurchaseModal item={{ title: 'Consultation', listed_price: 'Free' }} seller={seller} businessId="biz-1" onClose={() => {}} />
      </div>,
    );
    const dialog = await screen.findByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes on Escape and on a click outside the box', async () => {
    client.get.mockResolvedValue({ data: { business: null, payment_accounts: [] } });
    const onClose = vi.fn();
    render(<PurchaseModal item={{ title: 'Consultation' }} seller={seller} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(await screen.findByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('requests a website item from a business page and links to the request', async () => {
    client.get.mockResolvedValue({ data: { business: { business_name: 'Electronics Appliances' }, payment_accounts: [] } });
    client.post.mockResolvedValue({ data: { access_token: 'tok123', business: null, payment_accounts: accounts } });
    render(<PurchaseModal item={{ title: 'Delivery', listed_price: 'From $3' }} seller={seller} businessId="biz-1" onClose={() => {}} />);

    expect(await screen.findByRole('heading', { name: 'Request to order' })).toBeTruthy();
    expect(screen.getByText(/Listed: From \$3/)).toBeTruthy();
    await waitFor(() => expect(client.get).toHaveBeenCalledWith('/api/direct-orders/checkout-info?business_id=biz-1'));
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(client.post).toHaveBeenCalledWith('/api/direct-orders/requests', expect.objectContaining({
      business_id: 'biz-1', item_title: 'Delivery', quantity: 2, buyer_name: 'Abebe', buyer_phone: '+251911223344', buyer_email: 'abebe@example.test',
    })));
    expect(await screen.findByRole('heading', { name: 'Request sent' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open my request' }).getAttribute('href')).toBe('/order/tok123');
  });

  it('falls back to the seller when the page has no business id', async () => {
    client.get.mockResolvedValue({ data: { business: null, payment_accounts: [] } });
    render(<PurchaseModal item={{ title: 'Consultation' }} seller={seller} onClose={() => {}} />);
    await waitFor(() => expect(client.get).toHaveBeenCalledWith('/api/direct-orders/checkout-info?seller_id=seller-1'));
  });

  it('still buys catalogue products directly', async () => {
    client.get.mockImplementation(async (url: string) => (url.startsWith('/api/products/')
      ? { data: { id: 'prod-1', title: 'Fridge', price: 100, currency: 'ETB', status: 'active' } }
      : { data: { business: null, payment_accounts: accounts } }));
    client.post.mockResolvedValue({ data: { access_token: 'tok9', business: null, payment_accounts: accounts } });
    render(<PurchaseModal item={{ id: 'prod-1', title: 'Fridge', price: 100 }} seller={seller} onClose={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Buy' })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    fillContact();
    fireEvent.click(screen.getByRole('button', { name: /Place order/ }));
    await waitFor(() => expect(client.post).toHaveBeenCalledWith('/api/direct-orders', expect.objectContaining({ product_id: 'prod-1', quantity: 1 })));
  });

  it('shows a linked product as it is now, not the price written on the card', async () => {
    client.get.mockImplementation(async (url: string) => (url.startsWith('/api/products/')
      ? { data: { id: 'prod-2', title: 'Fridge 300L', price: 25000, currency: 'ETB', status: 'active' } }
      : { data: { business: null, payment_accounts: accounts } }));
    render(<PurchaseModal item={{ id: 'prod-2', title: 'Fridge (card)', price: 20000 }} seller={seller} onClose={() => {}} />);
    expect(await screen.findByText('Fridge 300L')).toBeTruthy();
    expect(screen.getByText('25,000 ETB each')).toBeTruthy();
  });

  it('says so when a linked product is no longer for sale', async () => {
    client.get.mockImplementation(async (url: string) => (url.startsWith('/api/products/')
      ? { data: { id: 'prod-3', title: 'Old TV', price: 1, status: 'sold_out' } }
      : { data: { business: null, payment_accounts: accounts } }));
    render(<PurchaseModal item={{ id: 'prod-3', title: 'Old TV' }} seller={seller} onClose={() => {}} />);
    expect(await screen.findByText(/no longer available/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });
});
