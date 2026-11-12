'use client';
import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPushPermission, subscribeToPush } from "@/lib/push";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";

const DISMISSED_KEY = "nodbusiness_push_banner_dismissed";

export default function PushPermissionBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show only if: push supported, not yet granted/denied, not dismissed
    const perm = getPushPermission();
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (perm === "default" && !dismissed) {
      // Small delay so it doesn't pop instantly on page load
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  // Push subscriptions belong to a visitor's browser, not the isolated Demo
  // session. Keep the permission prompt out of Demo practice.
  if (!visible || user?.demo_session_active) return null;

  const handleEnable = async () => {
    setLoading(true);
    const ok = await subscribeToPush();
    setLoading(false);
    if (ok) {
      toast.success(t('push.enabled'));
      setVisible(false);
    } else {
      toast.error(t('push.failed'));
      dismiss();
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-[22rem] z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-primary/30 bg-white p-4 shadow-2xl shadow-foreground/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-subtle flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground dark:text-white">{t('push.title')}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t('push.subtitle')}</p>
          </div>
          <button onClick={dismiss} className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" aria-label="Dismiss notifications prompt">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="sm" onClick={handleEnable} disabled={loading}
            className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-white shadow-sm shadow-primary/20">
            {loading ? t('push.enabling') : t('push.enable')}
          </Button>
          <Button size="sm" variant="outline" onClick={dismiss}
            className="h-9 rounded-xl border-border bg-white text-xs font-semibold text-foreground hover:bg-secondary">
            {t('push.notNow')}
          </Button>
        </div>
      </div>
    </div>
  );
}
