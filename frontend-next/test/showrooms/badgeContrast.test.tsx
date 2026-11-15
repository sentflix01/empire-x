/**
 * The category badge on a showroom card stays readable on any header
 * (WCAG 1.4.3). With no cover image the header is the light `primary-subtle`
 * tint; white 10 px text on a 40% black scrim was 3.05:1 there and failed
 * axe on /showrooms in production (2026-11-14). The scrim must give at least
 * 4.5:1 over the lightest background a cover can have: white.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/lib/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  apiFetch: vi.fn(),
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));
vi.mock('@/lib/api/entities', () => ({ entities: { Showroom: { filter: vi.fn() } } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: null, authChecked: true }) }));
vi.mock('@/components/ui/BookmarkButton', () => ({ default: () => null }));
vi.mock('@/components/showroom/ShowroomDoctorPanel', () => ({ default: () => null }));

import { entities } from '@/lib/api/entities';
import { contrastRatio, AA_TEXT } from '@/lib/contrast';
import Showrooms from '@/views/Showrooms';

const sites = [
  { id: 's1', owner_id: 'o1', title: 'No Cover', category: 'business', status: 'published', view_count: 0 },
  { id: 's2', owner_id: 'o2', title: 'With Cover', category: 'creative', status: 'published', view_count: 0, cover_image: 'https://example.test/cover.jpg' },
];

/** Black at `alpha` composited over an opaque hex background. */
function blendBlack(alpha: number, bg: string): string {
  const h = bg.replace('#', '');
  return '#' + [0, 2, 4]
    .map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0'))
    .join('');
}

function scrimAlpha(el: HTMLElement): number {
  const m = /(?:^|\s)bg-black\/(\d{1,3})(?:\s|$)/.exec(el.className);
  expect(m, `badge needs a bg-black/NN scrim, got "${el.className}"`).not.toBeNull();
  return Number(m![1]) / 100;
}

describe('Showroom card category badge', () => {
  beforeEach(() => {
    vi.mocked(entities.Showroom.filter).mockResolvedValue(sites as never);
  });

  it.each([['without a cover', 'Business'], ['with a cover', 'Creative']])('is solid white on a dark scrim %s', async (_case, label) => {
    render(<Showrooms />);
    const badge = await screen.findByText(label, { selector: 'span' });
    expect(badge.className).toMatch(/(?:^|\s)text-white(?:\s|$)/);
    const alpha = scrimAlpha(badge);
    // White (any bright photo) and the light primary-subtle tint (#eff6ff, no cover).
    for (const bg of ['#ffffff', '#eff6ff']) {
      expect(contrastRatio('#ffffff', blendBlack(alpha, bg))).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('would have caught the 40% scrim', () => {
    expect(contrastRatio('#ffffff', blendBlack(0.4, '#eff6ff'))).toBeLessThan(AA_TEXT);
  });
});
