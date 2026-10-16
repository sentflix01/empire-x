/**
 * The publish step creates or chooses the website's Business profile inside
 * Studio instead of failing with "Create a Business profile, then link it".
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import PublishBusinessDialog from '@/components/showroom/PublishBusinessDialog';
import { getBusinessCategoryForBuilder } from '@/lib/showroomCategoryMapping';

const base = { open: true, businesses: [], defaultName: 'Fashion Clothing Store', defaultCategory: 'shop', busy: false, onOpenChange: vi.fn(), onCreate: vi.fn(), onChoose: vi.fn() };

describe('PublishBusinessDialog', () => {
  it('prefills a new Business profile from the site and creates it as public by default', () => {
    const onCreate = vi.fn();
    render(<PublishBusinessDialog {...base} mode="create" onCreate={onCreate} />);
    expect(screen.getByRole('heading', { name: /Create your Business profile/ })).toBeTruthy();
    expect((screen.getByLabelText('Business name') as HTMLInputElement).value).toBe('Fashion Clothing Store');
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('shop');
    fireEvent.click(screen.getByRole('button', { name: 'Create and publish' }));
    expect(onCreate).toHaveBeenCalledWith({ business_name: 'Fashion Clothing Store', business_category: 'shop', visibility: 'public' });
  });

  it('needs a name and a category', () => {
    render(<PublishBusinessDialog {...base} mode="create" defaultName="" defaultCategory="" />);
    const button = screen.getByRole('button', { name: 'Create and publish' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Abebe Coffee' } });
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'restaurant' } });
    expect(button.disabled).toBe(false);
  });

  it('lets an owner with several businesses choose one', () => {
    const onChoose = vi.fn();
    render(<PublishBusinessDialog {...base} mode="choose" onChoose={onChoose}
      businesses={[{ id: 'b1', business_name: 'Shop One' }, { id: 'b2', business_name: 'Shop Two' }]} />);
    fireEvent.click(screen.getByLabelText('Shop Two'));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onChoose).toHaveBeenCalledWith('b2');
  });

  it('maps builder categories back to business categories', () => {
    expect(getBusinessCategoryForBuilder('Food & Beverage')).toBe('restaurant');
    expect(getBusinessCategoryForBuilder('Business & Commerce')).toBe('shop');
    expect(getBusinessCategoryForBuilder('Unknown')).toBe('');
  });
});
