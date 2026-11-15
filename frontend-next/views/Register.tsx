'use client';
/**
 * Sign up (new-user audit, 15 Nov 2026 — note/2026-11-15-new-user-audit/report.md):
 *  - the button always works and says what is missing (NU-2);
 *  - one password field with show/hide and its rule always visible (NU-6, NU-16);
 *  - email typos are caught, with a one-tap fix (NU-7);
 *  - every error is next to its field and announced (NU-5);
 *  - a used email offers Sign in and Reset password (NU-17);
 *  - the code boxes clear after a wrong code and submit by themselves (NU-8);
 *  - new accounts go straight to the name screen (NU-1);
 *  - every word is translated (NU-4).
 */
import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import client, { storeToken } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import { describeGoogleOAuthError, renderGoogleSignInButton } from "@/lib/googleAuth";
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/AuthContext';
import { checkEmail } from '@/lib/emailCheck';
import { destinationAfterSignIn } from '@/lib/afterSignIn';

const PASSWORD_MIN = 8;

type FieldErrors = { email?: string; password?: string; terms?: string };

function Register() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { completeLogin } = useAuth();
  const refCode = searchParams.get("ref") || "";
  const verifyEmail = searchParams.get("verify")?.trim().toLowerCase() || "";

  const [email, setEmail] = useState(verifyEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [suggestion, setSuggestion] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);
  const [showOtp, setShowOtp] = useState(Boolean(verifyEmail));
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const googleRef = useRef<HTMLDivElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const termsRef = useRef<HTMLInputElement | null>(null);

  const goOn = async () => {
    const signedIn = await completeLogin();
    router.replace(await destinationAfterSignIn(signedIn?.id));
  };

  useEffect(() => {
    // renderGoogleSignInButton is synchronous — no GIS script dependency.
    if (!googleRef.current || googleReady) return;
    const ok = renderGoogleSignInButton(googleRef.current, {
      buttonText: 'signup_with',
      onSuccess: (result) => {
        if (result.is_demo) {
          setError(t('auth.legacyDemo', 'This legacy Demo login needs to be linked to a Real account before it can be used here.'));
          return;
        }
        if (result.mfa_required) {
          // An existing account with two-factor sign-in on finishes on the sign-in page (F-017).
          router.replace('/login?mfa=1');
          return;
        }
        if (result?.access_token) storeToken(result.access_token);
        // Registration always creates the user's canonical Real identity.
        void goOn().catch(() => {
          setError(t('auth.googleSessionFailed', 'Your Google account was created, but we could not start your session. Please sign in again.'));
        });
      },
      onError: (err) => setError(
        err.message === 'Sign-in was cancelled.'
          ? ''
          : /invalid_client|oauth client was not found/i.test(err.message)
            ? describeGoogleOAuthError(err.message)
            : t('auth.googleFailed', 'Google sign-in failed. Please try email and password below.')
      ),
    });
    if (ok) setGoogleReady(true);
    else setGoogleUnavailable(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeLogin, googleReady, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => setResendCooldown(c => c <= 1 ? 0 : c - 1), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const emailMessage = (value: string) => {
    const check = checkEmail(value);
    setSuggestion(check.suggestion ?? "");
    if (check.error === 'missing') return t('auth.emailRequired', 'Enter your email address.');
    if (check.error === 'shape') return t('auth.emailInvalid', 'Enter an email like name@example.com.');
    return undefined;
  };
  const passwordMessage = (value: string) =>
    value.length < PASSWORD_MIN ? t('auth.passwordTooShort', 'Use at least 8 characters.') : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailTaken(false);
    const next: FieldErrors = {
      email: emailMessage(email),
      password: passwordMessage(password),
      terms: agreed ? undefined : t('auth.termsRequired', 'Tick the box to agree to the Terms and Privacy Policy.'),
    };
    setFieldErrors(next);
    // Focus the first problem so the person (and a screen reader) lands on it.
    if (next.email) { emailRef.current?.focus(); return; }
    if (next.password) { passwordRef.current?.focus(); return; }
    if (next.terms) { termsRef.current?.focus(); return; }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await client.post('/api/auth/register', { email: normalizedEmail, password }, {
        headers: { 'X-Account-Mode': 'real' },
      });
      setEmail(normalizedEmail);
      setOtpCode("");
      setShowOtp(true);
    } catch (err: unknown) {
      const ex = err as { status?: number; response?: { status?: number }; error?: string; message?: string };
      const status = ex?.status ?? ex?.response?.status;
      if (status === 404) { router.push('/not-found'); return; }
      if (status === 409) { setEmailTaken(true); emailRef.current?.focus(); return; }
      const message = ex?.error || ex?.message || t('auth.registrationFailed', 'Registration failed. Please try again.');
      // The server's password rules (too common, same as email) belong under the password.
      if (/password/i.test(message)) { setFieldErrors({ password: message }); passwordRef.current?.focus(); }
      else setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code = otpCode) => {
    if (loading || code.length < 6) return;
    setError("");
    setLoading(true);
    try {
      const result = await client.post('/api/auth/verify-otp', { email, otpCode: code }, {
        headers: { 'X-Account-Mode': 'real' },
      });
      if (result?.data?.is_demo) {
        setError(t('auth.legacyDemo', 'This legacy Demo login needs to be linked to a Real account before it can be used here.'));
        return;
      }
      if (result?.data?.access_token) storeToken(result.data.access_token);
      if (refCode) {
        await client.post('/api/referral/apply', { code: refCode }).catch(() => {});
      }
      // New registrations always create the canonical Real identity; a new
      // account goes straight to the name screen.
      await goOn();
    } catch (err: unknown) {
      const ex = err as { error?: string; message?: string };
      setError(ex?.error || ex?.message || t('auth.codeInvalid', 'Invalid code. Please try again.'));
      // Clear the boxes so the right code can be typed or pasted at once (NU-8).
      setOtpCode("");
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
      setError("");
    } catch (err: unknown) {
      const ex = err as { error?: string; message?: string };
      setError(ex?.error || ex?.message || t('auth.failedResend', 'Failed to resend code.'));
    }
  };

  const alert = (id: string, text?: string) => text
    ? <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">{text}</p>
    : null;

  // OTP verification screen
  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title={t('auth.checkEmailTitle', 'Check your email')}
        subtitle={t('auth.codeSentTo', { email, defaultValue: `We sent a 6-digit code to ${email}` })}
        footer={
          <>
            {t('auth.wrongEmail', 'Wrong email?')}{' '}
            <button type="button" onClick={() => { setShowOtp(false); setError(""); }} className="font-medium text-primary hover:underline">
              {t('auth.goBack', 'Go back')}
            </button>
          </>
        }
      >
        {error && (
          <div id="otp-error" role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>
        )}
        <div data-page-guide="register-otp" className="flex flex-col items-center gap-4 mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            onComplete={(code: string) => { void handleVerify(code); }}
            autoComplete="one-time-code"
            inputMode="numeric"
            autoFocus
            aria-label={t('auth.verificationCode', 'Verification code')}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'otp-error' : undefined}
          >
            <InputOTPGroup>
              {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
            </InputOTPGroup>
          </InputOTP>
          <p className="text-xs text-muted-foreground">{t('auth.codeHint', 'Type or paste the code. It is checked as soon as all 6 digits are in.')}</p>
        </div>
        <Button
          className="w-full h-11 font-medium"
          onClick={() => { void handleVerify(); }}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />{t('auth.verifyingCode', 'Verifying…')}</> : t('auth.verifyEmailButton', 'Verify email')}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('auth.didntReceive', "Didn't receive it?")}{' '}
          <button
            type="button"
            data-page-guide="register-resend"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className={`font-medium hover:underline ${resendCooldown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary'}`}
          >
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
      title={t('auth.registerTitle', 'Create account')}
      subtitle={t('auth.registerSubtitle', 'Free. Takes less than a minute.')}
      footer={
        <>
          {t('auth.hasAccount', 'Already have an account?')}{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">{t('auth.signIn', 'Sign in')}</Link>
        </>
      }
    >
      <div data-page-guide="register-page">
      {refCode && (
        <div className="mb-4 rounded-lg bg-primary-subtle border border-primary/30 px-3 py-2.5 text-sm text-primary-subtle-foreground">
          {t('auth.referralApplied', { code: refCode, defaultValue: `Referral code ${refCode} will be applied automatically.` })}
        </div>
      )}

      {/* Google button (hidden entirely when this site has no Google sign-in) */}
      {!googleUnavailable && (
        <div className="mb-4">
          {!googleReady && (
            <div className="flex h-10 items-center justify-center gap-2 rounded-lg border border-input text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>{t('auth.googleLoading', 'Setting up Google Sign-Up…')}</span>
            </div>
          )}
          <div ref={googleRef} data-page-guide="register-google" className="flex min-h-10 w-full justify-center" role="group" aria-label={t('auth.signUpWithGoogle', 'Sign up with Google')} />
        </div>
      )}
      {googleUnavailable && <div ref={googleRef} className="hidden" aria-hidden="true" />}

      {!googleUnavailable && (
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">{t('auth.or', 'or')}</span>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div data-page-guide="register-email">
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
            maxLength={254}
            onChange={(e) => { setEmail(e.target.value); setEmailTaken(false); if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined })); }}
            onBlur={() => { if (email.trim()) setFieldErrors((f) => ({ ...f, email: emailMessage(email) })); }}
            aria-invalid={fieldErrors.email || emailTaken ? true : undefined}
            aria-describedby={fieldErrors.email ? 'email-error' : emailTaken ? 'email-taken' : suggestion ? 'email-suggestion' : undefined}
            className="mt-1.5 h-11"
          />
          {alert('email-error', fieldErrors.email)}
          {suggestion && (
            <p id="email-suggestion" className="mt-1.5 text-sm text-muted-foreground" aria-live="polite">
              {t('auth.didYouMean', 'Did you mean')}{' '}
              <button type="button" className="font-medium text-primary underline" onClick={() => { setEmail(suggestion); setSuggestion(""); setFieldErrors((f) => ({ ...f, email: undefined })); }}>
                {suggestion}
              </button>?
            </p>
          )}
          {emailTaken && (
            <p id="email-taken" role="alert" className="mt-1.5 text-sm text-destructive">
              {t('auth.emailTaken', 'This email already has an account.')}{' '}
              <Link href={`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`} className="font-medium text-primary underline">{t('auth.signIn', 'Sign in')}</Link>
              {' · '}
              <Link href="/forgot-password" className="font-medium text-primary underline">{t('auth.forgotPassword', 'Forgot password?')}</Link>
            </p>
          )}
        </div>

        <div data-page-guide="register-password">
          <Label htmlFor="password" className="text-sm font-medium">{t('auth.password', 'Password')}</Label>
          <div className="relative mt-1.5">
            <Input
              ref={passwordRef}
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={t('auth.passwordPlaceholder', 'At least 8 characters')}
              value={password}
              maxLength={128}
              onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined })); }}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? 'password-error password-rule' : 'password-rule'}
              className="h-11 pr-12"
            />
            <button
              type="button"
              data-page-guide="register-confirm"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
              aria-pressed={showPassword}
              className="tap-target absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
          <p id="password-rule" className={`mt-1.5 text-xs ${password.length >= PASSWORD_MIN ? 'text-success' : 'text-muted-foreground'}`}>
            {t('auth.passwordRule', '8 or more characters. Avoid common passwords.')}
          </p>
          {alert('password-error', fieldErrors.password)}
        </div>

        <div data-page-guide="register-terms">
          <label className="flex min-h-11 items-start gap-3 cursor-pointer select-none">
            <input
              ref={termsRef}
              type="checkbox"
              checked={agreed}
              onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setFieldErrors((f) => ({ ...f, terms: undefined })); }}
              aria-invalid={fieldErrors.terms ? true : undefined}
              aria-describedby={fieldErrors.terms ? 'terms-error' : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-input accent-primary"
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              {t('auth.agreePrefix', 'I agree to the')}{' '}
              <Link href="/service-agreement?tab=terms" target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-primary underline hover:no-underline">
                {t('auth.terms', 'Terms of Service')}
              </Link>{' '}
              {t('auth.and', 'and')}{' '}
              <Link href="/service-agreement?tab=privacy" target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-primary underline hover:no-underline">
                {t('auth.privacy', 'Privacy Policy')}
              </Link>
            </span>
          </label>
          {alert('terms-error', fieldErrors.terms)}
        </div>

        <Button
          data-page-guide="register-submit"
          type="submit"
          className="w-full h-11 font-medium"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />{t('auth.creatingAccountNow', 'Creating account…')}</> : t('auth.createAccount', 'Create account')}
        </Button>
      </form>
      </div>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <Register />
      </Suspense>
    </ErrorBoundary>
  );
}
