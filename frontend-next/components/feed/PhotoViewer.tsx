'use client';
/**
 * Full-screen photo viewer, like other social apps: tap a photo to open it on
 * black; double-tap/double-click or pinch/wheel to zoom, drag to look around
 * when zoomed, swipe down (or ×, Escape) to close, arrows or swipe for the
 * next photo. Optional caption, author and footer (e.g. Like / Comment).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface ViewerPhoto { src: string; alt?: string }

const MAX_ZOOM = 4;

export default function PhotoViewer({ photos, startIndex = 0, caption, author, footer, onClose }: {
  photos: ViewerPhoto[];
  startIndex?: number;
  caption?: string | null;
  author?: string | null;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(photos.length - 1, 0)));
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragY, setDragY] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number }; pinchDist?: number; pinchZoom?: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);

  const reset = () => { setZoom(1); setOffset({ x: 0, y: 0 }); setDragY(0); };
  const go = useCallback((step: number) => {
    if (photos.length < 2) return;
    setIndex((i) => (i + step + photos.length) % photos.length);
    reset();
  }, [photos.length]);

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [go, onClose]);

  const toggleZoom = () => { if (zoom > 1) reset(); else setZoom(2.5); };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    gesture.current = { startX: e.clientX, startY: e.clientY, startOffset: offset, moved: false };
    if (pts.length === 2) {
      gesture.current.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      gesture.current.pinchZoom = zoom;
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && g.pinchDist) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setZoom(Math.min(MAX_ZOOM, Math.max(1, (g.pinchZoom ?? 1) * (dist / g.pinchDist))));
      g.moved = true;
      return;
    }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
    if (zoom > 1) setOffset({ x: g.startOffset.x + dx, y: g.startOffset.y + dy });
    else setDragY(Math.max(0, dy));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) return;
    gesture.current = null;
    if (!g) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (zoom <= 1) {
      if (dy > 120) { onClose(); return; }
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); return; }
      setDragY(0);
    }
    if (!g.moved) {
      const now = Date.now();
      if (now - lastTap.current < 300) { toggleZoom(); lastTap.current = 0; } else lastTap.current = now;
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, zoom - e.deltaY * 0.002));
    setZoom(next);
    if (next === 1) setOffset({ x: 0, y: 0 });
  };

  const photo = photos[index];
  if (!photo || typeof document === 'undefined') return null;
  const fade = zoom > 1 ? 1 : Math.max(0.4, 1 - dragY / 400);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-[200] flex flex-col text-white" style={{ backgroundColor: `rgba(0,0,0,${fade})` }}>
      <div className="flex shrink-0 items-center gap-2 px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{author}</p>
        {photos.length > 1 && <span className="text-xs text-white/70">{index + 1} / {photos.length}</span>}
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close photo"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onWheel={onWheel} onDoubleClick={toggleZoom}>
        {/* eslint-disable-next-line @next/next/no-img-element -- full-resolution photo from any upload host, transformed for zoom */}
        <img src={photo.src} alt={photo.alt || ''} draggable={false}
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain transition-transform duration-75"
          style={{ transform: `translate(${offset.x}px, ${offset.y + dragY}px) scale(${zoom})`, cursor: zoom > 1 ? 'grab' : 'zoom-in' }} />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-black/60">
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-black/60">
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {(caption || footer) && (
        <div className="shrink-0 space-y-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-6 safe-bottom">
          {caption && <p className="line-clamp-4 text-sm leading-relaxed text-white/90">{caption}</p>}
          {footer}
        </div>
      )}
    </div>,
    document.body,
  );
}
