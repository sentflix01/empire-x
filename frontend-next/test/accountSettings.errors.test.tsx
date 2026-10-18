/**
 * Regression: the api client rejects with the response body itself (see
 * api/client.ts), so reading `err.response?.data` always fell through to the
 * generic fallback and the server's "Current password is incorrect" was lost.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const { put, toastError } = vi.hoisted(() => ({ put: vi.fn(), toastError: vi.fn() }));

vi.mock('@/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put },
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue('test-token'),
}));
vi.mock('@/api/entities', () => ({
  entities: { UserProfile: { filter: vi.fn().mockResolvedValue([]) } },
}));
vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', full_name: 'Test User', email: 'test@example.com' } }),
}));
vi.mock('@/lib/push', () => ({
  getPushPermission: () => 'default',
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));

import AccountSettings from '@/views/AccountSettings';

async function submitPasswordChange() {
  render(<AccountSettings />);
  fireEvent.click(screen.getByRole('button', { name: /Change Password/i }));
  fireEvent.change(screen.getByPlaceholderText('Enter current password'), { target: { value: 'wrong-pass' } });
  fireEvent.change(screen.getByPlaceholderText('At least 6 characters'), { target: { value: 'new-password-1' } });
  fireEvent.change(screen.getByPlaceholderText('Repeat new password'), { target: { value: 'new-password-1' } });
  const submit = screen.getAllByRole('button', { name: /Change Password/i }).find(b => b.getAttribute('type') === 'submit')!;
  fireEvent.click(submit);
}

describe('AccountSettings change password errors', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows the server message from the rejected response body', async () => {
    put.mockRejectedValueOnce({ error: 'Current password is incorrect', code: 'VALIDATION_ERROR', status: 422 });
    await submitPasswordChange();
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Current password is incorrect'));
  });

  it('falls back to the generic message on a network failure', async () => {
    put.mockRejectedValueOnce(new Error('Network Error'));
    await submitPasswordChange();
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Failed to change password'));
  });
});
