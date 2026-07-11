'use client'
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import { useTranslation } from 'react-i18next';

import { User, Store, ArrowRight, ArrowLeft, Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_CATEGORIES } from "@/lib/businessTemplates";
import { LAYOUT_TEMPLATES, getLayoutTemplateById } from "@/lib/layoutTemplates";
import TemplateCard from "@/components/profile/TemplateCard";
import { useTranslation } from 'react-i18next';

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profileType, setProfileType] = useState("personal");
  const [personal, setPersonal] = useState({ display_name: "", bio: "", headline: "", location: "", phone: "" });
  const [business, setBusiness] = useState({ business_name: "", business_category: "", business_template: "", business_description: "" });
  const [selectedLayout, setSelectedLayout] = useState("aurora_modern");

  useEffect(() => {
    auth.me().then(u => {
      setUser(u);
      setPersonal(prev => ({ ...prev, display_name: u.full_name || "" }));
    }).catch(() => router.push("/login"));
  }, []);

  const handleFinish = async () => {
    setSaving(true);
    const profileData = {
      user_id: user.id,
      display_name: personal.display_name,
      bio: personal.bio,
      headline: personal.headline,
      location: personal.location,
      phone: personal.phone,
      profile_type: profileType,
      has_business_profile: profileType === "business",
      ...(profileType === "business" && {
        business_name: business.business_name,
        business_category: business.business_category,
        business_template: selectedLayout,
        business_description: business.business_description,
        business_sections: JSON.stringify(getLayoutTemplateById(selectedLayout)?.sections || []),
        business_theme_color: getLayoutTemplateById(selectedLayout)?.accent_color || "#D4AF37",
      })
    };
    const existing = await entities.UserProfile.filter({ user_id: user.id });
    if (existing.length > 0) {
      await entities.UserProfile.update(existing[0].id, profileData);
    } else {
      await entities.UserProfile.create(profileData);
    }
    setSaving(false);
    router.push("/feed");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl">👑</span>
          <h1 className="font-display text-xl font-bold mt-1 bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">Empire X</h1>
        </div>

        {/* Step 0: Choose Profile Type */}
        {step === 0 && (
          <div className="bg-card rounded-3xl shadow-sm border border-border/50 p-8">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold">Choose Your Account Type</h2>
              <p className="text-sm text-muted-foreground mt-2">You can always add a business profile later</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setProfileType("personal"); setStep(1); }}
                className="w-full flex items-start gap-4 p-5 rounded-2xl border-2 border-border hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base">Personal Profile</h3>
                  <p className="text-sm text-muted-foreground mt-1">Connect with people, share posts, follow businesses — like Facebook & LinkedIn</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 mt-1" />
              </button>

              <button
                onClick={() => { setProfileType("business"); setStep(1); }}
                className="w-full flex items-start gap-4 p-5 rounded-2xl border-2 border-border hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Store className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base">Business Profile</h3>
                  <p className="text-sm text-muted-foreground mt-1">Get a mini-website for your business. Sell products, courses, and services directly in-app</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 mt-1" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="bg-card rounded-3xl shadow-sm border border-border/50 p-8">
            <button onClick={() => setStep(0)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-5 h-5 text-blue-500" />
                <h2 className="font-display text-xl font-bold">Personal Information</h2>
              </div>
              <p className="text-sm text-muted-foreground">Set up your personal identity on Empire X</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={personal.display_name} onChange={e => setPersonal({...personal, display_name: e.target.value})} placeholder="Your name" className="mt-1 h-11" />
              </div>
              <div>
                <Label>Headline</Label>
                <Input value={personal.headline} onChange={e => setPersonal({...personal, headline: e.target.value})} placeholder="e.g. Software Engineer at Tech" className="mt-1 h-11" />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={personal.bio} onChange={e => setPersonal({...personal, bio: e.target.value})} placeholder="Tell people about yourself..." className="mt-1" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Location</Label>
                  <Input value={personal.location} onChange={e => setPersonal({...personal, location: e.target.value})} placeholder="Addis Ababa" className="mt-1 h-11" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={personal.phone} onChange={e => setPersonal({...personal, phone: e.target.value})} placeholder="+251..." className="mt-1 h-11" />
                </div>
              </div>
              {profileType === "business" ? (
                <Button onClick={() => setStep(2)} disabled={!personal.display_name} className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                  Continue to Business Setup <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={saving || !personal.display_name} className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                  {saving ? "Creating..." : "Create My Profile"} <Check className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Business Setup */}
        {step === 2 && profileType === "business" && (
          <div className="bg-card rounded-3xl shadow-sm border border-border/50 p-8">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Store className="w-5 h-5 text-amber-500" />
                <h2 className="font-display text-xl font-bold">Business Setup</h2>
              </div>
              <p className="text-sm text-muted-foreground">Choose your business category and website template</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Business Name</Label>
                <Input value={business.business_name} onChange={e => setBusiness({...business, business_name: e.target.value})} placeholder="e.g. Abebe's Coffee Shop" className="mt-1 h-11" />
              </div>
              <div>
                <Label>Business Description</Label>
                <Textarea value={business.business_description} onChange={e => setBusiness({...business, business_description: e.target.value})} placeholder="What does your business do?" className="mt-1" rows={2} />
              </div>
              <div>
                <Label>Business Category</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto">
                  {BUSINESS_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setBusiness({...business, business_category: cat.value})}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                          business.business_category === cat.value ? "border-amber-400 bg-amber-50" : "border-border hover:border-amber-300"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + "20" }}>
                          <Icon className="w-4 h-4" style={{ color: cat.color }} />
                        </div>
                        <span className="text-xs font-medium">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button onClick={() => setStep(3)} disabled={!business.business_name || !business.business_category} className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                Choose Layout <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Layout Template */}
        {step === 3 && profileType === "business" && (
          <div className="bg-card rounded-3xl shadow-sm border border-border/50 p-8">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="font-display text-xl font-bold">Choose Your Layout</h2>
              </div>
              <p className="text-sm text-muted-foreground">Pick the design style that best fits your brand</p>
            </div>
            <div className="space-y-2 mb-6">
              {LAYOUT_TEMPLATES.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  selected={selectedLayout === tpl.id}
                  onSelect={() => setSelectedLayout(tpl.id)}
                />
              ))}
            </div>
            <Button onClick={handleFinish} disabled={saving} className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
              {saving ? "Creating..." : "Launch My Business"} <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function LayoutIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}


