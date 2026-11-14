/**
 * Studio audit 2026-11-14 (owner's report on the Feed Spotlight and colours):
 * - every chosen section is offered only if the strip can draw it, can be
 *   reordered, and is flagged when it has no content yet;
 * - a change is saved even when the panel closes at once; a failed save says so;
 * - the preview counts the tabs that will really show;
 * - spotlight tabs work with the keyboard;
 * - owners can pick any colours; the site's own colours show as selected;
 * - the hero button stays readable on a light colour.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiFetch: api.apiFetch, default: { get: vi.fn().mockResolvedValue({ data: { products: [] } }) } }));

import FeedSpotlightPanel from '@/components/showroom/studio/FeedSpotlightPanel';
import FeedSpotlightPreview from '@/components/showroom/studio/FeedSpotlightPreview';
import BusinessSpotlight from '@/components/feed/BusinessSpotlight';
import { StyleMenu } from '@/components/showroom/studio/StudioMenus';
import SectionRenderer from '@/components/showroom/SectionRenderer';
import { contrastRatio } from '@/lib/contrast';

const sections = [
  { type: 'hero', title: 'Selam' },
  { type: 'about', aboutDesc: 'Family shop since 1998' },
  { type: 'items', items: [{ name: 'Scarf', price: '850 ETB' }] },
  { type: 'stats', stats: [{ number: '500+', label: 'Customers served' }] },
  { type: 'faq', faqs: [] },
  { type: 'rooms', roomsTitle: 'Rooms' },
  { type: 'contact', phone: '+251911000000' },
];
const active = sections.map((s) => s.type);

beforeEach(() => { api.apiFetch.mockReset(); api.apiFetch.mockResolvedValue({ ok: true, status: 200 }); });

describe('FeedSpotlightPanel', () => {
  const renderPanel = (props: Partial<React.ComponentProps<typeof FeedSpotlightPanel>> = {}) => render(
    <FeedSpotlightPanel showroomId="s1" activeSections={active} sections={sections} initialMode="carousel"
      initialSectionIds={['about', 'items']} initialCarouselCount={1} themeColor="#2563eb"
      onClose={vi.fn()} onSaved={vi.fn()} onPreviewChange={vi.fn()} {...props} />,
  );

  it('offers only sections the strip can draw, and flags empty ones', () => {
    renderPanel();
    const labels = screen.getAllByRole('checkbox').map((c) => c.closest('label')?.textContent ?? '');
    expect(labels.some((l) => /Rooms/.test(l))).toBe(false);
    expect(labels.some((l) => /Contact/.test(l))).toBe(false);
    expect(labels.find((l) => /Questions/.test(l))).toMatch(/No content yet/);
  });

  it("reorders chosen tabs and tells the preview the owner's order", () => {
    const onPreviewChange = vi.fn();
    renderPanel({ onPreviewChange });
    fireEvent.click(screen.getByRole('button', { name: /Move Things you sell earlier/ }));
    expect(onPreviewChange).toHaveBeenLastCalledWith('carousel', ['items', 'about']);
  });

  it('saves a change straight away when the panel closes before the delay', async () => {
    const onClose = vi.fn();
    renderPanel({ onClose });
    fireEvent.click(screen.getAllByRole('checkbox').find((c) => /Our numbers/.test(c.closest('label')?.textContent ?? ''))!);
    fireEvent.click(screen.getByRole('button', { name: 'Close Feed Spotlight Preview' }));
    await act(async () => { await Promise.resolve(); });
    expect(onClose).toHaveBeenCalled();
    expect(api.apiFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(api.apiFetch.mock.calls[0][1].body));
    expect(body.spotlight_section_ids).toEqual(['about', 'items', 'stats']);
  });

  it('reports a refused save instead of saying it was saved', async () => {
    vi.useFakeTimers();
    api.apiFetch.mockResolvedValue({ ok: false, status: 422 });
    renderPanel();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    await act(async () => { vi.advanceTimersByTime(900); });
    vi.useRealTimers();
    await act(async () => { await Promise.resolve(); });
    expect(await screen.findByText(/Could not save/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});

describe('FeedSpotlightPreview', () => {
  it('counts the tabs that will really show and names the empty ones', () => {
    render(<FeedSpotlightPreview sections={sections} spotlightMode="carousel" spotlightSectionIds={['about', 'items', 'stats', 'faq']}
      themeColor="#2563eb" themeColor2="#7c3aed" businessName="Selam" ownerId="o1" />);
    expect(screen.getByText('3 tabs')).toBeTruthy();
    expect(screen.getByTestId('spotlight-empty-note').textContent).toMatch(/FAQ/);
  });
});

describe('BusinessSpotlight tabs', () => {
  it("shows every chosen section with content in the owner's order, and the arrow keys move between tabs", () => {
    render(<BusinessSpotlight sections={sections} spotlightMode="carousel" spotlightSectionIds={['about', 'items', 'stats']}
      themeColor="#2563eb" ownerId="o1" eager />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['About', 'Items', 'Numbers']);
    expect(screen.getByRole('tabpanel')).toBeTruthy();
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Items' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Items' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Numbers' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Numbers' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'About' }).getAttribute('aria-selected')).toBe('true');
  });
});

describe('StyleMenu colours', () => {
  const baseProps = { font: 'Inter', onFont: vi.fn(), darkEditor: false, onDarkEditor: vi.fn(), whatsapp: false, onWhatsapp: vi.fn(), previewMode: 'desktop' as const, onPreviewMode: vi.fn() };
  const open = (colors: [string, string], onColors = vi.fn()) => {
    render(<StyleMenu {...baseProps} colors={colors} onColors={onColors} />);
    fireEvent.click(screen.getByRole('button', { name: /Style/ }));
    return onColors;
  };

  it("shows a template's own colours as selected", () => {
    open(['#b8860b', '#d4a843']);
    expect(screen.getByTestId('custom-colour-swatch')).toBeTruthy();
  });

  it('lets the owner pick any colour, by picker or by code', () => {
    const onColors = open(['#2563EB', '#7C3AED']);
    expect(screen.queryByTestId('custom-colour-swatch')).toBeNull(); // a preset is selected
    fireEvent.change(screen.getByLabelText('Colour 1: pick a colour'), { target: { value: '#ff6600' } });
    expect(onColors).toHaveBeenLastCalledWith('#ff6600', '#7C3AED');
    const code = screen.getByLabelText('Colour 2 code');
    fireEvent.change(code, { target: { value: '222222' } });
    fireEvent.keyDown(code, { key: 'Enter' });
    expect(onColors).toHaveBeenLastCalledWith('#2563EB', '#222222');
  });

  it('ignores an invalid code and offers a single colour', () => {
    const onColors = open(['#2563EB', '#7C3AED']);
    const code = screen.getByLabelText('Colour 1 code');
    fireEvent.change(code, { target: { value: '#12' } });
    expect(code.getAttribute('aria-invalid')).toBe('true');
    fireEvent.blur(code);
    expect(onColors).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('switch', { name: 'Use one colour' }));
    expect(onColors).toHaveBeenLastCalledWith('#2563EB', '#2563EB');
  });

  it('explains how a light colour stays readable', () => {
    open(['#ffe066', '#fff3b0']);
    expect(screen.getByText(/light colour/)).toBeTruthy();
  });
});

describe('hero on a light colour', () => {
  it('keeps the button text readable (WCAG AA)', () => {
    render(<SectionRenderer section={{ type: 'hero', title: 'Sunny', cta: 'Order now', heroBg: '#ffe066', heroBg2: '#fff3b0' } as any} sectionIndex={0} profile={{}} ctaTarget="#section-1" />);
    const button = screen.getByRole('link', { name: 'Order now' });
    expect(button.querySelector('button')).toBeNull();
    const color = button.style.color;
    const hex = color.startsWith('#') ? color : `#${(color.match(/\d+/g) ?? []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
    expect(contrastRatio(hex, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});
