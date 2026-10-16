'use client';
import SafeImage from '@/components/ui/SafeImage';
/**
 * QRLandingModal — shown when a first-time visitor lands on a showroom
 * via a QR code scan. Presents three options:
 *   1. "I have an account" → /login?return=/showroom/{slug}
 *   2. "Create free account" → /register?return=/showroom/{slug}
 *   3. "Continue as guest" → dismiss and view showroom read-only
 *
 * Only shown to unauthenticated users who haven't dismissed it before
 * (tracked in sessionStorage so it doesn't re-appear within the session).
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, UserCheck, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import TryDemoButton from '@/components/landing/TryDemoButton';

interface QRLandingModalProps {
  businessName: string;
  businessCategory?: string;
  logoUrl?: string;
  currentPath: string; // e.g. /showroom/addis-creative-studio-...
  themeColor?: string;
}

const DISMISSED_KEY = 'nodbusiness_qr_landing_dismissed';

export default function QRLandingModal({
  businessName,
  businessCategory,
  logoUrl,
  currentPath,
  themeColor = '#D4AF37',
}: QRLandingModalProps) {
  const [visible, setVisible] = useState(false);
  const returnParam = encodeURIComponent(currentPath);

  useEffect(() => {
    // Only show if:
    // 1. Not already dismissed this session
    // 2. Arrived from external source (QR scan = no referrer OR external referrer)
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // Show after a brief delay so the showroom content renders first
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Dialog open={visible} onOpenChange={open => { if (!open) dismiss(); }}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-3xl border-border bg-card p-0" aria-describedby="qr-landing-description">
        {/* Brand header */}
        <div className="relative px-6 pt-8 pb-6 text-center" style={{ backgroundColor: 'hsl(var(--card))' }}>
          {/* Business logo or icon */}
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-md overflow-hidden"
            style={{ backgroundColor: themeColor }}
          >
            {logoUrl
              ? <SafeImage fill={false} width={800} height={600} src={logoUrl} alt={businessName} className="w-full h-full object-cover" />
              : <Store className="w-8 h-8 text-white" />}
          </div>

          <DialogTitle className="font-bold text-lg leading-tight">{businessName}</DialogTitle>
          {businessCategory && (
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{businessCategory}</p>
          )}
          <DialogDescription id="qr-landing-description" className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Welcome! This business is on Nodbusiness — the platform where Ethiopian businesses connect, sell, and grow.
          </DialogDescription>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3 pt-4">
          <Link
            href="/landing"
            className="flex h-11 w-full items-center justify-center rounded-xl border border-border text-sm font-semibold hover:bg-secondary/60 transition-colors"
            onClick={dismiss}
          >
            ← Back to Landing
          </Link>
          <TryDemoButton />
          <Link
            href={`/login?return=${returnParam}`}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 border-border hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all"
            onClick={dismiss}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">I have an account</p>
              <p className="text-xs text-muted-foreground">Sign in to buy, message, and follow</p>
            </div>
          </Link>

          <Link
            href={`/register?return=${returnParam}`}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-white transition-all hover:opacity-90"
            style={{ backgroundColor: themeColor }}
            onClick={dismiss}
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Create free account</p>
              <p className="text-xs text-white/80">Join thousands of Ethiopian businesses</p>
            </div>
          </Link>

          <button
            onClick={dismiss}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Continue as guest →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
