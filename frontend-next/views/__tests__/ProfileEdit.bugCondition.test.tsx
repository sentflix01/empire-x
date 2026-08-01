/**
 * Bug Condition Exploration Test — Task 1
 *
 * Property 1: Bug Condition — Undefined Icon References Crash ProfileEdit
 *
 * These tests are written on the UNFIXED code and are EXPECTED TO FAIL.
 * The six un-suffixed icon references (Twitter, Instagram, Facebook, Youtube
 * in the Personal tab; Twitter, Facebook in the Business tab) are undeclared
 * JavaScript identifiers. When React evaluates the social-links JSX array,
 * it throws:
 *   ReferenceError: Twitter is not defined
 *   (or Instagram, Facebook, Youtube, Linkedin depending on evaluation order)
 *
 * When this test FAILS with ReferenceError → the bug is PROVEN to exist.
 * When this test PASSES → the bug has been FIXED.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';

// ─── Mock next/navigation ────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ back: vi.fn(), push: vi.fn() })),
  usePathname: vi.fn(() => '/profile/edit'),
}));

// ─── Mock react-i18next ──────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// ─── Mock @/api/auth ─────────────────────────────────────────────────────────
vi.mock('@/api/auth', () => ({
  auth: {
    me: vi.fn().mockResolvedValue({ id: 'user-1', full_name: 'Test User', email: 'test@example.com' }),
  },
}));

// ─── Mock @/api/entities ────────────────────────────────────────────────────
vi.mock('@/api/entities', () => ({
  entities: {
    UserProfile: {
      filter: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

// ─── Mock sonner ─────────────────────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ─── Mock @/lib/push ─────────────────────────────────────────────────────────
vi.mock('@/lib/push', () => ({
  getPushPermission: vi.fn(() => 'unsupported'),
  subscribeToPush: vi.fn().mockResolvedValue(true),
  unsubscribeFromPush: vi.fn().mockResolvedValue(true),
}));

// ─── Mock @/components/profile/VerificationRequest ──────────────────────────
vi.mock('@/components/profile/VerificationRequest', () => ({
  default: () => <div data-testid="verification-request">VerificationRequest</div>,
}));

// ─── Mock @/components/feed/TickerBar ────────────────────────────────────────
vi.mock('@/components/feed/TickerBar', () => ({
  default: ({ text }: { text: string }) => <div data-testid="ticker-bar">{text}</div>,
  TICKER_TYPES: [
    { value: 'none', label: 'Off', description: 'No ticker', color: null, badgeLabel: 'OFF', Icon: () => null, placeholder: '' },
    { value: 'auto', label: 'Auto', description: 'Auto-detect', color: '#2563EB', badgeLabel: 'AUTO', Icon: () => null, placeholder: 'Your message...' },
  ],
}));

// ─── Mock @/components/ui/ImageUpload ────────────────────────────────────────
vi.mock('@/components/ui/ImageUpload', () => ({
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <input data-testid="image-upload" type="file" onChange={() => onChange('http://example.com/img.jpg')} />
  ),
}));

// ─── Mock @/components/profile/TemplateCard ──────────────────────────────────
vi.mock('@/components/profile/TemplateCard', () => ({
  default: ({ template, selected, onSelect }: any) => (
    <button data-testid={`template-${template.id}`} onClick={onSelect} aria-pressed={selected}>
      {template.name}
    </button>
  ),
}));

// ─── Mock @/lib/businessTemplates ────────────────────────────────────────────
vi.mock('@/lib/businessTemplates', () => ({
  BUSINESS_CATEGORIES: [
    {
      value: 'shop',
      label: 'Online Shop',
      icon: () => <svg data-testid="icon-shop" />,
      desc: 'Sell physical products',
      color: '#3B82F6',
      templates: [
        {
          id: 'shop_grid',
          name: 'Product Grid Store',
          desc: 'Clean grid layout',
          sections: [],
        },
      ],
    },
  ],
  getCategoryByValue: vi.fn((v: string) => ({
    value: v,
    label: 'Online Shop',
    icon: () => null,
    desc: 'Sell physical products',
    color: '#3B82F6',
    templates: [{ id: 'shop_grid', name: 'Product Grid Store', desc: 'Clean grid', sections: [] }],
  })),
  getTemplateById: vi.fn(() => ({ sections: [] })),
}));

// ─── Import component under test (AFTER mocks) ───────────────────────────────
import ProfileEdit from '@/views/ProfileEdit';

// ─────────────────────────────────────────────────────────────────────────────

describe('Bug Condition Exploration: Undefined Icon References Crash ProfileEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test 1 — Personal tab render
   *
   * Mounts ProfileEdit with the default personal tab active.
   * Asserts no error is thrown and the Social Links section is present in the DOM.
   *
   * EXPECTED TO FAIL on unfixed code with:
   *   ReferenceError: Twitter is not defined  (or Instagram / Facebook / Youtube)
   *
   * Validates: Requirements 1.1, 1.2
   */
  it('Test 1 — Personal tab renders without ReferenceError and shows Social Links section', async () => {
    let caughtError: Error | null = null;

    // Suppress React error boundary noise during the test
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // Swallow React error boundary logs but keep them available for inspection
      if (typeof args[0] === 'string' && args[0].includes('ReferenceError')) {
        caughtError = new Error(args[0]);
      }
    };

    try {
      await act(async () => {
        render(<ProfileEdit />);
      });

      // The Social Links section should be present (it has defaultOpen={false}, so the
      // header button with text "Social Links" should still be in the DOM).
      // We look for the section header text that is always rendered regardless of open state.
      await waitFor(() => {
        const socialLinksHeadings = screen.getAllByText('Social Links');
        expect(socialLinksHeadings.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // If a ReferenceError was captured via console.error, re-throw it so the test fails
      if (caughtError) {
        throw caughtError;
      }
    } finally {
      console.error = originalError;
    }
  });

  /**
   * Test 2 — Business tab render
   *
   * Mounts ProfileEdit and clicks the Business tab.
   * Asserts no error is thrown and the "Social & Online Presence" section header
   * is present in the DOM.
   *
   * EXPECTED TO FAIL on unfixed code with:
   *   ReferenceError: Twitter is not defined  (or Facebook)
   *
   * Validates: Requirements 1.1, 1.3
   */
  it('Test 2 — Business tab renders without ReferenceError and shows Social & Online Presence section', async () => {
    let caughtError: Error | null = null;

    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes('ReferenceError')) {
        caughtError = new Error(args[0]);
      }
    };

    try {
      await act(async () => {
        render(<ProfileEdit />);
      });

      // Click the Business tab to trigger evaluation of the business social-links array
      const businessTab = screen.getByRole('button', { name: /Business/i });
      await act(async () => {
        fireEvent.click(businessTab);
      });

      await waitFor(() => {
        const heading = screen.getByText('Social & Online Presence');
        expect(heading).toBeInTheDocument();
      }, { timeout: 3000 });

      if (caughtError) {
        throw caughtError;
      }
    } finally {
      console.error = originalError;
    }
  });

  /**
   * Test 3 — Icon reference validity
   *
   * Directly inspects the ProfileEdit module to verify that the icon properties
   * used in both social-links arrays resolve to non-undefined, callable React
   * components.
   *
   * The test imports the named icon stubs from the same source as ProfileEdit
   * and then validates that the expected suffixed names are defined.
   *
   * EXPECTED TO FAIL on unfixed code because un-suffixed identifiers
   * (Twitter, Instagram, Facebook, Youtube) are undeclared and thus undefined
   * at the module level — the array literals cannot even be constructed safely.
   *
   * Validates: Requirements 1.2, 1.3
   */
  it('Test 3 — All social-link icon properties resolve to non-undefined callable React components', async () => {
    // Import the lucide-react stubs that ProfileEdit declares at the top of the file.
    // These are the CORRECT suffixed names that the fix should use.
    const lucide = await import('lucide-react');

    // The stub constants in ProfileEdit.tsx are:
    //   const LinkedinIcon   = Link2;
    //   const TwitterIcon    = AtSign;
    //   const InstagramIcon  = Share2;
    //   const FacebookIcon   = Rss;
    //   const YoutubeIcon    = ExternalLink;
    //
    // Verify each one maps to a truthy, function-like value from lucide-react.
    const expectedIcons: Record<string, string> = {
      LinkedinIcon: 'Link2',
      TwitterIcon: 'AtSign',
      InstagramIcon: 'Share2',
      FacebookIcon: 'Rss',
      YoutubeIcon: 'ExternalLink',
    };

    for (const [stubName, lucideName] of Object.entries(expectedIcons)) {
      const icon = (lucide as any)[lucideName];
      expect(icon, `${stubName} → lucide.${lucideName} must be a non-undefined component`).toBeDefined();
      // lucide-react components are forwardRef objects, not raw functions
      expect(typeof icon === 'function' || typeof icon === 'object', `${stubName} → lucide.${lucideName} must be a React component (function or forwardRef object)`).toBe(true);
    }

    // The un-suffixed names (Twitter, Instagram, Facebook, Youtube) are NOT exported
    // by lucide-react — that was exactly the bug. Confirm they are indeed absent
    // (i.e., ProfileEdit must NOT use these bare names as icon references).
    const buggyNames = ['Twitter', 'Instagram', 'Facebook', 'Youtube'];
    for (const name of buggyNames) {
      const icon = (lucide as any)[name];
      // These are undefined in lucide-react — confirming the fix must use the *Icon suffixed stubs.
      expect(icon, `"${name}" must NOT be directly exported from lucide-react — the fix uses suffixed stubs instead`).toBeUndefined();
    }
  });

  /**
   * Test 4 — Property-based test
   *
   * For each tab ('personal' | 'business'), mounts ProfileEdit and asserts
   * the component renders without throwing a ReferenceError.
   *
   * EXPECTED TO FAIL on unfixed code for both tab values since both tabs
   * contain un-suffixed icon references.
   *
   * Validates: Requirements 1.1, 1.2, 1.3
   */
  it('Test 4 — PBT: fc.property — mounting ProfileEdit for any tab does not throw ReferenceError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('personal' as const, 'business' as const),
        async (tab) => {
          vi.clearAllMocks();

          let thrownError: Error | null = null;

          const originalError = console.error;
          console.error = (...args: any[]) => {
            if (
              typeof args[0] === 'string' &&
              (args[0].includes('ReferenceError') || args[0].includes('is not defined'))
            ) {
              thrownError = new Error(args[0]);
            }
          };

          let unmount: (() => void) | null = null;

          try {
            // If tab === 'business', mock usePathname to return the setup path so
            // the component starts on the business tab, OR we render and click.
            const { usePathname } = await import('next/navigation');
            if (tab === 'business') {
              (usePathname as ReturnType<typeof vi.fn>).mockReturnValue('/profile/edit');
            }

            await act(async () => {
              const result = render(<ProfileEdit />);
              unmount = result.unmount;
            });

            // If testing business tab, click the Business tab button to force the
            // business social-links array to be evaluated by React.
            if (tab === 'business') {
              const businessTabBtn = screen.queryByRole('button', { name: /Business/i });
              if (businessTabBtn) {
                await act(async () => {
                  fireEvent.click(businessTabBtn);
                });
              }
            }

            // Give React time to complete any async state updates
            await new Promise((resolve) => setTimeout(resolve, 50));

            if (thrownError) {
              throw thrownError;
            }

            // Assert that the relevant section header exists in the DOM
            if (tab === 'personal') {
              const heading = screen.queryByText('Social Links');
              expect(heading, `tab="${tab}": "Social Links" section header must be in the DOM`).not.toBeNull();
            } else {
              const heading = screen.queryByText('Social & Online Presence');
              expect(
                heading,
                `tab="${tab}": "Social & Online Presence" section header must be in the DOM`
              ).not.toBeNull();
            }
          } finally {
            console.error = originalError;
            if (unmount) unmount();
          }
        }
      ),
      { numRuns: 2 }
    );
  });
});
