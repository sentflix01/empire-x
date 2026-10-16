/**
 * Onboarding is personal-only: no account-type or business steps, the real
 * logo instead of a crown, and an existing profile's business flag is kept.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1', full_name: 'Sent Reader' } }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const profiles = vi.hoisted(() => ({ filter: vi.fn(), update: vi.fn(), create: vi.fn() }));
vi.mock('@/api/entities', () => ({ entities: { UserProfile: profiles } }));

import Onboarding from '@/views/Onboarding';

describe('Onboarding', () => {
  beforeEach(() => { push.mockReset(); profiles.filter.mockReset(); profiles.update.mockReset(); profiles.create.mockReset(); });

  it('opens straight on personal information with the brand logo', () => {
    render(<Onboarding />);
    expect(screen.getByRole('heading', { name: 'Personal Information' })).toBeTruthy();
    expect(screen.queryByText(/Choose Your Account Type/i)).toBeNull();
    expect(screen.queryByText(/Business Profile/i)).toBeNull();
    expect(screen.getByRole('img', { name: 'Nodbusiness' })).toBeTruthy();
    expect(document.body.textContent).not.toContain('\u{1F451}');
    expect((screen.getByLabelText('Full Name') as HTMLInputElement).value).toBe('Sent Reader');
  });

  it('creates a personal profile', async () => {
    profiles.filter.mockResolvedValue([]);
    profiles.create.mockResolvedValue({});
    render(<Onboarding />);
    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'Reader' } });
    fireEvent.click(screen.getByRole('button', { name: /Create My Profile/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/feed'));
    expect(profiles.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', headline: 'Reader', profile_type: 'personal', has_business_profile: false }));
  });

  it('updates an existing profile without touching its business flag', async () => {
    profiles.filter.mockResolvedValue([{ id: 'profile-1' }]);
    profiles.update.mockResolvedValue({});
    render(<Onboarding />);
    fireEvent.click(screen.getByRole('button', { name: /Create My Profile/ }));
    await waitFor(() => expect(profiles.update).toHaveBeenCalled());
    const [, data] = profiles.update.mock.calls[0];
    expect(data).not.toHaveProperty('has_business_profile');
    expect(data).not.toHaveProperty('profile_type');
  });
});
