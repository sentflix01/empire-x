// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPushPermission, subscribeToPush, isPushGranted } from "@/lib/push";
import { toast } from "sonner";

const DISMISSED_KEY = "empire_push_banner_dismissed";

export default function PushPermissionBanner() {
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
      toast.success("Push notifications enabled 🔔");
      setVisible(false);
    } else {
      toast.error("Couldn't enable notifications. Check your browser settings.");
      dismiss();
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border/50 rounded-2xl shadow-lg p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Enable notifications</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get notified about likes, messages, orders and more — even when the app is closed.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={loading}
              className="flex-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 h-8 text-xs"
            >
              {loading ? "Enabling…" : "Enable"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={dismiss}
              className="rounded-full h-8 text-xs text-muted-foreground"
            >
              Not now
            </Button>
          </div>
        </div>
        <button onClick={dismiss} className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
