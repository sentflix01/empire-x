'use client'
import { useRouter } from 'next/navigation';
import React, { useState } from "react";
import { entities } from "@/api/entities";
import { X, Users, Check, Search } from "lucide-react";
import { toast } from "sonner";

export default function CreateGroupModal({ open, onClose, user, contacts, onCreated }) {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  if (!open) return null;

  const filtered = contacts.filter(c =>
    (c.display_name || c.full_name || c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (contact) => {
    setSelected(prev =>
      prev.find(c => c.id === contact.id)
        ? prev.filter(c => c.id !== contact.id)
        : [...prev, contact]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0 || creating) return;
    setCreating(true);
    try {
      const participantIds = [user.id, ...selected.map(c => c.id)];
      const participantNames = [
        user.full_name || user.display_name || "User",
        ...selected.map(c => c.display_name || c.full_name || "User"),
      ];
      const conv = await entities.Conversation.create({
        participant_ids: JSON.stringify(participantIds),
        participant_names: JSON.stringify(participantNames),
        type: "group",
        name: name.trim(),
        admin_id: user.id,
        last_message: "",
      });
      onCreated?.();
      router.push(`/messages/${conv.id}`);
    } catch {
      toast.error("Failed to create group");
    }
    setCreating(false);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md mx-4 max-h-[88vh] flex flex-col shadow-2xl border border-border overflow-hidden"
        style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-base" style={{ color: 'hsl(var(--foreground))' }}>New Group</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'hsl(var(--secondary))' }}
          >
            <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>

        {/* ── Group name row ── */}
        <div className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
            >
              <Users className="w-6 h-6 text-white" />
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Group name"
              autoFocus
              className="flex-1 h-11 px-4 rounded-xl text-sm outline-none border transition-all"
              style={{
                backgroundColor: 'hsl(var(--secondary))',
                color: 'hsl(var(--foreground))',
                borderColor: 'hsl(var(--border))',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'hsl(var(--primary))')}
              onBlur={e => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
            />
          </div>
          {selected.length > 0 && (
            <p className="text-xs mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {selected.length} member{selected.length !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        {/* ── Selected chips ── */}
        {selected.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-border max-h-20 overflow-y-auto shrink-0">
            {selected.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1"
                style={{ backgroundColor: 'hsl(var(--secondary))' }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
                >
                  {(c.display_name || c.full_name || "U").charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  {c.display_name || c.full_name || c.email}
                </span>
                <button onClick={() => toggleSelect(c)}>
                  <X className="w-3 h-3" style={{ color: 'hsl(var(--muted-foreground))' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Search contacts ── */}
        <div className="px-4 py-2 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'hsl(var(--muted-foreground))' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts"
              className="w-full h-9 pl-9 pr-4 rounded-full text-sm outline-none border"
              style={{
                backgroundColor: 'hsl(var(--secondary))',
                color: 'hsl(var(--foreground))',
                borderColor: 'transparent',
              }}
            />
          </div>
        </div>

        {/* ── Contact list ── */}
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>
              No contacts found
            </p>
          ) : (
            filtered.map(contact => {
              const isSelected = Boolean(selected.find(c => c.id === contact.id));
              const initials = (contact.display_name || contact.full_name || "U").charAt(0).toUpperCase();
              return (
                <button
                  key={contact.id}
                  onClick={() => toggleSelect(contact)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left"
                  style={{ backgroundColor: isSelected ? 'hsl(var(--secondary)/0.7)' : 'transparent' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'hsl(var(--secondary)/0.4)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div className="relative shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#7c3aed)' }}
                    >
                      {initials}
                    </div>
                    {isSelected && (
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white border-2"
                        style={{ backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--card))' }}
                      >
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                      {contact.display_name || contact.full_name || "Unknown"}
                    </p>
                    {contact.email && (
                      <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {contact.email}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={handleCreate}
            disabled={!name.trim() || selected.length === 0 || creating}
            className="w-full h-11 rounded-full text-sm font-bold text-white transition-all disabled:opacity-40 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
          >
            {creating
              ? "Creating…"
              : `Create Group${selected.length > 0 ? ` (${selected.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
