'use client'
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Store, Sun, Moon } from "lucide-react";
import { useTranslation } from 'react-i18next';

/**
 * Unified control bar — Personal | Business | Theme (Dark/Light)
 *
 * Props:
 *   view          "personal" | "business"
 *   onFlip        () => void
 *   flipping      boolean
 *   theme?        string — from useTheme()
 *   onTheme?      (t: string) => void — from useTheme()
 *   showBusiness? boolean (default true)
 */
export default function ProfileToggle({
  view,
  onFlip,
  flipping,
  theme,
  onTheme,
  showBusiness = true,
}) {
  const [mounted, setMounted] = useState(false);
  const isPersonal = view === "personal";
  const isDark = theme === "dark";
  const hasThemePill = mounted && typeof onTheme === "function" && typeof theme === "string";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="inline-flex items-center bg-secondary/60 rounded-full p-1 shadow-inner ring-1 ring-border/40 gap-0.5">

      {/* ── Personal pill ─────────────────────────────────── */}
      {showBusiness && (
        <button
          onClick={() => !isPersonal && onFlip()}
          aria-pressed={isPersonal}
          className="relative px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
          style={{ minWidth: 90, justifyContent: "center" }}
        >
          {/* Sliding background */}
          {isPersonal && (
            <motion.span
              layoutId="profile-pill"
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(135deg,#3B82F6,#2563EB)",
                boxShadow: "0 2px 12px rgba(59,130,246,0.4)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <User
            className={`relative z-10 w-3.5 h-3.5 transition-transform ${flipping ? "scale-90" : "scale-100"}`}
          />
          <span className={`relative z-10 ${isPersonal ? "text-white" : "text-muted-foreground"}`}>
            Personal
          </span>
        </button>
      )}

      {/* ── Business pill ─────────────────────────────────── */}
      {showBusiness && (
        <button
          onClick={() => isPersonal && onFlip()}
          aria-pressed={!isPersonal}
          className="relative px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          style={{ minWidth: 90, justifyContent: "center" }}
        >
          {!isPersonal && (
            <motion.span
              layoutId="profile-pill"
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(135deg,#F59E0B,#D97706)",
                boxShadow: "0 2px 12px rgba(245,158,11,0.4)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <Store
            className={`relative z-10 w-3.5 h-3.5 transition-transform ${flipping ? "scale-90" : "scale-100"}`}
          />
          <span className={`relative z-10 ${!isPersonal ? "text-white" : "text-muted-foreground"}`}>
            Business
          </span>
        </button>
      )}

      {/* ── Theme pill ────────────────────────────────────── */}
      {hasThemePill && (
        <>
          {/* Divider only when profile pills are present */}
          {showBusiness && (
            <span className="w-px h-5 bg-border/60 mx-0.5 shrink-0" aria-hidden />
          )}
          <button
            onClick={() => onTheme(isDark ? "light" : "dark")}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="relative px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            style={{ minWidth: 68, justifyContent: "center" }}
          >
            {isDark
              ? <Sun className="w-3.5 h-3.5 text-amber-400" />
              : <Moon className="w-3.5 h-3.5" />
            }
            <span>{isDark ? "Light" : "Dark"}</span>
          </button>
        </>
      )}
    </div>
  );
}
