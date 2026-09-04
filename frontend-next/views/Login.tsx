'use client';
import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { renderGoogleSignInButton } from "@/lib/googleAuth";
import ErrorBoundary from '@/components/ErrorBoundary';

function Login() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return");
  const [error, setError] = useState("");
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;

    const renderButton = () => {
      if (disposed || !googleButtonRef.current || googleButtonReady) return false;
      const dest = (returnTo && returnTo.startsWith('/')) ? returnTo : '/feed';
      const rendered = renderGoogleSignInButton(googleButtonRef.current, {
        width: Math.min(400, Math.max(280, googleButtonRef.current?.clientWidth || window.innerWidth - 64)),
        onSuccess: () => { window.location.href = dest; },
        onError: (err) => {
          const msg = err?.message ?? '';
          if (msg.includes('popup') || msg.includes('closed')) {
            setError('Sign-in popup was closed. Please try again.');
          } else if (msg.includes('network') || msg.includes('Network')) {
            setError('Network error. Please check your connection and try again.');
          } else {
            setError('Google sign-in failed. Please try again.');
          }
        },
      });
      if (rendered) { setGoogleButtonReady(true); setGoogleUnavailable(false); }
      return rendered;
    };

    if (renderButton()) return;
    const retry = window.setInterval(renderButton, 100);
    const timeout = window.setTimeout(() => {
      window.clearInterval(retry);
      if (!disposed && !googleButtonReady) setGoogleUnavailable(true);
    }, 5000);

    return () => { disposed = true; window.clearInterval(retry); window.clearTimeout(timeout); };
  }, [googleButtonReady, returnTo]);

  return (
    <AuthLayout
      icon={undefined}
      title="Welcome back"
      subtitle="Sign in to your Nodbusiness account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">Create one</Link>
        </>
      }
    >
      {!googleButtonReady && !googleUnavailable && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {googleUnavailable && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Google Sign-In is currently unavailable. Please try again later.
        </div>
      )}

      <div
        ref={googleButtonRef}
        className="flex min-h-12 w-full justify-center"
        aria-label="Sign in with Google"
      />

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By signing in, you agree to our{' '}
        <Link href="/service-agreement?tab=terms" className="underline hover:text-foreground">Terms</Link>
        {' '}and{' '}
        <Link href="/service-agreement?tab=privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return <ErrorBoundary><Suspense><Login /></Suspense></ErrorBoundary>;
}
