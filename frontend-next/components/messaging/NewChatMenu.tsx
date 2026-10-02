'use client'
import React, { useState, useRef, useEffect } from "react";
import { Menu, Users, Radio } from "lucide-react";
import CreateGroupModal from "@/components/messaging/CreateGroupModal";
import CreateChannelModal from "@/components/messaging/CreateChannelModal";
import client from "@/api/client";
import { toast } from "sonner";

function LastSeenSetting() {
  const [visibility, setVisibility] = useState<'everyone' | 'nobody'>('everyone');
  const [loading, setLoading] = useState(false);

  const update = async (val: 'everyone' | 'nobody') => {
    const prev = visibility;
    setVisibility(val);
    setLoading(true);
    try {
      await client.put('/api/messages/presence/settings', { visibility: val });
      toast.success(val === 'everyone' ? 'Online status visible to everyone' : 'Online status hidden');
    } catch {
      setVisibility(prev);
      toast.error('Could not update setting');
    }
    setLoading(false);
  };

  return (
    <div className="px-4 py-3 border-t border-border/30">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Last Seen &amp; Online</p>
      <div className="flex gap-2">
        {(['everyone', 'nobody'] as const).map(opt => (
          <button
            key={opt}
            disabled={loading}
            onClick={() => update(opt)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              visibility === opt
                ? 'bg-primary text-white'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">Who can see when you were last active</p>
    </div>
  );
}

export default function NewChatMenu({ user, contacts, onCreated }) {
  const [open, setOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-primary"
        >
          <Menu className="w-5 h-5" />
        </button>

        {open && (
          <div className="absolute top-full right-0 mt-2 bg-card dark:bg-card rounded-2xl shadow-xl border border-border/50 z-[200] w-60 overflow-hidden">
            <button
              onClick={() => { setOpen(false); setGroupOpen(true); }}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary transition-colors text-sm font-medium w-full text-left text-foreground"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              New Group
            </button>
            <div className="h-px bg-border/30" />
            <button
              onClick={() => { setOpen(false); setChannelOpen(true); }}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary transition-colors text-sm font-medium w-full text-left text-foreground"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Radio className="w-4 h-4 text-purple-500" />
              </div>
              New Channel
            </button>
            <div className="h-px bg-border/30" />
            {/* Last Seen & Online setting — moved from Account Settings */}
            <LastSeenSetting />
          </div>
        )}
      </div>

      <CreateGroupModal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        user={user}
        contacts={contacts}
        onCreated={onCreated}
      />
      <CreateChannelModal
        open={channelOpen}
        onClose={() => setChannelOpen(false)}
        user={user}
        onCreated={onCreated}
      />
    </>
  );
}

