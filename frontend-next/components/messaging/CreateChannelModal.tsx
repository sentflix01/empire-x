'use client'
import { useRouter } from 'next/navigation';
import React, { useState } from "react";
import { entities } from "@/api/entities";
import { useTranslation } from 'react-i18next';

import { X, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";


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
    } catch (e) {
      console.error(e);
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card dark:bg-card rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-border/50" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <h2 className="font-semibold text-lg text-primary">New Channel</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 bg-primary">
              <Radio className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Channel name"
                className="border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-primary h-10"
                autoFocus
              />
            </div>
          </div>

          <div>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="resize-none focus-visible:ring-1 focus-visible:ring-primary/30"
              rows={3}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-primary" />
              <span className="font-medium text-primary">Broadcast Channel</span>
            </p>
            <p>Only admins can post messages. Subscribers can view and react to messages.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/30 flex gap-2">
          <Button onClick={onClose} variant="ghost" className="flex-1 rounded-full">Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="flex-1 rounded-full text-white font-medium h-10 disabled:opacity-40"
          >
            {creating ? "Creating..." : "Create Channel"}
          </Button>
        </div>
      </div>
    </div>
  );
}

