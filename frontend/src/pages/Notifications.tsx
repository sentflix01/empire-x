// @ts-nocheck
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import { Bell, Heart, MessageCircle, UserPlus, ShoppingBag, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import moment from "moment";

const TYPE_ICONS = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  message: MessageCircle,
  order: ShoppingBag,
  task_update: ClipboardList,
};

const TYPE_COLORS = {
  like: "text-red-500 bg-red-50",
  comment: "text-blue-500 bg-blue-50",
  follow: "text-amber-500 bg-amber-50",
  message: "text-green-500 bg-green-50",
  order: "text-purple-500 bg-purple-50",
  task_update: "text-orange-500 bg-orange-50",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    auth.me().then(u => { setUser(u); loadNotifications(u); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => loadNotifications(user), 15000);
    return () => clearInterval(interval);
  }, [user]);

  const loadNotifications = async (currentUser) => {
    const u = currentUser || user;
    if (!u) return;
    try {
      const all = await entities.Notification.filter({ user_id: u.id }, "-created_at", 50);
      setNotifications(all);
    } catch {}
    setLoading(false);
  };

  const markRead = async (notif) => {
    if (!notif.is_read) {
      await entities.Notification.update(notif.id, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    if (notif.link) navigate(notif.link);
  };

  return (
      <div className="max-w-xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-6">Notifications</h1>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold">All caught up!</h3>
            <p className="text-sm text-muted-foreground mt-1">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map(n => {
              const Icon = TYPE_ICONS[n.type] || Bell;
              const color = TYPE_COLORS[n.type] || "text-muted-foreground bg-secondary/50";
              return (
                <button key={n.id} onClick={() => markRead(n)} className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${n.is_read ? "opacity-60" : "bg-card hover:bg-secondary/50"}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{moment(n.created_at).fromNow()}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
  );
}

