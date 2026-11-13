/**
 * The viewer chooses how far to look (owner, 13 Nov 2026): a free 1–100 km
 * distance with − / + and "Anywhere", reported once the viewer stops moving.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import DistanceRange, { nextDistance, previousDistance } from '@/components/ui/DistanceRange';

describe('distance steps', () => {
  it('moves by 1 km up to 10, 5 km up to 50, then 10 km, within 1–100', () => {
    expect([1, 9, 10, 12, 45, 50, 95, 100].map(nextDistance)).toEqual([2, 10, 15, 15, 50, 60, 100, 100]);
    expect([1, 2, 10, 12, 15, 50, 55, 100].map(previousDistance)).toEqual([1, 1, 9, 10, 10, 45, 50, 90]);
  });
});

describe('DistanceRange', () => {
  it('reports a new distance once the viewer stops', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<DistanceRange value={10} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Farther' }));
    fireEvent.click(screen.getByRole('button', { name: 'Farther' }));
    expect(screen.getByTestId('distance-label').textContent).toBe('Within 20 km');
    expect(onChange).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(400); });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(20);
    fireEvent.change(screen.getByLabelText('How far to look'), { target: { value: '37' } });
    act(() => { vi.advanceTimersByTime(400); });
    expect(onChange).toHaveBeenLastCalledWith(37);
    vi.useRealTimers();
  });

  it('switches to Anywhere and back at once', () => {
    const onChange = vi.fn();
    render(<DistanceRange value={null} onChange={onChange} allowAnywhere defaultKm={10} />);
    expect(screen.getByTestId('distance-label').textContent).toBe('Anywhere');
    expect((screen.getByLabelText('How far to look') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Anywhere (no distance limit)'));
    expect(onChange).toHaveBeenCalledWith(10);
    expect(screen.getByTestId('distance-label').textContent).toBe('Within 10 km');
  });

  it('cannot go below 1 km or above 100 km', () => {
    const { rerender } = render(<DistanceRange value={1} onChange={() => {}} />);
    expect((screen.getByRole('button', { name: 'Closer' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<DistanceRange value={100} onChange={() => {}} />);
    expect((screen.getByRole('button', { name: 'Farther' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
