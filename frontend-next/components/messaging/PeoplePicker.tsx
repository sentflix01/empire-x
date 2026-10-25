'use client';
/**
 * Pick people by name: suggestions first, search after two letters, chosen
 * people as removable chips. Used to create groups and channels and to add
 * members. The server still decides who can be added and says why not.
 */
import React, { useEffect, useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import client from '@/api/client';
import { entities } from '@/api/entities';
import { cn } from '@/lib/utils';
import { uniquePeople } from '@/lib/chatDisplay';

export interface Person { user_id: string; display_name?: string | null; avatar_url?: string | string[] | null; headline?: string | null }

const avatarOf = (p: Person) => (Array.isArray(p.avatar_url) ? p.avatar_url[0] : p.avatar_url) || null;

export function PersonAvatar({ person, size = 40 }: { person: Pick<Person, 'display_name' | 'avatar_url'>; size?: number }) {
  const src = avatarOf(person as Person);
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white"
      style={{ width: size, height: size }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : String(person.display_name || '?').charAt(0).toUpperCase()}
    </span>
  );
}

export default function PeoplePicker({ me, exclude = [], selected, onChange, max = 255 }: {
  me?: string | null;
  /** Already in the group: shown as such and not selectable. */
  exclude?: string[];
  selected: Person[];
  onChange: (people: Person[]) => void;
  max?: number;
}) {
  const [q, setQ] = useState('');
  const [suggested, setSuggested] = useState<Person[]>([]);
  const [results, setResults] = useState<Person[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    entities.UserProfile.list('-created_at', 60).then((rows: Person[]) => setSuggested(Array.isArray(rows) ? uniquePeople(rows).slice(0, 30) : [])).catch(() => undefined);
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

  const chosen = new Set(selected.map((p) => p.user_id));
  const people = (results ?? suggested).filter((p) => p.user_id && String(p.user_id) !== String(me));
  const toggle = (p: Person) => {
    if (exclude.includes(p.user_id)) return;
    if (chosen.has(p.user_id)) onChange(selected.filter((x) => x.user_id !== p.user_id));
    else if (selected.length < max) onChange([...selected, p]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {selected.length > 0 && (
        <ul className="flex max-h-24 flex-wrap gap-2 overflow-y-auto px-4 pb-2" aria-label="Chosen people">
          {selected.map((p) => (
            <li key={p.user_id}>
              <button type="button" onClick={() => toggle(p)} aria-label={`Remove ${p.display_name || 'person'}`}
                className="flex h-8 items-center gap-1.5 rounded-full bg-secondary pe-2 ps-1 text-xs font-medium">
                <PersonAvatar person={p} size={24} />{p.display_name || 'User'}<X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people by name" aria-label="Search people"
            className="h-11 w-full rounded-xl border border-border bg-secondary pe-4 ps-10 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <p className="px-1 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {results === null ? 'Suggested' : searching ? 'Searching…' : `Results · ${people.length}`}
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-busy={searching}>
        {people.length === 0 && !searching && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">{results === null ? 'Type a name to find someone.' : 'No one found by that name.'}</li>
        )}
        {people.map((p) => {
          const already = exclude.includes(p.user_id);
          const on = chosen.has(p.user_id);
          return (
            <li key={p.user_id}>
              <button type="button" onClick={() => toggle(p)} disabled={already} aria-pressed={on}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-secondary disabled:opacity-60">
                <PersonAvatar person={p} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.display_name || 'User'}</span>
                  {(already || p.headline) && <span className="block truncate text-xs text-muted-foreground">{already ? 'Already a member' : p.headline}</span>}
                </span>
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border-2', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')} aria-hidden="true">
                  {on && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
