'use client'
import React from "react";
import Image from "next/image";

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
        {/* Header: Logo or Icon */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-8">
            {Icon
              ? <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10"><Icon className="w-7 h-7 text-primary" /></div>
              : <Image src="/brand/nodbusiness-logo.svg" alt="Nodbusiness" width={200} height={30} className="h-7 w-auto" priority />
            }
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

