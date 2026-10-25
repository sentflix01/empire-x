'use client';
/**
 * New group or channel: a name, (for channels) a description, and the
 * people to add. In a group everyone can write; in a channel only admins
 * post and everyone else reads. Up to 256 members.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Users, Radio } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import PeoplePicker, { type Person } from '@/components/messaging/PeoplePicker';

export const MAX_GROUP_MEMBERS = 256;

export default function CreateGroupDialog({ type, onClose, onCreated }: {
  type: 'group' | 'channel';
  onClose: () => void;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const close = useRef(onClose);
  close.current = onClose;
  const isChannel = type === 'channel';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // A group needs someone to talk to; a channel can start with only you.
  const ready = name.trim().length > 0 && (isChannel || people.length > 0) && !busy;

  const create = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const { data } = await client.post('/api/messages/conversations', {
        type, name: name.trim(), ...(isChannel && description.trim() ? { description: description.trim() } : {}),
        participant_ids: people.map((p) => p.user_id),
      });
      onCreated?.();
      onClose();
      router.push(`/messages/${data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, isChannel ? 'Could not create the channel' : 'Could not create the group'));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="create-group-title" onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col overflow-hidden bg-card text-foreground shadow-2xl sm:h-auto sm:max-h-[88dvh] sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
          <h2 id="create-group-title" className="text-base font-bold">{isChannel ? 'New channel' : 'New group'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-secondary">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: isChannel ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)' }} aria-hidden="true">
              {isChannel ? <Radio className="h-6 w-6" /> : <Users className="h-6 w-6" />}
            </span>
            <label className="flex-1">
              <span className="sr-only">{isChannel ? 'Channel name' : 'Group name'}</span>
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 100))} autoFocus placeholder={isChannel ? 'Channel name' : 'Group name'}
                className="h-11 w-full rounded-xl border border-border bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
          </div>
          {isChannel && (
            <label className="block">
              <span className="sr-only">Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} rows={2} placeholder="What is this channel about? (optional)"
                className="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            {isChannel ? 'Only admins post in a channel. Add subscribers now or later.' : 'Add at least one person. Everyone in a group can write.'}
            {people.length > 0 && ` · ${people.length} selected`}
          </p>
        </div>

        <PeoplePicker me={user?.id ? String(user.id) : null} selected={people} onChange={setPeople} max={MAX_GROUP_MEMBERS - 1} />

        <div className="border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => void create()} disabled={!ready}
            className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40">
            {busy ? 'Creating…' : isChannel ? 'Create channel' : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
}
