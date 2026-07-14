'use client';
import React, { useState } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import client, { storeToken } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Gift } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";

export default function Register() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await client.post('/api/auth/register', { email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.error || err.message || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await client.post('/api/auth/verify-otp', { email, otpCode });
      if (result?.data?.access_token) {
        storeToken(result.data.access_token);
      }
      if (refCode) {
        try {
          await client.post('/api/referral/apply', { code: refCode });
        } catch {
          // Silently ignore — referral errors shouldn't block registration
        }
      }
      window.location.href = "/onboarding";
    } catch (err) {
      setError(err.error || err.message || t('auth.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await client.post('/api/auth/resend-otp', { email });
      toast({ title: t('auth.codeSentTitle'), description: t('auth.codeSentDesc') });
    } catch (err) {
      setError(err.error || err.message || t('auth.failedResend'));
    }
  };

  const handleGoogle = () => {
    window.__googleSignIn?.().then(() => { window.location.href = '/'; });
  };

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title={t('auth.verifyEmail')} subtitle={`${t('auth.otpSent')} ${email}`}>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
              <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('auth.verifying')}</> : t('auth.verify')}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('auth.didntReceive')}{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">{t('auth.resend')}</button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.hasAccount')}{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">{t('auth.login')}</Link>
        </>
      }
    >
      <Button variant="outline" className="w-full h-12 text-sm font-medium mb-6" onClick={handleGoogle}>
        <GoogleIcon className="w-5 h-5 mr-2" />
        {t('auth.continueWithGoogle')}
      </Button>
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">{t('auth.or')}</span>
        </div>
      </div>
      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      {refCode && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('auth.referralApplied', { code: refCode })}
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t('auth.confirmPassword')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('auth.creatingAccount')}</> : t('auth.register')}
        </Button>
      </form>
    </AuthLayout>
  );
}

