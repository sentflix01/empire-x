'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Target, TrendingUp, Link2, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { mewachoApi, MewachoGroup } from '@/api/mewacho';

const PURPOSE_ICONS: Record<string, string> = {
  birthday: '🎂', charity: '❤️', wedding: '💍', trip: '✈️',
  office: '💼', general: '💰', fundraising: '🤝',
};

const PURPOSE_OPTIONS = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'charity', label: 'Charity / Fundraising' },
  { value: 'wedding', label: 'Wedding Gift' },
  { value: 'trip', label: 'Trip / Event' },
  { value: 'office', label: 'Office / Friends' },
  { value: 'general', label: 'Other' },
];

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (g: MewachoGroup) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('general');
  const [targetAmount, setTargetAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const group = await mewachoApi.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        purpose,
        target_amount: targetAmount ? parseFloat(targetAmount) : undefined,
      });
      onCreated(group);
      toast.success('Group created!');
    } catch (err: any) {
      toast.error(err?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="rounded-2xl w-full max-w-md shadow-2xl border border-border" style={{ backgroundColor: 'hsl(var(--card))', isolation: 'isolate' }}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-lg">Create Mewacho Group</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label>Group Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Sara's Birthday Collection" className="mt-1" />
          </div>
          <div>
            <Label>Purpose</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {PURPOSE_OPTIONS.map(p => (
                <button key={p.value} type="button"
                  onClick={() => setPurpose(p.value)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all text-center
                    ${purpose === p.value ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-border hover:bg-secondary'}`}>
                  <span className="block text-base mb-0.5">{PURPOSE_ICONS[p.value]}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What is this collection for?" className="mt-1" />
          </div>
          <div>
            <Label>Target Amount (ETB) — optional</Label>
            <Input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
              placeholder="e.g. 10000" className="mt-1" min="0" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={loading || !name.trim()}>
              {loading ? 'Creating…' : 'Create Group'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GroupCard({ group, onClick }: { group: MewachoGroup; onClick: () => void }) {
  const collected = parseFloat(String(group.total_collected || 0));
  const target = group.target_amount ? parseFloat(String(group.target_amount)) : null;
  const progress = target ? Math.min(100, (collected / target) * 100) : null;

  return (
    <div onClick={onClick}
      className="bg-card rounded-2xl border border-border/60 p-4 cursor-pointer hover:border-green-500/50 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-2xl shrink-0 shadow-sm">
          {PURPOSE_ICONS[group.purpose] || '💰'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{group.name}</p>
            {group.status === 'closed' && <Badge variant="secondary" className="text-[10px]">Closed</Badge>}
          </div>
          <p className="text-xs text-muted-foreground capitalize">{group.purpose}</p>
        </div>
        {group.my_role === 'admin' && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px]">Admin</Badge>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs">{group.member_count || 0} members</span>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-600">{collected.toLocaleString()} ETB</p>
          {target && <p className="text-[10px] text-muted-foreground">of {target.toLocaleString()} ETB</p>}
        </div>
      </div>

      {progress !== null && (
        <div className="mt-2">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
              style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{progress.toFixed(0)}%</p>
        </div>
      )}
    </div>
  );
}

function JoinModal({ onClose, onJoined }: { onClose: () => void; onJoined: (groupId: string) => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { group } = await mewachoApi.joinGroup(code.trim());
      toast.success(`Joined "${group.name}"!`);
      onJoined(group.id);
    } catch (err: any) {
      toast.error(err?.error || 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="rounded-2xl w-full max-w-sm shadow-2xl border border-border p-5" style={{ backgroundColor: 'hsl(var(--card))', isolation: 'isolate' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Join a Group</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleJoin} className="space-y-3">
          <Input value={code} onChange={e => setCode(e.target.value)}
            placeholder="Enter invite code" className="font-mono" />
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={loading || !code.trim()}>
            {loading ? 'Joining…' : 'Join Group'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function Mewacho() {
  const router = useRouter();
  const [groups, setGroups] = useState<MewachoGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const load = async () => {
    try {
      const data = await mewachoApi.listGroups();
      setGroups(data);
    } catch { /* handled by auth layer */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreated = (g: MewachoGroup) => {
    setGroups(prev => [g, ...prev]);
    setShowCreate(false);
    router.push(`/mewacho/${g.id}`);
  };

  const handleJoined = (groupId: string) => {
    setShowJoin(false);
    load();
    router.push(`/mewacho/${groupId}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <span>ምውጮ</span>
            <span className="text-sm font-normal text-muted-foreground">Mewacho</span>
          </h1>
          <p className="text-sm text-muted-foreground">Group money collections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowJoin(true)}>
            <Link2 className="w-4 h-4 mr-1" /> Join
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Group
          </Button>
        </div>
      </div>

      {/* Groups list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">💰</div>
          <p className="font-semibold text-lg">No groups yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create a group to start collecting money together</p>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create your first group
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <GroupCard key={g.id} group={g} onClick={() => router.push(`/mewacho/${g.id}`)} />
          ))}
        </div>
      )}

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />}
    </div>
  );
}
