'use client'
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Menu, Pencil, Users, Radio } from "lucide-react";
import CreateGroupModal from "@/components/messaging/CreateGroupModal";
import CreateChannelModal from "@/components/messaging/CreateChannelModal";

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
          <div className="absolute top-full right-0 mt-2 bg-card dark:bg-card rounded-2xl shadow-xl border border-border/50 z-[200] w-52 overflow-hidden">
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

