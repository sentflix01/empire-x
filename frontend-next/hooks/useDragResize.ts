'use client';
import { useCallback, useRef, useState } from 'react';

export interface DragResizeOptions {
  /** Initial size in pixels. */
  initial: number;
  /** Minimum allowed size in pixels. */
  min: number;
  /** Maximum allowed size in pixels. */
  max: number;
  /** 'horizontal' resizes width (left/right drag), 'vertical' resizes height (up/down drag). */
  direction?: 'horizontal' | 'vertical';
  /** localStorage key to persist the size across sessions. */
  storageKey?: string;
}

function readStorage(key: string, fallback: number): number {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: number) {
  try {
    localStorage.setItem(key, String(Math.round(value)));
  } catch { /* ignore */ }
}

/**
 * Drag-to-resize hook. Returns a `size` (pixels), event handlers to spread
 * onto the drag-handle element, and an `isDragging` flag for styling.
 *
 * Double-click the handle to reset to the initial size.
 * Size is persisted to localStorage when `storageKey` is provided.
 *
 * Usage:
 *   const drag = useDragResize({ initial: 288, min: 160, max: 480, storageKey: 'my_panel' });
 *   <aside style={{ width: drag.size }} />
 *   <div onPointerDown={drag.onPointerDown} onDoubleClick={drag.onDoubleClick} />
 */
export function useDragResize({
  initial,
  min,
  max,
  direction = 'horizontal',
  storageKey,
}: DragResizeOptions) {
  const [size, setSize] = useState<number>(() =>
    storageKey ? readStorage(storageKey, initial) : initial,
  );
  const [isDragging, setIsDragging] = useState(false);

  // Use refs so the pointermove/pointerup handlers always see current values
  // without being recreated on every render.
  const stateRef = useRef({ min, max, direction, storageKey, initial });
  stateRef.current = { min, max, direction, storageKey, initial };

  const startPos  = useRef(0);
  const startSize = useRef(0);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const { direction: dir, min: lo, max: hi } = stateRef.current;
    const delta = dir === 'horizontal' ? e.clientX - startPos.current : e.clientY - startPos.current;
    setSize(Math.max(lo, Math.min(hi, startSize.current + delta)));
  }, []);

  const onPointerUp = useCallback((e: PointerEvent) => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    const { storageKey: key } = stateRef.current;
    if (key) setSize((s) => { writeStorage(key, s); return s; });
  }, [onPointerMove]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const { direction: dir } = stateRef.current;
    startPos.current  = dir === 'horizontal' ? e.clientX : e.clientY;
    startSize.current = size;
    setIsDragging(true);
    document.body.style.cursor     = dir === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    (e.target as Element).setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup',   onPointerUp);
  }, [size, onPointerMove, onPointerUp]);

  const onDoubleClick = useCallback(() => {
    const { initial: init, storageKey: key } = stateRef.current;
    setSize(init);
    if (key) writeStorage(key, init);
  }, []);

  return { size, setSize, isDragging, onPointerDown, onDoubleClick };
}
