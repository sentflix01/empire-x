'use client';

import { FlaskConical } from 'lucide-react';

export default function DemoEnvironmentBanner() {
  return (
    <div role="status" aria-label="Demo account notice" className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/30 bg-primary-subtle px-4 py-2.5 text-primary-subtle-foreground">
      <div className="flex items-center gap-2 text-sm">
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span><strong>Demo workspace</strong> · Your practice data stays separate. Demo sites expire 24 hours after publishing.</span>
      </div>
    </div>
  );
}
