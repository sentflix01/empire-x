/**
 * The toast area is fixed over the bottom-right of the screen. Empty, it must
 * let taps through: it used to sit over the chat composer and Send button.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { ToastProvider, ToastViewport, Toast } from '@/components/ui/toast';

describe('toast area', () => {
  it('is click-through, while each toast stays clickable', () => {
    const { container } = render(<ToastProvider><Toast data-testid="t" /><ToastViewport /></ToastProvider>);
    const [provider, viewport] = [container.firstElementChild as HTMLElement, container.querySelectorAll('div.fixed')[1] as HTMLElement];
    expect(provider.className).toContain('pointer-events-none');
    expect(viewport.className).toContain('pointer-events-none');
    expect((container.querySelector('[data-testid="t"]') as HTMLElement).className).toContain('pointer-events-auto');
  });
});
