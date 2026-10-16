'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { uploadFile } from '@/lib/uploadFile';

export interface EditablePost {
  content?: string;
  image_url?: string | null;
}

interface EditPostDialogProps {
  open: boolean;
  post: EditablePost;
  onOpenChange: (open: boolean) => void;
  /** Saves the changes; rejects to keep the dialog open with an error. */
  onSave: (changes: { content: string; image_url: string | null }) => Promise<void>;
}

const MAX_LENGTH = 5000;

/** Edit a post's caption and photo. The server re-checks ownership. */
export default function EditPostDialog({ open, post, onOpenChange, onSave }: EditPostDialogProps) {
  const [content, setContent] = useState(post.content ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(post.image_url ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  // Start from the post's current values each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setContent(post.content ?? '');
    setImageUrl(post.image_url ?? null);
    setFile(null);
    setPreview(null);
    setError('');
  }, [open, post.content, post.image_url]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const shownImage = preview ?? imageUrl;
  const hasPhoto = Boolean(shownImage);
  const unchanged = content === (post.content ?? '') && !file && imageUrl === (post.image_url ?? null);
  const empty = !content.trim() && !hasPhoto;

  const pickFile = (picked: File | undefined) => {
    if (!picked) return;
    if (!picked.type.startsWith('image/')) { setError('Choose an image file.'); return; }
    setError('');
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const removePhoto = () => {
    setFile(null);
    setPreview(null);
    setImageUrl(null);
  };

  const save = async () => {
    if (empty || unchanged || saving) return;
    setSaving(true);
    setError('');
    try {
      const image_url = file ? await uploadFile(file) : imageUrl;
      await onSave({ content, image_url });
      onOpenChange(false);
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Could not save your changes. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit post</DialogTitle>
          <DialogDescription>Changes show on your post with an &ldquo;Edited&rdquo; label.</DialogDescription>
        </DialogHeader>

        <label htmlFor="edit-post-content" className="sr-only">Post text</label>
        <textarea
          id="edit-post-content"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
          rows={5}
          autoFocus
          placeholder={hasPhoto ? 'Add a caption (optional)' : 'What do you want to say?'}
          className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="-mt-2 text-right text-xs text-muted-foreground">{content.length}/{MAX_LENGTH}</p>

        {shownImage ? (
          <div className="relative overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob previews are not supported by next/image */}
            <img src={shownImage} alt="Post photo" className="max-h-64 w-full object-cover" />
            <div className="absolute right-2 top-2 flex gap-2">
              <button type="button" onClick={() => fileInput.current?.click()} className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white hover:bg-black/75">
                Replace
              </button>
              <button type="button" onClick={removePhoto} aria-label="Remove photo" className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/75">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground hover:bg-secondary">
            <ImagePlus className="h-4 w-4" aria-hidden="true" /> Add a photo
          </button>
        )}
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />

        {empty && <p className="text-sm text-destructive">A post needs text or a photo.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2">
          <button type="button" onClick={() => onOpenChange(false)} disabled={saving} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={empty || unchanged || saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
