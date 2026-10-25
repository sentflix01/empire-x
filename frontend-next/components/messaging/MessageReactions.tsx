'use client';
/**
 * Reaction chips under a chat message. The server stores each reaction as
 * { count, users } (older rows: a bare count). Your own reactions are
 * highlighted; tapping a chip adds it, or removes it if it's yours.
 */

export type ReactionEntry = number | { count?: number; users?: string[] };
export type MessageReactionMap = Record<string, ReactionEntry>;

export const reactionCount = (v: ReactionEntry | undefined) => (typeof v === 'number' ? v : Number(v?.count ?? 0));
export const reactedByMe = (v: ReactionEntry | undefined, me?: string | null) =>
  !!me && typeof v === 'object' && v !== null && Array.isArray(v.users) && v.users.includes(me);

interface MessageReactionsProps {
  reactions: MessageReactionMap;
  messageId: string;
  currentUserId?: string | null;
  onToggle: (emoji: string, mine: boolean) => void;
}

export default function MessageReactions({ reactions, currentUserId, onToggle }: MessageReactionsProps) {
  const entries = Object.entries(reactions ?? {}).filter(([, v]) => reactionCount(v) > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, v]) => {
        const count = reactionCount(v);
        const mine = reactedByMe(v, currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji, mine)}
            aria-pressed={mine}
            className={`inline-flex min-h-8 items-center gap-0.5 rounded-full px-2.5 text-xs font-medium transition-colors active:scale-95 ${
              mine ? 'bg-primary/15 text-primary ring-1 ring-primary/40' : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
            aria-label={`${emoji}, ${count} ${count === 1 ? 'reaction' : 'reactions'}${mine ? ', including yours. Tap to remove yours' : '. Tap to add yours'}`}
          >
            <span aria-hidden="true">{emoji}</span>
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
