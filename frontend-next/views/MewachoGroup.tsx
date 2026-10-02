'use client';
import SafeImage from '@/components/ui/SafeImage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, QrCode, Download,
  CreditCard, ArrowUpRight, X, Copy, CheckCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { mewachoApi, MewachoActivity, MewachoContribution, MewachoWithdrawal } from '@/api/mewacho';
import { useAuth } from '@/lib/AuthContext';
import moment from 'moment';

// ── Activity feed item ────────────────────────────────────────────────────────
function ActivityItem({ item }: { item: MewachoActivity }) {
  const isContrib = item.type === 'contribution';
  const isSys = item.type === 'system';
  const isWithdrawal = item.type === 'withdrawal';

  if (isSys) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-muted-foreground bg-secondary px-3 py-0.5 rounded-full">
          {item.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 ${isContrib || isWithdrawal ? 'items-start' : 'items-end'}`}>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
        {item.avatar_url
          ? <SafeImage fill={false} width={800} height={600} src={item.avatar_url} alt="" className="w-full h-full object-cover" />
          : (item.display_name?.[0] || '?')}
      </div>
      <div className={`max-w-[75%] ${isContrib ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-card border border-border/60'} rounded-2xl rounded-tl-sm px-3.5 py-2.5`}>
        <p className="text-xs font-semibold text-muted-foreground mb-0.5">{item.display_name}</p>
        <p className={`text-sm ${isContrib ? 'text-green-800 dark:text-green-300 font-medium' : ''}`}>
          {isContrib && '💚 '}{isWithdrawal && '💸 '}{item.content}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">{moment(item.created_at).fromNow()}</p>
      </div>
    </div>
  );
}

// ── Contribute modal ──────────────────────────────────────────────────────────
function ContributeModal({ groupId, groupName, onClose }: {
  groupId: string; groupName: string; onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [loading, setLoading] = useState(false);
  const quickAmounts = [100, 250, 500, 1000, 2000, 5000];

  const handleContribute = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    try {
      const { checkout_url } = await mewachoApi.contribute(groupId, amt, isAnon);
      window.location.href = checkout_url;
    } catch (err: any) {
      toast.error(err?.error || 'Failed to start payment');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-lg">Contribute to "{groupName}"</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label>Amount (ETB)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount" className="mt-1 text-lg font-semibold" min="1" />
            <div className="grid grid-cols-3 gap-2 mt-2">
              {quickAmounts.map(a => (
                <button key={a} type="button" onClick={() => setAmount(String(a))}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${amount === String(a) ? 'border-green-500 bg-green-50 text-green-700' : 'border-border hover:bg-secondary'}`}>
                  {a.toLocaleString()} ETB
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)}
              className="rounded" />
            <span className="text-sm text-muted-foreground">Contribute anonymously</span>
          </label>
          <div className="bg-secondary/50 rounded-xl p-3 text-xs text-muted-foreground flex gap-2">
            <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
            <span>You'll be redirected to Stripe to complete your payment securely.</span>
          </div>
          <Button className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleContribute} disabled={loading || !amount || parseFloat(amount) <= 0}>
            {loading ? 'Redirecting…' : `Pay ${amount ? parseFloat(amount).toLocaleString() : '0'} ETB`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Withdraw modal ────────────────────────────────────────────────────────────
function WithdrawModal({ groupId, available, onClose, onRequested }: {
  groupId: string; available: number; onClose: () => void; onRequested: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [destType, setDestType] = useState('bank');
  const [destRef, setDestRef] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !destRef.trim()) return;
    setLoading(true);
    try {
      await mewachoApi.requestWithdrawal(groupId, {
        amount: amt, destination_type: destType, destination_ref: destRef.trim(), note,
      });
      toast.success('Withdrawal request submitted');
      onRequested();
    } catch (err: any) {
      toast.error(err?.error || 'Failed to request withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-lg">Withdraw Funds</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground">Available balance</p>
            <p className="text-2xl font-bold text-green-600">{available.toLocaleString()} ETB</p>
          </div>
          <div>
            <Label>Amount (ETB)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              max={available} placeholder="Enter amount" className="mt-1" />
          </div>
          <div>
            <Label>Destination type</Label>
            <div className="flex gap-2 mt-1">
              {['bank', 'telebirr', 'cbe'].map(t => (
                <button key={t} type="button" onClick={() => setDestType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize
                    ${destType === t ? 'border-green-500 bg-green-50 text-green-700' : 'border-border hover:bg-secondary'}`}>
                  {t === 'cbe' ? 'CBE Birr' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>{destType === 'bank' ? 'Account number / IBAN' : 'Phone number'}</Label>
            <Input value={destRef} onChange={e => setDestRef(e.target.value)}
              placeholder={destType === 'bank' ? 'e.g. 1000123456789' : 'e.g. +251912345678'}
              className="mt-1" />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)}
              placeholder="Reason for withdrawal" className="mt-1" />
          </div>
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={loading || !amount || !destRef.trim()}>
            {loading ? 'Submitting…' : 'Request Withdrawal'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── QR / Invite modal ─────────────────────────────────────────────────────────
function InviteModal({ group, onClose }: { group: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/mewacho/join/${group.invite_code}`
    : '';

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl w-full max-w-sm shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Invite Members</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm">
            <QRCodeSVG value={inviteUrl} size={180} level="M"
              imageSettings={{ src: '/brand/nodbusiness-icon.svg', height: 28, width: 28, excavate: true }} />
          </div>
        </div>
        <div className="flex gap-2">
          <Input value={inviteUrl} readOnly className="text-xs font-mono" />
          <Button variant="outline" size="icon" onClick={copy} className="shrink-0">
            {copied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Share this link or QR code to invite members
        </p>
      </div>
    </div>
  );
}

// ── PDF export ────────────────────────────────────────────────────────────────
function exportPDF(group: any, contributions: MewachoContribution[], withdrawals: MewachoWithdrawal[]) {
  const doc = new jsPDF();
  const collected = contributions.filter(c => c.status === 'confirmed')
    .reduce((s, c) => s + parseFloat(String(c.amount)), 0);

  doc.setFontSize(20);
  doc.setTextColor(22, 163, 74); // green-600
  doc.text('ምውጮ Mewacho', 14, 20);

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(group.name, 14, 32);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Purpose: ${group.purpose}`, 14, 40);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 46);
  doc.text(`Members: ${group.member_count || 0}`, 14, 52);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Collected: ${collected.toLocaleString()} ETB`, 14, 62);
  if (group.target_amount) {
    const pct = ((collected / parseFloat(group.target_amount)) * 100).toFixed(0);
    doc.text(`Target: ${parseFloat(group.target_amount).toLocaleString()} ETB (${pct}%)`, 14, 70);
  }

  // Contributions table
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74);
  doc.text('Contributions', 14, 84);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  let y = 90;
  const confirmed = contributions.filter(c => c.status === 'confirmed');
  doc.text('Name', 14, y); doc.text('Amount (ETB)', 90, y); doc.text('Date', 140, y);
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, 196, y);
  y += 6;

  for (const c of confirmed) {
    if (y > 270) { doc.addPage(); y = 20; }
    const name = c.is_anonymous ? 'Anonymous' : (c.display_name || '—');
    doc.text(name.substring(0, 30), 14, y);
    doc.text(parseFloat(String(c.amount)).toLocaleString(), 90, y);
    doc.text(new Date(c.created_at).toLocaleDateString(), 140, y);
    y += 7;
  }

  // Withdrawals
  if (withdrawals.length) {
    y += 6;
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74);
    doc.text('Withdrawals', 14, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    y += 8;
    for (const w of withdrawals) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${w.requested_by_name || '—'} — ${parseFloat(String(w.amount)).toLocaleString()} ETB — ${w.status}`, 14, y);
      y += 7;
    }
  }

  doc.save(`mewacho-${group.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MewachoGroupView({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'ledger' | 'withdrawals'>('feed');
  const feedBottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await mewachoApi.getGroup(groupId);
      setData(d);
    } catch { router.push('/mewacho'); }
    setLoading(false);
  }, [groupId, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTab === 'feed') {
      feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.activity, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const activity = await mewachoApi.sendMessage(groupId, message.trim());
      setData((prev: any) => ({ ...prev, activity: [...(prev?.activity || []), activity] }));
      setMessage('');
    } catch (err: any) {
      toast.error(err?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />)}
    </div>
  );
  if (!data) return null;

  const { group, members, contributions, activity, withdrawals, my_role } = data;
  const isAdmin = my_role === 'admin';
  const collected = parseFloat(group.total_collected || 0);
  const target = group.target_amount ? parseFloat(group.target_amount) : null;
  const progress = target ? Math.min(100, (collected / target) * 100) : null;

  const withdrawnTotal = withdrawals
    .filter((w: MewachoWithdrawal) => w.status === 'completed')
    .reduce((s: number, w: MewachoWithdrawal) => s + parseFloat(String(w.amount)), 0);
  const available = Math.max(0, collected - withdrawnTotal);

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.push('/mewacho')}
            className="p-1.5 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">{group.name}</h1>
            <p className="text-xs text-muted-foreground capitalize">{group.purpose} · {members.length} members</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowInvite(true)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors" title="Invite">
              <QrCode className="w-4 h-4" />
            </button>
            <button onClick={() => exportPDF(group, contributions, withdrawals)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors" title="Export PDF">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Balance card */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/70">Total Collected</p>
              <p className="text-3xl font-bold">{collected.toLocaleString()}</p>
              <p className="text-xs text-white/70">ETB</p>
            </div>
            {target && (
              <div className="text-right">
                <p className="text-xs text-white/70">Target</p>
                <p className="text-lg font-semibold">{target.toLocaleString()} ETB</p>
              </div>
            )}
          </div>
          {progress !== null && (
            <div className="mt-3">
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-white/70 mt-1">{progress.toFixed(0)}% of goal</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {group.status === 'active' && (
          <div className="flex gap-2 mt-3">
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9"
              onClick={() => setShowContribute(true)}>
              <CreditCard className="w-4 h-4 mr-1.5" /> Contribute
            </Button>
            {isAdmin && (
              <Button variant="outline" className="flex-1 h-9" onClick={() => setShowWithdraw(true)}>
                <ArrowUpRight className="w-4 h-4 mr-1.5" /> Withdraw
              </Button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/60 rounded-xl p-1 mt-3">
          {(['feed', 'ledger', 'withdrawals'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                ${activeTab === t ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              {t === 'feed' ? '💬 Feed' : t === 'ledger' ? '📋 Ledger' : '💸 Withdrawals'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'feed' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {activity.map((a: MewachoActivity) => <ActivityItem key={a.id} item={a} />)}
          <div ref={feedBottomRef} />
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-xs text-muted-foreground mb-3">
            {contributions.filter((c: MewachoContribution) => c.status === 'confirmed').length} confirmed contributions
          </p>
          <div className="space-y-2">
            {contributions
              .filter((c: MewachoContribution) => c.status === 'confirmed')
              .map((c: MewachoContribution) => (
                <div key={c.id} className="flex items-center gap-3 bg-card rounded-xl border border-border/60 p-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm overflow-hidden shrink-0">
                    {c.avatar_url
                      ? <SafeImage fill={false} width={800} height={600} src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                      : (c.is_anonymous ? '🎭' : c.display_name?.[0] || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.is_anonymous ? 'Anonymous' : c.display_name}</p>
                    <p className="text-xs text-muted-foreground">{c.payment_method} · {moment(c.created_at).fromNow()}</p>
                  </div>
                  <p className="text-green-600 font-bold text-sm shrink-0">
                    +{parseFloat(String(c.amount)).toLocaleString()} ETB
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {withdrawals.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">No withdrawals yet</div>
          )}
          {withdrawals.map((w: MewachoWithdrawal) => (
            <div key={w.id} className="bg-card rounded-xl border border-border/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{parseFloat(String(w.amount)).toLocaleString()} ETB</p>
                  <p className="text-xs text-muted-foreground">
                    Requested by {w.requested_by_name} · {moment(w.created_at).fromNow()}
                  </p>
                  <p className="text-xs text-muted-foreground">{w.destination_type}: {w.destination_ref}</p>
                  {w.note && <p className="text-xs italic text-muted-foreground mt-1">"{w.note}"</p>}
                </div>
                <Badge className={
                  w.status === 'approved' ? 'bg-green-100 text-green-700' :
                  w.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }>
                  {w.status}
                </Badge>
              </div>
              {isAdmin && w.status === 'pending' && w.requested_by !== user?.id && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200"
                    onClick={async () => {
                      await mewachoApi.rejectWithdrawal(w.id);
                      load();
                    }}>
                    Reject
                  </Button>
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={async () => {
                      await mewachoApi.approveWithdrawal(w.id);
                      load();
                    }}>
                    Approve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message input — only on feed tab */}
      {activeTab === 'feed' && group.status === 'active' && (
        <form onSubmit={handleSendMessage}
          className="shrink-0 flex gap-2 p-3 border-t border-border bg-background/80 backdrop-blur-sm">
          <Input value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Write a message…" className="rounded-xl" />
          <Button type="submit" size="icon" disabled={!message.trim() || sending}
            className="rounded-xl bg-green-600 hover:bg-green-700 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}

      {showContribute && (
        <ContributeModal groupId={groupId} groupName={group.name}
          onClose={() => setShowContribute(false)} />
      )}
      {showWithdraw && (
        <WithdrawModal groupId={groupId} available={available}
          onClose={() => setShowWithdraw(false)} onRequested={() => { setShowWithdraw(false); load(); }} />
      )}
      {showInvite && <InviteModal group={group} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
