'use client';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from "react";
import client from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { Bell, Heart, MessageCircle, UserPlus, ShoppingBag, ClipboardList, Check, Trash2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { connectSocket, getSocket } from "@/lib/socket";
import { fromNow } from "@/lib/date";
import { useTranslation } from "react-i18next";
import ErrorBoundary from '@/components/ErrorBoundary';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import UserIdentity from '@/components/ui/UserIdentity';

// ── Notification item type ────────────────────────────────────────────────────
interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  created_at: string;
  is_read: boolean;
  link?: string | null;
  actor_name?: string | null;
  actor_avatar?: string | null;
  group_count?: number | null;
}

const TYPE_ICONS = {
  like:        Heart,
  comment:     MessageCircle,
  follow:      UserPlus,
  message:     MessageCircle,
  order:       ShoppingBag,
  task_update: ClipboardList,
  referral:    Gift,
};

const TYPE_COLORS = {
  like:        "text-red-500 bg-red-50 dark:bg-red-900/20",
  comment:     "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
  follow:      "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  message:     "text-green-500 bg-green-50 dark:bg-green-900/20",
  order:       "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
  task_update: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
  referral:    "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
};

function NotificationsView() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, authChecked } = useAuth();
  const [markingAll, setMarkingAll] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadNotifications(user);
    } else if (authChecked && !user) {
      // Auth resolved but no user — clear the infinite spinner
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authChecked]);

  // Live updates via socket — prepend new notifications as they arrive
  useEffect(() => {
    connectSocket();
    const s = getSocket();
    const handler = (notif: NotificationItem) => {
      setNotifications(prev => [notif, ...prev]);
    };
    s.on("new_notification", handler);
    return () => { s.off("new_notification", handler); };
  }, []);

  const loadNotifications = async (currentUser: { id?: string } | null | undefined) => {
    const u = currentUser || user;
    if (!u) return;
    try {
      // Fetch unread first, limit 30 for fast initial load
      const { data } = await client.get("/api/notifications?limit=30&sort=unread_first");
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(apiErrorMessage(err, "Failed to load notifications"));
    }
    setLoading(false);
  };

  const markRead = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await client.put(`/api/notifications/${notif.id}/read`);
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
        );
      } catch (err: any) {
        toast.error(apiErrorMessage(err, "Failed to mark as read"));
      }
    }
    // Navigate to the action location
    if (notif.link) {
      router.push(notif.link);
    } else {
      // Fallback navigation by notification type
      const typeRoutes: Record<string, string> = {
        like: '/feed',
        comment: '/feed',
        follow: '/profile',
        order: '/orders',
        message: '/messages',
        referral: '/referral',
      };
      const route = typeRoutes[notif.type] || '/notifications';
      router.push(route);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await client.put("/api/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success(t('notifications.markedAll'));
    } catch {
      toast.error(t('notifications.failedMarkAll'));
    }
    setMarkingAll(false);
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await client.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      toast.error(t('notifications.failedDelete'));
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div data-page-guide="notif-header" className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">{t('notifications.title')}</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button data-page-guide="notif-mark-all" size="sm" variant="outline" onClick={markAllRead} disabled={markingAll} className="rounded-full text-xs gap-1.5">
            <Check className="w-3 h-3" />
            {markingAll ? t('notifications.marking') : t('notifications.markAllRead')}
          </Button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>
      ) : !user ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <Bell className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-base">Sign in to see notifications</p>
            <p className="text-sm text-muted-foreground mt-1">Your notifications will appear here.</p>
          </div>
          <a href="/login" className="h-10 px-6 rounded-xl bg-amber-500 text-white font-semibold text-sm flex items-center hover:bg-amber-600 transition-colors">Sign In</a>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold">{t('notifications.allCaughtUp')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('notifications.noNotifications')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => {
            const Icon = TYPE_ICONS[n.type as keyof typeof TYPE_ICONS] || Bell;
            const color = TYPE_COLORS[n.type as keyof typeof TYPE_COLORS] || "text-muted-foreground bg-secondary/50";
            const hasSenderIdentity = ['like', 'comment', 'follow'].includes(n.type) && Boolean(n.actor_name);
            return (
              <div
                key={n.id}
                onClick={() => markRead(n)}
                data-page-guide="notif-list" className={`relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors group
                  ${n.is_read
                    ? "opacity-60 hover:opacity-100 hover:bg-secondary/30"
                    : "bg-card border border-border/50 hover:bg-secondary/50 notif-unread-item"
                  }`}
              >
                {hasSenderIdentity ? (
                  <UserIdentity
                    size="xs"
                    displayName={n.actor_name ?? ''}
                    avatarUrl={n.actor_avatar ?? null}
                    className="shrink-0"
                  />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {/* Group count badge — e.g. "5 people liked your post" */}
                    {(n.group_count ?? 0) > 1 && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        ×{n.group_count}
                      </span>
                    )}
                  </div>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{fromNow(n.created_at)}</p>
                </div>
                {/* Unread dot */}
                {!n.is_read && (
                  <div data-page-guide="notif-unread" className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                )}
                {/* Delete button — shows on hover */}
                <button onClick={(e) => deleteNotif(e, n.id)}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t('notifications.delete')}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



export default function Notifications() {
  return <ErrorBoundary><NotificationsView /></ErrorBoundary>;
}
