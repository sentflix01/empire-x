/**
 * Global business feed (the guest /feed) — performance audit 2026-11-09:
 * it made one profile request per owner, waited for all of them before showing
 * any card, then rendered all 50 cards at once (~1 s of main-thread work on a
 * mid-range phone). Now: cards first, one profile request, six cards at a time.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const businessFilter = vi.fn();
const showroomFilter = vi.fn(() => Promise.resolve([]));
const profileFilter = vi.fn(() => Promise.resolve([]));
vi.mock('@/api/entities', () => ({
  entities: {
    Business: { filter: (...a: unknown[]) => businessFilter(...a) },
    Showroom: { filter: (...a: unknown[]) => showroomFilter(...(a as [])) },
    UserProfile: { filter: (...a: unknown[]) => profileFilter(...(a as [])) },
  },
}));
const get = vi.fn();
vi.mock('@/api/client', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/messaging', () => ({ useStartChat: () => vi.fn() }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => null }));
vi.mock('@/components/feed/BusinessSpotlight', () => ({ default: () => null }));
vi.mock('@/components/feed/TickerBar', () => ({ default: () => null }));
vi.mock('@/components/checkout/PurchaseModal', () => ({ default: () => null }));
vi.mock('@/components/ui/BookmarkButton', () => ({ default: () => null }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

let intersect: (() => void) | null = null;
class FakeObserver {
  constructor(private cb: (e: Array<{ isIntersecting: boolean }>) => void) {}
  observe() { intersect = () => this.cb([{ isIntersecting: true }]); }
  disconnect() { intersect = null; }
}

import BusinessShowroomFeed from '@/components/feed/BusinessShowroomFeed';

const biz = (i: number) => ({
  id: `b${i}`, owner_id: `o${i}`, business_name: `Shop ${String(i).padStart(2, '0')}`, business_category: 'food',
  created_at: new Date(Date.UTC(2026, 0, 1, 0, 60 - i)).toISOString(),
});
const shownShops = () => screen.queryAllByText(/^Shop \d\d$/).length;

describe('global business feed loading', () => {
  let answerProfiles: (v: unknown) => void = () => {};
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    businessFilter.mockResolvedValue(Array.from({ length: 14 }, (_, i) => biz(i + 1)));
    get.mockImplementation(() => new Promise((resolve) => { answerProfiles = resolve; }));
  });
  afterEach(() => { vi.unstubAllGlobals(); get.mockReset(); profileFilter.mockClear(); });

  it('shows six cards before owner profiles arrive, from one profile request', async () => {
    render(<BusinessShowroomFeed />);
    expect(await screen.findByText('Shop 01')).toBeInTheDocument();
    expect(shownShops()).toBe(6);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe('/api/profiles');
    expect((get.mock.calls[0][1] as { params: { user_ids: string } }).params.user_ids.split(',')).toHaveLength(14);
    expect(profileFilter).not.toHaveBeenCalled();
    await act(async () => { answerProfiles({ data: [] }); });
  });

  it('adds six more cards each time the end of the list comes near', async () => {
    render(<BusinessShowroomFeed />);
    await screen.findByText('Shop 01');
    await act(async () => { intersect?.(); });
    expect(shownShops()).toBe(12);
    await act(async () => { intersect?.(); });
    expect(shownShops()).toBe(14);
    expect(intersect).toBeNull();
  });
});
