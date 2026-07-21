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
          <div className="absolute top-full right-0 mt-1 bg-card rounded-2xl shadow-lg border border-border/30 z-50 w-52 overflow-hidden">
            <button
              onClick={() => { setOpen(false); setGroupOpen(true); }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-sm w-full text-left"
            >
              <Users className="w-4 h-4 text-primary" />
              New Group
            </button>
            <button
              onClick={() => { setOpen(false); setChannelOpen(true); }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-sm border-t border-border/20 w-full text-left"
            >
              <Radio className="w-4 h-4 text-primary" />
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

