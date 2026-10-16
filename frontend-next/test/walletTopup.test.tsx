/**
 * Wallet is withdraw-only: NodBusiness never takes money in
 * (docs/decisions/platform-model-decisions.md, decision 7). Existing balances
 * can still be withdrawn; there is no top-up.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { balance: 0, currency: 'ETB', transactions: [] } }),
    post: vi.fn(),
  },
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue('test-token'),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Wallet from '@/views/Wallet';

describe('Wallet (withdraw-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the balance and a withdraw tab', async () => {
    render(<Wallet />);
    expect(await screen.findByRole('heading', { name: 'wallet.title' })).toBeTruthy();
    expect(screen.getByText('wallet.availableBalance')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'wallet.withdraw' })).toBeTruthy();
  });

  it('offers no way to add money', async () => {
    render(<Wallet />);
    await screen.findByRole('heading', { name: 'wallet.title' });
    expect(screen.queryByRole('button', { name: 'wallet.topUp' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Top Up/i })).toBeNull();
  });
});
