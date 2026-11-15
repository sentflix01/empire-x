'use client'
/**
 * First-run profile (new-user audit, 15 Nov 2026 — NU-1, NU-4, NU-21): one
 * question, "What should people call you?", then the feed. Headline, bio,
 * city and phone are optional and folded away. Everyone starts with a personal
 * profile; a business and its website are added later.
 */
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { entities } from "@/lib/api/entities";
import client from "@/lib/api/client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import BrandLogoVideo from "@/components/brand/BrandLogoVideo";
import ErrorBoundary from '@/components/ErrorBoundary';
import { safeReturnPath } from '@/lib/safeReturnPath';
import { checkField, fieldRule } from '@/lib/builderFieldRules';

const NAME_MAX = 100;

function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dest = safeReturnPath(searchParams.get('return'));
  const { user, refreshUser } = useAuth();
  const userFullName = user?.full_name;
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [personal, setPersonal] = useState({ display_name: "", bio: "", headline: "", location: "", phone: "" });
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (userFullName !== undefined) setPersonal(prev => ({ ...prev, display_name: prev.display_name || userFullName || "" }));
  }, [userFullName]);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleFinish = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || saving) return;
    setError('');
    const name = personal.display_name.trim();
    if (!name) { setNameError(t('onboarding.nameRequired', 'Add the name people will see.')); nameRef.current?.focus(); return; }
    const phoneProblem = checkField(fieldRule('phone'), personal.phone);
    if (phoneProblem) { setMore(true); setPhoneError(t('onboarding.phoneInvalid', 'Enter a phone number with digits only, for example +251 91 234 5678.')); return; }
    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        display_name: name,
        bio: personal.bio.trim(),
        headline: personal.headline.trim(),
        location: personal.location.trim(),
        phone: personal.phone.trim(),
      };
      const existing = await entities.UserProfile.filter({ user_id: user.id });
      if (existing.length > 0) {
        // Keep any business profile the account already has.
        await entities.UserProfile.update(existing[0].id, profileData);
      } else {
        await entities.UserProfile.create({ ...profileData, profile_type: "personal", has_business_profile: false });
      }
      // The account name too, so the header and messages show it at once.
      if (name !== (user.full_name ?? '')) {
        await client.put('/api/auth/update-name', { full_name: name }).then(() => refreshUser?.()).catch(() => undefined);
      }
      router.replace(dest);
    } catch (err: unknown) {
      const ex = err as { error?: string; message?: string };
      setError(ex?.error || ex?.message || t('onboarding.saveFailed', 'Could not save your profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof personal) => ({
    id: `onboarding-${key}`,
    value: personal[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setPersonal({ ...personal, [key]: e.target.value });
      if (key === 'display_name' && nameError) setNameError('');
      if (key === 'phone' && phoneError) setPhoneError('');
    },
  });
  const labelClass = "text-sm font-medium text-foreground";
  const inputClass = "mt-1.5 bg-background text-foreground placeholder:text-muted-foreground border-input";

  return (
    <div data-page-guide="onboard-welcome" data-auth-page="" className="min-h-[100dvh] bg-background bg-gradient-to-br from-primary/10 via-background to-background flex items-start justify-center px-4 py-6 sm:items-center text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <BrandLogoVideo size={56} className="mx-auto h-14 w-14 shadow-lg" label="Nodbusiness" />
          {(user?.is_demo || user?.demo_session_active) && (
            <div role="status" className="mt-4 rounded-xl border border-primary/30 bg-primary-subtle p-3 text-sm text-primary-subtle-foreground">
              <p>{t('onboarding.demoNote', 'You are practicing in the Demo workspace. Your Real account and its data stay separate.')}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleFinish} noValidate className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-lg sm:p-8">
          <h1 data-page-guide="onboard-name" className="font-display text-xl font-bold text-foreground">
            {t('onboarding.title', 'Welcome! What should people call you?')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.subtitle', 'Your name shows on your posts and messages. You can change it any time.')}</p>

          {error && <div role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>}

          <div data-page-guide="onboard-type" className="mt-5">
            <Label htmlFor="onboarding-display_name" className={labelClass}>{t('onboarding.name', 'Your name')}</Label>
            <Input
              ref={nameRef}
              {...field("display_name")}
              autoComplete="name"
              maxLength={NAME_MAX}
              placeholder={t('onboarding.yourNamePlaceholder', 'e.g. Selam Bekele')}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'name-error' : undefined}
              className={`${inputClass} h-11`}
            />
            {nameError && <p id="name-error" role="alert" className="mt-1.5 text-sm text-destructive">{nameError}</p>}
          </div>

          <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} aria-controls="onboarding-more"
            className="mt-4 flex min-h-11 w-full items-center justify-between rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground">
            {t('onboarding.addMore', 'Add more about you (optional)')}
            <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${more ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {more && (
            <div id="onboarding-more" className="space-y-4 pb-2">
              <div>
                <Label htmlFor="onboarding-headline" className={labelClass}>{t('onboarding.headline', 'Headline')}</Label>
                <Input {...field("headline")} maxLength={120} placeholder={t('onboarding.headlineExample', 'e.g. Baker in Addis Ababa')} className={`${inputClass} h-11`} />
              </div>
              <div>
                <Label htmlFor="onboarding-bio" className={labelClass}>{t('onboarding.aboutYou', 'About you')}</Label>
                <Textarea {...field("bio")} maxLength={500} placeholder={t('onboarding.aboutYouPlaceholder', 'A sentence or two about you')} className={inputClass} rows={3} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="onboarding-location" className={labelClass}>{t('onboarding.city', 'City')}</Label>
                  <Input {...field("location")} autoComplete="address-level2" maxLength={80} placeholder={t('onboarding.cityPlaceholder', 'Your city')} className={`${inputClass} h-11`} />
                </div>
                <div>
                  <Label htmlFor="onboarding-phone" className={labelClass}>{t('onboarding.phone', 'Phone')}</Label>
                  <Input {...field("phone")} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="+251 91 234 5678"
                    aria-invalid={phoneError ? true : undefined} aria-describedby={phoneError ? 'phone-error' : 'phone-hint'} className={`${inputClass} h-11`} />
                  {phoneError
                    ? <p id="phone-error" role="alert" className="mt-1.5 text-sm text-destructive">{phoneError}</p>
                    : <p id="phone-hint" className="mt-1.5 text-xs text-muted-foreground">{t('onboarding.phoneHint', 'Include your country code, e.g. +251.')}</p>}
                </div>
              </div>
            </div>
          )}

          <Button data-page-guide="onboard-continue" type="submit" disabled={saving} aria-busy={saving} className="mt-4 h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary-hover">
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />{t('onboarding.saving', 'Saving…')}</>
              : <>{t('onboarding.continue', 'Continue')}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></>}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return <ErrorBoundary><Suspense fallback={null}><Onboarding /></Suspense></ErrorBoundary>;
}
