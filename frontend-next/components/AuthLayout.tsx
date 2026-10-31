'use client'
import React from "react";

interface AuthLayoutProps {
  title: string
  subtitle?: string
  footer?: React.ReactNode
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}

export default function AuthLayout({ title, subtitle, footer, children, icon: Icon }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
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
                {/* Brand video circle — SVG background renders instantly,
                    video covers it once first frame is decoded. */}
                <div
                  className="relative w-16 h-16 rounded-full overflow-hidden"
                  style={{
                    backgroundColor: '#0a0a0a',
                    backgroundImage: 'url(/brand/nodbusiness-icon.svg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.15)',
                  }}
                >
                  <video
                    src="/brand/nodbusiness-intro.mp4"
                    autoPlay
                    muted
                    playsInline
                    loop
                    className="absolute inset-0 w-full h-full object-cover block"
                    aria-hidden="true"
                  />
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

