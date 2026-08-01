'use client';
/**
 * ProfileEdit — LinkedIn/Facebook-style profile editor.
 *
 * Personal tab: photo, cover, name, headline, bio, location, phone,
 *   website, skills, languages, education, experience, social links, ticker.
 *
 * Business tab: logo, cover, name, category, description, founded year,
 *   team size, contact, address, website, social links, services,
 *   certifications, awards, business type, registration number, template.
 */
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { auth } from '@/api/auth';
import { entities, type UserProfile } from '@/api/entities';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, User, Store, Eye, Radio, Bell, BellOff,
  Plus, X, Globe, MapPin, Phone, Mail, Link as LinkIcon,
  GraduationCap, Briefcase, Award, Star, Languages as LangIcon,
  Shield, FileText, Building2, Users, Calendar, Hash,
  ChevronDown, ChevronUp, Camera, Edit3, CheckCircle,
  ExternalLink, AtSign, Share2, Rss, Link2,
} from 'lucide-react';

// Social platform icon stubs (lucide-react v1 doesn't include brand icons)
const LinkedinIcon   = Link2;
const TwitterIcon    = AtSign;
const InstagramIcon  = Share2;
const FacebookIcon   = Rss;
const YoutubeIcon    = ExternalLink;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BUSINESS_CATEGORIES, getTemplateById } from '@/lib/businessTemplates';
import TemplateCard from '@/components/profile/TemplateCard';
import ImageUpload from '@/components/ui/ImageUpload';
import TickerBar, { TICKER_TYPES } from '@/components/feed/TickerBar';
import { toast } from 'sonner';
import VerificationRequest from '@/components/profile/VerificationRequest';
import { getPushPermission, subscribeToPush, unsubscribeFromPush } from '@/lib/push';

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children, defaultOpen = true }: {
  icon: React.ElementType; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-secondary/30 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-border/40 pt-3 space-y-3">{children}</div>}
    </div>
  );
}

