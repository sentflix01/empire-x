'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import client from '@/api/client';
import { fmtTime } from '@/lib/date';
import { parseISO } from 'date-fns';

interface SearchMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: string;
  created_at: string;
  conversation_name: string | null;
}

interface SearchResult {
  messages: SearchMessage[];
  total: number;
  nextPage: number | null;
}

interface MessageSearchProps {
  /** Scope search to one conversation. Undefined = cross-chat search. */
  conversationId: string | undefined;
  onClose: () => void;
}

/** Full-text message search panel. Debounces input 300 ms before querying. */
export default function MessageSearch({ conversationId, onClose }: MessageSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autofocus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const params: Record<string, string | number> = { q: query.trim(), limit: 20 };
        if (conversationId) params.conversationId = conversationId;
        const { data } = await client.get<SearchResult>('/api/messages/search', { params });
        setResults(data.messages ?? []);
        setError(null);
      } catch {
        setError('Search failed. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, conversationId]);

  const handleResultClick = (msg: SearchMessage) => {
    router.push(`/messages/${msg.conversation_id}?msg=${msg.id}`);
    onClose();
  };

  const formatTime = (ts: string) => {
    try { return fmtTime(parseISO(ts)); } catch { return ''; }
  };

  const snippet = (content: string) =>
    content.length > 80 ? `${content.slice(0, 80)}…` : content;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col h-[100dvh] p-4 pt-[max(1rem,env(safe-area-inset-top))] bg-background">
      {/* Search input row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages…"
            className="w-full h-10 ps-10 pe-4 rounded-xl text-sm outline-none bg-secondary text-foreground border border-border"
          />
        </div>
        <button
          onClick={onClose}
          className="size-11 rounded-xl flex items-center justify-center transition-colors shrink-0 bg-secondary text-foreground"
          aria-label="Close search"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-center py-6 text-destructive">
            {error}
          </p>
        )}

        {!loading && !error && query.trim() && results.length === 0 && (
          <p className="text-sm text-center py-6 text-muted-foreground">
            No messages found for &ldquo;{query}&rdquo;
          </p>
        )}

        {!loading && results.map((msg) => (
          <button
            key={msg.id}
            onClick={() => handleResultClick(msg)}
            className="w-full text-left px-3 py-3 rounded-xl mb-1 transition-colors border-b border-border/40 hover:bg-secondary/50"
          >
            {/* Conversation name (cross-chat only) */}
            {!conversationId && msg.conversation_name && (
              <p className="text-[11px] font-semibold mb-0.5 truncate text-primary">
                {msg.conversation_name}
              </p>
            )}
            {/* Message content snippet */}
            <p className="text-sm truncate text-foreground">
              {msg.type === 'image' ? '📷 Photo' : snippet(msg.content ?? '')}
            </p>
            {/* Timestamp */}
            <p className="text-[11px] mt-0.5 text-muted-foreground">
              {formatTime(msg.created_at)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
