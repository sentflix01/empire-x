'use client';
/**
 * The chat's top bar: back (phones), who you're talking to, search in chat
 * and a menu. The menu closes on Escape, a click outside or a choice, and
 * gives focus back to its button.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HeaderMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

export default function ChatHeader({ identity, menu, onBack, onSearch, backOnDesktop = false }: {
  identity: React.ReactNode;
  menu: HeaderMenuItem[];
  onBack: () => void;
  onSearch: () => void;
  /** Larger screens show the chat list beside the chat, so Back is for phones only. */
  backOnDesktop?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const button = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: MouseEvent | TouchEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); button.current?.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const iconBtn = 'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10';
  return (
    <div data-page-guide="chat-header" className="z-10 flex shrink-0 items-center gap-1 bg-primary px-1.5 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-sm sm:gap-2 sm:px-3 md:pt-2">
      <button type="button" onClick={onBack} aria-label="Back" className={cn(iconBtn, !backOnDesktop && 'md:hidden')}>
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2 ps-1 md:ps-2">{identity}</div>
      <button type="button" onClick={onSearch} aria-label="Search in this chat" className={iconBtn}>
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>
      <div ref={wrap} className="relative">
        <button ref={button} type="button" onClick={() => setOpen((v) => !v)} aria-label="Chat options" aria-haspopup="menu" aria-expanded={open} className={iconBtn}>
          <MoreVertical className="h-5 w-5" aria-hidden="true" />
        </button>
        {open && (
          <div role="menu" aria-label="Chat options" className="absolute end-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-2xl border border-border/30 bg-card py-1 text-foreground shadow-lg">
            {menu.map((item) => (
              <button key={item.label} type="button" role="menuitem"
                onClick={() => { setOpen(false); item.onClick(); }}
                className={cn('flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none', item.destructive && 'text-destructive')}>
                <span className={item.destructive ? 'text-destructive' : 'text-muted-foreground'} aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
