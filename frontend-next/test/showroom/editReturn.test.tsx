/**
 * Coming back to a published site (owner, 15 Nov 2026: "after the user
 * publishes, then comes back another time to update any part…").
 *
 * Found on the real stack (note/2026-11-15-spotlight-fuzz/edit-after-publish.mjs):
 *  - changes to a live site said "Saved on this device" but were dropped on
 *    the next visit;
 *  - they were saved in the new-site draft slot, so "Create showroom" could
 *    reopen a live site's content as a new site.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { setSearchParams } from '../setup';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', is_demo: false } }) }));
vi.mock('@/lib/api/entities', () => ({
  entities: {
    Business: { filter: vi.fn().mockResolvedValue([{ id: 'b1', business_name: 'Selam' }]), update: vi.fn(), create: vi.fn() },
    Showroom: { create: vi.fn(), update: vi.fn() },
    UserProfile: { filter: vi.fn().mockResolvedValue([]), update: vi.fn() },
  },
}));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ apiFetch, default: { get: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/showroom/BuilderForm', () => ({
  default: ({ formData, onChange }: { formData: Record<string, string>; onChange: (k: string, v: string) => void }) => (
    <label>One line<input aria-label="One line" value={formData.subtitle ?? ''} onChange={(e) => onChange('subtitle', e.target.value)} /></label>
  ),
}));
vi.mock('@/components/showroom/BuilderPreview', () => ({ default: () => <div data-testid="preview" /> }));

import ShowroomCreate from '@/views/ShowroomCreate';

const LIVE_AT = '2026-11-15T10:00:00.000Z';
const live = {
  id: 's1', status: 'published', business_id: 'b1', title: 'Selam', updated_at: LIVE_AT,
  sections: JSON.stringify([{ type: 'hero', title: 'Selam', subtitle: 'Live words' }]),
};
const editKey = 'nodbusiness_builder_draft:u1:real:edit:s1';
const newSiteKey = 'nodbusiness_builder_draft:u1:real';
const deviceCopy = (base: string | null, subtitle: string) => JSON.stringify({
  formData: { title: 'Selam', subtitle }, activeSections: ['hero'], savedAt: Date.now() - 60_000, baseUpdatedAt: base,
});

beforeEach(() => {
  localStorage.clear();
  setSearchParams({ edit: 's1' });
  apiFetch.mockReset().mockResolvedValue({ ok: true, json: async () => live });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) });
});

async function openStudio() {
  render(<ShowroomCreate />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

describe('coming back to a live site', () => {
  it('opens the live version when there are no device changes', async () => {
    await openStudio();
    expect((screen.getByLabelText('One line') as HTMLInputElement).value).toBe('Live words');
    expect(screen.queryByTestId('studio-device-changes')).toBeNull();
  });

  it('brings back changes made on this device that are not live yet, and can discard them', async () => {
    localStorage.setItem(editKey, deviceCopy(LIVE_AT, 'My unfinished words'));
    await openStudio();
    expect((screen.getByLabelText('One line') as HTMLInputElement).value).toBe('My unfinished words');
    expect(screen.getByTestId('studio-device-changes').textContent).toMatch(/Not live yet/);
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect((screen.getByLabelText('One line') as HTMLInputElement).value).toBe('Live words');
    expect(screen.queryByTestId('studio-device-changes')).toBeNull();
  });

  it('opens the newer live version when the site was updated elsewhere, and offers the older changes', async () => {
    localStorage.setItem(editKey, deviceCopy('2026-11-14T08:00:00.000Z', 'Older words from this device'));
    await openStudio();
    expect((screen.getByLabelText('One line') as HTMLInputElement).value).toBe('Live words');
    expect(screen.getByTestId('studio-device-changes').textContent).toMatch(/Updated elsewhere/);
    expect(localStorage.getItem(`${editKey}:older`)).toContain('Older words from this device');
    fireEvent.click(screen.getByRole('button', { name: 'Use my older changes' }));
    expect((screen.getByLabelText('One line') as HTMLInputElement).value).toBe('Older words from this device');
    expect(localStorage.getItem(`${editKey}:older`)).toBeNull();
  });

  it('keeps a live site\'s changes out of the new-site draft', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openStudio();
    fireEvent.change(screen.getByLabelText('One line'), { target: { value: 'Edited live site' } });
    await act(async () => { vi.advanceTimersByTime(2000); });
    vi.useRealTimers();
    expect(localStorage.getItem(editKey)).toContain('Edited live site');
    expect(localStorage.getItem(editKey)).toContain(LIVE_AT);
    expect(localStorage.getItem(newSiteKey)).toBeNull();
  });
});
