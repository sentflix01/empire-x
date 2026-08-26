'use client'
import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, User, Store } from "lucide-react";

export default function PostCardMenu({ currentView, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (view) => {
    onSelect(view);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-full hover:bg-secondary transition-colors relative"
        title="Switch profile view"
      >
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${currentView === "personal" ? "bg-blue-400" : "bg-amber-500"}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-card rounded-xl shadow-lg border border-border/50 z-50 w-44 overflow-hidden">
          <button
            onClick={() => handleSelect("personal")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
              currentView === "personal" ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-secondary text-foreground"
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-left">
              <p>Personal Profile</p>
              {currentView === "personal" && <span className="text-[10px] text-blue-400">Active</span>}
            </div>
          </button>
          <div className="border-t border-border/30" />
          <button
            onClick={() => handleSelect("business")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
              currentView === "business" ? "bg-amber-50 text-amber-700 font-medium" : "hover:bg-secondary text-foreground"
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Store className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-left">
              <p>Business Profile</p>
              {currentView === "business" && <span className="text-[10px] text-amber-500">Active</span>}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
