// @ts-nocheck
import Link from 'next/link';
import React, { useState, useRef, useEffect } from "react";

import { ChevronDown, Plus, Store, Check } from "lucide-react";

export default function BusinessSwitcher({ businesses, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = businesses.find(b => b.id === selectedId);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (businesses.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 bg-card rounded-2xl border border-border/50 px-4 py-3 w-full hover:shadow-sm transition-shadow"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ backgroundColor: selected?.business_theme_color || "#2563EB" }}>
          {selected?.business_name?.charAt(0) || "B"}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold truncate">{selected?.business_name || "All Businesses"}</p>
          <p className="text-xs text-muted-foreground">{selected?.business_category || "Overview"}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-2xl border border-border/50 shadow-lg z-30 overflow-hidden">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`w-full text-left px-4 py-3 hover:bg-secondary/50 flex items-center gap-3 ${!selectedId ? "bg-amber-50" : ""}`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium flex-1">All Businesses</span>
            {!selectedId && <Check className="w-4 h-4 text-amber-600" />}
          </button>
          {businesses.map(b => (
            <button
              key={b.id}
              onClick={() => { onSelect(b.id); setOpen(false); }}
              className={`w-full text-left px-4 py-3 hover:bg-secondary/50 flex items-center gap-3 border-t border-border/30 ${b.id === selectedId ? "bg-amber-50" : ""}`}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: b.business_theme_color || "#2563EB" }}>
                {b.business_name?.charAt(0) || "B"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{b.business_name}</p>
                <p className="text-xs text-muted-foreground">{b.business_category}</p>
              </div>
              {b.id === selectedId && <Check className="w-4 h-4 text-amber-600" />}
            </button>
          ))}
          <Link href="/business/create" className="flex items-center gap-3 px-4 py-3 text-amber-600 hover:bg-amber-50 border-t border-border/30">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Add New Business</span>
          </Link>
        </div>
      )}
    </div>
  );
}

