/**
 * Scan to add products: the scanner (phone barcode reader, typing the
 * number), the product form filling itself from a lookup, "you already sell
 * this", and quick scan mode (rows, +1 on repeat, price required, Save all).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'seller-1' } }) }));
const products = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), get: vi.fn() }));
const businesses = vi.hoisted(() => ({ filter: vi.fn().mockResolvedValue([]) }));
vi.mock('@/api/entities', () => ({ entities: { Product: products, Business: businesses } }));
vi.mock('next/navigation', () => ({ useParams: () => ({}), useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/components/ui/ImageUpload', () => ({ default: ({ value }: { value: string[] }) => <div data-testid="images">{(value || []).join(',')}</div> }));
// Radix Select renders portals jsdom can't drive; a plain stand-in is enough here.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, children }: { value: string; children: React.ReactNode }) => <div data-testid="category" data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null, SelectContent: () => null, SelectItem: () => null,
}));

import BarcodeScanner from '@/components/products/BarcodeScanner';
import ProductCreate from '@/views/ProductCreate';
import ProductQuickScan from '@/views/ProductQuickScan';

const COKE = { kind: 'gtin', gtin: '5449000000996', source: 'open_food_facts', credit: 'Open Food Facts (CC BY-SA)', suggestion: { title: 'Coca-Cola 330ml', description: 'Soft drink', category: 'Sodas', brand: 'Coca-Cola', image_url: 'https://images.openfoodfacts.org/c.jpg', unit: '330 ml' } };
const MINE = { kind: 'gtin', gtin: '0096385074', source: 'mine', existing_product: { id: 'p-water', title: 'Highland Water', stock: 5, price: 15, currency: 'ETB' } };

beforeEach(() => {
  for (const fn of [...Object.values(http), ...Object.values(products), ...Object.values(toast)]) fn.mockReset();
  localStorage.clear();
  http.get.mockImplementation(async (url: string) => ({ data: url.includes('96385074') ? MINE : COKE }));
  http.post.mockImplementation(async (url: string) => (url.endsWith('/import-image') ? { data: { url: 'https://cdn.example.test/ours.jpg' } } : { data: { created: ['n1'], updated: ['p-water'] } }));
  // No camera in jsdom: the scanner falls back to typing and photos.
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
});

describe('BarcodeScanner', () => {
  it('reads a code with the phone’s barcode reader', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: play });
    const track = { stop: vi.fn(), getCapabilities: () => ({}) };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getVideoTracks: () => [track], getTracks: () => [track] }) } });
    (globalThis as unknown as { BarcodeDetector: unknown }).BarcodeDetector = class { detect = vi.fn().mockResolvedValue([{ rawValue: '5449000000996' }]); };
    const onCode = vi.fn();
    render(<BarcodeScanner onCode={onCode} />);
    await waitFor(() => expect(onCode).toHaveBeenCalledWith('5449000000996'));
    delete (globalThis as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
  });

  it('without a camera, explains and lets you type the number', async () => {
    const onCode = vi.fn();
    render(<BarcodeScanner onCode={onCode} />);
    expect(await screen.findByText(/No camera found/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Type the number/ }));
    fireEvent.change(screen.getByLabelText('Barcode number'), { target: { value: '5449 0000 0099 6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));
    expect(onCode).toHaveBeenCalledWith('5449 0000 0099 6');
  });
});

const typeCode = async (code: string) => {
  if (!screen.queryByLabelText('Barcode number')) fireEvent.click(await screen.findByRole('button', { name: /Type the number/ }));
  fireEvent.change(await screen.findByLabelText('Barcode number'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Find' }));
};

describe('product form', () => {
  it('fills itself from a scan, copies the photo, and saves the barcode', async () => {
    products.create.mockResolvedValue({ id: 'new' });
    render(<ProductCreate />);
    fireEvent.click(screen.getByRole('button', { name: /Scan barcode/ }));
    await typeCode('5449000000996');
    expect(await screen.findByDisplayValue('Coca-Cola 330ml')).toBeTruthy();
    expect(screen.getByText(/Filled from Open Food Facts/)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('images').textContent).toBe('https://cdn.example.test/ours.jpg'));
    expect(screen.getByDisplayValue('330 ml')).toBeTruthy();
    expect(screen.getByTestId('category').getAttribute('data-value')).toBe('Food');
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish Product' }));
    await waitFor(() => expect(products.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Coca-Cola 330ml', price: 45, barcode: '5449000000996', manufacturer: 'Coca-Cola', unit: '330 ml' })));
  });

  it('says when you already sell the product, with Add stock', async () => {
    render(<ProductCreate />);
    fireEvent.click(screen.getByRole('button', { name: /Scan barcode/ }));
    await typeCode('96385074');
    expect(await screen.findByText(/You already sell this: Highland Water/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add stock' }).getAttribute('href')).toBe('/products/edit?id=p-water');
  });
});

describe('quick scan mode', () => {
  it('adds rows, +1 on a repeat scan, needs prices, then saves the list', async () => {
    render(<ProductQuickScan />);
    await typeCode('5449000000996');
    await typeCode('96385074');
    expect(await screen.findByText('Highland Water')).toBeTruthy();
    await typeCode('96385074');
    await waitFor(() => expect(screen.getAllByLabelText('Quantity 2').length).toBe(1));
    const save = screen.getByRole('button', { name: /Save all/ }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(screen.getByText(/Add prices to 1 item/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Price for Coca-Cola 330ml'), { target: { value: '45' } });
    expect(save.disabled).toBe(false);
    await act(async () => { fireEvent.click(save); });
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/api/products/scan-batch', { items: [
      { product_id: 'p-water', add_stock: 2 },
      expect.objectContaining({ title: 'Coca-Cola 330ml', price: 45, stock: 1, barcode: '5449000000996', category: 'Food', images: ['https://cdn.example.test/ours.jpg'] }),
    ] }));
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/1 new product, 1 stock update/));
  });

  it('shows the row at once while a slow lookup runs, and waits for it before saving', async () => {
    let answer: (v: unknown) => void = () => undefined;
    http.get.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
    render(<ProductQuickScan />);
    await typeCode('5449000000996');
    expect((await screen.findByRole('status')).textContent).toMatch(/Looking up 5449000000996/);
    expect((screen.getByRole('button', { name: /Save all/ }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { answer({ data: COKE }); });
    expect(await screen.findByDisplayValue('Coca-Cola 330ml')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('keeps the list on the device until it is saved', async () => {
    const { unmount } = render(<ProductQuickScan />);
    await typeCode('5449000000996');
    expect(await screen.findByDisplayValue('Coca-Cola 330ml')).toBeTruthy();
    unmount();
    render(<ProductQuickScan />);
    expect(await screen.findByDisplayValue('Coca-Cola 330ml')).toBeTruthy();
  });
});
