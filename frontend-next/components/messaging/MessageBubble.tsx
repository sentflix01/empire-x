'use client';
/**
 * One chat message. Long-press (touch), right-click or the ⌄ button (mouse
 * and keyboard) opens its actions. Photos open in the full-screen viewer.
 * Text can be selected on computers; links are clickable.
 */
import React, { useRef } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import MessageTicks from '@/components/messaging/MessageTicks';
import MessageReactions, { type MessageReactionMap } from '@/components/messaging/MessageReactions';
import ProductMessageBubble from '@/components/messaging/ProductMessageBubble';
import OrderUpdateBubble from '@/components/messaging/OrderUpdateBubble';
import ContextCard from '@/components/messaging/ContextCard';
import { fmtTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/chatRules';

type Tick = React.ComponentProps<typeof MessageTicks>['tick'];

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
/** Text with clickable web links (opened in a new tab, without passing who sent you). */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-primary underline underline-offset-2">{part}</a>
        : <React.Fragment key={i}>{part}</React.Fragment>))}
    </>
  );
}

export default function MessageBubble({
  msg, isMe, showSender, groupAvatar, quote, tick, selected, currentUserId,
  onOpenActions, onToggleReaction, onOpenPhoto, onRetry, onQuoteClick,
}: {
  msg: ChatMessage;
  isMe: boolean;
  /** Group/channel: show the sender's name on the first of their messages in a row. */
  showSender: boolean;
  /** Group/channel incoming: 'avatar' on the first message, 'space' for the rest, null in one-to-one chats. */
  groupAvatar: 'avatar' | 'space' | null;
  quote?: { name: string; text: string } | null;
  tick: Tick;
  selected: boolean;
  currentUserId?: string | null;
  onOpenActions: (msg: ChatMessage) => void;
  onToggleReaction: (emoji: string, mine: boolean) => void;
  onOpenPhoto: (url: string) => void;
  onRetry: (msg: ChatMessage) => void;
  onQuoteClick?: (id: string) => void;
}) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  if (msg.type === 'context') {
    return (
      <div id={`msg-${msg.id}`} className={cn('my-2 flex', isMe ? 'justify-end' : 'justify-start')}>
        <ContextCard content={msg.content ?? ''} mine={isMe} />
      </div>
    );
  }

  const reactions = (msg.reactions ?? {}) as MessageReactionMap;
  const failed = Boolean(msg._failed);
  const waiting = Boolean(msg._pending || msg._temp) && !failed;

  return (
    <div
      id={`msg-${msg.id}`}
      className={cn('flex items-end gap-1.5 py-px', isMe ? 'justify-end' : 'justify-start')}
      onTouchStart={() => { cancelPress(); pressTimer.current = setTimeout(() => { navigator.vibrate?.(30); onOpenActions(msg); }, 380); }}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onContextMenu={(e) => { e.preventDefault(); onOpenActions(msg); }}
    >
      {groupAvatar === 'avatar' && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden="true">
          {String(msg.sender_name || '?').charAt(0).toUpperCase()}
        </div>
      )}
      {groupAvatar === 'space' && <div className="w-8 shrink-0" aria-hidden="true" />}

      <div className={cn('group relative flex max-w-[80%] flex-col gap-0.5 md:max-w-[65%]', isMe ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'relative rounded-2xl text-sm shadow-sm [@media(pointer:coarse)]:select-none',
            msg.type === 'image' ? 'p-1' : 'px-3 py-1.5',
            isMe ? 'rounded-br-md bg-primary/15 dark:bg-primary/25' : 'rounded-bl-md bg-card',
            selected && 'ring-2 ring-primary/50',
            waiting && 'opacity-60',
          )}
        >
          <button
            type="button"
            onClick={() => onOpenActions(msg)}
            aria-label="Message actions"
            className="absolute end-1 top-1 z-10 hidden h-6 w-6 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-sm opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 md:flex"
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>

          {showSender && <p className="mb-0.5 text-xs font-semibold text-primary">{msg.sender_name}</p>}

          {quote && (
            <button type="button" onClick={() => msg.reply_to_id && onQuoteClick?.(msg.reply_to_id)}
              className={cn('mb-1 block w-full rounded-s border-s-2 ps-2 text-start', isMe ? 'border-amber-500' : 'border-blue-400')}>
              <span className="block truncate text-[11px] font-semibold text-primary">{quote.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{quote.text}</span>
            </button>
          )}

          {msg.type === 'image' ? (
            <button type="button" onClick={() => msg.content && onOpenPhoto(msg.content)} aria-label="Open photo" className="block">
              <SafeImage fill={false} src={msg.content ?? ''} alt="Photo" width={320} height={240} className="block h-auto max-h-72 w-full rounded-xl object-cover" />
            </button>
          ) : msg.type === 'product' ? (
            <ProductMessageBubble metadata={msg.metadata ?? {}} isMe={isMe} />
          ) : msg.type === 'order_update' ? (
            <OrderUpdateBubble metadata={msg.metadata ?? {}} isMe={isMe} />
          ) : (
            <p className="whitespace-pre-wrap break-words pe-4 leading-relaxed"><Linkified text={msg.content ?? ''} /></p>
          )}

          <div className={cn('flex items-center justify-end gap-1', msg.type === 'image' ? 'px-2 pb-1' : '-mb-0.5 mt-0.5')}>
            {msg.edited && <span className="text-[10px] italic text-muted-foreground">edited</span>}
            <span className="text-[10px] text-muted-foreground">{fmtTime(msg.created_at)}</span>
            {isMe && <MessageTicks tick={failed ? 'failed' : waiting ? 'sending' : tick} />}
          </div>
        </div>

        {failed && (
          <button type="button" onClick={() => onRetry(msg)} className="flex min-h-8 items-center gap-1 text-xs font-medium text-destructive">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Not sent · Tap to retry
          </button>
        )}

        {Object.keys(reactions).length > 0 && (
          <MessageReactions reactions={reactions} messageId={msg.id} currentUserId={currentUserId} onToggle={onToggleReaction} />
        )}
      </div>
    </div>
  );
}
