/**
 * Wallet top-up form tests
 * Feature: professional-grade-upgrade
 * Requirements: 4.4, 4.6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { balance: 0, currency: 'ETB', transactions: [] } }),
    post: vi.fn().mockResolvedValue({ data: { checkout_url: 'https://chapa.co/checkout/test' } }),
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

describe('Wallet top-up form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the wallet page with top-up tab', async () => {
    render(<Wallet />);
    expect(await screen.findByRole('heading', { name: 'wallet.title' })).toBeTruthy();
    expect(screen.getByText('wallet.availableBalance')).toBeTruthy();
  });

  it('Chapa top-up button is disabled when amount is empty', async () => {
    render(<Wallet />);
    await screen.findByRole('heading', { name: 'wallet.title' });
    fireEvent.click(screen.getByRole('button', { name: 'wallet.topUp' }));
    const chapaButton = await screen.findByRole('button', { name: /Top Up with Chapa/i });
    expect((chapaButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('Chapa top-up button enables when valid amount is entered', async () => {
    render(<Wallet />);
    await screen.findByRole('heading', { name: 'wallet.title' });
    fireEvent.click(screen.getByRole('button', { name: 'wallet.topUp' }));
    fireEvent.change(await screen.findByRole('spinbutton'), { target: { value: '100' } });
    await waitFor(() => {
      expect((screen.getByRole('button', { name: /Top Up with Chapa/i }) as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
