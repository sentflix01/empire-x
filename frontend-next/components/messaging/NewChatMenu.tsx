'use client'
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, Users, Radio, ShieldCheck } from "lucide-react";
import CreateGroupDialog from "@/components/messaging/CreateGroupDialog";

export default function NewChatMenu({ onCreated }: { user?: unknown; contacts?: unknown; onCreated?: () => void }) {
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
          type="button"
          aria-label="New group or channel"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          className="size-11 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-primary"
        >
          <Menu className="w-5 h-5" />
        </button>

        {open && (
          <div className="absolute top-full end-0 mt-2 bg-card dark:bg-card rounded-2xl shadow-xl border border-border/50 z-[200] w-60 overflow-hidden">
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
            {/* Last seen, read receipts and who can message you live in one place. */}
            <Link href="/privacy" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary transition-colors text-sm font-medium w-full text-left text-foreground">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              Message privacy
            </Link>
          </div>
        )}
      </div>

      {groupOpen && <CreateGroupDialog type="group" onClose={() => setGroupOpen(false)} onCreated={onCreated} />}
      {channelOpen && <CreateGroupDialog type="channel" onClose={() => setChannelOpen(false)} onCreated={onCreated} />}
    </>
  );
}

