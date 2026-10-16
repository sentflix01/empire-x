/**
 * Public or private business sites (decision §2 and §7): the sign-in panel a
 * guest sees on a private site, and the owner's visibility control.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({ usePathname: () => '/showroom/abebe-coffee' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import SignInRequired, { isSignInRequired } from '@/components/auth/SignInRequired';
import { VisibilityFieldset, asVisibility } from '@/components/business/VisibilityChoice';

describe('SignInRequired', () => {
  it('recognises the API answer for a private business', () => {
    expect(isSignInRequired({ code: 'SIGN_IN_REQUIRED', status: 401 })).toBe(true);
    expect(isSignInRequired({ status: 404 })).toBe(false);
    expect(isSignInRequired(null)).toBe(false);
  });

  it('sends the visitor to sign in and back to the same page', () => {
    render(<SignInRequired />);
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login?return=%2Fshowroom%2Fabebe-coffee');
    expect(screen.getByRole('link', { name: 'Join free' }).getAttribute('href')).toBe('/register?return=%2Fshowroom%2Fabebe-coffee');
  });
});

describe('VisibilityFieldset', () => {
  it('treats anything but "private" as public', () => {
    expect(asVisibility('private')).toBe('private');
    expect(asVisibility(undefined)).toBe('public');
    expect(asVisibility('friends')).toBe('public');
  });

  it('lets the owner switch to private', () => {
    const onChange = vi.fn();
    render(<VisibilityFieldset value="public" onChange={onChange} />);
    expect((screen.getByRole('radio', { name: /Public/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: /Private/ }));
    expect(onChange).toHaveBeenCalledWith('private');
  });
});
