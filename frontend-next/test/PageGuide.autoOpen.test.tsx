/**
 * Page guide defaults (audit F-031, owner decision 6 Nov 2026): the flag only
 * decides whether the guide opens by itself; the Page guide button always
 * works; the guide never opens by itself over a sign-in or password form, nor on
 * the landing page, where it covered "Start free" (owner, 14 Nov 2026); clicking
 * the dimmed backdrop closes it.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
const nav = vi.hoisted(() => ({ pathname: '/landing' }));
vi.mock('@/lib/api/client', () => ({ default: http }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en', resolvedLanguage: 'en' } }) }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

import PageGuide from '@/components/PageGuide';

const flag = (on: boolean) => http.get.mockResolvedValue({ data: { enabled_for_user: on } });

beforeEach(() => {
  localStorage.clear();
  http.get.mockReset();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); });

describe('page guide auto-open', () => {
  it('does not open by itself when the flag is off, but the button still works', async () => {
    nav.pathname = '/landing';
    flag(false);
    render(<><nav data-page-guide="landing-nav">Account</nav><PageGuide /></>);
    await waitFor(() => expect(http.get).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(localStorage.getItem('nodbusiness_page_guide_enabled')).toBe('true'));
    fireEvent.click(screen.getByRole('button', { name: 'Page guide' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it.each(['/login', '/register', '/forgot-password', '/reset-password', '/landing', '/'])('never opens by itself on %s, even with the flag on', async (path) => {
    nav.pathname = path;
    flag(true);
    render(<PageGuide />);
    await waitFor(() => expect(http.get).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens by itself on a first visit to other pages when the flag is on', async () => {
    nav.pathname = '/feed';
    flag(true);
    render(<><main id="main-content">Feed</main><PageGuide /></>);
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('closes when the dimmed backdrop is clicked, so it can never trap the page', async () => {
    nav.pathname = '/landing';
    flag(false);
    render(<><nav data-page-guide="landing-nav">Account</nav><PageGuide /></>);
    await waitFor(() => expect(http.get).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Page guide' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByTestId('page-guide-backdrop'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
