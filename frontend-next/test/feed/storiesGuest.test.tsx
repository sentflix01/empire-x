/**
 * Stories are for signed-in people: the API answers guests with 401, which
 * also set off a token refresh attempt on every guest feed visit (performance
 * audit 2026-11-09). Guests no longer ask.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const list = vi.fn(() => Promise.resolve([]));
vi.mock('@/api/entities', () => ({ entities: { Story: { list: (...a: unknown[]) => list(...(a as [])), create: vi.fn() } } }));
vi.mock('@/api/client', () => ({ default: { get: vi.fn(() => Promise.resolve({ data: [] })), post: vi.fn(() => Promise.resolve({ data: {} })) } }));
const auth = { user: null as null | { id: string }, authChecked: true };
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => auth }));

import Stories from '@/views/Stories';

describe('Stories loading', () => {
  beforeEach(() => list.mockClear());

  it('does not request stories for guests', async () => {
    auth.user = null;
    render(<Stories />);
    await new Promise((r) => setTimeout(r, 20));
    expect(list).not.toHaveBeenCalled();
  });

  it('loads stories for signed-in people', async () => {
    auth.user = { id: 'u1' };
    render(<Stories />);
    await waitFor(() => expect(list).toHaveBeenCalledWith('-created_at', 200));
  });
});
