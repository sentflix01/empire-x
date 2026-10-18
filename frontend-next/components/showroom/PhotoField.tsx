'use client';
import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { uploadFile } from '@/lib/uploadFile';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import SafeImage from '@/components/ui/SafeImage';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * "Add photo" for website sections: pick a picture from the phone or computer,
 * it uploads and shows right away. Replaces pasting image addresses.
 */
export default function PhotoField({ id, label, value, onChange }: {
  id: string;
  label: string;
  value?: string;
  onChange: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) { setError('Choose a photo (JPG, PNG or WebP).'); return; }
    if (file.size > MAX_BYTES) { setError('This photo is over 10 MB. Choose a smaller one.'); return; }
    setBusy(true);
    try {
      onChange(await uploadFile(file));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not upload this photo. Try again.'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <input ref={input} id={id} type="file" accept="image/*" className="sr-only" aria-label={label}
        onChange={(e) => { void pick(e.target.files?.[0]); }} />
      {value ? (
        <div className="flex items-center gap-2">
          <SafeImage fill={false} width={64} height={64} src={value} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-border/60 object-cover" />
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            Change photo
          </button>
          <button type="button" onClick={() => onChange('')} disabled={busy} aria-label={`Remove ${label.toLowerCase()}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-60 dark:text-amber-200 dark:hover:bg-amber-500/10">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
          {busy ? 'Uploading…' : 'Add photo'}
        </button>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
