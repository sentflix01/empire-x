/**
 * QR / shared-link business page: signed-out visitors get Back to Landing and
 * Try Demo (decision 11); signed-in users see neither.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const auth = { isAuthenticated: false, authChecked: true };
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/components/landing/TryDemoButton', () => ({ default: () => <button type="button">Try Demo</button> }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import QrVisitorActions from '@/components/showroom/QrVisitorActions';

describe('QrVisitorActions', () => {
  beforeEach(() => { auth.isAuthenticated = false; auth.authChecked = true; });

  it('offers Back to Landing and Try Demo to a signed-out visitor', () => {
    render(<QrVisitorActions />);
    expect(screen.getByRole('link', { name: /back to landing/i }).getAttribute('href')).toBe('/landing');
    expect(screen.getByRole('button', { name: 'Try Demo' })).toBeTruthy();
  });

  it('shows nothing to a signed-in user', () => {
    auth.isAuthenticated = true;
    const { container } = render(<QrVisitorActions />);
    expect(container.innerHTML).toBe('');
  });

  it('waits for the auth check before showing anything', () => {
    auth.authChecked = false;
    const { container } = render(<QrVisitorActions />);
    expect(container.innerHTML).toBe('');
  });
});
