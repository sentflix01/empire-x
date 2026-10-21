'use client';
import React from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { cn } from '@/lib/utils';

// ── Name → gradient palette ────────────────────────────────────────────────
const GRADIENTS = [
  'from-primary to-accent',        // blue → purple
  'from-accent to-primary',        // purple → blue
  'from-amber-500 to-orange-500',  // gold → orange
  'from-green-500 to-teal-500',    // green → teal
  'from-rose-500 to-pink-500',     // rose → pink
] as const;

export function nameToGradient(name: string): string {
  const hash = name.split('').reduce((h, c) => h + c.charCodeAt(0), 0) % GRADIENTS.length;
  return GRADIENTS[hash];
}

// ── Props interface ────────────────────────────────────────────────────────
export interface UserIdentityProps {
  /** Optional user id — not rendered, available for keys / analytics. */
  userId?: string;
  displayName: string;
  avatarUrl?: string | null;
  businessName?: string | null;
  businessSlug?: string | null;
  isVerified?: boolean;
  isDemo?: boolean;
  /** xs: 32px  sm: 36px  md: 44px  lg: 56px */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show business name as a /showroom/{businessSlug} link */
  showBusinessLink?: boolean;
  /** Secondary line below business name */
  subtitle?: string | null;
  className?: string;
  avatarClassName?: string;
  onClick?: () => void;
  /** 'white' variant: all text becomes white for use on coloured backgrounds */
  variant?: 'default' | 'white';
  /** Show a green online indicator dot on the avatar */
  onlineIndicator?: boolean;
}

// ── Size → Tailwind class mappings ────────────────────────────────────────
const SIZE_MAP = {
  xs: {
    avatar: 'w-8 h-8',
    imgW: 32,
    imgH: 32,
    gap: 'gap-2',
    name: 'text-xs font-semibold',
    business: 'text-[10px]',
    onlineDot: 'w-2 h-2 border',
    onlineOffset: 'bottom-0 left-[18px]',
  },
  sm: {
    avatar: 'w-9 h-9',
    imgW: 36,
    imgH: 36,
    gap: 'gap-2.5',
    name: 'text-sm font-semibold',
    business: 'text-xs',
    onlineDot: 'w-2.5 h-2.5 border-2',
    onlineOffset: 'bottom-0 left-[22px]',
  },
  md: {
    avatar: 'w-11 h-11',
    imgW: 44,
    imgH: 44,
    gap: 'gap-3',
    name: 'text-base font-semibold',
    business: 'text-sm',
    onlineDot: 'w-3 h-3 border-2',
    onlineOffset: 'bottom-0 left-[26px]',
  },
  lg: {
    avatar: 'w-14 h-14',
    imgW: 56,
    imgH: 56,
    gap: 'gap-3',
    name: 'text-lg font-bold',
    business: 'text-sm',
    onlineDot: 'w-3 h-3 border-2',
    onlineOffset: 'bottom-0 left-[32px]',
  },
} as const;

// ── Component ──────────────────────────────────────────────────────────────
export function UserIdentity({
  displayName,
  avatarUrl,
  businessName,
  businessSlug,
  isVerified = false,
  isDemo = false,
  size = 'sm',
  showBusinessLink = false,
  subtitle,
  className,
  avatarClassName,
  onClick,
  variant = 'default',
  onlineIndicator = false,
}: UserIdentityProps) {
  const s = SIZE_MAP[size];
  const isWhite = variant === 'white';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';
  const gradient = nameToGradient(displayName);

  const nameClass = cn(
    s.name,
    'truncate leading-tight',
    isWhite ? 'text-white' : 'text-foreground',
  );
  const businessClass = cn(
    s.business,
    'truncate',
    isWhite ? 'text-white/70' : 'text-muted-foreground',
  );
  const subtitleClass = cn(
    'text-xs truncate',
    isWhite ? 'text-white/60' : 'text-muted-foreground',
  );
  const businessLinkClass = cn(
    s.business,
    'truncate hover:underline underline-offset-2 transition-colors',
    isWhite
      ? 'text-white/70 hover:text-white/90'
      : 'text-muted-foreground hover:text-primary',
  );

  const avatarFallback = (
    <div
      className={cn(
        'w-full h-full flex items-center justify-center text-white font-semibold select-none',
        `bg-gradient-to-br ${gradient}`,
      )}
      aria-hidden="true"
    >
      {initial}
    </div>
  );

  const businessRow = businessName ? (
    showBusinessLink && businessSlug ? (
      <Link
        href={`/showroom/${businessSlug}`}
        aria-label={`Visit ${businessName} showroom`}
        className={cn('inline-flex items-center gap-1 max-w-full', businessLinkClass)}
        onClick={(e) => e.stopPropagation()}
      >
        <Store className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{businessName}</span>
      </Link>
    ) : (
      <span className={cn('inline-flex items-center gap-1 max-w-full', businessClass)}>
        <Store className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{businessName}</span>
      </span>
    )
  ) : null;

  const content = (
    <>
      {/* Avatar */}
      <div className={cn('relative shrink-0', s.avatar, avatarClassName)}>
        <div className={cn('rounded-full overflow-hidden', s.avatar)}>
          <SafeImage
            src={avatarUrl}
            alt={displayName}
            fill={false}
            width={s.imgW}
            height={s.imgH}
            className="w-full h-full object-cover"
            fallback={avatarFallback}
          />
        </div>
        {onlineIndicator && (
          <span
            className={cn(
              'absolute bg-green-400 border-primary rounded-full',
              s.onlineDot,
              s.onlineOffset,
            )}
            aria-label="Online"
          />
        )}
      </div>

      {/* Text column */}
      <div className="flex flex-col min-w-0 flex-1">
        {/* Name row */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className={nameClass}>{displayName}</span>
          {isVerified && <VerifiedBadge type="personal" size="sm" />}
          {isDemo && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium shrink-0">
              Demo
            </span>
          )}
        </div>

        {/* Business row */}
        {businessRow && (
          <div className="flex items-center gap-1 mt-0.5 max-w-full">
            {businessRow}
          </div>
        )}

        {/* Subtitle row */}
        {subtitle && (
          <span className={cn(subtitleClass, 'mt-0.5')}>{subtitle}</span>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cn('flex items-center text-left', s.gap, className)}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      {content}
    </div>
  );
}

export default UserIdentity;
