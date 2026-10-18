'use client';
import React, { useEffect, useState } from 'react';
import { ChevronDown, Copy, Mail } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';

interface Signup { email: string; created_at: string }

/** Owner-only: the emails visitors left in this website's Email sign-up section. */
export default function NewsletterSignupsPanel({ showroomId }: { showroomId: string }) {
  const [data, setData] = useState<{ total: number; signups: Signup[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client.get(`/api/showrooms/${showroomId}/newsletter`)
      .then(({ data: body }) => { if (!cancelled) setData(body); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [showroomId]);

  const copyAll = () => {
    const list = (data?.signups ?? []).map((s) => s.email).join(', ');
    navigator.clipboard?.writeText(list).then(() => toast.success('Emails copied.')).catch(() => toast.error('Could not copy.'));
  };

  return (
    <details className="mb-4 rounded-2xl border border-border/50 bg-card p-4">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-semibold">
        <Mail className="h-4 w-4 text-amber-600" aria-hidden="true" />
        Email sign-ups {data ? `(${data.total})` : ''}
        <span className="ml-auto text-xs font-normal text-muted-foreground">Only you see this</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </summary>
      <div className="mt-3 text-sm">
        {failed ? (
          <p className="text-muted-foreground">Could not load sign-ups. Refresh to try again.</p>
        ) : !data ? (
          <p role="status" className="text-muted-foreground">Loading…</p>
        ) : data.total === 0 ? (
          <p className="text-muted-foreground">No sign-ups yet. They appear here when visitors leave their email.</p>
        ) : (
          <>
            <ul className="max-h-60 divide-y divide-border/40 overflow-y-auto">
              {data.signups.map((s) => (
                <li key={s.email} className="flex items-center justify-between gap-2 py-1.5">
                  <a href={`mailto:${s.email}`} className="truncate hover:underline">{s.email}</a>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={copyAll} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-medium hover:bg-secondary">
              <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy all emails
            </button>
          </>
        )}
      </div>
    </details>
  );
}
