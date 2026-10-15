import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BusinessSubscriptionPage from '@/views/BusinessSubscription';

const { api, route } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  route: { searchParams: new URLSearchParams() },
}));

vi.mock('@/api/client', () => ({ default: api }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner-1' } }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => route.searchParams,
}));

const plans = {
  freemium: {
    tier: 'freemium',
    label: 'Free',
    prices: { ETB: 0, USD: 0 },
    currencyAvailability: { ETB: true, USD: true },
    features: [],
  },
  normal_monthly: {
    tier: 'normal',
    label: 'Normal',
    prices: { ETB: 100, USD: 1 },
    currencyAvailability: { ETB: true, USD: true },
    features: [],
  },
  premium_monthly: {
    tier: 'premium',
    label: 'Premium',
    prices: { ETB: 500, USD: 5 },
    currencyAvailability: { ETB: true, USD: true },
    features: [],
  },
  pro_monthly: {
    tier: 'pro',
    label: 'Pro',
    prices: { ETB: 1000, USD: 10 },
    currencyAvailability: { ETB: true, USD: true },
    features: [],
  },
  enterprise: {
    label: 'Enterprise',
    prices: { ETB: null, USD: null },
    pricingCurrencies: ['ETB', 'USD'],
    features: [],
    contactRequired: true,
  },
};

describe('business subscription billing currency', () => {
  beforeEach(() => {
    api.get.mockReset().mockImplementation((url: string) => Promise.resolve({
      data: url === '/api/businesses'
        ? [{ id: 'business-1', business_name: 'Example business' }]
        : url === '/api/subscriptions/plans'
          ? plans
          : {
            tier: 'normal',
            currency: 'ETB',
            status: 'active',
            current_period_end: null,
            cancel_at_period_end: false,
            product_count: 0,
            storage_used_bytes: 0,
          },
    }));
    api.post.mockReset();
    route.searchParams = new URLSearchParams();
  });

  it('updates displayed prices when the user selects USD', async () => {
    const user = userEvent.setup();
    render(<BusinessSubscriptionPage />);

    const currencySelect = await screen.findByLabelText('Billing currency');
    await waitFor(() => expect(document.body.textContent).toContain('Billing currency: ETB'));
    expect(screen.getByText(/500 ETB/)).toBeInTheDocument();

    await user.selectOptions(currencySelect, 'USD');

    expect(screen.getAllByText(/USD \$1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/USD \$5/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/USD \$10/).length).toBeGreaterThan(0);
  });

  it('sends the selected currency when starting checkout', async () => {
    const user = userEvent.setup();
    api.post.mockReturnValue(new Promise(() => {}));
    render(<BusinessSubscriptionPage />);

    const currencySelect = await screen.findByLabelText('Billing currency');
    await user.selectOptions(currencySelect, 'USD');
    const premiumCard = screen.getByText('Premium', { selector: 'p' }).closest<HTMLDivElement>('.bg-card');
    if (!premiumCard) throw new Error('Premium plan card was not rendered');
    await user.click(within(premiumCard).getByRole('button', { name: 'Choose plan' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/subscriptions/create', expect.objectContaining({
      plan: 'premium_monthly',
      currency: 'USD',
      business_id: 'business-1',
    })));
  });
});
