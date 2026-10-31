'use client'
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";

import { User, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import BrandLogoVideo from "@/components/brand/BrandLogoVideo";
import ErrorBoundary from '@/components/ErrorBoundary';

/**
 * First-run profile setup. Everyone starts with a personal profile; a
 * business and its website are added later from Businesses / Showroom Studio.
 */
function Onboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const userFullName = user?.full_name;
  const [saving, setSaving] = useState(false);
  const [personal, setPersonal] = useState({ display_name: "", bio: "", headline: "", location: "", phone: "" });

  useEffect(() => {
    if (userFullName !== undefined) setPersonal(prev => ({ ...prev, display_name: userFullName || "" }));
  }, [userFullName]);

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        display_name: personal.display_name,
        bio: personal.bio,
        headline: personal.headline,
        location: personal.location,
        phone: personal.phone,
      };
      const existing = await entities.UserProfile.filter({ user_id: user.id });
      if (existing.length > 0) {
        // Keep any business profile the account already has.
        await entities.UserProfile.update(existing[0].id, profileData);
      } else {
        await entities.UserProfile.create({ ...profileData, profile_type: "personal", has_business_profile: false });
      }
      router.push("/feed");
    } catch (err: any) {
      toast.error(err?.error || err?.message || "Failed to create profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof personal) => ({
    id: `onboarding-${key}`,
    value: personal[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPersonal({ ...personal, [key]: e.target.value }),
  });
  const labelClass = "text-sm font-medium text-foreground";
  const inputClass = "mt-1.5 bg-background text-foreground placeholder:text-muted-foreground border-input";

  return (
    <div data-page-guide="onboard-welcome" className="min-h-screen bg-background bg-gradient-to-br from-primary/10 via-background to-background flex items-center justify-center p-4 text-foreground">
      <div className="w-full max-w-lg">
        <Link href="/feed" className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to feed
        </Link>

        <div className="text-center mb-8">
          {/* Brand video logo — loops silently while the user fills in their profile */}
          <BrandLogoVideo size={72} className="w-[72px] h-[72px] mx-auto shadow-lg" label="Nodbusiness" />
          <p className="font-display text-xl font-bold mt-3 text-foreground">Nodbusiness</p>
          {(user?.is_demo || user?.demo_session_active) && (
            <div role="status" className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <p>You are practicing in the Demo workspace. Your Real account and its data stay separate.</p>
            </div>
          )}
        </div>

        <div className="bg-card text-card-foreground rounded-3xl shadow-lg border border-border p-6 sm:p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-5 h-5 text-primary" aria-hidden="true" />
              <h1 data-page-guide="onboard-name" className="font-display text-xl font-bold text-foreground">Personal Information</h1>
            </div>
            <p className="text-sm text-muted-foreground">Set up your personal identity on Nodbusiness. You can add a business later.</p>
          </div>
          <div className="space-y-4">
            <div data-page-guide="onboard-type">
              <Label htmlFor="onboarding-display_name" className={labelClass}>Full Name</Label>
              <Input {...field("display_name")} placeholder="Your name" className={`${inputClass} h-11`} />
            </div>
            <div>
              <Label htmlFor="onboarding-headline" className={labelClass}>Headline</Label>
              <Input {...field("headline")} placeholder="e.g. Software Engineer at Tech" className={`${inputClass} h-11`} />
            </div>
            <div>
              <Label htmlFor="onboarding-bio" className={labelClass}>Bio</Label>
              <Textarea {...field("bio")} placeholder="Tell people about yourself..." className={inputClass} rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="onboarding-location" className={labelClass}>Location</Label>
                <Input {...field("location")} placeholder="Your city" className={`${inputClass} h-11`} />
              </div>
              <div>
                <Label htmlFor="onboarding-phone" className={labelClass}>Phone</Label>
                <Input {...field("phone")} type="tel" placeholder="+251 9xx xxx xxx" className={`${inputClass} h-11`} />
              </div>
            </div>
            <Button data-page-guide="onboard-continue" onClick={handleFinish} disabled={saving || !personal.display_name.trim()} className="w-full h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? "Creating..." : "Create My Profile"} <Check className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return <ErrorBoundary><Onboarding /></ErrorBoundary>;
}
