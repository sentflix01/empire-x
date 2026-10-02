'use client';
/**
 * AccountSettings — popup sheet for account management.
 * Replaces the email + logout in the sidebar footer.
 *
 * Contains:
 *   - User avatar + name + email
 *   - Edit Profile link
 *   - Change Password (inline form)
 *   - Change Display Name (inline form)
 *   - Notification settings
 *   - Privacy settings
 *   - Logout (→ landing page)
 */
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings, User, Lock, Bell, Shield, LogOut, X,
  ChevronRight, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { useAuth } from '@/lib/AuthContext';

interface Props {
  collapsed?: boolean;
}

export default function AccountSettings({ collapsed = false }: Props) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveSection(null);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const displayName = typeof user?.full_name === 'string' ? user.full_name : 'User';
  const userEmail = typeof user?.email === 'string' ? user.email : '';
  const initial = displayName.charAt(0) || 'E';

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(v => !v); setActiveSection(null); }}
        title="Account Settings"
        className={`relative flex items-center gap-2 rounded-xl hover:bg-secondary p-2 transition-colors w-full group
          ${collapsed ? 'justify-center' : ''}`}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {initial}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
          </div>
        )}
        {!collapsed && <Settings className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}

        {/* Tooltip in collapsed mode */}
        {collapsed && (
          <span className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
            Account Settings
          </span>
        )}
      </button>

      {/* Popup panel */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <span className="text-sm font-semibold">Account Settings</span>
            <button onClick={() => { setOpen(false); setActiveSection(null); }} className="p-1 rounded-full hover:bg-secondary">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>

          {/* Menu items */}
          {!activeSection && (
            <div className="py-1">
              <Link
                href="/profile/edit"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors"
              >
                <User className="w-4 h-4 text-amber-500" />
                <span className="text-sm">Edit Profile</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </Link>

              <button
                onClick={() => setActiveSection('password')}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors"
              >
                <Lock className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Change Password</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>

              <button
                onClick={() => setActiveSection('username')}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors"
              >
                <User className="w-4 h-4 text-green-500" />
                <span className="text-sm">Change Display Name</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>

              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors"
              >
                <Bell className="w-4 h-4 text-purple-500" />
                <span className="text-sm">Notifications</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </Link>

              <Link
                href="/profile/edit"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors"
              >
                <Shield className="w-4 h-4 text-cyan-500" />
                <span className="text-sm">Privacy & Verification</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </Link>

              <div className="h-px bg-border/50 my-1 mx-4" />

              <button
                onClick={() => logout('/')}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Log out</span>
              </button>
            </div>
          )}

          {/* Change Password section */}
          {activeSection === 'password' && (
            <ChangePasswordForm onBack={() => setActiveSection(null)} onDone={() => setOpen(false)} />
          )}

          {/* Change Display Name section */}
          {activeSection === 'username' && (
            <ChangeNameForm
              currentName={displayName}
              onBack={() => setActiveSection(null)}
              onDone={() => setOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Change Password inline form ───────────────────────────────────────────────
function ChangePasswordForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (next !== confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await client.put('/api/auth/change-password', { current_password: current, new_password: next });
      toast.success('Password changed successfully');
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to change password');
    }
    setSaving(false);
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onBack} className="p-1 rounded-full hover:bg-secondary"><ChevronRight className="w-4 h-4 rotate-180 text-muted-foreground" /></button>
        <span className="text-sm font-semibold">Change Password</span>
      </div>
      <div className="relative">
        <input type={showCurrent ? 'text' : 'password'} placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)}
          className="w-full h-9 px-3 pr-9 text-sm bg-secondary rounded-xl border-0 outline-none focus:ring-1 focus:ring-amber-500/30" />
        <button onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="relative">
        <input type={showNext ? 'text' : 'password'} placeholder="New password" value={next} onChange={e => setNext(e.target.value)}
          className="w-full h-9 px-3 pr-9 text-sm bg-secondary rounded-xl border-0 outline-none focus:ring-1 focus:ring-amber-500/30" />
        <button onClick={() => setShowNext(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {showNext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      <input type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)}
        className="w-full h-9 px-3 text-sm bg-secondary rounded-xl border-0 outline-none focus:ring-1 focus:ring-amber-500/30" />
      <button onClick={handleSubmit} disabled={saving || !current || !next || !confirm}
        className="w-full h-9 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
        {saving ? 'Saving...' : 'Change Password'}
      </button>
    </div>
  );
}

// ── Change Display Name inline form ──────────────────────────────────────────
function ChangeNameForm({ currentName, onBack, onDone }: { currentName: string; onBack: () => void; onDone: () => void }) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    try {
      // Update full_name on users table + display_name on user_profiles
      await client.put('/api/profiles/me/upsert', { display_name: name.trim() });
      // Also update users.full_name via a dedicated endpoint if available
      await client.put('/api/auth/update-name', { full_name: name.trim() }).catch(() => {});
      toast.success('Display name updated');
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update name');
    }
    setSaving(false);
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onBack} className="p-1 rounded-full hover:bg-secondary"><ChevronRight className="w-4 h-4 rotate-180 text-muted-foreground" /></button>
        <span className="text-sm font-semibold">Change Display Name</span>
      </div>
      <input type="text" placeholder="Display name" value={name} onChange={e => setName(e.target.value)}
        className="w-full h-9 px-3 text-sm bg-secondary rounded-xl border-0 outline-none focus:ring-1 focus:ring-amber-500/30" />
      <button onClick={handleSubmit} disabled={saving || !name.trim() || name.trim() === currentName}
        className="w-full h-9 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
        {saving ? 'Saving...' : 'Save Name'}
      </button>
    </div>
  );
}
