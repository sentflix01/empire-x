'use client';
/**
 * AccountSettings — full-page settings view.
 * Tabs: Profile | Account | Notifications | Privacy
 */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock, Bell, Shield, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { entities, type UserProfile } from '@/api/entities';
import {
  getPushPermission, subscribeToPush, unsubscribeFromPush,
} from '@/lib/push';
import { BellOff } from 'lucide-react';

// ── Push Notifications Card (same pattern as ProfileEdit) ────────────────────
function PushSettingsCard() {
  const [perm, setPerm] = useState(() => getPushPermission());
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    if (perm === 'granted') {
      const ok = await unsubscribeFromPush();
      if (ok) { setPerm('default'); toast.success('Push notifications disabled'); }
      else toast.error('Failed to disable notifications');
    } else {
      const ok = await subscribeToPush();
      if (ok) { setPerm('granted'); toast.success('Push notifications enabled 🔔'); }
      else { setPerm(getPushPermission()); toast.error('Permission denied. Enable in browser settings.'); }
    }
    setLoading(false);
  };

  if (getPushPermission() === 'unsupported') return null;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${perm === 'granted' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-secondary/50'}`}>
        {perm === 'granted'
          ? <Bell className="w-4 h-4 text-amber-600" />
          : <BellOff className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Push Notifications</p>
        <p className="text-xs text-muted-foreground">
          {perm === 'granted'
            ? "Enabled — you'll get notified even when the app is closed"
            : perm === 'denied'
            ? 'Blocked in browser settings'
            : 'Get notified about likes, messages and orders'}
        </p>
      </div>
      {perm !== 'denied' && (
        <button
          onClick={handleToggle}
          disabled={loading}
          aria-label="Toggle push notifications"
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${perm === 'granted' ? 'bg-amber-500' : 'bg-secondary'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${perm === 'granted' ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      )}
      {perm === 'denied' && (
        <span className="text-[10px] text-muted-foreground shrink-0">Blocked</span>
      )}
    </div>
  );
}

// ── Change Password form ──────────────────────────────────────────────────────
function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (next !== confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await client.put('/api/auth/change-password', {
        current_password: current,
        new_password: next,
      });
      toast.success('Password changed successfully');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to change password');
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Current password</label>
        <div className="relative mt-1">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            placeholder="Enter current password"
            className="w-full h-11 px-3 pr-10 text-sm bg-secondary/50 border border-border/50 rounded-xl outline-none focus:ring-1 focus:ring-amber-500/30"
          />
          <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">New password</label>
        <div className="relative mt-1">
          <input
            type={showNext ? 'text' : 'password'}
            value={next}
            onChange={e => setNext(e.target.value)}
            placeholder="Enter new password"
            className="w-full h-11 px-3 pr-10 text-sm bg-secondary/50 border border-border/50 rounded-xl outline-none focus:ring-1 focus:ring-amber-500/30"
          />
          <button type="button" onClick={() => setShowNext(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Confirm new password</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat new password"
          className="w-full h-11 px-3 text-sm bg-secondary/50 border border-border/50 rounded-xl outline-none focus:ring-1 focus:ring-amber-500/30 mt-1"
        />
      </div>
      <button
        type="submit"
        disabled={saving || !current || !next || !confirm}
        className="w-full h-11 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {saving ? 'Saving...' : 'Change Password'}
      </button>
    </form>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'account' | 'notifications' | 'privacy';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'account',       label: 'Account',        icon: Lock },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'privacy',       label: 'Privacy',        icon: Shield },
];

// ── Main View ─────────────────────────────────────────────────────────────────
export default function AccountSettingsView({ defaultTab = 'account' }: { defaultTab?: Tab }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const displayName = typeof user?.full_name === 'string' ? user.full_name : 'User';
  const userEmail   = typeof user?.email    === 'string' ? user.email    : '';
  const initial     = displayName.charAt(0).toUpperCase() || 'E';

  // Resolve avatar from profile
  const avatarUrl = Array.isArray(profile?.avatar_url)
    ? (profile.avatar_url[0] ?? '')
    : (profile?.avatar_url ?? '');

  useEffect(() => {
    if (!user?.id) return;
    entities.UserProfile.filter({ user_id: user.id }).then(profiles => {
      if (profiles.length > 0) setProfile(profiles[0] as UserProfile);
    }).catch(() => {});
  }, [user?.id]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-6">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold truncate">{displayName}</h1>
          <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1 mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap min-w-[80px]
              ${tab === id ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Account tab ── */}
      {tab === 'account' && (
        <div className="space-y-5">
          {/* Read-only fields */}
          <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/30">
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Email</p>
              <p className="text-sm font-semibold">{userEmail || '—'}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Username / Display name</p>
              <p className="text-sm font-semibold">
                {profile?.display_name || displayName || '—'}
              </p>
            </div>
          </div>

          {/* Change password */}
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-semibold">Change Password</p>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Use a strong password that you don't use elsewhere.
            </p>
            <ChangePasswordForm />
          </div>
        </div>
      )}

      {/* ── Notifications tab ── */}
      {tab === 'notifications' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Control how and when you receive notifications.
          </p>
          <PushSettingsCard />
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <p className="text-sm font-semibold mb-1">Email Notifications</p>
            <p className="text-xs text-muted-foreground">
              Email notification preferences can be managed from{' '}
              <Link href="/profile/edit" className="text-amber-600 hover:underline">
                your profile settings
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {/* ── Privacy tab ── */}
      {tab === 'privacy' && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border/50 p-6 text-center">
            <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">Privacy Controls</p>
            <p className="text-sm text-muted-foreground">Coming soon</p>
            <p className="text-xs text-muted-foreground mt-2">
              We're working on granular privacy controls — stay tuned.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
