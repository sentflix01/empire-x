'use client';
/**
 * ProfileViewContext — two independent mode toggles:
 *
 *  homeFeedMode     ('personal' | 'business')
 *    Controls the Home/Feed page: personal posts vs business showrooms.
 *    Persisted to sessionStorage under STORAGE_KEY_HOME.
 *
 *  profileViewMode  ('personal' | 'business')
 *    Controls the Profile page: personal profile vs business profile.
 *    Persisted to sessionStorage under STORAGE_KEY_PROFILE.
 *
 * The two states are completely independent — changing one never touches the other.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IDENTITY } from '@/lib/colorTokens';

const STORAGE_KEY_HOME    = 'nodbusiness_home_feed_mode';
const STORAGE_KEY_PROFILE = 'nodbusiness_profile_view_mode';

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
  /** Tailwind background class, e.g. "bg-primary-subtle" */
  bgClass: string;
  /** Tailwind text class, e.g. "text-primary" */
  textClass: string;
  /** Tailwind dark-mode background class, e.g. "" */
  darkBgClass: string;
  /** Tailwind dark-mode text class, e.g. "" */
  darkTextClass: string;
  /** Full composed Tailwind string for an active NavLink */
  activeNavClass: string;
  /** Full composed Tailwind string for an active tab button */
  activeTabClass: string;
}

export interface ProfileViewContextValue {
  /** Feed page mode — personal posts vs business showrooms */
  homeFeedMode: ActiveView;
  setHomeFeedMode: (view: ActiveView) => void;

  /** Profile page mode — personal profile vs business profile */
  profileViewMode: ActiveView;
  setProfileViewMode: (view: ActiveView) => void;

  /** Colour tokens derived from homeFeedMode — for Home.tsx */
  homeFeedTokens: AccentTokens;
  /** Colour tokens derived from profileViewMode — for Profile.tsx */
  profileViewTokens: AccentTokens;

  // ── Legacy aliases ── kept so existing call-sites don't break at once ──
  /** @deprecated Use homeFeedMode or profileViewMode instead */
  activeView: ActiveView;
  /** @deprecated Use setHomeFeedMode or setProfileViewMode instead */
  setActiveView: (view: ActiveView) => void;
  /** @deprecated Use homeFeedTokens or profileViewTokens instead */
  accentTokens: AccentTokens;
  isPersonal: boolean;
  isBusiness: boolean;
}

// ── Pure utility ───────────────────────────────────────────────────────────────

/**
 * Returns the full accent colour token set for the given view.
 * Pure function — same input always yields the same token object.
 */
export function getAccentTokens(view: ActiveView): AccentTokens {
  if (view === 'personal') {
    return {
      // Personal identity: primary blue (colour system, F-046). Solid, not a gradient.
      primary: IDENTITY.personal.hex,
      gradientStart: IDENTITY.personal.hex,
      gradientEnd: IDENTITY.personal.hex,
      gradientCss: IDENTITY.personal.css,
      bgClass: 'bg-primary-subtle',
      textClass: 'text-primary',
      darkBgClass: '',
      darkTextClass: '',
      activeNavClass: 'bg-primary-subtle text-primary',
      activeTabClass: 'bg-primary text-white',
    };
  }

  // 'business'
  return {
    // Business identity: the secondary brand colour, violet (F-046).
    primary: IDENTITY.business.hex,
    gradientStart: IDENTITY.business.hex,
    gradientEnd: IDENTITY.business.hex,
    gradientCss: IDENTITY.business.css,
    bgClass: 'bg-brand-secondary-subtle',
    textClass: 'text-brand-secondary',
    darkBgClass: '',
    darkTextClass: '',
    activeNavClass: 'bg-brand-secondary-subtle text-brand-secondary',
    activeTabClass: 'bg-brand-secondary text-white',
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function readStorage(key: string): ActiveView {
  try {
    const val = sessionStorage.getItem(key);
    if (val === 'personal' || val === 'business') return val;
  } catch { /* sessionStorage unavailable */ }
  return 'personal';
}

function writeStorage(key: string, val: ActiveView) {
  try { sessionStorage.setItem(key, val); } catch { /* ignore */ }
}

// ── Context ────────────────────────────────────────────────────────────────────

const defaultTokens = getAccentTokens('personal');

const ProfileViewContext = createContext<ProfileViewContextValue>({
  homeFeedMode: 'personal',
  setHomeFeedMode: () => {},
  profileViewMode: 'personal',
  setProfileViewMode: () => {},
  homeFeedTokens: defaultTokens,
  profileViewTokens: defaultTokens,
  // legacy
  activeView: 'personal',
  setActiveView: () => {},
  accentTokens: defaultTokens,
  isPersonal: true,
  isBusiness: false,
});

// ── Provider ───────────────────────────────────────────────────────────────────

export function ProfileViewProvider({ children }: { children: ReactNode }) {
  const [homeFeedMode,    setHomeFeedModeState]    = useState<ActiveView>('personal');
  const [profileViewMode, setProfileViewModeState] = useState<ActiveView>('personal');

  // Restore from sessionStorage on mount
  useEffect(() => {
    setHomeFeedModeState(readStorage(STORAGE_KEY_HOME));
    setProfileViewModeState(readStorage(STORAGE_KEY_PROFILE));
  }, []);

  const setHomeFeedMode = (view: ActiveView) => {
    setHomeFeedModeState(view);
    writeStorage(STORAGE_KEY_HOME, view);
  };

  const setProfileViewMode = (view: ActiveView) => {
    setProfileViewModeState(view);
    writeStorage(STORAGE_KEY_PROFILE, view);
  };

  const homeFeedTokens    = getAccentTokens(homeFeedMode);
  const profileViewTokens = getAccentTokens(profileViewMode);

  return (
    <ProfileViewContext.Provider
      value={{
        homeFeedMode,
        setHomeFeedMode,
        profileViewMode,
        setProfileViewMode,
        homeFeedTokens,
        profileViewTokens,
        // legacy aliases — point at homeFeedMode so existing callers are not broken
        activeView: homeFeedMode,
        setActiveView: setHomeFeedMode,
        accentTokens: homeFeedTokens,
        isPersonal: homeFeedMode === 'personal',
        isBusiness: homeFeedMode === 'business',
      }}
    >
      {children}
    </ProfileViewContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/** Convenience hook — use this in all consuming components. */
export const useProfileView = () => useContext(ProfileViewContext);
