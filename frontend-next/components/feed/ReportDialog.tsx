'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { REPORT_REASONS, report } from '@/lib/socialApi';
import { apiErrorMessage } from '@/lib/apiErrorMessage';

/** Report a post, comment or person with a plain reason; the team reviews it. */
export default function ReportDialog({ open, onOpenChange, targetType, targetId, what }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  /** e.g. "this post" */
  what: string;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setBusy(true);
    try {
      await report(targetType, targetId, reason, details.trim());
      toast.success('Thanks. Our team will review it. The person isn’t told who reported.');
      onOpenChange(false);
      setReason(''); setDetails('');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send the report. Try again.'));
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Report {what}</DialogTitle>
        <DialogDescription>Why are you reporting it?</DialogDescription>
        <form onSubmit={submit} className="space-y-3">
          <fieldset className="space-y-1">
            <legend className="sr-only">Reason</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-secondary">
                <input type="radio" name="report-reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="h-4 w-4 accent-red-600" />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </fieldset>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2} maxLength={500} placeholder="Anything else we should know? (optional)"
            aria-label="More details" className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" disabled={!reason || busy}
            className="min-h-11 w-full rounded-full bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {busy ? 'Sending…' : 'Send report'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
