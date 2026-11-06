/**
 * The page's main landmark and the target of the "Skip to main content" link
 * in app/layout.tsx (audit F-042). Use it once per page, on pages outside
 * AppLayout (AppLayout's own <main> carries the same id).
 */
import React from 'react';

export const MAIN_CONTENT_ID = 'main-content';

export default function MainContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <main id={MAIN_CONTENT_ID} tabIndex={-1} className={`outline-none ${className}`.trim()}>
      {children}
    </main>
  );
}
