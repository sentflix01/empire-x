/**
 * Feed Spotlight preview never disappears (owner, 15 Nov 2026: "when I tick
 * back and forth, it disappears on the spotlight preview").
 *
 * Root causes fixed:
 *  - "has content" and "draws a card" were two different rules, so a section
 *    with e.g. a number row without a number counted as content, drew nothing,
 *    and the whole strip was replaced by the empty card;
 *  - the premium sample stored numbers as `value` (the form, page and cards
 *    read `number`): its "Our numbers" was blank everywhere;
 *  - one tab with no cards blanked every tab;
 *  - the active tab was an index, so changing the list switched sections;
 *  - the tab row called scrollIntoView on every render, moving the preview.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn(), default: { get } }));

import BusinessSpotlight from '@/components/feed/BusinessSpotlight';
import { SPOTLIGHT_TILE_TYPES, chosenSlides, resolveSpotlight, sectionHasContent } from '@/lib/spotlight';
import { spotlightTiles } from '@/lib/spotlightTiles';
import { getShowroomTemplateSamples } from '@/lib/showroomTemplateSamples';
import { parseShowroomSections } from '@/lib/showroomSectionsCodec';
import { SECTION_TYPES } from '@/lib/builderSections';

beforeEach(() => { get.mockReset(); get.mockResolvedValue({ data: { products: [] } }); });

/** Seeded random rows for every list-like field of a section type. */
function randomSection(type: string, rnd: () => number): Record<string, unknown> {
  const sec = SECTION_TYPES.find((s) => s.key === type);
  const out: Record<string, unknown> = { type };
  for (const f of sec?.fields ?? []) {
    if (f.type === 'repeater') {
      const n = Math.floor(rnd() * 3);
      out[f.key] = Array.from({ length: n }, () => Object.fromEntries((f.itemFields ?? []).map((x) => [x.key, rnd() < 0.5 ? '' : `${x.key}-v`])));
    } else if (f.type === 'text' || f.type === 'textarea' || f.type === 'image') {
      out[f.key] = rnd() < 0.5 ? '' : (f.type === 'image' ? 'https://example.com/p.jpg' : `${f.key}-v`);
    }
  }
  return out;
}

describe('one rule: a section has content exactly when it draws a card', () => {
  it('holds for every drawable type over 2,000 random half-filled sections', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const far = new Date('2026-01-01');
    for (let i = 0; i < 2000; i++) {
      const type = SPOTLIGHT_TILE_TYPES[i % SPOTLIGHT_TILE_TYPES.length];
      if (['products', 'featured_products', 'inventory_catalog', 'about', 'story'].includes(type)) continue;
      const s = randomSection(type, rnd);
      const draws = spotlightTiles(s).length > 0;
      expect(sectionHasContent(s, 0, far), `${type} ${JSON.stringify(s)}`).toBe(type === 'offer' ? draws && Boolean(s.offerTitle) : draws);
    }
  });

  it('a chosen section that draws nothing is reported as empty, never shown', () => {
    const sections = [{ type: 'stats', stats: [{ number: '', label: 'Customers' }] }, { type: 'faq', faqs: [{ question: '' }] }, { type: 'about', aboutDesc: 'Hand-made' }];
    const { shown, empty } = chosenSlides(sections, ['stats', 'faq', 'about'], 0);
    expect(shown.map((s) => s.section.type)).toEqual(['about']);
    expect(empty).toEqual(['stats', 'faq']);
    for (const sl of resolveSpotlight(sections, 'carousel', ['stats', 'faq', 'about'], 0).slides) expect(spotlightTiles(sl.section).length).toBeGreaterThan(0);
  });
});

