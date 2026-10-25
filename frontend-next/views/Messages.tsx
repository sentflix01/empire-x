'use client';
/**
 * /messages. Phones: the chat list. Tablets and computers: the list is in the
 * left column (MessagesShell), so this is the "pick a chat" pane.
 */
import React from 'react';
import { MessageCircle } from 'lucide-react';
import Inbox from '@/components/messaging/Inbox';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useSplitMessages } from '@/lib/useMediaQuery';

function Messages() {
  const split = useSplitMessages();
  if (split) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[hsl(var(--chat-bg))] p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary" aria-hidden="true">
          <MessageCircle className="h-7 w-7" />
        </span>
        <p className="text-sm font-semibold">Choose a chat</p>
        <p className="max-w-xs text-xs text-muted-foreground">Pick a conversation on the left, or start a new message.</p>
      </div>
    );
  }
  return (
    <div className="-mx-4 -mt-4 flex h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] flex-col">
      <Inbox />
    </div>
  );
}

export default function MessagesPage() {
  return <ErrorBoundary><Messages /></ErrorBoundary>;
}
