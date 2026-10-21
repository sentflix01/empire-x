'use client';

interface MessageReactionsProps {
  reactions: Record<string, number>;
  messageId: string;
  onReact: (emoji: string) => void;
}

/** Renders per-message emoji reaction pills below the bubble. */
export default function MessageReactions({ reactions, messageId: _messageId, onReact }: MessageReactionsProps) {
  const entries = Object.entries(reactions);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="inline-flex min-h-8 items-center gap-0.5 rounded-full bg-secondary px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 active:scale-95"
          aria-label={`React with ${emoji}, ${count} ${count === 1 ? 'reaction' : 'reactions'}`}
        >
          <span aria-hidden="true">{emoji}</span>
          <span>{count}</span>
        </button>
      ))}
    </div>
  );
}
