'use client';
import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import client, { storeToken } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import { describeGoogleOAuthError, renderGoogleSignInButton } from "@/lib/googleAuth";
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/AuthContext';

function Register() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { completeLogin } = useAuth();
  const refCode = searchParams.get("ref") || "";
  const verifyEmail = searchParams.get("verify")?.trim().toLowerCase() || "";

  const [email, setEmail] = useState(verifyEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOtp, setShowOtp] = useState(Boolean(verifyEmail));
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const googleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // renderGoogleSignInButton is synchronous — no GIS script dependency.
    if (!googleRef.current || googleReady) return;
    const ok = renderGoogleSignInButton(googleRef.current, {
      buttonText: 'signup_with',
      onSuccess: (result) => {
        if (result.is_demo) {
          setError('This legacy Demo login needs to be linked to a Real account before it can be used here.');
          return;
        }
        if (result?.access_token) storeToken(result.access_token);
        // Registration always creates the user's canonical Real identity.
        void completeLogin().then(() => router.replace('/feed')).catch(() => {
          setError('Your Google account was created, but we could not start your session. Please sign in again.');
        });
      },
      onError: (err) => setError(
        err.message === 'Sign-in was cancelled.'
          ? ''
          : /invalid_client|oauth client was not found/i.test(err.message)
            ? describeGoogleOAuthError(err.message)
            : 'Google sign-in failed. Please try email and password below.'
      ),
    });
    if (ok) setGoogleReady(true);
    else setGoogleUnavailable(true);
  }, [completeLogin, googleReady, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => setResendCooldown(c => c <= 1 ? 0 : c - 1), 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!agreed) { setError("You must agree to the Terms of Service to create an account."); return; }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await client.post('/api/auth/register', { email: normalizedEmail, password }, {
        headers: { 'X-Account-Mode': 'real' },
      });
      setEmail(normalizedEmail);
      setShowOtp(true);
    } catch (err: unknown) {
      const e = err as { status?: number; response?: { status?: number }; error?: string; message?: string };
      if (e?.status === 404 || e?.response?.status === 404) { window.location.href = '/404'; return; }
      setError(e?.error || e?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await client.post('/api/auth/verify-otp', { email, otpCode }, {
        headers: { 'X-Account-Mode': 'real' },
      });
      if (result?.data?.is_demo) {
        setError('This legacy Demo login needs to be linked to a Real account before it can be used here.');
        return;
      }
      if (result?.data?.access_token) storeToken(result.data.access_token);
      if (refCode) {
        await client.post('/api/referral/apply', { code: refCode }).catch(() => {});
      }
      // New registrations always create the canonical Real identity.
      await completeLogin();
      router.replace('/feed');
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      setError(e?.error || e?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await client.post('/api/auth/resend-otp', { email }, {
        headers: { 'X-Account-Mode': 'real' },
      });
      setResendCooldown(30);
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      setError(e?.error || e?.message || 'Failed to resend code.');
    }
  };

  // OTP verification screen
  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Check your email"
        subtitle={`We sent a 6-digit code to ${email}`}
        footer={
          <>
            Wrong email?{' '}
            <button onClick={() => setShowOtp(false)} className="font-medium text-primary hover:underline">
              Go back
            </button>
          </>
        }
      >
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>
        )}
        <div data-page-guide="register-otp" className="flex flex-col items-center gap-4 mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoComplete="one-time-code">
            <InputOTPGroup>
              {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-10 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : 'Verify email'}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Didn&apos;t receive it?{' '}
          <button
            data-page-guide="register-resend"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className={`font-medium hover:underline ${resendCooldown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary'}`}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Start your Nodbusiness journey"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </>
      }
    >
      {refCode && (
        <div className="mb-5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          🎁 Referral code <strong>{refCode}</strong> will be applied automatically.
        </div>
      )}

      {/* Google button */}
      <div className="mb-6">
        {!googleReady && !googleUnavailable && (
          <div className="flex h-10 items-center justify-center gap-2 rounded-lg border border-input text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Setting up Google Sign-Up…</span>
          </div>
        )}
        {googleUnavailable && (
          <div className="flex h-10 items-center justify-center rounded-lg border border-input text-sm text-muted-foreground">
            Google Sign-Up unavailable
          </div>
        )}
        <div ref={googleRef} data-page-guide="register-google" className="flex min-h-10 w-full justify-center" aria-label="Sign up with Google" />
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">or</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>
      )}

      {/* Form */}
      <form data-page-guide="register-page" onSubmit={handleSubmit} className="space-y-4">
        <div data-page-guide="register-email" className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-10"
            required
            maxLength={254}
          />
        </div>

        <div data-page-guide="register-password" className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-10 pr-10"
              required
              minLength={8}
              maxLength={128}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div data-page-guide="register-confirm" className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="h-10"
            required
            minLength={8}
            maxLength={128}
          />
        </div>

        {/* Terms checkbox */}
        <label data-page-guide="register-terms" className="flex items-start gap-3 cursor-pointer select-none">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              agreed ? 'bg-primary border-primary' : 'border-input bg-background'
            }`}>
              {agreed && (
                <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground leading-relaxed">
            I agree to the{' '}
            <Link href="/service-agreement?tab=terms" target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-primary underline hover:no-underline">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/service-agreement?tab=privacy" target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-primary underline hover:no-underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        <Button
          data-page-guide="register-submit"
          type="submit"
          className="w-full h-10 font-medium"
          disabled={loading || !agreed || !email || !password || !confirmPassword}
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account…</> : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return <ErrorBoundary><Suspense><Register /></Suspense></ErrorBoundary>;
}
