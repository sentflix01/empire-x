'use client';
/**
 * "New message": find a person by name and open your chat with them. Suggested
 * people show before you type. Whether you can message someone is
 * the server's call; its reason is shown when you can't.
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';
import client from '@/api/client';
import { useStartChat } from '@/lib/messaging';
import UserIdentity from '@/components/ui/UserIdentity';
import { uniquePeople } from '@/lib/chatDisplay';

interface Person { user_id: string; display_name?: string | null; avatar_url?: string | string[] | null; headline?: string | null; is_verified?: boolean }

export default function NewMessageDialog({ suggestions, me, onClose }: {
  suggestions: Person[];
  me?: string | null;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Person[] | null>(null);
  const [searching, setSearching] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const chat = useStartChat();

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setResults(null); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      client.get('/api/search', { params: { q: query, type: 'users', limit: 20 } })
        .then(({ data }) => { if (!cancelled) setResults(Array.isArray(data?.users) ? uniquePeople(data.users as Person[]) : []); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const people = uniquePeople(results ?? suggestions).filter((p) => String(p.user_id) !== String(me));

  return (
    <div className="fixed inset-0 z-[65] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="new-message-title" onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col overflow-hidden bg-card shadow-xl sm:h-auto sm:max-h-[85dvh] sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/30 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
          <h2 id="new-message-title" className="text-base font-semibold">New message</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-secondary">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people by name" aria-label="Search people"
              className="h-11 w-full rounded-xl border border-border bg-secondary ps-10 pe-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <p className="px-1 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {results === null ? 'Suggested' : searching ? 'Searching…' : `Results · ${people.length}`}
          </p>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-busy={searching}>
          {people.length === 0 && !searching && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              {results === null ? 'Type a name to find someone.' : 'No one found by that name.'}
            </li>
          )}
          {people.map((p) => (
            <li key={p.user_id}>
              <button type="button" disabled={chat.busy}
                onClick={() => { void chat.start({ userId: p.user_id }).then(onClose); }}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-secondary disabled:opacity-60">
                <UserIdentity
                  displayName={p.display_name || 'User'}
                  avatarUrl={(Array.isArray(p.avatar_url) ? p.avatar_url[0] : p.avatar_url) ?? null}
                  subtitle={p.headline ?? undefined}
                  isVerified={Boolean(p.is_verified)}
                  showBusinessLink={false}
                  size="sm"
                  className="min-w-0 flex-1"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
