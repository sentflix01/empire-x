'use client';
/**
 * The full emoji picker (every Unicode emoji, with search, categories, skin
 * tones and recently used), from emoji-mart. Loaded only when opened so no
 * page pays for it up front. Uses the device's own emoji style.
 */
import React, { useEffect, useRef, useState } from 'react';

export interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  onClose?: () => void;
  /** Accessible name for the picker region. */
  label?: string;
}

export default function EmojiPicker({ onPick, onClose, label = 'Choose an emoji' }: EmojiPickerProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const pickRef = useRef(onPick);
  const closeRef = useRef(onClose);
  pickRef.current = onPick;
  closeRef.current = onClose;

  useEffect(() => {
    let cancelled = false;
    let element: HTMLElement | null = null;
    (async () => {
      try {
        const [{ Picker }, { default: data }] = await Promise.all([import('emoji-mart'), import('@emoji-mart/data')]);
        if (cancelled || !host.current) return;
        element = new Picker({
          data,
          set: 'native',
          theme: 'auto',
          previewPosition: 'none',
          skinTonePosition: 'search',
          navPosition: 'top',
          perLine: 8,
          emojiSize: 22,
          emojiButtonSize: 36,
          maxFrequentRows: 2,
          autoFocus: true,
          onEmojiSelect: (e: { native?: string }) => { if (e?.native) pickRef.current(e.native); },
          onClickOutside: () => closeRef.current?.(),
        }) as unknown as HTMLElement;
        host.current.appendChild(element);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; element?.remove(); };
  }, []);

  return (
    <div
      ref={host}
      role="dialog"
      aria-label={label}
      className="max-w-[calc(100vw-1rem)]"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current?.(); } }}
    >
      {failed && <p className="p-3 text-sm text-muted-foreground">Emojis couldn&apos;t load. Check your connection and try again.</p>}
    </div>
  );
}
