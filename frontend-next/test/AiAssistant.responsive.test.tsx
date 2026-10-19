import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));

import AiAssistant from '@/components/AiAssistant';

describe('AI assistant responsive launcher', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 667 });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('clamps a saved wide-screen position into the compact viewport', async () => {
    localStorage.setItem('nodbusiness_ai_pos', JSON.stringify({ x: 1280, y: 900 }));
    render(<AiAssistant />);

    const launcher = screen.getByRole('button', { name: 'ai.title' });
    // maxY = 667 - 56 (btn) - 0 (safe area) - 64 (mobile nav, viewport < 768px) - 8 (margin) = 539
    await waitFor(() => expect(launcher).toHaveStyle({ left: '311px', top: '539px' }));
    expect(JSON.parse(localStorage.getItem('nodbusiness_ai_pos') || '{}')).toEqual({ x: 311, y: 539 });
  });

  it('keeps the launcher above the device bottom safe area', async () => {
    const getComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
      const style = getComputedStyle(element, pseudoElement);
      if (element instanceof HTMLElement && element.hasAttribute('data-ai-safe-area-probe')) {
        Object.defineProperty(style, 'paddingBottom', { configurable: true, value: '24px' });
      }
      return style;
    });
    localStorage.setItem('nodbusiness_ai_pos', JSON.stringify({ x: 300, y: 640 }));
    render(<AiAssistant />);

    const launcher = screen.getByRole('button', { name: 'ai.title' });
    // maxY = 667 - 56 (btn) - 24 (safe area) - 64 (mobile nav, viewport < 768px) - 8 (margin) = 515
    await waitFor(() => expect(launcher).toHaveStyle({ left: '300px', top: '515px' }));
  });

  it('keeps the launcher and open panel within bounds after a viewport resize', async () => {
    localStorage.setItem('nodbusiness_ai_pos', JSON.stringify({ x: 300, y: 640 }));
    render(<AiAssistant />);
    const launcher = screen.getByRole('button', { name: 'ai.title' });

    // maxY at 375×667 = 667 - 56 - 64 (mobile nav) - 8 = 539
    await waitFor(() => expect(launcher).toHaveStyle({ left: '300px', top: '539px' }));
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 568 });
    fireEvent(window, new Event('resize'));

    // maxY at 320×568 = 568 - 56 - 64 (mobile nav) - 8 = 440
    await waitFor(() => expect(launcher).toHaveStyle({ left: '256px', top: '440px' }));
    fireEvent.click(launcher);
    const panel = screen.getByTestId('ai-assistant-panel');
    expect(Number.parseFloat(panel.style.left)).toBeGreaterThanOrEqual(8);
    expect(Number.parseFloat(panel.style.left) + 288).toBeLessThanOrEqual(312);
    expect(Number.parseFloat(panel.style.top)).toBeGreaterThanOrEqual(8);
  });

  it.each(['touch', 'mouse', 'pen'] as const)('supports %s pointer dragging without opening the assistant', async (pointerType) => {
    render(<AiAssistant />);
    const launcher = screen.getByRole('button', { name: 'ai.title' });

    fireEvent.pointerDown(launcher, { pointerId: 7, pointerType, button: 0, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(window, { pointerId: 7, pointerType, clientX: 180, clientY: 200 });
    fireEvent.pointerUp(window, { pointerId: 7, pointerType });

    await waitFor(() => expect(launcher).toHaveStyle({ left: '150px', top: '170px' }));
    fireEvent.click(launcher);
    expect(screen.queryByTestId('ai-assistant-panel')).toBeNull();
    await waitFor(() => expect(JSON.parse(localStorage.getItem('nodbusiness_ai_pos') || '{}')).toEqual({ x: 150, y: 170 }));
  });
});
