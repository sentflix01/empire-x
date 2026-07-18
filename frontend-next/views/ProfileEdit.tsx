'use client'
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from "react";
import { auth } from "@/api/auth";
import { entities, type UserProfile } from "@/api/entities";
import client from "@/api/client";
import { useTranslation } from 'react-i18next';

import { ArrowLeft, User, Store, Eye, Radio, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_CATEGORIES, getTemplateById } from "@/lib/businessTemplates";
import TemplateCard from "@/components/profile/TemplateCard";
import ImageUpload from "@/components/ui/ImageUpload";
import TickerBar, { TICKER_TYPES } from "@/components/feed/TickerBar";
import { toast } from "sonner";
import {
  getPushPermission, subscribeToPush, unsubscribeFromPush, isPushGranted,
} from "@/lib/push";

/** Inline push notifications settings card */
function PushSettingsCard() {
  const [perm, setPerm] = useState(() => getPushPermission());
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    if (perm === "granted") {
      const ok = await unsubscribeFromPush();
      if (ok) { setPerm("default"); toast.success("Push notifications disabled"); }
      else toast.error("Failed to disable notifications");
    } else {
      const ok = await subscribeToPush();
      if (ok) { setPerm("granted"); toast.success("Push notifications enabled 🔔"); }
      else { setPerm(getPushPermission()); toast.error("Permission denied. Enable in browser settings."); }
    }
    setLoading(false);
  };

  if (getPushPermission() === "unsupported") return null;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${perm === "granted" ? "bg-amber-50 dark:bg-amber-900/30" : "bg-secondary/50"}`}>
        {perm === "granted"
          ? <Bell className="w-4 h-4 text-amber-600" />
          : <BellOff className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Push Notifications</p>
        <p className="text-xs text-muted-foreground">
          {perm === "granted" ? "Enabled — you'll get notified even when the app is closed"
           : perm === "denied" ? "Blocked in browser settings"
           : "Get notified about likes, messages and orders"}
        </p>
      </div>
      {perm !== "denied" && (
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${perm === "granted" ? "bg-amber-500" : "bg-secondary"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${perm === "granted" ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      )}
      {perm === "denied" && (
        <span className="text-[10px] text-muted-foreground shrink-0">Blocked</span>
      )}
    </div>
  );
}

export default function ProfileEdit() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const isBusinessSetup = pathname.includes("setup-business");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(isBusinessSetup ? "business" : "personal");
  type PersonalState = {
    display_name: string;
    bio: string;
    headline: string;
    location: string;
    phone: string;
    ticker_text: string;
    ticker_type: string;
    avatar_url: string | string[];
    cover_url: string | string[];
  };
  const [personal, setPersonal] = useState<PersonalState>({ display_name: "", bio: "", headline: "", location: "", phone: "", ticker_text: "", ticker_type: "none", avatar_url: "", cover_url: "" });
  type BizState = {
    business_name: string;
    business_category: string;
    business_template: string | string[];
    business_description: string;
    business_contact_email: string;
    business_contact_phone: string;
    business_address: string;
    business_theme_color: string;
    business_logo_url: string | string[];
    business_cover_url: string | string[];
  };
  const [business, setBusiness] = useState<BizState>({
    business_name: "", business_category: "", business_template: "",
    business_description: "", business_contact_email: "", business_contact_phone: "",
    business_address: "", business_theme_color: "#D4AF37",
    business_logo_url: "", business_cover_url: ""
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const me = (await auth.me()) as { id?: string; full_name?: string; email?: string };
    setUser(me);
    const profiles = await entities.UserProfile.filter({ user_id: me.id }) as UserProfile[];
    if (profiles.length > 0) {
      const p = profiles[0] as UserProfile;
      setProfile(p);
      const avatar_url = Array.isArray(p.avatar_url) ? p.avatar_url[0] ?? "" : p.avatar_url || "";
      const cover_url = Array.isArray(p.cover_url) ? p.cover_url[0] ?? "" : p.cover_url || "";
      const business_template = Array.isArray(p.business_template) ? p.business_template[0] ?? "" : p.business_template || "";
      const business_logo_url = Array.isArray(p.business_logo_url) ? p.business_logo_url[0] ?? "" : p.business_logo_url || "";
      const business_cover_url = Array.isArray(p.business_cover_url) ? p.business_cover_url[0] ?? "" : p.business_cover_url || "";

      setPersonal({
        display_name: p.display_name || me.full_name || "",
        bio: p.bio || "", headline: p.headline || "",
        location: p.location || "", phone: p.phone || "",
        ticker_text: p.ticker_text || "",
        ticker_type: p.ticker_type || "none",
        avatar_url,
        cover_url
      });
      setBusiness({
        business_name: p.business_name || "",
        business_category: p.business_category || "",
        business_template,
        business_description: p.business_description || "",
        business_contact_email: p.business_contact_email || (me.email ?? ""),
        business_contact_phone: p.business_contact_phone || p.phone || "",
        business_address: p.business_address || p.location || "",
        business_theme_color: p.business_theme_color || "#D4AF37",
        business_logo_url,
        business_cover_url
      });
    }
  };

  const handleSavePersonal = async () => {
    setSaving(true);
    try {
      if (profile) {
        await entities.UserProfile.update(profile.id, personal);
      } else {
        await entities.UserProfile.create({ ...personal, user_id: user?.id, profile_type: "personal" });
      }
      toast.success("Profile saved!");
      router.push("/profile");
    } catch (err: any) {
      toast.error(err?.error || err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusiness = async () => {
    setSaving(true);
    try {
      const sections = JSON.stringify(getTemplateById(business.business_category, business.business_template)?.sections || []);
      const updateData = { ...business, has_business_profile: true, business_sections: sections };
      if (profile) {
        await entities.UserProfile.update(profile.id, updateData);
      } else {
        await entities.UserProfile.create({ ...updateData, user_id: user?.id, display_name: user?.full_name, profile_type: "business" });
      }
      toast.success("Business profile saved!");
      router.push("/profile");
    } catch (err: any) {
      toast.error(err?.error || err?.message || "Failed to save business profile");
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = BUSINESS_CATEGORIES.find(c => c.value === business.business_category);

  return (
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-display text-2xl font-bold mb-6">
          {isBusinessSetup ? "Set Up Business Profile" : "Edit Profile"}
        </h1>

        {!isBusinessSetup && (
          <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-6">
            <button onClick={() => setTab("personal")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${tab === "personal" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
              <User className="w-4 h-4" /> Personal
            </button>
            <button onClick={() => setTab("business")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${tab === "business" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
              <Store className="w-4 h-4" /> Business
            </button>
          </div>
        )}

        {tab === "personal" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Profile Photo</Label>
                <div className="mt-1">
                  <ImageUpload
                    value={personal.avatar_url}
                    onChange={url => setPersonal({...personal, avatar_url: url})}
                    placeholder="Upload photo"
                    aspectRatio="aspect-square"
                  />
                </div>
              </div>
              <div>
                <Label>Cover Photo</Label>
                <div className="mt-1">
                  <ImageUpload
                    value={personal.cover_url}
                    onChange={url => setPersonal({...personal, cover_url: url})}
                    placeholder="Upload cover"
                    aspectRatio="aspect-video"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Display Name</Label>
              <Input value={personal.display_name} onChange={e => setPersonal({...personal, display_name: e.target.value})} className="mt-1 h-11" />
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
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              {/* Header with master on/off toggle */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${personal.ticker_type !== 'none' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                    <Radio className={`w-4 h-4 ${personal.ticker_type !== 'none' ? 'text-amber-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <Label className="text-base font-semibold cursor-pointer">Ticker Bar</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {personal.ticker_type === 'none'
                        ? 'Off — your posts show as a clean feed'
                        : 'Scrolls under every post you make'}
                    </p>
                  </div>
                </div>
                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={personal.ticker_type !== 'none'}
                  onClick={() => setPersonal({
                    ...personal,
                    ticker_type: personal.ticker_type === 'none' ? 'auto' : 'none',
                  })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                    personal.ticker_type !== 'none' ? 'bg-amber-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow-md transition-transform ${
                      personal.ticker_type !== 'none' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Expanded content — only when ticker is ON */}
              {personal.ticker_type !== 'none' && (
                <>
                  <div className="h-px bg-border/50 mx-4" />

                  {/* Type picker */}
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Choose type</p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Skip 'none' — we already have the toggle above */}
                      {TICKER_TYPES.filter(t => t.value !== 'none').map(t => {
                        const TIcon = t.Icon;
                        const isSelected = personal.ticker_type === t.value;
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setPersonal({ ...personal, ticker_type: t.value })}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'border-2 shadow-sm'
                                : 'border-border/60 hover:border-border bg-card'
                            }`}
                            style={isSelected && t.color ? { borderColor: t.color, backgroundColor: t.color + '0c' } : {}}
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                              style={{ backgroundColor: t.color ? t.color + '20' : '#f1f5f9' }}
                            >
                              <TIcon className="w-3.5 h-3.5" style={{ color: t.color || '#94a3b8' }} />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-xs font-semibold"
                                style={isSelected && t.color ? { color: t.color } : {}}
                              >
                                {t.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message input */}
                  <div className="px-4 pb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Your message</p>
                    <Input
                      value={personal.ticker_text}
                      onChange={e => setPersonal({ ...personal, ticker_text: e.target.value })}
                      placeholder={
                        TICKER_TYPES.find(t => t.value === personal.ticker_type)?.placeholder ??
                        'Type your message...'
                      }
                      className="h-11"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {personal.ticker_type === 'auto'
                        ? 'Leave blank to auto-generate from your business contact info.'
                        : 'This message scrolls under every post you make on the feed.'}
                    </p>
                  </div>

                  {/* Live preview */}
                  {(personal.ticker_text || personal.ticker_type !== 'auto') && (
                    <div>
                      <div className="flex items-center gap-1.5 px-4 pb-1.5">
                        <Eye className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Preview</span>
                      </div>
                      <TickerBar
                        text={personal.ticker_text || TICKER_TYPES.find(t => t.value === personal.ticker_type)?.placeholder || ''}
                        type={personal.ticker_type}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Off state confirmation */}
              {personal.ticker_type === 'none' && (
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <Radio className="w-4 h-4 text-slate-300 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Ticker is off. Toggle it on to add scrolling info — promotions, contact details, announcements, and more.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <Button onClick={handleSavePersonal} disabled={saving || !personal.display_name} className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
              {saving ? "Saving..." : "Save Profile"}
            </Button>

            {/* Push Notifications toggle */}
            <PushSettingsCard />
          </div>
        )}

        {tab === "business" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Business Logo</Label>
                <div className="mt-1">
                  <ImageUpload
                    value={business.business_logo_url}
                    onChange={url => setBusiness({...business, business_logo_url: url})}
                    placeholder="Upload logo"
                    aspectRatio="aspect-square"
                  />
                </div>
              </div>
              <div>
                <Label>Cover Image</Label>
                <div className="mt-1">
                  <ImageUpload
                    value={business.business_cover_url}
                    onChange={url => setBusiness({...business, business_cover_url: url})}
                    placeholder="Upload cover"
                    aspectRatio="aspect-video"
                  />
                </div>
              </div>
            </div>
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
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                {BUSINESS_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.value} onClick={() => setBusiness({...business, business_category: cat.value, business_template: String(cat.templates[0].id)})} className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${business.business_category === cat.value ? "border-amber-400 bg-amber-50" : "border-border hover:border-amber-300"}`}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + "20" }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                      </div>
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
                {selectedCategory && (
            <div>
              <Label>Website Template</Label>
              <div className="space-y-2 mt-2">
                {selectedCategory.templates.map(tpl => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    selected={business.business_template === String(tpl.id)}
                    onSelect={() => setBusiness({...business, business_template: String(tpl.id)})}
                  />
                ))}
              </div>
            </div>
          )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={business.business_contact_email} onChange={e => setBusiness({...business, business_contact_email: e.target.value})} className="mt-1 h-11" />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={business.business_contact_phone} onChange={e => setBusiness({...business, business_contact_phone: e.target.value})} placeholder="+251..." className="mt-1 h-11" />
              </div>
            </div>
            <div>
              <Label>Business Address</Label>
              <Input value={business.business_address} onChange={e => setBusiness({...business, business_address: e.target.value})} placeholder="Bole, Addis Ababa" className="mt-1 h-11" />
            </div>
            <div>
              <Label>Theme Color</Label>
              <div className="flex gap-2 mt-2">
                {["#D4AF37", "#3B82F6", "#8B5CF6", "#06B6D4", "#F97316", "#EC4899", "#10B981", "#EF4444"].map(color => (
                  <button key={color} onClick={() => setBusiness({...business, business_theme_color: color})} className={`w-8 h-8 rounded-full border-2 transition-all ${business.business_theme_color === color ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <Button onClick={handleSaveBusiness} disabled={saving || !business.business_name || !business.business_category} className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
              {saving ? "Saving..." : profile?.has_business_profile ? "Update Business Profile" : "Launch Business Profile"}
            </Button>
          </div>
        )}
      </div>
  );
}



