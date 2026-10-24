'use client';
/**
 * Saved answers for business owners ("Yes, it's in stock", "Delivery takes 2
 * days"). Tap one to put it in the message box (edit it, then send). Owners
 * manage the list here; it's shared by every chat of that business.
 */
import React, { useEffect, useState } from 'react';
import { Pencil, Plus, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { apiErrorMessage } from '@/lib/apiErrorMessage';

const MAX = 20;

export default function QuickReplies({ businessId, onPick }: { businessId: string; onPick: (text: string) => void }) {
  const [replies, setReplies] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    client.get('/api/messages/quick-replies', { params: { business_id: businessId } })
      .then(({ data }) => { if (active) setReplies(Array.isArray(data) ? data.map((r: { text: string }) => r.text) : []); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [businessId]);

  const save = async () => {
    const clean = draft.map((t) => t.trim()).filter(Boolean).slice(0, MAX);
    setSaving(true);
    try {
      const { data } = await client.put('/api/messages/quick-replies', { business_id: businessId, replies: clean });
      setReplies(Array.isArray(data) ? data.map((r: { text: string }) => r.text) : clean);
      setEditing(false);
      toast.success('Quick replies saved');
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not save quick replies')); }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="space-y-2 border-b border-border/20 bg-secondary/20 px-3 py-2" role="group" aria-label="Edit quick replies">
        <p className="text-xs font-semibold">Quick replies <span className="font-normal text-muted-foreground">(up to {MAX})</span></p>
        {draft.map((text, i) => (
          <div key={i} className="flex gap-2">
            <input value={text} maxLength={500} onChange={(e) => setDraft((d) => d.map((t, j) => (j === i ? e.target.value : t)))}
              aria-label={`Quick reply ${i + 1}`} className="min-h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm" />
            <button type="button" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))} aria-label={`Remove quick reply ${i + 1}`}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {draft.length < MAX && (
            <button type="button" onClick={() => setDraft((d) => [...d, ''])} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />Add
            </button>
          )}
          <button type="button" onClick={() => setEditing(false)} className="min-h-9 rounded-full px-3 text-xs font-medium text-muted-foreground">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="min-h-9 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border/20 px-3 py-2 scrollbar-thin" role="group" aria-label="Quick replies">
      <Zap className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
      {replies.map((text) => (
        <button key={text} type="button" onClick={() => onPick(text)}
          className="min-h-8 max-w-[14rem] shrink-0 truncate rounded-full border border-border bg-background px-3 text-xs hover:bg-secondary">{text}</button>
      ))}
      <button type="button" onClick={() => { setDraft(replies.length ? replies : ['Yes, it’s in stock', 'Delivery takes 1–2 days']); setEditing(true); }}
        className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
        aria-label={replies.length ? 'Edit quick replies' : 'Add quick replies'}>
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />{replies.length ? 'Edit' : 'Add quick replies'}
      </button>
    </div>
  );
}
