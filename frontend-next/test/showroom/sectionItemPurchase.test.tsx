/** Website cards: linked cards buy the product, unlinked priced cards are requested. */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { sectionItemBuyPayload } from '@/lib/sectionItemPurchase';

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
import SectionRenderer from '@/components/showroom/SectionRenderer';

const PRODUCT = '11111111-2222-4333-8444-555555555555';

describe('sectionItemBuyPayload', () => {
  it('buys the linked product, even when the card shows no price', () => {
    expect(sectionItemBuyPayload({ name: 'Repair', product_id: PRODUCT })).toMatchObject({ id: PRODUCT, title: 'Repair' });
  });
  it('requests an unlinked priced card, keeping the price text', () => {
    expect(sectionItemBuyPayload({ name: 'Delivery', price: 'From $3' })).toMatchObject({ title: 'Delivery', listed_price: 'From $3', price: 3 });
    expect(sectionItemBuyPayload({ name: 'Delivery', price: 'From $3' })).not.toHaveProperty('id');
  });
  it('offers nothing to buy for unpriced, "Get Quote" or malformed links', () => {
    expect(sectionItemBuyPayload({ name: 'Advice' })).toBeNull();
    expect(sectionItemBuyPayload({ name: 'Custom', price: 'Get Quote' })).toBeNull();
    expect(sectionItemBuyPayload({ name: 'X', product_id: 'not-a-uuid' })).toBeNull();
  });
});

describe('SectionRenderer cards', () => {
  it('adds Buy Now to Studio product cards and pricing plans', () => {
    const onBuy = vi.fn();
    render(<>
      <SectionRenderer section={{ type: 'items', items: [{ name: 'Phone', price: '9,000 ETB', product_id: PRODUCT }, { name: 'Case', price: '300' }, { name: 'Sticker' }] }} sectionIndex={0} themeColor="#000" onBuy={onBuy} />
      <SectionRenderer section={{ type: 'pricing', plans: [{ name: 'Basic', price: '49', period: '/mo' }] }} sectionIndex={1} themeColor="#000" onBuy={onBuy} />
    </>);
    const buttons = screen.getAllByRole('button', { name: 'Buy Now' });
    expect(buttons).toHaveLength(3); // Phone (linked), Case (request), Basic plan (request); Sticker has no price
    fireEvent.click(buttons[0]);
    expect(onBuy).toHaveBeenLastCalledWith(expect.objectContaining({ id: PRODUCT, title: 'Phone' }));
    fireEvent.click(buttons[2]);
    expect(onBuy).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Basic', listed_price: '49' }));
  });

  it('sells a linked Studio service even without a price', () => {
    const onBuy = vi.fn();
    render(<SectionRenderer section={{ type: 'services', services: [{ name: 'Installation', desc: 'On site', product_id: PRODUCT }] }} sectionIndex={0} themeColor="#000" onBuy={onBuy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Buy Now' }));
    expect(onBuy).toHaveBeenCalledWith(expect.objectContaining({ id: PRODUCT, title: 'Installation' }));
  });

  it('shows no Buy Now to the owner', () => {
    render(<SectionRenderer section={{ type: 'items', items: [{ name: 'Phone', price: '9,000' }] }} sectionIndex={0} themeColor="#000" />);
    expect(screen.queryByRole('button', { name: 'Buy Now' })).toBeNull();
  });
});
