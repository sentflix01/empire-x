'use client';
/**
 * Group or channel info: name and description, the members with their roles,
 * and what admins can do (rename, add people you could message, remove,
 * make admin or take it back, delete the group). Anyone can leave. Changes
 * made by others show up live.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Radio, UserPlus, Pencil, LogOut, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { getSocket, joinConversation, leaveConversation } from '@/lib/socket';
import { useChatViewport } from '@/lib/useChatViewport';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import ChoiceDialog, { type Choice } from '@/components/messaging/ChoiceDialog';
import PeoplePicker, { PersonAvatar, type Person } from '@/components/messaging/PeoplePicker';
import { MAX_GROUP_MEMBERS } from '@/components/messaging/CreateGroupDialog';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Member { user_id: string; role?: string | null; display_name?: string | null; avatar_url?: string | string[] | null }
interface Group { id: string; type: string; name?: string | null; description?: string | null; my_role?: string | null; members?: Member[] }

type Confirm = { kind: 'member'; member: Member } | { kind: 'leave' } | { kind: 'delete' };

function ChatMembers() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const router = useRouter();
  const { user } = useAuth();
  const me = user?.id ? String(user.id) : null;
  useChatViewport();

  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [toAdd, setToAdd] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get(`/api/messages/conversations/${id}`);
      if (data?.type === 'dm') { router.replace(`/messages/${id}`); return; }
      setGroup(data as Group);
      loadedOnce.current = true;
    } catch (err) {
      const msg = apiErrorMessage(err, 'This group could not be opened.');
      if (loadedOnce.current) { toast.info('You’re no longer in this group'); router.push('/messages'); return; }
      setError(msg);
    }
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    joinConversation(id);
    const onChange = (p: { conversation_id?: string }) => { if (p?.conversation_id === id) void load(); };
    socket.on('members_changed', onChange);
    return () => { socket.off('members_changed', onChange); leaveConversation(id); };
  }, [id, load]);

  const isChannel = group?.type === 'channel';
  const amAdmin = group?.my_role === 'admin';
  const members = [...(group?.members ?? [])].sort((a, b) =>
    Number(b.role === 'admin') - Number(a.role === 'admin') || String(a.display_name ?? '').localeCompare(String(b.display_name ?? '')));
  const noun = isChannel ? 'subscriber' : 'member';
  const back = () => router.push(`/messages/${id}`);

  const saveDetails = async () => {
    if (!name.trim()) { toast.error('Give it a name'); return; }
    setBusy(true);
    try {
      await client.put(`/api/messages/conversations/${id}`, { name: name.trim(), description: description.trim() });
      setEditing(false);
      await load();
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not save')); }
    finally { setBusy(false); }
  };

  const addPeople = async () => {
    setBusy(true);
    const failed: string[] = [];
    for (const p of toAdd) {
      try { await client.post(`/api/messages/conversations/${id}/members`, { user_id: p.user_id }); }
      catch (err) { failed.push(`${p.display_name || 'Someone'}: ${apiErrorMessage(err, 'couldn’t be added')}`); }
    }
    setBusy(false);
    setAdding(false);
    setToAdd([]);
    if (failed.length) toast.error(failed.join('\n'));
    else toast.success(toAdd.length === 1 ? 'Added' : `${toAdd.length} people added`);
    await load();
  };

  const memberAction = async (m: Member, action: string) => {
    setConfirm(null);
    if (action === 'profile') { router.push(`/profile/${m.user_id}`); return; }
    try {
      if (action === 'admin' || action === 'member') await client.put(`/api/messages/conversations/${id}/members/${m.user_id}`, { role: action });
      if (action === 'remove') await client.delete(`/api/messages/conversations/${id}/members/${m.user_id}`);
      await load();
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not update this member')); }
  };

  const leave = async () => {
    setConfirm(null);
    try { await client.post(`/api/messages/conversations/${id}/leave`); router.push('/messages'); }
    catch (err) { toast.error(apiErrorMessage(err, 'Could not leave')); }
  };
  const remove = async () => {
    setConfirm(null);
    try { await client.delete(`/api/messages/conversations/${id}`); toast.success(isChannel ? 'Channel deleted' : 'Group deleted'); router.push('/messages'); }
    catch (err) { toast.error(apiErrorMessage(err, 'Could not delete')); }
  };

  const memberChoices = (m: Member): Choice[] => {
    const list: Choice[] = [{ label: 'View profile', value: 'profile' }];
    if (amAdmin && m.user_id !== me) {
      list.push(m.role === 'admin' ? { label: 'Remove as admin', value: 'member' } : { label: 'Make admin', value: 'admin' });
      list.push({ label: `Remove from ${isChannel ? 'channel' : 'group'}`, value: 'remove', destructive: true });
    }
    return list;
  };

  return (
    <div className="fixed inset-x-0 top-[var(--chat-top,0px)] z-[55] flex h-[var(--chat-vh,100dvh)] flex-col overflow-hidden bg-background md:static md:z-auto md:h-full">
      <div className="flex shrink-0 items-center gap-2 bg-primary px-1.5 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white md:pt-2">
        <button type="button" onClick={back} aria-label="Back to chat" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-base font-semibold">{isChannel ? 'Channel info' : 'Group info'}</h1>
      </div>

      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button type="button" onClick={() => router.push('/messages')} className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Back to messages</button>
        </div>
      ) : !group ? (
        <div className="flex flex-1 justify-center py-10" role="status" aria-label="Loading">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          <section className="flex flex-col items-center gap-2 border-b border-border px-4 py-6 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full text-white"
              style={{ background: isChannel ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)' }} aria-hidden="true">
              {isChannel ? <Radio className="h-9 w-9" /> : <Users className="h-9 w-9" />}
            </span>
            {editing ? (
              <div className="w-full max-w-sm space-y-2">
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 100))} aria-label="Name" autoFocus
                  className="h-11 w-full rounded-xl border border-border bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} rows={3} aria-label="Description" placeholder="Description (optional)"
                  className="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="flex justify-center gap-2">
                  <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-full border border-border px-5 text-sm font-semibold">Cancel</button>
                  <button type="button" onClick={() => void saveDetails()} disabled={busy} className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Save</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold">{group.name || (isChannel ? 'Channel' : 'Group')}</h2>
                {group.description && <p className="max-w-md whitespace-pre-line text-sm text-muted-foreground">{group.description}</p>}
                <p className="text-xs text-muted-foreground">{members.length} {noun}{members.length === 1 ? '' : 's'} · up to {MAX_GROUP_MEMBERS}</p>
                {amAdmin && (
                  <button type="button" onClick={() => { setName(group.name ?? ''); setDescription(group.description ?? ''); setEditing(true); }}
                    className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold hover:bg-secondary">
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />Edit name and description
                  </button>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="members-title" className="py-2">
            <div className="flex items-center justify-between px-4 py-2">
              <h3 id="members-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{isChannel ? 'Subscribers' : 'Members'}</h3>
              {amAdmin && members.length < MAX_GROUP_MEMBERS && (
                <button type="button" onClick={() => setAdding(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />Add people
                </button>
              )}
            </div>
            <ul>
              {members.map((m) => (
                <li key={m.user_id}>
                  <button type="button" onClick={() => setConfirm({ kind: 'member', member: m })}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-secondary/60">
                    <PersonAvatar person={m} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.display_name || 'User'}{m.user_id === me && <span className="text-muted-foreground"> (you)</span>}</span>
                    {m.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                        <ShieldCheck className="h-3 w-3" aria-hidden="true" />Admin
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-border py-2">
            <button type="button" onClick={() => setConfirm({ kind: 'leave' })} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium text-destructive hover:bg-secondary/60">
              <LogOut className="h-5 w-5" aria-hidden="true" />{isChannel ? 'Leave channel' : 'Leave group'}
            </button>
            {amAdmin && (
              <button type="button" onClick={() => setConfirm({ kind: 'delete' })} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium text-destructive hover:bg-secondary/60">
                <Trash2 className="h-5 w-5" aria-hidden="true" />{isChannel ? 'Delete channel' : 'Delete group'}
              </button>
            )}
          </section>
        </div>
      )}

      {adding && group && (
        <div className="fixed inset-0 z-[65] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setAdding(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="add-people-title" onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full flex-col overflow-hidden bg-card shadow-xl sm:h-auto sm:max-h-[85dvh] sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
              <h2 id="add-people-title" className="text-base font-semibold">Add people</h2>
              <button type="button" onClick={() => setAdding(false)} className="h-9 rounded-full px-3 text-sm text-muted-foreground hover:bg-secondary">Cancel</button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col pt-3">
              <PeoplePicker me={me} exclude={members.map((m) => m.user_id)} selected={toAdd} onChange={setToAdd} max={MAX_GROUP_MEMBERS - members.length} />
            </div>
            <div className="border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => void addPeople()} disabled={!toAdd.length || busy}
                className="h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40">
                {busy ? 'Adding…' : toAdd.length ? `Add ${toAdd.length}` : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm?.kind === 'member' && (
        <ChoiceDialog title={confirm.member.display_name || 'Member'} onClose={() => setConfirm(null)}
          choices={memberChoices(confirm.member)} onChoose={(v) => void memberAction(confirm.member, v)} />
      )}
      {confirm?.kind === 'leave' && (
        <ChoiceDialog title={isChannel ? 'Leave this channel?' : 'Leave this group?'}
          description={amAdmin && members.filter((m) => m.role === 'admin').length === 1 ? 'You’re the only admin, so the longest-standing member becomes admin.' : undefined}
          onClose={() => setConfirm(null)} choices={[{ label: 'Leave', value: 'leave', destructive: true }]} onChoose={() => void leave()} />
      )}
      {confirm?.kind === 'delete' && (
        <ChoiceDialog title={isChannel ? 'Delete this channel?' : 'Delete this group?'} description="It’s removed for everyone, with all its messages. This can’t be undone."
          onClose={() => setConfirm(null)} choices={[{ label: 'Delete for everyone', value: 'delete', destructive: true }]} onChoose={() => void remove()} />
      )}
    </div>
  );
}

export default function ChatMembersPage() {
  return <ErrorBoundary><ChatMembers /></ErrorBoundary>;
}
