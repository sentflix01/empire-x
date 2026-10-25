/**
 * A full-screen chat follows the visible area (address bar, keyboard) and
 * stops the page behind it from scrolling, then puts everything back.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatViewport } from '@/lib/useChatViewport';

type Listener = () => void;
let listeners: Record<string, Listener[]>;
const vv = { height: 700, offsetTop: 0, addEventListener: (t: string, f: Listener) => { (listeners[t] ||= []).push(f); }, removeEventListener: (t: string, f: Listener) => { listeners[t] = (listeners[t] || []).filter((x) => x !== f); } };

beforeEach(() => {
  listeners = {};
  vv.height = 700; vv.offsetTop = 0;
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 1; });
  document.body.style.overflow = 'auto';
});
afterEach(() => { vi.restoreAllMocks(); });

const css = (name: string) => document.documentElement.style.getPropertyValue(name);

describe('useChatViewport', () => {
  it('sizes the chat to the visible area and follows the keyboard', () => {
    const { unmount } = renderHook(() => useChatViewport());
    expect(css('--chat-vh')).toBe('700px');
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
    act(() => { vv.height = 380; vv.offsetTop = 12; listeners.resize.forEach((f) => f()); });
    expect(css('--chat-vh')).toBe('380px');
    expect(css('--chat-top')).toBe('12px');
    unmount();
    expect(css('--chat-vh')).toBe('');
    expect(document.body.style.overflow).toBe('auto');
    expect(document.documentElement.style.overflow).toBe('');
    expect(listeners.resize).toHaveLength(0);
  });

  it('does nothing when turned off', () => {
    renderHook(() => useChatViewport(false));
    expect(css('--chat-vh')).toBe('');
    expect(document.body.style.overflow).toBe('auto');
  });
});
