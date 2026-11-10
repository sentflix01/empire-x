/**
 * Which images go through the Next.js optimizer (performance audit 2026-11-09).
 * Uploads are the original photo (~1 MB); production storage is HTTPS, so
 * those must be optimized. Local uploads, SVG and data/blob URLs must not be,
 * or they would stop loading (the optimizer refuses private hosts).
 */
import { describe, it, expect } from 'vitest';
import { canOptimizeImage } from '@/lib/media';

describe('canOptimizeImage', () => {
  it('optimizes HTTPS storage and same-origin photos', () => {
    expect(canOptimizeImage('https://abc.supabase.co/storage/v1/object/public/media/p.jpg')).toBe(true);
    expect(canOptimizeImage('https://pub-123.r2.dev/uploads/p.webp')).toBe(true);
    expect(canOptimizeImage('/uploads/p.png')).toBe(true);
  });

  it('leaves local, private, plain-http and protocol-relative URLs alone', () => {
    for (const src of [
      'http://localhost:3001/uploads/p.jpg', 'https://localhost/p.jpg', 'https://127.0.0.1/p.jpg',
      'https://10.0.0.5/p.jpg', 'https://192.168.1.2/p.jpg', 'https://172.20.0.1/p.jpg', 'https://[::1]/p.jpg',
      'https://printer.local/p.jpg', 'https://app.localhost/p.jpg', 'http://cdn.example.com/p.jpg', '//cdn.example.com/p.jpg',
    ]) expect(canOptimizeImage(src), src).toBe(false);
  });

  it('leaves SVG, data and blob URLs and empty values alone', () => {
    for (const src of ['/brand/logo.svg', 'https://cdn.example.com/a.SVG?v=2', 'data:image/png;base64,AAAA', 'blob:https://x/1', '', null, undefined, 'not a url']) {
      expect(canOptimizeImage(src as string), String(src)).toBe(false);
    }
  });

  it('still optimizes public hosts that only look private', () => {
    expect(canOptimizeImage('https://172.32.0.1/p.jpg')).toBe(true);
    expect(canOptimizeImage('https://localhost-images.example.com/p.jpg')).toBe(true);
    expect(canOptimizeImage('https://10.example.com/p.jpg')).toBe(true);
  });
});
