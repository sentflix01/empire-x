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
    render(<><nav data-page-guide="landing-nav">Account</nav><div data-page-guide="landing-actions">Explore actions</div><PageGuide /></>);

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your account options' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Choose how to explore' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(localStorage.getItem('nodbusiness-page-guide-seen')).toBe('true');
  });

  it('does not open automatically after the person has completed the guide', async () => {
    localStorage.setItem('nodbusiness-page-guide-seen', 'true');
    render(<><nav data-page-guide="landing-nav">Account</nav><div data-page-guide="landing-actions">Explore actions</div><PageGuide /></>);

    await waitFor(() => expect(http.get).toHaveBeenCalledWith('/api/flags/page-guided-tours'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Page guide' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