// ── Tag list editor (skills, languages, etc.) ──────────────────────────────
function TagListEditor({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder} className="h-9 flex-1" />
        <Button type="button" size="sm" onClick={add} className="h-9 px-3 rounded-xl">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
            {v}
            <button onClick={() => onChange(values.filter(x => x !== v))} className="text-blue-400 hover:text-blue-700">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Experience / Education list editor ─────────────────────────────────────
interface ExpEntry { id: string; title: string; org: string; period: string; desc: string; }
function EntryListEditor({ values, onChange, labels }: {
  values: ExpEntry[]; onChange: (v: ExpEntry[]) => void;
  labels: { title: string; org: string; titlePH: string; orgPH: string };
}) {
  const blank = (): ExpEntry => ({ id: Date.now().toString(), title: '', org: '', period: '', desc: '' });
  const update = (id: string, field: keyof ExpEntry, val: string) =>
    onChange(values.map(e => e.id === id ? { ...e, [field]: val } : e));
  return (
    <div className="space-y-3">
      {values.map(entry => (
        <div key={entry.id} className="border border-border/50 rounded-xl p-3 space-y-2 bg-secondary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{labels.title}</span>
            <button onClick={() => onChange(values.filter(e => e.id !== entry.id))}
              className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <Input value={entry.title} onChange={e => update(entry.id, 'title', e.target.value)} placeholder={labels.titlePH} className="h-9" />
          <Input value={entry.org} onChange={e => update(entry.id, 'org', e.target.value)} placeholder={labels.orgPH} className="h-9" />
          <Input value={entry.period} onChange={e => update(entry.id, 'period', e.target.value)} placeholder="e.g. Jan 2020 – Present" className="h-9" />
          <Textarea value={entry.desc} onChange={e => update(entry.id, 'desc', e.target.value)} placeholder="Brief description..." rows={2} className="text-sm" />
        </div>
      ))}
      <button onClick={() => onChange([...values, blank()])}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-blue-400 transition-all">
        <Plus className="w-4 h-4" /> Add {labels.title}
      </button>
    </div>
  );
}

// ── Certification / Award list editor ──────────────────────────────────────
interface CertEntry { id: string; name: string; issuer: string; year: string; credentialId?: string; }
function CertListEditor({ values, onChange, type }: {
  values: CertEntry[]; onChange: (v: CertEntry[]) => void; type: 'cert' | 'award';
}) {
  const blank = (): CertEntry => ({ id: Date.now().toString(), name: '', issuer: '', year: '', credentialId: '' });
  const update = (id: string, field: keyof CertEntry, val: string) =>
    onChange(values.map(e => e.id === id ? { ...e, [field]: val } : e));
  const ph = type === 'cert'
    ? { name: 'e.g. ISO 9001:2015 Certification', issuer: 'e.g. ISO / Bureau Veritas', id: 'Credential ID (optional)' }
    : { name: 'e.g. Best Startup 2023', issuer: 'e.g. Ethiopian Chamber of Commerce', id: '' };
  return (
    <div className="space-y-3">
      {values.map(entry => (
        <div key={entry.id} className="border border-border/50 rounded-xl p-3 space-y-2 bg-secondary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">{type === 'cert' ? 'Certificate' : 'Award'}</span>
            <button onClick={() => onChange(values.filter(e => e.id !== entry.id))} className="text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>
          <Input value={entry.name} onChange={e => update(entry.id, 'name', e.target.value)} placeholder={ph.name} className="h-9" />
          <Input value={entry.issuer} onChange={e => update(entry.id, 'issuer', e.target.value)} placeholder={ph.issuer} className="h-9" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={entry.year} onChange={e => update(entry.id, 'year', e.target.value)} placeholder="Year" className="h-9" />
            {type === 'cert' && <Input value={entry.credentialId || ''} onChange={e => update(entry.id, 'credentialId', e.target.value)} placeholder={ph.id} className="h-9" />}
          </div>
        </div>
      ))}
      <button onClick={() => onChange([...values, blank()])}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-blue-400 transition-all">
        <Plus className="w-4 h-4" /> Add {type === 'cert' ? 'Certificate' : 'Award'}
      </button>
    </div>
  );
}

// ── Push toggle card ──────────────────────────────────────────────────────
function PushSettingsCard() {
  const [perm, setPerm] = useState(() => getPushPermission());
  const [loading, setLoading] = useState(false);
  const handleToggle = async () => {
    setLoading(true);
    if (perm === 'granted') {
      const ok = await unsubscribeFromPush();
      if (ok) { setPerm('default'); toast.success('Push notifications disabled'); }
      else toast.error('Failed to disable');
    } else {
      const ok = await subscribeToPush();
      if (ok) { setPerm('granted'); toast.success('Push notifications enabled 🔔'); }
      else { setPerm(getPushPermission()); toast.error('Permission denied — check browser settings'); }
    }
    setLoading(false);
  };
  if (getPushPermission() === 'unsupported') return null;
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${perm === 'granted' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-secondary/50'}`}>
        {perm === 'granted' ? <Bell className="w-4 h-4 text-amber-600" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Push Notifications</p>
        <p className="text-xs text-muted-foreground">
          {perm === 'granted' ? "Enabled — notified even when app is closed"
            : perm === 'denied' ? 'Blocked in browser settings'
            : 'Get notified about likes, messages and orders'}
        </p>
      </div>
      {perm !== 'denied' && (
        <button onClick={handleToggle} disabled={loading} aria-label="Toggle push"
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${perm === 'granted' ? 'bg-amber-500' : 'bg-secondary'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${perm === 'granted' ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      )}
      {perm === 'denied' && <span className="text-[10px] text-muted-foreground shrink-0">Blocked</span>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ProfileEdit() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const isBusinessSetup = pathname.includes('setup-business');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'personal' | 'business'>(isBusinessSetup ? 'business' : 'personal');

  // ── Personal state ──────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({
    display_name: '', bio: '', headline: '', location: '', phone: '',
    website: '', ticker_text: '', ticker_type: 'none',
    avatar_url: '' as string | string[],
    cover_url: '' as string | string[],
    // LinkedIn-style extras stored as JSON in profile.extra_json
    skills: [] as string[],
    languages: [] as string[],
    experience: [] as ExpEntry[],
    education: [] as ExpEntry[],
    social_linkedin: '', social_twitter: '', social_instagram: '',
    social_facebook: '', social_youtube: '',
  });

  // ── Business state ──────────────────────────────────────────────────────
  const [business, setBusiness] = useState({
    business_name: '', business_category: '', business_template: '' as string | string[],
    business_description: '', business_contact_email: '', business_contact_phone: '',
    business_address: '', business_theme_color: '#2563EB',
    business_logo_url: '' as string | string[],
    business_cover_url: '' as string | string[],
    // Professional extras
    business_website: '', business_founded_year: '', business_team_size: '',
    business_registration_number: '', business_type: '',
    business_social_linkedin: '', business_social_twitter: '', business_social_facebook: '',
    certifications: [] as CertEntry[],
    awards: [] as CertEntry[],
    services: [] as string[],
    service_areas: [] as string[],
  });

  useEffect(() => { loadData(); }, []);

  const parseJSON = (v: any, fallback: any) => {
    if (!v) return fallback;
    if (typeof v === 'object') return v;
    try { return JSON.parse(v); } catch { return fallback; }
  };

  const loadData = async () => {
    try {
      const me = (await auth.me()) as { id?: string; full_name?: string; email?: string };
      setUser(me);
      const profiles = await entities.UserProfile.filter({ user_id: me.id }) as UserProfile[];
      if (profiles.length > 0) {
        const p = profiles[0] as any;
        setProfile(p);
        const extra = parseJSON(p.extra_json, {});
        const avatar_url = Array.isArray(p.avatar_url) ? (p.avatar_url[0] ?? '') : (p.avatar_url || '');
        const cover_url  = Array.isArray(p.cover_url)  ? (p.cover_url[0]  ?? '') : (p.cover_url  || '');
        const biz_template   = Array.isArray(p.business_template)   ? (p.business_template[0]   ?? '') : (p.business_template   || '');
        const biz_logo_url   = Array.isArray(p.business_logo_url)   ? (p.business_logo_url[0]   ?? '') : (p.business_logo_url   || '');
        const biz_cover_url  = Array.isArray(p.business_cover_url)  ? (p.business_cover_url[0]  ?? '') : (p.business_cover_url  || '');

        setPersonal({
          display_name: p.display_name || me.full_name || '',
          bio: p.bio || '', headline: p.headline || '',
          location: p.location || '', phone: p.phone || '',
          website: p.website || extra.website || '',
          ticker_text: p.ticker_text || '', ticker_type: p.ticker_type || 'none',
          avatar_url, cover_url,
          skills:     parseJSON(p.skills,     extra.skills     || []),
          languages:  parseJSON(p.languages,  extra.languages  || []),
          experience: parseJSON(p.experience, extra.experience || []),
          education:  parseJSON(p.education,  extra.education  || []),
          social_linkedin:  p.social_linkedin  || extra.social_linkedin  || '',
          social_twitter:   p.social_twitter   || extra.social_twitter   || '',
          social_instagram: p.social_instagram || extra.social_instagram || '',
          social_facebook:  p.social_facebook  || extra.social_facebook  || '',
          social_youtube:   p.social_youtube   || extra.social_youtube   || '',
        });
        const bizExtra = parseJSON(p.business_extra_json, {});
        setBusiness({
          business_name: p.business_name || '', business_category: p.business_category || '',
          business_template: biz_template, business_description: p.business_description || '',
          business_contact_email: p.business_contact_email || me.email || '',
          business_contact_phone: p.business_contact_phone || p.phone || '',
          business_address: p.business_address || p.location || '',
          business_theme_color: p.business_theme_color || '#2563EB',
          business_logo_url: biz_logo_url, business_cover_url: biz_cover_url,
          business_website:             p.business_website            || bizExtra.website || '',
          business_founded_year:        p.business_founded_year       || bizExtra.founded_year || '',
          business_team_size:           p.business_team_size          || bizExtra.team_size || '',
          business_registration_number: p.business_registration_number|| bizExtra.reg_number || '',
          business_type:                p.business_type               || bizExtra.type || '',
          business_social_linkedin:     p.business_social_linkedin    || bizExtra.linkedin || '',
          business_social_twitter:      p.business_social_twitter     || bizExtra.twitter  || '',
          business_social_facebook:     p.business_social_facebook    || bizExtra.facebook || '',
          certifications: parseJSON(p.certifications, bizExtra.certifications || []),
          awards:         parseJSON(p.awards,         bizExtra.awards         || []),
          services:       parseJSON(p.services,       bizExtra.services       || []),
          service_areas:  parseJSON(p.service_areas,  bizExtra.service_areas  || []),
        });
      }
    } catch (err) { console.error('loadData error', err); }
  };

  const handleSavePersonal = async () => {
    setSaving(true);
    try {
      const payload = {
        ...personal,
        skills:     JSON.stringify(personal.skills),
        languages:  JSON.stringify(personal.languages),
        experience: JSON.stringify(personal.experience),
        education:  JSON.stringify(personal.education),
      };
      if (profile) {
        await entities.UserProfile.update(profile.id, payload);
      } else {
        await entities.UserProfile.create({ ...payload, user_id: user?.id, profile_type: 'personal' });
      }
      toast.success('Profile saved ✓');
      router.push('/profile');
    } catch (err: any) {
      toast.error(err?.error || err?.message || 'Failed to save profile');
    } finally { setSaving(false); }
  };

  const handleSaveBusiness = async () => {
    setSaving(true);
    try {
      const sections = JSON.stringify(getTemplateById(business.business_category, business.business_template)?.sections || []);
      const payload = {
        ...business,
        has_business_profile: true,
        business_sections: sections,
        certifications: JSON.stringify(business.certifications),
        awards:         JSON.stringify(business.awards),
        services:       JSON.stringify(business.services),
        service_areas:  JSON.stringify(business.service_areas),
      };
      if (profile) {
        await entities.UserProfile.update(profile.id, payload);
      } else {
        await entities.UserProfile.create({ ...payload, user_id: user?.id, display_name: user?.full_name, profile_type: 'business' });
      }
      toast.success('Business profile saved ✓');
      router.push('/profile');
    } catch (err: any) {
      toast.error(err?.error || err?.message || 'Failed to save business profile');
    } finally { setSaving(false); }
  };

  const p = personal;
  const sp = (field: keyof typeof personal, val: any) => setPersonal(prev => ({ ...prev, [field]: val }));
  const b = business;
  const sb = (field: keyof typeof business, val: any) => setBusiness(prev => ({ ...prev, [field]: val }));
  const selectedCategory = BUSINESS_CATEGORIES.find(c => c.value === b.business_category);

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{isBusinessSetup ? 'Business Profile Setup' : 'Edit Profile'}</h1>
          <p className="text-xs text-muted-foreground">Your information is only shown to people you choose</p>
        </div>
      </div>

      {/* Tab bar */}
      {!isBusinessSetup && (
        <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-6">
          <button onClick={() => setTab('personal')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2
              ${tab === 'personal' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}>
            <User className="w-4 h-4" /> Personal
          </button>
          <button onClick={() => setTab('business')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2
              ${tab === 'business' ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}>
            <Store className="w-4 h-4" /> Business
          </button>
        </div>
      )}

      {/* ══════════════ PERSONAL TAB ══════════════ */}
      {tab === 'personal' && (
        <div className="space-y-4">

          {/* Photos — cover + avatar overlay */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="relative">
              {/* Cover photo */}
              <div className="h-32 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 relative">
                {p.cover_url && typeof p.cover_url === 'string' && p.cover_url && (
                  <Image src={p.cover_url} alt="Cover" fill className="object-cover" unoptimized />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageUpload value={p.cover_url} onChange={url => sp('cover_url', url)}
                    placeholder="" aspectRatio="aspect-video"
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5 pointer-events-none">
                    <Camera className="w-3.5 h-3.5 text-white" />
                    <span className="text-white text-xs font-medium">Edit cover</span>
                  </div>
                </div>
              </div>
              {/* Avatar overlapping cover */}
              <div className="px-4 -mt-10 pb-3 flex items-end justify-between">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl ring-4 ring-card overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {p.avatar_url && typeof p.avatar_url === 'string' && p.avatar_url
                      ? <Image src={p.avatar_url} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" unoptimized />
                      : (p.display_name?.charAt(0) || 'U')}
                  </div>
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <ImageUpload value={p.avatar_url} onChange={url => sp('avatar_url', url)}
                      placeholder="" aspectRatio="aspect-square"
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-tl-lg flex items-center justify-center pointer-events-none">
                      <Camera className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Basic info */}
          <Section icon={User} title="Basic Information">
            <div>
              <Label>Full Name *</Label>
              <Input value={p.display_name} onChange={e => sp('display_name', e.target.value)} placeholder="Your full name" className="mt-1 h-11" />
            </div>
            <div>
              <Label>Headline</Label>
              <Input value={p.headline} onChange={e => sp('headline', e.target.value)} placeholder="e.g. Software Engineer · Addis Ababa" className="mt-1 h-11" />
              <p className="text-[11px] text-muted-foreground mt-1">This appears under your name across the app</p>
            </div>
            <div>
              <Label>Bio / About</Label>
              <Textarea value={p.bio} onChange={e => sp('bio', e.target.value)}
                placeholder="Tell people who you are, what you do, and what you're passionate about..." rows={4} className="mt-1" />
            </div>
          </Section>

          {/* Contact & Location */}
          <Section icon={MapPin} title="Contact & Location">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Location</Label>
                <Input value={p.location} onChange={e => sp('location', e.target.value)} placeholder="Addis Ababa, Ethiopia" className="mt-1 h-11" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={p.phone} onChange={e => sp('phone', e.target.value)} placeholder="+251 9XX XXX XXX" className="mt-1 h-11" />
              </div>
            </div>
            <div>
              <Label>Website / Portfolio</Label>
              <Input value={p.website} onChange={e => sp('website', e.target.value)} placeholder="https://yourwebsite.com" className="mt-1 h-11" />
            </div>
          </Section>

          {/* Experience */}
          <Section icon={Briefcase} title="Work Experience" defaultOpen={false}>
            <EntryListEditor values={p.experience} onChange={v => sp('experience', v)}
              labels={{ title: 'Job Title', org: 'Company', titlePH: 'e.g. Senior Engineer', orgPH: 'e.g. Ethio Telecom' }} />
          </Section>

          {/* Education */}
          <Section icon={GraduationCap} title="Education" defaultOpen={false}>
            <EntryListEditor values={p.education} onChange={v => sp('education', v)}
              labels={{ title: 'Degree / Field', org: 'Institution', titlePH: 'e.g. BSc Computer Science', orgPH: 'e.g. Addis Ababa University' }} />
          </Section>

          {/* Skills */}
          <Section icon={Star} title="Skills" defaultOpen={false}>
            <p className="text-xs text-muted-foreground">Add up to 50 skills — press Enter after each one</p>
            <TagListEditor values={p.skills} onChange={v => sp('skills', v)} placeholder="e.g. React, Python, Marketing..." />
          </Section>

          {/* Languages */}
          <Section icon={LangIcon} title="Languages" defaultOpen={false}>
            <TagListEditor values={p.languages} onChange={v => sp('languages', v)} placeholder="e.g. Amharic, English, Oromo..." />
          </Section>

          {/* Social links */}
          <Section icon={Globe} title="Social Links" defaultOpen={false}>
            {[
              { field: 'social_linkedin',  icon: LinkedinIcon,  ph: 'LinkedIn profile URL' },
              { field: 'social_twitter',   icon: TwitterIcon,   ph: 'X / Twitter profile URL' },
              { field: 'social_instagram', icon: InstagramIcon, ph: 'Instagram profile URL' },
              { field: 'social_facebook',  icon: FacebookIcon,  ph: 'Facebook profile URL' },
              { field: 'social_youtube',   icon: YoutubeIcon,   ph: 'YouTube channel URL' },
            ].map(({ field, icon: Icon, ph }) => (
              <div key={field} className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={(p as any)[field]} onChange={e => sp(field as any, e.target.value)}
                  placeholder={ph} className="pl-9 h-11" />
              </div>
            ))}
          </Section>

          {/* Ticker */}
          <Section icon={Radio} title="Post Ticker Bar" defaultOpen={false}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Scrolls under every post you make</p>
              <button type="button" role="switch" aria-checked={p.ticker_type !== 'none'}
                onClick={() => sp('ticker_type', p.ticker_type === 'none' ? 'auto' : 'none')}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${p.ticker_type !== 'none' ? 'bg-amber-500' : 'bg-secondary'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${p.ticker_type !== 'none' ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {p.ticker_type !== 'none' && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {TICKER_TYPES.filter(t => t.value !== 'none').map(tt => {
                    const TI = tt.Icon;
                    const sel = p.ticker_type === tt.value;
                    return (
                      <button key={tt.value} type="button" onClick={() => sp('ticker_type', tt.value)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-xs ${sel ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-border hover:border-amber-300'}`}>
                        <TI className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span className="font-medium">{tt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <Input value={p.ticker_text} onChange={e => sp('ticker_text', e.target.value)}
                  placeholder={TICKER_TYPES.find(t => t.value === p.ticker_type)?.placeholder || 'Your message...'} className="h-11 mb-2" />
                {p.ticker_text && <TickerBar text={p.ticker_text} type={p.ticker_type} />}
              </>
            )}
          </Section>

          <PushSettingsCard />
          <VerificationRequest />

          <Button onClick={handleSavePersonal} disabled={saving || !p.display_name}
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-md shadow-blue-600/20">
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      )}

      {/* ══════════════ BUSINESS TAB ══════════════ */}
      {tab === 'business' && (
        <div className="space-y-4">

          {/* Business photos */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="relative">
              <div className="h-32 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 relative">
                {b.business_cover_url && typeof b.business_cover_url === 'string' && b.business_cover_url && (
                  <Image src={b.business_cover_url} alt="Cover" fill className="object-cover" unoptimized />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageUpload value={b.business_cover_url} onChange={url => sb('business_cover_url', url)}
                    placeholder="" aspectRatio="aspect-video"
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5 pointer-events-none">
                    <Camera className="w-3.5 h-3.5 text-white" />
                    <span className="text-white text-xs font-medium">Edit cover</span>
                  </div>
                </div>
              </div>
              <div className="px-4 -mt-10 pb-3">
                <div className="relative w-20 h-20">
                  <div className="w-20 h-20 rounded-2xl ring-4 ring-card overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {b.business_logo_url && typeof b.business_logo_url === 'string' && b.business_logo_url
                      ? <Image src={b.business_logo_url} alt="Logo" width={80} height={80} className="w-full h-full object-cover" unoptimized />
                      : (b.business_name?.charAt(0) || 'B')}
                  </div>
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <ImageUpload value={b.business_logo_url} onChange={url => sb('business_logo_url', url)}
                      placeholder="" aspectRatio="aspect-square"
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-amber-500 rounded-tl-lg flex items-center justify-center pointer-events-none">
                      <Camera className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Core business info */}
          <Section icon={Building2} title="Business Information">
            <div>
              <Label>Business Name *</Label>
              <Input value={b.business_name} onChange={e => sb('business_name', e.target.value)} placeholder="e.g. Haile Construction PLC" className="mt-1 h-11" />
            </div>
            <div>
              <Label>About / Description</Label>
              <Textarea value={b.business_description} onChange={e => sb('business_description', e.target.value)}
                placeholder="Describe what your business does, your mission, and what makes you unique..." rows={4} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Business Type</Label>
                <select value={b.business_type} onChange={e => sb('business_type', e.target.value)}
                  className="w-full h-11 px-3 mt-1 bg-secondary/50 border border-border/50 rounded-xl text-sm outline-none focus:ring-1 focus:ring-amber-500/30">
                  <option value="">Select type</option>
                  <option>Sole Proprietorship</option>
                  <option>Partnership</option>
                  <option>Private Limited Company (PLC)</option>
                  <option>Public Limited Company (SC)</option>
                  <option>NGO / Non-Profit</option>
                  <option>Government Entity</option>
                  <option>Cooperative</option>
                  <option>Franchise</option>
                </select>
              </div>
              <div>
                <Label>Team Size</Label>
                <select value={b.business_team_size} onChange={e => sb('business_team_size', e.target.value)}
                  className="w-full h-11 px-3 mt-1 bg-secondary/50 border border-border/50 rounded-xl text-sm outline-none focus:ring-1 focus:ring-amber-500/30">
                  <option value="">Select size</option>
                  <option>1 (Just me)</option>
                  <option>2–10</option>
                  <option>11–50</option>
                  <option>51–200</option>
                  <option>201–500</option>
                  <option>500+</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Founded Year</Label>
                <Input value={b.business_founded_year} onChange={e => sb('business_founded_year', e.target.value)} placeholder="e.g. 2018" className="mt-1 h-11" />
              </div>
              <div>
                <Label>Registration No.</Label>
                <Input value={b.business_registration_number} onChange={e => sb('business_registration_number', e.target.value)} placeholder="e.g. ETH-123456" className="mt-1 h-11" />
              </div>
            </div>
          </Section>

          {/* Category & Template */}
          <Section icon={Hash} title="Category & Template">
            <Label>Business Category *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-52 overflow-y-auto pr-1">
              {BUSINESS_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button key={cat.value} onClick={() => sb('business_category', cat.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${b.business_category === cat.value ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-border hover:border-amber-300'}`}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + '20' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                    </div>
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedCategory && (
              <div className="mt-3">
                <Label>Website Template</Label>
                <div className="space-y-2 mt-2">
                  {selectedCategory.templates.map(tpl => (
                    <TemplateCard key={tpl.id} template={tpl}
                      selected={b.business_template === String(tpl.id)}
                      onSelect={() => sb('business_template', String(tpl.id))} />
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Contact */}
          <Section icon={Phone} title="Contact Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" value={b.business_contact_email} onChange={e => sb('business_contact_email', e.target.value)}
                  placeholder="contact@business.com" className="pl-9 mt-0 h-11" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={b.business_contact_phone} onChange={e => sb('business_contact_phone', e.target.value)}
                  placeholder="+251 9XX XXX XXX" className="pl-9 mt-0 h-11" />
              </div>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={b.business_address} onChange={e => sb('business_address', e.target.value)}
                placeholder="Street, City, Country" className="pl-9 h-11" />
            </div>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={b.business_website} onChange={e => sb('business_website', e.target.value)}
                placeholder="https://yourcompany.com" className="pl-9 h-11" />
            </div>
          </Section>

          {/* Services */}
          <Section icon={Star} title="Services Offered" defaultOpen={false}>
            <TagListEditor values={b.services} onChange={v => sb('services', v)} placeholder="e.g. Web Design, Consulting..." />
          </Section>

          {/* Service areas */}
          <Section icon={MapPin} title="Service Areas" defaultOpen={false}>
            <p className="text-xs text-muted-foreground">Where do you provide your services?</p>
            <TagListEditor values={b.service_areas} onChange={v => sb('service_areas', v)} placeholder="e.g. Addis Ababa, Dire Dawa..." />
          </Section>

          {/* Certifications */}
          <Section icon={CheckCircle} title="Certifications & Standards" defaultOpen={false}>
            <p className="text-xs text-muted-foreground mb-2">Add professional certifications (ISO, CE, FDA, etc.)</p>
            <CertListEditor values={b.certifications} onChange={v => sb('certifications', v)} type="cert" />
          </Section>

          {/* Awards */}
          <Section icon={Award} title="Awards & Recognition" defaultOpen={false}>
            <p className="text-xs text-muted-foreground mb-2">Business awards, recognitions, and achievements</p>
            <CertListEditor values={b.awards} onChange={v => sb('awards', v)} type="award" />
          </Section>

          {/* Social links */}
          <Section icon={Globe} title="Social & Online Presence" defaultOpen={false}>
            {[
              { field: 'business_social_linkedin', icon: LinkedinIcon, ph: 'LinkedIn company page URL' },
              { field: 'business_social_twitter',  icon: TwitterIcon,  ph: 'X / Twitter handle URL' },
              { field: 'business_social_facebook', icon: FacebookIcon, ph: 'Facebook page URL' },
            ].map(({ field, icon: Icon, ph }) => (
              <div key={field} className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={(b as any)[field]} onChange={e => sb(field as any, e.target.value)}
                  placeholder={ph} className="pl-9 h-11" />
              </div>
            ))}
          </Section>

          {/* Theme color */}
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <Label className="text-sm font-semibold">Brand Color</Label>
            <div className="flex gap-3 mt-3 flex-wrap">
              {['#2563EB','#D4AF37','#8B5CF6','#06B6D4','#F97316','#EC4899','#10B981','#EF4444','#0F172A','#64748B'].map(color => (
                <button key={color} onClick={() => sb('business_theme_color', color)}
                  className={`w-9 h-9 rounded-full border-2 transition-all shadow-sm ${b.business_theme_color === color ? 'border-foreground scale-110 shadow-md' : 'border-transparent'}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>

          <Button onClick={handleSaveBusiness} disabled={saving || !b.business_name || !b.business_category}
            className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base shadow-md shadow-amber-500/20">
            {saving ? 'Saving...' : profile?.has_business_profile ? 'Update Business Profile' : 'Launch Business Profile'}
          </Button>
        </div>
      )}
    </div>
  );
}
