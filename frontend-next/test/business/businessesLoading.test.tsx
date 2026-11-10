/**
 * Businesses page requests (performance audit 2026-11-09): it made one
 * profile request per owner, asked /api/auth/me again, called the follows
 * endpoint for guests (always 401), and kept every section in placeholders
 * until all of that finished (CLS 0.53).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const get = vi.fn();
vi.mock('@/api/client', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));
const auth = { user: null as null | { id: string }, authChecked: true };
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

import BusinessesPage from '@/views/Businesses';

const biz = (i: number) => ({
  id: `b${i}`, business_name: `Shop ${i}`, business_category: 'food', business_description: null,
  business_logo_url: null, owner_id: `o${i}`, follower_count: 0, view_count: 10 - i, latitude: null, longitude: null,
});

describe('Businesses loading', () => {
  let answerProfiles: (v: unknown) => void;
  beforeEach(() => {
    get.mockReset();
    get.mockImplementation((url: string) => {
      if (url.startsWith('/api/businesses')) return Promise.resolve({ data: [biz(1), biz(2), biz(3)] });
      if (url === '/api/profiles') return new Promise((resolve) => { answerProfiles = resolve; });
      return Promise.resolve({ data: [] });
    });
  });

  it('shows cards before owner profiles arrive, then fills them from one request', async () => {
    auth.user = null;
    render(<BusinessesPage />);
    expect(await screen.findByText('Shop 1')).toBeInTheDocument();

    const urls = get.mock.calls.map(([u]) => u as string);
    expect(urls.filter((u) => u === '/api/profiles')).toHaveLength(1);
    expect(get.mock.calls.find(([u]) => u === '/api/profiles')?.[1]).toEqual({ params: { user_ids: 'o1,o2,o3', limit: 3 } });
    expect(urls.some((u) => u.startsWith('/api/profiles/by-user/'))).toBe(false);
    expect(urls).not.toContain('/api/auth/me');
    expect(urls).not.toContain('/api/profiles/me/follows');

    await act(async () => { answerProfiles({ data: [{ user_id: 'o1', display_name: 'Abebe', avatar_url: null }] }); });
    expect(await screen.findByText('Abebe')).toBeInTheDocument();
  });

  it('loads follows for signed-in people', async () => {
    auth.user = { id: 'me' };
    render(<BusinessesPage />);
    await screen.findByText('Shop 1');
    expect(get.mock.calls.map(([u]) => u)).toContain('/api/profiles/me/follows');
  });
});
