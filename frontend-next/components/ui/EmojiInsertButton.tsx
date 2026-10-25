'use client';
/**
 * Smiley button for a text box: opens every emoji and inserts the chosen one
 * where the cursor is (or replaces the selected text), then puts the cursor
 * back after it. Used by the chat box and the comment box.
 */
import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Smile } from 'lucide-react';

const EmojiPicker = dynamic(() => import('@/components/ui/EmojiPicker'), { ssr: false });

/** Inserts `emoji` into `value` at the input's selection; returns the new value and cursor position. */
export function insertAtCursor(value: string, emoji: string, el?: HTMLInputElement | HTMLTextAreaElement | null) {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = value.slice(0, start) + emoji + value.slice(end);
  return { value: next, cursor: start + emoji.length };
}

export default function EmojiInsertButton({ value, onChange, inputRef, placement = 'above', className = '' }: {
  value: string;
  onChange: (next: string) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  placement?: 'above' | 'below';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);

  const insert = (emoji: string) => {
    const el = inputRef.current;
    const { value: next, cursor } = insertAtCursor(value, emoji, el);
    onChange(next);
    // Keep typing where you left off.
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange?.(cursor, cursor); });
  };

  return (
    <div ref={wrap} className={`relative shrink-0 ${className}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Insert emoji" aria-expanded={open} title="Emoji"
        className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
        <Smile className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div className={`absolute right-0 z-50 ${placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          <EmojiPicker label="Insert emoji" onPick={insert} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
