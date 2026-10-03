'use client';
/**
 * GuestSignUpPrompt — Bottom sheet shown when a guest tries a write action.
 * Triggered by: like, comment, follow, post creation, bookmark.
 */
import Link from 'next/link';
import { X } from 'lucide-react';

interface GuestSignUpPromptProps {
  action?: string;
  onClose: () => void;
}

export default function GuestSignUpPrompt({ action = 'do this', onClose }: GuestSignUpPromptProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg animate-in slide-in-from-bottom-4 duration-300">
        <div className="rounded-t-3xl bg-card border-t border-border shadow-2xl px-6 pt-6 pb-10">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-secondary/80"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Content */}
          <div className="text-center">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-lg font-bold mb-1">Join Nodbusiness</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create a free account to {action} and connect with thousands of Ethiopian businesses.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/register"
                className="w-full h-12 flex items-center justify-center rounded-2xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                href="/choose-mode"
                className="w-full h-12 flex items-center justify-center rounded-2xl border border-border font-semibold text-sm hover:bg-secondary/50 transition-colors"
              >
                Sign In
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No credit card required · Free forever
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
