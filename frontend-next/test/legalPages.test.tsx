/**
 * Legal pages name a real operator and an inbox that receives mail (audit
 * LEGAL-02 / LEGAL-03), and the privacy policy names every service that
 * receives personal data (PRIV-02).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('tab=privacy'), useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import ServiceAgreement from '@/views/ServiceAgreement';
import { CONTACT_EMAIL } from '@/lib/legalIdentity';

function openAll() {
  // Accordion sections are collapsed: open every one so their text is in the DOM.
  // Section headers are numbered ("3. Data Sharing"); tab buttons are not, and clicking them would switch tabs.
  for (const button of screen.queryAllByRole('button', { name: /^\s*\d+\./ })) fireEvent.click(button);
}

describe('Service Agreement page', () => {
  it('shows the operator and a working contact, never the placeholders', () => {
    const { container } = render(<ServiceAgreement />);
    openAll();
    const text = container.textContent ?? '';
    expect(text).toContain('Addis Ababa, Ethiopia');
    expect(text).toContain(CONTACT_EMAIL);
    expect(text).not.toMatch(/City, Country|@nodbusiness\.app|\[TBD\]/);
    for (const link of container.querySelectorAll('a[href^="mailto:"]')) {
      expect(link.getAttribute('href')).toContain(CONTACT_EMAIL);
    }
  });

  it('names every service that receives personal data in the privacy policy', () => {
    const { container } = render(<ServiceAgreement />);
    openAll();
    const text = container.textContent ?? '';
    for (const name of ['Supabase', 'Cloudflare', 'Chapa', 'Stripe', 'Gmail', 'Google Gemini', 'OpenStreetMap', 'Open Food Facts', 'Sentry']) {
      expect(text).toContain(name);
    }
    expect(text).toMatch(/Legal basis/);
    expect(text).toMatch(/International transfers/);
  });
});