describe('sample numbers', () => {
  it('the samples store numbers as `number`, the key the form, page and cards read', () => {
    for (const smp of getShowroomTemplateSamples('fashion-clothing-store', 'Business & Commerce')) {
      for (const row of (smp.formData.stats ?? []) as Array<Record<string, unknown>>) expect(row.number).toBeTruthy();
    }
  });
  it('a site saved with the old `value` key opens in Studio with its numbers', () => {
    const { fields } = parseShowroomSections([{ type: 'stats', stats: [{ value: '500+', label: 'Customers' }] }]);
    expect((fields.stats as Array<Record<string, unknown>>)[0].number).toBe('500+');
    expect(spotlightTiles({ type: 'stats', stats: [{ value: '24h', label: 'Response' }] })[0].title).toBe('24h');
  });
});

describe('BusinessSpotlight stays put while the owner ticks back and forth', () => {
  const page = [
    { type: 'about', aboutDesc: 'Family shop since 1998' },
    { type: 'items', items: [{ name: 'Scarf', price: '850 ETB' }] },
    { type: 'team', members: [{ name: 'Selam', role: 'Founder' }] },
    { type: 'stats', stats: [{ number: '', label: 'Customers' }] },
  ];
  const strip = (ids: string[]) => <BusinessSpotlight sections={page} spotlightMode={ids.length > 1 ? 'carousel' : 'single'} spotlightSectionIds={ids} themeColor="#2563eb" ownerId="o1" eager isOwner />;

  it('never shows the empty card while a ticked section has content, whatever the order of clicks', () => {
    const { rerender } = render(strip(['about']));
    const sequence = [['stats'], ['stats', 'about'], ['stats'], ['stats', 'items'], ['items', 'team', 'stats'], ['team', 'stats'], ['stats', 'team'], ['about', 'stats', 'items', 'team']];
    for (const ids of sequence) {
      rerender(strip(ids));
      const filled = ids.filter((t) => t !== 'stats');
      if (filled.length) {
        expect(screen.queryByLabelText('About this business'), ids.join()).toBeNull();
        expect(screen.getByLabelText(/^Spotlight:/), ids.join()).toBeTruthy();
      }
      const tabs = screen.queryAllByRole('tab');
      expect(tabs.length, ids.join()).toBe(filled.length > 1 ? filled.length : 0);
    }
  });

  it('keeps the tab the owner was looking at when other tabs come and go', () => {
    const { rerender } = render(strip(['about', 'items', 'team']));
    fireEvent.click(screen.getByRole('tab', { name: 'Team' }));
    expect(screen.getByRole('tab', { name: 'Team' }).getAttribute('aria-selected')).toBe('true');
    rerender(strip(['items', 'team']));
    expect(screen.getByRole('tab', { name: 'Team' }).getAttribute('aria-selected')).toBe('true');
    rerender(strip(['team', 'about', 'items']));
    expect(screen.getByRole('tab', { name: 'Team' }).getAttribute('aria-selected')).toBe('true');
  });

  it('never scrolls the page or the preview pane (no scrollIntoView)', () => {
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    const { rerender } = render(strip(['about', 'items', 'team']));
    fireEvent.click(screen.getByRole('tab', { name: 'Items' }));
    rerender(strip(['items', 'team']));
    expect(spy).not.toHaveBeenCalled();
  });

  it('loads products when a catalogue tab is ticked later', async () => {
    get.mockResolvedValue({ data: { products: [{ id: 'p1', title: 'Shawl', price: 900 }] } });
    const withCatalogue = [...page, { type: 'products' }];
    const { rerender } = render(<BusinessSpotlight sections={page} spotlightMode="single" spotlightSectionIds={['about']} themeColor="#2563eb" ownerId="o1" eager isOwner />);
    expect(get).not.toHaveBeenCalled();
    await act(async () => {
      rerender(<BusinessSpotlight sections={withCatalogue} spotlightMode="carousel" spotlightSectionIds={['about', 'products']} themeColor="#2563eb" ownerId="o1" eager isOwner />);
    });
    expect(get).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('tab', { name: 'Products' })).toBeTruthy();
  });
});
