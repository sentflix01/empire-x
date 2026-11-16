/**
 * Feed Spotlight choices in Showroom Studio were not saved (2026-11-16):
 * - closing the panel within the 800 ms debounce cancelled the PATCH, while
 *   the Studio preview already showed the new choice;
 * - apiFetch does not throw on 4xx/5xx, so a refused save still said
 *   "Settings saved automatically".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/lib/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  apiFetch: vi.fn(),
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));

import { apiFetch } from '@/lib/api/client';
import FeedSpotlightPanel from '@/components/showroom/studio/FeedSpotlightPanel';

const ok = () => ({ ok: true, status: 200, json: async () => ({}) }) as unknown as Response;
const refused = (status: number, body: unknown) => ({ ok: false, status, json: async () => body }) as unknown as Response;

function renderPanel(showroomId = 's1') {
  const onSaved = vi.fn();
  const view = render(
    <FeedSpotlightPanel
      showroomId={showroomId}
      activeSections={['hero', 'items', 'services', 'contact']}
      initialMode={null}
      initialSectionIds={[]}
      initialCarouselCount={1}
      themeColor="#2563EB"
      onClose={vi.fn()}
      onSaved={onSaved}
    />,
  );
  return { ...view, onSaved };
}

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const body = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body));

describe('FeedSpotlightPanel saving', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(apiFetch).mockReset().mockResolvedValue(ok());
  });
  afterEach(() => vi.useRealTimers());

  it('sends a choice made just before the panel closes', async () => {
    const { unmount, onSaved } = renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: /^Off/ }));
    act(() => { vi.advanceTimersByTime(100); });
    unmount();
    await flush();

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const call = vi.mocked(apiFetch).mock.calls[0];
    expect(call[0]).toBe('/api/showrooms/s1/spotlight');
    expect((call[1] as RequestInit).method).toBe('PATCH');
    expect((call[1] as RequestInit).keepalive).toBe(true);
    expect(body(call)).toEqual({ spotlight_mode: 'off', spotlight_section_ids: [], spotlight_carousel_count: 1 });
    expect(onSaved).toHaveBeenCalledWith('off', [], 1);
  });

  it('saves after the debounce and does not send it again on close', async () => {
    const { unmount, onSaved } = renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: /^Choose sections/ }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    await act(async () => { vi.advanceTimersByTime(800); });
    await flush();

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(body(vi.mocked(apiFetch).mock.calls[0])).toMatchObject({ spotlight_mode: 'single', spotlight_section_ids: ['items'] });
    expect(onSaved).toHaveBeenCalledWith('single', ['items'], 1);
    expect(screen.getByText('Settings saved automatically.')).toBeTruthy();

    unmount();
    await flush();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('shows a refused save as an error, not as saved', async () => {
    vi.mocked(apiFetch).mockResolvedValue(refused(403, { error: 'Forbidden' }));
    const { onSaved } = renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: /^Off/ }));
    await act(async () => { vi.advanceTimersByTime(800); });
    await flush();

    expect(screen.getByText('Forbidden')).toBeTruthy();
    expect(screen.queryByText('Settings saved automatically.')).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows a network failure as an error', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new TypeError('Failed to fetch'));
    const { onSaved } = renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: /^Off/ }));
    await act(async () => { vi.advanceTimersByTime(800); });
    await flush();

    expect(screen.getByText('Could not save your Spotlight choice. Try again.')).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('sends nothing in preview-only mode', async () => {
    const { unmount } = renderPanel('');
    fireEvent.click(screen.getByRole('radio', { name: /^Off/ }));
    act(() => { vi.advanceTimersByTime(1000); });
    unmount();
    await flush();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
