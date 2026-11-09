/**
 * Messages badge start-up (performance audit 2026-11-09): the count used to be
 * requested twice on every app load — once on mount and again when the socket
 * connected a moment later. A real reconnect later still refreshes it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const get = vi.fn(() => Promise.resolve({ data: { chats: 1, messages: 2, requests: 0 } }));
const post = vi.fn(() => Promise.resolve({ data: {} }));
vi.mock('@/api/client', () => ({ default: { get: (...a: unknown[]) => get(...(a as [])), post: (...a: unknown[]) => post(...(a as [])) } }));

const handlers: Record<string, Array<() => void>> = {};
const socket = {
  connected: false,
  on: (ev: string, fn: () => void) => { (handlers[ev] ??= []).push(fn); },
  off: vi.fn(),
};
vi.mock('@/lib/socket', () => ({ connectSocket: vi.fn(), getSocket: () => socket }));

import { useMessagesBadge } from '@/lib/useMessagesBadge';

const countCalls = () => get.mock.calls.filter((c) => (c as unknown[])[0] === '/api/messages/unread-count').length;
const fire = (ev: string) => act(() => { for (const fn of handlers[ev] ?? []) fn(); });

describe('useMessagesBadge', () => {
  beforeEach(() => { vi.useFakeTimers(); get.mockClear(); post.mockClear(); for (const k of Object.keys(handlers)) delete handlers[k]; });
  afterEach(() => { vi.useRealTimers(); });

  it('asks for the count once when the socket connects right after mount', async () => {
    renderHook(() => useMessagesBadge('u1'));
    expect(countCalls()).toBe(1);
    fire('connect');
    expect(countCalls()).toBe(1);
    expect(post).toHaveBeenCalledWith('/api/messages/delivered', {});
  });

  it('refreshes the count on a later reconnect', async () => {
    renderHook(() => useMessagesBadge('u1'));
    await act(async () => { vi.advanceTimersByTime(5000); });
    fire('connect');
    expect(countCalls()).toBe(2);
  });
});
