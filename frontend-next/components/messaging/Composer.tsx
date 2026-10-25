'use client';
/**
 * The message box. Grows with the text, keeps an unsent draft per chat, sends
 * on Enter on a computer (Shift+Enter for a new line) and adds a new line on
 * Enter on a phone, where Send is the button. Reply and edit show a banner
 * above it. Several photos can be picked at once.
 */
import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Send, Check, X, Pencil, ImagePlus } from 'lucide-react';
import EmojiInsertButton from '@/components/ui/EmojiInsertButton';
import { cn } from '@/lib/utils';
import { enterSends } from '@/lib/chatRules';

const MAX_LENGTH = 4000;
const draftKey = (id: string) => `nodbusiness:chat-draft:${id}`;
const readDraft = (id: string) => { try { return localStorage.getItem(draftKey(id)) ?? ''; } catch { return ''; } };
const writeDraft = (id: string, text: string) => {
  try { if (text) localStorage.setItem(draftKey(id), text); else localStorage.removeItem(draftKey(id)); } catch { /* private mode */ }
};

export interface ComposerHandle { focus: () => void; setText: (text: string) => void }

export interface ComposerProps {
  conversationId: string;
  replyTo?: { name: string; text: string } | null;
  editing?: { text: string } | null;
  uploading?: { done: number; total: number } | null;
  /** Shown above the box (business quick replies). */
  extras?: React.ReactNode;
  onSend: (text: string) => void;
  onSaveEdit: (text: string) => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onTyping: (typing: boolean) => void;
  onPickPhotos: (files: File[]) => void;
  onFocus?: () => void;
}

const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer({
  conversationId, replyTo, editing, uploading, extras, onSend, onSaveEdit, onCancelReply, onCancelEdit, onTyping, onPickPhotos, onFocus,
}, ref) {
  const [text, setText] = useState('');
  const [editText, setEditText] = useState('');
  const box = useRef<HTMLTextAreaElement | null>(null);
  const files = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Each chat keeps its own unsent text. The parent remounts this per chat
  // (key = chat id); the draft is read after mount so server and browser HTML match.
  const draftLoaded = useRef(false);
  useEffect(() => { setText(readDraft(conversationId)); draftLoaded.current = true; }, [conversationId]);
  useEffect(() => { if (draftLoaded.current) writeDraft(conversationId, text); }, [conversationId, text]);
  useEffect(() => { setEditText(editing?.text ?? ''); if (editing) box.current?.focus(); }, [editing]);
  useEffect(() => { if (replyTo) box.current?.focus(); }, [replyTo]);
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  const value = editing ? editText : text;
  const grow = () => {
    const el = box.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px`; }
  };
  useEffect(grow, [value]);

  useImperativeHandle(ref, () => ({
    focus: () => box.current?.focus(),
    setText: (t: string) => { setText(t); box.current?.focus(); },
  }));

  const change = (next: string) => {
    const clipped = next.slice(0, MAX_LENGTH);
    if (editing) { setEditText(clipped); return; }
    setText(clipped);
    onTyping(clipped.trim().length > 0);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 1500);
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (editing) { onSaveEdit(trimmed); return; }
    onSend(trimmed);
    setText('');
    onTyping(false);
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className="shrink-0 border-t border-border/30 bg-card">
      {!editing && extras}
      {replyTo && !editing && (
        <div className="flex items-start gap-2 border-b border-border/20 bg-secondary/30 px-4 py-2">
          <div className="min-w-0 flex-1 border-s-2 border-primary ps-2">
            <p className="text-xs font-semibold text-primary">Reply to {replyTo.name}</p>
            <p className="truncate text-xs text-muted-foreground">{replyTo.text}</p>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-secondary">
            <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      )}
      {editing && (
        <div className="flex items-center gap-2 border-b border-border/20 bg-amber-50 px-4 py-2 dark:bg-amber-900/20">
          <Pencil className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="flex-1 text-xs font-semibold text-amber-800 dark:text-amber-200">Editing message</p>
          <button type="button" onClick={onCancelEdit} aria-label="Cancel edit" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30">
            <X className="h-4 w-4 text-amber-700 dark:text-amber-200" aria-hidden="true" />
          </button>
        </div>
      )}
      {uploading && (
        <div className="px-4 pt-2" role="status">
          <p className="text-xs text-muted-foreground">Sending photos… {uploading.done} of {uploading.total}</p>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${(uploading.done / Math.max(uploading.total, 1)) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-end gap-1.5 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3">
        <input
          ref={files} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { const picked = Array.from(e.target.files ?? []); e.target.value = ''; if (picked.length) onPickPhotos(picked); }}
        />
        {!editing && (
          <button data-page-guide="chat-attachments" type="button" onClick={() => files.current?.click()} disabled={Boolean(uploading)}
            aria-label="Send photos" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 disabled:opacity-40">
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <div data-page-guide="chat-input" className="flex min-h-11 flex-1 items-end rounded-2xl border border-transparent bg-secondary px-4 py-2.5 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10">
          <textarea
            ref={box}
            value={value}
            rows={1}
            aria-label={editing ? 'Edit message' : 'Message'}
            placeholder={editing ? 'Edit message' : 'Message'}
            maxLength={MAX_LENGTH}
            onChange={(e) => change(e.target.value)}
            onFocus={onFocus}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && enterSends()) { e.preventDefault(); submit(); }
              if (e.key === 'Escape') { if (editing) onCancelEdit(); else if (replyTo) onCancelReply(); }
            }}
            className="max-h-[120px] min-h-5 flex-1 resize-none self-end overflow-y-auto bg-transparent text-sm leading-5 outline-none"
          />
        </div>
        <EmojiInsertButton value={value} inputRef={box} onChange={change} />
        <button
          type="button"
          onClick={submit}
          disabled={!hasContent}
          aria-label={editing ? 'Save edit' : 'Send message'}
          className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-150',
            hasContent ? 'scale-100 opacity-100' : 'scale-90 opacity-40')}
        >
          {editing ? <Check className="h-4 w-4" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
});

export default Composer;
