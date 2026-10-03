'use client';

/**
 * DemoEnvironmentBanner — persistent amber bar shown on every authenticated page
 * when the user is in demo mode.
 *
 * Track 1 (shared test account, is_demo=true, or onboarding_mode='demo'):
 *   "You're exploring a demo account — sign up to keep your work."
 *   CTA: "Create Account →"  (navigates to /register)
 *
 * Track 2 (full sandbox with demo_session cookie):
 *   "Demo sandbox · Changes are temporary and separate from your real account."
 *   CTA: "Reset demo" + "Switch to real →"
 *
 * The track is determined by whether a full demo session is active (Track 2)
 * or the user is simply the shared demo account / chose demo preference (Track 1).
 * The backend reports the active track from its verified session context;
 * the HttpOnly `demo_session` cookie is never exposed to browser JavaScript.
 */

import { useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { auth } from '@/api/auth';
import { useRealMode } from '@/lib/RealModeContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DemoEnvironmentBannerProps {
  /** Track 1 = shared test account / onboarding_mode preference. Track 2 = full sandbox session. */
  track?: 1 | 2;
}

export default function DemoEnvironmentBanner({ track = 1 }: DemoEnvironmentBannerProps) {
  const { setRealMode } = useRealMode();
  const [exitOpen, setExitOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // ── Track 2 actions ────────────────────────────────────────────────────────

  async function exitDemo() {
    setBusy(true);
    setError('');
    try {
      const result = await auth.exitDemo();
          if (result.return_to_real) setRealMode(true);
          window.location.assign(result.return_to_real ? '/feed' : (track === 1 ? '/register' : '/landing'));
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || 'Could not leave demo mode. Please try again.');
      setBusy(false);
    }
  }

  async function resetDemo() {
    setBusy(true);
    setError('');
    try {
      await auth.resetDemo();
      window.location.assign('/feed');
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || 'Could not reset the demo. Please try again.');
      setBusy(false);
    }
  }

  // ── Track 1 banner ─────────────────────────────────────────────────────────

  if (track === 1) {
    return (
      <>
      <div
        role="status"
        aria-label="Demo account notice"
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-amber-300/40 bg-amber-50 px-4 py-2.5 text-amber-950 dark:border-amber-700/40 dark:bg-amber-950/60 dark:text-amber-100"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <FlaskConical className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>
            You&apos;re exploring a demo account —{' '}
            <span className="font-semibold">sign up to keep your work.</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="border-amber-500/40 bg-transparent" onClick={() => setExitOpen(true)}>
            Switch to real
          </Button>
        </div>
      </div>
      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader className="">
            <AlertDialogTitle>Leave the shared demo account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your demo activity is in a shared account and may remain visible to other demo visitors. If you signed in first, you will return to your real account. Otherwise, you can create one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter className="">
            <AlertDialogCancel disabled={busy}>Stay in demo</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); void exitDemo(); }}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Leave demo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  // ── Track 2 banner ─────────────────────────────────────────────────────────

  return (
    <>
      <div
        role="status"
        aria-label="Demo sandbox notice"
        className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300/30 bg-amber-50 px-4 py-2.5 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
      >
        <div className="flex items-center gap-2 text-sm">
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Demo sandbox</strong> · Activity and payments use test data.
            Changes are temporary and separate from your real account.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/40 bg-transparent"
            onClick={() => setResetOpen(true)}
          >
            Reset demo
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/40 bg-transparent"
            onClick={() => setExitOpen(true)}
          >
            Switch to real →
          </Button>
        </div>
      </div>

      {/* Switch to real confirmation */}
      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader className="">
            <AlertDialogTitle>Switch to your real account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your demo session will end and its data will no longer be available to you.
              Old demo data is deleted only when the operator&apos;s configured cleanup job runs.
              Your real account and its data are completely untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter className="">
            <AlertDialogCancel disabled={busy}>Stay in demo</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); void exitDemo(); }}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, switch to real
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset demo confirmation */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader className="">
            <AlertDialogTitle>Start a fresh demo session?</AlertDialogTitle>
            <AlertDialogDescription>
              This ends your current sandbox identity and starts with a clean slate.
              Your demo work will no longer be accessible. Sample businesses stay available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter className="">
            <AlertDialogCancel disabled={busy}>Keep this session</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); void resetDemo(); }}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset demo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
