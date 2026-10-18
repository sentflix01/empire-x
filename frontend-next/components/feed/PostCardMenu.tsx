'use client'
import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, User, Store, Pencil, Trash2 } from "lucide-react";

interface PostCardMenuProps {
  currentView: string;
  onSelect: (view: string) => void;
  /** Shown to the post's author. */
  onEdit?: () => void;
  /** Shown to the post's author and to admins. */
  onDelete?: () => void;
}

/**
 * The "..." menu on a feed post: Edit / Delete for the author (Delete also for
 * admins), then the personal / business view switch for everyone.
 */
export default function PostCardMenu({ currentView, onSelect, onEdit, onDelete }: PostCardMenuProps) {
  const [open, setOpen] = useState(false);
  // The card clips overflow, so the menu is positioned against the viewport.
  const [position, setPosition] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = (onEdit ? 44 : 0) + (onDelete ? 44 : 0) + 120;
      const fitsBelow = rect.bottom + 4 + menuHeight <= window.innerHeight;
      setPosition({
        position: "fixed",
        right: Math.max(8, window.innerWidth - rect.right),
        ...(fitsBelow ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }),
      });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  const run = (action: () => void) => { setOpen(false); action(); };
  const hasOwnerActions = Boolean(onEdit || onDelete);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        onClick={toggle}
        className="p-1.5 rounded-full hover:bg-secondary transition-colors relative"
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${currentView === "personal" ? "bg-blue-400" : "bg-amber-500"}`} />
      </button>

      {open && (
        <div role="menu" aria-label="Post options" style={position} className="bg-card rounded-xl shadow-lg border border-border/50 z-50 w-48 overflow-hidden">
          {onEdit && (
            <button role="menuitem" onClick={() => run(onEdit)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
              <Pencil className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              Edit post
            </button>
          )}
          {onDelete && (
            <button role="menuitem" onClick={() => run(onDelete)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Delete post
            </button>
          )}
          {hasOwnerActions && <div className="border-t border-border/50" role="separator" />}
          <button
            role="menuitemradio"
            aria-checked={currentView === "personal"}
            onClick={() => run(() => onSelect("personal"))}
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
            role="menuitemradio"
            aria-checked={currentView === "business"}
            onClick={() => run(() => onSelect("business"))}
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
