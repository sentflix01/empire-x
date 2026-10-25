'use client';
/**
 * Messages on tablets and computers: the chat list on the left and the open
 * chat on the right, so switching chats keeps your place in the list. Phones
 * show one at a time (the list, or the full-screen chat).
 */
import React from 'react';
import { usePathname } from 'next/navigation';
import Inbox from '@/components/messaging/Inbox';
import { useSplitMessages } from '@/lib/useMediaQuery';

export default function MessagesShell({ children }: { children: React.ReactNode }) {
  const split = useSplitMessages();
  const pathname = usePathname() ?? '';
  const match = /^\/messages\/([^/]+)/.exec(pathname);
  const selectedId = match ? decodeURIComponent(match[1]) : null;

  if (!split) return <>{children}</>;
  return (
    // The app frame pads its pages; the split view fills the space under the app bar instead.
    <div className={selectedId ? 'grid h-[calc(100dvh-3.5rem)] grid-cols-[minmax(300px,380px)_1fr]' : '-mx-4 -my-4 grid h-[calc(100dvh-3.5rem)] grid-cols-[minmax(300px,380px)_1fr]'}>
      <aside aria-label="Chats" className="min-h-0 border-e border-border">
        <Inbox selectedId={selectedId} />
      </aside>
      <section aria-label="Chat" className="min-h-0 min-w-0">{children}</section>
    </div>
  );
}
