import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { installRequestInterceptor, ejectRequestInterceptor, handlers } = vi.hoisted(() => {
  const handlers: Array<(config: { headers: Record<string, unknown> }) => unknown> = [];
  return {
    handlers,
    installRequestInterceptor: vi.fn((handler: (config: { headers: Record<string, unknown> }) => unknown) => {
      handlers.push(handler);
      return handlers.length;
    }),
    ejectRequestInterceptor: vi.fn(),
  };
});

vi.mock('@/api/client', () => ({
  default: {
    interceptors: {
      request: {
        use: installRequestInterceptor,
        eject: ejectRequestInterceptor,
      },
    },
  },
}));

import { RealModeProvider, useRealMode } from '@/lib/RealModeContext';

function Probe() {
  const { realMode, toggleRealMode } = useRealMode();
  return (
    <div>
      <output>{realMode ? 'real' : 'all'}</output>
      <button onClick={toggleRealMode}>Toggle mode</button>
    </div>
  );
}

describe('RealModeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    handlers.length = 0;
    installRequestInterceptor.mockClear();
    ejectRequestInterceptor.mockClear();
  });

  it('installs the real-only request header before mounting page content when enabled in storage', async () => {
    localStorage.setItem('nodbusiness_real_mode', 'true');
    render(<RealModeProvider><Probe /></RealModeProvider>);

    await waitFor(() => expect(screen.getByText('real')).toBeTruthy());
    expect(installRequestInterceptor).toHaveBeenCalledTimes(1);
    const config = { headers: {} as Record<string, unknown> };
    handlers[0](config);
    expect(config.headers['X-Real-Only']).toBe('1');
  });

  it('switches the request header synchronously with the mode toggle', async () => {
    render(<RealModeProvider><Probe /></RealModeProvider>);
    await waitFor(() => expect(screen.getByText('all')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Toggle mode' }));

    await waitFor(() => expect(screen.getByText('real')).toBeTruthy());
    expect(installRequestInterceptor).toHaveBeenCalledTimes(1);
    const config = { headers: {} as Record<string, unknown> };
    handlers.at(-1)?.(config);
    expect(config.headers['X-Real-Only']).toBe('1');
  });
});
