'use client';
/**
 * DevOps.tsx — Developer Ops / Todo Board (admin-managed, developer-readable)
 *
 * Kanban board tracking bugs, features, and tasks across the Empire X project.
 * Admins get full CRUD; other authenticated users see a read-only board.
 * NOTE: English strings are hardcoded on purpose — this is an internal ops page.
 *       i18n via locales/*.json is a follow-up.
 */
import React, { useEffect, useMemo, useState } from 'react';
import client from '@/api/client';
import { auth } from '@/api/auth';
import moment from 'moment';
import { toast } from 'sonner';
import {
  Activity, AlertTriangle, Ban, Bug, CheckCircle2, ChevronDown, CircleDot,
  ClipboardList, Clock, Eye, KanbanSquare, ListChecks, Loader2, Pencil,
  Plus, Rocket, Search, Sparkles, Tag, Trash2, User, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ErrorBoundary from '@/components/ErrorBoundary';

// ── Domain constants ─────────────────────────────────────────────────────────
type Kind = 'bug' | 'feature' | 'task';
type Status = 'open' | 'in_progress' | 'blocked' | 'done' | 'planned' | 'implemented';
type Severity = 'urgent' | 'warning' | 'attention' | 'cross_check';

interface DevOpsItem {
  id: string;
  kind: Kind;
  title: string;
  description?: string | null;
  severity?: Severity | null;
  status: Status;
  tags?: string[] | null;
  assigned_to?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

const SEVERITY_META: Record<Severity, { label: string; dot: string; text: string; chip: string; bar: string }> = {
  urgent:      { label: 'Urgent',     dot: 'bg-red-500',    text: 'text-red-500',    chip: 'bg-red-500/10 text-red-500 border-red-500/30',       bar: 'bg-red-500' },
  warning:     { label: 'Warning',    dot: 'bg-orange-500', text: 'text-orange-500', chip: 'bg-orange-500/10 text-orange-500 border-orange-500/30', bar: 'bg-orange-500' },
  attention:   { label: 'Attention',  dot: 'bg-yellow-400', text: 'text-yellow-500', chip: 'bg-yellow-400/10 text-yellow-500 border-yellow-400/40', bar: 'bg-yellow-400' },
  cross_check: { label: 'Cross-check', dot: 'bg-blue-500',  text: 'text-blue-500',   chip: 'bg-blue-500/10 text-blue-500 border-blue-500/30',     bar: 'bg-blue-500' },
};
const SEVERITY_ORDER: Severity[] = ['urgent', 'warning', 'attention', 'cross_check'];

const STATUS_META: Record<Status, { label: string; icon: React.ComponentType<{ className?: string }>; accent: string; headBg: string }> = {
  open:        { label: 'Open',        icon: CircleDot,     accent: 'text-sky-400',     headBg: 'bg-sky-500/10' },
  in_progress: { label: 'In Progress', icon: Activity,      accent: 'text-amber-500',   headBg: 'bg-amber-500/10' },
  blocked:     { label: 'Blocked',     icon: Ban,           accent: 'text-red-500',     headBg: 'bg-red-500/10' },
  planned:     { label: 'Planned',     icon: ListChecks,    accent: 'text-violet-500',  headBg: 'bg-violet-500/10' },
  done:        { label: 'Done',        icon: CheckCircle2,  accent: 'text-emerald-500', headBg: 'bg-emerald-500/10' },
  implemented: { label: 'Implemented', icon: Rocket,        accent: 'text-teal-400',    headBg: 'bg-teal-500/10' },
};
const COLUMN_ORDER: Status[] = ['open', 'in_progress', 'blocked', 'planned', 'done', 'implemented'];

const KIND_META: Record<Kind, { label: string; icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  bug:     { label: 'Bug',     icon: Bug,          tint: 'text-red-400 bg-red-500/10' },
  feature: { label: 'Feature', icon: Sparkles,     tint: 'text-violet-400 bg-violet-500/10' },
  task:    { label: 'Task',    icon: ClipboardList, tint: 'text-sky-400 bg-sky-500/10' },
};

// Valid statuses per kind (features plan/implement; bugs+tasks open→done)
const STATUSES_FOR_KIND: Record<Kind, Status[]> = {
  bug:     ['open', 'in_progress', 'blocked', 'done'],
  task:    ['open', 'in_progress', 'blocked', 'done'],
  feature: ['open', 'in_progress', 'blocked', 'planned', 'implemented'],
};

// ── Small presentational helpers ─────────────────────────────────────────────
function SeverityChip({ severity, size = 'xs' }: { severity?: Severity | null; size?: 'xs' | 'sm' }) {
  if (!severity) return null;
  const m = SEVERITY_META[severity];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-mono uppercase tracking-wider ${m.chip} ${size === 'xs' ? 'text-[9px] px-1.5 py-px' : 'text-[10px] px-2 py-0.5'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot} ${severity === 'urgent' ? 'animate-pulse' : ''}`} />
      {m.label}
    </span>
  );
}

interface FormState {
  kind: Kind; title: string; description: string; severity: Severity | '';
  status: Status; tags: string; assigned_to: string;
}
const EMPTY_FORM: FormState = { kind: 'bug', title: '', description: '', severity: '', status: 'open', tags: '', assigned_to: '' };

// ── Main view ────────────────────────────────────────────────────────────────
function DevOps() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [booted, setBooted] = useState(false);
  const [items, setItems] = useState<DevOpsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<Kind | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');

  // modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DevOpsItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<DevOpsItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get('/api/devops');
      setItems(data);
    } catch {
      toast.error('Failed to load the ops board');
    }
    setLoading(false);
  }

  useEffect(() => {
    auth.me().then((u) => {
      setIsAdmin(u?.role === 'admin');
      setBooted(true);
      load();
    }).catch(() => setBooted(true));
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const severityCounts = useMemo(() => {
    const active = items.filter(i => !['done', 'implemented'].includes(i.status));
    return SEVERITY_ORDER.reduce((acc, s) => {
      acc[s] = active.filter(i => i.severity === s).length;
      return acc;
    }, {} as Record<Severity, number>);
  }, [items]);

  const statusCounts = useMemo(() =>
    COLUMN_ORDER.reduce((acc, s) => {
      acc[s] = items.filter(i => i.status === s).length;
      return acc;
    }, {} as Record<Status, number>), [items]);

  const openBugs = useMemo(() =>
    items.filter(i => i.kind === 'bug' && !['done', 'implemented'].includes(i.status)).length, [items]);

  // ── Filtering (client-side over the full board) ───────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (kindFilter !== 'all' && i.kind !== kindFilter) return false;
      if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.description ?? '').toLowerCase().includes(q) ||
        (i.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
        (i.assigned_to ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, search, kindFilter, severityFilter, statusFilter]);

  const columns = statusFilter === 'all' ? COLUMN_ORDER : [statusFilter];

  // ── Mutations ─────────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  }

  function openEdit(item: DevOpsItem) {
    setEditing(item);
    setForm({
      kind: item.kind,
      title: item.title,
      description: item.description ?? '',
      severity: item.severity ?? '',
      status: item.status,
      tags: (item.tags ?? []).join(', '),
      assigned_to: item.assigned_to ?? '',
    });
    setEditorOpen(true);
  }

  async function saveItem() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const payload = {
      kind: form.kind,
      title: form.title.trim(),
      description: form.description.trim() || null,
      severity: form.severity || null,
      status: form.status,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      assigned_to: form.assigned_to.trim() || null,
    };
    try {
      if (editing) {
        await client.put(`/api/devops/${editing.id}`, payload);
        toast.success('Item updated');
      } else {
        await client.post('/api/devops', payload);
        toast.success('Item created');
      }
      setEditorOpen(false);
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to save item');
    }
    setSaving(false);
  }

  async function moveStatus(item: DevOpsItem, status: Status) {
    setBusyId(item.id);
    // optimistic
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i));
    try {
      await client.put(`/api/devops/${item.id}`, { status });
      await load();
    } catch {
      toast.error('Failed to move item');
      await load();
    }
    setBusyId(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await client.delete(`/api/devops/${deleting.id}`);
      toast.success('Item deleted');
      setDeleting(null);
      await load();
    } catch {
      toast.error('Failed to delete item');
    }
    setBusyId(null);
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  if (!booted) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1500px] mx-auto px-3 md:px-6 pb-24">
      {/* ══ Header ══ */}
      <div className="flex flex-wrap items-center gap-3 pt-5 pb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <KanbanSquare className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight">Developer Ops</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-emerald-500">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-500" />
              </span>
              live
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono tracking-wide">
            empire-x · {items.length} tracked items · {openBugs} open bugs
          </p>
        </div>
        <div className="flex-1" />
        {!isAdmin && (
          <Badge variant="outline" className="gap-1.5 text-muted-foreground border-border/60">
            <Eye className="w-3.5 h-3.5" /> Read-only
          </Badge>
        )}
        {isAdmin && (
          <Button onClick={openCreate} className="rounded-full h-10 px-5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-600/25 font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> New Item
          </Button>
        )}
      </div>

      {/* ══ Severity telemetry rail ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
        {SEVERITY_ORDER.map(s => {
          const m = SEVERITY_META[s];
          const active = severityFilter === s;
          return (
            <button
              key={s}
              onClick={() => setSeverityFilter(active ? 'all' : s)}
              className={`group relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all
                ${active ? 'border-current shadow-md' : 'border-border/50 hover:border-border bg-card'}`}
              style={active ? { borderColor: 'color-mix(in srgb, currentColor 45%, transparent)' } : undefined}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.bar}`} />
              <div className="flex items-center justify-between pl-2">
                <div>
                  <p className={`text-[10px] font-mono uppercase tracking-widest ${m.text}`}>{m.label}</p>
                  <p className="text-2xl font-bold tabular-nums leading-tight">{severityCounts[s]}</p>
                  <p className="text-[10px] text-muted-foreground">active items</p>
                </div>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${m.chip} border`}>
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ══ Status strip ══ */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all
            ${statusFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'}`}
        >
          All <span className="font-mono tabular-nums opacity-70">{items.length}</span>
        </button>
        {COLUMN_ORDER.map(s => {
          const m = STATUS_META[s];
          const Icon = m.icon;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? 'all' : s)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all
                ${active ? 'bg-foreground text-background border-foreground' : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? '' : m.accent}`} />
              {m.label} <span className="font-mono tabular-nums opacity-70">{statusCounts[s]}</span>
            </button>
          );
        })}
      </div>

      {/* ══ Toolbar: search + kind filter ══ */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, tags, assignee…"
            className="pl-10 rounded-full bg-card"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'bug', 'feature', 'task'] as const).map(k => {
            const active = kindFilter === k;
            const Icon = k === 'all' ? null : KIND_META[k].icon;
            return (
              <button
                key={k}
                onClick={() => setKindFilter(k)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold border transition-all capitalize
                  ${active ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card border-border/50 text-muted-foreground hover:text-foreground'}`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {k === 'all' ? 'All kinds' : `${k}s`}
              </button>
            );
          })}
        </div>
        {(search || kindFilter !== 'all' || severityFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setKindFilter('all'); setSeverityFilter('all'); setStatusFilter('all'); }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ══ Board ══ */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 items-start">
          {columns.map(status => {
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            const cards = filtered
              .filter(i => i.status === status)
              .sort((a, b) => moment(b.updated_at).valueOf() - moment(a.updated_at).valueOf());
            return (
              <div key={status} className="w-[290px] shrink-0 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                {/* Column header */}
                <div className={`flex items-center gap-2 px-3.5 py-3 ${meta.headBg} border-b border-border/40`}>
                  <Icon className={`w-4 h-4 ${meta.accent}`} />
                  <span className="text-sm font-semibold">{meta.label}</span>
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground bg-background/60 border border-border/40 rounded-full px-2 py-0.5">
                    {cards.length}
                  </span>
                </div>
                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[120px]">
                  {cards.length === 0 && (
                    <div className="text-center text-[11px] text-muted-foreground/60 font-mono py-8 border border-dashed border-border/40 rounded-xl">
                      empty
                    </div>
                  )}
                  {cards.map(item => (
                    <OpsCard
                      key={item.id}
                      item={item}
                      isAdmin={isAdmin}
                      busy={busyId === item.id}
                      onEdit={() => openEdit(item)}
                      onDelete={() => setDeleting(item)}
                      onMove={(s) => moveStatus(item, s)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ Create / Edit modal ══ */}
      <Dialog open={editorOpen} onOpenChange={(o) => !saving && setEditorOpen(o)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2">
              {editing ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              {editing ? 'Edit Item' : 'New Ops Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* kind selector */}
            <div>
              <Label text="Kind" />
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(KIND_META) as Kind[]).map(k => {
                  const m = KIND_META[k];
                  const Icon = m.icon;
                  const active = form.kind === k;
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        // keep status valid when switching kinds
                        const allowed = STATUSES_FOR_KIND[k];
                        setForm(f => ({ ...f, kind: k, status: allowed.includes(f.status) ? f.status : 'open' }));
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all
                        ${active ? 'border-primary bg-primary/10 text-foreground shadow-sm' : 'border-border/60 text-muted-foreground hover:border-border'}`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.tint}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label text="Title" />
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Short, actionable summary…" />
            </div>

            <div>
              <Label text="Description" />
              <Textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Context, repro steps, links…" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="Severity" />
                <select
                  value={form.severity}
                  onChange={e => set('severity', e.target.value as FormState['severity'])}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— none —</option>
                  {SEVERITY_ORDER.map(s => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}
                </select>
              </div>
              <div>
                <Label text="Status" />
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value as Status)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUSES_FOR_KIND[form.kind].map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="Tags (comma-separated)" />
                <Input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="chat, stripe, ui" />
              </div>
              <div>
                <Label text="Assignee" />
                <Input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="frontend-dev" />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-full" onClick={() => setEditorOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveItem} disabled={saving} className="rounded-full px-6 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Delete confirm ══ */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Item
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete <span className="font-semibold text-foreground">“{deleting?.title}”</span>? This cannot be undone.
          </p>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="rounded-full" onClick={() => setDeleting(null)} disabled={!!busyId}>Cancel</Button>
            <Button onClick={confirmDelete} disabled={!!busyId} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground px-6">
              {busyId ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Field label ──────────────────────────────────────────────────────────────
function Label({ text }: { text: string }) {
  return <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{text}</p>;
}

// ── Card ─────────────────────────────────────────────────────────────────────
function OpsCard({
  item, isAdmin, busy, onEdit, onDelete, onMove,
}: {
  item: DevOpsItem;
  isAdmin: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (s: Status) => void;
}) {
  const kind = KIND_META[item.kind];
  const KindIcon = kind.icon;
  const sev = item.severity ? SEVERITY_META[item.severity] : null;

  const body = (
    <div className={`relative rounded-xl border border-border/60 bg-card p-3 pl-4 transition-all overflow-hidden
      ${isAdmin ? 'cursor-pointer hover:border-border hover:shadow-md hover:-translate-y-px' : ''}
      ${busy ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* severity edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${sev?.bar ?? 'bg-border/60'}`} />

      <div className="flex items-start gap-2">
        <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${kind.tint}`}>
          <KindIcon className="w-3.5 h-3.5" />
        </span>
        <p className="text-[13px] font-semibold leading-snug flex-1">{item.title}</p>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={e => e.stopPropagation()}
                className="shrink-0 -mr-1 -mt-0.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Item actions"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onClick={e => e.stopPropagation()}>
              <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest">Move to</DropdownMenuLabel>
              {STATUSES_FOR_KIND[item.kind].filter(s => s !== item.status).map(s => {
                const m = STATUS_META[s];
                const Icon = m.icon;
                return (
                  <DropdownMenuItem key={s} onClick={() => onMove(s)}>
                    <Icon className={`w-3.5 h-3.5 mr-2 ${m.accent}`} /> {m.label}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {(item.severity || (item.tags && item.tags.length > 0)) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <SeverityChip severity={item.severity} />
          {(item.tags ?? []).slice(0, 3).map(t => (
            <span key={t} className="inline-flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground bg-secondary/70 rounded-full px-1.5 py-px">
              <Tag className="w-2.5 h-2.5" /> {t}
            </span>
          ))}
          {(item.tags?.length ?? 0) > 3 && (
            <span className="text-[9px] font-mono text-muted-foreground">+{item.tags!.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2.5 mt-2.5 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
        {item.assigned_to ? (
          <span className="inline-flex items-center gap-1 min-w-0">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate font-medium">{item.assigned_to}</span>
          </span>
        ) : (
          <span className="italic opacity-60">unassigned</span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 shrink-0 font-mono" title={moment(item.updated_at).format('lll')}>
          <Clock className="w-3 h-3" /> {moment(item.updated_at).fromNow()}
        </span>
      </div>
    </div>
  );

  return isAdmin ? <div onClick={onEdit}>{body}</div> : body;
}

export default function DevOpsPage() {
  return <ErrorBoundary><DevOps /></ErrorBoundary>;
}
