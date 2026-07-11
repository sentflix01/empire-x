'use client'
import React, { useState, useEffect } from "react";
import client from "@/api/client";
import { MessageCircle, ExternalLink, Unlink, Bell, BellOff, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

export default function TelegramSettings() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data } = await client.get("/api/telegram/status");
      setStatus(data);
    } catch {}
    setLoading(false);
  };

  const handleToggle = async () => {
    if (!status?.connected) return;
    setToggling(true);
    try {
      const { data } = await client.put("/api/telegram/notifications", { enabled: !status.notifications_enabled });
      setStatus(s => ({ ...s, notifications_enabled: data.enabled }));
      toast.success(data.enabled ? "Telegram notifications enabled!" : "Telegram notifications disabled");
    } catch {
      toast.error("Failed to update notification settings");
    }
    setToggling(false);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await client.delete("/api/telegram/disconnect");
      setStatus(s => ({ ...s, connected: false, notifications_enabled: false }));
      toast.success("Telegram disconnected");
    } catch {
      toast.error("Failed to disconnect Telegram");
    }
    setDisconnecting(false);
  };

  if (loading) return (
    <div className="flex items-center gap-2 py-4">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Loading Telegram settings...</span>
    </div>
  );

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#2CA5E0] flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold">Telegram Notifications</h3>
          <p className="text-xs text-muted-foreground">Get order & message alerts on Telegram</p>
        </div>
        <div className={`ml-auto px-2.5 py-1 rounded-full text-xs font-medium ${status?.connected ? "bg-green-50 text-green-600" : "bg-secondary text-muted-foreground"}`}>
          {status?.connected ? "Connected" : "Not connected"}
        </div>
      </div>

      {!status?.connected ? (
        /* Connect flow */
        <div className="space-y-3">
          <div className="bg-secondary/40 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium">How to connect:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click <strong>Open Telegram Bot</strong> below</li>
              <li>Press <strong>Start</strong> in the Telegram chat</li>
              <li>Come back here and refresh</li>
            </ol>
          </div>
          <div className="flex gap-2">
            <a
              href={status?.connect_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full rounded-full bg-[#2CA5E0] hover:bg-[#1A94D2] text-white">
                <ExternalLink className="w-4 h-4 mr-2" /> Open Telegram Bot
              </Button>
            </a>
            <Button variant="outline" className="rounded-full" onClick={loadStatus}>
              Refresh
            </Button>
          </div>
        </div>
      ) : (
        /* Connected — settings */
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
            <div className="flex items-center gap-2">
              {status.notifications_enabled ? (
                <Bell className="w-4 h-4 text-amber-500" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Receive Notifications</p>
                <p className="text-xs text-muted-foreground">Orders, messages, task bids</p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`w-12 h-6 rounded-full transition-colors relative ${status.notifications_enabled ? "bg-amber-500" : "bg-secondary"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-card shadow absolute top-0.5 transition-transform ${status.notifications_enabled ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2">
            <Check className="w-3.5 h-3.5" />
            Connected to @{status.bot_username}. Type /stop in Telegram to disable anytime.
          </div>

          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Unlink className="w-3.5 h-3.5" />
            {disconnecting ? "Disconnecting..." : "Disconnect Telegram"}
          </button>
        </div>
      )}
    </div>
  );
}

