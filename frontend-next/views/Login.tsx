'use client';
/**
 * Sign in (new-user audit, 15 Nov 2026 — note/2026-11-15-new-user-audit/report.md):
 * password or an emailed code (NU-18), errors next to their field and
 * announced (NU-5), a person with no profile yet goes to the name screen
 * (NU-1), every word translated (NU-4).
 */
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { auth } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import { describeGoogleOAuthError, renderGoogleSignInButton } from "@/lib/googleAuth";
import MfaChallenge from "@/components/auth/MfaChallenge";
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/AuthContext';
import { safeReturnPath } from '@/lib/safeReturnPath';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import { destinationAfterSignIn } from '@/lib/afterSignIn';
import { checkEmail } from '@/lib/emailCheck';

type Mode = 'password' | 'code-request' | 'code-enter';

function Login() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { completeLogin } = useAuth();
  const returnTo = searchParams.get("return");
  const dest = safeReturnPath(returnTo);

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState(searchParams.get("email")?.trim().toLowerCase() || "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState(searchParams.get("mfa") === "1" ? t('auth.mfaFinishHere', 'This account uses two-factor sign-in. Sign in here to finish.') : "");
  const [emailError, setEmailError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const googleRef = useRef<HTMLDivElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  // Set when two-factor sign-in is on: the second step replaces the form (F-017).
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const continueAfterLogin = useCallback(async (result: {
    onboarding_mode?: 'demo' | 'real' | null;
    is_demo?: boolean;
    mfa_required?: boolean;
    mfa_token?: string;
  }) => {
    if (result.mfa_required && result.mfa_token) {
      setPassword('');
      setError('');
      setMfaToken(result.mfa_token);
      return;
    }
    if (result.is_demo) {
      setError(t('auth.legacyDemo', 'This legacy Demo login needs to be linked to a Real account before it can be used here.'));
      return;
    }
    const signedIn = await completeLogin();
    router.replace(await destinationAfterSignIn(signedIn?.id, dest));
  }, [completeLogin, dest, router, t]);

  // Pre-warm a remote backend on page load so the sign-in call does not hit a cold start.
  useEffect(() => {
    const configuredApi = process.env.NEXT_PUBLIC_API_BASE_URL;
    const API = configuredApi || 'http://localhost:3001';
    let apiHost: string;
    try {
      apiHost = new URL(API).hostname.replace(/^\[|\]$/g, '');
    } catch {
      return;
    }
    if (!configuredApi || ['localhost', '127.0.0.1', '::1'].includes(apiHost)) return;
    fetch(`${API}/health`, { method: 'GET', signal: AbortSignal.timeout(55000) }).catch(() => {});
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => setResendCooldown(c => c <= 1 ? 0 : c - 1), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    // renderGoogleSignInButton is synchronous — no GIS script dependency.
    if (!googleRef.current || googleReady) return;
    const ok = renderGoogleSignInButton(googleRef.current, {
      buttonText: 'signin_with',
      onSuccess: (result) => {
        void continueAfterLogin(result).catch((err: unknown) => {
          setError(apiErrorMessage(err, t('auth.sessionFailed', 'Could not start your session. Please try again.')));
        });
      },
      onError: (err) => {
        if (err.message === 'Sign-in was cancelled.') return setError('');
        if (/invalid_client|oauth client was not found/i.test(err.message)) return setError(describeGoogleOAuthError(err.message));
        if (/active OAuth client|Google sign-in did not complete/i.test(err.message)) return setError(err.message);
        if (/popup.*closed|closed.*popup/i.test(err.message)) return setError(t('auth.popupClosed', 'Sign-in popup was closed. Please try again.'));
        if (/could not be verified/i.test(err.message)) return setError(t('auth.googleNotVerified', 'Sign-in could not be verified. Please try again.'));
        setError(t('auth.googleFailed', 'Google sign-in failed. Please try email and password below.'));
      },
    });
    if (ok) setGoogleReady(true);
    else setGoogleUnavailable(true);
  }, [continueAfterLogin, googleReady, t]);

  const validEmail = () => {
    const check = checkEmail(email);
    const message = check.error === 'missing' ? t('auth.emailRequired', 'Enter your email address.')
      : check.error ? t('auth.emailInvalid', 'Enter an email like name@example.com.') : '';
    setEmailError(message);
    if (message) emailRef.current?.focus();
    return !message;
  };

  const withSlowHint = async (work: () => Promise<void>) => {
    setError(""); setInfo("");
    setLoading(true);
    // Show a "waking up" hint after 5s if the backend is slow (cold start).
    const slowTimer = setTimeout(() => setInfo(t('auth.serverWaking', 'The server is waking up. This can take up to 30 seconds the first time.')), 5000);
    try { await work(); } finally { clearTimeout(slowTimer); setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail()) return;
    if (!password) { setError(t('auth.passwordRequired', 'Enter your password, or sign in with an email code.')); return; }
    await withSlowHint(async () => {
      try {
        const result = await auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
        setInfo('');
        await continueAfterLogin(result as Parameters<typeof continueAfterLogin>[0]);
      } catch (err: unknown) {
        const ex = err as { code?: string; status?: number; response?: { status?: number }; error?: string; message?: string; isTimeout?: boolean };
        if (ex?.code === 'email_not_verified') {
          router.replace(`/register?verify=${encodeURIComponent(email.trim().toLowerCase())}`);
          return;
        }
        if (ex?.status === 404 || ex?.response?.status === 404) { router.push('/not-found'); return; }
        setInfo('');
        if (ex?.isTimeout) { setError(t('auth.timeout', 'The server is taking too long to respond. Please try again in a few seconds.')); return; }
        setError(ex?.error || ex?.message || t('auth.invalidCredentials', 'Invalid email or password.'));
      }
    });
  };

  const sendCode = async () => {
    if (!validEmail() || resendCooldown > 0) return;
    await withSlowHint(async () => {
      try {
        await auth.requestLoginCode(email.trim().toLowerCase());
        setInfo('');
        setCode('');
        setMode('code-enter');
        setResendCooldown(30);
      } catch (err: unknown) {
        setInfo('');
        setError(apiErrorMessage(err, t('auth.codeSendFailed', 'Could not send a code. Please try again.')));
      }
    });
  };

  const submitCode = async (value = code) => {
    if (loading || value.length < 6) return;
    await withSlowHint(async () => {
      try {
        const result = await auth.loginWithCode(email.trim().toLowerCase(), value);
        setInfo('');
        await continueAfterLogin(result as Parameters<typeof continueAfterLogin>[0]);
      } catch (err: unknown) {
        setInfo('');
        setCode('');
        setError(apiErrorMessage(err, t('auth.loginCodeInvalid', 'That code is wrong or has expired. Request a new one.')));
      }
    });
  };

  if (mfaToken) {
    return (
      <AuthLayout title={t('auth.mfaTitle', 'Two-factor sign-in')} subtitle={t('auth.mfaSubtitle', "One more step to confirm it's you")}>
        <MfaChallenge
          mfaToken={mfaToken}
          onSignedIn={(result) => continueAfterLogin(result as Parameters<typeof continueAfterLogin>[0])}
          onRestart={(message) => { setMfaToken(null); setError(message); }}
        />
      </AuthLayout>
    );
  }

  const messages = (
    <>
      {info && <div role="status" className="mb-4 rounded-lg bg-primary-subtle px-3 py-2.5 text-sm text-primary-subtle-foreground">{info}</div>}
      {error && <div id="login-error" role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}
    </>
  );

  if (mode === 'code-enter') {
    return (
      <AuthLayout
        icon={Mail}
        title={t('auth.checkEmailTitle', 'Check your email')}
        subtitle={t('auth.loginCodeSent', { email, defaultValue: `If ${email} has an account, we sent it a 6-digit sign-in code.` })}
        footer={<button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode('password'); setError(''); }}>{t('auth.usePassword', 'Sign in with a password instead')}</button>}
      >
        {messages}
        <div className="mb-6 flex flex-col items-center gap-3">
          <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={(v: string) => { void submitCode(v); }}
            autoComplete="one-time-code" inputMode="numeric" autoFocus aria-label={t('auth.signInCode', 'Sign-in code')}
            aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined}>
            <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
          </InputOTP>
          <p className="text-xs text-muted-foreground">{t('auth.codeHint', 'Type or paste the code. It is checked as soon as all 6 digits are in.')}</p>
        </div>
        <Button className="w-full h-11 font-medium" onClick={() => { void submitCode(); }} disabled={loading || code.length < 6}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />{t('auth.signingIn', 'Signing in…')}</> : t('auth.signIn', 'Sign in')}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('auth.didntReceive', "Didn't receive it?")}{' '}
          <button type="button" onClick={() => { void sendCode(); }} disabled={resendCooldown > 0}
            className={`font-medium hover:underline ${resendCooldown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary'}`}>
            {resendCooldown > 0 ? t('auth.resendIn', { s: resendCooldown, defaultValue: `Resend in ${resendCooldown}s` }) : t('auth.resendCode', 'Resend code')}
          </button>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">{t('auth.checkSpam', 'Not in your inbox? Check spam or promotions.')}</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      compact
      title={t('auth.signInTitle', 'Sign in')}
      subtitle={t('auth.signInSubtitle', 'Welcome back to Nodbusiness')}
      footer={
        <>
          {t('auth.noAccount', "Don't have an account?")}{' '}
          <Link href="/register" data-page-guide="login-register-link" className="font-medium text-primary hover:underline">{t('auth.createAccount', 'Create account')}</Link>
        </>
      }
    >
      {/* Google button (hidden when this site has no Google sign-in) */}
      {!googleUnavailable && (
        <div className="mb-4">
          {!googleReady && (
            <div className="flex h-10 items-center justify-center gap-2 rounded-lg border border-input text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>{t('auth.googleLoadingSignIn', 'Setting up Google Sign-In…')}</span>
            </div>
          )}
          <div ref={googleRef} data-page-guide="login-google" className="flex min-h-10 w-full justify-center" role="group" aria-label={t('auth.signInWithGoogle', 'Sign in with Google')} />
        </div>
      )}
      {googleUnavailable && <div ref={googleRef} className="hidden" aria-hidden="true" />}
      {!googleUnavailable && (
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">{t('auth.or', 'or')}</span>
          </div>
        </div>
      )}

      {messages}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div data-page-guide="login-email" className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">{t('auth.email', 'Email')}</Label>
          <Input
            ref={emailRef}
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'email-error' : undefined}
            className="h-11"
            maxLength={254}
          />
          {emailError && <p id="email-error" role="alert" className="text-sm text-destructive">{emailError}</p>}
        </div>

        {mode === 'password' ? (
          <div data-page-guide="login-password" className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">{t('auth.password', 'Password')}</Label>
              <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ''}`} data-page-guide="login-forgot" className="text-sm text-primary hover:underline">
                {t('auth.forgotPassword', 'Forgot password?')}
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                className="h-11 pr-12"
                maxLength={128}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="tap-target absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'password' ? (
          <>
            <Button data-page-guide="login-submit" type="submit" className="w-full h-11 font-medium" disabled={loading} aria-busy={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />{t('auth.signingIn', 'Signing in…')}</> : t('auth.signIn', 'Sign in')}
            </Button>
            <button type="button" onClick={() => { setMode('code-request'); setError(''); }} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-input text-sm font-medium hover:bg-secondary">
              <Mail className="h-4 w-4" aria-hidden="true" />{t('auth.emailMeCode', 'Email me a sign-in code instead')}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t('auth.codeExplain', 'No password needed: we email you a 6-digit code.')}</p>
            <Button type="button" onClick={() => { void sendCode(); }} className="w-full h-11 font-medium" disabled={loading} aria-busy={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : <Mail className="w-4 h-4 mr-2" aria-hidden="true" />}{t('auth.sendCode', 'Send me a code')}
            </Button>
            <button type="button" onClick={() => { setMode('password'); setError(''); }} className="w-full text-center text-sm font-medium text-primary hover:underline">
              {t('auth.usePassword', 'Sign in with a password instead')}
            </button>
          </>
        )}
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('auth.signInAgree', 'By signing in you agree to our')}{' '}
        <Link href="/service-agreement?tab=terms" className="underline hover:text-foreground">{t('auth.termsShort', 'Terms')}</Link>
        {' '}{t('auth.and', 'and')}{' '}
        <Link href="/service-agreement?tab=privacy" className="underline hover:text-foreground">{t('auth.privacy', 'Privacy Policy')}</Link>.
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return <ErrorBoundary><Suspense><Login /></Suspense></ErrorBoundary>;
}
