/**
 * Studio audit fixes (owner, 14 Nov 2026: "the main engine… everything neat
 * and professional"; note/2026-11-14-showroom-audit/studio-audit.md).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', is_demo: false } }) }));
const showroom = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
const business = vi.hoisted(() => ({ filter: vi.fn(), update: vi.fn(), create: vi.fn() }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/lib/api/entities', () => ({
  entities: {
    Business: business,
    Showroom: showroom,
    UserProfile: { filter: vi.fn().mockResolvedValue([]), update: vi.fn() },
  },
}));
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));
vi.mock('@/components/showroom/BuilderForm', () => ({
  default: ({ onChange }: { onChange: (k: string, v: string) => void }) => (
    <label>Business name<input aria-label="Business name" onChange={(e) => onChange('title', e.target.value)} /></label>
  ),
}));
vi.mock('@/components/showroom/BuilderPreview', () => ({ default: () => <div data-testid="preview" /> }));

import ShowroomCreate from '@/views/ShowroomCreate';
import SectionsPanel from '@/components/showroom/studio/SectionsPanel';
import { MoreMenu } from '@/components/showroom/studio/StudioMenus';

function setWidth(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => {
      const min = Number(/min-width:\s*(\d+)/.exec(query)?.[1] ?? 0);
      const max = Number(/max-width:\s*(\d+)/.exec(query)?.[1] ?? Infinity);
      return { matches: width >= min && width <= max, media: query, addEventListener: () => {}, removeEventListener: () => {} };
    },
  });
}

beforeEach(() => {
  localStorage.clear(); showroom.create.mockReset(); showroom.update.mockReset();
  business.filter.mockReset().mockResolvedValue([]);
  Object.values(toasts).forEach((f) => f.mockReset());
});

describe('Studio top bar', () => {
  it('has a visible Save draft button and one save status that moves from device to account', async () => {
    setWidth(1440);
    showroom.create.mockResolvedValue({ id: 'srv-1' });
    render(<ShowroomCreate />);
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Selam Café' } });
    expect(screen.getByTestId('studio-save-status').textContent).toMatch(/Saving/);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); });
    expect(showroom.create).toHaveBeenCalledTimes(1);
    expect(showroom.create.mock.calls[0][0]).toMatchObject({ status: 'draft', spotlight_section_ids: [] });
    expect(screen.getByTestId('studio-save-status').textContent).toMatch(/Saved to your account/);
  });

  it('asks the browser to confirm leaving while a change is not saved yet', () => {
    setWidth(1440);
    render(<ShowroomCreate />);
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Selam' } });
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('Publish shows it is working and cannot be pressed twice', async () => {
    setWidth(1440);
    let finish: (v: unknown) => void = () => {};
    showroom.create.mockImplementation(() => new Promise((r) => { finish = r; }));
    render(<ShowroomCreate />);
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Selam' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); });
    const busy = screen.getByRole('button', { name: /Working/ });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(busy.getAttribute('aria-busy')).toBe('true');
    await act(async () => { finish({ id: 'x' }); });
  });
});

describe('Business list failure', () => {
  it('offers Try again, and Publish reloads the list instead of publishing blind', async () => {
    setWidth(1440);
    business.filter.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    render(<ShowroomCreate />);
    await act(async () => { await Promise.resolve(); });
    const [, opts] = toasts.error.mock.calls.find(([m]) => /Business profiles/.test(String(m)))!;
    expect(opts.action.label).toBe('Try again');
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Selam' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Publish' })); });
    expect(toasts.info).toHaveBeenCalledWith(expect.stringMatching(/Loading your Business profiles/));
    expect(showroom.create).not.toHaveBeenCalled();
    expect(business.filter).toHaveBeenCalledTimes(2);
  });
});

describe('Sections panel search', () => {
  const plan = { label: 'Normal', price: 100, tier: 'normal' };
  it('finds a section by name or purpose, and says when nothing matches', () => {
    const onToggle = vi.fn();
    render(<SectionsPanel activeSections={['hero']} onToggle={onToggle} onMove={vi.fn()} completion={0} plan={plan} />);
    const search = screen.getByLabelText('Find a section to add');
    fireEvent.change(search, { target: { value: 'question' } });
    expect(screen.getByRole('button', { name: /Add Questions/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add About us' })).toBeNull();
    fireEvent.change(search, { target: { value: 'zzzz' } });
    expect(screen.getByRole('status').textContent).toMatch(/No section matches/);
  });
});

describe('More menu', () => {
  it('offers Save draft, the page guide and the assistant (their floating buttons are hidden in Studio on phones)', () => {
    const onSaveDraft = vi.fn();
    const guide = vi.fn(); const ai = vi.fn();
    window.addEventListener('nodbusiness:open-page-guide', guide);
    window.addEventListener('nodbusiness:open-assistant', ai);
    render(<MoreMenu onLoad={vi.fn()} onClear={vi.fn()} onFullPreview={vi.fn()} onSaveDraft={onSaveDraft} onFeedSpotlight={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByRole('button', { name: 'Feed Spotlight' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(onSaveDraft).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Page guide' }));
    expect(guide).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ask Nodbusiness AI' }));
    expect(ai).toHaveBeenCalled();
  });
});

describe('layout rules', () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8');
  it('Studio menus scroll inside the space the screen has', () => {
    expect(read('components/showroom/studio/StudioMenus.tsx')).toMatch(/max-h-\[min\(var\(--radix-popover-content-available-height[^\]]*\]\s+overflow-y-auto/);
  });
  it('Studio hides the floating launchers below 1024 px', () => {
    expect(read('app/globals.css')).toMatch(/max-width:\s*1023px\)\s*\{\s*body:has\(\[data-studio-editor\]\)\s*\[data-floating-launcher\]/);
    expect(read('views/ShowroomCreate.tsx')).toContain('data-studio-editor');
  });
  it('wizard steps have names on every screen (labels are sr-only on phones, not removed)', () => {
    const src = read('views/ShowroomWizard.tsx');
    expect(src).toContain('aria-current={state === "active" ? "step" : undefined}');
    expect(src).toMatch(/sr-only text-xs font-semibold sm:not-sr-only/);
  });
});
