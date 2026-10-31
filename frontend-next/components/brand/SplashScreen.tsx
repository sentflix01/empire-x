'use client';

/**
 * SplashScreen — full-screen brand intro that plays once on app load.
 *
 * Renders a white overlay with the brand video centered in a black circle,
 * matching the app icon visual identity (white background, circular black
 * frame, globe network video). Dismisses when BOTH:
 *   - the auth check completes (isLoadingAuth becomes false), AND
 *   - the video has finished playing
 * …or after 4 seconds maximum so it never blocks the app indefinitely.
 *
 * Skipped entirely on auth pages (/login, /register, /landing, etc.) where
 * there is never a session to check and a splash would be confusing.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

// Auth/public pages that should never show the splash
const AUTH_PREFIXES = [
  '/login', '/register', '/forgot-password',
  '/reset-password', '/verify', '/auth/google/callback', '/landing',
];

const MAX_SPLASH_MS = 4000; // hard cap — never block longer than 4 seconds

export default function SplashScreen() {
  const pathname = usePathname();
  const { isLoadingAuth } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoEnded, setVideoEnded] = useState(false);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  const isAuthPage = AUTH_PREFIXES.some(p => pathname.startsWith(p));

  const dismiss = useCallback(() => {
    if (fading || gone) return;
    setFading(true);
    setTimeout(() => setGone(true), 320);
  }, [fading, gone]);

  // Hard-cap timer — always dismiss after MAX_SPLASH_MS
  useEffect(() => {
    if (isAuthPage) return;
    const t = window.setTimeout(dismiss, MAX_SPLASH_MS);
    return () => window.clearTimeout(t);
  }, [isAuthPage, dismiss]);

  // Dismiss when auth check finishes AND video has ended
  useEffect(() => {
    if (isAuthPage) return;
    if (!isLoadingAuth && videoEnded) dismiss();
  }, [isAuthPage, isLoadingAuth, videoEnded, dismiss]);

  // If skipped or removed, render nothing
  if (isAuthPage || gone) return null;

  return (
    <div
      role="status"
      aria-label="Loading Nodbusiness"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* ── Brand circle — matches the reference logo photo ── */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          backgroundColor: '#0a0a0a',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        }}
      >
        <video
          ref={videoRef}
          src="/brand/nodbusiness-intro.mp4"
          autoPlay
          muted
          playsInline
          loop={false}
          onEnded={() => setVideoEnded(true)}
          onError={() => setVideoEnded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          aria-hidden="true"
        />
      </div>

      {/* ── Business name below the circle ── */}
      <p
        style={{
          marginTop: 20,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#0a0a0a',
          userSelect: 'none',
        }}
      >
        Nodbusiness
      </p>
    </div>
  );
}
