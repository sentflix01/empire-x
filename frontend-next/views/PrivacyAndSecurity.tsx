'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
   Lock, Eye,
  ChevronRight, CheckCircle, AlertTriangle, FileText, Mail,
  Database, UserX, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';

/* ── Section wrapper ── */
function Section({ title, icon: Icon, iconColor = 'text-blue-600', iconBg = 'bg-blue-50 dark:bg-blue-900/20', children }: {
  title: string; icon: any; iconColor?: string; iconBg?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
      </div>
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/40">
        {children}
      </div>
    </div>
  );
}

/* ── Row toggle ── */
function ToggleRow({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label}
        className="shrink-0 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-secondary" />
    </div>
  );
}

/* ── Select row ── */
function SelectRow({ label, description, value, options, onChange }: {
  label: string; description: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label={label}
        className="h-9 rounded-xl border border-border bg-secondary/50 px-3 text-xs font-semibold outline-none shrink-0">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── Link row ── */
function LinkRow({ label, description, href, danger }: {
  label: string; description: string; href: string; danger?: boolean;
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors ${danger ? 'text-red-500' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? 'text-red-500' : ''}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

/* ── Button row ── */
function ButtonRow({ label, description, onClick, danger, loading }: {
  label: string; description: string; onClick: () => void; danger?: boolean; loading?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors text-left ${danger ? 'hover:bg-red-50 dark:hover:bg-red-950/20' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? 'text-red-500' : ''}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {loading
        ? <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin shrink-0" />
        : <ChevronRight className={`w-4 h-4 shrink-0 ${danger ? 'text-red-400' : 'text-muted-foreground'}`} />}
    </button>
  );
}

interface PrivacySettings {
  profile_visibility: 'public' | 'followers' | 'private';
  searchable: boolean;
  default_comment_policy: 'everyone' | 'followers' | 'off';
  message_policy: 'everyone' | 'followers' | 'nobody';
  show_reactions: boolean;
}
const DEFAULT_PRIVACY: PrivacySettings = { profile_visibility: 'public', searchable: true, default_comment_policy: 'everyone', message_policy: 'everyone', show_reactions: true };

/** People I blocked / muted / restricted, each with an undo button. */
function PeopleList({ kind, title, undo, empty }: { kind: 'blocked' | 'muted' | 'restricted'; title: string; undo: string; empty: string }) {
  const [people, setPeople] = useState<Array<{ user_id: string; display_name?: string | null }> | null>(null);
  useEffect(() => {
    client.get('/api/social/people', { params: { kind } }).then(({ data }) => setPeople(Array.isArray(data) ? data : [])).catch(() => setPeople([]));
  }, [kind]);
  const path = kind === 'blocked' ? 'block' : kind === 'muted' ? 'mute' : 'restrict';
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-semibold">{title}</p>
      {people === null ? <p className="text-xs text-muted-foreground">Loading…</p>
        : people.length === 0 ? <p className="text-xs text-muted-foreground">{empty}</p>
        : (
          <ul className="mt-1 divide-y divide-border/40">
            {people.map((p) => (
              <li key={p.user_id} className="flex min-h-11 items-center justify-between gap-2">
                <Link href={`/profile/${p.user_id}?view=personal`} className="truncate text-sm hover:underline">{p.display_name || 'Member'}</Link>
                <button type="button" onClick={async () => {
                  try { await client.delete(`/api/social/${path}/${p.user_id}`); setPeople((list) => (list ?? []).filter((x) => x.user_id !== p.user_id)); toast.success(`${undo} done`); }
                  catch { toast.error('Could not update'); }
                }} className="min-h-9 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary">{undo}</button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

function PrivacyAndSecurityView() {
  const { logout } = useAuth();

  // Privacy states
  const [lastSeen, setLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  // Saved on the server (/api/social/privacy) and enforced there (lib/socialGraph.ts).
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  useEffect(() => {
    client.get('/api/social/privacy').then(({ data }) => setPrivacy({ ...DEFAULT_PRIVACY, ...data })).catch(() => undefined);
  }, []);
  const savePrivacy = async (changes: Partial<PrivacySettings>, done: string) => {
    const before = privacy;
    setPrivacy({ ...privacy, ...changes });
    try {
      const { data } = await client.put('/api/social/privacy', changes);
      setPrivacy({ ...DEFAULT_PRIVACY, ...data });
      toast.success(done);
    } catch {
      setPrivacy(before);
      toast.error('Could not save this setting');
    }
  };
  const [dataAnalytics, setDataAnalytics] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [twoFactorEnabled] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const updatePresence = async (val: 'everyone' | 'contacts' | 'nobody') => {
    const prev = lastSeen;
    setLastSeen(val);
    try {
      await client.put('/api/messages/presence/settings', { visibility: val });
      toast.success('Last seen setting updated');
    } catch {
      setLastSeen(prev);
      toast.error('Could not update setting');
    }
  };

  const handleExportData = async () => {
    setLoadingExport(true);
    try {
      // Full export: profile, posts, orders, messages sent, wallet ledger, etc.
      const res = await client.get('/api/auth/me/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'my-nodbusiness-data.json'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch { toast.error('Export failed'); }
    setLoadingExport(false);
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleDeleteAccount = async () => {
    setLoadingDelete(true);
    try {
      await client.delete('/api/auth/me', { data: { password: deletePassword || undefined, confirm: deleteConfirm } });
      setDeleteOpen(false);
      toast.success('Account deleted');
      logout('/');
    } catch (err: any) {
      toast.error(err?.error ?? 'Could not delete account. Contact support.');
    }
    setLoadingDelete(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-10">

      {/* ── Hero header ── */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Privacy &amp; Security</h1>
            <p className="text-white/75 text-xs">Control your data and account safety</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 bg-white/10 rounded-xl px-3 py-2">
          <CheckCircle className="w-3.5 h-3.5 text-green-300 shrink-0" />
          <p className="text-xs text-white/85">Your account is protected. Data encrypted at rest and in transit.</p>
        </div>
      </div>

      {/* ── Messaging Privacy ── */}
      <Section title="Messaging Privacy" icon={Eye} iconColor="text-blue-600" iconBg="bg-blue-50 dark:bg-blue-900/20">
        <SelectRow
          label="Last Seen & Online"
          description="Who can see when you were last active"
          value={lastSeen}
          options={[
            { value: 'everyone', label: 'Everyone' },
            { value: 'contacts', label: 'Contacts only' },
            { value: 'nobody', label: 'Nobody' },
          ]}
          onChange={v => updatePresence(v as typeof lastSeen)}
        />
        <SelectRow
          label="Who can message me"
          description="People who can start a new chat with you"
          value={privacy.message_policy}
          options={[
            { value: 'everyone', label: 'Everyone' },
            { value: 'followers', label: 'My followers' },
            { value: 'nobody', label: 'Nobody' },
          ]}
          onChange={v => savePrivacy({ message_policy: v as PrivacySettings['message_policy'] }, 'Message setting saved')}
        />
      </Section>

      {/* ── Posts & Profile ── */}
      <Section title="Posts & Profile" icon={Eye} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/20">
        <SelectRow
          label="Who can see my posts"
          description="Your name and photo stay visible so people can find you"
          value={privacy.profile_visibility}
          options={[
            { value: 'public', label: 'Everyone' },
            { value: 'followers', label: 'My followers' },
            { value: 'private', label: 'Only me' },
          ]}
          onChange={v => savePrivacy({ profile_visibility: v as PrivacySettings['profile_visibility'] }, 'Post visibility saved')}
        />
        <SelectRow
          label="Who can comment on my new posts"
          description="You can change it for any single post from its More menu"
          value={privacy.default_comment_policy}
          options={[
            { value: 'everyone', label: 'Everyone' },
            { value: 'followers', label: 'My followers' },
            { value: 'off', label: 'No one' },
          ]}
          onChange={v => savePrivacy({ default_comment_policy: v as PrivacySettings['default_comment_policy'] }, 'Comment setting saved')}
        />
        <ToggleRow
          label="Appear in Search"
          description="Let other people find you by name"
          checked={privacy.searchable}
          onChange={v => savePrivacy({ searchable: v }, v ? 'You appear in search' : 'You no longer appear in search')}
        />
        <ToggleRow
          label="Show my reactions"
          description="Show your name in a post's “who reacted” list"
          checked={privacy.show_reactions}
          onChange={v => savePrivacy({ show_reactions: v }, 'Reaction setting saved')}
        />
      </Section>

      {/* ── People you blocked, muted or restricted ── */}
      <Section title="Blocked, Muted & Restricted" icon={Lock} iconColor="text-red-600" iconBg="bg-red-50 dark:bg-red-900/20">
        <PeopleList kind="blocked" title="Blocked" undo="Unblock" empty="You haven’t blocked anyone." />
        <PeopleList kind="muted" title="Muted" undo="Unmute" empty="You haven’t muted anyone." />
        <PeopleList kind="restricted" title="Restricted" undo="Unrestrict" empty="You haven’t restricted anyone." />
      </Section>

      {/* ── Account Security ── */}
      <Section title="Account Security" icon={Lock} iconColor="text-violet-600" iconBg="bg-violet-50 dark:bg-violet-900/20">
        <LinkRow
          label="Change Password"
          description="Update your account password regularly"
          href="/account"
        />
        <ToggleRow
          label="Two-Factor Authentication"
          description="Add an extra layer of security with TOTP (coming soon)"
          checked={twoFactorEnabled}
          onChange={() => toast.info('2FA is coming in the next update')}
        />
        <div className="px-4 py-3.5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            We recommend enabling Two-Factor Authentication to protect your wallet and business data.
          </p>
        </div>
      </Section>

      {/* ── Data & Analytics ── */}
      <Section title="Data & Analytics" icon={Database} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/20">
        <ToggleRow
          label="Usage Analytics"
          description="Help improve Nodbusiness by sharing anonymous usage data"
          checked={dataAnalytics}
          onChange={setDataAnalytics}
        />
        <ToggleRow
          label="Marketing Emails"
          description="Receive product updates, offers, and announcements"
          checked={marketingEmails}
          onChange={setMarketingEmails}
        />
        <ButtonRow
          label="Export My Data"
          description="Download a copy of your account data (JSON)"
          onClick={handleExportData}
          loading={loadingExport}
        />
      </Section>

      {/* ── Legal ── */}
      <Section title="Legal" icon={FileText} iconColor="text-slate-600" iconBg="bg-slate-100 dark:bg-slate-800/40">
        <LinkRow label="Privacy Policy" description="How we collect, use and protect your data" href="/service-agreement?tab=privacy" />
        <LinkRow label="Terms of Service" description="Rules and conditions for using Nodbusiness" href="/service-agreement?tab=terms" />
        <LinkRow label="Cookie Policy" description="How we use cookies and tracking" href="/service-agreement?tab=cookies" />
        <div className="px-4 py-3 flex items-start gap-2">
          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Privacy questions? Contact us at{' '}
            <a href="mailto:privacy@nodbusiness.app" className="text-blue-600 hover:underline">privacy@nodbusiness.app</a>
          </p>
        </div>
      </Section>

      {/* ── Danger Zone ── */}
      <Section title="Danger Zone" icon={UserX} iconColor="text-red-500" iconBg="bg-red-50 dark:bg-red-900/20">
        <ButtonRow
          label="Deactivate Account"
          description="Temporarily hide your profile and content"
          onClick={() => toast.info('Account deactivation coming soon. Contact support for now.')}
          danger
        />
        <ButtonRow
          label="Delete Account"
          description="Permanently delete your account and all data. This cannot be undone."
          onClick={() => { setDeletePassword(''); setDeleteConfirm(''); setDeleteOpen(true); }}
          danger
          loading={loadingDelete}
        />
      </Section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Your profile, posts, messages, follows and other personal data are deleted. Orders and payment
              records are kept without your name or contact details, as required for accounting. Withdraw any
              wallet balance and finish open orders first. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="delete-password">Password</Label>
              <Input id="delete-password" type="password" autoComplete="current-password" value={deletePassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeletePassword(e.target.value)}
                placeholder="Leave empty if you sign in with Google" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
              <Input id="delete-confirm" value={deleteConfirm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirm(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={loadingDelete}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE' || loadingDelete}>
              {loadingDelete ? 'Deleting…' : 'Delete my account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-center text-[10px] text-muted-foreground px-4">
        Nodbusiness · City, Country · privacy@nodbusiness.app
        <br />Last updated August 2026
      </p>
    </div>
  );
}

export default function PrivacyAndSecurityPage() {
  return <ErrorBoundary><PrivacyAndSecurityView /></ErrorBoundary>;
}
