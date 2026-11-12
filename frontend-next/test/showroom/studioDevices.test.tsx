/**
 * Showroom Studio on every screen size: one top bar with Publish always
 * present, one layout per width, the Sections list in website order, a
 * see-through Sections panel on phones, and no website export.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', is_demo: false } }) }));
vi.mock('@/api/entities', () => ({
  entities: {
    Business: { filter: vi.fn().mockResolvedValue([]), update: vi.fn(), create: vi.fn() },
    Showroom: { create: vi.fn(), update: vi.fn() },
    UserProfile: { filter: vi.fn().mockResolvedValue([]), update: vi.fn() },
  },
}));
vi.mock('@/api/client', () => ({ apiFetch: vi.fn() }));
vi.mock('@/components/showroom/BuilderForm', () => ({
  default: ({ onChange }: { onChange: (k: string, v: string) => void }) => (
    <label>Business name<input aria-label="Business name" onChange={(e) => onChange('title', e.target.value)} /></label>
  ),
}));
vi.mock('@/components/showroom/BuilderPreview', () => ({
  default: ({ activeSections }: { activeSections: string[] }) => <div data-testid="preview">{activeSections.join(',')}</div>,
}));

import ShowroomCreate from '@/views/ShowroomCreate';
import { layoutForWidth } from '@/hooks/useStudioLayout';
import SectionsPanel from '@/components/showroom/studio/SectionsPanel';
import SeeThroughPanel from '@/components/showroom/studio/SeeThroughPanel';
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

beforeEach(() => { localStorage.clear(); });

describe('Studio layouts', () => {
  it('on a phone: Publish in the top bar, Sections slide over the preview', () => {
    setWidth(320);
    render(<ShowroomCreate />);
    expect(screen.getByRole('button', { name: 'Publish site' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Sections' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Sections/ }));
    const panel = screen.getByRole('dialog', { name: 'Sections' });
    expect(within(panel).getByRole('region', { name: 'On your page' })).toBeInTheDocument();
    expect(screen.getByTestId('preview')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Sections' })).toBeNull();
  });

  it('on a tablet: Sections or Edit on the left, the preview always beside it', () => {
    setWidth(768);
    render(<ShowroomCreate />);
    expect(screen.getByTestId('preview')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Sections/ }));
    expect(screen.getByRole('region', { name: 'On your page' })).toBeInTheDocument();
    expect(screen.getByTestId('preview')).toBeInTheDocument();
  });

  it('on a computer: sections sidebar, editor and preview together', () => {
    setWidth(1440);
    render(<ShowroomCreate />);
    expect(screen.getByRole('complementary', { name: 'Sections' })).toBeInTheDocument();
    expect(screen.getByLabelText('Business name')).toBeInTheDocument();
    expect(screen.getByTestId('preview')).toBeInTheDocument();
  });

  it('has no website export or copy code anywhere', () => {
    setWidth(1440);
    render(<ShowroomCreate />);
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.queryByText(/Export/i)).toBeNull();
    expect(screen.queryByText(/Copy (HTML|code)/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Full-screen preview/ })).toBeInTheDocument();
  });

  it('undo goes back one change, not one letter', () => {
    setWidth(1440);
    render(<ShowroomCreate />);
    const name = screen.getByLabelText('Business name');
    for (const v of ['C', 'Ca', 'Caf', 'Cafe']) fireEvent.change(name, { target: { value: v } });
    expect(screen.getAllByText('Cafe').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryAllByText(/^(C|Ca|Caf|Cafe)$/)).toHaveLength(0);
    expect((screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('layoutForWidth', () => {
  it('picks the layout from the width Studio actually has', () => {
    expect(layoutForWidth(320)).toBe('phone');
    expect(layoutForWidth(544)).toBe('tablet');
    expect(layoutForWidth(768)).toBe('tablet');
    expect(layoutForWidth(1100)).toBe('desktop');
  });
});

describe('SectionsPanel', () => {
  const plan = { label: 'Normal', price: 100, tier: 'normal' };

  it('lists the page top to bottom with move and remove, and adds from the catalogue', () => {
    const onToggle = vi.fn();
    const onMove = vi.fn();
    render(<SectionsPanel activeSections={['contact', 'hero']} onToggle={onToggle} onMove={onMove} completion={40} plan={plan} />);
    const page = within(screen.getByRole('region', { name: 'On your page' }));
    const rows = page.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Contact');
    expect(rows[1]).toHaveTextContent('Top of your page');
    expect((page.getByRole('button', { name: /Move Contact up/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(page.getByRole('button', { name: /Move Top of your page up/ }));
    expect(onMove).toHaveBeenCalledWith('hero', -1);
    fireEvent.click(page.getByRole('button', { name: 'Remove Contact' }));
    expect(onToggle).toHaveBeenCalledWith('contact');
    fireEvent.click(screen.getByRole('button', { name: 'Add About us' }));
    expect(onToggle).toHaveBeenCalledWith('about');
    expect(screen.queryByRole('button', { name: /Add Top of your page/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Resources/ })).toBeNull();
  });
});

describe('SeeThroughPanel', () => {
  it('remembers how see-through it is and can be closed', () => {
    localStorage.setItem('nb_studio_panel_opacity', '60');
    const onClose = vi.fn();
    render(<SeeThroughPanel open title="Sections" onClose={onClose}><p>list</p></SeeThroughPanel>);
    expect(screen.getByRole('dialog', { name: 'Sections' }).style.opacity).toBe('0.6');
    fireEvent.click(screen.getByRole('button', { name: 'Close Sections' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores a stored level outside 40–100%', () => {
    localStorage.setItem('nb_studio_panel_opacity', '5');
    render(<SeeThroughPanel open title="Sections" onClose={() => {}}><p>list</p></SeeThroughPanel>);
    expect(screen.getByRole('dialog', { name: 'Sections' }).style.opacity).toBe('1');
  });
});

describe('MoreMenu', () => {
  it('asks before clearing the draft', async () => {
    const onClear = vi.fn();
    render(<MoreMenu onLoad={() => {}} onClear={onClear} onFullPreview={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: /Clear draft/ }));
    expect(onClear).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Clear' })); });
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
