'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { entities } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";

import { ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_CATEGORIES, getTemplateById } from "@/lib/businessTemplates";

/** Fill template sections with the user's real business data */
function personalizeSections(sections, biz) {
  return sections.map(s => {
    const copy = { ...s, items: s.items ? s.items.map(i => ({ ...i })) : undefined };
    if (copy.type === "hero") {
      copy.title = biz.business_name || copy.title;
      copy.subtitle = biz.business_description?.slice(0, 120) || copy.subtitle;
    }
    if (copy.type === "about" || copy.type === "story") {
      copy.content = biz.business_description || copy.content || "";
    }
    if (copy.type === "contact") {
      copy.email = biz.business_contact_email || copy.email || "";
      copy.phone = biz.business_contact_phone || copy.phone || "";
      copy.location = biz.business_address || copy.location || "";
    }
    return copy;
  });
}
import TemplateCard from "@/components/profile/TemplateCard";
import ImageUpload from "@/components/ui/ImageUpload";
import ErrorBoundary from '@/components/ErrorBoundary';
import { toast } from 'sonner';

function BusinessCreate() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draftId');
  const paramId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const idValue = searchParams.get("id") || paramId;
  const id = typeof idValue === 'string' ? idValue : '';
  const isEdit = !!id;
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (isEdit) loadBusiness();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadBusiness = async () => {
    try {
      const b = await entities.Business.get(id);
      setBusiness({
        business_name: b.business_name || "",
        business_category: b.business_category || "",
        business_template: b.business_template || "",
        business_description: b.business_description || "",
        business_contact_email: b.business_contact_email || "",
        business_contact_phone: b.business_contact_phone || "",
        business_address: b.business_address || "",
        business_theme_color: b.business_theme_color || "#D4AF37",
        business_logo_url: b.business_logo_url || "",
        business_cover_url: b.business_cover_url || ""
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load this business. Please try again.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const rawSections = getTemplateById(business.business_category, business.business_template)?.sections || [];
    const sections = JSON.stringify(personalizeSections(rawSections, business));
    const updateData = { ...business, business_sections: sections, owner_id: user?.id };
    try {
      if (isEdit) {
        await entities.Business.update(id, updateData);
      } else {
        await entities.Business.create(updateData);
        // Update user profile to mark has_business_profile
        const profiles = await entities.UserProfile.filter({ user_id: user?.id });
        if (profiles.length > 0) {
          await entities.UserProfile.update(profiles[0].id, { has_business_profile: true });
        }
      }
      router.push(draftId && !isEdit ? `/showroom/create?edit=${encodeURIComponent(draftId)}` : "/profile?view=business");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save this business. Please try again.');
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
        <div className="flex items-center gap-2 mb-6">
          <Store className="w-6 h-6 text-amber-500" />
          <h1 className="font-display text-2xl font-bold">{isEdit ? "Edit Business" : "New Business"}</h1>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
            <Label htmlFor="business-name">Business Name</Label>
            <Input id="business-name" value={business.business_name} onChange={e => setBusiness({...business, business_name: e.target.value})} placeholder="e.g. Abebe's Coffee Shop" className="mt-1 h-11" />
          </div>
          <div>
            <Label htmlFor="business-description">Business Description</Label>
            <Textarea id="business-description" value={business.business_description} onChange={e => setBusiness({...business, business_description: e.target.value})} placeholder="What does your business do?" className="mt-1" rows={2} />
          </div>
          <div>
            <Label>Business Category</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
              {BUSINESS_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button key={cat.value} type="button" aria-pressed={business.business_category === cat.value} onClick={() => setBusiness({...business, business_category: cat.value, business_template: String(cat.templates[0].id)})} className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${business.business_category === cat.value ? "border-amber-400 bg-amber-50" : "border-border hover:border-amber-300"}`}>
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
              <Label htmlFor="business-contact-email">Contact Email</Label>
              <Input id="business-contact-email" type="email" value={business.business_contact_email} onChange={e => setBusiness({...business, business_contact_email: e.target.value})} className="mt-1 h-11" />
            </div>
            <div>
              <Label htmlFor="business-contact-phone">Contact Phone</Label>
              <Input id="business-contact-phone" type="tel" value={business.business_contact_phone} onChange={e => setBusiness({...business, business_contact_phone: e.target.value})} placeholder="+251 9 12 34 56 78" className="mt-1 h-11" />
            </div>
          </div>
          <div>
            <Label htmlFor="business-address">Business Address</Label>
            <Input id="business-address" autoComplete="street-address" value={business.business_address} onChange={e => setBusiness({...business, business_address: e.target.value})} placeholder="Your city or area" className="mt-1 h-11" />
          </div>
          <div>
            <Label>Theme Color</Label>
            <div className="flex gap-2 mt-2">
              {["#D4AF37", "#3B82F6", "#8B5CF6", "#06B6D4", "#F97316", "#EC4899", "#10B981", "#EF4444"].map(color => (
                <button key={color} type="button" aria-label={`Theme color ${color}`} aria-pressed={business.business_theme_color === color} onClick={() => setBusiness({...business, business_theme_color: color})} className={`w-8 h-8 rounded-full border-2 transition-all ${business.business_theme_color === color ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !business.business_name || !business.business_category} className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
            {saving ? "Saving..." : isEdit ? "Update Business" : "Create Business"}
          </Button>
        </div>
      </div>
  );
}

export default function BusinessCreatePage() {
  return <ErrorBoundary><BusinessCreate /></ErrorBoundary>;
}
