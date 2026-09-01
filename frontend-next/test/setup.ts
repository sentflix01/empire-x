import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Configurable mock for next/navigation
const searchParamsStore = new Map<string, string>();

// Mock next/navigation for components using useSearchParams, usePathname, useRouter
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => searchParamsStore.get(key) ?? null,
    getAll: (key: string) => searchParamsStore.has(key) ? [searchParamsStore.get(key)!] : [],
    has: (key: string) => searchParamsStore.has(key),
    keys: () => searchParamsStore.keys(),
    values: () => searchParamsStore.values(),
    entries: () => searchParamsStore.entries(),
    forEach: (cb: (value: string, key: string) => void) => searchParamsStore.forEach(cb),
    toString: () => new URLSearchParams(Array.from(searchParamsStore.entries())).toString(),
    [Symbol.iterator]: () => searchParamsStore.entries(),
  } as unknown as URLSearchParams),
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  // Test helper to set search params
  __setSearchParams: (params: Record<string, string>) => {
    searchParamsStore.clear();
    Object.entries(params).forEach(([k, v]) => searchParamsStore.set(k, v));
  },
  __clearSearchParams: () => searchParamsStore.clear(),
}));

// Export helpers for tests
export const setSearchParams = (params: Record<string, string>) => {
  searchParamsStore.clear();
  Object.entries(params).forEach(([k, v]) => searchParamsStore.set(k, v));
};

export const clearSearchParams = () => searchParamsStore.clear();

if (typeof global.ResizeObserver === 'undefined') {
  class ResizeObserver {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe() {
      return null;
    }

    unobserve() {
      return null;
    }

    disconnect() {
      return null;
    }
  }

  global.ResizeObserver = ResizeObserver as unknown as typeof global.ResizeObserver;
}
