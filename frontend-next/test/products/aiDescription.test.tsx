/**
 * The product form's "AI Generate" button (audit F-002) calls the backend
 * description route, is hidden when AI is not configured, and never shows
 * setup instructions to sellers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import client from '@/lib/api/client';
import React from 'react';

vi.mock('@/lib/api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'seller-1' } }) }));
const products = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), get: vi.fn() }));
const businesses = vi.hoisted(() => ({ filter: vi.fn() }));
vi.mock('@/lib/api/entities', () => ({ entities: { Product: products, Business: businesses } }));
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

const get = client.get as unknown as ReturnType<typeof vi.fn>;
const post = client.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  for (const fn of [...Object.values(products), ...Object.values(toast), businesses.filter, nav.push, get, post]) fn.mockReset();
  businesses.filter.mockResolvedValue([]);
});

const aiStatus = (configured: boolean) => get.mockImplementation(async (url: string) => (url === '/api/ai/status' ? { data: { configured } } : { data: {} }));

describe('AI description button', () => {
  it('fills the description from POST /api/ai/generate-description', async () => {
    aiStatus(true);
    post.mockResolvedValue({ data: { description: 'A sturdy clay coffee pot.' } });
    render(<ProductCreate />);
    fireEvent.change(screen.getByPlaceholderText('Product name'), { target: { value: 'Jebena' } });
    fireEvent.click(await screen.findByRole('button', { name: /AI Generate/ }));
    await waitFor(() => expect(screen.getByPlaceholderText('Describe your product...')).toHaveValue('A sturdy clay coffee pot.'));
    expect(post).toHaveBeenCalledWith('/api/ai/generate-description', { title: 'Jebena', category: '', type: 'product' });
  });

  it('is hidden when the server has no AI provider', async () => {
    aiStatus(false);
    render(<ProductCreate />);
    await waitFor(() => expect(get).toHaveBeenCalledWith('/api/ai/status'));
    expect(screen.queryByRole('button', { name: /AI Generate/ })).toBeNull();
  });

  it('explains unavailability in plain words and hides the button on 503', async () => {
    aiStatus(true);
    post.mockRejectedValue({ error: 'AI descriptions are not available right now.', code: 'AI_DISABLED', status: 503 });
    render(<ProductCreate />);
    fireEvent.change(screen.getByPlaceholderText('Product name'), { target: { value: 'Jebena' } });
    fireEvent.click(await screen.findByRole('button', { name: /AI Generate/ }));
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    const shown = JSON.stringify([toast.info.mock.calls, toast.error.mock.calls]);
    expect(shown).not.toMatch(/OPENAI|\.env|API_KEY/);
    expect(screen.queryByRole('button', { name: /AI Generate/ })).toBeNull();
  });
});
