'use client';
/**
 * AccountSettings — clean single-tab account settings.
 * Removed Notifications and Privacy tabs (clutter).
 * Shows profile picture at top, edit profile shortcut, change password.
 */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, Eye, EyeOff, Edit2, Camera, ChevronRight, Bell } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { entities, type UserProfile } from '@/api/entities';
import { getPushPermission, subscribeToPush, unsubscribeFromPush } from '@/lib/push';
import { BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (next !== confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await client.put('/api/auth/change-password', { current_password: current, new_password: next });
      toast.success('Password changed ✓');
      setCurrent(''); setNext(''); setConfirm(''); setExpanded(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to change password');
    }
    setSaving(false);
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">Change Password</p>
          <p className="text-xs text-muted-foreground">Update your account password</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 border-t border-border/40">
          <div className="pt-3">
            <label className="text-xs font-medium text-muted-foreground">Current password</label>
            <div className="relative mt-1">
              <input type={showCurrent ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)}
                placeholder="Enter current password"
                className="w-full h-11 px-3 pr-10 text-sm bg-secondary/50 border border-border/50 rounded-xl outline-none focus:ring-1 focus:ring-amber-500/30" />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">New password</label>
            <div className="relative mt-1">
              <input type={showNext ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full h-11 px-3 pr-10 text-sm bg-secondary/50 border border-border/50 rounded-xl outline-none focus:ring-1 focus:ring-amber-500/30" />
              <button type="button" onClick={() => setShowNext(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Confirm new password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              className="w-full h-11 px-3 text-sm bg-secondary/50 border border-border/50 rounded-xl outline-none focus:ring-1 focus:ring-amber-500/30 mt-1" />
          </div>
          <button type="submit" disabled={saving || !current || !next || !confirm}
            className="w-full h-11 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function AccountSettingsView() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pushPerm, setPushPerm] = useState(() => getPushPermission());
  const [pushLoading, setPushLoading] = useState(false);
  const [presenceVisibility, setPresenceVisibility] = useState<'everyone' | 'nobody'>('everyone');

  const displayName = typeof user?.full_name === 'string' ? user.full_name : 'User';
  const userEmail   = typeof user?.email    === 'string' ? user.email    : '';
  const initial     = displayName.charAt(0).toUpperCase() || 'E';
  const avatarUrl   = (profile?.avatar_url as string) || '';

  useEffect(() => {
    if (!user?.id) return;
    entities.UserProfile.filter({ user_id: user.id }).then(profiles => {
      if (profiles.length > 0) setProfile(profiles[0] as UserProfile);
    }).catch(() => {});
  }, [user?.id]);

  const updatePresenceVisibility = async (visibility: 'everyone' | 'nobody') => {
    const previous = presenceVisibility;
    setPresenceVisibility(visibility);
    try {
      await client.put('/api/messages/presence/settings', { visibility });
      toast.success(visibility === 'everyone' ? 'Online status is visible' : 'Online status is hidden');
    } catch {
      setPresenceVisibility(previous);
      toast.error('Could not update last-seen privacy');
    }
  };

  const handlePushToggle = async () => {
    setPushLoading(true);
    if (pushPerm === 'granted') {
      const ok = await unsubscribeFromPush();
      if (ok) { setPushPerm('default'); toast.success('Push notifications disabled'); }
      else toast.error('Failed to disable');
    } else {
      const ok = await subscribeToPush();
      if (ok) { setPushPerm('granted'); toast.success('Push notifications enabled 🔔'); }
      else { setPushPerm(getPushPermission()); toast.error('Permission denied — check browser settings'); }
    }
    setPushLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">

      {/* ── Profile card at top ── */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        {/* Cover gradient */}
        <div className="h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600" />
        {/* Avatar + name */}
        <div className="px-5 pb-4">
          <div className="flex items-end justify-between -mt-10 mb-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl ring-4 ring-card overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  : initial}
              </div>
              <Link href="/profile/edit"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center shadow transition-colors">
                <Camera className="w-3 h-3 text-white" />
              </Link>
            </div>
            <Link href="/profile/edit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-secondary/40 hover:bg-secondary text-xs font-semibold transition-colors">
              <Edit2 className="w-3 h-3" />
              Edit Profile
            </Link>
          </div>
          <h2 className="text-lg font-bold">{displayName}</h2>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </div>
      </div>

      {/* ── Account info (read-only) ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Account Info</p>
        <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/40">
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Email</p>
            <p className="text-sm font-semibold">{userEmail || '—'}</p>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Display name</p>
            <p className="text-sm font-semibold">{profile?.display_name || displayName || '—'}</p>
          </div>
          {profile?.location && (
            <div className="px-4 py-3.5">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Location</p>
              <p className="text-sm font-semibold">{profile.location}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Security ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Security</p>
        <ChangePasswordForm />
      </div>

      {/* ── Notifications ── */}
      {getPushPermission() !== 'unsupported' && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Notifications</p>
          <div className="bg-card rounded-2xl border border-border/50 px-4 py-3.5 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${pushPerm === 'granted' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-secondary/50'}`}>
              {pushPerm === 'granted' ? <Bell className="w-4 h-4 text-amber-600" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Push Notifications</p>
              <p className="text-xs text-muted-foreground">
                {pushPerm === 'granted' ? "On — notified even when app is closed"
                  : pushPerm === 'denied' ? 'Blocked in browser settings'
                  : 'Get notified about likes, messages and orders'}
              </p>
            </div>
            {pushPerm !== 'denied' && (
              <Switch
                checked={pushPerm === 'granted'}
                onCheckedChange={() => { void handlePushToggle(); }}
                disabled={pushLoading}
                aria-label="Toggle push"
                className="shrink-0 duration-200 data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-secondary"
              />
            )}
            {pushPerm === 'denied' && <span className="text-[10px] text-muted-foreground shrink-0">Blocked</span>}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Privacy</p>
        <div className="bg-card rounded-2xl border border-border/50 px-4 py-3.5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Last Seen &amp; Online</p>
            <p className="text-xs text-muted-foreground">Choose who can see when you were recently active</p>
          </div>
          <select
            value={presenceVisibility}
            onChange={event => void updatePresenceVisibility(event.target.value as 'everyone' | 'nobody')}
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-medium"
            aria-label="Last seen visibility"
          >
            <option value="everyone">Everyone</option>
            <option value="nobody">Nobody</option>
          </select>
        </div>
      </div>

    </div>
  );
}
