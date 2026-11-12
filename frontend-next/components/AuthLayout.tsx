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
}

export default function AuthLayout({ title, subtitle, footer, children, icon: Icon }: AuthLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header: brand video circle or custom icon */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center gap-2 mb-5">
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
                  className="relative w-16 h-16 rounded-full overflow-hidden"
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
                <span className="text-base font-black tracking-tight text-foreground">
                  Nodbusiness
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">{title}</h1>

          {/* Subtitle */}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border/40 p-8 mb-6">
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

