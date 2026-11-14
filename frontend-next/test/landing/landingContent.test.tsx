/**
 * Landing page (decision "Landing page: showroom-first hero and one type
 * scale"): one h1 with the value in three lines, one call-to-action order,
 * the two full videos load only on request, no invented numbers, and the
 * language switch changes the words.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/landing/TryDemoButton', () => ({ default: ({ className, label }: { className?: string; label?: string }) => <button type="button" className={className}>{label}</button> }));
vi.mock('@/components/landing/LandingControls', () => ({ LandingPreferences: () => <div data-testid="prefs" /> }));
vi.mock('@/components/promo/PromoVideo', () => ({ default: () => <div data-testid="landing-loop" /> }));

import i18n from '@/lib/i18n';
import LandingContent from '@/components/landing/LandingContent';

afterEach(async () => { await act(async () => { await i18n.changeLanguage('en'); }); });

describe('LandingContent', () => {
  it('has exactly one short h1: build it, connect and share it, buy or sell it', () => {
    render(<LandingContent templateCount={20} />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Build it. Connect & share it. Buy or sell it.');
    expect(h1s[0]).not.toHaveTextContent('Merchant Commerce');
  });

  it('shows a large, bold badge with the spinning on-blue brand icon', () => {
    render(<LandingContent templateCount={20} />);
    const badge = screen.getByText('Social + commerce in one app');
    expect(badge).toHaveClass('font-bold');
    const icon = within(badge).getByTestId('spinning-globe');
    expect(icon.parentElement).toHaveClass('h-12', 'w-12', 'sm:h-14', 'sm:w-14');
  });

  it('orders the actions: Start free, then Try demo, then Explore as guest', () => {
    render(<LandingContent templateCount={20} />);
    const hero = screen.getByRole('heading', { level: 1 }).closest('section')!;
    const start = within(hero).getByRole('link', { name: /Start free/ });
    expect(start).toHaveAttribute('href', '/register');
    const demo = within(hero).getByRole('button', { name: 'Try demo' });
    const guest = within(hero).getByRole('link', { name: /explore as a guest/ });
    expect(guest).toHaveAttribute('href', '/feed');
    expect(start.compareDocumentPosition(demo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(demo.compareDocumentPosition(guest) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('offers both full videos without loading either', () => {
    render(<LandingContent templateCount={20} />);
    expect(screen.getByRole('button', { name: /Watch how it works/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Build, edit & sell your way/ })).toBeInTheDocument();
    expect(screen.queryByTestId('promo-guide-video')).toBeNull();
  });

  it('states only numbers it is given, not invented statistics', () => {
    const { container } = render(<LandingContent templateCount={17} />);
    expect(container).toHaveTextContent('17 ready templates');
    expect(container.textContent).not.toMatch(/27\+|24\/7/);
  });

  it('has header, one main with the skip-link target, and footer landmarks', () => {
    const { container } = render(<LandingContent templateCount={20} />);
    expect(container.querySelectorAll('main#main-content')).toHaveLength(1);
    expect(container.querySelector('header')).not.toBeNull();
    expect(container.querySelector('footer')).not.toBeNull();
  });

  it('changes its words with the language', async () => {
    i18n.addResource('am', 'translation', 'landing.heroBuild', 'AM-HERO');
    render(<LandingContent templateCount={20} />);
    await act(async () => { await i18n.changeLanguage('am'); });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AM-HERO');
  });
});
