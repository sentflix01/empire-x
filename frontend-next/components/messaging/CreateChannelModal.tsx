'use client'
import { useRouter } from 'next/navigation';
import React, { useState } from "react";
import { entities } from "@/api/entities";
import { X, Radio } from "lucide-react";
import { toast } from "sonner";

export default function CreateChannelModal({ open, onClose, user, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const conv = await entities.Conversation.create({
        participant_ids: JSON.stringify([user.id]),
        participant_names: JSON.stringify([user.full_name || "User"]),
        type: "channel",
        name: name.trim(),
        description: description.trim(),
        admin_id: user.id,
        last_message: "",
      });
      onCreated?.();
      router.push(`/messages/${conv.id}`);
    } catch {
      toast.error("Failed to create channel");
    }
    setCreating(false);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-border overflow-hidden flex flex-col"
        style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-base" style={{ color: 'hsl(var(--foreground))' }}>New Channel</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'hsl(var(--secondary))' }}
          >
            <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-5 py-5 space-y-4">
          {/* Icon + Name row */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary)/0.7))' }}
            >
              <Radio className="w-7 h-7 text-white" />
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Channel name"
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

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none border resize-none transition-all"
            style={{
              backgroundColor: 'hsl(var(--secondary))',
              color: 'hsl(var(--foreground))',
              borderColor: 'hsl(var(--border))',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'hsl(var(--primary))')}
            onBlur={e => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
          />

          {/* Info box */}
          <div
            className="rounded-xl px-4 py-3 text-xs border"
            style={{
              backgroundColor: 'hsl(var(--secondary)/0.5)',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            <p className="flex items-center gap-2 mb-1 font-semibold" style={{ color: 'hsl(var(--primary))' }}>
              <Radio className="w-4 h-4" /> Broadcast Channel
            </p>
            <p>Only admins can post messages. Subscribers can view and react.</p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-full text-sm font-semibold border transition-colors"
            style={{
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              backgroundColor: 'transparent',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="flex-1 h-11 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary)/0.8))' }}
          >
            {creating ? "Creating…" : "Create Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}
