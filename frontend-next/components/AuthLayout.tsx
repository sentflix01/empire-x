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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-6">
            {Icon
              ? <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 shadow-sm"><Icon className="w-8 h-8 text-primary" /></div>
              : <Image src="/brand/nodbusiness-logo.svg" alt="Nodbusiness" width={200} height={30} className="h-8 w-auto" priority />
            }
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}

