/**
 * Bugs found while typing the remaining screens (F-052 follow-up 6):
 * - Telegram settings linked "Open Telegram Bot" to "#" and said
 *   "Connected to @undefined": GET /api/telegram/status sends neither a bot
 *   link nor a bot name;
 * - Referral showed "points earned" as invites x 50 instead of the points
 *   the API reports;
 * - the wallet balance and transaction amounts are decimal strings and
 *   printed unformatted ("1500.00").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));

import client from '@/api/client';
import TelegramSettings from '@/components/settings/TelegramSettings';
import Referral from '@/views/Referral';
import Wallet from '@/views/Wallet';
import ShareButton from '@/components/ui/ShareButton';

const answer = (routes: Record<string, unknown>) =>
  vi.mocked(client.get).mockImplementation((async (url: string) => {
    if (url in routes) return { data: routes[url] };
    return { data: [] };
  }) as never);

beforeEach(() => vi.mocked(client.get).mockReset());

describe('Telegram settings', () => {
  it('does not offer a bot link that goes nowhere', async () => {
    answer({ '/api/telegram/status': { connected: false, notifications_enabled: false, bot_configured: true } });
    render(<TelegramSettings />);
    expect(await screen.findByText(/Connecting Telegram is not available yet/)).toBeInTheDocument();
    expect(screen.queryByText('Open Telegram Bot')).toBeNull();
    expect(document.querySelector('a[href="#"]')).toBeNull();
  });

  it('offers the bot when the API sends a link', async () => {
    answer({ '/api/telegram/status': { connected: false, notifications_enabled: false, connect_url: 'https://t.me/example_bot?start=abc' } });
    render(<TelegramSettings />);
    const link = await screen.findByRole('link', { name: /Open Telegram Bot/ });
    expect(link.getAttribute('href')).toBe('https://t.me/example_bot?start=abc');
  });

  it('never says "@undefined" when connected', async () => {
    answer({ '/api/telegram/status': { connected: true, notifications_enabled: true } });
    render(<TelegramSettings />);
    expect(await screen.findByText(/Connected\. Type \/stop/)).toBeInTheDocument();
    expect(screen.queryByText(/@undefined/)).toBeNull();
  });
});

describe('Referral', () => {
  it('shows the points the API reports, not invites x 50', async () => {
    answer({
      '/api/referral/my-code': { code: 'ABCD1234', referral_link: 'https://example.test/register?ref=ABCD1234', referrals: 3, total_referred: 3, earned: 100 },
      '/api/profiles/me': { points: 120 },
    });
    render(<Referral />);
    expect(await screen.findByText('ABCD1234')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.queryByText('150')).toBeNull();
  });
});

describe('Wallet', () => {
  it('formats the balance and transaction amounts', async () => {
    answer({ '/api/wallet/me': {
      id: 'w1', balance: '1500000.00', currency: 'ETB',
      transactions: [{ id: 't1', type: 'credit', amount: '2500.50', description: 'Refund for order', created_at: new Date().toISOString() }],
    } });
    render(<Wallet />);
    expect(await screen.findByText((1500000).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(`+${(2500.5).toLocaleString()} ETB`)).toBeInTheDocument();
    expect(screen.queryByText(/1500000\.00/)).toBeNull();
  });
});

describe('ShareButton', () => {
  it('copies the page address read when clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    render(<ShareButton title="Coffee" />);
    window.history.pushState({}, '', '/products/p1');
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/products/p1`));
  });
});
