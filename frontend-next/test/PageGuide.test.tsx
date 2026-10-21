import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en', resolvedLanguage: 'en' } }) }));

import PageGuide from '@/components/PageGuide';

describe('PageGuide', () => {
  beforeEach(() => {
    localStorage.clear();
    http.get.mockReset().mockResolvedValue({ data: { enabled_for_user: true } });
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => { cleanup(); });

  it('starts on first visit and advances the page walkthrough', async () => {
    // The landing tour now has 10 steps. Render the first two targets.
    render(
      <>
        <nav data-page-guide="landing-nav">Account</nav>
        <div data-page-guide="landing-preferences">Preferences</div>
        <div data-page-guide="landing-actions">Explore actions</div>
        <PageGuide />
      </>
    );

    expect(await screen.findByRole('dialog')).toBeTruthy();
    // Step 1: landing-nav → "Your account options"
    expect(screen.getByRole('heading', { name: 'Your account options' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // Step 2: landing-preferences → "Display preferences"
    expect(screen.getByRole('heading', { name: 'Display preferences' })).toBeTruthy();
    // Skip the rest of the tour (use the skip text button, not the × close button)
    fireEvent.click(screen.getAllByRole('button', { name: 'Skip guide' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // New per-tour key
    expect(localStorage.getItem('nodbusiness-tour-LANDING-done')).toBe('true');
  });

  it('does not open automatically after the person has completed the guide', async () => {
    // Per-tour key suppresses auto-start
    localStorage.setItem('nodbusiness-tour-LANDING-done', 'true');
    render(
      <>
        <nav data-page-guide="landing-nav">Account</nav>
        <div data-page-guide="landing-actions">Explore actions</div>
        <PageGuide />
      </>
    );

    await waitFor(() => expect(http.get).toHaveBeenCalledWith('/api/flags/page-guided-tours'));
    expect(screen.queryByRole('dialog')).toBeNull();
    // Manual launch via the launcher button still works
    fireEvent.click(screen.getByRole('button', { name: 'Page guide' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('respects legacy nodbusiness-page-guide-seen key for LANDING tour', async () => {
    // Legacy key set → should NOT auto-open the landing tour
    localStorage.setItem('nodbusiness-page-guide-seen', 'true');
    render(
      <>
        <nav data-page-guide="landing-nav">Account</nav>
        <PageGuide />
      </>
    );

    await waitFor(() => expect(http.get).toHaveBeenCalledWith('/api/flags/page-guided-tours'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
