'use client';
/**
 * ProfileViewContext — global toggle between "personal" and "business" profile view.
 *
 * When activeView = "personal":
 *   - All accent colors render in Blue throughout the UI
 *   - NavLink highlights, tab indicators, cover gradients all use blue tokens
 *
 * When activeView = "business":
 *   - All accent colors shift to Gold/Amber throughout the UI
 *   - NavLink highlights, tab indicators, cover gradients all use amber tokens
 *
 * The selection is persisted to sessionStorage so it survives in-tab navigation.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const STORAGE_KEY = 'nodbusiness_profile_view';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ActiveView = 'personal' | 'business';

export interface AccentTokens {
  /** CSS hex — used in style={{ color }} or style={{ backgroundColor }} */
  primary: string;
  /** CSS hex — gradient start stop */
  gradientStart: string;
  /** CSS hex — gradient end stop */
  gradientEnd: string;
  /** Full CSS linear-gradient() value for use in style={{ background }} */
  gradientCss: string;
  /** Tailwind background class, e.g. "bg-blue-50" */
  bgClass: string;
  /** Tailwind text class, e.g. "text-blue-700" */
  textClass: string;
  /** Tailwind dark-mode background class, e.g. "dark:bg-blue-900/20" */
  darkBgClass: string;
  /** Tailwind dark-mode text class, e.g. "dark:text-blue-300" */
  darkTextClass: string;
  /** Full composed Tailwind string for an active NavLink */
  activeNavClass: string;
  /** Full composed Tailwind string for an active tab button */
  activeTabClass: string;
}

export interface ProfileViewContextValue {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  accentTokens: AccentTokens;
  isPersonal: boolean;
  isBusiness: boolean;
}

// ── Pure utility ───────────────────────────────────────────────────────────────

/**
 * Returns the full accent color token set for the given profile view.
 * This is a pure function — same input always yields the same token object.
 *
 * Satisfies Requirements 7.1, 7.2, 7.3, 7.4
 */
export function getAccentTokens(view: ActiveView): AccentTokens {
  if (view === 'personal') {
    return {
      primary: '#2563EB',
      gradientStart: '#3B82F6',
      gradientEnd: '#2563EB',
      gradientCss: 'linear-gradient(135deg, #3B82F6, #2563EB)',
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      darkBgClass: 'dark:bg-blue-900/20',
      darkTextClass: 'dark:text-blue-300',
      activeNavClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
      activeTabClass: 'bg-blue-500 text-white',
    };
  }

  // "business"
  return {
    primary: '#D97706',
    gradientStart: '#F59E0B',
    gradientEnd: '#D97706',
    gradientCss: 'linear-gradient(135deg, #F59E0B, #D97706)',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    darkBgClass: 'dark:bg-amber-900/20',
    darkTextClass: 'dark:text-amber-700',
    activeNavClass: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-700',
    activeTabClass: 'bg-amber-500 text-white',
  };
}

// ── Context ────────────────────────────────────────────────────────────────────

/**
 * Default context value uses "personal" tokens so any component that consumes
 * this context without a mounted provider will never throw — it just renders
 * in blue mode. (Requirement 1.7)
 */
const defaultTokens = getAccentTokens('personal');

const ProfileViewContext = createContext<ProfileViewContextValue>({
  activeView: 'personal',
  setActiveView: () => {},
  accentTokens: defaultTokens,
  isPersonal: true,
  isBusiness: false,
});

// ── Provider ───────────────────────────────────────────────────────────────────

export function ProfileViewProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveViewState] = useState<ActiveView>('personal');

  // Initialise from sessionStorage on mount (Requirement 1.6)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved === 'personal' || saved === 'business') {
        setActiveViewState(saved);
      }
    } catch {
      // sessionStorage may be unavailable in some environments — silently ignore
    }
  }, []);

  // Persist to sessionStorage on every setActiveView call (Requirement 1.6)
  const setActiveView = (view: ActiveView) => {
    setActiveViewState(view);
    try {
      sessionStorage.setItem(STORAGE_KEY, view);
    } catch {
      // silently ignore if sessionStorage is unavailable
    }
  };

  const accentTokens = getAccentTokens(activeView);
  const isPersonal = activeView === 'personal';
  const isBusiness = activeView === 'business';

  return (
    <ProfileViewContext.Provider
      value={{ activeView, setActiveView, accentTokens, isPersonal, isBusiness }}
    >
      {children}
    </ProfileViewContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/** Convenience hook — use this in all consuming components. */
export const useProfileView = () => useContext(ProfileViewContext);
