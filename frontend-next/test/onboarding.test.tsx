/**
 * Onboarding (new-user audit NU-1, NU-21): one question — the name — with the
 * other details optional and folded away; personal-only; the real logo; an
 * existing profile's business flag is kept; a phone needs digits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }), useSearchParams: () => new URLSearchParams('') }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k) }) }));
const refreshUser = vi.fn();
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1', full_name: 'Sent Reader' }, refreshUser }) }));
const put = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock('@/lib/api/client', () => ({ default: { put } }));
const profiles = vi.hoisted(() => ({ filter: vi.fn(), update: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/api/entities', () => ({ entities: { UserProfile: profiles } }));

import Onboarding from '@/views/Onboarding';

describe('Onboarding', () => {
  beforeEach(() => { replace.mockReset(); profiles.filter.mockReset(); profiles.update.mockReset(); profiles.create.mockReset(); });

  it('asks one question, with the brand logo and no business steps', () => {
    render(<Onboarding />);
    expect(screen.getByRole('heading', { name: /What should people call you/ })).toBeTruthy();
    expect(screen.queryByText(/Choose Your Account Type/i)).toBeNull();
    expect(screen.getByLabelText('Nodbusiness')).toBeTruthy();
    expect((screen.getByLabelText('Your name') as HTMLInputElement).value).toBe('Sent Reader');
    expect(screen.queryByLabelText('Headline')).toBeNull(); // optional details folded away
    expect(screen.queryByRole('link', { name: /Back to feed/ })).toBeNull(); // no loop back for a new user
  });

  it('creates a personal profile and goes to the feed', async () => {
    profiles.filter.mockResolvedValue([]);
    profiles.create.mockResolvedValue({});
    render(<Onboarding />);
    fireEvent.click(screen.getByRole('button', { name: /Add more about you/ }));
    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'Reader' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/feed'));
    expect(profiles.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', headline: 'Reader', profile_type: 'personal', has_business_profile: false }));
  });

  it('says what is missing instead of a dead button', async () => {
    render(<Onboarding />);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Add the name/);
    expect(profiles.create).not.toHaveBeenCalled();
  });

  it('checks the phone has digits', async () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByRole('button', { name: /Add more about you/ }));
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: 'call me' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/digits/);
  });

  it('updates an existing profile without touching its business flag', async () => {
    profiles.filter.mockResolvedValue([{ id: 'profile-1' }]);
    profiles.update.mockResolvedValue({});
    render(<Onboarding />);
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await waitFor(() => expect(profiles.update).toHaveBeenCalled());
    const [, data] = profiles.update.mock.calls[0];
    expect(data).not.toHaveProperty('has_business_profile');
    expect(data).not.toHaveProperty('profile_type');
  });

  it('saves a new name on the account too, so the header shows it at once', async () => {
    profiles.filter.mockResolvedValue([]);
    profiles.create.mockResolvedValue({});
    render(<Onboarding />);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Selam Bekele' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await waitFor(() => expect(put).toHaveBeenCalledWith('/api/auth/update-name', { full_name: 'Selam Bekele' }));
  });
});
