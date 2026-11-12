// @ts-check
import React from 'react';
import { token } from '@/lib/colorTokens';

export type VerificationType = 'personal' | 'business' | 'creator' | 'official' | null | undefined;

interface VerifiedBadgeProps {
  type?: VerificationType;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const BADGE_CONFIG = {
  personal:  { color: token.primary, label: 'Verified Person',        title: '✓' },
  business:  { color: token.brandSecondary, label: 'Verified Business',      title: '✓' },
  creator:   { color: token.primary, label: 'Verified Creator',       title: '✓' },
  official:  { color: token.primary, label: 'Nodbusiness Official',      title: '✓' },
};

const SIZE = {
  sm: 12,
  md: 14,
  lg: 18,
};

export default function VerifiedBadge({ type, size = 'sm', showTooltip = true }: VerifiedBadgeProps) {
  if (!type) return null;
  const cfg = BADGE_CONFIG[type] ?? BADGE_CONFIG.personal;
  const px = SIZE[size];

  return (
    <span
      title={showTooltip ? cfg.label : undefined}
      aria-label={cfg.label}
      style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        {/* Shield / badge background */}
        {/* fill as a style so the colour token (a CSS variable) resolves */}
        <circle cx="10" cy="10" r="10" style={{ fill: cfg.color }} />
        {/* White checkmark */}
        <path
          d="M6 10.5L8.5 13L14 7.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Inline helper — renders name + badge together */
export function VerifiedName({
  name,
  verificationType,
  badgeSize = 'sm',
  className = '',
}: {
  name?: string;
  verificationType?: VerificationType;
  badgeSize?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{name}</span>
      {verificationType && <VerifiedBadge type={verificationType} size={badgeSize} />}
    </span>
  );
}
