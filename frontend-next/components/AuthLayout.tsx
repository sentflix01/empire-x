'use client'
import { HEX } from '@/lib/colorTokens';
import React from "react";
import { BRAND } from '@/lib/brandAssets';
import BrandIntroVideo from '@/components/brand/BrandIntroVideo';

interface AuthLayoutProps {
  title: string
  subtitle?: string
  footer?: React.ReactNode
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  /** Phones: a smaller header so the form and its button fit on the first screen (new-user audit NU-11). */
  compact?: boolean
}

// data-auth-page: the floating page-guide and assistant buttons step aside on
// these pages (they covered the email and password fields on phones, NU-3).
export default function AuthLayout({ title, subtitle, footer, children, icon: Icon, compact = false }: AuthLayoutProps) {
  return (
    <div data-auth-page="" className={`min-h-[100dvh] flex justify-center bg-background px-4 ${compact ? 'items-start py-4 sm:items-center sm:py-8' : 'items-center py-8'}`}>
      <div className="w-full max-w-md">
        {/* Header: brand video circle or custom icon */}
        <div className={`text-center ${compact ? 'mb-4 sm:mb-6' : 'mb-6'}`}>
          <div className={`flex flex-col items-center gap-2 ${compact ? 'mb-3 sm:mb-5' : 'mb-5'}`}>
            {Icon ? (
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                <Icon className="w-7 h-7 text-primary" />
              </div>
            ) : (
              <>
                {/* Brand logo circle: the small intro video (62 KB) plays once, then
                    fades to the sharp vector logo behind it. Reduced motion or data
                    saving shows the vector logo only (F-045). */}
                <div
                  className={`relative rounded-full overflow-hidden ${compact ? 'w-11 h-11 sm:w-16 sm:h-16' : 'w-16 h-16'}`}
                  style={{
                    backgroundColor: HEX.primary,
                    backgroundImage: `url(${BRAND.icon})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 0 0 3px rgba(255,255,255,0.9), 0 0 0 4px rgba(37,99,235,0.18), 0 6px 28px rgba(37,99,235,0.35)',
                  }}
                  aria-hidden="true"
                >
                  <BrandIntroVideo />
                </div>
                <span className={`text-base font-black tracking-tight text-foreground ${compact ? 'max-sm:sr-only' : ''}`}>
                  Nodbusiness
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className={`font-semibold tracking-tight text-foreground ${compact ? 'text-xl mb-1 sm:text-2xl sm:mb-2' : 'text-2xl mb-2'}`}>{title}</h1>

          {/* Subtitle */}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {/* Form Card */}
        <div className={`bg-card rounded-xl shadow-sm border border-border/40 mb-6 ${compact ? 'p-5 sm:p-8' : 'p-6 sm:p-8'}`}>
          {children}
        </div>

        {/* Footer Link */}
        {footer && (
          <p className="text-center text-sm text-muted-foreground">{footer}</p>
        )}
      </div>
    </div>
  );
}

