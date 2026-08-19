'use client';
import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPushPermission, subscribeToPush } from "@/lib/push";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const DISMISSED_KEY = "nodbusiness_push_banner_dismissed";

export default function PushPermissionBanner() {
  const { t } = useTranslation();
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

  if (!visible) return null;

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
      <div className="rounded-2xl border border-blue-200/70 bg-white p-4 shadow-2xl shadow-slate-950/15 dark:border-blue-500/25 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-950 dark:text-white">{t('push.title')}</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed dark:text-slate-300">{t('push.subtitle')}</p>
          </div>
          <button onClick={dismiss} className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" aria-label="Dismiss notifications prompt">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="sm" onClick={handleEnable} disabled={loading}
            className="h-9 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-xs font-bold text-white shadow-sm shadow-blue-600/20 hover:from-blue-700 hover:to-purple-700">
            {loading ? t('push.enabling') : t('push.enable')}
          </Button>
          <Button size="sm" variant="outline" onClick={dismiss}
            className="h-9 rounded-xl border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
            {t('push.notNow')}
          </Button>
        </div>
      </div>
    </div>
  );
}
