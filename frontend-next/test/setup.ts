import '@testing-library/jest-dom/vitest';

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
