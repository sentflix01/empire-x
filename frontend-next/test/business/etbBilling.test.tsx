/**
 * Prepaid ETB plans through Chapa on the owner's screens: the checkout panel
 * prices months through the server, the return page waits for confirmation,
 * and billing history links paid receipts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

const api = vi.hoisted(() => ({
  getQuote: vi.fn(),
  startChapaCheckout: vi.fn(),
  getPaymentStatus: vi.fn(),
  getPayments: vi.fn(),
  getReceipt: vi.fn(),
  getTestMode: vi.fn(),
}));
vi.mock('@/lib/etbBilling', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
const search = vi.hoisted(() => ({ value: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => search.value, useParams: () => ({ id: 'pay-1' }) }));

import ChapaCheckoutPanel from '@/components/business/ChapaCheckoutPanel';
import BillingHistory from '@/components/business/BillingHistory';
import SubscriptionReturn from '@/views/SubscriptionReturn';

const quote = (over: object = {}) => ({
  kind: 'new', tier: 'premium', months: 1, amount: 500, periodStart: new Date().toISOString(),
  periodEnd: '2027-01-01T00:00:00Z', currency: 'ETB', businessId: 'biz-1', ...over,
});

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.getTestMode.mockResolvedValue({ ETB: false, USD: false });
});

describe('ChapaCheckoutPanel', () => {
  it('shows the server price and re-prices when the months change', async () => {
    api.getQuote.mockImplementation(async (_b: string, _p: string, months: number) => quote({ months, amount: 500 * months }));
    render(<ChapaCheckoutPanel businessId="biz-1" plan="premium" onClose={() => {}} />);
    expect(await screen.findByText('500 ETB')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('6 months'));
    expect(await screen.findByText('3,000 ETB')).toBeTruthy();
    expect(api.getQuote).toHaveBeenLastCalledWith('biz-1', 'premium', 6);
    expect(screen.getByRole('button', { name: 'Pay 3,000 ETB with Chapa' })).toBeTruthy();
  });

  it('starts the Chapa checkout with the draft to publish', async () => {
    api.getQuote.mockResolvedValue(quote());
    api.startChapaCheckout.mockResolvedValue({ checkout_url: 'https://checkout.chapa.co/x', tx_ref: 'nbsub-1' });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, set href(v: string) { assign(v); } } });
    try {
      render(<ChapaCheckoutPanel businessId="biz-1" plan="premium" draftId="draft-9" onClose={() => {}} />);
      fireEvent.click(await screen.findByRole('button', { name: /Pay 500 ETB with Chapa/ }));
      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://checkout.chapa.co/x'));
      expect(api.startChapaCheckout).toHaveBeenCalledWith({ businessId: 'biz-1', plan: 'premium', months: 1, draftId: 'draft-9' });
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });

  it('offers to pay only the difference when upgrading', async () => {
    api.getQuote.mockImplementation(async (_b: string, _p: string, months: number) => quote({ kind: 'upgrade', months, amount: 450 + 1000 * months }));
    render(<ChapaCheckoutPanel businessId="biz-1" plan="pro" onClose={() => {}} />);
    fireEvent.click(await screen.findByLabelText('No extra months'));
    expect(await screen.findByText('450 ETB')).toBeTruthy();
    expect(screen.getByText(/Only the price difference/)).toBeTruthy();
  });

  it('lists Chapa test numbers and cards only in test mode', async () => {
    api.getQuote.mockResolvedValue(quote());
    const { unmount } = render(<ChapaCheckoutPanel businessId="biz-1" plan="premium" onClose={() => {}} />);
    await screen.findByText('500 ETB');
    expect(screen.queryByRole('region', { name: 'Test mode payment details' })).toBeNull();
    unmount();

    render(<ChapaCheckoutPanel businessId="biz-1" plan="premium" testMode onClose={() => {}} />);
    expect(await screen.findByRole('region', { name: 'Test mode payment details' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /test number 0900123456/ }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('tab', { name: 'Card' }));
    expect(screen.getByRole('button', { name: 'Copy Visa card number' })).toBeTruthy();
  });

  it('shows why a plan cannot be bought', async () => {
    api.getQuote.mockRejectedValue({ error: 'downgrade_not_allowed', message: 'You can move to a lower plan when your current period ends.', status: 400 });
    render(<ChapaCheckoutPanel businessId="biz-1" plan="normal" onClose={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'You can move to a lower plan when your current period ends.');
    expect((screen.getByRole('button', { name: 'Pay with Chapa' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('SubscriptionReturn', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); search.value = new URLSearchParams('tx_ref=nbsub-1&businessId=biz-1'); });
  afterEach(() => { vi.useRealTimers(); });

  it('waits while Chapa confirms, then shows the receipt and the published site', async () => {
    const paid = { status: 'paid', tier: 'premium', amount: '500.00', receipt_number: 'NB-2026-000007', period_end: '2027-01-01T00:00:00Z', business_id: 'biz-1', payment_id: 'pay-1', draft_id: 'site-3' };
    api.getPaymentStatus.mockResolvedValueOnce({ ...paid, status: 'pending' }).mockResolvedValue(paid);
    render(<SubscriptionReturn />);
    expect(await screen.findByText('Checking your payment…')).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(await screen.findByRole('heading', { name: 'Payment received' })).toBeTruthy();
    expect(screen.getByText('NB-2026-000007')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View your website' }).getAttribute('href')).toBe('/showrooms/site-3');
    expect(screen.getByRole('link', { name: 'View receipt' }).getAttribute('href')).toBe('/business/subscription/receipt/pay-1');
  });

  it('lets the owner go back to an unfinished Chapa payment', async () => {
    api.getTestMode.mockResolvedValue({ ETB: true, USD: false });
    api.getPaymentStatus.mockResolvedValue({ status: 'pending', business_id: 'biz-1', draft_id: null, checkout_url: 'https://checkout.chapa.co/resume' });
    render(<SubscriptionReturn />);
    expect((await screen.findByRole('link', { name: 'Continue payment' })).getAttribute('href')).toBe('https://checkout.chapa.co/resume');
    expect(screen.getByRole('button', { name: 'Check again' })).toBeTruthy();
    expect(await screen.findByRole('region', { name: 'Test mode payment details' })).toBeTruthy();
  });

  it('explains a failed payment and offers to try again', async () => {
    api.getPaymentStatus.mockResolvedValue({ status: 'failed', business_id: 'biz-1', draft_id: null });
    render(<SubscriptionReturn />);
    expect(await screen.findByRole('heading', { name: /didn.t go through/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Try again' }).getAttribute('href')).toBe('/business/subscription?businessId=biz-1');
  });
});

describe('BillingHistory', () => {
  it('lists payments with receipts for paid ones', async () => {
    api.getPayments.mockResolvedValue([
      { id: 'p1', kind: 'renewal', tier: 'normal', months: 3, amount: '300.00', currency: 'ETB', status: 'paid', provider: 'chapa', receipt_number: 'NB-2026-000001', period_start: null, period_end: '2027-02-01T00:00:00Z', paid_at: '2026-11-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z' },
      { id: 'p2', kind: 'new', tier: 'pro', months: 1, amount: '1000.00', currency: 'ETB', status: 'failed', provider: 'chapa', receipt_number: null, period_start: null, period_end: null, paid_at: null, created_at: '2026-10-30T00:00:00Z' },
    ]);
    render(<BillingHistory businessId="biz-1" />);
    expect(await screen.findByText('Normal · 3 months (renewal)')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Receipt/ })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Receipt/ }).getAttribute('href')).toBe('/business/subscription/receipt/p1');
    expect(screen.getByText('Failed')).toBeTruthy();
  });

  it('offers Continue payment on an unfinished payment', async () => {
    api.getPayments.mockResolvedValue([
      { id: 'p3', kind: 'new', tier: 'pro', months: 1, amount: '1000.00', currency: 'ETB', status: 'pending', provider: 'chapa', receipt_number: null, checkout_url: 'https://checkout.chapa.co/p3', period_start: null, period_end: null, paid_at: null, created_at: '2026-10-30T00:00:00Z' },
    ]);
    render(<BillingHistory businessId="biz-1" />);
    expect((await screen.findByRole('link', { name: 'Continue payment' })).getAttribute('href')).toBe('https://checkout.chapa.co/p3');
  });
});
