'use client'
import { useRouter } from 'next/navigation';
import React, { useState } from "react";
import { entities } from "@/api/entities";
import { useTranslation } from 'react-i18next';

import { X, Users, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TG_BLUE = "#0088cc";

export default function CreateGroupModal({ open, onClose, user, contacts, onCreated }) {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  if (!open) return null;

  const filtered = contacts.filter(c =>
    (c.full_name || c.email || "").toLowerCase().includes(search.toLowerCase())
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
      const participantNames = [user.full_name || "User", ...selected.map(c => c.full_name || "User")];
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
    } catch (e) {
      console.error(e);
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <h2 className="font-semibold text-lg" style={{ color: TG_BLUE }}>New Group</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Group Name */}
        <div className="px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#4CAF50" }}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Group name"
              className="flex-1 border-0 border-b border-border/50 rounded-none focus-visible:ring-0 focus-visible:border-[#0088cc] h-10"
              autoFocus
            />
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">{selected.length} member{selected.length > 1 ? "s" : ""} selected</p>
          )}
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-border/30 max-h-24 overflow-y-auto">
            {selected.map(c => (
              <div key={c.id} className="flex items-center gap-1.5 bg-secondary rounded-full pl-1 pr-2 py-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: TG_BLUE }}>
                  {(c.full_name || "U").charAt(0)}
                </div>
                <span className="text-xs font-medium">{c.full_name || c.email}</span>
                <button onClick={() => toggleSelect(c)} className="ml-0.5">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative px-4 py-2 border-b border-border/30">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts"
            className="pl-9 bg-secondary border-0 rounded-full h-9"
          />
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No contacts found</p>
          ) : (
            filtered.map(contact => {
              const isSelected = selected.find(c => c.id === contact.id);
              return (
                <button
                  key={contact.id}
                  onClick={() => toggleSelect(contact)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: TG_BLUE }}>
                      {(contact.full_name || contact.email || "U").charAt(0)}
                    </div>
                    {isSelected && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white border-2 border-white" style={{ backgroundColor: TG_BLUE }}>
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/30">
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || selected.length === 0 || creating}
            className="w-full rounded-full text-white font-medium h-10 disabled:opacity-40"
            style={{ backgroundColor: TG_BLUE }}
          >
            {creating ? "Creating..." : `Create Group${selected.length > 0 ? ` (${selected.length})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

